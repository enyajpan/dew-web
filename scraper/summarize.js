// AI summaries of a product's reviews: an overview plus pros and cons, written
// by Claude from up to 150 reviews and stored in review_summaries.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const MODEL = 'claude-opus-5-5';
const MIN_REVIEWS = 8;         // fewer than this and a summary says little
const MAX_REVIEWS = 150;       // per summary
const REFRESH_GROWTH = 1.2;    // re-summarize once a product has 20% more reviews

const Point = z.object({
  point: z.string().describe('One short sentence in plain language, e.g. "Absorbs fast and layers well under SPF"'),
  mentions: z.enum(['many', 'some', 'a few']).describe('How many of the reviews make this point'),
});
const Summary = z.object({
  summary: z.string().describe('Two sentences: what the product is like overall and who it suits best, based on the reviews'),
  pros: z.array(Point).describe('3 to 5 things reviewers liked, most common first'),
  cons: z.array(Point).describe('1 to 4 things reviewers disliked, most common first. Empty only if nobody complained'),
});

const SYSTEM = `You summarize skincare product reviews for DEW, an app that helps people find products that work for their skin.
Write for a shopper deciding whether to try the product. Be specific (texture, results, timing, skin types, irritation, value) and only say what the reviews support.
Mention skin types when reviewers with a particular type report something different. Don't invent claims, quote reviewers by name, or give medical advice.`;

function reviewLine(r) {
  const who = [r.skin_types?.length && `${r.skin_types.join(' + ')} skin`, r.verified && 'verified buyer'].filter(Boolean).join(', ');
  // toWellFormed() repairs an emoji cut in half by slice(), which would make the request invalid JSON.
  const text = `${r.title ? `${r.title}. ` : ''}${r.body ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, 700).toWellFormed();
  return `- ${r.rating}/5${who ? ` (${who})` : ''}: ${text}`;
}

// Newest reviews with real text, making sure critical ones are represented.
async function sampleReviews(db, productId) {
  const base = () => db.from('reviews').select('rating, title, body, verified, attributes, skin_types').eq('product_id', productId)
    .filter('body', 'match', '[A-Za-z]{3,}').order('reviewed_at', { ascending: false });
  const [low, recent] = await Promise.all([base().lte('rating', 3).limit(50), base().limit(MAX_REVIEWS)]);
  if (low.error || recent.error) throw new Error((low.error ?? recent.error).message);
  const seen = new Set();
  return [...low.data, ...recent.data].filter((r) => {
    const k = `${r.title}|${r.body}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, MAX_REVIEWS);
}

// Products with enough reviews whose summary is missing or out of date.
export async function productsNeedingSummary(db, limit) {
  const [{ data: counts, error }, { data: existing, error: e2 }] = await Promise.all([
    db.from('review_counts').select('product_id, reviews').gte('reviews', MIN_REVIEWS),
    db.from('review_summaries').select('product_id, review_count'),
  ]);
  if (error || e2) throw new Error((error ?? e2).message);
  const had = Object.fromEntries(existing.map((s) => [s.product_id, s.review_count]));
  return counts
    .filter((c) => !had[c.product_id] || c.reviews >= had[c.product_id] * REFRESH_GROWTH)
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, limit);
}

export async function summarizeProduct(db, anthropic, { product_id: productId, reviews: total }) {
  const { data: product } = await db.from('products').select('brand, name').eq('id', productId).single();
  const sample = await sampleReviews(db, productId);
  if (sample.length < MIN_REVIEWS) return null;

  const response = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: zodOutputFormat(Summary) },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Product: ${product.brand} ${product.name}\n${sample.length} of its ${total} reviews (rating out of 5):\n\n${sample.map(reviewLine).join('\n')}`,
    }],
  });
  if (response.stop_reason === 'refusal' || !response.parsed_output) {
    throw new Error(`No summary for ${productId} (stop reason: ${response.stop_reason})`);
  }

  const row = { product_id: productId, ...response.parsed_output, review_count: total, model: response.model, generated_at: new Date().toISOString() };
  const { error } = await db.from('review_summaries').upsert(row);
  if (error) throw new Error(error.message);
  return row;
}

export async function summarizeBatch(db, { limit = 20, deadline = Infinity, log = () => {} } = {}) {
  const anthropic = new Anthropic();
  const due = await productsNeedingSummary(db, limit);
  let done = 0;
  const errors = [];
  for (const p of due) {
    if (Date.now() > deadline) break;
    try {
      const row = await summarizeProduct(db, anthropic, p);
      if (row) { done++; log(`summarized ${p.product_id} (${p.reviews} reviews): ${row.pros.length} pros, ${row.cons.length} cons`); }
    } catch (e) {
      errors.push({ product: p.product_id, error: e.message });
      log(`✗ ${p.product_id}: ${e.message}`);
    }
  }
  return { due: due.length, done, errors };
}
