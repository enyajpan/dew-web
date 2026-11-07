// Called by Vercel Cron after the daily scrape: refreshes AI review summaries
// for products that are new or have 20% more reviews since their last summary.
import { adminClient } from '../../scraper/store.js';
import { summarizeBatch } from '../../scraper/summarize.js';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const result = await summarizeBatch(adminClient(), { limit: 15, deadline: Date.now() + 240_000 });
  return res.status(200).json(result);
}
