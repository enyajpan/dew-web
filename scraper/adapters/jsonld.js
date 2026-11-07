// schema.org data that sites publish for search engines: rating summary and, on
// some sites, individual reviews. Works on any product page.

function ldBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const [, body] of html.matchAll(re)) {
    try { out.push(JSON.parse(body.trim())); } catch { /* skip malformed blocks */ }
  }
  return out;
}

function flatten(node, acc = []) {
  if (Array.isArray(node)) node.forEach((n) => flatten(n, acc));
  else if (node && typeof node === 'object') {
    acc.push(node);
    if (node['@graph']) flatten(node['@graph'], acc);
  }
  return acc;
}

const isType = (n, t) => [].concat(n['@type'] ?? []).includes(t);
const num = (v) => (v == null || v === '' ? null : Number(v));

function toFive(value, best) {
  const v = num(value);
  if (v == null) return null;
  const b = num(best) ?? 5;
  return Math.round((v / b) * 5 * 10) / 10;
}

export function findProduct(html) {
  return flatten(ldBlocks(html)).find((n) => isType(n, 'Product')) ?? null;
}

export function parseJsonLd(html) {
  const product = findProduct(html);
  if (!product) return { snapshot: null, reviews: [] };

  const agg = product.aggregateRating;
  let snapshot = agg
    ? { rating_avg: toFive(agg.ratingValue, agg.bestRating), review_count: num(agg.reviewCount ?? agg.ratingCount) }
    : null;
  if (snapshot && snapshot.rating_avg == null && snapshot.review_count == null) snapshot = null;

  const reviews = [].concat(product.review ?? []).map((r, i) => ({
    external_id: r['@id'] ?? r.url ?? `ld-${i}-${(r.author?.name ?? r.author ?? '')}-${r.datePublished ?? ''}`,
    rating: toFive(r.reviewRating?.ratingValue, r.reviewRating?.bestRating),
    title: r.name ?? r.headline ?? null,
    body: r.reviewBody ?? r.description ?? null,
    author_name: typeof r.author === 'string' ? r.author : r.author?.name ?? null,
    reviewed_at: r.datePublished ?? null,
  }));

  return { snapshot, reviews };
}
