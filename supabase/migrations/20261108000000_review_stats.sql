-- Headline counts for the README badges and /api/stats.
create view public.review_stats with (security_invoker = true) as
select
  (select count(*) from public.reviews)::int                    as reviews,
  (select count(distinct product_id) from public.reviews)::int  as products_with_reviews,
  (select count(*) from public.products)::int                   as products,
  (select count(distinct p.brand) from public.products p
     where exists (select 1 from public.reviews r where r.product_id = p.id))::int as brands,
  (select max(scraped_at) from public.reviews)                  as last_scraped_at;
