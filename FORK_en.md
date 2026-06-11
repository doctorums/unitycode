# How to fork UnityCode

UnityCode is not a website — it’s a protocol. Anyone can take it, spin up their
own node and fill it with their own meaning. No one owns the Network. This page
is everything you need to launch your own portal **without breaking the link
with the other forks**.

-----

## What it is and what it’s made of

Three section pages (this is the menu — always three items):

- **Spiral** (`petlya.html`) — the generator. Takes a person’s noise → gives birth to a resonance.
- **Pattern** (`implant.html`) — the analyst. Reads the graph → Patterns / Resonances / Ruptures / The Network’s Question.
- **Network** (`set.html`) — the map of nodes on Leaflet.

Plus the entrance (`index.html`) — a generative intro, and standalone pages
(`kniga.html`, `priglashenie.html`) that are not part of the main menu.

The thinking is done by two agents on Cloudflare Workers (engine — YandexGPT):

- `worker-generate.js` → Spiral. Contract: `POST { raw_noise } → { interpretation }`.
- `worker-analyze.js` → Pattern. Contract: `POST { scope, nodes, connections? } → { interpretation, scope, count }`.

The database is Supabase (tables `nodes`, `connections`). SQL lives in `create tables.sql` and `add connections.sql`.

-----

## Forking, step by step

**1. Fork the repository** on GitHub and enable Pages (Settings → Pages → Deploy from branch → main).

**2. Spin up your own Supabase database** (free tier):

- run `create tables.sql`, then `add connections.sql` in the SQL Editor;
- from Settings → API take your `Project URL` and the public `anon`/`publishable` key.

**3. Spin up the two Workers** in Cloudflare (copy `worker-generate.js` and `worker-analyze.js`):

- add the secret `YANDEX_API_KEY` to each (Settings → Variables and Secrets);
- put your own `YANDEX_FOLDER_ID` into the Worker code;
- **add your domain to `ALLOWED_ORIGINS`** (at the top of each Worker — look for the «ФОРКЕР» / “FORKER” mark).

**4. Put your credentials into the pages** (the exact spots are marked with a comment at the top of each file):

|File          |What to replace                             |Approximate line|
|--------------|--------------------------------------------|----------------|
|`petlya.html` |`WORKER_URL` (generator) + the `value` field|~386, ~264      |
|`implant.html`|`WORKER_URL` **and** `ANALYZE_URL`          |~259, ~262      |
|`implant.html`|`SUPABASE_URL`, `SUPABASE_KEY`              |throughout      |
|`set.html`    |`SUPABASE_URL`, `SUPABASE_KEY`              |~142, ~143      |

**5. Check** in order: open the Worker in a browser (it should answer `{"status":"ok"}`) →
open the Spiral, send some noise → a response should come back. If there is no
response and the console shows a **CORS** error — you forgot to add your domain
to `ALLOWED_ORIGINS` (step 3).

-----

## What you may freely touch

Everything that makes the portal **yours** and doesn’t affect the others:

the texts of all pages · colors and fonts · entrance animations · button labels ·
the look of the map · the contents of the Book and the Invitation · your own
Worker URLs, domain, Supabase keys.

-----

## The load-bearing wall — and why you’d better not move it

The code is open; technically you can rewrite anything. But four things keep
your portal **compatible with the shared Network**. Break them — and your node
drops out of the consensus of future forks and stops “speaking the same
language” as the other portals. This is not a prohibition — it’s an honest
warning about the consequence:

1. **Three menu items and the file names.** Pattern · Spiral · Network →
   `implant.html` / `petlya.html` / `set.html`. Change the labels and the
   styling as you like; the set and the file names — don’t. That’s how portals
   recognize each other.
1. **The Worker contracts.**
   Generator: `{ raw_noise } → { interpretation }`.
   Analyst: `{ scope, nodes, connections } → { interpretation, scope, count }`,
   where `scope` ∈ `personal | social | collective`. Change the format — and
   your agents will no longer dock with the others’.
1. **The database schema.** The tables `nodes` and `connections` and the field
   names (`raw_noise`, `lat`, `lng`, `user_token`, `parent_id`, `from_node_id`,
   `to_node_id`, `status`). A different structure → your nodes won’t fit into
   the shared map.
1. **`parent_id` is a sacred field.** It belongs to the future third agent (the
   Binder). It gets filled only by consensus of several independent forks —
   never by hand and never by a single agent alone. For now — leave it as is.

-----

## Why it works this way

If you’re interested in what’s **inside** the portal — you won’t break the
load-bearing wall: you’ve been told where it is. And whoever wants to break it
will fork and drift into their own branch, and that’s fine: the Network simply
won’t accept an incompatible node. No central arbiter. Only the natural
selection of those who speak the same protocol.

-----

*A non-commercial science-art experiment. No personal data. Signal only.*