// Read-only Supabase client for API routes (anon key; RLS allows public reads).
import { createClient } from '@supabase/supabase-js';

export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export function send(res, status, body, cacheSeconds = 0) {
  if (cacheSeconds) res.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 10}`);
  res.status(status).json(body);
}
