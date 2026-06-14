import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export default proxy

export const config = {
  matcher: [
    // Exclude static assets, webhooks, crawler API endpoints (they use Bearer auth, not cookies)
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/crawl|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
