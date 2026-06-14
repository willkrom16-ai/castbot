"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function InboundAddressCard({ token, domain }: { token: string; domain: string }) {
  const [copied, setCopied] = useState(false)
  const address = `inbox+${token}@${domain}`

  async function copy() {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-medium">Your casting inbox</p>
          <p className="text-muted-foreground text-xs">
            Forward casting emails here — they&apos;ll appear in your queue automatically.
          </p>
        </div>
        <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <p className="font-mono text-xs break-all bg-background rounded px-2 py-1.5 border select-all">
        {address}
      </p>
    </div>
  )
}
