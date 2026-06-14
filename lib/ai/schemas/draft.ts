import { z } from "zod"

export const draftInputSchema = z.object({
  role_name: z.string().nullable(),
  role_description: z.string().nullable(),
  project_title: z.string().nullable(),
  project_type: z.string(),
  casting_director: z.string().nullable(),
  actor_profile: z.object({
    stage_name: z.string().nullable(),
    legal_name: z.string().nullable(),
    skills: z.array(z.string()).nullable(),
    union_status: z.array(z.string()).nullable(),
    rep_status: z.string().nullable(),
    rep_agency: z.string().nullable(),
  }),
  skills_overlap: z.array(z.string()),
  recommended_action: z.enum(["SUBMIT", "SKIP", "REVIEW", "FLAG"]),
})

export const draftOutputSchema = z.object({
  cover_note: z.string().max(1000),
  cover_note_tone: z.enum(["formal", "conversational", "enthusiastic"]),
  self_tape_notes: z.string().nullable(),
  suggested_tags: z.array(z.string()).max(5),
  submission_checklist: z.array(z.string()),
})

export type DraftInput = z.infer<typeof draftInputSchema>
export type DraftOutput = z.infer<typeof draftOutputSchema>
