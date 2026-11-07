// GET /api/stats -> headline counts (used by the README badges)
// { reviews, products_with_reviews, products, brands, last_scraped_at, label: { reviews: "56,446", ... } }
import { db, send } from './_db.js';

export default async function handler(req, res) {
  const { data, error } = await db.from('review_stats').select('*').single();
  if (error) return send(res, 500, { error: error.message });
  const fmt = (n) => n.toLocaleString('en-US');
  const label = {
    reviews: fmt(data.reviews),
    products_with_reviews: fmt(data.products_with_reviews),
    products: fmt(data.products),
    brands: fmt(data.brands),
    summary: `${fmt(data.reviews)} reviews · ${fmt(data.products_with_reviews)} products`,
  };
  res.setHeader('Access-Control-Allow-Origin', '*');
  return send(res, 200, { ...data, label }, 3600);
}
