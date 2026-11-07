// Polite fetching: honest user agent, robots.txt, and a per-host delay.
import robotsParser from 'robots-parser';

export const USER_AGENT = 'DewReviewBot/0.1 (+https://github.com/enyajpan/dew-web)';
const BOT_NAME = 'DewReviewBot';
const HOST_DELAY_MS = 3000;
const TIMEOUT_MS = 20000;

const robotsCache = new Map(); // origin -> parser (or null when robots.txt is unreachable)
const lastHit = new Map();     // host -> timestamp

export class BlockedError extends Error {
  constructor(message, status) { super(message); this.name = 'BlockedError'; this.status = status; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHost(host) {
  const wait = (lastHit.get(host) ?? 0) + HOST_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

async function rawFetch(url, accept) {
  const { host } = new URL(url);
  await waitForHost(host);
  return fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

async function robotsFor(url) {
  const { origin } = new URL(url);
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  const robotsUrl = `${origin}/robots.txt`;
  let parser = null;
  // No readable robots.txt means no rules; a site that refuses bots will refuse the page itself.
  const res = await rawFetch(robotsUrl, 'text/plain');
  if (res.ok) parser = robotsParser(robotsUrl, await res.text());
  robotsCache.set(origin, parser);
  return parser;
}

export async function politeFetch(url, { accept = 'text/html' } = {}) {
  const robots = await robotsFor(url);
  if (robots && robots.isAllowed(url, BOT_NAME) === false) {
    throw new BlockedError(`robots.txt disallows ${url}`, 0);
  }
  const res = await rawFetch(url, accept);
  if ([401, 403, 429].includes(res.status)) throw new BlockedError(`${res.status} from ${url}`, res.status);
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res;
}

export async function fetchText(url) {
  return (await politeFetch(url)).text();
}

export async function fetchJson(url) {
  return (await politeFetch(url, { accept: 'application/json' })).json();
}
