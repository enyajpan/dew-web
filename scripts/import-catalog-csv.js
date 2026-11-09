// Loads data/skincare-catalog.csv into Supabase `products` as catalog_only rows, so every
// listed product can be searched and added to a shelf. Products DEW already has are skipped.
//   node scripts/import-catalog-csv.js            import (or refresh) everything
//   node scripts/import-catalog-csv.js --dry-run  count only
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^(\w+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const dryRun = process.argv.includes('--dry-run');

const STEP = {
  Cleanser: 'Cleanse', 'Toner + essence': 'Tone', 'Serum + treatment': 'Treat', Exfoliant: 'Treat', Mask: 'Treat', 'Face oil': 'Treat',
  'Eye care': 'Eyes', Moisturizer: 'Moisturize', Sunscreen: 'Protect', 'Lip care': 'Lips', 'Body care': 'Body',
};
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const slug = (s) => norm(s).replace(/ /g, '-').slice(0, 60);
// "nivea" -> "Nivea", "paula-s-choice" -> "Paula's Choice"; leave brands that already use capitals ("e.l.f.", "COSRX") alone.
const brandCase = (b) => {
  if (b !== b.toLowerCase() || b.length <= 3) return b;
  const words = /^[a-z0-9]+(-[a-z0-9]+)+$/.test(b) ? b.replace(/-s-/g, "'s-").replace(/-/g, " ") : b;
  return words.replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase());
};

function parseCsv(text) {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',');
  return lines.map((line) => {
    const cells = [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
}

const rows = parseCsv(readFileSync('data/skincare-catalog.csv', 'utf8'));
const { data: existing, error } = await db.from('products').select('id, brand, name, catalog_only').limit(50000);
if (error) throw error;
const have = new Set(existing.filter((p) => !p.catalog_only).map((p) => `${norm(p.brand)}|${norm(p.name)}`));

const seen = new Set();
const out = [];
for (const r of rows) {
  const brand = brandCase(r.brand.trim() || 'Unknown brand');
  const key = `${norm(brand)}|${norm(r.product_name)}`;
  if (have.has(key) || seen.has(key)) continue;
  seen.add(key);
  out.push({
    id: `cat-${slug(`${brand} ${r.product_name}`)}-${createHash('sha1').update(key).digest('hex').slice(0, 6)}`,
    brand, name: r.product_name, step: STEP[r.category] ?? null, category: r.category,
    price_usd: Number(r.price_usd) || null, image_path: r.image_url || null,
    catalog_only: true, sold_at: r.sold_at, product_url: r.url || null,
    listed_rating: Number(r.rating) || null, listed_review_count: Number(r.review_count) || null,
  });
}
console.log(`${rows.length} rows: ${out.length} to import or refresh, ${rows.length - out.length} already in DEW or listed twice`);
if (dryRun) process.exit(0);
for (let i = 0; i < out.length; i += 1000) {
  const { error: e } = await db.from('products').upsert(out.slice(i, i + 1000));
  if (e) throw e;
  process.stdout.write('.');
}
console.log(' done');
