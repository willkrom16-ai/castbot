export interface CrawlSource {
  id: string
  actor_id: string
  site: SiteName
  search_url: string | null
  enabled: boolean
  interval_hours: number
  last_crawled_at: string | null
}

export interface CrawlRun {
  id: string
  actor_id: string
  crawl_source_id: string | null
  site: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'failed'
  listings_found: number
  listings_new: number
  listings_failed: number
  error_message: string | null
}

export interface ListingResult {
  url: string
  title: string
  rawText: string
}

export type SiteName = 'backstage' | 'actors_access' | 'casting_networks' | 'imdb_pro'

export interface IngestPayload {
  actor_id: string
  raw_text: string
  listing_url: string
  site: SiteName
  listing_title: string
}
