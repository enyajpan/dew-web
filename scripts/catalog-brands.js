// Tells a product's brand apart from its name when a store only gives "Brand Product Name"
// (Dermstore's sitemap). Used by build-catalog.js and fill-catalog-brands.js.
import { politeFetch } from '../scraper/http.js';

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');

// Dermstore's own brand directory, e.g. "Eminence Organic Skin Care", "Alpha-H".
export async function dermstoreBrands() {
  const html = await (await politeFetch('https://www.dermstore.com/c/brands/')).text();
  return [...html.matchAll(/href="\/c\/brands\/[a-z0-9-]+\/"[^>]*>([\s\S]{0,400}?)<\/a>/g)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())).filter(Boolean);
}

// Returns a function: "Eminence Calm Skin Arnica Masque" -> { brand: "Eminence Organic Skin Care", name: "Calm Skin Arnica Masque" }.
export function brandSplitter(brands) {
  // One spelling per brand, preferring a properly written one ("Paula's Choice" over "paula-s-choice").
  const score = (b) => (/[A-Z]/.test(b) ? 2 : 0) - (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(b) ? 3 : 0);
  const best = new Map();
  for (const b of brands) { const k = norm(b); if (k.length > 2 && (!best.has(k) || score(b) > score(best.get(k)))) best.set(k, b); }
  const list = [...best.values()].sort((a, b) => norm(b).length - norm(a).length);
  const firstWord = new Map();
  // Only brands whose other words are generic ("Eminence Organic Skin Care"), so "Better With Age"
  // can't be mistaken for a brand like "Better Not Younger".
  const GENERIC = new Set(['organic', 'skin', 'care', 'skincare', 'beauty', 'cosmetics', 'md', 'labs', 'lab', 'paris', 'professional', 'london', 'new', 'york', 'naturals', 'botanicals', 'clinical', 'the', 'co', 'by']);
  for (const b of list) {
    const [w, ...rest] = norm(b).split(' ');
    if (w.length > 3 && rest.length && rest.every((x) => GENERIC.has(x)) && !firstWord.has(w)) firstWord.set(w, b);
  }
  return (full) => {
    const n = `${norm(full)} `;
    const words = full.trim().split(/\s+/);
    const whole = list.find((b) => n.startsWith(`${norm(b)} `));
    if (whole) return { brand: whole, name: words.slice(norm(whole).split(' ').length).join(' ') || full };
    // "Eminence Apricot Body Oil" -> the brand whose name starts with "Eminence"
    const byFirst = firstWord.get(norm(words[0]));
    if (byFirst) return { brand: byFirst, name: words.slice(1).join(' ') || full };
    return null;
  };
}
