// GET /api/reviews?product=t28_sos[&skin_type=Combination][&limit=20][&offset=0]
// Leave out product for the newest reviews across all products.
import { db, send } from './_db.js';

export default async function handler(req, res) {
  const { product, skin_type: skinType } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  let q = db
    .from('reviews')
    .select(
      'id, product_id, rating, title, body, author_name, verified, recommended, helpful_count, attributes, reviewed_at, review_sources(retailer, url), products(brand, name, image_path)',
      { count: 'exact' },
    )
    .filter('body', 'match', '[A-Za-z]{3,}') // skip reviews with no real text, like "...."
    .order('reviewed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (product) q = q.eq('product_id', product);
  if (skinType) q = q.eq('attributes->>skin_type', skinType);

  const { data, count, error } = await q;
  if (error) return send(res, 500, { error: error.message });
  return send(res, 200, { total: count, reviews: data }, 300);
}
