"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { uploadHeadshot, deleteHeadshot } from "@/lib/actions/headshots"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Upload, Loader2 } from "lucide-react"
import Image from "next/image"

type Headshot = { id: string; public_url: string; label: string; storage_path: string }

const LABEL_PRESETS = ["Commercial", "Theatrical", "Character", "Younger", "Older", "Glamour"]

export function HeadshotManager({ headshots }: { headshots: Headshot[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState("Commercial")
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) { setError("Select a file first"); return }
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("label", label)
      const result = await uploadHeadshot(fd)
      if (result.error) { setError(result.error); return }
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ""
      router.refresh()
    })
  }

  function handleDelete(id: string, storagePath: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteHeadshot(id, storagePath)
      setDeletingId(null)
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <p className="text-sm font-medium">Headshots</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Upload and label each headshot. CastBot will recommend which one to use per submission.
        </p>
      </div>

      {/* Existing headshots */}
      {headshots.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {headshots.map((h) => (
            <div key={h.id} className="relative group">
              <div className="aspect-[3/4] rounded-lg overflow-hidden border bg-muted">
                <Image
                  src={h.public_url}
                  alt={h.label}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-1 truncate">{h.label}</p>
              <button
                onClick={() => handleDelete(h.id, h.storage_path)}
                disabled={deletingId === h.id}
                className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {deletingId === h.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Trash2 className="h-3 w-3" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-wrap gap-2">
          {LABEL_PRESETS.map((l) => (
            <button
              key={l}
              onClick={() => setLabel(l)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                label === l
                  ? "bg-foreground text-background border-foreground"
                  : "border-input hover:bg-muted"
              }`}
            >
              {l}
            </button>
          ))}
          <Input
            className="h-7 text-xs w-28"
            placeholder="Custom label"
            value={LABEL_PRESETS.includes(label) ? "" : label}
            onChange={(e) => setLabel(e.target.value || "General")}
          />
        </div>

        <div className="flex items-center gap-2">
          {preview && (
            <div className="w-12 h-16 rounded overflow-hidden border shrink-0">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="flex-1 text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-input file:text-xs file:bg-background file:text-foreground hover:file:bg-muted cursor-pointer"
            />
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isPending || !preview}
              className="shrink-0"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}
