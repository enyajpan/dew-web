// GET /api/products            -> products we collect reviews for, with their latest published ratings and review sources
// GET /api/products?id=biore   -> one product (including catalog-only products)
// GET /api/products?q=cerave cleanser -> up to 40 matches across the whole catalog (18k+ products)
// GET /api/products?q=cerave&limit=40&offset=40&paged=1 -> { total, products } for paging through every match
import { db, send } from './_db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  // Keep only characters that are safe inside a PostgREST filter.
  const words = String(req.query.q ?? '').toLowerCase().replace(/[^\p{L}\p{N} '\-+.]/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 6);
  const paged = Boolean(req.query.paged) && words.length;
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const offset = Number(req.query.offset) || 0;
  let q = db.from('products').select('*', paged ? { count: 'exact' } : undefined);
  if (id) q = q.eq('id', id);
  else if (words.length) {
    for (const w of words) q = q.ilike('search', `%${w}%`);
    // Products with reviews first, then the most-reviewed on their store.
    q = q.order('catalog_only').order('listed_review_count', { ascending: false, nullsFirst: false }).order('id').range(offset, offset + limit - 1);
  } else q = q.eq('catalog_only', false).order('brand');
  const { data: products, count, error } = await q;
  if (error) return send(res, 500, { error: error.message });

  const ids = products.map((p) => p.id);
  const [ratings, sources, counts] = await Promise.all([
    db.from('product_ratings').select('*').in('product_id', ids),
    db.from('review_sources').select('product_id, retailer, url, status').in('product_id', ids),
    db.from('review_counts').select('product_id, reviews').in('product_id', ids),
  ]);
  const err = ratings.error ?? sources.error ?? counts.error;
  if (err) return send(res, 500, { error: err.message });

  const ratingsBy = Object.groupBy(ratings.data, (r) => r.product_id);
  const sourcesBy = Object.groupBy(sources.data, (s) => s.product_id);
  const countBy = Object.fromEntries(counts.data.map((c) => [c.product_id, c.reviews]));
  const out = products.map(({ search, ...p }) => ({ ...p, review_count: countBy[p.id] ?? 0, ratings: ratingsBy[p.id] ?? [], sources: sourcesBy[p.id] ?? [] }));
  if (id && !out.length) return send(res, 404, { error: 'Product not found' });
  return send(res, 200, id ? out[0] : paged ? { total: count, products: out } : out, 300);
}
