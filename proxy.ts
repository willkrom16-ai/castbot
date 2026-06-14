import { type NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  return NextResponse.next()
}

export default proxy

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
