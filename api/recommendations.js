// GET /api/recommendations?skin_type=Combination&concerns=Breakouts,Redness&owned=Cleanse,Tone&exclude=id1,id2
// Top 3 products for someone, from real review data: how highly people with their
// skin type rate it, whether it fills a step missing from their routine, and whether
// reviewers say it helps with their concerns. Each pick explains what it solves.
import { db, send } from './_db.js';

// The everyday steps, in routine order. Missing one is a real gap; extras (eyes, masks, lips) are nice-to-haves.
const CORE_STEPS = ['Cleanse', 'Tone', 'Treat', 'Moisturize', 'Protect'];
const ROUTINE_ORDER = CORE_STEPS;
const CONCERNS = {
  Breakouts: /breakout|acne|pimple|clog|blemish/i,
  Redness: /red|calm|sooth|irritat/i,
  'Dark spots': /dark spot|hyperpig|brighten|marks|discolor/i,
  Texture: /texture|smooth|rough/i,
  'Large pores': /pore/i,
  Dryness: /dry|hydrat|moistur|dehydrat/i,
  'Fine lines': /fine line|wrinkle|firm|plump/i,
  Sensitivity: /sensitiv|gentle|irritat/i,
};

const list = (v) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

function fitText(step, owned) {
  const i = ROUTINE_ORDER.indexOf(step);
  if (i < 0) return null;
  const before = ROUTINE_ORDER.slice(0, i).reverse().find((s) => owned.includes(s));
  const after = ROUTINE_ORDER.slice(i + 1).find((s) => owned.includes(s));
  if (before && after) return `Goes after your ${before.toLowerCase()} step and before your ${after.toLowerCase()} step.`;
  if (before) return `Goes after your ${before.toLowerCase()} step.`;
  if (after) return `Goes before your ${after.toLowerCase()} step.`;
  return null;
}

export default async function handler(req, res) {
  const skinType = req.query.skin_type || null;
  const concerns = list(req.query.concerns).filter((c) => CONCERNS[c]);
  const owned = list(req.query.owned);
  const exclude = new Set(list(req.query.exclude));

  const [{ data: summaries, error: e1 }, { data: stats, error: e2 }] = await Promise.all([
    db.from('review_summaries').select('product_id, summary, pros, cons, review_count'),
    db.from('skin_type_ratings').select('product_id, skin_type, reviews, avg_rating, pct_positive'),
  ]);
  if (e1 || e2) return send(res, 500, { error: (e1 ?? e2).message });

  const ids = summaries.map((s) => s.product_id).filter((id) => !exclude.has(id));
  const { data: products, error: e3 } = await db.from('products').select('id, brand, name, step, price_usd, image_path').in('id', ids);
  if (e3) return send(res, 500, { error: e3.message });
  const productBy = Object.fromEntries(products.map((p) => [p.id, p]));
  const statsBy = Object.groupBy(stats, (s) => s.product_id);

  const scored = summaries.filter((s) => productBy[s.product_id]).map((s) => {
    const p = productBy[s.product_id];
    const rows = statsBy[s.product_id] ?? [];
    const all = rows.reduce((a, r) => ({ n: a.n + r.reviews, pos: a.pos + (r.pct_positive * r.reviews) / 100, sum: a.sum + r.avg_rating * r.reviews }), { n: 0, pos: 0, sum: 0 });
    const mine = skinType ? rows.find((r) => r.skin_type === skinType) : null;
    const useMine = mine && mine.reviews >= 5;
    const allPct = (100 * all.pos) / Math.max(all.n, 1);
    const allAvg = all.sum / Math.max(all.n, 1);
    // Blend the skin-type score with the product's overall score so a handful of
    // matching reviews can't outrank products with hundreds (worth 20 reviews of weight).
    const w = useMine ? mine.reviews / (mine.reviews + 20) : 0;
    const pct = Math.round(useMine ? w * mine.pct_positive + (1 - w) * allPct : allPct);
    const avg = useMine ? w * mine.avg_rating + (1 - w) * allAvg : allAvg;
    const shownPct = useMine ? mine.pct_positive : Math.round(allPct);
    const shownAvg = useMine ? mine.avg_rating : allAvg;
    const text = `${s.summary} ${s.pros.map((x) => x.point).join(' ')}`;
    const solves = concerns.filter((c) => CONCERNS[c].test(text));
    const core = CORE_STEPS.includes(p.step);
    const gap = core && !owned.includes(p.step);
    const score = (pct / 100) * 0.5 + (avg / 5) * 0.15 + solves.length * 0.12 + (gap ? 0.2 : 0) + (core ? 0 : -0.15)
      + (useMine ? 0.05 : 0) + (Math.min(all.n, 500) / 500) * 0.05;
    return { s, p, pct, avg, shownPct, shownAvg, n: useMine ? mine.reviews : all.n, useMine, solves, gap, score };
  }).sort((a, b) => b.score - a.score);

  // One pick per routine step, so the three cover different gaps.
  const picks = [];
  for (const c of scored) {
    if (picks.some((x) => x.p.step === c.p.step || x.p.brand === c.p.brand)) continue;
    picks.push(c);
    if (picks.length === 3) break;
  }

  const out = await Promise.all(picks.map(async (c) => {
    let quotes = db.from('reviews').select('rating, title, body, author_name, attributes, skin_types, reviewed_at, review_sources(retailer, url)')
      .eq('product_id', c.p.id).gte('rating', 4).filter('body', 'match', '[A-Za-z]{3,}')
      .order('helpful_count', { ascending: false, nullsFirst: false }).order('reviewed_at', { ascending: false }).limit(40);
    if (c.useMine) quotes = quotes.contains('skin_types', [skinType]);
    const { data } = await quotes;
    // Prefer reviews that talk about the person's own concerns.
    const relevance = (r) => concerns.filter((k) => CONCERNS[k].test(r.body)).length;
    const picked = (data ?? []).filter((r) => r.body.length >= 60 && r.body.length <= 320)
      .sort((a, b) => relevance(b) - relevance(a)).slice(0, 2);
    return {
      product: c.p,
      step: c.p.step,
      gap: c.gap,
      solves: c.solves,
      what_solves: `${c.gap ? `Your routine has no ${c.p.step.toLowerCase()} step yet.` : CORE_STEPS.includes(c.p.step) ? `An upgrade for your ${c.p.step.toLowerCase()} step.` : `An extra for your routine (${(c.p.step ?? 'treatment').toLowerCase()}).`}${c.solves.length ? ` Reviewers say it helps with ${c.solves.join(' and ').toLowerCase()}.` : ''}`,
      fit: fitText(c.p.step, owned),
      top_pros: c.s.pros.slice(0, 2).map((x) => x.point),
      people_like_you: {
        skin_type: c.useMine ? skinType : null,
        reviews: c.n,
        pct_positive: c.shownPct,
        avg_rating: Math.round(c.shownAvg * 10) / 10,
        quotes: picked,
      },
      summary: c.s.summary,
    };
  }));
  return send(res, 200, { picks: out }, 600);
}
