# Comment faire un fork de UnityCode

UnityCode n'est pas un site web, c'est un protocole. N'importe qui peut le prendre, allumer
son propre nœud et le remplir de son propre sens. Personne n'est propriétaire du Réseau. Cette
page contient tout le nécessaire pour lancer votre portail **sans rompre le lien avec les autres forks**.

-----

## Ce que c'est et de quoi c'est fait

Les trois pages-sections avec agents forment le menu du protocole :

- **Spirale** (`petlya.html`) — le générateur. Reçoit le bruit d'une personne → fait naître une résonance.
- **Motif** (`implant.html`) — l'analyste. Lit le graphe → une observation silencieuse sur les liens et une question ouverte.
- **Réseau** (`set.html`) — la carte des nœuds, sur Leaflet.

Plus l'entrée (`index.html`) — une intro générative, et les pages de contenu
(`materials.html` — «Matière», `kniga.html` — le lecteur), qui ne sont pas liées au protocole
et se modifient librement.

Ceux qui pensent et écrivent sont trois agents sur Cloudflare Workers. Leur code est dans le dossier `workers/` :

- `workers/unitycode-petlya.js` → Spirale. Moteur : **YandexGPT**.
  Contrat : `POST { raw_noise, lang } → { interpretation }`.
- `workers/unitycode-analyze.js` → Motif. Moteur : **MiMo**.
  Contrat : `POST { scope, nodes, connections?, lang } → { interpretation, scope, count }`.
- `workers/unitycode-write.js` → la porte d'écriture. Le seul à écrire dans la base de données.
  Contrat : `POST { action, token, turnstile, ... } → { ok }`.
  À l'intérieur, trois agents à la suite : le **Gardien** (signal ou vide), **Distill**
  (un extrait bref pour «Matière») et le **Liant** — après l'enregistrement réussi d'un nœud,
  il cherche en arrière-plan une résonance avec les nœuds existants et crée des liens de lui-même.

> ⚠️ Les fichiers de `workers/` sont des **instantanés** du code déployé, publiés pour
> ceux qui forkent. En production, les workers vivent dans le Cloudflare Dashboard ; c'est lui
> la source de vérité. Si l'instantané a divergé de la production — la production a raison.

La base de données est Supabase. Tables : `nodes`, `connections`, `events`, `linker_log`, `analysis_cache`.
Le schéma complet, RLS compris, tient dans un seul fichier : `schema.sql`.

-----

## L'essentiel sur la sécurité

- **Le navigateur n'écrit pas dans la base.** Toute écriture passe par le write-worker,
  à l'intérieur duquel vit la clé **secrète** de service Supabase. La clé n'existe que dans
  le worker et n'arrive jamais au client.
- **RLS est activé** directement dans `schema.sql` — l'anonyme n'a droit qu'à la lecture.
  Il est obligatoire de l'exécuter, sinon votre base reste ouverte en écriture à tout le monde.
- **Turnstile** (le captcha de Cloudflare, presque toujours invisible) : le write-worker vérifie
  le jeton et limite en plus la fréquence via KV. La Site Key publique va dans le client,
  la Secret Key uniquement dans le worker.
- **La clé publique Supabase côté client est en lecture seule.** C'est normal : RLS ne laissera pas écrire.

-----

## Le fork pas à pas

**1. Forkez le dépôt** sur GitHub et activez Pages (Settings → Pages → Deploy from branch → main).

**2. Montez votre propre base Supabase** (offre gratuite) :

- exécutez **`schema.sql`** en entier dans le SQL Editor — il crée les cinq tables et active RLS aussitôt ;
- si vous créez ensuite des tables à la main — n'oubliez pas `NOTIFY pgrst, 'reload schema';`,
  sinon l'API REST cessera d'écrire dans la nouvelle table sans rien dire ;
- dans Settings → API récupérez le `Project URL`, la clé publique (`anon`/`publishable` — pour la lecture)
  et la clé **secrète** de service (pour le write-worker ; ne la mettez pas dans le client).

**3. Activez Turnstile** dans Cloudflare (section Turnstile) : créez un widget → vous obtiendrez
la Site Key (publique) et la Secret Key.

**4. Montez les trois workers** dans Cloudflare — copiez le code du dossier `workers/` :

- **générateur** (`unitycode-petlya.js`) : secret `YANDEX_API_KEY`, votre propre `YANDEX_FOLDER_ID` dans le code ;
- **analyste** (`unitycode-analyze.js`) : secret `MIMO_API_KEY` ; variable `SUPABASE_URL`,
  secret `SUPABASE_SERVICE_KEY` (pour le cache d'analyse — sans eux l'analyste fonctionne, mais coûte plus cher) ;
- **porte d'écriture** (`unitycode-write.js`) : secrets `MIMO_API_KEY`, `SUPABASE_SERVICE_KEY`,
  `TURNSTILE_SECRET`, variable `SUPABASE_URL`, binding KV `RATE_KV` ;
- **dans chacun, ajoutez votre domaine à `ALLOWED_ORIGINS`** (en haut du fichier, cherchez la marque «ФОРКЕР»).

**5. Inscrivez vos données dans les pages** (les emplacements exacts sont signalés par un commentaire au début de chaque fichier) :

- adresses des workers : `WORKER_URL` (générateur), `ANALYZE_URL` (analyste), `WRITE_WORKER_URL` (écriture) ;
- `SUPABASE_URL` et la clé publique Supabase (pour la lecture) ;
- la **Site Key** de Turnstile.

**6. Vérifiez** dans cet ordre : ouvrez le worker dans le navigateur (il doit répondre `{"status":"ok"}`) →
ouvrez la Spirale, envoyez un bruit → une résonance arrivera → sur la carte, créez un nœud ou un lien
(l'écriture passe par le write-worker). S'il n'y a pas de réponse et que la console affiche **CORS** —
vous avez oublié d'ajouter le domaine à `ALLOWED_ORIGINS` (étape 4).

-----

## Ce que vous pouvez changer librement

Tout ce qui rend le portail **vôtre** et n'affecte pas les autres :

les textes de toutes les pages · les traductions (`i18n.js` et les fichiers du type `nom_<langue>.md`) ·
couleurs et typographies · les animations d'entrée · les libellés des boutons (y compris les
noms du menu — «Trame»/«Motif»/le mot que vous préférez, l'important est de ne pas toucher aux
fichiers eux-mêmes, voir plus bas) · l'apparence de la carte · «Matière» et le contenu du Livre ·
vos propres adresses de workers, votre domaine et vos clés.

-----

## Le mur porteur — et pourquoi mieux vaut ne pas le déplacer

Le code est ouvert, techniquement tout peut être réécrit. Mais quelques rares choses gardent
votre portail **compatible avec le Réseau commun**. Si vous les cassez, votre nœud tombera hors
du consensus des futurs forks et cessera de «parler la même langue» que les autres. Ce n'est pas
une interdiction — c'est un avertissement honnête sur la conséquence :

1. **Les trois entrées de menu du protocole et les noms de fichiers.** Les noms :
   `implant.html` / `petlya.html` / `set.html`. Les libellés et le style, changez-les comme vous voulez
   (ici ils s'appellent Motif · Spirale · Réseau) ; l'ensemble et les noms de ces fichiers, non. C'est
   ainsi que les portails se reconnaissent entre eux. («Matière» est une page de contenu, hors de cette règle.)
1. **Les contrats des workers.**
   Générateur : `{ raw_noise } → { interpretation }`.
   Analyste : `{ scope, nodes, connections } → { interpretation, scope, count }`, où `scope` ∈ `personal | social | collective`.
   Porte d'écriture : `{ action, token, turnstile, ... } → { ok }`.
   Si vous changez le format, vos agents cesseront de s'emboîter avec ceux des autres.
1. **Le schéma de la base et RLS.** Les tables `nodes` et `connections`, les noms des
   champs (`raw_noise`, `lat`, `lng`, `user_token`, `client_id`, `from_node_id`, `to_node_id`,
   `status`, `created_by`) et RLS activé (écriture uniquement par la porte). Une autre structure →
   vos nœuds ne s'inscriront pas dans la carte commune.
1. **Le Liant n'est plus un agent «du futur» — il tourne.** C'est la troisième étape dans
   le write-worker : après l'enregistrement d'un nœud, il cherche en arrière-plan une résonance
   avec les existants et crée des liens de lui-même (`connections.created_by = 'linker'`). Si vous
   changez sa logique dans votre fork, faites-le de sorte que les liens qu'il crée restent lisibles
   par les autres forks au même schéma. La doctrine du Liant (attribution, transparence,
   réversibilité, «des liens oui, des nœuds non») est décrite dans `CONCEPT.md`.

-----

## Pourquoi c'est ainsi

Si ce qu'il y a **à l'intérieur** du portail vous intéresse — vous ne casserez pas le mur porteur :
on vient de vous montrer où il est. Et celui qui voudra le casser partira sur sa propre branche, et
c'est très bien : le Réseau n'acceptera simplement pas un nœud incompatible. Sans arbitre
central. Rien que la sélection naturelle de ceux qui parlent le même protocole.

-----

*Expérience science-art à but non lucratif. Aucune donnée personnelle. Rien que du signal.*
