"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ingestOpportunity } from "./ingest"

export async function analyzeOpportunity(rawText: string, source = "manual") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return ingestOpportunity({ actorId: user.id, rawText, source })
}
