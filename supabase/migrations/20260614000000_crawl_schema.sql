-- Crawl sources: which sites to crawl per actor
create table if not exists crawl_sources (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  site text not null check (site in ('backstage', 'actors_access', 'casting_networks', 'imdb_pro')),
  search_url text,
  enabled boolean not null default true,
  interval_hours integer not null default 4,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now(),
  unique(actor_id, site)
);

alter table crawl_sources enable row level security;
create policy "Users see own crawl sources" on crawl_sources for all using (auth.uid() = actor_id);

-- Crawl run audit log
create table if not exists crawl_runs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  crawl_source_id uuid references crawl_sources(id) on delete set null,
  site text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  listings_found integer not null default 0,
  listings_new integer not null default 0,
  listings_failed integer not null default 0,
  error_message text
);

alter table crawl_runs enable row level security;
create policy "Users see own crawl runs" on crawl_runs for all using (auth.uid() = actor_id);

-- Seen listings: deduplication across crawl runs
create table if not exists seen_listings (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references actors(id) on delete cascade,
  site text not null,
  listing_url text not null,
  listing_id text,
  first_seen_at timestamptz not null default now(),
  opportunity_id uuid references opportunities(id) on delete set null,
  unique(actor_id, listing_url)
);

alter table seen_listings enable row level security;
create policy "Users see own seen listings" on seen_listings for all using (auth.uid() = actor_id);

-- Service role bypass policies (needed by the crawler service which uses the service key)
create policy "Service role full access crawl_sources" on crawl_sources for all to service_role using (true) with check (true);
create policy "Service role full access crawl_runs" on crawl_runs for all to service_role using (true) with check (true);
create policy "Service role full access seen_listings" on seen_listings for all to service_role using (true) with check (true);
