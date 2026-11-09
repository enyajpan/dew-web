// POST /api/ask  { messages: [{ role: 'user'|'assistant', content }], profile: { skinType, concerns, goals, shelf } }
// Ask Dew: a skincare assistant answered by Claude, grounded in the person's profile
// and in Dew's review summaries for any products they mention. Signed-in users only.
import Anthropic from '@anthropic-ai/sdk';
import { db, send } from './_db.js';

const MODEL = 'claude-opus-5-5';
const anthropic = new Anthropic();

const SYSTEM = `You are Dew, the skincare assistant inside Dew, an app that matches people with products that worked for others with the same skin type, climate and goals.
Answer like a knowledgeable friend: warm, specific and brief (usually under 120 words). Plain text only: no headings or bold; short "- " bullets are fine.
Use the person's profile and the review data provided. When you cite what reviewers say, say it comes from Dew's review data. If the data doesn't cover something, say so rather than guessing.
You can explain ingredients, routine order, layering and how to introduce new products. You are not a doctor: for persistent, painful or worsening skin problems, suggest seeing a dermatologist. Don't diagnose conditions or recommend prescription drugs.`;

const STOP = new Set(['what', 'which', 'with', 'that', 'this', 'have', 'from', 'your', 'should', 'would', 'could', 'about', 'there', 'their', 'when', 'best', 'good', 'skin', 'does', 'will', 'into', 'than', 'then', 'them', 'they', 'like', 'just', 'using', 'products', 'product']);

// Review summaries for products whose name or brand the question mentions.
async function productContext(question) {
  const words = [...new Set(question.toLowerCase().match(/[a-z0-9+]{4,}/g) ?? [])].filter((w) => !STOP.has(w)).slice(0, 6);
  if (!words.length) return '';
  const { data: products } = await db.from('products').select('id, brand, name, step')
    .or(words.map((w) => `name.ilike.%${w}%,brand.ilike.%${w}%`).join(',')).limit(30);
  if (!products?.length) return '';
  // Rank by how many question words each product matches.
  const ranked = products.map((p) => ({ p, hits: words.filter((w) => `${p.brand} ${p.name}`.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.hits - a.hits).slice(0, 4).map((x) => x.p);
  const { data: sums } = await db.from('review_summaries').select('product_id, summary, pros, cons, review_count').in('product_id', ranked.map((p) => p.id));
  const byId = Object.fromEntries((sums ?? []).map((s) => [s.product_id, s]));
  return ranked.map((p) => {
    const s = byId[p.id];
    return s
      ? `${p.brand} ${p.name} (${p.step ?? 'skincare'}), from ${s.review_count} reviews: ${s.summary} Pros: ${s.pros.map((x) => x.point).join('; ')}. Cons: ${s.cons.map((x) => x.point).join('; ')}.`
      : `${p.brand} ${p.name} (${p.step ?? 'skincare'}): no review summary yet.`;
  }).join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const { data: auth } = token ? await db.auth.getUser(token) : { data: null };
  if (!auth?.user) return send(res, 401, { error: 'Log in to chat with Dew.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  const messages = (body.messages ?? [])
    .filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages.at(-1).role !== 'user') return send(res, 400, { error: 'Send a question.' });

  const p = body.profile ?? {};
  const profile = [
    p.skinType && `Skin type: ${p.skinType}`,
    p.concerns?.length && `Concerns: ${p.concerns.join(', ')}`,
    p.goals?.length && `Goals: ${p.goals.join(', ')}`,
    p.location && `Lives in: ${p.location}${p.climate ? ` (${p.climate})` : ''}`,
    p.shelf?.length && `Current shelf: ${p.shelf.join('; ')}`,
  ].filter(Boolean).join('\n') || 'Profile not filled in yet.';
  const reviews = await productContext(messages.at(-1).content);

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: `${SYSTEM}\n\n<profile>\n${profile}\n</profile>${reviews ? `\n\n<review_data>\n${reviews}\n</review_data>` : ''}`,
      messages,
    });
    if (response.stop_reason === 'refusal') return send(res, 200, { reply: 'I can’t help with that one, but I’m happy to talk routines, ingredients or products.' });
    const reply = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return send(res, 200, { reply: reply || 'Sorry, I didn’t catch that. Could you ask another way?' });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'Dew is busy right now. Try again in a minute.' });
    if (err instanceof Anthropic.APIError) return send(res, 502, { error: 'Dew couldn’t answer just now. Try again.' });
    throw err;
  }
}
