// worker-write.js — UnityCode write gateway
// Поток: браузер -> этот воркер -> Supabase (service-ключ).
// Публичный (sb_publishable_) ключ в браузере остаётся ТОЛЬКО на чтение (через RLS).
//
// Переменные/секреты воркера (Cloudflare → Settings):
//   SUPABASE_URL          (var)    https://lukyyqabkxzrgdixzphs.supabase.co
//   SUPABASE_SERVICE_KEY  (secret) service_role ключ Supabase — НИКОГДА не отдавать клиенту
//   TURNSTILE_SECRET      (secret) секрет виджета Cloudflare Turnstile
//   RATE_KV               (KV)     опционально; лимит частоты по token/IP
//
// Клиент шлёт POST JSON:
//   { action:'node',       token, turnstile, raw_noise, ai_interpretation, lat?, lng? }
//   { action:'connection', token, turnstile, from_node_id, to_node_id }

const ALLOWED_ORIGINS = [
  'https://unitycode.space',
  'https://www.unitycode.space',
  // для теста добавь свой GitHub Pages origin, например:
  // 'https://doctorums.github.io',
];

// --- настройки ---
const NOISE_MIN = 1;
const NOISE_MAX = 600;
const RATE_MAX_PER_HOUR = 30;   // записей на token в час
const RATE_MAX_PER_DAY  = 200;  // записей на token в сутки

const ID_RE  = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{1,20})$/i;
const URL_RE = /(https?:\/\/|www\.|t\.me\/|\b[\w-]+\.(com|ru|net|org|xyz|io|info|link|click)\b)/i;

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

async function verifyTurnstile(token, ip, secret) {
  if (!secret) return true;          // секрет не задан — пропускаем (задай, чтобы включить)
  if (!token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const d = await r.json();
  return !!d.success;
}

// структурный антиспам — язык-независимый, текст НЕ меняем (raw остаётся сырым)
function looksSpammy(text) {
  const t = text.trim();
  if (URL_RE.test(t)) return 'link';
  if (t.length > 12) {                // флуд одним символом
    const counts = {};
    for (const ch of t) counts[ch] = (counts[ch] || 0) + 1;
    if (Math.max(...Object.values(counts)) / t.length > 0.6) return 'repetition';
  }
  return null;
}

async function rateOk(kv, token, ip) {
  if (!kv) return true;               // KV не привязан — пропускаем
  const now = Date.now();
  const windows = [
    ['h:' + token, 3600000, RATE_MAX_PER_HOUR],
    ['d:' + token, 86400000, RATE_MAX_PER_DAY],
    ['ip:' + ip,   3600000, RATE_MAX_PER_HOUR * 3],
  ];
  for (const [key, windowMs, max] of windows) {
    const raw = await kv.get(key);
    const fresh = (raw ? JSON.parse(raw) : []).filter(ts => now - ts < windowMs);
    if (fresh.length >= max) return false;
  }
  for (const [key, windowMs] of windows) {
    const raw = await kv.get(key);
    const fresh = (raw ? JSON.parse(raw) : []).filter(ts => now - ts < windowMs);
    fresh.push(now);
    await kv.put(key, JSON.stringify(fresh), { expirationTtl: Math.ceil(windowMs / 1000) });
  }
  return true;
}

async function sbInsert(env, table, row, returnRep = false) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'Prefer': returnRep ? 'return=representation' : 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error('supabase ' + r.status + ' ' + (await r.text()));
  return returnRep ? (await r.json())[0] : null;
}

async function sbExists(env, table, col, id) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${col}=eq.${id}&select=id&limit=1`, {
    headers: { 'apikey': env.SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_KEY },
  });
  if (!r.ok) return false;
  const d = await r.json();
  return Array.isArray(d) && d.length > 0;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (req.method !== 'POST') return json({ error: 'method' }, 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'origin' }, 403, origin);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'json' }, 400, origin); }

    const ip = req.headers.get('CF-Connecting-IP') || '';
    const token = (body.token || '').toString().slice(0, 128);
    if (!token) return json({ error: 'no_token' }, 400, origin);

    if (!(await verifyTurnstile(body.turnstile, ip, env.TURNSTILE_SECRET)))
      return json({ error: 'turnstile' }, 403, origin);

    if (!(await rateOk(env.RATE_KV, token, ip)))
      return json({ error: 'rate_limited' }, 429, origin);

    try {
      if (body.action === 'node') {
        const noise = (body.raw_noise || '').toString();
        const t = noise.trim();
        if (t.length < NOISE_MIN || t.length > NOISE_MAX) return json({ error: 'length' }, 422, origin);
        const spam = looksSpammy(t);
        if (spam) return json({ error: 'spam', reason: spam }, 422, origin);

        const row = {
          raw_noise: noise,                                          // храним дословно — сырое неприкосновенно
          ai_interpretation: (body.ai_interpretation || '').toString().slice(0, 2000),
          user_token: token,
        };
        if (typeof body.lat === 'number') row.lat = body.lat;
        if (typeof body.lng === 'number') row.lng = body.lng;
        const created = await sbInsert(env, 'nodes', row, true);
        return json({ ok: true, id: created?.id }, 200, origin);
      }

      if (body.action === 'connection') {
        const from = (body.from_node_id || '').toString();
        const to   = (body.to_node_id || '').toString();
        if (!ID_RE.test(from) || !ID_RE.test(to)) return json({ error: 'bad_id' }, 422, origin);
        if (from === to) return json({ error: 'self_link' }, 422, origin);
        if (!(await sbExists(env, 'nodes', 'id', from)) || !(await sbExists(env, 'nodes', 'id', to)))
          return json({ error: 'node_missing' }, 422, origin);

        // status ставит сервер, клиенту не доверяем.
        // TODO: перевести на 'pending', когда заработает консенсус «Связующего».
        await sbInsert(env, 'connections', { from_node_id: from, to_node_id: to, status: 'accepted' });
        return json({ ok: true }, 200, origin);
      }

      return json({ error: 'action' }, 400, origin);
    } catch (e) {
      return json({ error: 'server', detail: String(e).slice(0, 200) }, 500, origin);
    }
  },
};
