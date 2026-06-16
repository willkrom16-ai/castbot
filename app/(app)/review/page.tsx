import { createClient } from "@/lib/supabase/server"
import { AnalyzeButton } from "@/components/review/analyze-button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const dynamic = "force-dynamic"

type ReviewRow = {
  id: string
  processing_status: string
  scan_title: string | null
  scan_project: string | null
  scan_skip_reason: string | null
  source_subject: string | null
  ingested_at: string
  submission_url: string | null
  role_name: string | null
  project_title: string | null
  audition_deadline: string | null
  recommended_action: string | null
  fit_score: number | null
  decision: string | null
}

type DigestGroup = {
  key: string
  subject: string
  date: string
  roles: ReviewRow[]
}

function groupByDigest(rows: ReviewRow[]): DigestGroup[] {
  const map = new Map<string, DigestGroup>()
  for (const row of rows) {
    const date = new Date(row.ingested_at).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    })
    const subject = row.source_subject ?? "Manual submission"
    const key = `${date}__${subject}`
    if (!map.has(key)) map.set(key, { key, subject, date, roles: [] })
    map.get(key)!.roles.push(row)
  }
  return Array.from(map.values())
}

function StatusCell({ row }: { row: ReviewRow }) {
  if (row.processing_status === "scanned_skip") {
    return <span className="text-muted-foreground text-xs">{row.scan_skip_reason ?? "Filtered"}</span>
  }
  if (row.processing_status === "processing") {
    return <span className="text-xs text-muted-foreground italic">Analyzing…</span>
  }
  if (row.processing_status === "analyzed" || row.recommended_action) {
    const action = row.recommended_action ?? "REVIEW"
    const styles: Record<string, string> = {
      SUBMIT: "bg-green-50 text-green-800 border-green-200",
      REVIEW: "bg-yellow-50 text-yellow-800 border-yellow-200",
      FLAG: "bg-red-50 text-red-800 border-red-200",
      SKIP: "bg-gray-50 text-gray-600 border-gray-200",
    }
    return (
      <Badge variant="outline" className={cn("text-xs", styles[action])}>
        {row.decision === "APPROVED" || row.decision === "EDITED_APPROVED" ? "✓ Approved" :
         row.decision === "REJECTED" ? "Rejected" :
         row.decision === "SNOOZED" ? "Snoozed" :
         "Surfaced"}
      </Badge>
    )
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

function ActionCell({ row }: { row: ReviewRow }) {
  if (row.processing_status === "scanned_skip") {
    return <AnalyzeButton opportunityId={row.id} />
  }
  return null
}

export default async function ReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = await (supabase
    .from("opportunities")
    .select(`
      id, processing_status, scan_title, scan_project, scan_skip_reason,
      source_subject, ingested_at,
      opportunity_details ( role_name, project_title, submission_url, audition_deadline ),
      recommendations ( id, recommended_action, fit_score )
    `)
    .eq("actor_id", user!.id)
    .order("ingested_at", { ascending: false })
    .limit(200) as ReturnType<typeof supabase.from>)

  // Fetch decisions separately via recommendations
  const allRecIds = ((rows ?? []) as Array<{ recommendations: Array<{ id: string }> | null }>)
    .flatMap((r) => (r.recommendations ?? []).map((rec) => rec.id))

  const { data: decisionData } = allRecIds.length
    ? await (supabase
        .from("decisions")
        .select("recommendation_id, decision")
        .in("recommendation_id", allRecIds) as ReturnType<typeof supabase.from>)
    : { data: [] }

  const decisionByRecId = new Map(
    ((decisionData ?? []) as { recommendation_id: string; decision: string }[])
      .map((d) => [d.recommendation_id, d.decision])
  )

  type RawRow = {
    id: string
    processing_status: string
    scan_title: string | null
    scan_project: string | null
    scan_skip_reason: string | null
    source_subject: string | null
    ingested_at: string
    opportunity_details: Record<string, unknown> | null
    recommendations: Array<{ id: string; recommended_action: string; fit_score: number | null }> | null
  }

  const mapped: ReviewRow[] = ((rows ?? []) as RawRow[]).map((r) => {
    const details = r.opportunity_details as Record<string, unknown> | null
    const rec = (r.recommendations ?? [])[0]
    const decision = rec ? (decisionByRecId.get(rec.id) ?? null) : null
    return {
      id: r.id,
      processing_status: r.processing_status,
      scan_title: r.scan_title,
      scan_project: r.scan_project,
      scan_skip_reason: r.scan_skip_reason,
      source_subject: r.source_subject,
      ingested_at: r.ingested_at,
      submission_url: (details?.submission_url as string) ?? null,
      role_name: (details?.role_name as string) ?? null,
      project_title: (details?.project_title as string) ?? null,
      audition_deadline: (details?.audition_deadline as string) ?? null,
      recommended_action: rec?.recommended_action ?? null,
      fit_score: rec?.fit_score ?? null,
      decision,
    }
  })

  // Filter out listings whose audition deadline has already passed
  const now = new Date()
  const active = mapped.filter((r) => {
    if (!r.audition_deadline) return true
    const d = new Date(r.audition_deadline)
    return isNaN(d.getTime()) || d >= now
  })

  const groups = groupByDigest(active)
  const totalRoles = active.length
  const surfaced = active.filter((r) => r.processing_status === "analyzed").length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All roles</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {totalRoles} total · {surfaced} surfaced to queue
          </p>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No roles yet. Forward a casting email to get started.</p>
        </div>
      )}

      {groups.map((group) => {
        const groupSurfaced = group.roles.filter((r) => r.processing_status === "analyzed").length
        const groupSkipped = group.roles.filter((r) => r.processing_status === "scanned_skip").length

        return (
          <div key={group.key} className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h2 className="font-semibold text-sm">{group.subject}</h2>
              <span className="text-xs text-muted-foreground">{group.date}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {group.roles.length} roles · {groupSurfaced} surfaced · {groupSkipped} filtered
              </span>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Role</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Project</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground hidden sm:table-cell">Fit</th>
                      <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.roles.map((row) => {
                      const roleName = row.role_name ?? row.scan_title ?? "—"
                      const projectName = row.project_title ?? row.scan_project ?? "—"
                      return (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2.5 font-medium max-w-[180px] truncate">{roleName}</td>
                          <td className="px-3 py-2.5 text-muted-foreground max-w-[160px] truncate">{projectName}</td>
                          <td className="px-3 py-2.5 hidden sm:table-cell text-muted-foreground tabular-nums">
                            {row.fit_score != null ? row.fit_score : "—"}
                          </td>
                          <td className="px-3 py-2.5"><StatusCell row={row} /></td>
                          <td className="px-3 py-2.5 text-right"><ActionCell row={row} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
