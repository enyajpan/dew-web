// GET /api/reviews
//   ?product=t28_sos       one product (leave out for all products)
//   &skin_type=Combination  reviewers with that skin type (picked on the site or described in the review)
//   &q=sunscreen            words in the review title or text
//   &rating=5 | rating=low  exact star rating, or 1–3 stars
//   &sort=newest | highest | lowest | helpful
//   &limit=20&offset=0
import { db, send } from './_db.js';

const SORTS = {
  newest: ['reviewed_at', false],
  highest: ['rating', false],
  lowest: ['rating', true],
  helpful: ['helpful_count', false],
};

export default async function handler(req, res) {
  const { product, skin_type: skinType, rating, sort = 'newest' } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  // Keep only characters that are safe inside a PostgREST filter.
  const q = String(req.query.q ?? '').replace(/[^\p{L}\p{N} '\-]/gu, ' ').trim().slice(0, 60);

  const [col, asc] = SORTS[sort] ?? SORTS.newest;
  let query = db
    .from('reviews')
    .select(
      'id, product_id, rating, title, body, author_name, verified, recommended, helpful_count, attributes, skin_types, skin_type_source, reviewed_at, review_sources(retailer, url), products(brand, name, image_path)',
      { count: 'exact' },
    )
    .filter('body', 'match', '[A-Za-z]{3,}') // skip reviews with no real text, like "...."
    .order(col, { ascending: asc, nullsFirst: false })
    .order('reviewed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (product) query = query.eq('product_id', product);
  // skin_types combines the reviewer's own pick with skin types they describe in the text
  if (skinType) query = query.contains('skin_types', [skinType]);
  if (rating === 'low') query = query.lte('rating', 3);
  else if (rating) query = query.eq('rating', Number(rating));
  if (q) query = query.or(`body.ilike.%${q}%,title.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) return send(res, 500, { error: error.message });
  return send(res, 200, { total: count, reviews: data }, 120);
}
