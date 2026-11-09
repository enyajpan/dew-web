// Fills in the brand for data/skincare-catalog.csv rows that have none (Dermstore listings
// where the brand is part of the name), using Dermstore's brand directory plus every brand
// already in the list. Rows that still can't be told apart get "Unknown brand".
//   node scripts/fill-catalog-brands.js
import { readFileSync, writeFileSync } from 'node:fs';
import { dermstoreBrands, brandSplitter } from './catalog-brands.js';

const file = 'data/skincare-catalog.csv';
const [head, ...lines] = readFileSync(file, 'utf8').trim().split('\n');
const cols = head.split(',');
const cellsOf = (line) => [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"')).slice(0, cols.length);
const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const rows = lines.map((l) => Object.fromEntries(cols.map((c, i) => [c, cellsOf(l)[i] ?? ''])));

const split = brandSplitter([...(await dermstoreBrands()), ...rows.map((r) => r.brand).filter(Boolean)]);
let found = 0;
let unknown = 0;
for (const r of rows) {
  if (r.brand) continue;
  const hit = split(r.product_name);
  if (hit) { r.brand = hit.brand; r.product_name = hit.name; found++; } else { r.brand = 'Unknown brand'; unknown++; }
}
rows.sort((a, b) => a.brand.localeCompare(b.brand) || a.product_name.localeCompare(b.product_name));
writeFileSync(file, `${head}\n${rows.map((r) => cols.map((c) => cell(r[c])).join(',')).join('\n')}\n`);
console.log(`brands filled in: ${found}; still unknown: ${unknown}`);
