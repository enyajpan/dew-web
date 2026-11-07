// GET /api/products            -> all products with their latest published ratings
// GET /api/products?id=biore   -> one product
import { db, send } from './_db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  let q = db.from('products').select('*').order('brand');
  if (id) q = q.eq('id', id);
  const { data: products, error } = await q;
  if (error) return send(res, 500, { error: error.message });

  const ids = products.map((p) => p.id);
  const { data: ratings, error: rErr } = await db.from('product_ratings').select('*').in('product_id', ids);
  if (rErr) return send(res, 500, { error: rErr.message });

  const byProduct = Object.groupBy(ratings, (r) => r.product_id);
  const out = products.map((p) => ({ ...p, ratings: byProduct[p.id] ?? [] }));
  if (id && !out.length) return send(res, 404, { error: 'Product not found' });
  return send(res, 200, id ? out[0] : out, 300);
}
