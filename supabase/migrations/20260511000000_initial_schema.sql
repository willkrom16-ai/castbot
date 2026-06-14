-- ============================================================
-- CastBot — Initial Schema
-- Layer mapping: all tables serve the 6-layer pipeline
-- ============================================================

-- ACTORS (identity anchor)
create table if not exists actors (
  id uuid primary key default auth.uid(),
  email text unique not null,
  created_at timestamptz default now(),
  subscription_tier text default 'free'
);

-- ACTOR PROFILES (Layer 2 — Processing input)
create table if not exists actor_profiles (
  actor_id uuid primary key references actors(id) on delete cascade,
  legal_name text,
  stage_name text,
  union_status text,
  age_range_low int,
  age_range_high int,
  ethnicity_self_id text[],
  gender_identity text,
  height_cm int,
  location_primary text,
  location_secondary text[],
  rep_status text,
  rep_agency text,
  skills text[],
  languages text[],
  accent_capabilities text[],
  reel_url text,
  resume_url text,
  headshot_urls text[],
  conflict_brands text[],
  rate_floor numeric,
  travel_radius_miles int,
  updated_at timestamptz default now()
);

-- OPPORTUNITIES (Layer 1 — Input)
create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references actors(id) on delete cascade,
  source text not null,
  raw_text text not null,
  raw_metadata jsonb,
  ingested_at timestamptz default now(),
  processing_status text default 'pending'
);

-- OPPORTUNITY DETAILS (Layer 2 — Processing output)
create table if not exists opportunity_details (
  opportunity_id uuid primary key references opportunities(id) on delete cascade,
  project_title text,
  project_type text,
  role_name text,
  role_description text,
  union_requirement text,
  shoot_dates daterange,
  shoot_location text,
  audition_deadline timestamptz,
  rate_disclosed numeric,
  rate_currency text default 'USD',
  casting_director text,
  production_company text,
  submission_method text,
  submission_target text,
  parsed_at timestamptz default now()
);

-- RECOMMENDATIONS (Layer 3 — Decision)
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete cascade,
  actor_id uuid references actors(id) on delete cascade,
  recommended_action text,
  fit_score numeric,
  confidence_score numeric,
  reasoning_summary text,
  reasoning_detail jsonb,
  draft_cover_note text,
  draft_tags text[],
  draft_self_tape_notes text,
  flags text[],
  priority_rank int,
  validator_passed boolean,
  validator_notes text,
  created_at timestamptz default now(),
  model_version text
);

-- DECISIONS (Layer 4 — Approval, human only)
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references recommendations(id) on delete cascade,
  actor_id uuid references actors(id) on delete cascade,
  decision text not null,
  edits jsonb,
  decided_at timestamptz default now(),
  time_to_decide_seconds int
);

-- SUBMISSIONS (Layer 5 — Execution, triggered by human approval only)
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid references decisions(id) on delete cascade,
  actor_id uuid references actors(id) on delete cascade,
  submitted_at timestamptz default now(),
  submission_method text,
  final_payload jsonb
);

-- OUTCOMES (Layer 6 — Feedback)
create table if not exists outcomes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  outcome_type text not null,
  outcome_at timestamptz default now(),
  notes text
);

-- FEEDBACK SIGNALS (Layer 6 — Learning)
create table if not exists feedback_signals (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references actors(id) on delete cascade,
  signal_type text not null,
  signal_payload jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table actors enable row level security;
alter table actor_profiles enable row level security;
alter table opportunities enable row level security;
alter table opportunity_details enable row level security;
alter table recommendations enable row level security;
alter table decisions enable row level security;
alter table submissions enable row level security;
alter table outcomes enable row level security;
alter table feedback_signals enable row level security;

-- actors: own row only
create policy "actors: own row" on actors
  for all using (auth.uid() = id);

-- actor_profiles: own profile only
create policy "actor_profiles: own profile" on actor_profiles
  for all using (auth.uid() = actor_id);

-- opportunities: own opportunities only
create policy "opportunities: own rows" on opportunities
  for all using (auth.uid() = actor_id);

-- opportunity_details: via opportunity ownership
create policy "opportunity_details: own rows" on opportunity_details
  for all using (
    exists (
      select 1 from opportunities o
      where o.id = opportunity_details.opportunity_id
        and o.actor_id = auth.uid()
    )
  );

-- recommendations: own rows only
create policy "recommendations: own rows" on recommendations
  for all using (auth.uid() = actor_id);

-- decisions: own rows only (AI never writes here)
create policy "decisions: own rows" on decisions
  for all using (auth.uid() = actor_id);

-- submissions: own rows only (AI never writes here)
create policy "submissions: own rows" on submissions
  for all using (auth.uid() = actor_id);

-- outcomes: via submission ownership
create policy "outcomes: own rows" on outcomes
  for all using (
    exists (
      select 1 from submissions s
      where s.id = outcomes.submission_id
        and s.actor_id = auth.uid()
    )
  );

-- feedback_signals: own rows only
create policy "feedback_signals: own rows" on feedback_signals
  for all using (auth.uid() = actor_id);

-- ============================================================
-- TRIGGER: auto-insert actor row on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.actors (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
