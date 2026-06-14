import 'dotenv/config'
import path from 'path'

function require_env(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  supabaseUrl: require_env('SUPABASE_URL'),
  supabaseServiceKey: require_env('SUPABASE_SERVICE_KEY'),
  crawlerSecret: require_env('CRAWLER_SECRET'),
  appUrl: require_env('APP_URL'),
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
  sessionDir: process.env.SESSION_DIR ?? path.join(process.cwd(), 'sessions'),
  crawlIntervalHours: parseInt(process.env.CRAWL_INTERVAL_HOURS ?? '4', 10),
  credentials: {
    backstage: {
      username: process.env.BACKSTAGE_USERNAME ?? '',
      password: process.env.BACKSTAGE_PASSWORD ?? '',
    },
    actors_access: {
      username: process.env.ACTORS_ACCESS_USERNAME ?? '',
      password: process.env.ACTORS_ACCESS_PASSWORD ?? '',
    },
    casting_networks: {
      username: process.env.CASTING_NETWORKS_USERNAME ?? '',
      password: process.env.CASTING_NETWORKS_PASSWORD ?? '',
    },
    imdb_pro: {
      username: process.env.IMDB_PRO_USERNAME ?? '',
      password: process.env.IMDB_PRO_PASSWORD ?? '',
    },
  },
}
