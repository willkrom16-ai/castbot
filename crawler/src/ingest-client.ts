import { config } from './config.js'
import { IngestPayload } from './types.js'

export async function ingestListing(payload: IngestPayload): Promise<{ opportunityId?: string }> {
  const res = await fetch(`${config.appUrl}/api/crawl/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.crawlerSecret}`,
    },
    body: JSON.stringify({
      actor_id: payload.actor_id,
      raw_text: payload.raw_text,
      listing_url: payload.listing_url,
      site: payload.site,
      listing_title: payload.listing_title,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Ingest failed (${res.status}): ${(err as { error?: string }).error ?? 'unknown'}`)
  }

  const data = await res.json()
  return { opportunityId: (data as { opportunityId?: string }).opportunityId }
}
