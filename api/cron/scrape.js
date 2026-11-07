// Called by Vercel Cron (see vercel.json). Scrapes the sources that are most
// overdue, stopping before the function's time limit.
import { adminClient } from '../../scraper/store.js';
import { runBatch } from '../../scraper/batch.js';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const deadline = Date.now() + 240_000;
  const summary = await runBatch(adminClient(), { limit: 25, trigger: 'cron', deadline });
  return res.status(200).json(summary);
}
