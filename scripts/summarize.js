// Writes AI pros/cons summaries for products whose summary is missing or stale.
//   node scripts/summarize.js              -> up to 200 products
//   node scripts/summarize.js --limit=3    -> try a few first
import { existsSync } from 'node:fs';
import { adminClient } from '../scraper/store.js';
import { summarizeBatch } from '../scraper/summarize.js';

if (existsSync('.env')) process.loadEnvFile('.env');
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 200);
const result = await summarizeBatch(adminClient(), { limit, log: console.log });
console.log(`\n${result.done} of ${result.due} summarized, ${result.errors.length} errors`);
