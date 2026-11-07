// Okendo is a Shopify review app. Its storefront widget reads reviews from a
// public, keyless endpoint, which also carries reviewer skin type and tone.
import { fetchJson } from '../http.js';

const API = 'https://api.okendo.io/v1';

export function detectOkendo(html) {
  const subscriberId = html.match(/"subscriberId"\s*:\s*"([0-9a-f-]{36})"/)?.[1];
  if (!subscriberId) return null;
  // Use the page's own product (Shopify's analytics blob), never the first widget on
  // the page, which can belong to a featured or "you may also like" product.
  const id = html.match(/"product"\s*:\s*\{\s*"id"\s*:\s*(\d+)/)?.[1];
  return id ? { subscriberId, productId: `shopify-${id}` } : null;
}

// Okendo prints a star summary for every product widget on a page, without saying
// which product each belongs to, so we only trust it when there's exactly one.
export function okendoSummary(html) {
  const all = [...html.matchAll(/data-oke-metafield-data[^>]*>\s*(\{"averageRating":"[\d.]+","reviewCount":\d+\})/g)];
  if (all.length !== 1) return null;
  const { averageRating, reviewCount } = JSON.parse(all[0][1]);
  return { rating_avg: Number(averageRating), review_count: reviewCount };
}

function mapReview(r) {
  const attributes = {};
  for (const a of r.reviewer?.attributes ?? []) {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    attributes[key] = a.value;
  }
  if (r.isIncentivized) attributes.incentivized = true;
  return {
    external_id: r.reviewId,
    rating: r.rating,
    title: r.title ?? null,
    body: r.body ?? null,
    author_name: r.reviewer?.displayName ?? null,
    verified: r.reviewer?.isVerified ?? null,
    recommended: r.isRecommended ?? null,
    helpful_count: r.helpfulCount ?? null,
    attributes,
    reviewed_at: r.dateCreated ?? null,
  };
}

// Newest first. Stops at maxReviews, or at the first review not newer than `since`
// (the newest one already saved), so daily runs only fetch what's new.
export async function scrapeOkendo({ subscriberId, productId }, { maxReviews = 1000, since = null } = {}) {
  const reviews = [];
  const cutoff = since ? new Date(since).getTime() : -Infinity;
  let next = `/stores/${subscriberId}/products/${productId}/reviews?limit=100&orderBy=date%20desc`;
  while (next && reviews.length < maxReviews) {
    const page = await fetchJson(API + next);
    const batch = (page.reviews ?? []).map(mapReview);
    const fresh = batch.filter((r) => new Date(r.reviewed_at).getTime() > cutoff);
    reviews.push(...fresh);
    next = fresh.length < batch.length ? null : page.nextUrl ?? null;
  }
  return reviews.slice(0, maxReviews);
}
