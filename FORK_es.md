# Cómo hacer un fork de UnityCode

UnityCode no es un sitio web, es un protocolo. Cualquiera puede tomarlo, levantar su propio
nodo y llenarlo de su propio sentido. Nadie es dueño de la Red. En esta página está todo lo
necesario para poner en marcha tu portal **sin romper el vínculo con los demás forks**.

-----

## Qué es y de qué se compone

Las tres páginas-sección con agentes son el menú del protocolo:

- **Espiral** (`petlya.html`) — el generador. Recibe el ruido de una persona → hace nacer una resonancia.
- **Patrón** (`implant.html`) — el analista. Lee el grafo → una observación silenciosa sobre las conexiones y una pregunta abierta.
- **Red** (`set.html`) — el mapa de nodos sobre Leaflet.

Más la entrada (`index.html`) — una intro generativa, y las páginas de contenido
(`materials.html` — «Materia», `kniga.html` — el lector), que no están atadas al protocolo
y se cambian libremente.

Quienes piensan y escriben son tres agentes en Cloudflare Workers. Su código está en la carpeta `workers/`:

- `workers/unitycode-petlya.js` → Espiral. Motor: **YandexGPT**.
  Contrato: `POST { raw_noise, lang } → { interpretation }`.
- `workers/unitycode-analyze.js` → Patrón. Motor: **MiMo**.
  Contrato: `POST { scope, nodes, connections?, lang } → { interpretation, scope, count }`.
- `workers/unitycode-write.js` → la puerta de escritura. El único que escribe en la base de datos.
  Contrato: `POST { action, token, turnstile, ... } → { ok }`.
  Dentro hay tres agentes seguidos: el **Guardián** (señal o vacío), **Distill**
  (un extracto breve para «Materia») y el **Enlazador** — tras registrar un nodo con éxito,
  busca en segundo plano resonancia con los nodos existentes y crea conexiones por su cuenta.

> ⚠️ Los archivos de `workers/` son **instantáneas** del código desplegado, publicadas para
> quienes hagan un fork. En producción los workers viven en el Cloudflare Dashboard; él es
> la fuente de verdad. Si la instantánea se ha desviado de producción — manda producción.

La base de datos es Supabase. Tablas: `nodes`, `connections`, `events`, `linker_log`, `analysis_cache`.
El esquema completo, RLS incluido, está en un solo archivo: `schema.sql`.

-----

## Lo importante sobre seguridad

- **El navegador no escribe en la base de datos.** Toda escritura pasa por el write-worker,
  dentro del cual vive la clave **secreta** de servicio de Supabase. La clave solo existe en
  el worker, nunca llega al cliente.
- **RLS está activado** directamente en `schema.sql` — al anónimo solo se le deja lectura.
  Es obligatorio ejecutarlo, si no tu base de datos queda abierta a escritura para todo el mundo.
- **Turnstile** (el captcha de Cloudflare, casi siempre invisible): el write-worker verifica
  el token y además limita la frecuencia mediante KV. La Site Key pública va en el cliente,
  la Secret Key solo en el worker.
- **La clave pública de Supabase en el cliente es solo de lectura.** Es normal: RLS no dejará escribir.

-----

## El fork paso a paso

**1. Haz un fork del repositorio** en GitHub y activa Pages (Settings → Pages → Deploy from branch → main).

**2. Levanta tu propia base Supabase** (free tier):

- ejecuta **`schema.sql`** entero en el SQL Editor — crea las cinco tablas y activa RLS de inmediato;
- si más adelante creas tablas a mano — no olvides `NOTIFY pgrst, 'reload schema';`,
  si no la REST API dejará de escribir en la tabla nueva sin decir nada;
- en Settings → API toma el `Project URL`, la clave pública (`anon`/`publishable` — para lectura)
  y la clave **secreta** de servicio (para el write-worker; no la pongas en el cliente).

**3. Activa Turnstile** en Cloudflare (sección Turnstile): crea un widget → obtendrás
la Site Key (pública) y la Secret Key.

**4. Levanta los tres workers** en Cloudflare — copia el código de la carpeta `workers/`:

- **generador** (`unitycode-petlya.js`): secreto `YANDEX_API_KEY`, tu propio `YANDEX_FOLDER_ID` en el código;
- **analista** (`unitycode-analyze.js`): secreto `MIMO_API_KEY`; variable `SUPABASE_URL`,
  secreto `SUPABASE_SERVICE_KEY` (para la caché del análisis — sin ellos el analista funciona, pero sale más caro);
- **puerta de escritura** (`unitycode-write.js`): secretos `MIMO_API_KEY`, `SUPABASE_SERVICE_KEY`,
  `TURNSTILE_SECRET`, variable `SUPABASE_URL`, binding KV `RATE_KV`;
- **en cada uno añade tu dominio a `ALLOWED_ORIGINS`** (arriba del archivo, busca la marca «ФОРКЕР»).

**5. Escribe tus datos en las páginas** (los lugares exactos están marcados con un comentario al principio de cada archivo):

- direcciones de los workers: `WORKER_URL` (generador), `ANALYZE_URL` (analista), `WRITE_WORKER_URL` (escritura);
- `SUPABASE_URL` y la clave pública de Supabase (para lectura);
- la **Site Key** de Turnstile.

**6. Comprueba** en este orden: abre el worker en el navegador (debe responder `{"status":"ok"}`) →
abre la Espiral, envía un ruido → llegará una resonancia → en el mapa crea un nodo o una conexión
(se escribe a través del write-worker). Si no hay respuesta y en la consola aparece **CORS** —
olvidaste añadir el dominio a `ALLOWED_ORIGINS` (paso 4).

-----

## Qué puedes cambiar libremente

Todo lo que hace que el portal sea **tuyo** y no afecta a los demás:

los textos de todas las páginas · las traducciones (`i18n.js` y archivos del tipo `nombre_<idioma>.md`) ·
colores y tipografías · las animaciones de entrada · las etiquetas de los botones (incluidos los
nombres del menú — «Trama»/«Patrón»/la palabra que prefieras, lo importante es no tocar los archivos
en sí, ver más abajo) · el aspecto del mapa · «Materia» y el contenido del Libro ·
tus propias direcciones de workers, dominio y claves.

-----

## El muro de carga — y por qué es mejor no moverlo

El código es abierto, técnicamente se puede reescribir todo. Pero unas pocas cosas mantienen
tu portal **compatible con la Red común**. Si las rompes, tu nodo se caerá del consenso de los
futuros forks y dejará de «hablar el mismo idioma» que los demás. No es una prohibición — es
una advertencia honesta sobre la consecuencia:

1. **Los tres puntos de menú del protocolo y los nombres de archivo.** Los nombres:
   `implant.html` / `petlya.html` / `set.html`. Las etiquetas y el estilo cámbialos como quieras
   (aquí se llaman Patrón · Espiral · Red); el conjunto y los nombres de esos archivos, no. Así
   los portales se reconocen entre sí. («Materia» es una página de contenido, queda fuera de esta regla.)
1. **Los contratos de los workers.**
   Generador: `{ raw_noise } → { interpretation }`.
   Analista: `{ scope, nodes, connections } → { interpretation, scope, count }`, donde `scope` ∈ `personal | social | collective`.
   Puerta de escritura: `{ action, token, turnstile, ... } → { ok }`.
   Si cambias el formato, tus agentes dejarán de encajar con los ajenos.
1. **El esquema de la base de datos y RLS.** Las tablas `nodes` y `connections`, los nombres de
   los campos (`raw_noise`, `lat`, `lng`, `user_token`, `client_id`, `from_node_id`, `to_node_id`,
   `status`, `created_by`) y RLS activado (escritura solo a través de la puerta). Otra estructura →
   tus nodos no encajarán en el mapa común.
1. **El Enlazador ya no es un agente «del futuro» — está funcionando.** Es el tercer paso dentro
   del write-worker: tras registrar un nodo, busca en segundo plano resonancia con los existentes
   y crea conexiones por su cuenta (`connections.created_by = 'linker'`). Si cambias su lógica en
   tu fork, hazlo de modo que las conexiones que cree sigan siendo legibles por otros forks con el
   mismo esquema. La doctrina del Enlazador (atribución, transparencia, reversibilidad, «conexiones
   sí, nodos no») está descrita en `CONCEPT.md`.

-----

## Por qué es así

Si te interesa lo que hay **dentro** del portal — el muro de carga no lo vas a romper: ya te
enseñaron dónde está. Y quien quiera romperlo, se irá a su propia rama, y está bien: la Red
simplemente no aceptará un nodo incompatible. Sin árbitro central. Solo la selección natural
de quienes hablan el mismo protocolo.

-----

*Experimento science-art sin ánimo de lucro. Ningún dato personal. Solo señal.*
