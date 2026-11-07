// Scrape one review source (a product page) with whichever adapter fits it.
import { fetchText, BlockedError } from './http.js';
import { parseJsonLd } from './adapters/jsonld.js';
import { detectOkendo, scrapeOkendo } from './adapters/okendo.js';

// Review vendors whose review text needs a vendor API key or a data partnership.
const PARTNER_VENDORS = {
  bazaarvoice: /bazaarvoice/i,
  powerreviews: /powerreviews/i,
  yotpo: /yotpo/i,
  turnto: /turnto/i,
  stamped: /stamped\.io/i,
  judgeme: /judge\.me/i,
};

function partnerVendor(html) {
  return Object.keys(PARTNER_VENDORS).find((v) => PARTNER_VENDORS[v].test(html)) ?? null;
}

/**
 * Returns { status, adapter, vendor, snapshot, reviews, error }.
 * status: 'ok' | 'blocked' | 'needs_partnership' | 'error'
 */
export async function scrapeSource(source, opts = {}) {
  let html;
  try {
    html = await fetchText(source.url);
  } catch (e) {
    if (e instanceof BlockedError) return { status: 'blocked', error: e.message, reviews: [] };
    return { status: 'error', error: e.message, reviews: [] };
  }

  const { snapshot, reviews: ldReviews } = parseJsonLd(html);

  const okendo = detectOkendo(html);
  if (okendo) {
    try {
      const reviews = await scrapeOkendo(okendo, opts);
      return { status: 'ok', adapter: 'okendo', snapshot, reviews };
    } catch (e) {
      return { status: e instanceof BlockedError ? 'blocked' : 'error', adapter: 'okendo', snapshot, error: e.message, reviews: [] };
    }
  }

  if (ldReviews.length) return { status: 'ok', adapter: 'jsonld', snapshot, reviews: ldReviews };

  // We still keep the public star rating, but full reviews need the vendor's cooperation.
  const vendor = partnerVendor(html);
  return {
    status: vendor ? 'needs_partnership' : snapshot ? 'ok' : 'error',
    adapter: 'jsonld',
    vendor,
    snapshot,
    reviews: [],
    error: snapshot || vendor ? null : 'No rating or reviews found on the page',
  };
}
