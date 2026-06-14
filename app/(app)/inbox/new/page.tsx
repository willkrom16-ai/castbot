import { BreakdownForm } from "@/components/inbox/breakdown-form"

export default function NewInboxPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New opportunity</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste a breakdown and the AI pipeline will score your fit and draft submission materials.
        </p>
      </div>
      <BreakdownForm />
    </div>
  )
}
