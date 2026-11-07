// CLI: `npm run scrape` writes to Supabase; `npm run scrape:dry` scrapes
// scraper/sources.json and writes JSON to scraper/out/ without touching the database.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { scrapeSource } from './scrape.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 25);
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1];

if (existsSync('.env')) process.loadEnvFile('.env');

async function dry() {
  const sources = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'))
    .filter((s) => !only || s.product_id === only || s.retailer === only);
  await mkdir(new URL('./out/', import.meta.url), { recursive: true });
  for (const source of sources) {
    const result = await scrapeSource(source, { maxReviews: 50 });
    const rating = result.snapshot ? `${result.snapshot.rating_avg ?? '-'}★ (${result.snapshot.review_count ?? '?'})` : 'no rating';
    console.log(
      `${result.status.padEnd(17)} ${String(result.reviews.length).padStart(3)} reviews  ${rating.padEnd(14)} ${(result.adapter ?? '').padEnd(7)} ${result.vendor ?? ''}  ${source.retailer}/${source.product_id}${result.error ? '  — ' + result.error : ''}`,
    );
    const file = new URL(`./out/${source.retailer}-${source.product_id}.json`, import.meta.url);
    await writeFile(file, JSON.stringify({ source, ...result }, null, 2));
  }
}

async function live() {
  const { adminClient } = await import('./store.js');
  const { runBatch } = await import('./batch.js');
  const summary = await runBatch(adminClient(), { limit, trigger: 'cli', log: console.log });
  console.log(`\nRun ${summary.runId}: ${summary.attempted} sources, ${summary.upserted} reviews saved, ${summary.errors.length} errors`);
}

await (dryRun ? dry() : live());
