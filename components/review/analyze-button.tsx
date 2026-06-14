"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { analyzeSkippedOpportunity } from "@/lib/actions/ingest-skipped"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function AnalyzeButton({ opportunityId }: { opportunityId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleAnalyze() {
    startTransition(async () => {
      const result = await analyzeSkippedOpportunity(opportunityId)
      if ("error" in result) {
        setError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  if (error) return <span className="text-xs text-destructive">{error}</span>

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAnalyze} disabled={isPending}>
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Analyze →"}
    </Button>
  )
}
