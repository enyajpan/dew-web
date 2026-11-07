// Supabase reads and writes for the scraper. Uses the service role key, so it
// must only run server-side (CLI, Vercel functions).
import { createClient } from '@supabase/supabase-js';

export function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

const check = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Sources that haven't been scraped for the longest come first.
export async function dueSources(db, limit) {
  return check(
    await db
      .from('review_sources')
      .select('id, product_id, retailer, url, status')
      .in('status', ['active', 'needs_partnership'])
      .order('last_scraped_at', { ascending: true, nullsFirst: true })
      .limit(limit),
  );
}

export async function startRun(db, trigger) {
  return check(await db.from('scrape_runs').insert({ trigger }).select('id').single()).id;
}

export async function finishRun(db, id, stats) {
  check(await db.from('scrape_runs').update({ ...stats, finished_at: new Date().toISOString() }).eq('id', id));
}

export async function saveResult(db, source, result) {
  const now = new Date().toISOString();
  const status = { ok: 'active', error: source.status }[result.status] ?? result.status;
  check(
    await db
      .from('review_sources')
      .update({ status, adapter: result.adapter ?? null, last_scraped_at: now, last_error: result.error ?? null })
      .eq('id', source.id),
  );

  if (result.snapshot) {
    check(await db.from('rating_snapshots').insert({ source_id: source.id, ...result.snapshot }));
  }

  if (!result.reviews.length) return 0;
  const rows = result.reviews.map((r) => ({
    ...r,
    attributes: r.attributes ?? {},
    source_id: source.id,
    product_id: source.product_id,
    scraped_at: now,
  }));
  check(await db.from('reviews').upsert(rows, { onConflict: 'source_id,external_id' }));
  return rows.length;
}
