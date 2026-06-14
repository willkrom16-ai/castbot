import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { RecommendationCard, type RecommendationCardData } from "@/components/queue/recommendation-card"
import { InboundAddressCard } from "@/components/inbox/inbound-address-card"
import { buttonVariants } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Parallel fetch — all independent queries
  const [profileRes, todayOppRes, rowsRes, decisionsRes] = await Promise.all([
    supabase
      .from("actor_profiles")
      .select("inbound_token, gender_identity, age_range_low, age_range_high, union_status, location_primary")
      .eq("actor_id", user!.id)
      .single(),
    supabase
      .from("opportunities")
      .select("processing_status, source_subject")
      .eq("actor_id", user!.id)
      .eq("source", "email")
      .gte("ingested_at", todayStart.toISOString()),
    supabase
      .from("opportunities")
      .select(`
        id,
        opportunity_details (
          project_title, project_type, role_name, role_description,
          shoot_location, audition_deadline, casting_director, submission_url
        ),
        recommendations (
          id, recommended_action, fit_score, confidence_score,
          reasoning_summary, draft_cover_note, draft_self_tape_notes,
          flags, validator_passed, priority_rank
        )
      `)
      .eq("actor_id", user!.id)
      .eq("processing_status", "analyzed")
      .order("ingested_at", { ascending: false }),
    supabase
      .from("decisions")
      .select("recommendation_id")
      .eq("actor_id", user!.id),
  ])

  const profile = profileRes.data as {
    inbound_token: string
    gender_identity: string | null
    age_range_low: number | null
    age_range_high: number | null
    union_status: string[] | null
    location_primary: string | null
  } | null

  const scanFieldsMissing = !profile ||
    !profile.gender_identity ||
    profile.age_range_low == null ||
    !profile.union_status?.length ||
    !profile.location_primary

  type TodayOpp = { processing_status: string; source_subject: string | null }
  const todayOpps = (todayOppRes.data ?? []) as TodayOpp[]
  const todayTotal = todayOpps.length
  const todaySurfaced = todayOpps.filter((o) => o.processing_status === "analyzed").length
  const todaySubject = todayOpps[0]?.source_subject ?? null

  const rows = rowsRes.data

  const decidedIds = new Set(
    ((decisionsRes.data ?? []) as { recommendation_id: string }[]).map((d) => d.recommendation_id)
  )

  type Row = {
    id: string
    opportunity_details: Record<string, unknown> | null
    recommendations: (Record<string, unknown>)[] | null
  }

  const pending: RecommendationCardData[] = []

  for (const row of ((rows ?? []) as Row[])) {
    const details = row.opportunity_details as Record<string, unknown> | null
    const recs = (row.recommendations ?? []) as Record<string, unknown>[]

    for (const rec of recs) {
      const recId = rec.id as string
      if (decidedIds.has(recId)) continue

      pending.push({
        recommendation_id: recId,
        project_title: (details?.project_title as string) ?? null,
        project_type: (details?.project_type as string) ?? null,
        role_name: (details?.role_name as string) ?? null,
        role_description: (details?.role_description as string) ?? null,
        shoot_location: (details?.shoot_location as string) ?? null,
        audition_deadline: (details?.audition_deadline as string) ?? null,
        casting_director: (details?.casting_director as string) ?? null,
        submission_url: (details?.submission_url as string) ?? null,
        recommended_action: (rec.recommended_action as string) ?? "REVIEW",
        fit_score: (rec.fit_score as number) ?? null,
        confidence_score: (rec.confidence_score as number) ?? null,
        reasoning_summary: (rec.reasoning_summary as string) ?? null,
        draft_cover_note: (rec.draft_cover_note as string) ?? null,
        draft_self_tape_notes: (rec.draft_self_tape_notes as string) ?? null,
        flags: (rec.flags as string[]) ?? null,
        validator_passed: (rec.validator_passed as boolean) ?? null,
      })
    }
  }

  // Sort: SUBMIT first, then REVIEW, then FLAG, then SKIP; within each by priority_rank
  const order: Record<string, number> = { SUBMIT: 0, REVIEW: 1, FLAG: 2, SKIP: 3 }
  pending.sort((a, b) => (order[a.recommended_action] ?? 9) - (order[b.recommended_action] ?? 9))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today&apos;s queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pending.length === 0
              ? "No pending opportunities."
              : `${pending.length} opportunity${pending.length === 1 ? "" : "ies"} awaiting your decision.`}
          </p>
        </div>
        <Link href="/inbox/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="h-4 w-4 mr-1" />
          Add breakdown
        </Link>
      </div>

      {/* Profile completion prompt — shown when scan-critical fields are missing */}
      {scanFieldsMissing && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <p className="text-amber-800">
            <span className="font-medium">Complete your profile</span> — gender, age range, union status, and location are needed for CastBot to filter roles accurately.
          </p>
          <Link href="/profile" className="text-xs font-medium text-amber-900 hover:underline shrink-0">
            Set up →
          </Link>
        </div>
      )}

      {/* Today's digest banner */}
      {todayTotal > 0 && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">{todayTotal} roles</span> analyzed today
            {todaySubject && <span className="hidden sm:inline"> from {todaySubject}</span>}
            {" · "}
            <span className="text-foreground font-medium">{todaySurfaced}</span> surfaced as matches
          </p>
          <Link
            href="/review"
            className="text-xs font-medium text-primary hover:underline shrink-0"
          >
            Review all →
          </Link>
        </div>
      )}

      {/* Email inbound address */}
      {profile?.inbound_token && (
        <InboundAddressCard
          token={profile.inbound_token}
          domain={process.env.NEXT_PUBLIC_INBOUND_DOMAIN ?? "sandbox40fd5b369fd04ed08b497621c05fadbe.mailgun.org"}
        />
      )}

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Paste a casting breakdown to get started.
          </p>
          <Link href="/inbox/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
            Add your first breakdown
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((rec) => (
            <RecommendationCard key={rec.recommendation_id} data={rec} />
          ))}
        </div>
      )}
    </div>
  )
}
