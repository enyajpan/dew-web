// GET /api/climate?q=Miami, FL
// The place someone typed, plus its humidity, UV and how dry the air is, averaged over
// the last 30 days. Uses Open-Meteo's free geocoding and weather APIs (no key needed).
import { send } from './_db.js';

const avg = (xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function describe(humidity, uv) {
  const h = Math.round(humidity);
  const u = Math.round(uv * 10) / 10;
  return {
    humidity: { value: h, label: h >= 65 ? 'Humid' : h >= 45 ? 'Moderate humidity' : 'Low humidity' },
    uv: { value: u, label: u >= 8 ? 'Very high UV' : u >= 6 ? 'High UV' : u >= 3 ? 'Moderate UV' : 'Low UV' },
    dryness: { label: h < 35 ? 'Very dry air' : h < 50 ? 'Dry air' : h < 65 ? 'Balanced air' : 'Moist air' },
  };
}

async function findPlace(q) {
  // "Miami, FL" -> search "Miami", then prefer the match whose state/country fits "FL".
  const [name, ...rest] = q.split(',').map((s) => s.trim()).filter(Boolean);
  const hint = rest.join(' ').toLowerCase();
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`);
  const { results = [] } = await r.json();
  if (!hint) return results[0];
  const fits = (p) => [p.admin1, p.country, p.country_code].some((x) => x && (x.toLowerCase() === hint || x.toLowerCase().startsWith(hint)))
    || (p.country_code === 'US' && US_STATES[hint.toUpperCase()] === p.admin1);
  return results.find(fits) ?? results[0];
}

const US_STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' };

export default async function handler(req, res) {
  const q = String(req.query.q ?? '').trim().slice(0, 80);
  if (q.length < 2) return send(res, 400, { error: 'Type a city or town.' });
  try {
    const place = await findPlace(q);
    if (!place) return send(res, 404, { error: `We couldn’t find “${q}”. Try a nearby city.` }, 3600);
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=uv_index_max,relative_humidity_2m_mean&past_days=30&forecast_days=1&timezone=auto`)).json();
    const humidity = avg(w.daily?.relative_humidity_2m_mean ?? []);
    const uv = avg(w.daily?.uv_index_max ?? []);
    if (humidity == null || uv == null) return send(res, 502, { error: 'Weather data is unavailable right now.' });
    const label = [place.name, place.country_code === 'US' ? place.admin1 : place.country].filter(Boolean).join(', ');
    return send(res, 200, { place: label, ...describe(humidity, uv) }, 21600);
  } catch (e) {
    return send(res, 502, { error: 'Weather data is unavailable right now.' });
  }
}
