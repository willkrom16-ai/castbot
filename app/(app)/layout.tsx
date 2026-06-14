import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LayoutShell } from "@/components/nav/layout-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <LayoutShell email={user.email ?? ""}>{children}</LayoutShell>
}
