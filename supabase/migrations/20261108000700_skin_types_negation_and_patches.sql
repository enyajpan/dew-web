-- Skin type detection, round 3:
--  * negated mentions don't count ("my skin is no longer dry", "not as oily")
--  * oily skin with dry patches (or the reverse) counts as Combination
create or replace function public.detect_skin_types(review text) returns text[]
language plpgsql immutable as $$
declare
  t text := replace(lower(coalesce(review, '')), '’', '''');
  found text[];
begin
  if t !~ '(oily|greasy|dry|dehydrated|flaky|combination|combo|combi|sensitive|reactive|rosacea|eczema|normal)' then
    return '{}';
  end if;
  -- drop negated mentions before matching
  t := regexp_replace(t, '\m(no longer|not|isn''t|wasn''t|never|less|without)( as| so| too| very| that| really)? (oily|greasy|dry|dehydrated|flaky|sensitive)\M', ' ', 'g');
  found := array_remove(array[
    case when t ~ '(?:\mi( have|''ve got|''ve always had| have always had| got)\M[^.!?]{0,30}\m(combination|combo|combi)\M( skin|-skin))|(?:\mi( have|''ve got|''ve always had| have always had)\M[^.!?]{0,12}\m(combination|combo|combi)\M)|(?:\mmy\M[^.!?]{0,20}\m(combination|combo|combi)\M[ -](skin|face|complexion|t-?zone))|(?:\mmy (skin|face|complexion)( type)? (is|was|has always been|tends to be|can be|gets|is very|is super|runs)\M[^.!?]{0,25}\m(combination|combo|combi)\M)|(?:\m(combination|combo|combi)[ -]skinned\M)|(?:\m(as|being) (someone|a person|a girl|a guy|a woman|a man|somebody) (with|who has)\M[^.!?]{0,20}\m(combination|combo|combi)\M)|(?:\mskin type[: -]+[^.!?]{0,12}\m(combination|combo|combi)\M)|(?:\m(combination|combo|combi) skin (here|girlies|girls?|gals?|babes?|type here)\M)|(?:\m(i''m|i am) (very |super |extremely |really |pretty |quite )?(combination|combo|combi)\M)' then 'Combination' end,
    case when t ~ '(?:\mi( have|''ve got|''ve always had| have always had| got)\M[^.!?]{0,30}\m(oily|greasy)\M( skin|-skin))|(?:\mi( have|''ve got|''ve always had| have always had)\M[^.!?]{0,12}\m(oily|greasy)\M)|(?:\mmy\M[^.!?]{0,20}\m(oily|greasy)\M[ -](skin|face|complexion|t-?zone))|(?:\mmy (skin|face|complexion)( type)? (is|was|has always been|tends to be|can be|gets|is very|is super|runs)\M[^.!?]{0,25}\m(oily|greasy)\M)|(?:\m(oily|greasy)[ -]skinned\M)|(?:\m(as|being) (someone|a person|a girl|a guy|a woman|a man|somebody) (with|who has)\M[^.!?]{0,20}\m(oily|greasy)\M)|(?:\mskin type[: -]+[^.!?]{0,12}\m(oily|greasy)\M)|(?:\m(oily|greasy) skin (here|girlies|girls?|gals?|babes?|type here)\M)|(?:\m(i''m|i am) (very |super |extremely |really |pretty |quite )?(oily|greasy)\M)' then 'Oily' end,
    case when t ~ '(?:\mi( have|''ve got|''ve always had| have always had| got)\M[^.!?]{0,30}\m(dry|dehydrated|flaky)\M( skin|-skin))|(?:\mi( have|''ve got|''ve always had| have always had)\M[^.!?]{0,12}\m(dry|dehydrated|flaky)\M)|(?:\mmy\M[^.!?]{0,20}\m(dry|dehydrated|flaky)\M[ -](skin|face|complexion|t-?zone))|(?:\mmy (skin|face|complexion)( type)? (is|was|has always been|tends to be|can be|gets|is very|is super|runs)\M[^.!?]{0,25}\m(dry|dehydrated|flaky)\M)|(?:\m(dry|dehydrated|flaky)[ -]skinned\M)|(?:\m(as|being) (someone|a person|a girl|a guy|a woman|a man|somebody) (with|who has)\M[^.!?]{0,20}\m(dry|dehydrated|flaky)\M)|(?:\mskin type[: -]+[^.!?]{0,12}\m(dry|dehydrated|flaky)\M)|(?:\m(dry|dehydrated|flaky) skin (here|girlies|girls?|gals?|babes?|type here)\M)|(?:\m(i''m|i am) (very |super |extremely |really |pretty |quite )?(dry|dehydrated|flaky)\M)' then 'Dry' end,
    case when t ~ '(?:\mi( have|''ve got|''ve always had| have always had| got)\M[^.!?]{0,30}\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)\M( skin|-skin))|(?:\mi( have|''ve got|''ve always had| have always had)\M[^.!?]{0,12}\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)\M)|(?:\mmy\M[^.!?]{0,20}\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)\M[ -](skin|face|complexion|t-?zone))|(?:\mmy (skin|face|complexion)( type)? (is|was|has always been|tends to be|can be|gets|is very|is super|runs)\M[^.!?]{0,25}\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)\M)|(?:\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)[ -]skinned\M)|(?:\m(as|being) (someone|a person|a girl|a guy|a woman|a man|somebody) (with|who has)\M[^.!?]{0,20}\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)\M)|(?:\mskin type[: -]+[^.!?]{0,12}\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)\M)|(?:\m(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone) skin (here|girlies|girls?|gals?|babes?|type here)\M)|(?:\m(i''m|i am) (very |super |extremely |really |pretty |quite )?(sensitive|reactive|rosacea[- ]prone|eczema[- ]prone)\M)' then 'Sensitive' end,
    case when t ~ '(?:\mi( have|''ve got|''ve always had| have always had| got)\M[^.!?]{0,30}\m(normal)\M( skin|-skin))|(?:\mi( have|''ve got|''ve always had| have always had)\M[^.!?]{0,12}\m(normal)\M)|(?:\mmy\M[^.!?]{0,20}\m(normal)\M[ -](skin|face|complexion|t-?zone))|(?:\mmy (skin|face|complexion)( type)? (is|was|has always been|tends to be|can be|gets|is very|is super|runs)\M[^.!?]{0,25}\m(normal)\M)|(?:\m(normal)[ -]skinned\M)|(?:\m(as|being) (someone|a person|a girl|a guy|a woman|a man|somebody) (with|who has)\M[^.!?]{0,20}\m(normal)\M)|(?:\mskin type[: -]+[^.!?]{0,12}\m(normal)\M)|(?:\m(normal) skin (here|girlies|girls?|gals?|babes?|type here)\M)|(?:\m(i''m|i am) (very |super |extremely |really |pretty |quite )?(normal)\M)' then 'Normal' end
  ], null);
  -- "oily t-zone" / oily and dry together means combination skin
  if t ~ '\moily (t-?zone|forehead|nose)\M'
     or t ~ '\moily\M[^.!?]{0,40}\mdry (patches|spots|areas|cheeks)\M'
     or t ~ '\mdry\M[^.!?]{0,40}\moily (t-?zone|forehead|nose|areas|spots)\M'
     or (found @> array['Oily'] and found @> array['Dry']) then
    found := array_remove(array_remove(found, 'Oily'), 'Dry');
    if not found @> array['Combination'] then found := array_prepend('Combination'::text, found); end if;
  end if;
  return found;
end;
$$;
