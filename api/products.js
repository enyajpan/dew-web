// GET /api/products            -> all products with their latest published ratings and review sources
// GET /api/products?id=biore   -> one product
import { db, send } from './_db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  let q = db.from('products').select('*').order('brand');
  if (id) q = q.eq('id', id);
  const { data: products, error } = await q;
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
  const out = products.map((p) => ({ ...p, review_count: countBy[p.id] ?? 0, ratings: ratingsBy[p.id] ?? [], sources: sourcesBy[p.id] ?? [] }));
  if (id && !out.length) return send(res, 404, { error: 'Product not found' });
  return send(res, 200, id ? out[0] : out, 300);
}
