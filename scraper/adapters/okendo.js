// Okendo is a Shopify review app. Its storefront widget reads reviews from a
// public, keyless endpoint, which also carries reviewer skin type and tone.
import { fetchJson } from '../http.js';

const API = 'https://api.okendo.io/v1';

export function detectOkendo(html) {
  const subscriberId = html.match(/"subscriberId"\s*:\s*"([0-9a-f-]{36})"/)?.[1];
  if (!subscriberId) return null;
  const productId =
    html.match(/data-oke-reviews-product-id=["'](shopify-\d+)["']/)?.[1] ??
    html.match(/"productId"\s*:\s*"?(shopify-\d+)/)?.[1] ??
    (() => {
      // Shopify's own analytics blob: meta.product.id
      const id = html.match(/"product"\s*:\s*\{\s*"id"\s*:\s*(\d+)/)?.[1];
      return id ? `shopify-${id}` : null;
    })();
  return productId ? { subscriberId, productId } : null;
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

export async function scrapeOkendo({ subscriberId, productId }, { maxReviews = 200 } = {}) {
  const reviews = [];
  let next = `/stores/${subscriberId}/products/${productId}/reviews?limit=25&orderBy=date%20desc`;
  while (next && reviews.length < maxReviews) {
    const page = await fetchJson(API + next);
    reviews.push(...(page.reviews ?? []).map(mapReview));
    next = page.nextUrl ?? null;
  }
  return reviews.slice(0, maxReviews);
}
