// One scrape run over the sources that are due. Shared by the CLI and the Vercel cron.
import { scrapeSource } from './scrape.js';
import { dueSources, startRun, finishRun, saveResult } from './store.js';

export async function runBatch(db, { limit = 10, trigger = 'cli', deadline = Infinity, log = () => {} } = {}) {
  const runId = await startRun(db, trigger);
  const sources = await dueSources(db, limit);
  const errors = [];
  let attempted = 0;
  let upserted = 0;

  for (const source of sources) {
    if (Date.now() > deadline) break;
    attempted++;
    const result = await scrapeSource(source);
    try {
      const n = await saveResult(db, source, result);
      upserted += n;
      log(`${result.status.padEnd(17)} ${String(n).padStart(4)} reviews  ${source.retailer}  ${source.url}`);
    } catch (e) {
      result.error = e.message;
    }
    if (result.error) errors.push({ source: source.url, status: result.status, error: result.error });
  }

  await finishRun(db, runId, { sources_attempted: attempted, reviews_upserted: upserted, errors });
  return { runId, attempted, upserted, errors };
}
