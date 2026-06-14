import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { config } from './config.js'
import { SiteName } from './types.js'

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  realtime: { transport: ws },
})

export async function filterUnseen(
  actorId: string,
  site: SiteName,
  urls: string[]
): Promise<string[]> {
  if (urls.length === 0) return []

  const { data } = await supabase
    .from('seen_listings')
    .select('listing_url')
    .eq('actor_id', actorId)
    .eq('site', site)
    .in('listing_url', urls)

  const seenUrls = new Set((data ?? []).map(r => r.listing_url))
  return urls.filter(url => !seenUrls.has(url))
}

export async function markSeen(
  actorId: string,
  site: SiteName,
  url: string,
  opportunityId?: string
): Promise<void> {
  await supabase.from('seen_listings').upsert({
    actor_id: actorId,
    site,
    listing_url: url,
    opportunity_id: opportunityId ?? null,
  }, { onConflict: 'actor_id,listing_url', ignoreDuplicates: true })
}

export async function getEnabledSources(actorId: string) {
  const { data } = await supabase
    .from('crawl_sources')
    .select('*')
    .eq('actor_id', actorId)
    .eq('enabled', true)

  return data ?? []
}

export async function getAllActorIds(): Promise<string[]> {
  const { data } = await supabase
    .from('crawl_sources')
    .select('actor_id')
    .eq('enabled', true)

  const ids = [...new Set((data ?? []).map(r => r.actor_id))]
  return ids
}

export async function createCrawlRun(actorId: string, sourceId: string, site: SiteName) {
  const { data } = await supabase
    .from('crawl_runs')
    .insert({ actor_id: actorId, crawl_source_id: sourceId, site, status: 'running' })
    .select('id')
    .single()
  return data?.id as string
}

export async function completeCrawlRun(
  runId: string,
  found: number,
  newCount: number,
  failed: number
) {
  await supabase.from('crawl_runs').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    listings_found: found,
    listings_new: newCount,
    listings_failed: failed,
  }).eq('id', runId)
}

export async function failCrawlRun(runId: string, errorMessage: string) {
  await supabase.from('crawl_runs').update({
    status: 'failed',
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
  }).eq('id', runId)
}

export async function updateLastCrawled(sourceId: string) {
  await supabase.from('crawl_sources')
    .update({ last_crawled_at: new Date().toISOString() })
    .eq('id', sourceId)
}
