import { config } from './config.js'
import { IngestPayload } from './types.js'
import { evaluateListing, ActorProfile } from './evaluator.js'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  realtime: { transport: ws },
})

async function fetchActorProfile(actorId: string): Promise<ActorProfile | null> {
  const { data } = await supabase
    .from('actor_profiles')
    .select('*')
    .eq('actor_id', actorId)
    .single()
  return data as ActorProfile | null
}

export async function ingestListing(payload: IngestPayload): Promise<{ opportunityId?: string }> {
  // Step 1: fetch actor profile from Supabase (Railway has direct DB access, no timeout)
  const profile = await fetchActorProfile(payload.actor_id)
  if (!profile) {
    throw new Error(`No actor profile found for actor ${payload.actor_id}`)
  }

  // Step 2: run AI evaluation in Railway (no Vercel timeout constraints)
  const source = `crawler:${payload.site}`
  console.log(`  [evaluator] Profile: name=${(profile as Record<string,unknown>).stage_name ?? 'null'} union=${JSON.stringify((profile as Record<string,unknown>).union_status)} age=${(profile as Record<string,unknown>).age_range_low}-${(profile as Record<string,unknown>).age_range_high} gender=${(profile as Record<string,unknown>).gender_identity}`)
  console.log(`  [evaluator] Running AI evaluation for: ${payload.listing_title}`)
  const evaluation = await evaluateListing(payload.raw_text, profile, source)
  console.log(`  [evaluator] fit_score=${evaluation.fit_score} action=${evaluation.recommended_action}`)

  // Step 3: POST finished results to Vercel save endpoint (pure DB write, < 1s)
  const res = await fetch(`${config.appUrl}/api/crawl/save`, {
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
      source,
      evaluation,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Save failed (${res.status}): ${(err as { error?: string }).error ?? 'unknown'}`)
  }

  const data = await res.json()
  return { opportunityId: (data as { opportunityId?: string }).opportunityId }
}
