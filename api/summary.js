// GET /api/summary?product=t28_sos -> the AI pros/cons summary of a product's reviews, or null
import { db, send } from './_db.js';

export default async function handler(req, res) {
  const { product } = req.query;
  if (!product) return send(res, 400, { error: 'Pass ?product=<product id>' });
  const { data, error } = await db.from('review_summaries').select('*').eq('product_id', product).maybeSingle();
  if (error) return send(res, 500, { error: error.message });
  return send(res, 200, data, 600);
}
