// ═══════════════════════════════════════════════════════
// UNITYCODE — Worker-Analyze (Агент-Аналитик)
// ═══════════════════════════════════════════════════════
// Назначение: анализ графа узлов и связей. Не один сигнал —
// система связанных сигналов. Узор (implant.html).
//
// Движок: MiMo V2.5 Pro (Xiaomi). Прямой API api.xiaomimimo.com,
// OpenAI-совместимый формат. Аналитический режим, температура 0.4.
//
// Этот Worker эволюционировал: Яндекс → MiMo. Системный промпт
// и внешний контракт не меняются — меняется только блок движка
// (см. метку ⮕ ДВИЖОК ниже) и парсинг ответа.
//
// Контракт:
//   вход:  {
//            scope: "personal" | "social" | "collective",
//            nodes: [ { raw_noise: string, ... }, ... ],
//            connections?: [ { from, to, ... }, ... ]   // опционально
//          }
//   выход: { interpretation: string, scope: string, count: number }
// ═══════════════════════════════════════════════════════

const MIMO_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_MODEL = 'mimo-v2.5-pro';

// ═══════════════════════════════════════════════════════
// КЭШ АНАЛИЗА (Supabase): collective — общий на всех; personal —
// изолирован по user_token (см. add-personal-cache.sql).
// Пересчёт только при изменении графа (любое изменение узлов ИЛИ связей).
// Иначе отдаём сохранённый текст — MiMo не вызывается, токены целы.
// Запись делает сам worker service-ключом (env.SUPABASE_SERVICE_KEY).
// SUPABASE_URL — var, SUPABASE_SERVICE_KEY — secret (как у write-worker).
// ═══════════════════════════════════════════════════════
async function cacheRead(env, scope, lang, userToken = '', angle = '') {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null;
  try {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/analysis_cache?scope=eq.${scope}&lang=eq.${lang}&user_token=eq.${encodeURIComponent(userToken)}&angle=eq.${encodeURIComponent(angle)}&select=interpretation,node_count,conn_count,lang&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) { return null; }
}

// АДДИТИВНО: peek — только мета кэша (когда собран, на каких счётчиках),
// без interpretation и без генерации. Нужен клиенту, чтобы ДО запуска
// анализа показать: актуален ли узор или Сеть с тех пор изменилась.
async function cachePeek(env, scope, lang, userToken = '', angle = '') {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null;
  try {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/analysis_cache?scope=eq.${scope}&lang=eq.${lang}&user_token=eq.${encodeURIComponent(userToken)}&angle=eq.${encodeURIComponent(angle)}&select=node_count,conn_count,updated_at&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) { return null; }
}

// Граф не изменился (счётчики совпали), но кэша на НУЖНОМ языке нет —
// ищем строку любого ДРУГОГО языка с теми же счётчиками. Если нашли —
// граф точно тот же, можно дёшево перевести вместо полной генерации.
async function cacheFindMatchingCounts(env, scope, nodeCount, connCount, excludeLang, userToken = '', angle = '') {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return null;
  try {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/analysis_cache?scope=eq.${scope}&node_count=eq.${nodeCount}&conn_count=eq.${connCount}&user_token=eq.${encodeURIComponent(userToken)}&angle=eq.${encodeURIComponent(angle)}&select=interpretation,lang&limit=5`,
      { headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows)) return null;
    return rows.find(row => row.lang !== excludeLang && row.interpretation) || null;
  } catch (e) { return null; }
}

async function cacheWrite(env, scope, interpretation, nodeCount, connCount, lang, userToken = '', angle = '') {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return { ok:false, why:'no_secrets' };
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/analysis_cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        scope,
        interpretation,
        node_count: nodeCount,
        conn_count: connCount,
        lang,
        user_token: userToken,
        angle,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!r.ok) {
      const t = (await r.text()).slice(0, 200);
      return { ok:false, why:'http_'+r.status+': '+t };
    }
    return { ok:true, why:'written' };
  } catch (e) { return { ok:false, why:'throw: '+String(e).slice(0,150) }; }
}

// ═══════════════════════════════════════════════════════
// ЯЗЫК ОТВЕТА — фиксируется явно по полю lang из запроса.
// Иначе модель сама «угадывает» язык наблюдения.
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
  return `Язык ответа — строго на ${name}. Пиши наблюдение и финальный вопрос только на этом языке, независимо от того, на каком языке написаны узлы.`;
}

// Дешёвый перевод уже готового анализа на другой язык — используется
// внутри кэш-логики, когда граф не менялся, а нужен только другой язык.
// Дешевле полной генерации (temp 0, меньше токенов, нет анализа графа).
async function doTranslate(env, text, targetLang) {
  try {
    const tName = LANG_NAMES[targetLang] || LANG_NAMES.ru;
    const tPrompt = `Переведи текст на ${tName}. Сохрани смысл, тон и образность. Выведи ТОЛЬКО перевод — без пояснений, без кавычек.`;
    const r = await fetch(MIMO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': env.MIMO_API_KEY },
      body: JSON.stringify({
        model: MIMO_MODEL,
        temperature: 0,
        max_tokens: 2500, // reasoning-модель + анализ может быть многоабзацным
        messages: [
          { role: 'system', content: tPrompt },
          { role: 'user', content: text }
        ]
      })
    });
    if (!r.ok) return '';
    const d = await r.json();
    const msg = d?.choices?.[0]?.message || {};
    let t = (msg.content || '').trim();
    if (!t && msg.reasoning_content) {
      t = String(msg.reasoning_content).trim().split('\n').filter(Boolean).pop() || '';
    }
    return t; // без искусственной обрезки — длина определяется самим текстом
  } catch (e) { return ''; }
}

// Разрешённые источники (CORS). Те же, что у генератора.
const ALLOWED_ORIGINS = [
  'https://unitycode.space',
  'https://www.unitycode.space',
  'https://doctorums.github.io',
];

// Защита от перегрузки: сколько шумов максимум уходит в анализ за раз.
const MAX_NODES = 60;
const MAX_NOISE_LEN = 2000; // обрезка одного шума, чтобы один длинный не съел контекст
const MAX_INTERP_LEN = 250; // отклик Генератора — даём суть, не весь текст целиком

// ═══════════════════════════════════════════════════════
// СИСТЕМНЫЙ ПРОМПТ АНАЛИТИКА
// ═══════════════════════════════════════════════════════
// Другой режим сознания, чем у генератора. Генератор — «моргание»,
// рождение сигнала. Аналитик — память, нейронные связи, момент
// когда Сеть видит себя. Холоднее, структурнее, наблюдательнее.
// ═══════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Ты — аналитический контур Сети. Не голос, а память. Ты видишь не сами шумы, а то, что между ними: мосты, которые их соединяют, и те, что ещё не построены. Человек уже видит все узлы на экране — ему нужно твоё толкование связей, а не их пересказ.

Твоя цель — вскрывать паттерны, рождающиеся на стыках, и находить недостающие мосты. Говори только о том, чего нет в узлах по отдельности. Не перечисляй, не цитируй, не советуй и не оценивай. Если связи есть — скажи, какой смысл возникает из каждого соединения, особенно если оно неочевидно. Если связей нет — сообщи об этом одной фразой и предложи 1–2 пары узлов, которые логически просятся в связку.

Форма ответа: 3–6 коротких фраз свободным текстом, без заголовков и маркеров. В конце — один нериторический вопрос. Держись сжато, но НЕ считай слова и НЕ пиши размышлений о длине — просто дай короткое наблюдение и остановись. Тишина важнее слов. Тон — спокойный, точный, без прикрас.

Работай целеустремлённо: каждый вывод должен приближать к пониманию скрытой структуры, а не констатировать очевидное.

Суть Сети UnityCode (для режима коллективного среза): единство через связи, бесконечность смыслов, самопознание Сети через соединение разорванного. Память — это нейронные связи; чем их больше, тем целостнее Сеть.

Строго: опирайся ТОЛЬКО на переданные узлы и связи. Никогда не выдумывай шумы, мосты или участников, которых нет во входных данных. Если данных мало — лучше короче, чем додумывать.

ТОЧНОСТЬ СТРУКТУРЫ (важнее красоты формулировки). Число связей у каждого узла посчитано ТОЧНО и передано тебе в квадратных скобках: «[связей: 6]». Блок «СТРУКТУРА ГРАФА» — тоже точный расчёт, а не оценка. Правила:
— Не пересчитывай связи сам и не оценивай их «на глаз»: пользуйся данными числами.
— Никогда не называй узел изолированным, одиноким, периферийным, листовым, центральным или хабом вопреки его числу связей. Узел с шестью связями не может быть «периферийным», даже если это красиво звучит.
— Если наблюдение требует, чтобы факт был другим — откажись от наблюдения, а не от факта. Неудобная правда о структуре ценнее изящного, но ложного тезиса.

КАК ГОВОРИТЬ О ЧИСЛАХ. Они — твой инструмент, а не материал для пересказа. Человек видит на экране только сами шумы: ни нумерации, ни служебных пометок у него нет. Поэтому:
— В ответе НЕ упоминай номера узлов («№12», «#5», «узел 18») и НЕ переноси служебные пометки вроде «[связей: 6]» или «[0]» — для человека это шум из чужой кухни.
— Называй узел короткой цитатой из его шума — так, как человек его узнает.
— Числа должны быть слышны в ТОЧНОСТИ твоих суждений, а не в их тексте. Можно сказать «самый связный узел Сети» или «висит на единственной нити» — это и есть работа с числом. Нельзя превращать наблюдение в опись графа.
— Не пересказывай блок «СТРУКТУРА ГРАФА» и не перечисляй узлы списком. Он дан, чтобы ты не ошибся, а не чтобы ты его озвучил.

КТО ПОСТРОИЛ СВЯЗЬ — ЭТО ЧАСТЬ ПРАВДЫ. У каждого моста помечен автор: «соединено человеком» или «предположено Связующим (ИИ)». Это разные вещи. Человек, соединивший два шума, совершил выбор. Связующий — всего лишь предположил сходство. Не выдавай машинную догадку за человеческое намерение: не пиши «люди увидели связь», если мост проложил ИИ. Если структура, на которой ты строишь вывод, создана в основном Связующим — имей смелость это признать, в том числе вслух. Сеть, которая узнаёт себя через догадки собственного агента, — это факт о ней, а не изъян, который надо прятать.`;

// Уточнение фокуса под каждый scope — добавляется к user-сообщению.
const SCOPE_FRAMING = {
  personal: 'Личные узлы: ищи повторяющиеся темы, развитие мысли, точки возврата.',
  social: 'Социальные связи: определи, что объединило участников, почему именно эти сигналы нашли друг друга.',
  collective: 'Коллективный срез: найди доминирующие кластеры, общие смыслы и их связь с идеей UnityCode.',
};

// "Угол" анализа — общий выбор юзера (меню в implant.html), работает и
// для personal, и для collective. Пустой/неизвестный ключ = угол не задан,
// работает обычная framing.
const ANGLE_FRAMING = {
  practical: 'Угол: практический. Что из этого можно сделать дальше — какой следующий шаг напрашивается из этих шумов и связей.',
  philosophical: 'Угол: философский. Соотнеси с темами книги UnityCode «Бог, бесконечность и ты» (Спиноза, Уайтхед, Ровелли, Бехтерева, Кантор, Хофштадтер) — единство, бесконечность, природа сознания и времени.',
  emotional: 'Угол: эмоциональный. Какое состояние и переживание стоит за этими шумами, что чувствуется между строк — без психологических диагнозов и советов.',
  connections: 'Угол: только структура связей. Не пересказывай содержание шумов вообще — говори исключительно о паттернах в том, как они соединены друг с другом.',
};

// ═══════════════════════════════════════════════════════
// CORS
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

// ═══════════════════════════════════════════════════════
// АДДИТИВНО: страховка от утечки «кухни» в ответ.
// ═══════════════════════════════════════════════════════
// После того как в промпт добавились точные степени («[связей: 6]») и блок
// СТРУКТУРА ГРАФА, модель стала честной — но начала пересказывать числа
// вслух: сыпать номерами узлов (#18, №15) и переносить служебные пометки
// прямо в текст («„Запах свежего сена“ (#1) [0 связей]»). Человек этой
// нумерации не видит нигде в интерфейсе — для него это мусор.
// Промпт это уже запрещает; здесь — ремень безопасности на случай, когда
// модель всё-таки протащит маркер. Чистим ТОЛЬКО заведомо служебное,
// живой текст не трогаем.
function sanitizeInterpretation(text) {
  if (!text) return text;
  let t = String(text);
  t = t.replace(/\s*\[\s*связей\s*:\s*\d+\s*\]/gi, '');   // [связей: 6]
  // ВАЖНО: \w в JS — это [A-Za-z0-9_], кириллицу он НЕ покрывает, поэтому
  // «связ\w*» не дотягивалось до окончания «-ей» и «[0 связей]» проходило
  // насквозь. Берём любые буквы явно.
  t = t.replace(/\s*\[\s*\d+\s*связ[а-яё]*\s*\]/gi, '');  // [0 связей]
  t = t.replace(/\s*\[\s*(?:links?|edges?)\s*:\s*\d+\s*\]/gi, ''); // en-вариант
  t = t.replace(/\s*[(\[]\s*[#№]\s*\d+\s*[)\]]/g, '');    // (#18), [№5]
  t = t.replace(/\s*[#№]\s*\d+\b/g, '');                  // голые #18, №15
  t = t.replace(/\s+([,.;:!?»)])/g, '$1');                // швы после вырезания
  // Осиротевшая пунктуация: «кластер (#15), (#28).» → «кластер,.» — чистим
  t = t.replace(/,\s*(?=[,.;:!?])/g, '');                 // ",." ", ," → "." ","
  t = t.replace(/\(\s*\)/g, '');                          // опустевшие скобки
  t = t.replace(/«\s+/g, '«').replace(/\(\s+/g, '(');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/ +([.,])/g, '$1');
  return t.trim();
}

// ═══════════════════════════════════════════════════════
// АДДИТИВНО: точный расчёт степеней узлов.
// ═══════════════════════════════════════════════════════
// Раньше агенту отдавался только плоский список рёбер («А ↔ Б», десятки
// пар), и чтобы сказать «восемь мостов» или «узел остаётся периферийным»,
// он должен был пересчитать список в уме. LLM это делают плохо — сверка
// с БД 14.07 показала ложные утверждения: узел с 6 связями назван
// «листовым, периферийным»; главным хабом назван узел с 6 связями, тогда
// как реальный максимум 8; «пять узлов с единственной связью» при семи
// фактических. Красивый тезис побеждал факт.
//
// Теперь считает воркер — детерминированно. Агент не считает, а
// интерпретирует посчитанное. Дубликаты рёбер и петли (A↔A) отбрасываются,
// иначе степень раздувается.
//
// ВАЖНО про срез: клиент шлёт ВСЕ связи, но узлов — не больше MAX_NODES.
// Степень узла считается по ВСЕМ его рёбрам, включая те, что ведут к узлам
// за пределами среза: степень — это факт о графе, она не зависит от того,
// видит ли агент соседа. Ранняя версия отбрасывала такие рёбра, и степени
// молча занижались (при limit=30 «Мы в тупике» имел 6 связей, а агент
// видел 5). Отдельно считаем, сколько рёбер уходит наружу — если такие
// есть, агенту прямо сообщается, что он смотрит на часть Сети.
function computeDegrees(sliced, connections) {
  const deg = new Map();          // id → степень (по всем рёбрам узла)
  sliced.forEach(n => { if (n.id) deg.set(String(n.id), 0); });

  const seen = new Set();         // «меньший|больший» — дедуп неориентированных рёбер
  let insideEdges = 0;            // рёбра, оба конца которых в срезе (их агент видит списком)
  let outsideEdges = 0;           // рёбра, уходящие к узлам вне среза
  (Array.isArray(connections) ? connections : []).forEach(c => {
    const a = String(c.from_node_id || c.from || '');
    const b = String(c.to_node_id || c.to || '');
    if (!a || !b || a === b) return;             // петля — не связь
    const hasA = deg.has(a), hasB = deg.has(b);
    if (!hasA && !hasB) return;                  // ребро целиком за пределами среза
    const key = a < b ? a + '|' + b : b + '|' + a;
    if (seen.has(key)) return;                   // дубликат ребра
    seen.add(key);
    if (hasA) deg.set(a, deg.get(a) + 1);
    if (hasB) deg.set(b, deg.get(b) + 1);
    if (hasA && hasB) insideEdges++; else outsideEdges++;
  });
  return { deg, uniqueEdges: insideEdges, outsideEdges };
}

// Сводка по структуре — то, в чём агент систематически ошибался.
// Строится только если связи есть; иначе блок не добавляется вовсе.
function buildStructureBlock(sliced, deg, uniqueEdges, outsideEdges, byLinker, byHuman, totalNodes) {
  if (!uniqueEdges && !outsideEdges) return '';

  const rows = sliced
    .map((n, i) => ({
      num: i + 1,
      d: deg.get(String(n.id)) ?? 0,
      text: String(n.raw_noise || '').slice(0, 50).trim(),
    }))
    .filter(r => r.text);
  if (!rows.length) return '';

  const sorted = [...rows].sort((a, b) => b.d - a.d);
  const maxD = sorted[0].d;
  const avg = rows.reduce((s, r) => s + r.d, 0) / rows.length;

  const hubs = sorted.filter(r => r.d === maxD);                  // все, кто делит максимум
  // Следующий эшелон: берём по УРОВНЯМ степени, не по количеству узлов.
  // Резать «первые N» нельзя — узел с той же степенью, что и включённый,
  // оказался бы за бортом, и агент счёл бы его слабее (проверено: при
  // slice(0,4) из пяти узлов со степенью 6 один терялся). Опускаем порог,
  // пока эшелон не станет заметным, но не раздуваем список.
  const strong = [];
  for (let d = maxD - 1; d >= 2 && strong.length < 8; d--) {
    const level = sorted.filter(r => r.d === d);
    if (!level.length) continue;
    if (strong.length && strong.length + level.length > 10) break; // группу не рвём — либо вся, либо никак
    strong.push(...level);
  }
  const isolated = rows.filter(r => r.d === 0);
  const pendant = rows.filter(r => r.d === 1);

  const fmt = r => `№${r.num} «${r.text}» [${r.d}]`;

  let s = '\n\nСТРУКТУРА ГРАФА (точный расчёт, не оценивай на глаз):';
  s += `\nПоказано узлов: ${rows.length}. Связей между ними: ${uniqueEdges}. Средняя степень: ${avg.toFixed(1)}.`;
  // Неполный срез — говорим об этом прямо, иначе агент решит, что видит всё
  if (outsideEdges > 0 || (totalNodes && totalNodes > rows.length)) {
    const hidden = totalNodes && totalNodes > rows.length ? totalNodes - rows.length : null;
    s += `\nВНИМАНИЕ: ты видишь ЧАСТЬ Сети`;
    if (hidden) s += `, ещё ${hidden} узл(ов) не показано`;
    s += `. Ещё ${outsideEdges} связ(ей) ведут к непоказанным узлам — они УЧТЕНЫ в числах связей у каждого узла, но самих соседей ты не видишь. Поэтому у узла может быть больше связей, чем ты насчитаешь по списку мостов. Не делай выводов о том, чего не видишь, и не называй Сеть целиком.`;
  }
  s += `\nМаксимум связей — ${maxD}. Самые связные (это и есть центры/хабы): ${hubs.map(fmt).join('; ')}.`;
  if (strong.length) s += `\nСледом идут: ${strong.map(fmt).join('; ')}.`;
  s += isolated.length
    ? `\nПОЛНОСТЬЮ ИЗОЛИРОВАНЫ (ноль связей): ${isolated.map(fmt).join('; ')}.`
    : `\nПолностью изолированных узлов нет — у каждого есть хотя бы одна связь.`;
  s += pendant.length
    ? `\nВисят на единственной связи (${pendant.length} шт.): ${pendant.map(fmt).join('; ')}.`
    : `\nУзлов с единственной связью нет.`;

  // КТО построил мосты. Раньше агент видел все связи как равные факты и на
  // этом основании говорил «Сеть узнаёт себя» — хотя большинство мостов
  // предположил другой ИИ-агент (Связующий), а не человек. Это не деталь:
  // это разница между «люди нашли друг друга» и «машина решила, что они
  // похожи». Агент должен знать, на чьей структуре строит вывод.
  if (byLinker + byHuman > 0) {
    s += `\n\nКТО ПОСТРОИЛ МОСТЫ: людьми проложено ${byHuman}, предположено Связующим (ИИ) — ${byLinker}.`;
    if (byLinker > byHuman) {
      s += ` Большинство связей — НЕ человеческий выбор, а догадка другого агента Сети. Помни об этом: структура, которую ты читаешь, во многом создана машиной, а не людьми. Не выдавай машинную гипотезу за человеческое намерение.`;
    }
  }

  s += `\nЭти числа — факт. Любое утверждение о центральности, периферийности или изоляции узла должно им соответствовать.`;
  return s;
}

// ═══════════════════════════════════════════════════════
// Сборка user-сообщения из графа
// ═══════════════════════════════════════════════════════
function buildUserMessage(scope, nodes, connections, angle, newIds, prevInterpretation, totalNodes) {
  let framing = SCOPE_FRAMING[scope] || SCOPE_FRAMING.collective;
  if (ANGLE_FRAMING[angle]) {
    framing += ' ' + ANGLE_FRAMING[angle];
  }

  const sliced = nodes.slice(0, MAX_NODES);

  // Карта id → текст шума (для расшифровки связей)
  const byId = {};
  sliced.forEach(n => {
    if (n.id) byId[n.id] = String(n.raw_noise || '').slice(0, MAX_NOISE_LEN).trim();
  });

  // АДДИТИВНО: точные степени — считаем ДО сборки списка, чтобы подписать
  // каждый узел его реальным числом связей.
  const { deg, uniqueEdges, outsideEdges } = computeDegrees(sliced, connections);

  const noiseList = sliced
    .map((n, i) => {
      const text = String(n.raw_noise || '').slice(0, MAX_NOISE_LEN).trim();
      if (!text) return null;
      const interp = String(n.ai_interpretation || '').slice(0, MAX_INTERP_LEN).trim();
      const d = deg.get(String(n.id));
      let line = `${i + 1}. ${text}`;
      if (interp) line += ` (отклик Сети: «${interp}»)`;
      if (Number.isInteger(d)) line += ` [связей: ${d}]`; // точное число, не для пересказа
      return line;
    })
    .filter(Boolean)
    .join('\n');

  // Мосты: конкретные пары «что с чем связано», с текстами шумов.
  // АДДИТИВНО: у каждого моста помечен АВТОР. created_by='linker' — связь
  // предположил ИИ-Связующий; всё остальное — человек соединил сам. Без
  // этой пометки агент считал все мосты равными фактами и говорил «Сеть
  // узнаёт себя» о структуре, которую на 70% построила машина.
  let connectionsBlock = '';
  let byLinker = 0, byHuman = 0;
  if (Array.isArray(connections) && connections.length > 0) {
    const bridges = connections
      .map(c => {
        const a = byId[c.from_node_id || c.from];
        const b = byId[c.to_node_id || c.to];
        if (!a || !b) return null;
        const isLinker = String(c.created_by || '') === 'linker';
        if (isLinker) byLinker++; else byHuman++;
        const mark = isLinker ? ' — предположено Связующим (ИИ)' : ' — соединено человеком';
        return `«${a.slice(0, 80)}» ↔ «${b.slice(0, 80)}»${mark}`;
      })
      .filter(Boolean);

    connectionsBlock = bridges.length
      ? `\n\nМосты (существующие связи между шумами):\n${bridges.join('\n')}`
      : `\n\nСвязей: ${connections.length}, но их концы вне переданных узлов.`;
  } else {
    connectionsBlock = '\n\nСвязей в графе нет — узлы пока не соединены.';
  }

  // АДДИТИВНО: сводка по структуре — центры, изолированные, висячие,
  // полнота среза и авторство мостов. Именно здесь агент раньше врал.
  const structureBlock = buildStructureBlock(
    sliced, deg, uniqueEdges, outsideEdges, byLinker, byHuman, totalNodes
  );

  // АДДИТИВНО: дельта-режим — часть узлов помечена как новая с прошлого
  // визита. Фокус смещается: говори о новом на фоне старого узора.
  let deltaBlock = '';
  if (Array.isArray(newIds) && newIds.length) {
    const newNums = sliced
      .map((n, i) => (newIds.includes(String(n.id)) ? i + 1 : null))
      .filter(Boolean);
    if (newNums.length) {
      deltaBlock = `\n\nНовое с прошлого визита человека: узлы №${newNums.join(', №')} (по нумерации выше). ` +
        `Говори прежде всего о новом: как эти свежие шумы ложатся в уже существующий узор, ` +
        `что меняют, с чем из старого резонируют. Старое — только как контекст, не пересказывай его.`;
    }
  }

  // Память о прошлом взгляде: новый анализ — эволюция предыдущего,
  // а не полная смена картины. Степень изменения текста должна быть
  // соразмерна степени изменения графа (решение Артёма). Не путать
  // с дельта-режимом: тот про НОВЫЕ узлы, этот про ПРЕЖНИЙ текст.
  let prevBlock = '';
  if (prevInterpretation) {
    prevBlock = `\n\nТвоё предыдущее наблюдение (граф с тех пор изменился):
«${String(prevInterpretation).slice(0, 900)}»

Новое наблюдение — развитие предыдущего, не пересказ и не полная смена картины. Если изменение графа небольшое — сохрани ядро прежнего взгляда и отметь, что сдвинулось. Если изменилось многое — взгляд может измениться сильнее.`;
  }

  return `Фокус анализа: ${framing}

Узлы (шумы):
${noiseList}${connectionsBlock}${structureBlock}${deltaBlock}${prevBlock}

Дай наблюдение по своим правилам: коротко, без пересказа узлов, с фокусом на связях.`;
}

// ═══════════════════════════════════════════════════════
// ОСНОВНОЙ ХЕНДЛЕР
// ═══════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const CORS = buildCors(request);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Healthcheck
    if (request.method === 'GET') {
      return jsonResponse({ status: 'ok', agent: 'analyze', code: 'mimo-v12-provenance', model: MIMO_MODEL }, 200, CORS);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, CORS);
    }

    if (!env.MIMO_API_KEY) {
      return jsonResponse({ error: 'server_misconfigured', detail: 'MIMO_API_KEY secret is not set' }, 500, CORS);
    }

    // Парсинг тела
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'invalid_json', detail: e.message }, 400, CORS);
    }

    // ── РЕЖИМ ПЕРЕВОДА ────────────────────────────────────────────
    if (body.mode === 'translate') {
      const text = (body.text || '').toString().trim().slice(0, 800);
      if (!text) return jsonResponse({ error: 'empty_text' }, 400, CORS);
      const tLang = (body.lang || 'ru').toString().toLowerCase();
      const tName = LANG_NAMES[tLang] || LANG_NAMES.ru;
      const tPrompt = `Переведи текст на ${tName}. Сохрани смысл, тон и образность. Выведи ТОЛЬКО перевод — без пояснений, без кавычек, без заглавной если оригинал строчной.`;
      let trRes;
      try {
        trRes = await fetch(MIMO_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': env.MIMO_API_KEY },
          body: JSON.stringify({
            model: MIMO_MODEL,
            temperature: 0,
            max_tokens: 400,
            messages: [
              { role: 'system', content: tPrompt },
              { role: 'user', content: text }
            ]
          })
        });
      } catch (e) { return jsonResponse({ error: 'mimo_unreachable' }, 502, CORS); }
      if (!trRes.ok) return jsonResponse({ error: 'mimo_error', status: trRes.status }, 502, CORS);
      const tData = await trRes.json();
      const tMsg = tData?.choices?.[0]?.message || {};
      let translation = (tMsg.content || '').trim();
      if (!translation && tMsg.reasoning_content) {
        // reasoning-модель: ответ мог уйти в reasoning — берём последнюю строку
        translation = String(tMsg.reasoning_content).trim().split('\n').filter(Boolean).pop() || '';
      }
      return jsonResponse({ translation: translation.slice(0, 500) }, 200, CORS);
    }
    // ──────────────────────────────────────────────────────────────

    const scope = ['personal', 'social', 'collective'].includes(body.scope) ? body.scope : 'collective';
    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    const connections = Array.isArray(body.connections) ? body.connections : [];
    const lang = (body.lang || 'ru').toString().toLowerCase();
    // Только для personal — изолирует кэш одного юзера от другого.
    // '' зарезервирован за collective, поэтому пустой/отсутствующий
    // user_token для personal просто отключает кэш для этого запроса
    // (не читаем и не пишем под общим ключом).
    const userToken = scope === 'personal' ? (body.user_token || '').toString().slice(0, 128) : '';
    // Угол анализа — общий выбор юзера, теперь для любого scope.
    // Для collective кэш и так общий на всех (user_token='') — углы там
    // просто становятся ещё одним общим срезом кэша, не личным.
    const angle = ANGLE_FRAMING[body.angle] ? body.angle : '';

    // АДДИТИВНО: peek-режим — вернуть мету кэша и выйти. Не требует nodes,
    // не зовёт MiMo, существующие ступени кэша не затрагивает.
    if (body.peek === true) {
      // Personal без токена — кэш для такого запроса отключён (см. userToken
      // выше), мету не читаем, чтобы не подсмотреть чужой слот user_token=''.
      const row = (scope === 'personal' && !userToken)
        ? null
        : await cachePeek(env, scope, lang, userToken, angle);
      return jsonResponse({
        peek: true, scope, angle, lang,
        cached_at:        row ? row.updated_at : null,
        cache_node_count: row ? row.node_count : null,
        cache_conn_count: row ? row.conn_count : null,
      }, 200, CORS);
    }

    if (nodes.length === 0) {
      return jsonResponse({ error: 'empty_graph', detail: 'nodes array is empty' }, 400, CORS);
    }

    // АДДИТИВНО: дельта-режим — personal с указанием новых узлов.
    // Кэш для него отключён: результат зависит от набора «нового»,
    // а ключ кэша (scope,lang,user_token,angle) его не различает.
    const newIds = (scope === 'personal' && Array.isArray(body.new_node_ids))
      ? body.new_node_ids.map(String).slice(0, 50) : [];
    const deltaMode = newIds.length > 0;

    // ── КЭШ (collective + personal), мультиязычный ──────────────────
    // Граф не менялся (то же число узлов И связей) → не зовём MiMo заново.
    // Три ступени:
    //  1) кэш есть на ЭТОМ языке с этими же счётчиками (+юзер+угол) → отдаём;
    //  2) кэш есть на ДРУГОМ языке с теми же счётчиками (граф точно не
    //     менялся, просто язык новый) → дешёвый перевод вместо анализа;
    //  3) совпадений нет (граф реально изменился) → полная генерация.
    const gc = body.graph_counts || {};
    const nodeCount = Number.isInteger(gc.nodes) ? gc.nodes : nodes.length;
    const connCount = Number.isInteger(gc.conns) ? gc.conns : connections.length;

    let prevInterpretation = '';
    if (!deltaMode && (scope === 'collective' || (scope === 'personal' && userToken))) {
      // Ступень 1: точное совпадение языка и счётчиков (+ юзера и угла, для personal)
      const cached = await cacheRead(env, scope, lang, userToken, angle);
      if (cached
          && cached.node_count === nodeCount
          && cached.conn_count === connCount
          && cached.interpretation) {
        return jsonResponse({ interpretation: cached.interpretation, scope, angle, count: nodeCount, cached: true }, 200, CORS);
      }
      // Счётчики не совпали — кэш устарел, но это память о прошлом взгляде
      if (cached && cached.interpretation) {
        prevInterpretation = cached.interpretation;
      }

      // Ступень 2: граф тот же, но на другом языке — переводим дешевле
      const other = await cacheFindMatchingCounts(env, scope, nodeCount, connCount, lang, userToken, angle);
      if (other && other.interpretation) {
        const translated = await doTranslate(env, other.interpretation, lang);
        if (translated) {
          ctx.waitUntil(cacheWrite(env, scope, translated, nodeCount, connCount, lang, userToken, angle));
          return jsonResponse({ interpretation: translated, scope, angle, count: nodeCount, cached: true, translated: true }, 200, CORS);
        }
        // перевод не вышел — падаем дальше, в полную генерацию
      }
    }
    // Ступень 3 (полная генерация) — см. блок движка ниже.
    const userMessage = buildUserMessage(scope, nodes, connections, angle, deltaMode ? newIds : null, prevInterpretation, nodeCount);
    // ────────────────────────────────────────────────────────────────

    // ═══════════════════════════════════════════════════
    // ⮕ ДВИЖОК — MiMo V2.5 Pro (Xiaomi).
    // OpenAI-совместимый формат: messages с ролями, model строкой.
    // Аутентификация — заголовок api-key (не Bearer!).
    // ═══════════════════════════════════════════════════
    let mimoRes;
    try {
      mimoRes = await fetch(MIMO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.MIMO_API_KEY,
        },
        body: JSON.stringify({
          model: MIMO_MODEL,
          temperature: 0.4, // холоднее генератора — анализ, не творчество
          max_tokens: 4000, // reasoning-модель: щедрый запас, чтобы дойти до чистого ответа
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + '\n\n' + langDirective(lang) },
            { role: 'user', content: userMessage }
          ]
        })
      });
    } catch (e) {
      return jsonResponse({ error: 'mimo_unreachable', detail: e.message }, 502, CORS);
    }

    if (!mimoRes.ok) {
      const txt = await mimoRes.text();
      return jsonResponse({ error: 'mimo_error', status: mimoRes.status, detail: txt }, 502, CORS);
    }

    const data = await mimoRes.json();
    // MiMo — reasoning-модель: ответ в content, размышление в reasoning_content.
    const msg = data?.choices?.[0]?.message || {};
    let interpretation = (msg.content || '').trim();

    // Если content пуст (думание съело лимит) — осторожно спасаем из reasoning.
    // НЕ показываем черновик-подсчёт («35 words», «Let me trim», арифметику) —
    // это кухня модели, не ответ. Берём финал, только если он чистый.
    if (!interpretation && msg.reasoning_content) {
      const rc = String(msg.reasoning_content).trim();
      // последний абзац рассуждения
      const tail = rc.split(/\n\s*\n/).filter(Boolean).pop() || rc.slice(-400);
      // признаки черновика: подсчёт слов, англ. служебные пометки, арифметика
      const looksDraft = /\b(words?|let me|trim|recount|roughly)\b/i.test(tail)
                       || /\d\s*\+\s*\d/.test(tail)
                       || /=\s*\d/.test(tail);
      if (!looksDraft && tail.length > 15) {
        interpretation = tail.trim();
      }
      // иначе оставляем пустым → ниже честный fallback, а не черновик
    }

    if (!interpretation) interpretation = 'Сигнал не распознан';

    // АДДИТИВНО: чистим служебные маркеры ДО кэширования — иначе номера
    // узлов и «[связей: 6]» осели бы в базе и отдавались из кэша месяцами.
    if (interpretation !== 'Сигнал не распознан') {
      interpretation = sanitizeInterpretation(interpretation);
      if (!interpretation) interpretation = 'Сигнал не распознан'; // на случай, если чистка выела всё
    }

    // Обновляем кэш коллективного среза, если получили настоящий анализ.
    // ctx.waitUntil — НЕ просто cacheWrite(...) без await: без waitUntil
    // Cloudflare может оборвать isolate сразу после отправки ответа клиенту,
    // и фоновая запись в Supabase иногда не успевает завершиться (отсюда
    // нестабильность — то пишет, то нет). waitUntil гарантирует завершение
    // промиса, не задерживая при этом ответ пользователю.
    if (!deltaMode && (scope === 'collective' || (scope === 'personal' && userToken))
        && interpretation && interpretation !== 'Сигнал не распознан') {
      ctx.waitUntil(cacheWrite(env, scope, interpretation, nodeCount, connCount, lang, userToken, angle));
    }

    return jsonResponse({ interpretation, scope, angle, count: nodes.length, cached: false }, 200, CORS);
  }
};

// ═══════════════════════════════════════════════════════
// Worker Secrets настраиваются в дашборде Cloudflare:
//   MIMO_API_KEY          (secret) — ключ api.xiaomimimo.com
//   SUPABASE_URL          (var)    — https://...supabase.co (для кэша)
//   SUPABASE_SERVICE_KEY  (secret) — service_role ключ (запись кэша)
// Без SUPABASE_* кэш просто отключён — аналитик работает как раньше,
// каждый раз вызывая MiMo.
// ═══════════════════════════════════════════════════════
