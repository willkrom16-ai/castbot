import { createServiceClient } from "@/lib/supabase/service"
import type { Database } from "@/types/database"

type OpportunityInsert = Database["public"]["Tables"]["opportunities"]["Insert"]

export async function saveSkippedOpportunity(opts: {
  actorId: string
  rawText: string
  source: string
  sourceEmail?: string
  sourceSubject?: string
  scanTitle: string
  scanProject: string
  scanSkipReason: string
}): Promise<void> {
  const supabase = createServiceClient()
  const insert: OpportunityInsert = {
    actor_id: opts.actorId,
    source: opts.source,
    raw_text: opts.rawText,
    processing_status: "scanned_skip",
    source_email: opts.sourceEmail ?? null,
    source_subject: opts.sourceSubject ?? null,
  }
  await supabase.from("opportunities")
    .insert({
      ...insert,
      scan_title: opts.scanTitle,
      scan_project: opts.scanProject,
      scan_skip_reason: opts.scanSkipReason,
    })
}
