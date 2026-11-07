// Live data from /api. Screens call useJson() while rendering; it returns what's
// cached right away and re-renders once the request finishes. If the API can't
// be reached (e.g. a plain static server), status becomes 'error' and screens
// fall back to the sample data in data.js.

const cache = new Map();
let onChange = () => {};

export function onData(fn) { onChange = fn; }

export function useJson(url) {
  let entry = cache.get(url);
  if (!entry) {
    entry = { status: 'loading', data: null };
    cache.set(url, entry);
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((data) => { entry.status = 'ok'; entry.data = data; })
      .catch(() => { entry.status = 'error'; })
      .finally(() => onChange());
  }
  return entry;
}

export const productsUrl = '/api/products';

export function reviewsUrl({ product, skinType, limit = 20 } = {}) {
  const p = new URLSearchParams({ limit: String(limit) });
  if (product) p.set('product', product);
  if (skinType) p.set('skin_type', skinType);
  return `/api/reviews?${p}`;
}
