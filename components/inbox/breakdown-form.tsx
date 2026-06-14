"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { analyzeOpportunity } from "@/lib/actions/analyze"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function BreakdownForm() {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setError(null)

    startTransition(async () => {
      const result = await analyzeOpportunity(text.trim())
      if ("error" in result) {
        setError(result.error)
      } else {
        router.push("/dashboard")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paste breakdown</CardTitle>
        <CardDescription>
          Paste the full casting breakdown text. CastBot will parse it, score your fit,
          and draft submission materials in under 60 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste casting breakdown here…"
            className="min-h-64 font-mono text-sm"
            disabled={isPending}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          {isPending && (
            <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Analyzing…</p>
              <p>Running compliance screen → parsing breakdown → scoring fit → drafting materials → validating output</p>
              <p className="text-xs">This takes 20–60 seconds.</p>
            </div>
          )}
          <Button type="submit" disabled={isPending || !text.trim()} className="w-full">
            {isPending ? "Analyzing…" : "Analyze breakdown"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
