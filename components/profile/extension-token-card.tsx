"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ExtensionTokenCard({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div>
        <p className="text-sm font-medium">Chrome extension token</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Paste this into the CastBot extension settings to connect it to your account.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono truncate select-all">
          {token}
        </code>
        <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}
