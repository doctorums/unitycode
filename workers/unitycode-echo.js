// ═══════════════════════════════════════════════════════════════════════════
// Этот файл живёт в двух местах: в Cloudflare (боевой воркер) и в `workers/`
// репозитория (снимок для форкеров, см. FORK.md).
// ИСТОЧНИК ИСТИНЫ — Cloudflare. Правишь в дашборде → потом обновляешь снимок.
// Если снимок разошёлся с продом — прав прод.
// ═══════════════════════════════════════════════════════════════════════════

// unitycode-echo.js — «Эхо мира»: сборщик внешних срезов (новости/наука) для
// карты в set.html, отдельный слой поверх Сети. НЕ пишет в nodes/connections,
// НЕ проходит через Привратника/Дистиллятор/Связующего — echoes/echo_responses,
// собственные таблицы (migrations/echoes.sql). Тот же принцип, что у Голосов —
// необратимость смешивания популяций: отдельная таблица, а не nodes с меткой.
//
// Основной вход — Cron Trigger (Cloudflare Dashboard → Settings → Trigger
// events). Плюс диагностический fetch() (правка 20.08 — в этой версии
// интерфейса Cloudflare у Cron Triggers нет кнопки ручного теста): заход по
// адресу воркера с ?key=<ECHO_TEST_KEY> запускает тот же сбор немедленно и
// возвращает JSON-сводку, вместо ожидания расписания.
//
// Переменные/секреты воркера (Cloudflare → Settings):
//   SUPABASE_URL                (var)    https://lukyyqabkxzrgdixzphs.supabase.co
//   SUPABASE_SERVICE_KEY        (secret) service_role ключ Supabase
//   MIMO_API_KEY                (secret) ключ шлюза DotPoin — без него прогон
//                                        целиком пропускается (нечем дистиллировать)
//   ECHO_SOURCES                (var)    список RSS-ссылок: JSON-массив или
//                                        построчный список. Должен реально покрывать
//                                        все шесть категорий (politics/science/culture/
//                                        sport/tech/economy) — иначе категория будет
//                                        существовать в фильтре UI, но окажется пустой
//                                        на карте. Ориентир: 1-2 источника на категорию.
//   ECHO_MAX_PER_SOURCE_PER_RUN (var)    опционально, дефолт 4 — сколько новых записей
//                                        брать с одного источника за один прогон. Без
//                                        лимита первый прогон после простоя отдал бы в
//                                        базу разом всё, что накопилось в RSS.
//   ECHO_RETENTION_DAYS         (var)    опционально, дефолт 21 — прунинг echoes старше
//                                        N дней по created_at, шаг перед вставкой новых.
//   ECHO_DISABLED_CATEGORIES    (var)    опционально, категории через запятую/строку —
//                                        предохранитель: выключить одну категорию
//                                        (например politics) без деплоя, если пересказ
//                                        начнёт читаться предвзято.
//   ECHO_TEST_KEY                (secret) произвольная строка — без неё диагностический
//                                        fetch() всегда отвечает 404, ручной прогон
//                                        по URL недоступен.
//
// Cron-интервал — не переменная, а сам Cron Trigger в Cloudflare Dashboard
// (например каждые 3-6 часов) — настраивает Витя, в коде не хардкожен.

const MIMO_URL = 'https://llms.dotpoin.com/v1/chat/completions';
const MIMO_MODEL = 'mimo-v2.5'; // без reasoning — короткий строгий ответ, не рассуждение

const VALID_CATEGORIES = ['politics', 'science', 'culture', 'sport', 'tech', 'economy'];
const MAX_PER_SOURCE_DEFAULT = 4;
const RETENTION_DAYS_DEFAULT = 21;

// Требование нейтральности для politics — тем же способом, каким уже
// сформулированы ограничения для Связующего/Аналитика: явная инструкция,
// не гарантия (промпт-ограничения не держатся идеально между версиями
// моделей), но снижает риск. «Эхо мира» не должно читаться как
// редакционная позиция.
//
// Язык дистиллята — явно русский: столбец echoes.lang по умолчанию 'ru',
// мультиязычные источники в этой итерации не проектируются.
// Geocoding (place → координаты) добавлен 21.08 — см. geocodePlace ниже,
// отдельный разговор и решение (Nominatim/OSM, без ключа).
const ECHO_PROMPT = `Ты — дистиллятор «Эха мира» Сети Код Единства. Тебе дают заголовок и краткое содержание новости или научной публикации. Сожми до объективной сути — короткая фраза (5-10 слов), на русском языке независимо от языка источника.

Это не пересказ и не художественная искра (как квинтэссенция человеческих мыслей внутри Сети) — это сухой факт события, сжатый до предела. Без оценки, без интерпретации, без эмоциональной окраски: голый сигнал из шума информационного поля мира, а не мнение о нём.

Определи одну доминирующую категорию: politics (политика), science (наука), culture (искусство/культура), sport (спорт), tech (технологии), economy (экономика).

Если в тексте есть узнаваемая география (город, регион, страна) — укажи place, иначе null.

ВАЖНО для category=politics: фраза — что произошло, не оценка и не позиция одной из сторон. Не выдавай мнение источника за факт, не занимай сторону.

Ответь СТРОГО одним JSON без markdown и пояснений:
{"text":"...", "category":"...", "place":"..." или null}`;

function parseSources(env) {
  const raw = (env.ECHO_SOURCES || '').trim();
  if (!raw) return [];
  // JSON-массив ИЛИ построчный список — принимаем оба формата
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch (_) { /* не JSON — построчный формат ниже */ }
  return raw.split('\n').map(s => s.trim()).filter(Boolean);
}

function maxPerSource(env) {
  const n = parseInt(env.ECHO_MAX_PER_SOURCE_PER_RUN, 10);
  return Number.isFinite(n) && n > 0 ? n : MAX_PER_SOURCE_DEFAULT;
}

function retentionDays(env) {
  const n = parseInt(env.ECHO_RETENTION_DAYS, 10);
  return Number.isFinite(n) && n > 0 ? n : RETENTION_DAYS_DEFAULT;
}

function disabledCategories(env) {
  const raw = (env.ECHO_DISABLED_CATEGORIES || '').trim();
  if (!raw) return new Set();
  return new Set(raw.split(/[,\n]/).map(s => s.trim().toLowerCase()).filter(Boolean));
}

// ── парсинг RSS/Atom без DOMParser (недоступен в Workers) ──────────────────
// Регулярки по <item>/<entry> — достаточно для стандартных фидов, ломается на
// экзотических форматах. Некритично: одна плохо распарсенная запись просто не
// попадёт в выборку, весь прогон при этом не падает.
function stripCdata(s) {
  if (!s) return '';
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  // Тег → пробел, не пустая строка: иначе слова по разные стороны инлайновой
  // разметки без своих пробелов («при <a>execution</a> угловых») слипаются
  // в один токен, и модель на дистилляции иногда пытается это осмыслить,
  // а не просто проигнорировать — отсюда обрывки вроде «при.execution».
  return (m ? m[1] : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? stripCdata(m[1]) : '';
}
function itemLink(block) {
  // Atom: <link href="..."/>; RSS 2.0: <link>url</link>
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (href) return href[1];
  return tag(block, 'link');
}
function parseFeedItems(xml) {
  const items = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [];
  for (const block of blocks) {
    const title = tag(block, 'title');
    if (!title) continue;
    items.push({
      title,
      link: itemLink(block),
      desc: tag(block, 'description') || tag(block, 'summary') || tag(block, 'content'),
      pub: tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated'),
    });
  }
  return items;
}

async function fetchFeed(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'UnityCodeEcho/1.0' } });
    if (!r.ok) return [];
    return parseFeedItems(await r.text());
  } catch (e) { return []; }
}

// Стабильный хэш от ссылки записи (или источника+даты/заголовка как откат) —
// обеспечивает идемпотентность прогонов без отдельного стейта last-seen per
// source, тем же принципом, что client_id у node/voice: дедуп через
// Prefer:resolution=ignore-duplicates, а не через хранение прогресса.
async function hashId(seed) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

// RSS description у некоторых источников — не пара предложений, а солидный
// абзац (иногда почти вся статья). Для задачи «сожми до факта» полный текст
// не нужен — начало несёт всю суть, а необрезанный вход раздувал бы
// стоимость каждого вызова независимо от того, как часто крутится крон.
const ECHO_DESC_MAX = 500;

async function distillEcho(env, item) {
  try {
    const desc = (item.desc || '').slice(0, ECHO_DESC_MAX);
    const r = await fetch(MIMO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.MIMO_API_KEY },
      body: JSON.stringify({
        model: MIMO_MODEL,
        temperature: 0.4,
        max_tokens: 120, // 5-10 слов — с запасом хватает и на JSON-обвязку
        messages: [
          { role: 'system', content: ECHO_PROMPT },
          { role: 'user', content: `Заголовок: ${item.title}\n\nСодержание: ${desc || '—'}` },
        ],
      }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const msg = d?.choices?.[0]?.message || {};
    let raw = (msg.content || '').replace(/```json|```/g, '').trim();
    if (!raw && msg.reasoning_content) {
      const rc = String(msg.reasoning_content);
      const m = rc.match(/\{[\s\S]*"text"[\s\S]*\}/);
      if (m) raw = m[0];
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const text = String(parsed.text || '').trim().slice(0, 120); // страховка поверх фразы в 5-10 слов, не 500 (DB check) — иначе абзац всё равно проскочит
    if (!text) return null;
    let category = String(parsed.category || '').toLowerCase().trim();
    if (!VALID_CATEGORIES.includes(category)) category = null; // модель ошиблась — не блокирует вставку
    const place = parsed.place ? String(parsed.place).trim().slice(0, 200) : null;
    return { text, category, place };
  } catch (e) { return null; }
}

// Дешёвая проверка ПЕРЕД платным вызовом LLM — без неё каждый прогон
// заново дистиллировал бы одни и те же заголовки (RSS за 4 часа обновляется
// частично, не целиком), а дедуп на INSERT (ignore-duplicates) отбрасывал бы
// результат уже ПОСЛЕ того, как за него заплачено. Один дешёвый select
// вместо одного дорогого вызова модели на каждый уже виденный item.
async function echoExists(env, client_id) {
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/echoes?client_id=eq.${encodeURIComponent(client_id)}&select=id&limit=1`, {
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY },
    });
    if (!r.ok) return false; // не смогли проверить — не блокируем сбор, просто заплатим за один лишний вызов
    const d = await r.json();
    return Array.isArray(d) && d.length > 0;
  } catch (e) { return false; }
}

// ── ГЕОКОДИНГ (place → координаты) через Nominatim (OpenStreetMap) ────────
// Бесплатно, без ключа — тот же OSM, что уже даёт тайлы карты в set.html.
// Политика Nominatim: не больше 1 запроса/сек и обязательный
// идентифицирующий User-Agent — оба соблюдены ниже (глобальный throttle
// через lastGeocodeAt, а не по счётчику: воркер stateless между
// вызовами, но geocodePlace всегда вызывается последовательно внутри
// одного прогона, так что module-level переменная переживает нужный
// промежуток). place — обычно широкий текст («Великобритания»,
// «Northern Ireland»), поэтому и точность результата — до страны/
// региона, не улицы; этого достаточно, приватность людей на этой же
// карте огрублена так же (см. spreadCoords в unitycode-write.js).
let lastGeocodeAt = 0;
async function geocodePlace(place) {
  if (!place) return null;
  const wait = 1100 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastGeocodeAt = Date.now();
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(place);
    const r = await fetch(url, { headers: { 'User-Agent': 'UnityCodeEcho/1.0 (unitycode.space, некоммерческий проект)' } });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    const lat = parseFloat(rows[0].lat), lon = parseFloat(rows[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch (e) { return null; }
}

// Небольшой случайный разброс вокруг центра — не про приватность (место и
// так не персональное, страна/регион), а про читаемость карты: без него
// десятки эхо про одну страну легли бы в одну и ту же точку и визуально
// схлопнулись в один пиксель. Тот же приём (равномерно по площади круга),
// что spreadCoords в unitycode-write.js, но в километрах, не метрах —
// здесь и разброс на порядки шире.
const ECHO_SPREAD_KM = 40;
function spreadEchoCoords(lat, lon, km) {
  const r = km * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  const dLat = (r * Math.cos(a)) / 111.32;
  const cosLat = Math.cos(lat * Math.PI / 180) || 1e-6;
  const dLon = (r * Math.sin(a)) / (111.32 * cosLat);
  return { lat: lat + dLat, lon: lon + dLon };
}

async function sbInsertEcho(env, row) {
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/echoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        Prefer: 'return=minimal,resolution=ignore-duplicates',
      },
      body: JSON.stringify(row),
    });
    return r.ok;
  } catch (e) { return false; }
}

async function pruneOld(env) {
  const cutoff = new Date(Date.now() - retentionDays(env) * 86400000).toISOString();
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/echoes?created_at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      },
    });
  } catch (e) { /* прунинг не критичен — переживёт следующий прогон */ }
}

function sourceHost(url) {
  try { return new URL(url).hostname; } catch (e) { return null; }
}

// Общее тело сбора — вызывается и по cron (scheduled), и по ручному
// диагностическому запросу (fetch, см. ниже). Возвращает сводку для
// отладки: без неё «отработало или нет» было видно только по счёту
// строк в echoes, ни разу не объясняя причину нуля.
async function runEchoCollection(env, opts = {}) {
  const summary = { ranAt: new Date().toISOString(), skipped: null, sources: [], inserted: 0 };

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    summary.skipped = 'no_supabase_config';
    return summary;
  }
  // Прунинг перед вставкой новых записей — шаг из ТЗ. Данные не
  // пересекаются (старые по created_at, новые получат created_at=now()),
  // поэтому не блокирует сбор — но здесь ждём явно (await, не waitUntil),
  // чтобы диагностический вызов успел его застать до ответа.
  await pruneOld(env);

  if (!env.MIMO_API_KEY) {
    summary.skipped = 'no_mimo_key'; // нечем дистиллировать — весь прогон бессмысленен
    return summary;
  }

  let sources = parseSources(env);
  if (!sources.length) {
    summary.skipped = 'no_sources';
    return summary;
  }
  // opts.maxSources/perSourceOverride — быстрый режим для ручной проверки
  // через fetch(): полный прогон (6 источников × до 4 записи, каждая — вызов
  // LLM синхронно) может тянуться минуты, для проверки «работает ли вообще
  // цепочка» это неоправданно долго. Cron (scheduled) вызывает без opts —
  // всегда полный прогон.
  if (opts.maxSources) sources = sources.slice(0, opts.maxSources);
  const perSource = opts.perSourceOverride != null ? opts.perSourceOverride : maxPerSource(env);
  const disabled = disabledCategories(env);

  // Free-план Workers режет ЛЮБОЙ вызов, начиная с 51-го исходящего fetch()
  // за один инвок (включая всё, что происходит внутри ctx.waitUntil) — жёсткий
  // потолок платформы, не наш лимит. При 6+ источниках и до 4 записей с
  // каждой (до 4 подзапросов на новую запись: проверка/дистилляция/геокодинг/
  // вставка) бюджет кончается на середине списка источников — без учёта
  // этого fetch() дальше просто падает с ошибкой, try/catch её гасит, и
  // прогон выглядит так, будто «почти ничего не сделал», без объяснения
  // почему. STOP_AT — с запасом от 50, а не впритык: сама платформа тоже
  // тратит подзапросы не только на явные fetch() в этом файле.
  const SUBREQUEST_STOP_AT = 45;
  let used = 1; // pruneOld уже потратил один fetch выше
  const budgetLeft = () => SUBREQUEST_STOP_AT - used;

  // Без ротации источники в начале списка (politics) выедали весь бюджет
  // каждый прогон, а хвост списка (economy) не получал ни одного шанса.
  // Перемешивание перед каждым прогоном — самый простой способ дать всем
  // источникам примерно равный шанс на бюджет, без отдельного хранилища
  // состояния «на чём остановились в прошлый раз».
  for (let i = sources.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sources[i], sources[j]] = [sources[j], sources[i]];
  }

  for (const url of sources) {
    if (budgetLeft() < 1) { summary.sources.push({ url, skippedBudget: true }); continue; }
    const s = { url, fetched: 0, alreadySeen: 0, distilled: 0, geocoded: 0, inserted: 0, skippedDisabled: 0, skippedBudget: 0 };
    const items = (await fetchFeed(url)).slice(0, perSource);
    used++;
    s.fetched = items.length;
    for (const item of items) {
      // Каждому item на пути до вставки нужно ≤4 подзапроса (проверка,
      // дистилляция, геокодинг, вставка) — не начинаем, если бюджета
      // заведомо не хватит на все шаги: недописанная попытка (например
      // потратились на дистилляцию, а вставка не прошла) не освобождает
      // client_id, и следующий прогон честно попробует её заново.
      if (budgetLeft() < 4) { s.skippedBudget++; break; }

      // client_id и проверка «уже видели» — ДО вызова LLM, не после. Экономит
      // платный вызов на каждом item, который уже есть в базе с прошлого
      // прогона (RSS за 4 часа обновляется частично, не целиком).
      const seed = item.link || `${url}|${item.pub || item.title}`;
      const client_id = await hashId(seed);
      const seen = await echoExists(env, client_id);
      used++;
      if (seen) { s.alreadySeen++; continue; }

      const dist = await distillEcho(env, item);
      used++;
      if (!dist) continue;
      s.distilled++;
      if (dist.category && disabled.has(dist.category)) { s.skippedDisabled++; continue; }

      // Геокодинг — тоже только для новых (уже прошли echoExists выше),
      // как и дистилляция: Nominatim не тратится на то, что и так уже
      // в базе. Неудача (нет place, сервис недоступен, ничего не нашлось)
      // не блокирует вставку — echo просто останется без точки на карте.
      let lat = null, lon = null;
      if (dist.place) {
        const geo = await geocodePlace(dist.place);
        used++;
        if (geo) {
          const spread = spreadEchoCoords(geo.lat, geo.lon, ECHO_SPREAD_KM);
          lat = spread.lat; lon = spread.lon;
          s.geocoded++;
        }
      }

      const eventTime = item.pub && !isNaN(Date.parse(item.pub)) ? new Date(item.pub).toISOString() : null;

      const ok = await sbInsertEcho(env, {
        client_id,
        text: dist.text,
        category: dist.category,
        place: dist.place,
        lat, lon,
        source_url: item.link || url,
        source_name: sourceHost(url),
        event_time: eventTime,
      });
      used++;
      if (ok) { s.inserted++; summary.inserted++; }
    }
    summary.sources.push(s);
  }
  summary.subrequestsUsed = used;
  return summary;
}

export default {
  async scheduled(event, env, ctx) {
    await runEchoCollection(env);
  },

  // Диагностика: ручной прогон без ожидания cron, с отчётом в браузере —
  // добавлено 20.08 по факту (в ТЗ был только scheduled(), но в новом
  // интерфейсе Cloudflare у Cron Triggers нет кнопки ручного теста).
  // Закрыт секретным параметром — открытый URL без него не должен уметь
  // тратить вызовы LLM по любому чужому запросу.
  // По умолчанию — быстрый режим (1 источник, 1 запись): проверить, что вся
  // цепочка вообще работает, за секунды, а не минуты, ответ ждём и отдаём
  // сразу. ?full=1 — настоящий полный прогон по всем источникам (как у
  // cron) — небыстрый (6 источников × N вызовов LLM), поэтому запускается
  // в фоне (ctx.waitUntil) и НЕ ждётся: клиент (особенно мобильный Safari)
  // иначе решает, что соединение оборвалось, и показывает ошибку — а
  // прогон при этом на сервере всё равно продолжается и пишет в базу,
  // просто без видимого отчёта. Полный отчёт для full=1 в ответе поэтому
  // не работает — итог смотрим потом в самой таблице echoes.
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!env.ECHO_TEST_KEY || url.searchParams.get('key') !== env.ECHO_TEST_KEY) {
      return new Response('not found', { status: 404 });
    }
    const full = url.searchParams.get('full') === '1';
    if (full) {
      ctx.waitUntil(runEchoCollection(env));
      return new Response(JSON.stringify({ started: true, note: 'полный прогон запущен в фоне — результат смотри в echoes через минуту-другую' }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    const summary = await runEchoCollection(env, { maxSources: 1, perSourceOverride: 1 });
    return new Response(JSON.stringify(summary, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  },
};
