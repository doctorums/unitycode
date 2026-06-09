# UnityCode

Портал-протокол: внутренний шум встречается с алгоритмическим поиском связей.
Человек вводит «шум» (мысль), ИИ ищет в нём резонанс, результат вплетается в
анонимную Сеть узлов. Никто не владеет Сетью.

*Некоммерческий научно-художественный эксперимент. Без персональных данных.*

## Стек

- **Фронтенд:** vanilla HTML/CSS/JS, без сборки. Хостинг — GitHub Pages, домен
  через `CNAME` (unitycode.space).
- **Бэкенд:** два Cloudflare Workers (прокси к YandexGPT), деплоятся отдельно
  от Pages, через дашборд Cloudflare.
- **База:** Supabase (PostgreSQL), таблицы `nodes` и `connections`.
- **Карта:** Leaflet.js + MarkerCluster (раздаются локально из репозитория).

## Страницы

- **`index.html`** — вход (лендинг, тоннель → Спираль).
- **`petlya.html`** — **Спираль**: AI-чат. Шум → резонанс + вопрос.
- **`set.html`** — **Сеть**: карта живых узлов (Leaflet) и связи между ними.
- **`implant.html`** — **Узор**: аналитический дашборд (паттерны / резонансы /
  разрывы по графу).
- **`materials.html`** — **Материя**: визуальная страница (космос).
- **`kniga.html`** — веб-ридер книги (контент в `data/book.json` через
  `js/book-loader.js`).


Меню: `[Спираль] [Сеть] [Узор] [Материя]`.

## Общие ассеты

- **`shared.css`** — общие стили страниц Спираль / Сеть / Узор / Материя.
- **`nav.js`** — проставляет `.active` на текущий пункт меню.
- **`leaflet.min.js` / `leaflet.min.css` / `leaflet.markercluster.min.js` /
  `MarkerCluster.min.css`** — карта (нужны `set.html`).
- **`noises.json`** — данные для `materials.html`.
- **`data/book.json` + `js/book-loader.js`** — контент и загрузчик ридера.

## Два агента (Cloudflare Workers)

Сеть думает двумя раздельными контурами — у каждого свой Worker, промпт и характер:

- **Спираль** — генератор, файл **`worker-generate.js`**, воркер `unitycode-petlya`.
  Творческий (температура 0.7). Контракт: `POST { raw_noise } → { interpretation }`.
- **Узор** — аналитик, файл **`worker-analyze.js`**, воркер `unitycode-analyze`.
  Холодный, наблюдательный (температура 0.4).
  Контракт: `POST { scope, nodes, connections? } → { interpretation }`.

Секреты воркеров — в `env.YANDEX_API_KEY`; CORS залочен на домены unitycode.space.
(`worker.js` — старый монолитный воркер, оставлен в репозитории для истории, не
используется.)

## База (Supabase)

Таблицы `nodes` и `connections`. SQL в репозитории:
`create tables.sql`, `add connections.sql`, `schema.sql` — выполнить в Supabase
один раз при заведении базы.

## Демо-режим

В `petlya.html` есть флаг **`USE_STUB`** (около строки 417):

- `true` — генератор отвечает встроенными demo-резонансами, YandexGPT не вызывается
  (ноль затрат). Портал работает сразу, без бэкенда.
- `false` — боевой режим, запросы идут в Worker. Переключить перед продакшном.

## Запуск локально

```bash
python -m http.server 8000   # открой http://localhost:8000
```

Деплой: GitHub Pages → Settings → Pages → Deploy from branch (`gh-pages`).
Воркеры деплоятся отдельно через дашборд Cloudflare.
