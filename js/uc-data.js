// ═══════════════════════════════════════════════════════════════════════════
// uc-data.js — общий слой доступа к данным UnityCode.
//
// Зачем: чтение графа сейчас переписано заново в каждой странице, и оно
// РАЗОШЛОСЬ. Ретраи при обрыве связи были только в implant.html; set.html,
// petlya.html и log.html падали с первой неудачной попытки. Это прямо
// противоречит первому принципу проекта — «работает на худшем канале,
// шум не теряется».
//
// Модуль НЕ трогает: очередь вплетений (uc_weave_queue живёт в petlya.html),
// запись в базу (только через write-воркер), UI, рендер.
// Это слой чтения. Ничего больше.
//
// Подключать ДО инлайн-скрипта страницы:
//   <script src="js/uc-data.js"></script>
//
// Совместимость: если страница уже объявила SUPABASE_URL / SUPABASE_KEY —
// модуль использует их, а не свои. Ничего переопределять не нужно.
// ═══════════════════════════════════════════════════════════════════════════

(function (global) {
  'use strict';

  // ── Конфиг ────────────────────────────────────────────────────────────
  // Единственный источник этих значений — этот файл (страницы объявляют
  // свои константы через const, что НЕ создаёт window.SUPABASE_*, поэтому
  // «взять со страницы» в браузере не работает — не рассчитывать на это).
  // Ключ публичный (только чтение через RLS), в модуле ему место.
  // ФОРКЕР: подставь свои.
  const DEFAULT_URL = 'https://lukyyqabkxzrgdixzphs.supabase.co';
  const DEFAULT_KEY = 'sb_publishable_c94zOuVnId_NFhHZgRzQ2Q_h3tljPjf';

  function url() {
    return (typeof global.SUPABASE_URL === 'string' && global.SUPABASE_URL) || DEFAULT_URL;
  }
  function key() {
    return (typeof global.SUPABASE_KEY === 'string' && global.SUPABASE_KEY) || DEFAULT_KEY;
  }
  function headers(extra) {
    const h = { apikey: key(), Authorization: 'Bearer ' + key() };
    return extra ? Object.assign(h, extra) : h;
  }

  // ── Ядро: fetch с ретраями ────────────────────────────────────────────
  // Перенесено из implant.html без изменений в поведении: 3 попытки,
  // бэкофф 0.8с → 2с → 5с. Бросает последнюю ошибку, если все провалились —
  // вызывающий сам решает, показывать ли пустоту или оставить экран как был.
  async function fetchRetry(u, options, attempts = 3, delaysMs = [800, 2000, 5000]) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(u, options);
        if (res.ok) return res;
        lastErr = new Error('HTTP ' + res.status);
      } catch (e) {
        lastErr = e;
      }
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, delaysMs[i] || 5000));
      }
    }
    throw lastErr;
  }

  // Тот же ретрай, но сразу с JSON и заголовками Supabase.
  async function get(path, extraHeaders) {
    const res = await fetchRetry(url() + '/rest/v1/' + path, { headers: headers(extraHeaders) });
    return res.json();
  }

  // ── Личность ──────────────────────────────────────────────────────────
  function token() {
    try { return localStorage.getItem('uc_token') || ''; } catch (e) { return ''; }
  }

  // Ключевая фраза → токен. SHA-256 от trim+lowercase.
  // Было продублировано в set.html и log.html — теперь одна реализация,
  // иначе одна и та же фраза дала бы на разных страницах разный токен.
  async function phraseToToken(phrase) {
    const norm = String(phrase || '').trim().toLowerCase();
    try {
      const enc = new TextEncoder().encode(norm);
      const hash = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // crypto.subtle недоступен (не-HTTPS контекст) — старый запасной путь
      let h = 0;
      for (const c of norm) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
      return Math.abs(h).toString(16).padStart(8, '0')
        + norm.length.toString(16)
        + Date.now().toString(16).slice(-8);
    }
  }

  // ── Узлы ──────────────────────────────────────────────────────────────

  // Свои узлы (по токену). select задаётся вызывающим — страницам нужны
  // разные поля, и тянуть лишнее на слабом канале незачем.
  async function myNodes(select = 'id,created_at,raw_noise,ai_interpretation', tok) {
    const t = tok || token();
    if (!t) return [];
    const rows = await get('nodes?user_token=eq.' + encodeURIComponent(t)
      + '&select=' + select + '&order=created_at.desc');
    return Array.isArray(rows) ? rows : [];
  }

  // Все узлы. limit=0 — без лимита (весь граф).
  async function allNodes(select = 'id,raw_noise,ai_interpretation', limit = 0) {
    let path = 'nodes?select=' + select + '&order=created_at.desc';
    if (limit > 0) path += '&limit=' + limit;
    const rows = await get(path);
    return Array.isArray(rows) ? rows : [];
  }

  // Только узлы с координатами — для карты.
  async function nodesWithPlace(select = 'id,created_at,raw_noise,lat,lng,user_token', since) {
    let path = 'nodes?select=' + select
      + '&lat=not.is.null&lng=not.is.null&order=created_at.desc';
    if (since) path += '&created_at=gt.' + encodeURIComponent(since);
    const rows = await get(path);
    return Array.isArray(rows) ? rows : [];
  }

  // Точное число узлов. Prefer:count=exact + limit=1 — не тянет строки,
  // читает только заголовок Content-Range. Нужно для триггера кэша анализа:
  // window._graphCounts устаревает, если граф изменился без перезагрузки.
  async function countNodes() {
    try {
      const res = await fetchRetry(url() + '/rest/v1/nodes?select=id&limit=1', {
        headers: headers({ Prefer: 'count=exact' }),
      });
      const cr = res.headers.get('content-range'); // "0-0/123"
      const total = cr ? parseInt(cr.split('/')[1], 10) : NaN;
      return Number.isFinite(total) ? total : null;
    } catch (e) {
      return null;
    }
  }

  // ── Связи ─────────────────────────────────────────────────────────────

  async function allConnections(select = 'from_node_id,to_node_id') {
    const rows = await get('connections?select=' + select + '&status=eq.accepted');
    return Array.isArray(rows) ? rows : [];
  }

  // Связи, у которых хотя бы один конец — в списке ids.
  // PostgREST не умеет OR по двум колонкам в простом виде, поэтому два
  // запроса в обе стороны и склейка — ровно как это делали implant.html
  // и log.html по отдельности.
  async function connectionsFor(ids, select = 'from_node_id,to_node_id') {
    if (!Array.isArray(ids) || !ids.length) return [];
    const list = '(' + ids.join(',') + ')';
    const [from, to] = await Promise.all([
      get('connections?from_node_id=in.' + list + '&status=eq.accepted&select=' + select),
      get('connections?to_node_id=in.' + list + '&status=eq.accepted&select=' + select),
    ]);
    const a = Array.isArray(from) ? from : [];
    const b = Array.isArray(to) ? to : [];
    // Дедуп: связь внутри собственного графа попадёт в оба ответа.
    const seen = new Set();
    return [...a, ...b].filter(c => {
      const k = c.from_node_id + '|' + c.to_node_id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  global.UCData = {
    // конфиг
    url, key, headers,
    // ядро
    fetchRetry, get,
    // личность
    token, phraseToToken,
    // узлы
    myNodes, allNodes, nodesWithPlace, countNodes,
    // связи
    allConnections, connectionsFor,
  };
})(window);
