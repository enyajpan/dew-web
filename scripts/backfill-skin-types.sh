#!/bin/sh
# Re-tags every review's skin types (run after changing detect_skin_types in the database).
# Works through products ten at a time so each update stays under the statement timeout.
set -e
cd "$(dirname "$0")/.."
ids=$(supabase db query --remote --read-only "select string_agg(id, ',' order by id) from products" 2>/dev/null \
  | python3 -c "import json,sys; print(list(json.load(sys.stdin)['rows'][0].values())[0])")
echo "$ids" | tr ',' '\n' | xargs -n 10 | while read -r batch; do
  list=$(echo "$batch" | sed "s/ /','/g")
  supabase db query --remote --yes "update public.reviews set attributes = attributes where product_id in ('$list')" >/dev/null 2>&1 \
    && printf '.' || printf 'x'
done
echo " done"
