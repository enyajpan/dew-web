-- How reviewers of each skin type rate each product: count, average, and share
-- rating it 4 stars or higher. Powers "people like you" recommendations.
create view public.skin_type_ratings with (security_invoker = true) as
select
  product_id,
  coalesce(attributes ->> 'skin_type', 'Unknown') as skin_type,
  count(*)::int                                   as reviews,
  round(avg(rating), 2)::float                    as avg_rating,
  round(100.0 * count(*) filter (where rating >= 4) / count(*))::int as pct_positive
from public.reviews
group by product_id, coalesce(attributes ->> 'skin_type', 'Unknown');
