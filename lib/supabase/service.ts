import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Service client for server-to-server contexts (webhooks, cron jobs)
// Uses the service role key to bypass RLS
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
