import { BackstageAdapter } from './adapters/backstage.js'
import { ActorsAccessAdapter } from './adapters/actors-access.js'
import { CastingNetworksAdapter } from './adapters/casting-networks.js'
import { ImdbProAdapter } from './adapters/imdb-pro.js'
import { BaseAdapter } from './adapters/base.js'
import { SiteName } from './types.js'
import {
  getAllActorIds,
  getEnabledSources,
  filterUnseen,
  markSeen,
  createCrawlRun,
  completeCrawlRun,
  failCrawlRun,
  updateLastCrawled,
} from './deduplication.js'
import { ingestListing } from './ingest-client.js'
import { closeBrowser } from './browser.js'

function getAdapter(site: SiteName): BaseAdapter {
  switch (site) {
    case 'backstage': return new BackstageAdapter()
    case 'actors_access': return new ActorsAccessAdapter()
    case 'casting_networks': return new CastingNetworksAdapter()
    case 'imdb_pro': return new ImdbProAdapter()
  }
}

export async function runAllCrawls(): Promise<void> {
  console.log(`[runner] Starting crawl at ${new Date().toISOString()}`)

  const actorIds = await getAllActorIds()
  console.log(`[runner] Found ${actorIds.length} actor(s) with enabled sources`)

  for (const actorId of actorIds) {
    await runCrawlForActor(actorId)
  }

  await closeBrowser()
  console.log(`[runner] All crawls complete`)
}

async function runCrawlForActor(actorId: string): Promise<void> {
  const sources = await getEnabledSources(actorId)

  for (const source of sources) {
    const site = source.site as SiteName
    const runId = await createCrawlRun(actorId, source.id, site)
    console.log(`[${site}] Starting crawl for actor ${actorId}`)

    const adapter = getAdapter(site)

    try {
      await adapter.ensureLoggedIn()

      const allUrls = await adapter.getListingUrls(source.search_url)
      console.log(`[${site}] Found ${allUrls.length} listing URLs`)

      const newUrls = await filterUnseen(actorId, site, allUrls)
      console.log(`[${site}] ${newUrls.length} new listings to process`)

      let newCount = 0
      let failedCount = 0

      for (const url of newUrls) {
        try {
          const listing = await adapter.fetchListing(url)

          if (listing.rawText.length < 100) {
            console.log(`[${site}] Skipping short listing: ${url}`)
            await markSeen(actorId, site, url)
            continue
          }

          const result = await ingestListing({
            actor_id: actorId,
            raw_text: listing.rawText,
            listing_url: url,
            site,
            listing_title: listing.title,
          })

          await markSeen(actorId, site, url, result.opportunityId)
          newCount++
          console.log(`[${site}] Ingested: ${listing.title}`)

          // Brief pause between requests to be respectful
          await new Promise(r => setTimeout(r, 1500))
        } catch (err) {
          failedCount++
          console.error(`[${site}] Failed to process ${url}:`, err instanceof Error ? err.message : err)
          // Still mark as seen to avoid retry loops on broken pages
          await markSeen(actorId, site, url)
        }
      }

      await completeCrawlRun(runId, allUrls.length, newCount, failedCount)
      await updateLastCrawled(source.id)
      console.log(`[${site}] Done — ${newCount} new, ${failedCount} failed`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[${site}] Crawl failed:`, msg)
      await failCrawlRun(runId, msg)
    } finally {
      await adapter.close()
    }
  }
}
