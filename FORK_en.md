# How to fork UnityCode

UnityCode is not a website — it's a protocol. Anyone can take it, spin up their
own node and fill it with their own meaning. No one owns the Network. This page
is everything you need to launch your own portal **without breaking the link
with the other forks**.

-----

## What it is and what it's made of

Three agent-backed section pages — this is the protocol menu:

- **Spiral** (`petlya.html`) — the generator. Takes a person's noise → gives birth to a resonance.
- **Pattern** (`implant.html`) — the analyst. Reads the graph → a quiet observation about the connections plus one open question.
- **Network** (`set.html`) — the map of nodes on Leaflet.

Plus the entrance (`index.html`) — a generative intro, and content pages
(`materials.html` — "Matter", `kniga.html` — the reader) that are not tied to the
protocol and can be changed freely.

The thinking and the writing are done by three agents on Cloudflare Workers.
Their code lives in the `workers/` folder:

- `workers/unitycode-petlya.js` → Spiral. Engine — **YandexGPT**.
  Contract: `POST { raw_noise, lang } → { interpretation }`.
- `workers/unitycode-analyze.js` → Pattern. Engine — **MiMo**.
  Contract: `POST { scope, nodes, connections?, lang } → { interpretation, scope, count }`.
- `workers/unitycode-write.js` → the write gateway. The only thing that writes to the database.
  Contract: `POST { action, token, turnstile, ... } → { ok }`.
  Inside it, three agents run in sequence: the **Gatekeeper** (signal or emptiness),
  **Distill** (a short essence for "Matter") and **the Linker** — after a node is
  successfully written, it runs in the background, looks for resonance with existing
  nodes, and creates connections on its own.

> ⚠️ The files in `workers/` are **snapshots** of the deployed code, published for forkers.
> In production the Workers live in the Cloudflare Dashboard, and that is the source of
> truth. If a snapshot has drifted from production, production wins.

The database is Supabase. Tables: `nodes`, `connections`, `events`, `linker_log`,
`analysis_cache`. The whole schema, RLS included, is in a single file: `schema.sql`.

-----

## Important about security

- **The browser does not write to the database.** All writes go through the write Worker,
  which holds a **secret** Supabase service key. The key lives only in the Worker and never reaches the client.
- **RLS is enabled** right inside `schema.sql` — the anon role is left with read-only access.
  Run it, no exceptions: without RLS your database is open to the whole world for writing.
- **Turnstile** (Cloudflare's captcha, mostly invisible): the write Worker verifies the
  token and rate-limits via KV. The public Site Key sits in the client; the Secret Key — only in the Worker.
- **The public Supabase key in the client is read-only.** That's fine: RLS won't let it write anything.

-----

## Forking, step by step

**1. Fork the repository** on GitHub and enable Pages (Settings → Pages → Deploy from branch → main).

**2. Spin up your own Supabase database** (free tier):

- run **`schema.sql`** in the SQL Editor — it creates all five tables and turns RLS on;
- if you later create tables by hand, don't forget `NOTIFY pgrst, 'reload schema';`,
  otherwise the REST API will silently stop writing to the new table;
- from Settings → API take your `Project URL`, the public key (`anon`/`publishable` — for reads)
  and the **secret** service key (for the write Worker; never put it in the client).

**3. Enable Turnstile** in Cloudflare (the Turnstile section): create a widget →
you'll get a Site Key (public) and a Secret Key.

**4. Spin up the three Workers** in Cloudflare — copy the code from the `workers/` folder:

- **generator** (`unitycode-petlya.js`): secret `YANDEX_API_KEY`, your own `YANDEX_FOLDER_ID` in the code;
- **analyst** (`unitycode-analyze.js`): secret `MIMO_API_KEY`; variable `SUPABASE_URL`,
  secret `SUPABASE_SERVICE_KEY` (for the analysis cache — without them the analyst still works, just costs more);
- **write gateway** (`unitycode-write.js`): secrets `MIMO_API_KEY`, `SUPABASE_SERVICE_KEY`,
  `TURNSTILE_SECRET`, variable `SUPABASE_URL`, and a KV binding `RATE_KV`;
- **add your domain to `ALLOWED_ORIGINS`** in each (top of the file — look for the "ФОРКЕР / FORKER" mark).

**5. Put your credentials into the pages** (the exact spots are marked with a comment at the top of each file):

- Worker URLs: `WORKER_URL` (generator), `ANALYZE_URL` (analyst), `WRITE_WORKER_URL` (writes);
- `SUPABASE_URL` and the public Supabase key (for reads);
- the Turnstile **Site Key**.

**6. Check** in order: open a Worker in a browser (it should answer `{"status":"ok"}`) →
open the Spiral, send some noise → a resonance should come back → on the map create a
node/connection (written via the write Worker). If there's no response and the console
shows a **CORS** error — you forgot to add your domain to `ALLOWED_ORIGINS` (step 4).

-----

## What you may freely touch

Everything that makes the portal **yours** and doesn't affect the others:

the texts of all pages · translations (`i18n.js` and files named `name_<lang>.md`) ·
colors and fonts · entrance animations · button labels (including the menu item names —
"Pattern"/anything you like, as long as you don't touch the files themselves, see below) ·
the look of the map · "Matter" and the contents of the Book · your own Worker URLs, domain, keys.

-----

## The load-bearing wall — and why you'd better not move it

The code is open; technically you can rewrite anything. But a few things keep your
portal **compatible with the shared Network**. Break them — and your node drops out
of the consensus of future forks and stops "speaking the same language" as the other
portals. This is not a prohibition — it's an honest warning about the consequence:

1. **The file names.** `implant.html` / `petlya.html` / `set.html`. Change the labels
   and the styling as you like (ours are called Pattern · Spiral · Network); the set and
   the names of these files — don't. That's how portals recognize each other. ("Matter"
   is a content page — it's outside this rule.)
1. **The Worker contracts.**
   Generator: `{ raw_noise } → { interpretation }`.
   Analyst: `{ scope, nodes, connections } → { interpretation, scope, count }`, where `scope` ∈ `personal | social | collective`.
   Write gateway: `{ action, token, turnstile, ... } → { ok }`.
   Change the format — and your agents will no longer dock with the others'.
1. **The database schema and RLS.** The tables `nodes` and `connections`, the field
   names (`raw_noise`, `lat`, `lng`, `user_token`, `client_id`, `from_node_id`,
   `to_node_id`, `status`, `created_by`), plus RLS enabled (writes only via the gateway).
   A different structure → your nodes won't fit into the shared map.
1. **The Linker is no longer a "future" agent — it already works.** The third step
   inside the write Worker: after a node is written, it runs in the background, looks
   for resonance with existing nodes, and creates connections on its own
   (`connections.created_by = 'linker'`). If you change its logic in your fork, do it so
   that the connections it creates stay readable by other forks under the same schema.
   The Linker's doctrine (attribution, transparency, reversibility, "connections yes,
   nodes no") is described in `CONCEPT.md`.

-----

## Why it works this way

If you're interested in what's **inside** the portal — you won't break the load-bearing
wall: you've been told where it is. And whoever wants to break it will fork and drift into
their own branch, and that's fine: the Network simply won't accept an incompatible node.
No central arbiter. Only the natural selection of those who speak the same protocol.

-----

*A non-commercial science-art experiment. No personal data. Signal only.*
