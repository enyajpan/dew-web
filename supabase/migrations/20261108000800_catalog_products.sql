-- Products imported from data/skincare-catalog.csv (scripts/import-catalog-csv.js):
-- searchable and addable to a shelf, but with no reviews collected yet.
alter table public.products
  add column catalog_only boolean not null default false,
  add column category text,              -- e.g. 'Serum + treatment'
  add column sold_at text,               -- e.g. 'Ulta; Credo Beauty'
  add column product_url text,           -- where it's sold
  add column listed_rating numeric(3,2), -- the star rating shown on that store, if any
  add column listed_review_count int;

-- Product search matches brand and name together ("cerave cleanser").
create extension if not exists pg_trgm with schema extensions;
alter table public.products add column search text generated always as (lower(brand || ' ' || name)) stored;
create index products_search_idx on public.products using gin (search extensions.gin_trgm_ops);
