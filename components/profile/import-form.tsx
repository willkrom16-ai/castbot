"use client"

import { useState, useTransition } from "react"
import { importProfileFromUrl, importProfileFromText } from "@/lib/actions/import-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProfileFormValues } from "@/lib/schemas/profile"

interface ImportFormProps {
  onImported: (values: Partial<ProfileFormValues>) => void
  onSkip: () => void
}

export function ImportForm({ onImported, onSkip }: ImportFormProps) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUrlImport() {
    if (!url.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await importProfileFromUrl(url.trim())
      if ("error" in result) {
        setError(result.error)
      } else {
        onImported(result.extracted)
      }
    })
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      startTransition(async () => {
        const result = await importProfileFromText(text)
        if ("error" in result) {
          setError(result.error)
        } else {
          onImported(result.extracted)
        }
      })
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import your profile</CardTitle>
          <CardDescription>
            Paste a link to your website, IMDb page, or Actors Access profile and CastBot will pre-fill your profile automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://yourwebsite.com or imdb.com/name/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
              disabled={isPending}
            />
            <Button type="button" onClick={handleUrlImport} disabled={isPending || !url.trim()}>
              {isPending ? "Importing…" : "Import"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Upload resume <span className="text-muted-foreground font-normal">(plain text or PDF text copy)</span>
            </label>
            <input
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileUpload}
              disabled={isPending}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:text-sm file:bg-background file:text-foreground hover:file:bg-muted cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">For PDFs, copy-paste the text into a .txt file if direct upload doesn&apos;t extract correctly.</p>
          </div>

          {isPending && (
            <p className="text-sm text-muted-foreground">Reading your profile… this takes about 10 seconds.</p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Skip — I&apos;ll fill it in manually
        </button>
      </div>
    </div>
  )
}
