"use client"

import { cn } from "@/lib/utils"

interface MultiSelectProps {
  options: readonly string[]
  value: string[]
  onChange: (value: string[]) => void
  labels?: Record<string, string>
  className?: string
}

export function MultiSelect({ options, value, onChange, labels, className }: MultiSelectProps) {
  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const selected = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border transition-colors",
              selected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-input hover:bg-muted"
            )}
          >
            {labels?.[opt] ?? opt}
          </button>
        )
      })}
    </div>
  )
}
