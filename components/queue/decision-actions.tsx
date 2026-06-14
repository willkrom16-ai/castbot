"use client"

import { useState, useTransition } from "react"
import { makeDecision } from "@/lib/actions/decisions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExternalLink } from "lucide-react"

interface DecisionActionsProps {
  recommendationId: string
  draftCoverNote: string | null
  submissionUrl: string | null
  startedAt: number
}

function platformLabel(url: string): string {
  if (url.includes("backstage.com")) return "Backstage"
  if (url.includes("castingnetworks.com")) return "Casting Networks"
  if (url.includes("actorsaccess.com")) return "Actors Access"
  return "Platform"
}

export function DecisionActions({ recommendationId, draftCoverNote, submissionUrl, startedAt }: DecisionActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [editedNote, setEditedNote] = useState(draftCoverNote ?? "")
  const [rejectReason, setRejectReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [noteToast, setNoteToast] = useState(false)

  function elapsedSeconds() {
    return Math.round((Date.now() - startedAt) / 1000)
  }

  function decide(decision: "APPROVED" | "REJECTED" | "EDITED_APPROVED" | "SNOOZED", extra?: object) {
    startTransition(async () => {
      const result = await makeDecision({
        recommendation_id: recommendationId,
        decision,
        time_to_decide_seconds: elapsedSeconds(),
        ...extra,
      })
      if (result?.error) setError(result.error)
    })
  }

  async function handleSubmitOnPlatform() {
    if (!submissionUrl) return

    // Copy cover note to clipboard so she can paste it into the platform
    if (draftCoverNote) {
      try {
        await navigator.clipboard.writeText(draftCoverNote)
        setNoteToast(true)
        setTimeout(() => setNoteToast(false), 3000)
      } catch {
        // clipboard may be unavailable in some contexts — proceed anyway
      }
    }

    // Mark approved in CastBot
    decide("APPROVED")

    // Open the platform (universal links will open the native app on iOS if installed)
    window.open(submissionUrl, "_blank", "noopener")
  }

  async function handleEditAndSubmit(note: string) {
    if (draftCoverNote) {
      try { await navigator.clipboard.writeText(note) } catch { /* ignore */ }
    }
    decide("EDITED_APPROVED", { edited_cover_note: note })
    if (submissionUrl) window.open(submissionUrl, "_blank", "noopener")
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-destructive text-sm">{error}</p>}
      {noteToast && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
          Cover note copied — paste it into the notes field on {submissionUrl ? platformLabel(submissionUrl) : "the platform"}.
        </p>
      )}

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {submissionUrl ? (
          /* Primary CTA: one tap copies note + opens platform + marks approved */
          <Button
            size="sm"
            onClick={handleSubmitOnPlatform}
            disabled={isPending}
            className="col-span-2 sm:col-span-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Submit on {platformLabel(submissionUrl)}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => decide("APPROVED")}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white sm:w-auto"
          >
            Approve
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditOpen(true)}
          disabled={isPending}
          className="sm:w-auto"
        >
          Edit &amp; {submissionUrl ? "submit" : "approve"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => decide("SNOOZED")}
          disabled={isPending}
          className="sm:w-auto"
        >
          Snooze
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={isPending}
          className="text-destructive hover:text-destructive sm:w-auto"
        >
          Reject
        </Button>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit cover note</DialogTitle>
            <DialogDescription>
              {submissionUrl
                ? `Your edits will be copied to clipboard and ${platformLabel(submissionUrl)} will open.`
                : "Make any changes before approving. Your edits are captured for learning."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editedNote}
            onChange={(e) => setEditedNote(e.target.value)}
            className="min-h-48 text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setEditOpen(false)
                handleEditAndSubmit(editedNote)
              }}
              disabled={isPending}
            >
              {submissionUrl ? "Copy & open platform" : "Approve with edits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject opportunity</DialogTitle>
            <DialogDescription>
              Optional: tell CastBot why. This improves future recommendations.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Dates conflict, rate too low, not right for this type of role…"
            className="min-h-24 text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRejectOpen(false)
                decide("REJECTED", { reject_reason: rejectReason || undefined })
              }}
              disabled={isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
