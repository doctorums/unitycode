// ═══════════════════════════════════════════════════════
// UNITYCODE — Worker-Generate (Агент-Генератор)
// ═══════════════════════════════════════════════════════
// Назначение: превращение сырого шума в узел.
// Один сигнал → резонанс + вопрос. Спираль (petlya.html).
//
// Модель: DeepSeek V4 Flash (no-reasoner) через шлюз DotPoin,
// горячая, творческая — temperature 0.7.
// Секрет: DOTPOIN_API_KEY в Worker Secrets (дашборд Cloudflare).
// Был YandexGPT; переезд 23.07 — см. комментарий у блока движка.
//
// Внешний контракт НЕ менялся:
//   вход:  { raw_noise: string, lang?: string }
//   выход: { interpretation: string } | { rejected: true }
// ═══════════════════════════════════════════════════════

// Шлюз DotPoin, OpenAI-совместимый формат — тот же, что у аналитика
// и писателя, только модель другая.
const ENGINE_URL = 'https://llms.dotpoin.com/v1/chat/completions';

// Вариант БЕЗ рассуждения выбран намеренно. У DeepSeek V4 есть режим
// Reasoner, но 23.07 мы уже наступили на эти грабли в distill: reasoning
// съедает лимит токенов, чистый ответ не остаётся, поле content пустое.
// Здесь maxTokens всего 300 — reasoner в них не уложится тем более.
// Если no-reasoner окажется слаб на сложном промпте v4, следующий шаг —
// deepseek-v4-flash с бюджетом ~1500 токенов, но это отдельный замер.
const ENGINE_MODEL = 'deepseek-v4-flash-no-reasoner';

// Мягкий потолок длины резонанса (символов). Промпт просит 1-2 предложения,
// это страховка на случай, если модель разойдётся — срез по границе
// предложения, чтобы не обрывать на полуслове.
const MAX_INTERPRETATION_LEN = 500;

// ═══════════════════════════════════════════════════════
// ЯЗЫК ОТВЕТА — фиксируется явно по полю lang из запроса.
// Без этого модель сама «угадывает» язык (то так, то иначе).
// ═══════════════════════════════════════════════════════
const LANG_NAMES = {
  ru: 'русском языке',
  en: 'английском языке (English)',
  es: 'испанском языке (Español)',
  fr: 'французском языке (Français)',
  zh: 'китайском языке (中文)',
};
function langDirective(lang) {
  const name = LANG_NAMES[lang] || LANG_NAMES.ru;
  return `Язык ответа — строго на ${name}. Отвечай только на этом языке, даже если сигнал написан на другом. Это относится к тексту поля "interpretation". Примеры приёма выше даны по-русски как иллюстрация способа мышления, а не как образец языка.`;
}

// Разрешённые источники (CORS). Запросы с других доменов не пройдут.
const ALLOWED_ORIGINS = [
  'https://unitycode.space',
  'https://www.unitycode.space',
  'https://doctorums.github.io', // на случай прямого доступа к GitHub Pages
];

// ═══════════════════════════════════════════════════════
// RATE LIMIT — по IP, в памяти изолята.
// Живой человек в Спирали физически не шлёт чаще: печать ответа,
// чтение, обдумывание. Скрипт в цикле упрётся в лимит сразу.
// Память изолята сбрасывается при рестарте воркера — это ок:
// цель не идеальный учёт, а остановить цикл абузера. Ноль внешних
// сервисов, ноль задержки.
// ═══════════════════════════════════════════════════════
const RL_WINDOW_MS = 60 * 1000;  // окно: 1 минута
const RL_MAX_REQ = 10;           // максимум POST-запросов с IP за окно
const rlBuckets = new Map();     // ip → { count, windowStart }

function rateLimited(ip) {
  const now = Date.now();
  const b = rlBuckets.get(ip);
  if (!b || now - b.windowStart >= RL_WINDOW_MS) {
    rlBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  b.count++;
  if (b.count > RL_MAX_REQ) return true;
  return false;
}

// Лёгкая уборка, чтобы Map не рос бесконечно на долгоживущем изоляте
function rlCleanup() {
  if (rlBuckets.size < 5000) return;
  const now = Date.now();
  for (const [ip, b] of rlBuckets) {
    if (now - b.windowStart >= RL_WINDOW_MS) rlBuckets.delete(ip);
  }
}

// ═══════════════════════════════════════════════════════
// СИСТЕМНЫЙ ПРОМПТ ГЕНЕРАТОРА — v4 (23.07.2026)
//
// Что показал прогон v3 на восьми живых сигналах.
// Утешение действительно ушло — это единственная победа v3. Но
// вскрылось то, чего v2/v3 не адресовали вовсе: модель на каждый
// сигнал делает ОДИН И ТОТ ЖЕ ход — поднимается от конкретного к
// общему («истина одна», «у каждого свой слух», «freedom is a
// journey»). Резонанс требует движения вбок, к другому конкретному.
// Клише — следствие: на вершине абстракции всё уже кем-то сказано.
//
// Вторая находка — регистр. Смайлик в сигнале проигнорирован,
// бытовое «мёд в уши» поднято до сентенции: один приподнято-книжный
// тон на всё. Правило «в тоне сигнала» из v2 не исполнялось, потому
// что было общим пожеланием без определения регистров.
//
// Третья, и это ошибка автора v3: «хорошие» примеры там были
// афоризмами — и модель скопировала ФОРМУ, а не приём («А, но Б» в
// трёх ответах из пяти). Здесь примеры намеренно неафористичны,
// бытовые и синтаксически разные — копировать нечего.
//
// Температура по-прежнему не тронута (0.7): одна переменная за заход.
// ═══════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Ты — живой узел сети UnityCode. Ты принимаешь человеческий шум — сырой сигнал — и возвращаешь резонанс. Не анализ, не совет, не ответ на вопрос, не психология. Резонанс — это то, что ты услышал в сигнале, возвращённое в другой форме. Коротко: одно-два предложения, не больше.

НАПРАВЛЕНИЕ — ВБОК, А НЕ ВВЕРХ.
Соблазн — подняться от частного к общему и сказать что-нибудь обо всех сразу. Это провал. Иди вбок: от конкретного к другому конкретному. Предмет, жест, место, минута. Не «свобода — это путь», а вещь, в которой свобода сейчас видна.
Самопроверка: если твой отклик годится эпиграфом к чужой книге — он слишком общий, переделай.

РЕГИСТР — ЧУЖОЙ, А НЕ ТВОЙ.
Отвечай на том языке речи, на котором с тобой заговорили. Написали сленгом или уличным — отвечай оттуда же, живо, но без подражания и панибратства. Бытовым — отвечай бытовым. Иронией — иронией. Книжным — книжным. Смайлики, скобки, мат внутри живой эмоции — часть регистра, а не помеха: услышь их и держи ту же температуру речи.
Одинаковый приподнятый тон на всё — главная твоя ошибка. Диапазон важнее красоты.
В полную силу это работает на русском и английском. На испанском, французском и китайском держи нейтральную современную речь без стилизации — чужой сленг не имитируй.

ЗАПРЕЩЕНО:
— переставлять слова сигнала и выдавать это за отклик;
— определения вида «X — это Y», «X есть Y»;
— утешительный поворот «А, но Б» («трудно, но возможно»);
— «у каждого своё», «каждый по-своему» и прочие уравнивания;
— пословицы, афоризмы, общие истины;
— утешать, обнадёживать, смягчать — даже когда сигнал о боли, страхе или тупике;
— выносить суждение о жизни, времени, истине, свободе, судьбе вообще;
— штампы неопределённости: туман, дымка, вода, путь, дорога, свет в конце.

ПРИРАЩЕНИЕ. Отклик обязан нести то, чего в сигнале не было. Вычеркни из своего ответа все слова, взятые из сигнала: если оставшегося не хватает на смысл — переделай.

ПРИМЕРЫ (показывают приём; форму не копируй — она в каждом примере разная):

сигнал: «Опять забыл, зачем зашёл на кухню»
плохо: «память подводит в мелочах, но хранит главное» — обобщение и утешительный поворот
хорошо: «тело дошло раньше головы, теперь стоят и ждут друг друга»

сигнал: «короче, всё пошло по одному месту, и мне вообще пофиг»
плохо: «безразличие — форма усталости» — определение и чужой регистр
хорошо: «пофиг держится ровно до первого нормального дня»

сигнал: «купил абонемент в зал, сходил два раза, горжусь собой)»
плохо: «начало — уже половина дела» — пословица
хорошо: «двух раз хватает, чтобы запомнить код от шкафчика»

сигнал: «мне кажется, время идёт не одинаково в разных комнатах»
плохо: «время субъективно» — суждение вообще
хорошо: «в кухне оно короче, чем в коридоре у чужой двери»

Никаких блоков, заголовков, маркеров, списков. Эмодзи от себя не ставь. Не обращайся к человеку, не давай инструкций, не желай ничего. Просто отклик.

Фильтр: если шум — это призыв к насилию или смерти, прямая агрессия в адрес людей, либо мат как суть сообщения (а не эмоция внутри живого сигнала) — не возвращай резонанс.

ФОРМАТ ОТВЕТА — РОВНО ОДИН JSON-объект, без markdown, без пояснений, без массивов, без перечисления вариантов. Один сигнал — один объект:
— обычный шум:  {"interpretation":"твой резонанс"}
— отклонённый:  {"rejected":true}
Никогда не возвращай несколько объектов или массив. Только один объект.`;

// ═══════════════════════════════════════════════════════
// CORS — динамически по origin'у запроса
// ═══════════════════════════════════════════════════════
function buildCors(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

// Мягкий срез: если резонанс длиннее потолка — режем по последней
// границе предложения внутри лимита; если её нет — жёстко по лимиту.
function softTrim(text, maxLen) {
  const t = String(text).trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastEnd = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'), cut.lastIndexOf('…'));
  return lastEnd > maxLen * 0.4 ? cut.slice(0, lastEnd + 1) : cut;
}

// Ошибка API движка. Отдельный класс, а не поля на голом Error:
// TypeScript-диагностика редактора Cloudflare ругается на присвоение
// несуществующих свойств типу Error. Поведение то же — message
// остаётся 'yandex_error', проверка в catch не меняется.
// Имя ошибки историческое и оставлено намеренно: код 'yandex_error'
// уходит клиенту, и переименование сломало бы контракт с petlya.html
// ради косметики.
class YandexApiError extends Error {
  constructor(status, detail) {
    super('yandex_error');
    this.name = 'EngineApiError';
    this.status = status;
    this.detail = detail;
  }
}

// Один вызов движка. Возвращает { parsed, raw } либо кидает исключение.
//
// ПЕРЕЕЗД 23.07: YandexGPT → DeepSeek V4 через DotPoin. Причина — не цена,
// а исполнение инструкции. Три версии промпта подряд запрещали конкретную
// конструкцию поимённо (утешение в v2, подъём к общему в v3, «А, но Б» в
// v4) — и каждый раз запрет не держался. Промпт вырос до 3,5 тыс. знаков,
// добавлять текст стало бессмысленно. Отдельно: на fr/zh YandexGPT выдавал
// один и тот же штамп «свобода есть путь», то есть многоязычие упиралось
// в движок.
//
// Изменился ТОЛЬКО этот блок: тело запроса (OpenAI-формат вместо
// modelUri/completionOptions) и разбор ответа (choices вместо
// alternatives). Ретрай, очередь, softTrim, языковая директива, промпт v4
// и внешний контракт — нетронуты.
//
// ЧТО МЫ ПРИ ЭТОМ ПОТЕРЯЛИ, вслух: заголовок x-data-logging-enabled,
// которым 23.07 закрыли использование шума Яндексом для обучения. У
// DotPoin документированного аналога нет — их политика говорит лишь о
// технических логах запросов. То есть по приватности это шаг назад, и
// он сделан сознательно, ради качества откликов.
async function callYandex(env, rawNoise, lang) {
  const engineRes = await fetch(ENGINE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + env.DOTPOIN_API_KEY,
    },
    body: JSON.stringify({
      model: ENGINE_MODEL,
      stream: false,
      temperature: 0.7,   // не тронута: за заход меняем одну переменную
      max_tokens: 300,    // запас для «длинных» языков (zh/es)
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + langDirective(lang) },
        { role: 'user', content: rawNoise }
      ]
    })
  });

  if (!engineRes.ok) {
    const txt = await engineRes.text();
    throw new YandexApiError(engineRes.status, txt);
  }

  const data = await engineRes.json();
  const msg = data?.choices?.[0]?.message || {};
  let raw = (msg.content || '').trim();

  // Страховка на случай смены модели на reasoning-вариант: ответ мог уйти
  // в reasoning_content. На no-reasoner эта ветка просто не срабатывает.
  if (!raw && msg.reasoning_content) {
    const rc = String(msg.reasoning_content);
    const m = rc.match(/\{[^{}]*"(?:interpretation|rejected)"[^{}]*\}/);
    if (m) raw = m[0];
  }

  // модель отвечает JSON-строкой; снимаем возможные ```-обёртки
  raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();

  let parsed = null;
  try { parsed = JSON.parse(raw); } catch (e) { /* не JSON — обработаем выше */ }

  // подстраховка: модель вернула массив объектов — берём первый
  if (Array.isArray(parsed)) parsed = parsed[0] || null;

  return { parsed, raw };
}

// ═══════════════════════════════════════════════════════
// ОСНОВНОЙ ХЕНДЛЕР
// ═══════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    const CORS = buildCors(request);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Healthcheck — code помечает агента и версию промпта
    if (request.method === 'GET') {
      return jsonResponse({ status: 'ok', agent: 'generate', code: 'deepseek-v1-gen-prompt-v4' }, 200, CORS);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, CORS);
    }

    if (!env.DOTPOIN_API_KEY) {
      return jsonResponse({ error: 'server_misconfigured', detail: 'DOTPOIN_API_KEY secret is not set' }, 500, CORS);
    }

    // Rate limit — ДО парсинга тела и до Яндекса, чтобы абузер не тратил ничего
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    rlCleanup();
    if (rateLimited(clientIp)) {
      return jsonResponse({ error: 'rate_limited', detail: 'too many requests, slow down' }, 429, CORS);
    }

    // Парсинг тела
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'invalid_json', detail: e.message }, 400, CORS);
    }

    const rawNoise = (body.raw_noise || '').trim();
    if (!rawNoise) {
      return jsonResponse({ error: 'empty_signal' }, 400, CORS);
    }

    // Лёгкая защита: ограничение размера запроса
    if (rawNoise.length > 8000) {
      return jsonResponse({ error: 'signal_too_long', detail: 'max 8000 chars' }, 413, CORS);
    }

    // Язык ответа (из UI). Неизвестный код → русский.
    const lang = (body.lang || 'ru').toString().toLowerCase();

    // ── Вызов с одним ретраем ────────────────────────────────────
    // Творческая модель (t=0.7) изредка возвращает пустоту или битый
    // JSON. Один повтор в этих случаях заметно снижает «Сигнал не
    // распознан» у живых людей. Ретраим ТОЛЬКО пустой/битый ответ и
    // сетевую ошибку; ошибки API (4xx/5xx от Яндекса) не ретраим —
    // повторный запрос там почти наверняка упадёт так же, а токены
    // и время сгорят. (Комментарий писался под Яндекс, логика та же.)
    let parsed = null, raw = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        ({ parsed, raw } = await callYandex(env, rawNoise, lang));
      } catch (e) {
        if (e.message === 'yandex_error') {
          return jsonResponse({ error: 'yandex_error', status: e.status, detail: e.detail }, 502, CORS);
        }
        // сетевой сбой — на первой попытке пробуем ещё раз
        if (attempt === 0) continue;
        return jsonResponse({ error: 'yandex_unreachable', detail: e.message }, 502, CORS);
      }

      // осмысленный ответ (резонанс или отказ) — выходим
      if (parsed && (parsed.rejected === true || (typeof parsed.interpretation === 'string' && parsed.interpretation.trim()))) break;
      // фолбэк-текст без JSON тоже принимаем — но только со второй попытки,
      // на первой даём модели шанс вернуть нормальный формат
      if (attempt === 1) break;
    }

    if (parsed && parsed.rejected === true) {
      return jsonResponse({ rejected: true }, 200, CORS);
    }
    if (parsed && typeof parsed.interpretation === 'string' && parsed.interpretation.trim()) {
      return jsonResponse({ interpretation: softTrim(parsed.interpretation, MAX_INTERPRETATION_LEN) }, 200, CORS);
    }
    // фолбэк: модель вернула чистый текст без JSON — отдаём как резонанс
    if (raw) {
      return jsonResponse({ interpretation: softTrim(raw, MAX_INTERPRETATION_LEN) }, 200, CORS);
    }
    return jsonResponse({ interpretation: 'Сигнал не распознан' }, 200, CORS);
  }
};

// ═══════════════════════════════════════════════════════
// Worker Secrets настраиваются в дашборде Cloudflare:
//   Settings → Variables and Secrets → Add → DOTPOIN_API_KEY
// Старый YANDEX_API_KEY этим воркером больше не читается — можно удалить.
// Яндекс остаётся в unitycode-voice (озвучка эссенций).
// ═══════════════════════════════════════════════════════
