import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: runs } = await db
    .from("crawl_runs")
    .select("*")
    .eq("actor_id", user.id)
    .order("started_at", { ascending: false })
    .limit(50)

  const { data: sources } = await db
    .from("crawl_sources")
    .select("*")
    .eq("actor_id", user.id)

  return NextResponse.json({ runs: runs ?? [], sources: sources ?? [] })
}
