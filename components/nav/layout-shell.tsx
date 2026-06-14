"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, PlusCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Queue", icon: LayoutGrid },
  { href: "/inbox/new", label: "Add", icon: PlusCircle },
  { href: "/profile", label: "Profile", icon: User },
]

export function LayoutShell({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav — desktop only */}
      <nav className="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="font-semibold tracking-tight">CastBot</span>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "transition-colors",
                  pathname.startsWith(href)
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <span className="hidden sm:block text-muted-foreground text-sm truncate max-w-48">{email}</span>
        {/* Mobile: compact logo only in top bar */}
      </nav>

      {/* Page content — extra bottom padding on mobile for bottom nav */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Bottom tab bar — mobile only */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur-sm">
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
