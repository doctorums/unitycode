# How to fork UnityCode

UnityCode is not a website — it’s a protocol. Anyone can take it, spin up their
own node and fill it with their own meaning. No one owns the Network. This page
is everything you need to launch your own portal **without breaking the link
with the other forks**.

-----

## What it is and what it’s made of

Three agent-backed section pages — this is the protocol menu:

- **Spiral** (`petlya.html`) — the generator. Takes a person’s noise → gives birth to a resonance.
- **Pattern** (`implant.html`) — the analyst. Reads the graph → a quiet observation about the connections plus one open question.
- **Network** (`set.html`) — the map of nodes on Leaflet.

Plus the entrance (`index.html`) — a generative intro, and content pages
(`materials.html` — “Matter”, `kniga.html` — the reader) that are not tied to the
protocol and can be changed freely.

The thinking and the writing are done by three agents on Cloudflare Workers:

- `worker-generate.js` → Spiral. Engine — **YandexGPT**. Contract: `POST { raw_noise, lang } → { interpretation }`.
- `worker-analyze.js` → Pattern. Engine — **MiMo V2.5 Pro**. Contract: `POST { scope, nodes, connections?, lang } → { interpretation, scope, count }`.
- `worker-write.js` → the write gateway. The only thing that writes to the database. Contract: `POST { action, token, turnstile, ... } → { ok }`.

The database is Supabase (tables `nodes`, `connections`). SQL lives in
`create tables.sql`, `add connections.sql` and `supabase-rls.sql`.

-----

## Important about security (this has changed)

Previously the browser wrote to Supabase directly with its own key — anyone could
script in nodes and connections. Now it works differently, and this is part of the
architecture:

- **The browser does not write to the database.** All writes go through `worker-write.js`,
  which holds a **secret** Supabase service key. The key lives only in the Worker and never reaches the client.
- **RLS is enabled.** `supabase-rls.sql` forbids writes for the anon role and leaves
  read-only access. Without it your database is open to the whole world for writing — run it, no exceptions.
- **Turnstile** (Cloudflare’s captcha, mostly invisible): the write Worker verifies the
  token and rate-limits via KV. The public Site Key sits in the client; the Secret Key — only in the Worker.
- **The public Supabase key in the client is read-only.** That’s fine: RLS won’t let it write anything.

-----

## Forking, step by step

**1. Fork the repository** on GitHub and enable Pages (Settings → Pages → Deploy from branch → main).

**2. Spin up your own Supabase database** (free tier):

- run `create tables.sql`, then `add connections.sql` in the SQL Editor;
- **make sure to run `supabase-rls.sql`** — it closes writes for the anon role;
- from Settings → API take your `Project URL`, the public key (`anon`/`publishable` — for reads)
  and the **secret** service key (for the write Worker; never put it in the client).

**3. Enable Turnstile** in Cloudflare (the Turnstile section): create a widget →
you’ll get a Site Key (public) and a Secret Key.

**4. Spin up the three Workers** in Cloudflare (copy `worker-generate.js`, `worker-analyze.js`, `worker-write.js`):

- generator: secret `YANDEX_API_KEY`, your own `YANDEX_FOLDER_ID` in the code;
- analyst: secret `MIMO_API_KEY`;
- write gateway: secrets `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TURNSTILE_SECRET` and a KV binding `RATE_KV`;
- **add your domain to `ALLOWED_ORIGINS`** in each (top of the file — look for the “FORKER” mark).

**5. Put your credentials into the pages** (the exact spots are marked with a comment at the top of each file):

- Worker URLs: `WORKER_URL` (generator), `ANALYZE_URL` (analyst), `WRITE_WORKER_URL` (writes);
- `SUPABASE_URL` and the public Supabase key (for reads);
- the Turnstile **Site Key**.

**6. Check** in order: open a Worker in a browser (it should answer `{"status":"ok"}`) →
open the Spiral, send some noise → a resonance should come back → on the map create a
node/connection (written via the write Worker). If there’s no response and the console
shows a **CORS** error — you forgot to add your domain to `ALLOWED_ORIGINS` (step 4).

-----

## What you may freely touch

Everything that makes the portal **yours** and doesn’t affect the others:

the texts of all pages · translations (`i18n.js` and files named `name_<lang>.md`) ·
colors and fonts · entrance animations · button labels · the look of the map · “Matter”
and the contents of the Book · your own Worker URLs, domain, keys.

-----

## The load-bearing wall — and why you’d better not move it

The code is open; technically you can rewrite anything. But a few things keep your
portal **compatible with the shared Network**. Break them — and your node drops out
of the consensus of future forks and stops “speaking the same language” as the other
portals. This is not a prohibition — it’s an honest warning about the consequence:

1. **The three protocol menu items and the file names.** Pattern · Spiral · Network →
   `implant.html` / `petlya.html` / `set.html`. Change the labels and the styling as you
   like; the set and the names of these files — don’t. That’s how portals recognize each
   other. (“Matter” is a content page — it’s outside this rule.)
1. **The Worker contracts.**
   Generator: `{ raw_noise } → { interpretation }`.
   Analyst: `{ scope, nodes, connections } → { interpretation, scope, count }`, where `scope` ∈ `personal | social | collective`.
   Write gateway: `{ action, token, turnstile, ... } → { ok }`.
   Change the format — and your agents will no longer dock with the others’.
1. **The database schema and RLS.** The tables `nodes` and `connections` and the field
   names (`raw_noise`, `lat`, `lng`, `user_token`, `parent_id`, `from_node_id`,
   `to_node_id`, `status`), plus RLS enabled (writes only via the gateway). A different
   structure → your nodes won’t fit into the shared map.
1. **`parent_id` is a sacred field.** It belongs to the future third agent (the Binder).
   It gets filled only by consensus of several independent forks — never by hand and
   never by a single agent alone. For now — leave it as is.

-----

## Why it works this way

If you’re interested in what’s **inside** the portal — you won’t break the load-bearing
wall: you’ve been told where it is. And whoever wants to break it will fork and drift into
their own branch, and that’s fine: the Network simply won’t accept an incompatible node.
No central arbiter. Only the natural selection of those who speak the same protocol.

-----

*A non-commercial science-art experiment. No personal data. Signal only.*
