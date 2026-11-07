-- Reviews per product, used to pick which products need an AI summary.
create view public.review_counts with (security_invoker = true) as
select product_id, count(*)::int as reviews
from public.reviews
group by product_id;
