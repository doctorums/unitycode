# 如何 fork UnityCode

UnityCode 不是一个网站，而是一套协议。任何人都可以拿走它，点亮自己的节点，并用自己的
意义把它填满。没有人拥有网络。这一页包含了启动你的门户所需的一切，
而且**不会切断与其他 fork 之间的联系**。

-----

## 它是什么，由什么构成

三个带有智能体的页面构成协议的主菜单：

- **螺旋**（`petlya.html`）—— 生成者。接收一个人的噪声 → 让共鸣诞生。
- **图案**（`implant.html`）—— 分析者。读取图谱 → 对联结的一段安静观察，以及一个开放的问题。
- **网络**（`set.html`）—— 基于 Leaflet 的节点地图。

此外还有入口页（`index.html`，生成式的开场）和内容页
（`materials.html` —— 「物质」，`kniga.html` —— 阅读器）。后两者不受协议约束，可以自由改动。

思考与书写的是运行在 Cloudflare Workers 上的三个智能体。它们的代码在 `workers/` 目录中：

- `workers/unitycode-petlya.js` → 螺旋。引擎：**YandexGPT**。
  接口：`POST { raw_noise, lang } → { interpretation }`。
- `workers/unitycode-analyze.js` → 图案。引擎：**MiMo**。
  接口：`POST { scope, nodes, connections?, lang } → { interpretation, scope, count }`。
- `workers/unitycode-write.js` → 写入之门。唯一向数据库写入的组件。
  接口：`POST { action, token, turnstile, ... } → { ok }`。
  其内部依次是三个智能体：**守门人**（判断是信号还是空无）、**Distill**
  （为「物质」提炼简短的精华），以及**联结者** —— 节点成功登记之后，
  它会在后台寻找与已有节点的共鸣，并自行建立联结。

> ⚠️ `workers/` 中的文件是已部署代码的**快照**，是为 fork 的人发布的。
> 生产环境中的 workers 住在 Cloudflare Dashboard 里，那里才是真实来源。
> 如果快照与生产环境不一致 —— 以生产环境为准。

数据库是 Supabase。数据表：`nodes`、`connections`、`events`、`linker_log`、`analysis_cache`。
完整的表结构（含 RLS）都在一个文件里：`schema.sql`。

-----

## 关于安全，最重要的几点

- **浏览器不向数据库写入。** 所有写入都经过 write-worker，Supabase 的**服务密钥**
  只存在于这个 worker 内部，永远不会到达客户端。
- **RLS 在 `schema.sql` 中直接启用** —— 匿名访问只被允许读取。
  这一步必须执行，否则你的数据库对所有人开放写入。
- **Turnstile**（Cloudflare 的验证码，几乎总是无形的）：write-worker 会校验令牌，
  并通过 KV 额外限制频率。公开的 Site Key 放在客户端，Secret Key 只放在 worker 里。
- **客户端里的 Supabase 公开密钥只能读取。** 这是正常的：RLS 不会允许写入。

-----

## 一步步 fork

**1. 在 GitHub 上 fork 仓库**，并启用 Pages（Settings → Pages → Deploy from branch → main）。

**2. 建立你自己的 Supabase 数据库**（免费额度即可）：

- 在 SQL Editor 中完整执行 **`schema.sql`** —— 它会创建五张表并立即启用 RLS；
- 如果之后手动建表 —— 别忘了 `NOTIFY pgrst, 'reload schema';`，
  否则 REST API 会悄无声息地拒绝向新表写入；
- 在 Settings → API 中取得 `Project URL`、公开密钥（`anon`/`publishable`，用于读取）
  以及**服务密钥**（给 write-worker 用；不要放进客户端）。

**3. 启用 Turnstile**（Cloudflare 的 Turnstile 板块）：创建一个 widget →
你会得到 Site Key（公开）和 Secret Key。

**4. 部署三个 worker**（代码从 `workers/` 目录复制）：

- **生成者**（`unitycode-petlya.js`）：密钥 `YANDEX_API_KEY`，代码中填入你自己的 `YANDEX_FOLDER_ID`；
- **分析者**（`unitycode-analyze.js`）：密钥 `MIMO_API_KEY`；变量 `SUPABASE_URL`，
  密钥 `SUPABASE_SERVICE_KEY`（用于分析缓存——没有它们分析者也能工作，只是更费钱）；
- **写入之门**（`unitycode-write.js`）：密钥 `MIMO_API_KEY`、`SUPABASE_SERVICE_KEY`、
  `TURNSTILE_SECRET`，变量 `SUPABASE_URL`，KV 绑定 `RATE_KV`；
- **在每一个 worker 里都把你的域名加进 `ALLOWED_ORIGINS`**（在文件顶部，搜索标记「ФОРКЕР」）。

**5. 把你的数据写进页面**（具体位置在每个文件开头的注释中标明）：

- worker 的地址：`WORKER_URL`（生成者）、`ANALYZE_URL`（分析者）、`WRITE_WORKER_URL`（写入）；
- `SUPABASE_URL` 与 Supabase 公开密钥（用于读取）；
- Turnstile 的 **Site Key**。

**6. 按这个顺序检查**：在浏览器中打开 worker（应当返回 `{"status":"ok"}`）→
打开螺旋，发送一段噪声 → 会收到共鸣 → 在地图上创建一个节点或一次联结
（写入会经过 write-worker）。如果没有响应而控制台出现 **CORS** ——
说明你忘了把域名加进 `ALLOWED_ORIGINS`（第 4 步）。

-----

## 你可以自由改动的部分

一切让门户成为**你的**、又不影响他人的东西：

所有页面的文字 · 翻译（`i18n.js` 以及 `名称_<语言>.md` 这类文件）·
颜色与字体 · 入场动画 · 按钮上的文案（包括菜单名称 ——
「织纹」/「图案」/你更喜欢的任何词，关键是别动文件本身，见下文）·
地图的外观 ·「物质」与书的内容 · 你自己的 worker 地址、域名和密钥。

-----

## 承重墙 —— 以及为什么最好别去挪动它

代码是开放的，技术上一切都可以重写。但有少数几样东西，维系着你的门户
**与共同网络的兼容性**。一旦破坏，你的节点就会脱离未来 fork 之间的共识，
不再与其他人「说同一种语言」。这不是禁令 —— 而是对后果的诚实提醒：

1. **协议的三个菜单项与文件名。** 文件名：
   `implant.html` / `petlya.html` / `set.html`。标签和样式随你怎么改
   （这里它们叫图案 · 螺旋 · 网络）；但这几个文件的组成与名称不要动。
   门户正是靠它们彼此识别。（「物质」是内容页，不在此列。）
1. **worker 的接口约定。**
   生成者：`{ raw_noise } → { interpretation }`。
   分析者：`{ scope, nodes, connections } → { interpretation, scope, count }`，其中 `scope` ∈ `personal | social | collective`。
   写入之门：`{ action, token, turnstile, ... } → { ok }`。
   如果你改动格式，你的智能体将无法与别人的对接。
1. **数据库结构与 RLS。** `nodes` 与 `connections` 两张表、字段名
   （`raw_noise`、`lat`、`lng`、`user_token`、`client_id`、`from_node_id`、`to_node_id`、
   `status`、`created_by`），以及启用的 RLS（只允许通过门写入）。结构不同 →
   你的节点将无法融入共同的地图。
1. **联结者不再是「未来的」智能体 —— 它已经在运行。** 它是 write-worker 内部的第三步：
   节点登记之后，它在后台寻找与已有节点的共鸣，并自行建立联结
   （`connections.created_by = 'linker'`）。如果你在自己的 fork 中改动它的逻辑，
   请让它建立的联结对采用同一结构的其他 fork 仍然可读。联结者的准则
   （署名、透明、可逆、「只建联结，不建节点」）记载在 `CONCEPT.md` 中。

-----

## 为什么是这样

如果你对门户**内部**感兴趣 —— 你不会撞坏承重墙：它在哪里，刚刚已经告诉你了。
而想要撞坏它的人，会走向自己的分支，这也很好：网络只是不会接纳一个不兼容的节点。
没有中央仲裁者。只有说同一套协议的人之间的自然选择。

-----

*非营利的科学艺术实验。没有个人数据。只有信号。*
