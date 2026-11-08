-- Skin types for every review, so people can filter to reviewers with their skin.
-- Two sources, combined:
--   'reviewer'    the reviewer picked a skin type on the brand site (attributes.skin_type)
--   'review text' the reviewer describes their own skin in the review ("I have oily skin")
-- Only first-person phrases count: "great for oily skin" is advice, not the reviewer's skin.

alter table public.reviews
  add column skin_types text[] not null default '{}',
  add column skin_type_source text check (skin_type_source in ('reviewer', 'review text', 'reviewer + review text'));

-- Reviewer-picked values from brand sites, mapped to DEW's five types.
create function public.normalize_skin_type(v text) returns text
language sql immutable as $$
  select case
    when v ~* 'combin|combo' then 'Combination'
    when v ~* 'oily' then 'Oily'
    when v ~* 'dry' then 'Dry'
    when v ~* 'sensitiv' then 'Sensitive'
    when v ~* 'normal' then 'Normal'
  end
$$;

-- First-person mentions of a skin type in the review text.
create function public.detect_skin_types(review text) returns text[]
language plpgsql immutable as $$
declare
  t text := lower(coalesce(review, ''));
  -- ways people describe their own skin; {T} is replaced by the type's keywords
  self text[] := array[
    '\mi( have|''ve got|''ve always had| have always had| got)\M[^.!?]{0,30}\m({T})\M( skin|-skin)',
    '\mi( have|''ve got|''ve always had| have always had)\M[^.!?]{0,12}\m({T})\M',
    '\mmy\M[^.!?]{0,20}\m({T})\M[ -](skin|face|complexion|t-?zone)',
    '\mmy (skin|face|complexion)( type)? (is|was|has always been|tends to be|can be|gets|is very|is super|runs)\M[^.!?]{0,25}\m({T})\M',
    '\m({T})[ -]skinned\M',
    '\m(as|being) (someone|a person|a girl|a guy|a woman|a man|somebody) (with|who has)\M[^.!?]{0,20}\m({T})\M',
    '\mskin type[: -]+[^.!?]{0,12}\m({T})\M',
    '\m({T}) skin (here|girlies|girls?|gals?|babes?|type here)\M',
    '\m(i''m|i am) (very |super |extremely |really |pretty |quite )?({T})\M'
  ];
  types text[][] := array[
    array['Combination', 'combination|combo|combi'],
    array['Oily',        'oily|greasy'],
    array['Dry',         'dry|dehydrated|flaky'],
    array['Sensitive',   'sensitive|reactive|rosacea[- ]prone|eczema[- ]prone'],
    array['Normal',      'normal']
  ];
  found text[] := '{}';
  i int;
  p text;
begin
  for i in 1 .. array_length(types, 1) loop
    foreach p in array self loop
      if t ~ replace(p, '{T}', types[i][2]) then
        found := found || types[i][1];
        exit;
      end if;
    end loop;
  end loop;
  -- "oily t-zone" / oily and dry together means combination skin
  if t ~ '\moily (t-?zone|forehead|nose)\M' or (found @> array['Oily'] and found @> array['Dry']) then
    found := array_remove(array_remove(found, 'Oily'), 'Dry');
    if not found @> array['Combination'] then found := array_prepend('Combination'::text, found); end if;
  end if;
  return found;
end;
$$;

-- Fill skin_types on insert and whenever the text or attributes change.
create function public.set_review_skin_types() returns trigger
language plpgsql as $$
declare
  picked text := public.normalize_skin_type(new.attributes ->> 'skin_type');
  from_text text[] := public.detect_skin_types(concat_ws('. ', new.title, new.body));
  merged text[] := '{}';
  x text;
begin
  if picked is not null then merged := array[picked]; end if;
  foreach x in array from_text loop
    -- the reviewer's own pick wins over a different base type found in the text;
    -- Sensitive can be added on top of any type
    if not merged @> array[x] and (picked is null or x = 'Sensitive') then merged := merged || x; end if;
  end loop;
  new.skin_types := merged;
  new.skin_type_source := case
    when picked is not null and cardinality(merged) > 1 then 'reviewer + review text'
    when picked is not null then 'reviewer'
    when cardinality(merged) > 0 then 'review text'
  end;
  return new;
end;
$$;

create trigger reviews_skin_types
  before insert or update of title, body, attributes on public.reviews
  for each row execute function public.set_review_skin_types();

create index reviews_skin_types_idx on public.reviews using gin (skin_types);

-- Existing reviews are backfilled in batches by scripts/backfill-skin-types.sh
-- (one big update exceeds the statement timeout).

-- Ratings by skin type now count every review tagged with that type.
create or replace view public.skin_type_ratings with (security_invoker = true) as
select
  r.product_id,
  coalesce(st, 'Unknown')                                         as skin_type,
  count(*)::int                                                    as reviews,
  round(avg(r.rating), 2)::float                                   as avg_rating,
  round(100.0 * count(*) filter (where r.rating >= 4) / count(*))::int as pct_positive
from public.reviews r
left join lateral unnest(nullif(r.skin_types, '{}')) as st on true
group by r.product_id, coalesce(st, 'Unknown');
