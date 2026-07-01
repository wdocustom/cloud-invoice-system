-- Site-wide page view tracking for in-house analytics
create table if not exists page_views (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  page text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  browser text,
  screen text,
  ip text,
  country text,
  created_at timestamptz default now()
);

-- Index for querying by date range
create index idx_page_views_created_at on page_views (created_at desc);

-- Index for page-level queries
create index idx_page_views_page on page_views (page);

-- Index for session tracking (user journeys)
create index idx_page_views_session on page_views (session_id, created_at);

-- RLS: allow anonymous inserts (public tracking), admin reads
alter table page_views enable row level security;

create policy "Anyone can insert page views"
  on page_views for insert
  with check (true);

create policy "Anyone can read page views"
  on page_views for select
  using (true);
