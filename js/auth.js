// Accounts through Supabase Auth, and saving the app's state to the user's profile.
// If /api/config isn't reachable (a plain static server), the app runs in demo mode
// without accounts and keeps state in the browser only.

let client = null;
let user = null;
let saveTimer = null;
export const auth = { ready: false, enabled: false };

export async function initAuth(onChange) {
  // Local testing: http://localhost:3000/?demo runs the full app without accounts.
  if (location.hostname === 'localhost' && new URLSearchParams(location.search).has('demo')) {
    auth.ready = true;
    return null;
  }
  try {
    const cfg = await (await fetch('/api/config')).json();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('no config');
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
    client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const { data } = await client.auth.getSession();
    user = data.session?.user ?? null;
    auth.enabled = true;
    client.auth.onAuthStateChange((event, session) => {
      const next = session?.user ?? null;
      if (next?.id === user?.id) return;
      user = next;
      onChange(event, user);
    });
  } catch {
    auth.enabled = false;
  }
  auth.ready = true;
  return user;
}

export const currentUser = () => user;
export async function accessToken() {
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
export const firstName = () => user?.user_metadata?.first_name ?? '';

export async function signUp({ email, password, firstName: name }) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { first_name: name }, emailRedirectTo: `${location.origin}/#/setup/1` },
  });
  if (error) throw error;
  // With email confirmation on, there's no session until the link is clicked.
  return { needsConfirmation: !data.session };
}

export async function signIn({ email, password }) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/#/login` });
  if (error) throw error;
}

export async function signOut() {
  await client.auth.signOut();
}

export async function loadAppState() {
  if (!user) return null;
  const { data, error } = await client.from('profiles').select('app_state').eq('id', user.id).maybeSingle();
  if (error) return null;
  return data?.app_state && Object.keys(data.app_state).length ? data.app_state : null;
}

// Debounced so a burst of taps writes once.
export function saveAppState(state) {
  if (!user || !client) return;
  clearTimeout(saveTimer);
  const id = user.id;
  saveTimer = setTimeout(() => {
    client.from('profiles').upsert({ id, app_state: state, updated_at: new Date().toISOString() }).then(() => {});
  }, 800);
}
