// ═══════════════════════════════════════════════════════
// unitycode-voice — озвучка эссенций (прототип «на лету»).
// Синтезирует голос Сети через Yandex SpeechKit по логике:
//   тон мысли → голос + манера. Клиент шлёт только текст эссенции,
//   всю раскладку считает воркер.
//
// ПРОТОТИП: синтез каждый раз заново, без хранения (решение 15.07 —
// сначала услышать в продукте, storage потом). Когда логика устоится:
//   1) определение тона переедет в distill (unitycode-write), где пара
//      шум+отклик уже читается — не гадать по ключевым словам, а знать;
//   2) добавится кэш аудио (Supabase Storage), чтобы не платить за
//      повторную озвучку одной эссенции.
//
// СЕКРЕТ: YANDEX_API_KEY = то же значение, что в unitycode-petlya
// (роль ai.speechkit-tts.user на сервисном аккаунте уже выдана).
//
// ЗАПРОС: GET|POST ?text=<эссенция>
//   (POST с JSON {text} тоже принимается — удобнее для длинных строк)
// ОТВЕТ: audio/ogg (oggopus) либо JSON с ошибкой.
// ═══════════════════════════════════════════════════════

const TTS_URL = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';
const FOLDER_ID = 'b1gj2tc7i022icnug5jn';

const ALLOWED_ORIGINS = [
  'https://unitycode.space',
  'https://www.unitycode.space',
  'https://doctorums.github.io',
];

// ── FNV-1a — тот же хэш, что в implant.html (детерминизм чередования) ──
// Нейтральные эссенции чередуют голоса ПО ХЭШУ, не по Math.random:
// эссенция генерится один раз и живёт постоянно — её голос должен быть
// стабильным свойством, а не меняться при каждом воспроизведении.
function ucHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

// ── Определение тона эссенции ──────────────────────────────────────
// ВРЕМЕННО по ключевым словам — на прототипе, чтобы услышать логику уже
// сейчас. В боевой версии тон придёт готовым из distill (он читает пару
// шум+отклик и знает тон, а не гадает). Три исхода: warm / cold / neutral.
// Отрицания сознательно НЕ разбираем (тот же класс, что у архетипов
// картины) — на прототипе приемлемо, distill снимет проблему.
const WARM_RE = /(надежд|свет|радост|чуд|тепл|люб|цвет|рожда|искренн|сердц|жизн|мёд|мед\b|встреч|дом|откр|hope|light|joy|love|warm|life)/i;
const COLD_RE = /(туман|тупик|распад|тоск|разруш|потер|хаос|разрыв|пуст|тон(е|у)|слеп|бездомн|невозможн|без ответа|развилк|раскол|трещин|chaos|doubt|fog|empty|lost|void|dark)/i;

function detectTone(text) {
  const t = String(text).toLowerCase();
  const warm = WARM_RE.test(t);
  const cold = COLD_RE.test(t);
  if (warm && !cold) return 'warm';
  if (cold && !warm) return 'cold';
  // и то и другое, либо ничего — созерцательная середина
  return 'neutral';
}

// ── Тон → голос + манера ───────────────────────────────────────────
// Голоса выбраны на слух (15.07): ermil (м, тёплый светлый), jane (ж,
// мягкая, есть строгая манера evil для настоящего холода).
//   warm  → ermil + good   (тепло, прямой светлый голос)
//   cold  → jane  + evil    (холод — только у jane есть строгая манера)
//   neutral → чередование ermil↔jane по чётности хэша, без роли
function resolveVoice(text, tone) {
  // Английский текст — нативным английским голосом john (US male, neural).
  // НЕ русскими ermil/jane: они читают латиницу с русским акцентом, звучит
  // как поломка. john без роли — эмоции (good/evil) у SpeechKit работают
  // только для ru-RU с jane/omazh, для john недоступны. Созерцательным
  // английским эссенциям яркая манера и не нужна.
  const hasCyr = /[а-яё]/i.test(text);
  if (!hasCyr) return { voice: 'john', emotion: '' };

  if (tone === 'warm') return { voice: 'ermil', emotion: 'good' };
  if (tone === 'cold') return { voice: 'jane', emotion: 'evil' };
  // neutral — детерминированное чередование
  const even = (ucHash(text) & 1) === 0;
  return { voice: even ? 'ermil' : 'jane', emotion: '' };
}

// Язык: латиница без кириллицы → en-US, иначе ru-RU. Оба голоса умеют оба
// языка (с акцентом, но приемлемо для коротких фраз-эссенций).
function detectLang(text) {
  const hasCyr = /[а-яё]/i.test(text);
  return hasCyr ? 'ru-RU' : 'en-US';
}

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}
function errJson(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (!env.YANDEX_API_KEY) return errJson({ error: 'no_key' }, 500, origin);

    // текст — из query (?text=) или из JSON-тела POST
    let text = '';
    if (request.method === 'POST') {
      try { const b = await request.json(); text = (b.text || '').toString(); }
      catch (e) { return errJson({ error: 'bad_json' }, 400, origin); }
    } else {
      text = (new URL(request.url).searchParams.get('text') || '').toString();
    }
    text = text.trim().slice(0, 200);
    if (!text) return errJson({ error: 'empty_text' }, 400, origin);

    const tone = detectTone(text);
    const { voice, emotion } = resolveVoice(text, tone);
    const lang = detectLang(text);

    const params = new URLSearchParams({
      text,
      lang,
      voice,
      format: 'oggopus',
      folderId: FOLDER_ID,
      speed: '0.8', // медленнее обычного (было 0.95) — по прослушиванию 16.07: эссенция это тихая мысль, не диктор новостей
    });
    if (emotion) params.set('emotion', emotion);

    let res;
    try {
      res = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Api-Key ' + env.YANDEX_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (e) {
      return errJson({ error: 'network', detail: String(e).slice(0, 200) }, 502, origin);
    }

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      // частый случай: у голоса нет заявленной роли → ошибка сервиса.
      // На прототипе просто показываем — в бою resolveVoice гарантирует
      // валидные пары, но пусть диагностика будет явной.
      return errJson({ error: 'speechkit', http: res.status, voice, emotion, lang, tone, detail }, 200, origin);
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/ogg',
        // тон/голос — в заголовки, чтобы клиент при желании показал «чей голос»
        'X-UC-Tone': tone,
        'X-UC-Voice': voice,
        ...cors(origin),
      },
    });
  },
};
