# UnityCode

Портал-протокол: внутренний шум встречается с алгоритмическим поиском связей.
Человек вводит «шум» (мысль), ИИ ищет в нём резонанс, результат вплетается в
анонимную Сеть узлов. Никто не владеет Сетью.

*Некоммерческий научно-художественный эксперимент. Без персональных данных.*

## Стек

- **Фронтенд:** vanilla HTML/CSS/JS, без сборки. Хостинг — GitHub Pages, домен
  через `CNAME` (unitycode.space).
- **Бэкенд:** три Cloudflare Workers, деплоятся отдельно от Pages, через
  дашборд Cloudflare. Два движка: MiMo (запись + анализ) и YandexGPT (генератор Спирали).
- **База:** Supabase (PostgreSQL), таблицы `nodes`, `connections`, `linker_log`,
  `analysis_cache`.
- **Карта:** Leaflet.js + MarkerCluster (раздаются локально из репозитория).

## Страницы

- **`index.html`** — вход (лендинг, тоннель → Спираль).
- **`petlya.html`** — **Спираль**: AI-чат. Шум → резонанс + вопрос.
- **`set.html`** — **Сеть**: карта живых узлов (Leaflet) и связи между ними.
- **`implant.html`** — **Паттерн**: аналитический дашборд (личный и
  коллективный анализ графа).
- **`materials.html`** — **Материя**: визуальная страница (космос).
- **`kniga.html`** — веб-ридер книги (контент в `data/book.json` через
  `js/book-loader.js`).

Меню: `[Спираль] [Сеть] [Паттерн] [Материя]`.

## Общие ассеты

- **`shared.css`** — общие стили страниц Спираль / Сеть / Паттерн / Материя.
- **`nav.js`** — проставляет `.active` на текущий пункт меню.
- **`i18n.js`** — переводы интерфейса (ru/en/прочие) + языковой переключатель
  на страницах без `<nav>`.
- **`audio.js`** — глобальный звуковой модуль (Web Audio, без внешних файлов).
  Фоновый эмбиент со своим пресетом на части страниц (например, «баланс» на
  Сети, «минимум» на Паттерне), звуковые эффекты на действия, плавный fade
  при переходах между страницами.
- **`leaflet.min.js` / `leaflet.min.css` / `leaflet.markercluster.min.js` /
  `MarkerCluster.min.css`** — карта (нужны `set.html`).
- **`noises.json`** — данные для `materials.html`.
- **`data/book.json` + `js/book-loader.js`** — контент и загрузчик ридера.

## Воркеры (Cloudflare)

Три отдельных воркера — у каждого свой файл, свой Cloudflare-деплой:

### Спираль — генератор
Файл **`worker-generate.js`**, воркер `unitycode-petlya`. Движок —
**YandexGPT**, творческий (температура 0.7).
Контракт: `POST { raw_noise } → { interpretation }`.
Секрет: `env.YANDEX_API_KEY`.

### Паттерн — аналитик
Файл **`worker-analyze.js`**, воркер `unitycode-analyze`. Движок — **MiMo**,
холодный, наблюдательный (температура 0.4). Считает граф в трёх срезах:
personal / social / collective. Кэширует результат в таблице `analysis_cache`.
Контракт: `POST { scope, nodes, connections? } → { interpretation }`.
Секрет: `env.MIMO_API_KEY`.

### Запись — шлюз + три под-агента в одном файле
Файл **`worker-write.js`**, воркер `unitycode-write`. Движок — **MiMo**.
Это не один агент, а три последовательных шага в одном воркере:

1. **Привратник** (`gateCheck`) — решает, пускать ли шум в Сеть (сигнал/пустота),
   fail-closed при сбое движка.
2. **Distill** (`distill`) — после принятия шума формулирует короткую
   квинтэссенцию (`essence`) для визуализации в Материи.
3. **Связующий** (`runLinker`) — после успешной записи узла, фоново
   (`ctx.waitUntil`, не блокирует ответ клиенту) ищет резонанс с существующими
   узлами и сам создаёт связи (`connections.created_by = 'linker'`). Лог
   прогонов — таблица `linker_log`.

Контракт:
`POST { action:'node', token, turnstile, raw_noise, ai_interpretation?, client_id?, lat?, lng?, tz? } → { ok, id? }`
`POST { action:'connection', token, turnstile, from_node_id, to_node_id } → { ok }`

`client_id` — UUID с клиента, ключ идемпотентности (UNIQUE-колонка в `nodes`,
вставка через `Prefer: resolution=ignore-duplicates`) — повторная отправка
одного и того же шума (например, после обрыва связи) не создаёт дубликат.

Секреты: `env.MIMO_API_KEY`, `env.SUPABASE_SERVICE_KEY`, `env.TURNSTILE_SECRET`.

CORS на всех трёх воркерах залочен на домены unitycode.space.

## Устойчивость к плохой связи

`petlya.html` хранит каждую попытку вплетения в `localStorage` (очередь
`uc_weave_queue`) **до** сетевого запроса. Если канал слабый или обрывается —
шум не теряется: при восстановлении связи/возврате на вкладку очередь
довплетается сама, безопасно — благодаря тому же `client_id`.

## База (Supabase)

Таблицы `nodes`, `connections`, `linker_log`, `analysis_cache`. SQL в
репозитории: `create tables.sql`, `add connections.sql`, `schema.sql`,
`add-linker-log.sql` — выполнить в Supabase при заведении базы.

## Демо-режим

В `petlya.html` есть флаг **`USE_STUB`**:

- `true` — генератор отвечает встроенными demo-резонансами, YandexGPT не
  вызывается (ноль затрат). Портал работает сразу, без бэкенда.
- `false` — боевой режим, запросы идут в Worker.

## Запуск локально

```bash
python -m http.server 8000   # открой http://localhost:8000
```

Деплой: GitHub Pages → Settings → Pages → Deploy from branch (`gh-pages`/`main`).
Воркеры деплоятся отдельно через дашборд Cloudflare.
