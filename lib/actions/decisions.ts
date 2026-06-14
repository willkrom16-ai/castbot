"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const decideSchema = z.object({
  recommendation_id: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "EDITED_APPROVED", "SNOOZED"]),
  edited_cover_note: z.string().optional(),
  reject_reason: z.string().optional(),
  time_to_decide_seconds: z.number().int().optional(),
})

export async function makeDecision(input: z.infer<typeof decideSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const validated = decideSchema.parse(input)

  // Fetch recommendation to build submission payload
  const { data: recData } = await supabase
    .from("recommendations")
    .select("*, opportunities(*)")
    .eq("id", validated.recommendation_id)
    .single()

  const rec = recData as (typeof recData) | null
  if (!rec) return { error: "Recommendation not found" }

  const edits = validated.edited_cover_note
    ? { cover_note_original: (rec as Record<string, unknown>).draft_cover_note, cover_note_edited: validated.edited_cover_note }
    : null

  // Write decision — human-only table
  const { data: decisionData, error: decisionError } = await (
    supabase.from("decisions") as ReturnType<typeof supabase.from>
  ).insert({
    recommendation_id: validated.recommendation_id,
    actor_id: user.id,
    decision: validated.decision,
    edits,
    time_to_decide_seconds: validated.time_to_decide_seconds ?? null,
  }).select().single()

  if (decisionError) return { error: decisionError.message }

  const decision = decisionData as { id: string }

  // On approval, write submission packet — human-only table
  if (validated.decision === "APPROVED" || validated.decision === "EDITED_APPROVED") {
    const finalCoverNote = validated.edited_cover_note ?? (rec as Record<string, unknown>).draft_cover_note
    await (supabase.from("submissions") as ReturnType<typeof supabase.from>).insert({
      decision_id: decision.id,
      actor_id: user.id,
      submission_method: "manual",
      final_payload: {
        cover_note: finalCoverNote,
        tags: (rec as Record<string, unknown>).draft_tags,
        self_tape_notes: (rec as Record<string, unknown>).draft_self_tape_notes,
        opportunity_id: (rec as Record<string, unknown>).opportunity_id,
      },
    })

    // Log feedback signal for learning
    await (supabase.from("feedback_signals") as ReturnType<typeof supabase.from>).insert({
      actor_id: user.id,
      signal_type: validated.edited_cover_note ? "edit" : "approval",
      signal_payload: { recommendation_id: validated.recommendation_id, edits },
    })
  }

  if (validated.decision === "REJECTED") {
    await (supabase.from("feedback_signals") as ReturnType<typeof supabase.from>).insert({
      actor_id: user.id,
      signal_type: "rejection",
      signal_payload: { recommendation_id: validated.recommendation_id, reason: validated.reject_reason ?? null },
    })
  }

  revalidatePath("/dashboard")
  return { success: true, decision_id: decision.id }
}
