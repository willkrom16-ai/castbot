import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-lg space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">CastBot</h1>
          <p className="text-xl text-muted-foreground">
            AI-assisted casting decisions for working actors.
          </p>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Paste a breakdown. Get a scored recommendation and a ready-to-send cover note in under 60 seconds. You approve everything.
        </p>
        <Link href="/login" className={cn(buttonVariants(), "px-8")}>
          Get started
        </Link>
      </div>
    </div>
  )
}
