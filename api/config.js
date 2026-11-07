// GET /api/config -> the public Supabase settings the browser needs for sign-in.
// The anon key is designed to be public; row level security protects the data.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json({ supabaseUrl: process.env.SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY });
}
