"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DecisionActions } from "./decision-actions"
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export type RecommendationCardData = {
  recommendation_id: string
  project_title: string | null
  project_type: string | null
  role_name: string | null
  role_description: string | null
  shoot_location: string | null
  audition_deadline: string | null
  casting_director: string | null
  submission_url: string | null
  recommended_action: string
  fit_score: number | null
  confidence_score: number | null
  reasoning_summary: string | null
  draft_cover_note: string | null
  draft_self_tape_notes: string | null
  flags: string[] | null
  validator_passed: boolean | null
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

export function RecommendationCard({ data }: { data: RecommendationCardData }) {
  const [expanded, setExpanded] = useState(false)
  const startedAt = useState(() => Date.now())[0]

  const deadline = data.audition_deadline
    ? new Date(data.audition_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {data.project_type && (
              <Badge variant="secondary" className="text-xs capitalize">{data.project_type}</Badge>
            )}
            {!data.validator_passed && (
              <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300 bg-yellow-50">
                Review flagged
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-base leading-snug">
            {data.role_name ?? "Unknown role"}
            {data.project_title && (
              <span className="font-normal text-muted-foreground"> — {data.project_title}</span>
            )}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {data.shoot_location && <span>{data.shoot_location}</span>}
            {data.casting_director && <span>CD: {data.casting_director}</span>}
            {deadline && <span className="font-medium text-foreground">Due {deadline}</span>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* AI reasoning */}
        {data.reasoning_summary && (
          <p className="text-sm text-muted-foreground leading-relaxed">{data.reasoning_summary}</p>
        )}

        {/* Flags */}
        {data.flags && data.flags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {data.flags.map((flag) => (
              <Badge key={flag} variant="outline" className="text-xs text-red-700 border-red-200 bg-red-50">
                {flag}
              </Badge>
            ))}
          </div>
        )}

        {/* Expandable cover note */}
        {data.draft_cover_note && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Draft cover note
                </button>
                <CopyButton text={data.draft_cover_note} />
              </div>
              {expanded && (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/50 rounded-md px-3 py-2">
                    {data.draft_cover_note}
                  </p>
                  {data.draft_self_tape_notes && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Self-tape notes</p>
                      <p className="text-sm leading-relaxed">{data.draft_self_tape_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <Separator />

        <DecisionActions
          recommendationId={data.recommendation_id}
          draftCoverNote={data.draft_cover_note}
          submissionUrl={data.submission_url}
          startedAt={startedAt}
        />
      </CardContent>
    </Card>
  )
}
