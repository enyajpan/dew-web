-- Products, where their reviews live, and the reviews the scraper collects.

create table public.products (
  id          text primary key,              -- slug, matches js/data.js keys (e.g. 'biore')
  brand       text not null,
  name        text not null,
  step        text,
  size        text,
  price_usd   numeric(8,2),
  image_path  text,
  created_at  timestamptz not null default now()
);

-- One row per product page we track (a retailer or brand site).
create table public.review_sources (
  id               uuid primary key default gen_random_uuid(),
  product_id       text not null references public.products(id) on delete cascade,
  retailer         text not null,             -- 'eadem', 'shiseido', 'sephora', 'ulta', ...
  url              text not null unique,
  status           text not null default 'active'
                   check (status in ('active', 'paused', 'blocked', 'needs_partnership')),
  adapter          text,                      -- set by the scraper once detected: 'okendo', 'jsonld'
  last_scraped_at  timestamptz,
  last_error       text,
  created_at       timestamptz not null default now()
);
create index on public.review_sources (product_id);

-- Star rating + review count as published on the page, captured on every run.
create table public.rating_snapshots (
  id            bigint generated always as identity primary key,
  source_id     uuid not null references public.review_sources(id) on delete cascade,
  rating_avg    numeric(3,2),
  review_count  integer,
  captured_at   timestamptz not null default now()
);
create index on public.rating_snapshots (source_id, captured_at desc);

create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references public.review_sources(id) on delete cascade,
  product_id     text not null references public.products(id) on delete cascade,
  external_id    text not null,               -- the site's own review id, for de-duplication
  rating         numeric(3,1),                -- normalized to 0-5
  title          text,
  body           text,
  author_name    text,
  verified       boolean,
  recommended    boolean,
  helpful_count  integer,
  attributes     jsonb not null default '{}', -- skin type, age range, concerns, etc. when the site provides them
  reviewed_at    timestamptz,
  scraped_at     timestamptz not null default now(),
  unique (source_id, external_id)
);
create index on public.reviews (product_id, reviewed_at desc);

create table public.scrape_runs (
  id                 bigint generated always as identity primary key,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  trigger            text,                    -- 'cron', 'cli'
  sources_attempted  integer default 0,
  reviews_upserted   integer default 0,
  errors             jsonb not null default '[]'
);

-- Latest published rating per product, for the app.
create view public.product_ratings with (security_invoker = true) as
select distinct on (s.product_id, s.retailer)
  s.product_id, s.retailer, s.url, r.rating_avg, r.review_count, r.captured_at
from public.review_sources s
join public.rating_snapshots r on r.source_id = s.id
order by s.product_id, s.retailer, r.captured_at desc;

-- Everything is publicly readable; only the service role (scraper, API) writes.
alter table public.products         enable row level security;
alter table public.review_sources   enable row level security;
alter table public.rating_snapshots enable row level security;
alter table public.reviews          enable row level security;
alter table public.scrape_runs      enable row level security;

create policy "public read" on public.products         for select using (true);
create policy "public read" on public.review_sources   for select using (true);
create policy "public read" on public.rating_snapshots for select using (true);
create policy "public read" on public.reviews          for select using (true);
