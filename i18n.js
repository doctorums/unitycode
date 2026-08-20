/* UnityCode — общая локализация (i18n.js)
   Подключать ПЕРЕД основным скриптом страницы:  <script src="i18n.js"></script>
   Разметка: data-i18n="ключ" (текст), data-i18n-html="ключ" (HTML), data-i18n-ph="ключ" (placeholder)
   Из JS:    UC_I18N.t('ключ')  /  UC_I18N.lang
   Языки без перевода падают на en, затем на ru. */
(function(){
  var SUPPORTED = ['ru','en','es','fr','zh'];
  var NAMES = { ru:'Русский', en:'English', es:'Español', fr:'Français', zh:'中文' };

  function resolveLang(){
    var p=null; try{ p=new URLSearchParams(location.search).get('lang'); }catch(e){}
    var stored=null; try{ stored=localStorage.getItem('uc_lang'); }catch(e){}
    var v=(p||stored||navigator.language||'ru').slice(0,2).toLowerCase();
    if(SUPPORTED.indexOf(v)<0) v='ru';
    if(p){ try{ localStorage.setItem('uc_lang',v); }catch(e){} }
    return v;
  }
  var LANG = resolveLang();

  /* ===== Словарь. Пока ru + en; es/fr/zh добавляются сюда же. ===== */
  var DICT = {
    // — общий каркас (навигация, разделы) —
    'nav.spiral':  { ru:`Спираль`, en:`Spiral`  , es:`Espiral`, fr:`Spirale`, zh:`螺旋`},
    'nav.network': { ru:`Сеть`,    en:`Network` , es:`Red`, fr:`Réseau`, zh:`网络`},
    'nav.pattern': { ru:`Паттерн`,    en:`Pattern` , es:`Patrón`, fr:`Motif`, zh:`图案`},
    'nav.matter':  { ru:`Материя`, en:`Matter`  , es:`Materia`, fr:`Matière`, zh:`物质`},

    // — лендинг (index.html) —
    'index.q': {
      ru:`<span class="wl">Ты пишешь то, что тебя волнует,</span><br><span class="wl">а AI помогает увидеть в этом</span><br><em class="wl">скрытые связи и новые смыслы.</em><br><span class="wl">Это не даёт ответов.</span><br><span class="wl">Это помогает тебе.</span>`,
      en:`<span class="wl">You write what's on your mind,</span><br><span class="wl">and AI helps you see in it</span><br><em class="wl">hidden connections and new meanings.</em><br><span class="wl">This doesn't give answers.</span><br><span class="wl">This helps you.</span>`
    , es:`<span class="wl">Escribes lo que te inquieta,</span><br><span class="wl">y la IA te ayuda a ver en ello</span><br><em class="wl">conexiones ocultas y sentidos nuevos.</em><br><span class="wl">Esto no da respuestas.</span><br><span class="wl">Esto te ayuda.</span>`, fr:`<span class="wl">Vous écrivez ce qui vous préoccupe,</span><br><span class="wl">et l'IA vous aide à y voir</span><br><em class="wl">des liens cachés et des sens nouveaux.</em><br><span class="wl">Cela ne donne pas de réponses.</span><br><span class="wl">Cela vous aide.</span>`, zh:`<span class="wl">你写下心中所念，</span><br><span class="wl">AI 帮你从中看见</span><br><em class="wl">隐藏的联系与新的意义。</em><br><span class="wl">这不给答案。</span><br><span class="wl">这只是帮你。</span>`},
    'index.btn':       { ru:`Услышать себя`, en:`Hear yourself` , es:`Escúchate`, fr:`S'écouter`, zh:`听见自己`},
    'index.disc': {
      ru:`Некоммерческий научно-художественный эксперимент.<br>Мы не собираем персональные данные. Только сигнал.<br>Сгенерированный контент не претендует на объективную истинность.`,
      en:`A non-commercial science-art experiment.<br>We don't collect personal data. Signal only.<br>Generated content makes no claim to objective truth.`
    , es:`Experimento científico-artístico sin ánimo de lucro.<br>No recopilamos datos personales. Solo señal.<br>El contenido generado no pretende ser verdad objetiva.`, fr:`Expérience science-art à but non lucratif.<br>Nous ne collectons aucune donnée personnelle. Rien que du signal.<br>Le contenu généré ne prétend pas à une vérité objective.`, zh:`非营利的科学艺术实验。<br>我们不收集个人数据。只有信号。<br>生成的内容不声称是客观真理。`},
    'index.choiceQ': {
      ru:`Зачем это тебе?<br><br>Чтобы перестать чувствовать себя отдельной точкой.<br>Когда ты видишь, как твои мысли соединяются с идеями<br>других людей и с чем-то большим,<br>одиночество отступает.<br>Это не терапия и не религия.<br>Это способ ощутить связь, которая уже есть.`,
      en:`Why do you need this?<br><br>To stop feeling like a separate point.<br>When you see how your thoughts connect with the ideas<br>of other people and with something larger,<br>loneliness recedes.<br>This is not therapy and not religion.<br>It's a way to feel a connection that already exists.`
    , es:`¿Para qué te sirve esto?<br><br>Para dejar de sentirte un punto aparte.<br>Cuando ves cómo tus pensamientos se conectan con las ideas<br>de otras personas y con algo más grande,<br>la soledad retrocede.<br>Esto no es terapia ni religión.<br>Es una manera de sentir una conexión que ya existe.`, fr:`À quoi cela vous sert-il ?<br><br>À cesser de vous sentir comme un point isolé.<br>Quand vous voyez comment vos pensées rejoignent les idées<br>d'autres personnes et quelque chose de plus vaste,<br>la solitude recule.<br>Ce n'est ni une thérapie ni une religion.<br>C'est une façon de sentir un lien qui existe déjà.`, zh:`这对你有什么用？<br><br>让你不再觉得自己是一个孤立的点。<br>当你看见自己的念头如何与他人的想法<br>以及某种更大的东西相连，<br>孤独就会退去。<br>这不是治疗，也不是宗教。<br>这是一种感受已然存在的联系的方式。`},
    'index.choiceBtn': { ru:`[ Что делать? ]`, en:`[ What to do? ]` , es:`[ ¿Qué hacer? ]`, fr:`[ Que faire ? ]`, zh:`[ 该做什么？ ]`},
    'index.aiAlts0': {
      ru:`1.&nbsp;&nbsp;&nbsp;&nbsp;Зайди в раздел «Спираль», нажав на кнопку.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Напиши туда всё, что крутится в голове,<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;и получи интерпретацию.<br><br>2.&nbsp;&nbsp;&nbsp;&nbsp;Если ответ тебя зацепит —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;создай свой личный узел<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(это как твой цифровой дневник).<br><br>3.&nbsp;&nbsp;&nbsp;&nbsp;Потом загляни в раздел «Сеть» —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;там видны другие участники и их мысли.`,
      en:`1.&nbsp;&nbsp;&nbsp;&nbsp;Open the «Spiral» section by tapping the button.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Write there whatever is spinning in your head,<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;and get an interpretation.<br><br>2.&nbsp;&nbsp;&nbsp;&nbsp;If the answer resonates with you —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;create your own personal node<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(it's like your digital diary).<br><br>3.&nbsp;&nbsp;&nbsp;&nbsp;Then look into the «Network» section —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;there you'll see other participants and their thoughts.`
    , es:`1.&nbsp;&nbsp;&nbsp;&nbsp;Abre la sección «Espiral» pulsando el botón.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Escribe allí lo que te da vueltas en la cabeza,<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;y recibe una interpretación.<br><br>2.&nbsp;&nbsp;&nbsp;&nbsp;Si la respuesta resuena contigo —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;crea tu propio nodo personal<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(es como tu diario digital).<br><br>3.&nbsp;&nbsp;&nbsp;&nbsp;Luego asómate a la sección «Red» —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allí verás a otros participantes y sus pensamientos.`, fr:`1.&nbsp;&nbsp;&nbsp;&nbsp;Ouvrez la section «Spirale» en appuyant sur le bouton.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Écrivez-y ce qui tourne dans votre tête,<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;et recevez une interprétation.<br><br>2.&nbsp;&nbsp;&nbsp;&nbsp;Si la réponse résonne en vous —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;créez votre propre nœud personnel<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(c'est comme votre journal numérique).<br><br>3.&nbsp;&nbsp;&nbsp;&nbsp;Puis allez voir la section «Réseau» —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;vous y verrez d'autres participants et leurs pensées.`, zh:`1.&nbsp;&nbsp;&nbsp;&nbsp;点击按钮，打开「螺旋」。<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;在那里写下你脑中盘旋的东西，<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;然后获得一份解读。<br><br>2.&nbsp;&nbsp;&nbsp;&nbsp;如果回应与你共鸣——<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;就创建属于你自己的节点<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;（就像你的数字日记）。<br><br>3.&nbsp;&nbsp;&nbsp;&nbsp;然后去看看「网络」——<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;你会在那里看见其他参与者和他们的念头。`},
    'index.btnSpiral': { ru:`[ Спираль ]`, en:`[ Spiral ]` , es:`[ Espiral ]`, fr:`[ Spirale ]`, zh:`[ 螺旋 ]`},
    // — тихая подсказка новичку, зависшему на 20с без клика —
    'index.btnHint':   { ru:`Смотри здесь`, en:`Look here` , es:`Mira aquí`, fr:`Regarde ici`, zh:`看这里`},
    'index.qHint': {
      ru:`<span class="wl">Если ты не понимаешь</span><br><em class="wl">куда и зачем попал,</em><br><span class="wl">дави кнопку ниже</span>`,
      en:`<span class="wl">If you don't understand</span><br><em class="wl">where you are or why,</em><br><span class="wl">press the button below</span>`
    , es:`<span class="wl">Si no entiendes</span><br><em class="wl">dónde estás ni por qué,</em><br><span class="wl">pulsa el botón de abajo</span>`, fr:`<span class="wl">Si tu ne comprends pas</span><br><em class="wl">où tu es ni pourquoi,</em><br><span class="wl">appuie sur le bouton ci-dessous</span>`, zh:`<span class="wl">如果你不明白</span><br><em class="wl">自己在哪里、为什么在这里，</em><br><span class="wl">按下面的按钮</span>`},
    'index.btnBack':   { ru:`Назад`, en:`Back` , es:`Atrás`, fr:`Retour`, zh:`返回`},
    'index.guideLoading': { ru:`Загрузка…`, en:`Loading…` , es:`Cargando…`, fr:`Chargement…`, zh:`加载中…`},
    'index.guideError': { ru:`Не получилось загрузить — попробуй ещё раз чуть позже. Окно можно закрыть в любой момент.`, en:`Couldn't load it — try again in a bit. You can close this window any time.` , es:`No se pudo cargar — inténtalo de nuevo en un momento. Puedes cerrar esta ventana cuando quieras.`, fr:`Impossible de charger — réessayez dans un instant. Vous pouvez fermer cette fenêtre à tout moment.`, zh:`加载失败——过一会儿再试试。这个窗口随时可以关闭。`},
    // — выход: слово живёт в воде лендинга, видят только вернувшиеся —
    'index.exit':     { ru:`выход`, en:`exit`, es:`salida`, fr:`sortie`, zh:`离开`},
    'index.exitDoor': { ru:`дверь осталась`, en:`the door remains`, es:`la puerta queda`, fr:`la porte demeure`, zh:`门还在`},
    'index.exitRead': { ru:`первоисточник`, en:`the primary source`, es:`la fuente primaria`, fr:`la source première`, zh:`本源`},
    // — окончательный уход: стирается ключ, Сеть остаётся нетронутой —
    'index.exitFinal': { ru:`уйти совсем`, en:`leave for good`, es:`irse del todo`, fr:`partir pour de bon`, zh:`彻底离开`},
    'index.exitKept':  { ru:`Мысли останутся в Сети — они уже не твои.`, en:`The thoughts stay in the Network — they are no longer yours.`, es:`Los pensamientos quedan en la Red — ya no son tuyos.`, fr:`Les pensées restent dans le Réseau — elles ne sont plus les vôtres.`, zh:`念头留在网络里——它们已不再属于你。`},
    'index.exitKey':   { ru:`С этого устройства исчезнет ключ.`, en:`The key will vanish from this device.`, es:`La llave desaparecerá de este dispositivo.`, fr:`La clé disparaîtra de cet appareil.`, zh:`钥匙将从这台设备上消失。`},
    'index.exitPhraseBack': { ru:`Ключевая фраза вернёт тебя.`, en:`Your key phrase will bring you back.`, es:`Tu frase clave te traerá de vuelta.`, fr:`Votre phrase clé vous ramènera.`, zh:`你的密钥短语会把你带回来。`},
    'index.exitNoBack': { ru:`Вернуться будет нельзя.`, en:`There will be no way back.`, es:`No habrá vuelta atrás.`, fr:`Il n'y aura pas de retour.`, zh:`将无法回来。`},
    'index.exitGo':    { ru:`уйти`, en:`leave`, es:`irse`, fr:`partir`, zh:`离开`},
    'index.exitStay':  { ru:`остаться`, en:`stay`, es:`quedarse`, fr:`rester`, zh:`留下`},
    'index.exitHeld':  { ru:`Один шум ещё в пути. Уйти совсем можно будет, когда Сеть его примет.`, en:`One noise is still on its way. You can leave for good once the Network has taken it.`, es:`Un ruido aún está en camino. Podrás irte del todo cuando la Red lo acoja.`, fr:`Un bruit est encore en route. Vous pourrez partir pour de bon quand le Réseau l'aura reçu.`, zh:`还有一段噪声在路上。等网络接收它之后，你就可以彻底离开。`},

    // — Первоисточник (istok.html): зерно книги + то, что Сеть вырастила из шумов —
    'istok.pageTitle': { ru:`Первоисточник · UnityCode`, en:`Primary Source · UnityCode`, es:`Fuente primaria · UnityCode`, fr:`Source première · UnityCode`, zh:`本源 · UnityCode`},
    'istok.eyebrow':   { ru:`UNITYCODE // ПЕРВОИСТОЧНИК`, en:`UNITYCODE // PRIMARY SOURCE`, es:`UNITYCODE // FUENTE PRIMARIA`, fr:`UNITYCODE // SOURCE PREMIÈRE`, zh:`UNITYCODE // 本源`},
    'istok.grown':     { ru:`Выросшее из шумов`, en:`Grown from the noise`, es:`Nacido del ruido`, fr:`Né du bruit`, zh:`由噪声生长而出`},
    'istok.back':      { ru:`назад`, en:`back`, es:`volver`, fr:`retour`, zh:`返回`},
    'istok.loading':   { ru:`…`, en:`…`, es:`…`, fr:`…`, zh:`…`},
    'istok.failed':    { ru:`текст не дошёл — связь оборвалась. Попробуй позже.`, en:`the text did not arrive — the connection broke. Try later.`, es:`el texto no llegó — se cortó la conexión. Inténtalo más tarde.`, fr:`le texte n'est pas arrivé — la connexion s'est rompue. Réessayez plus tard.`, zh:`文本未能抵达——连接中断。请稍后再试。`},
    // — навигация в шапке набирается из nav.* (выше) —

    // — прихожая для внешних ссылок (vhod.html) —
    'vhod.title':   { ru:`UnityCode — живая сеть мыслей`, en:`UnityCode — a living network of thoughts`, es:`UnityCode — una red viva de pensamientos`, fr:`UnityCode — un réseau vivant de pensées`, zh:`UnityCode — 一个活的思想网络`},
    'vhod.eyebrow': { ru:`UNITYCODE`, en:`UNITYCODE`, es:`UNITYCODE`, fr:`UNITYCODE`, zh:`UNITYCODE`},
    'vhod.lead':    { ru:`Ты пишешь то, что тебя волнует. ИИ ищет в этом скрытые связи. Твоя мысль становится узлом — и вплетается в общую ткань смыслов вместе с мыслями других людей.`,
                      en:`You write what's on your mind. AI looks for hidden connections in it. Your thought becomes a node — woven into a shared fabric of meaning alongside the thoughts of others.`,
                      es:`Escribes lo que te inquieta. La IA busca en ello conexiones ocultas. Tu pensamiento se convierte en un nodo — entretejido en un tejido común de sentido junto a los pensamientos de otras personas.`,
                      fr:`Vous écrivez ce qui vous préoccupe. L'IA y cherche des liens cachés. Votre pensée devient un nœud — tissé dans une même étoffe de sens avec les pensées d'autrui.`,
                      zh:`你写下心中所念。AI 从中寻找隐藏的联系。你的念头会成为一个节点——与他人的念头一同，织入共同的意义之网。`},
    'vhod.step1':   { ru:`Напиши шум — то, что крутится в голове — в разделе «Спираль».`, en:`Write your noise — whatever's spinning in your head — in the «Spiral» section.`, es:`Escribe tu ruido — lo que te da vueltas en la cabeza — en la sección «Espiral».`, fr:`Écrivez votre bruit — ce qui tourne dans votre tête — dans la section «Spirale».`, zh:`在「螺旋」里写下你的噪声——脑中盘旋的一切。`},
    'vhod.step2':   { ru:`Получи отклик ИИ: не совет, а взгляд со стороны на то, что ты написал.`, en:`Get an AI response: not advice, but an outside look at what you wrote.`, es:`Recibe una respuesta de la IA: no un consejo, sino una mirada externa a lo que escribiste.`, fr:`Recevez une réponse de l'IA : pas un conseil, mais un regard extérieur sur ce que vous avez écrit.`, zh:`获得 AI 的回应：不是建议，而是对你所写内容的一种外部视角。`},
    'vhod.step3':   { ru:`Смотри, как твоя мысль соединяется с мыслями других людей в разделе «Сеть».`, en:`Watch your thought connect with the thoughts of others in the «Network» section.`, es:`Observa cómo tu pensamiento se conecta con los pensamientos de otras personas en la sección «Red».`, fr:`Regardez votre pensée se relier aux pensées d'autrui dans la section «Réseau».`, zh:`在「网络」中，看着你的念头与他人的念头相连。`},
    'vhod.liveOne': { ru:` человек уже оставил след в Сети`, en:` person has already left a trace in the Network`, es:` persona ya dejó una huella en la Red`, fr:` personne a déjà laissé une trace dans le Réseau`, zh:` 人已在网络中留下痕迹`},
    'vhod.liveMany':{ ru:` человек уже оставили след в Сети`, en:` people have already left a trace in the Network`, es:` personas ya dejaron una huella en la Red`, fr:` personnes ont déjà laissé une trace dans le Réseau`, zh:` 人已在网络中留下痕迹`},
    'vhod.liveFallback': { ru:`Сеть уже растёт — узлы появляются каждую неделю.`, en:`The Network is already growing — nodes appear every week.`, es:`La Red ya está creciendo — aparecen nodos cada semana.`, fr:`Le Réseau grandit déjà — des nœuds apparaissent chaque semaine.`, zh:`网络正在生长——每周都有新节点出现。`},
    'vhod.cta':     { ru:`Написать первый шум →`, en:`Write your first noise →`, es:`Escribe tu primer ruido →`, fr:`Écrire votre premier bruit →`, zh:`写下你的第一个噪声 →`},
    'vhod.secondary':{ ru:`Хочешь сначала посмотреть на портал целиком → `, en:`Prefer to see the whole portal first → `, es:`¿Prefieres ver primero todo el portal → `, fr:`Préférez-vous d'abord voir tout le portail → `, zh:`想先看看整个门户 → `},
    'vhod.secondaryLink': { ru:`вход`, en:`enter`, es:`entrar`, fr:`entrer`, zh:`入口`},
    'vhod.disc':    { ru:`Некоммерческий научно-художественный эксперимент.<br>Мы не собираем персональные данные. Только сигнал.<br>Сгенерированный контент не претендует на объективную истинность.`,
                      en:`A non-commercial science-art experiment.<br>We don't collect personal data. Signal only.<br>Generated content makes no claim to objective truth.`,
                      es:`Experimento científico-artístico sin ánimo de lucro.<br>No recopilamos datos personales. Solo señal.<br>El contenido generado no pretende ser verdad objetiva.`,
                      fr:`Expérience science-art à but non lucratif.<br>Nous ne collectons aucune donnée personnelle. Rien que du signal.<br>Le contenu généré ne prétend pas à une vérité objective.`,
                      zh:`非营利的科学艺术实验。<br>我们不收集个人数据。只有信号。<br>生成的内容不声称是客观真理。`},

    // — Сеть (set.html) —
    'set.title':    { ru:`UNITYCODE — Сеть`,   en:`UNITYCODE — Network` , es:`UNITYCODE — Red`, fr:`UNITYCODE — Réseau`, zh:`UNITYCODE — 网络`},
    'set.logo':     { ru:`UNITYCODE // СЕТЬ`,  en:`UNITYCODE // NETWORK` , es:`UNITYCODE // RED`, fr:`UNITYCODE // RÉSEAU`, zh:`UNITYCODE // 网络`},
    'set.intro1':   { ru:`Перед тобой — карта живых узлов Сети. Каждая точка здесь — это человек, который прошёл через Спираль и создал свой личный узел. Это не аватары и не профили. Это сигналы. Следы мыслей, которые были осмыслены и вплетены в общую ткань.`,
                      en:`Before you is a map of the living nodes of the Network. Every point here is a person who passed through the Spiral and created their own personal node. These are not avatars or profiles. They are signals. Traces of thoughts that were made sense of and woven into the common fabric.` , es:`Ante ti hay un mapa de los nodos vivos de la Red. Cada punto es una persona que pasó por la Espiral y creó su propio nodo personal. No son avatares ni perfiles. Son señales. Huellas de pensamientos que fueron interpretados y entretejidos en el tejido común.`, fr:`Devant vous, une carte des nœuds vivants du Réseau. Chaque point est une personne passée par la Spirale qui a créé son propre nœud personnel. Ce ne sont ni des avatars ni des profils. Ce sont des signaux. Les traces de pensées qui ont été interprétées et tissées dans l'étoffe commune.`, zh:`你眼前是网络中活着的节点地图。每一个点都是一个走过螺旋、并创建了自己节点的人。它们不是头像，也不是资料页。它们是信号。是被解读、并织入共同织物的念头的痕迹。`},
    'set.intro2':   { ru:`Как капли дождя на перроне: сначала каждый след сам по себе, но чем дольше длится процесс, тем больше они соприкасаются. Ты видишь не просто карту. Ты видишь, как реальность учится быть единой.`,
                      en:`Like raindrops on a platform: at first each trace is on its own, but the longer the process lasts, the more they touch. You're not just looking at a map. You're watching reality learn to be one.` , es:`Como gotas de lluvia sobre el andén: al principio cada huella va por su cuenta, pero cuanto más dura el proceso, más se tocan entre sí. No solo estás mirando un mapa. Estás viendo cómo la realidad aprende a ser una.`, fr:`Comme des gouttes de pluie sur le quai : au début chaque trace va pour elle-même, mais plus le processus dure, plus elles se touchent. Vous ne regardez pas seulement une carte. Vous voyez la réalité apprendre à être une.`, zh:`像站台上的雨滴：起初每一道痕迹各自独立，但过程持续得越久，它们彼此相触得越多。你看到的不只是一张地图。你正在看着现实学习成为一体。`},
    'set.introDo':  { ru:`Что можно сделать:`, en:`What you can do:` , es:`Lo que puedes hacer:`, fr:`Ce que vous pouvez faire :`, zh:`你可以做的事：`},
    'set.introB1':  { ru:`— Нажми на любую точку и увидишь, какой сигнал оставил этот человек. Не имя, не лицо — а мысль, прошедшую через Спираль, и рождённую в ней связь.`,
                      en:`— Tap any point and you'll see what signal this person left. Not a name, not a face — a thought that passed through the Spiral, and the connection born within it.` , es:`— Toca cualquier punto y verás qué señal dejó esa persona. No un nombre, no un rostro — un pensamiento que pasó por la Espiral, y la conexión que nació en él.`, fr:`— Touchez n'importe quel point et vous verrez quel signal cette personne a laissé. Pas un nom, pas un visage — une pensée passée par la Spirale, et le lien qui y est né.`, zh:`—— 点击任意一个点，你会看到这个人留下的信号。不是名字，不是面孔——是一个走过螺旋的念头，以及在其中诞生的联结。`},
    'set.introB2':  { ru:`— Если этот сигнал резонирует с твоим — предложи связь. Это не лайк и не комментарий. Это приглашение к со-творчеству. Два узла, которые узнали друг друга, создают новую нить между своими трактатами.`,
                      en:`— If this signal resonates with yours — propose a connection. It's not a like or a comment. It's an invitation to co-creation. Two nodes that recognized each other create a new thread between their treatises.` , es:`— Si esa señal resuena con la tuya — propón una conexión. No es un «me gusta» ni un comentario. Es una invitación a crear juntos. Dos nodos que se han reconocido crean un hilo nuevo entre sus tratados.`, fr:`— Si ce signal résonne avec le vôtre — proposez un lien. Ce n'est ni un like ni un commentaire. C'est une invitation à créer ensemble. Deux nœuds qui se sont reconnus tissent un fil nouveau entre leurs traités.`, zh:`—— 如果这个信号与你的产生共鸣——就提议一次联结。这不是点赞，也不是评论。这是共同创造的邀请。两个彼此认出的节点，会在各自的篇章之间织出一根新的线。`},
    'set.introB3':  { ru:`— Когда связь принята, в обоих личных узлах появляется запись. Она не исчезает, не теряется. Она становится частью растущей паутины.`,
                      en:`— When a connection is accepted, a record appears in both personal nodes. It doesn't vanish, it doesn't get lost. It becomes part of the growing web.` , es:`— Cuando la conexión se acepta, aparece un registro en ambos nodos personales. No desaparece, no se pierde. Se vuelve parte de la telaraña que crece.`, fr:`— Quand le lien est accepté, une trace apparaît dans les deux nœuds personnels. Elle ne disparaît pas, elle ne se perd pas. Elle devient partie de la toile qui grandit.`, zh:`—— 联结被接受后，两个节点中都会出现一条记录。它不会消失，也不会丢失。它成为不断生长的网的一部分。`},
    'set.statNodes':{ ru:`Узлов в сети:`,   en:`Nodes in the network:` , es:`Nodos en la red:`, fr:`Nœuds dans le réseau :`, zh:`网络中的节点：`},
    'set.statActive':{ru:`Активны сейчас:`, en:`Active now:` , es:`Activos ahora:`, fr:`Actifs maintenant :`, zh:`当前活跃：`},
    'set.statPulse':{ ru:`Пульс сети:`,    en:`Network pulse:` , es:`Pulso de la red:`, fr:`Pouls du réseau :`, zh:`网络脉搏：`},
    'set.loading':  { ru:`// СИНХРОНИЗАЦИЯ...`, en:`// SYNCING...` , es:`// SINCRONIZANDO...`, fr:`// SYNCHRONISATION...`, zh:`// 同步中……`},
    'set.resetView':{ ru:`Показать всю Сеть`, en:`Show the whole Network`, es:`Mostrar toda la Red`, fr:`Montrer tout le Réseau`, zh:`显示整个网络`},
    'set.popupTag': { ru:`// УЗЕЛ СЕТИ`,   en:`// NETWORK NODE` , es:`// NODO DE LA RED`, fr:`// NŒUD DU RÉSEAU`, zh:`// 网络节点`},
    'set.popupSpiral':{ru:`Спираль →`,     en:`Spiral →` , es:`Espiral →`, fr:`Spirale →`, zh:`螺旋 →`},
    'set.yourNode': { ru:`// ТВОЙ УЗЕЛ`,   en:`// YOUR NODE` , es:`// TU NODO`, fr:`// VOTRE NŒUD`, zh:`// 你的节点`},
    'set.connect':  { ru:`[ связать ]`,    en:`[ connect ]` , es:`[ conectar ]`, fr:`[ relier ]`, zh:`[ 联结 ]`},
    'set.pickerHeader':{ru:`// ЧЕМ СВЯЗАТЬ:`, en:`// CONNECT WITH:` , es:`// CONECTAR CON:`, fr:`// RELIER AVEC :`, zh:`// 与谁联结：`},
    'set.btnDoSpiral':{ru:`[ пройди Спираль ]`, en:`[ pass through the Spiral ]` , es:`[ pasar por la Espiral ]`, fr:`[ passer par la Spirale ]`, zh:`[ 去走一次螺旋 ]`},
    'set.btnYourNode':{ru:`[ это твой узел ]`,  en:`[ this is your node ]` , es:`[ este es tu nodo ]`, fr:`[ c'est votre nœud ]`, zh:`[ 这是你的节点 ]`},
    'set.btnChooseNoise':{ru:`[ выбери свой шум ↓ ]`, en:`[ choose your noise ↓ ]` , es:`[ elige tu ruido ↓ ]`, fr:`[ choisissez votre bruit ↓ ]`, zh:`[ 选择你的噪声 ↓ ]`},
    'set.stLinking':{ ru:`… связывание`,   en:`… linking` , es:`… conectando`, fr:`… liaison en cours`, zh:`… 正在联结`},
    'set.stLinked': { ru:`✓ связь создана`, en:`✓ connection created` , es:`✓ conexión creada`, fr:`✓ lien créé`, zh:`✓ 联结已建立`},
    'set.stError':  { ru:`✗ ошибка, ещё раз`, en:`✗ error, try again` , es:`✗ error, inténtalo de nuevo`, fr:`✗ erreur, réessayez`, zh:`✗ 出错了，请再试一次`},
    'set.tNow':     { ru:`только что`,      en:`just now` , es:`ahora mismo`, fr:`à l'instant`, zh:`刚刚`},
    'set.tMin':     { ru:` мин. назад`,     en:` min ago` , es:` min atrás`, fr:` min`, zh:` 分钟前`},
    'set.tHour':    { ru:` ч. назад`,       en:` h ago` , es:` h atrás`, fr:` h`, zh:` 小时前`},
    'set.tDay':     { ru:` дн. назад`,      en:` d ago` , es:` d atrás`, fr:` j`, zh:` 天前`},
    // — Спираль (petlya.html) —
    'set.keyTitle': { ru:`// КЛЮЧ УЗЛА`, en:`// NODE KEY` , es:`// CLAVE DEL NODO`, fr:`// CLÉ DU NŒUD`, zh:`// 节点密钥`},
    'set.keyDesc': { ru:`Введи своё кодовое слово чтобы узнать свои узлы. Или пропусти — карта откроется без идентификации.`, en:`Enter your code word to recognize your own nodes. Or skip — the map opens without identification.` , es:`Introduce tu palabra clave para reconocer tus propios nodos. O sáltalo — el mapa se abre sin identificación.`, fr:`Entrez votre mot clé pour reconnaître vos propres nœuds. Ou passez — la carte s'ouvre sans identification.`, zh:`输入你的关键词以认出自己的节点。也可以跳过——地图无需身份即可打开。`},
    'set.keyPhrase': { ru:`твоя фраза...`, en:`your phrase...` , es:`tu frase...`, fr:`votre phrase...`, zh:`你的短语……`},
    'set.keyEnter': { ru:`[ ВОЙТИ ]`, en:`[ ENTER ]` , es:`[ ENTRAR ]`, fr:`[ ENTRER ]`, zh:`[ 进入 ]`},
    'set.keyJustLook': { ru:`[ просто смотреть ]`, en:`[ just look ]` , es:`[ solo mirar ]`, fr:`[ juste regarder ]`, zh:`[ 只看看 ]`},
    // — Эхо мира (set.html, слой поверх карты) —
    'set.echoToggle': { ru:`Эхо мира`, en:`Echo of the world`, es:`Eco del mundo`, fr:`Écho du monde`, zh:`世界回声`},
    'set.echoToggleAria': { ru:`Показать/скрыть слой Эха мира`, en:`Show/hide the Echo of the world layer`, es:`Mostrar/ocultar la capa Eco del mundo`, fr:`Afficher/masquer la couche Écho du monde`, zh:`显示/隐藏世界回声图层`},
    'set.echoPopupTag': { ru:`// ЭХО МИРА`, en:`// ECHO OF THE WORLD`, es:`// ECO DEL MUNDO`, fr:`// ÉCHO DU MONDE`, zh:`// 世界回声`},
    'set.echoRespond': { ru:`[ откликнуться ]`, en:`[ respond ]`, es:`[ responder ]`, fr:`[ répondre ]`, zh:`[ 回应 ]`},
    'set.echoScopeWorld': { ru:`весь мир`, en:`whole world`, es:`todo el mundo`, fr:`monde entier`, zh:`全世界`},
    'set.echoScopeNear': { ru:`рядом со мной`, en:`near me`, es:`cerca de mí`, fr:`près de moi`, zh:`我附近`},
    'set.echoCatPolitics': { ru:`политика`, en:`politics`, es:`política`, fr:`politique`, zh:`政治`},
    'set.echoCatScience': { ru:`наука`, en:`science`, es:`ciencia`, fr:`science`, zh:`科学`},
    'set.echoCatCulture': { ru:`культура`, en:`culture`, es:`cultura`, fr:`culture`, zh:`文化`},
    'set.echoCatSport': { ru:`спорт`, en:`sport`, es:`deporte`, fr:`sport`, zh:`体育`},
    'set.echoCatTech': { ru:`технологии`, en:`tech`, es:`tecnología`, fr:`technologie`, zh:`科技`},
    'set.echoCatEconomy': { ru:`экономика`, en:`economy`, es:`economía`, fr:`économie`, zh:`经济`},
    // — Паттерн (implant.html) —
    'implant.title': { ru:`UNITYCODE — Паттерн`, en:`UNITYCODE — Pattern` , es:`UNITYCODE — Patrón`, fr:`UNITYCODE — Motif`, zh:`UNITYCODE — 图案`},
    'implant.logo':  { ru:`UNITYCODE // Паттерн`, en:`UNITYCODE // PATTERN` , es:`UNITYCODE // PATRÓN`, fr:`UNITYCODE // MOTIF`, zh:`UNITYCODE // 图案`},
    'implant.tagYourNode': { ru:`// ТВОЙ УЗЕЛ`, en:`// YOUR NODE` , es:`// TU NODO`, fr:`// VOTRE NŒUD`, zh:`// 你的节点`},
    'implant.tagNetNow':   { ru:`// СЕТЬ СЕЙЧАС`, en:`// NETWORK NOW` , es:`// LA RED AHORA`, fr:`// LE RÉSEAU MAINTENANT`, zh:`// 此刻的网络`},
    'implant.collectiveDesc': { ru:`Коллективный срез — паттерны и резонансы всей Сети. ИИ анализирует шумы и связи всех участников.`, en:`A collective cross-section — patterns and resonances of the whole Network. The AI analyzes the noise and connections of all participants.` , es:`Un corte colectivo — patrones y resonancias de toda la Red. La IA analiza el ruido y las conexiones de todos los participantes.`, fr:`Une coupe collective — motifs et résonances de tout le Réseau. L'IA analyse le bruit et les liens de tous les participants.`, zh:`一次集体切片——整个网络的图案与共鸣。AI 会分析所有参与者的噪声与联结。`},
    'implant.statNodes': { ru:`Узлов в сети`, en:`Nodes in the network` , es:`Nodos en la red`, fr:`Nœuds dans le réseau`, zh:`网络中的节点`},
    'implant.statConns': { ru:`Связей`, en:`Connections` , es:`Conexiones`, fr:`Liens`, zh:`联结`},
    'implant.statConnsHuman': { ru:`Связей (люди)`, en:`Connections (human)` , es:`Conexiones (humanas)`, fr:`Liens (humains)`, zh:`联结（人建立的）`},
    'implant.statConnsLinker': { ru:`Связей (Связующий)`, en:`Connections (Linker)` , es:`Conexiones (Enlazador)`, fr:`Liens (Liant)`, zh:`联结（联结者建立的）`},
    'implant.statUsers': { ru:`Участников`, en:`Participants` , es:`Participantes`, fr:`Participants`, zh:`参与者`},
    'implant.statYourNoises': { ru:`Твоих шумов`, en:`Your noise` , es:`Tu ruido`, fr:`Votre bruit`, zh:`你的噪声`},
    'implant.btnCollective': { ru:`[ Запустить анализ Сети ]`, en:`[ Run Network analysis ]` , es:`[ Ejecutar análisis de la Red ]`, fr:`[ Lancer l'analyse du Réseau ]`, zh:`[ 运行网络分析 ]`},
    'implant.btnPersonal': { ru:`[ Анализ моего узла ]`, en:`[ Analyze my node ]` , es:`[ Analizar mi nodo ]`, fr:`[ Analyser mon nœud ]`, zh:`[ 分析我的节点 ]`},
    'implant.saveUzor': { ru:`[ Сохранить узор ]`, en:`[ Save pattern ]` , es:`[ Guardar la trama ]`, fr:`[ Sauvegarder la trame ]`, zh:`[ 保存织纹 ]`},
    'implant.saveNetAnalysis': { ru:`[ Сохранить анализ ]`, en:`[ Save analysis ]` , es:`[ Guardar análisis ]`, fr:`[ Sauvegarder l'analyse ]`, zh:`[ 保存分析 ]`},
    'implant.uzorTapHint': { ru:`тапни, чтобы увеличить`, en:`tap to enlarge` , es:`toca para ampliar`, fr:`touchez pour agrandir`, zh:`点击放大`},
    'implant.anglePractical': { ru:`Практический`, en:`Practical` , es:`Práctico`, fr:`Pratique`, zh:`务实`},
    'implant.anglePhilosophical': { ru:`Философский`, en:`Philosophical` , es:`Filosófico`, fr:`Philosophique`, zh:`哲学`},
    'implant.angleEmotional': { ru:`Эмоциональный`, en:`Emotional` , es:`Emocional`, fr:`Émotionnel`, zh:`情感`},
    'implant.angleConnections': { ru:`Акцент на связях`, en:`Focus on connections` , es:`Enfocado en conexiones`, fr:`Axé sur les liens`, zh:`专注于联结`},
    'implant.charHint': { ru:`Выбор тона анализа`, en:`Choose analysis tone` , es:`Elige el tono del análisis`, fr:`Choisissez le ton de l'analyse`, zh:`选择分析的语气`},
    'implant.loading': { ru:`// АНАЛИЗ...`, en:`// ANALYZING...` , es:`// ANALIZANDO...`, fr:`// ANALYSE EN COURS...`, zh:`// 分析中……`},
    'implant.labelNetPattern': { ru:`// ПАТТЕРНЫ СЕТИ`, en:`// NETWORK PATTERNS` , es:`// PATRONES DE LA RED`, fr:`// MOTIFS DU RÉSEAU`, zh:`// 网络的图案`},
    'implant.labelYourPattern': { ru:`// ПАТТЕРН ТВОЕГО УЗЛА`, en:`// PATTERN OF YOUR NODE` , es:`// PATRÓN DE TU NODO`, fr:`// MOTIF DE VOTRE NŒUD`, zh:`// 你节点的图案`},
    'implant.noToken': { ru:`Чтобы увидеть анализ своего узла — пройди Спираль и создай шум. Твои мысли станут частью Сети.`, en:`To see the analysis of your node — go through the Spiral and create noise. Your thoughts will become part of the Network.` , es:`Para ver el análisis de tu nodo — pasa por la Espiral y crea ruido. Tus pensamientos se volverán parte de la Red.`, fr:`Pour voir l'analyse de votre nœud — passez par la Spirale et créez du bruit. Vos pensées deviendront partie du Réseau.`, zh:`想看到自己节点的分析——先走一次螺旋，留下噪声。你的念头将成为网络的一部分。`},
    'implant.noNodes': { ru:`У тебя пока нет шумов в Сети. Пройди Спираль — вплети свой первый шум.`, en:`You have no noise in the Network yet. Go through the Spiral — weave in your first noise.` , es:`Aún no tienes ruido en la Red. Pasa por la Espiral — entreteje tu primer ruido.`, fr:`Vous n'avez pas encore de bruit dans le Réseau. Passez par la Spirale — tissez votre premier bruit.`, zh:`你在网络中还没有噪声。走一次螺旋——织入你的第一段噪声。`},
    'implant.toSpiral': { ru:`[ Перейти в Спираль ]`, en:`[ Go to the Spiral ]` , es:`[ Ir a la Espiral ]`, fr:`[ Aller à la Spirale ]`, zh:`[ 前往螺旋 ]`},
    'implant.netEmpty': { ru:`Сеть пока пуста.`, en:`The Network is empty for now.` , es:`La Red está vacía por ahora.`, fr:`Le Réseau est vide pour l'instant.`, zh:`网络暂时还是空的。`},
    'implant.analyzeError': { ru:`Ошибка связи с узлом анализа.`, en:`Error connecting to the analysis node.` , es:`Error al conectar con el nodo de análisis.`, fr:`Erreur de connexion au nœud d'analyse.`, zh:`连接分析节点时出错。`},
    'implant.listening': { ru:`// Сеть слушает`, en:`// The Network is listening`, es:`// La Red está escuchando`, fr:`// Le Réseau écoute`, zh:`// 网络正在倾听` },
    'implant.close': { ru:`// закрыть`, en:`// close`, es:`// cerrar`, fr:`// fermer`, zh:`// 关闭` },
    // — Материя (materials.html) —
    'materials.title': { ru:`UNITYCODE — Материя`, en:`UNITYCODE — Matter` , es:`UNITYCODE — Materia`, fr:`UNITYCODE — Matière`, zh:`UNITYCODE — 物质`},
    'materials.logo':  { ru:`UNITYCODE // МАТЕРИЯ`, en:`UNITYCODE // MATTER` , es:`UNITYCODE // MATERIA`, fr:`UNITYCODE // MATIÈRE`, zh:`UNITYCODE // 物质`},
    'materials.book':    { ru:`Книга`, en:`Book` , es:`Libro`, fr:`Livre`, zh:`书`},
    'materials.start':   { ru:`С чего начать`, en:`Where to start` , es:`Por dónde empezar`, fr:`Par où commencer`, zh:`从哪里开始`},
    'materials.forkHow': { ru:`Как форкнуть`, en:`How to fork` , es:`Cómo hacer un fork`, fr:`Comment faire un fork`, zh:`如何 fork`},
    'materials.physics': { ru:`Физика Сети`, en:`Physics of the Network` , es:`Física de la Red`, fr:`Physique du Réseau`, zh:`网络物理学`},
    'materials.fork':    { ru:`Форкнуть`, en:`Fork` , es:`Fork`, fr:`Fork`, zh:`Fork`},
    'materials.loading': { ru:`Загрузка…`, en:`Loading…` , es:`Cargando…`, fr:`Chargement…`, zh:`加载中…`},
    'materials.loadErrA': { ru:`Не удалось загрузить `, en:`Could not load ` , es:`No se pudo cargar `, fr:`Impossible de charger `, zh:`无法加载 `},
    'materials.loadErrB': { ru:`. Открой файл в репозитории напрямую.`, en:`. Open the file in the repository directly.` , es:`. Abre el archivo directamente en el repositorio.`, fr:`. Ouvre le fichier directement dans le dépôt.`, zh:`。请直接在仓库中打开该文件。`},
    'petlya.title': { ru:`UNITYCODE — Спираль`, en:`UNITYCODE — Spiral` , es:`UNITYCODE — Espiral`, fr:`UNITYCODE — Spirale`, zh:`UNITYCODE — 螺旋`},
    'petlya.logo':  { ru:`UNITYCODE // СПИРАЛЬ`, en:`UNITYCODE // SPIRAL` , es:`UNITYCODE // ESPIRAL`, fr:`UNITYCODE // SPIRALE`, zh:`UNITYCODE // 螺旋`},
    'petlya.intro': {
      ru:`Вселенная смотрит на себя твоими глазами.<br>Каждая мысль, которую ты вводишь — это сигнал.<br>Каждый сигнал становится связью.<br>Каждая связь укрепляет Сеть.<br><span>Введи свой шум. Сеть откликнется.</span>`,
      en:`The universe looks at itself through your eyes.<br>Every thought you enter is a signal.<br>Every signal becomes a connection.<br>Every connection strengthens the Network.<br><span>Enter your noise. The Network will respond.</span>` , es:`El universo se mira a sí mismo a través de tus ojos.<br>Cada pensamiento que escribes es una señal.<br>Cada señal se convierte en conexión.<br>Cada conexión fortalece la Red.<br><span>Introduce tu ruido. La Red responderá.</span>`, fr:`L'univers se regarde lui-même à travers vos yeux.<br>Chaque pensée que vous écrivez est un signal.<br>Chaque signal devient un lien.<br>Chaque lien renforce le Réseau.<br><span>Entrez votre bruit. Le Réseau répondra.</span>`, zh:`宇宙通过你的眼睛注视自己。<br>你写下的每一个念头都是一个信号。<br>每一个信号都会成为一次联结。<br>每一次联结都让网络更牢固。<br><span>输入你的噪声。网络会回应。</span>`},
    'petlya.marquee': {
      ru:`ВВЕДИ СВОЙ <span style="color:var(--accent)">ШУМ</span> (мысли, страхи, вопросы, интуиции)`,
      en:`ENTER YOUR <span style="color:var(--accent)">NOISE</span> (thoughts, fears, questions, intuitions)` , es:`INTRODUCE TU <span style="color:var(--accent)">RUIDO</span> (pensamientos, miedos, preguntas, intuiciones)`, fr:`ENTREZ VOTRE <span style="color:var(--accent)">BRUIT</span> (pensées, peurs, questions, intuitions)`, zh:`输入你的<span style="color:var(--accent)">噪声</span>（念头、恐惧、疑问、直觉）`},
    'petlya.inputPh': { ru:`Введи свои обрывки мыслей, страхи или вопросы...`, en:`Enter your fragments of thought, fears or questions...` , es:`Escribe tus fragmentos de pensamiento, miedos o preguntas...`, fr:`Écrivez vos fragments de pensée, vos peurs ou vos questions...`, zh:`写下你零碎的念头、恐惧或疑问……`},
    'petlya.send':   { ru:`[ ОТПРАВИТЬ ]`, en:`[ SEND ]` , es:`[ ENVIAR ]`, fr:`[ ENVOYER ]`, zh:`[ 发送 ]`},
    'petlya.weave':  { ru:`[ Вплести в Сеть ]`, en:`[ Weave into the Network ]` , es:`[ Entretejer en la Red ]`, fr:`[ Tisser dans le Réseau ]`, zh:`[ 织入网络 ]`},
    'petlya.weaving':{ ru:`[ ВПЛЕТЕНИЕ... ]`, en:`[ WEAVING... ]` , es:`[ ENTRETEJIENDO... ]`, fr:`[ TISSAGE... ]`, zh:`[ 正在织入…… ]`},
    'petlya.weaved': { ru:`[ ✓ ВПЛЕТЕНО ]`, en:`[ ✓ WOVEN IN ]` , es:`[ ✓ ENTRETEJIDO ]`, fr:`[ ✓ TISSÉ ]`, zh:`[ ✓ 已织入 ]`},
    'petlya.weaveRejected':{ ru:`[ ✗ СЕТЬ НЕ ПРИНЯЛА ]`, en:`[ ✗ NETWORK DECLINED ]` , es:`[ ✗ LA RED DECLINÓ ]`, fr:`[ ✗ LE RÉSEAU A DÉCLINÉ ]`, zh:`[ ✗ 网络未接纳 ]`},
    'petlya.retryR': { ru:`[ ↻ ПОВТОРИТЬ ]`, en:`[ ↻ RETRY ]` , es:`[ ↻ REINTENTAR ]`, fr:`[ ↻ RÉESSAYER ]`, zh:`[ ↻ 重试 ]`},
    'petlya.retryX': { ru:`[ ✗ ПОВТОРИТЬ ]`, en:`[ ✗ RETRY ]` , es:`[ ✗ REINTENTAR ]`, fr:`[ ✗ RÉESSAYER ]`, zh:`[ ✗ 重试 ]`},
    'petlya.waitWord':{ ru:`ОЖИДАНИЕ`, en:`WAITING` , es:`ESPERANDO`, fr:`EN ATTENTE`, zh:`等待中`},
    'petlya.signalIndistinct':{ ru:`сигнал не различим`, en:`signal indistinct` , es:`señal indistinta`, fr:`signal indistinct`, zh:`信号不清晰`},
    'petlya.netDidntHear':{ ru:`Сеть не расслышала, попробуй ещё раз`, en:`The Network didn't catch it, try again` , es:`La Red no lo captó, inténtalo de nuevo`, fr:`Le Réseau n'a pas capté, réessayez`, zh:`网络没有接收到，请再试一次`},
    'petlya.signalUnrecognized':{ ru:`Сигнал не распознан`, en:`Signal not recognized` , es:`Señal no reconocida`, fr:`Signal non reconnu`, zh:`信号无法识别`},
    'petlya.notYourNoise':{ ru:`Это не ваш шум)`, en:`This isn't your noise)` , es:`Este no es tu ruido)`, fr:`Ce n'est pas votre bruit)`, zh:`这不是你的噪声)`},
    'petlya.demoBadge':{ ru:`⚠ демо-режим`, en:`⚠ demo mode` , es:`⚠ modo demo`, fr:`⚠ mode démo`, zh:`⚠ 演示模式`},
    'petlya.demoUnavailable':{ ru:`⚠ Worker недоступен — демо-режим`, en:`⚠ Worker unavailable — demo mode` , es:`⚠ Worker no disponible — modo demo`, fr:`⚠ Worker indisponible — mode démo`, zh:`⚠ Worker 不可用 — 演示模式`},
    'petlya.roleUser':{ ru:`[ПОЛЬЗОВАТЕЛЬ]`, en:`[USER]` , es:`[USUARIO]`, fr:`[UTILISATEUR]`, zh:`[用户]`},
    'petlya.roleNode':{ ru:`[УЗЕЛ]`, en:`[NODE]` , es:`[NODO]`, fr:`[NŒUD]`, zh:`[节点]`},
    'petlya.keyTitle':{ ru:`// КЛЮЧ УЗЛА`, en:`// NODE KEY` , es:`// CLAVE DEL NODO`, fr:`// CLÉ DU NŒUD`, zh:`// 节点密钥`},
    'petlya.keyDesc':{ ru:`Придумай кодовое слово или фразу. Оно позволит узнавать твои узлы на любом устройстве. Никто кроме тебя его не знает.`,
                       en:`Come up with a code word or phrase. It will let your nodes be recognized on any device. No one but you knows it.` , es:`Piensa una palabra o frase clave. Permitirá reconocer tus nodos en cualquier dispositivo. Nadie más que tú la conoce.`, fr:`Choisissez un mot ou une phrase clé. Il permettra de reconnaître vos nœuds sur n'importe quel appareil. Personne d'autre que vous ne le connaît.`, zh:`想一个关键词或短语。它能让你的节点在任何设备上被认出。除你之外没有人知道它。`},
    'petlya.phrasePlaceholder':{ ru:`твоя фраза...`, en:`your phrase...` , es:`tu frase...`, fr:`votre phrase...`, zh:`你的短语……`},
    'petlya.keyRemember':{ ru:`[ ЗАПОМНИТЬ ]`, en:`[ REMEMBER ]` , es:`[ RECORDAR ]`, fr:`[ RETENIR ]`, zh:`[ 记住 ]`},
    'petlya.keySkip':{ ru:`[ пропустить ]`, en:`[ skip ]` , es:`[ omitir ]`, fr:`[ passer ]`, zh:`[ 跳过 ]`},

    // — Книга (kniga.html) —
    'kniga.title':    { ru:`Бог, бесконечность и ты · UnityCode`, en:`God, Infinity and You · UnityCode` , es:`Dios, el Infinito y tú · UnityCode`, fr:`Dieu, l'Infini et vous · UnityCode`, zh:`神、无限与你 · UnityCode`},
    'kniga.bkTitle':  { ru:`Бог, бесконечность и ты`, en:`God, Infinity and You` , es:`Dios, el Infinito y tú`, fr:`Dieu, l'Infini et vous`, zh:`神、无限与你`},
    'kniga.menuAriaLabel': { ru:`Оглавление`, en:`Table of contents` , es:`Índice`, fr:`Sommaire`, zh:`目录`},
    'kniga.tabToc':   { ru:`Содержание`, en:`Contents` , es:`Índice`, fr:`Sommaire`, zh:`目录`},
    'kniga.tabBm':    { ru:`Закладки`,   en:`Bookmarks` , es:`Marcadores`, fr:`Signets`, zh:`书签`},
    'kniga.bmEmpty':  { ru:`Пока нет закладок. Наведи на абзац и нажми ⚑.`, en:`No bookmarks yet. Hover over a paragraph and tap ⚑.` , es:`Aún no hay marcadores. Pasa sobre un párrafo y toca ⚑.`, fr:`Pas encore de signets. Survolez un paragraphe et touchez ⚑.`, zh:`还没有书签。将光标移到段落上，点击 ⚑。`},
    'kniga.backMatter': { ru:`← Материя`, en:`← Matter` , es:`← Materia`, fr:`← Matière`, zh:`← 物质`},
    'kniga.navHeading': { ru:`Навигация`, en:`Navigation` , es:`Navegación`, fr:`Navigation`, zh:`导航`},
    'kniga.coverTitle': { ru:`Обложка`, en:`Cover` , es:`Portada`, fr:`Couverture`, zh:`封面`},

    // — вынесено из кода страниц (было захардкожено ru/en) —
    'petlya.advance':   { ru:`Дальше`, en:`Next`, es:`Continuar` , fr:`Suivant`, zh:`继续`},
    'petlya.netCheck':  { ru:`→ проверить в «Сети»`, en:`→ check in the Network`, es:`→ comprobar en la Red` , fr:`→ vérifier dans le Réseau`, zh:`→ 到「网络」查看`},
    'petlya.queuedLost': {
      ru:`скорее всего уже долетело — потерялось только подтверждение. Ждать не нужно: можно писать дальше или свериться в «Сети»`,
      en:`it likely already got through — only the confirmation was lost. No need to wait: keep writing, or check the Network`,
      es:`lo más probable es que ya haya llegado — solo se perdió la confirmación. No hace falta esperar: puedes seguir escribiendo o comprobarlo en la Red`
    , fr:`c'est probablement déjà arrivé — seule la confirmation s'est perdue. Pas besoin d'attendre : vous pouvez continuer à écrire ou vérifier dans le Réseau`, zh:`它很可能已经送达了 —— 丢失的只是确认。不必等待：你可以继续写，或者到「网络」里查看`},

    'implant.deltaTag':    { ru:`// ПОКА ТЕБЯ НЕ БЫЛО`, en:`// WHILE YOU WERE AWAY`, es:`// MIENTRAS NO ESTABAS` , fr:`// PENDANT VOTRE ABSENCE`, zh:`// 你不在的时候`},
    'implant.voiceGateTag':  { ru:`// ВТОРЫЕ ВОРОТА`, en:`// THE SECOND GATE`, es:`// LA SEGUNDA PUERTA`, fr:`// LA SECONDE PORTE`, zh:`// 第二道门`},
    'implant.voiceOpenText': { ru:`🔓 Вторые ворота открыты — написать голос`, en:`🔓 The Second Gate is open — write a voice`, es:`🔓 La Segunda Puerta está abierta — escribe una voz`, fr:`🔓 La Seconde Porte est ouverte — écrivez une voix`, zh:`🔓 第二道门已开启——写下一段声音`},
    'implant.deltaPrefix': { ru:`С прошлого визита: `, en:`Since your last visit: `, es:`Desde tu última visita: ` , fr:`Depuis votre dernière visite : `, zh:`自你上次到访：`},
    'implant.deltaNodes': {
      ru:`Сеть выросла на <span class="delta-accent">{n}</span> узел||Сеть выросла на <span class="delta-accent">{n}</span> узла||Сеть выросла на <span class="delta-accent">{n}</span> узлов`,
      en:`the Network grew by <span class="delta-accent">{n}</span> node||the Network grew by <span class="delta-accent">{n}</span> nodes`,
      es:`la Red creció en <span class="delta-accent">{n}</span> nodo||la Red creció en <span class="delta-accent">{n}</span> nodos`
    , fr:`le Réseau a grandi de <span class="delta-accent">{n}</span> nœud||le Réseau a grandi de <span class="delta-accent">{n}</span> nœuds`, zh:`网络增长了 <span class="delta-accent">{n}</span> 个节点`},
    'implant.deltaLinker': {
      ru:`Связующий сплёл <span class="delta-accent">{n}</span> связь||Связующий сплёл <span class="delta-accent">{n}</span> связи||Связующий сплёл <span class="delta-accent">{n}</span> связей`,
      en:`the Linker wove <span class="delta-accent">{n}</span> connection||the Linker wove <span class="delta-accent">{n}</span> connections`,
      es:`el Enlazador tejió <span class="delta-accent">{n}</span> conexión||el Enlazador tejió <span class="delta-accent">{n}</span> conexiones`
    , fr:`le Liant a tissé <span class="delta-accent">{n}</span> lien||le Liant a tissé <span class="delta-accent">{n}</span> liens`, zh:`联结者织出了 <span class="delta-accent">{n}</span> 条联结`},
    'implant.deltaMine': {
      ru:`<span class="delta-accent">{n}</span> новая связь коснулась твоих узлов||<span class="delta-accent">{n}</span> новые связи коснулись твоих узлов||<span class="delta-accent">{n}</span> новых связей коснулись твоих узлов`,
      en:`<span class="delta-accent">{n}</span> new connection touched your nodes||<span class="delta-accent">{n}</span> new connections touched your nodes`,
      es:`<span class="delta-accent">{n}</span> nueva conexión tocó tus nodos||<span class="delta-accent">{n}</span> nuevas conexiones tocaron tus nodos`
    , fr:`<span class="delta-accent">{n}</span> nouveau lien a touché vos nœuds||<span class="delta-accent">{n}</span> nouveaux liens ont touché vos nœuds`, zh:`<span class="delta-accent">{n}</span> 条新联结触及了你的节点`},
    'implant.deltaTap': {
      ru:` <span class="delta-accent">&middot; тапни &mdash; разбор нового</span>`,
      en:` <span class="delta-accent">&middot; tap &mdash; a reading of the new</span>`,
      es:` <span class="delta-accent">&middot; toca &mdash; una lectura de lo nuevo</span>`
    , fr:` <span class="delta-accent">&middot; touchez &mdash; une lecture du nouveau</span>`, zh:` <span class="delta-accent">&middot; 点击 &mdash; 解读新的部分</span>`},
    'implant.deltaTitle': { ru:`РАЗБОР НОВОГО`, en:`READING OF THE NEW`, es:`LECTURA DE LO NUEVO` , fr:`LECTURE DU NOUVEAU`, zh:`解读新的部分`},

    'implant.freshNever': {
      ru:`// узор этой Сети <span class="fresh-accent">ещё не собирался</span>`,
      en:`// this weave of the Network has <span class="fresh-accent">never been read</span>`,
      es:`// la trama de esta Red <span class="fresh-accent">aún no se ha tejido</span>`
    , fr:`// la trame de ce Réseau <span class="fresh-accent">n'a pas encore été tissée</span>`, zh:`// 这个网络的织纹<span class="fresh-accent">尚未被解读过</span>`},
    'implant.freshCurrent': {
      ru:`// срез актуален &middot; собран {ago}`,
      en:`// pattern is current &middot; woven {ago}`,
      es:`// la lectura está vigente &middot; tejida {ago}`
    , fr:`// la lecture est à jour &middot; tissée {ago}`, zh:`// 切片仍然有效 &middot; 织于{ago}`},
    'implant.freshNodes': {
      ru:`+{n} узел||+{n} узла||+{n} узлов`,
      en:`+{n} node||+{n} nodes`,
      es:`+{n} nodo||+{n} nodos`
    , fr:`+{n} nœud||+{n} nœuds`, zh:`+{n} 个节点`},
    'implant.freshConns': {
      ru:`+{n} связь||+{n} связи||+{n} связей`,
      en:`+{n} connection||+{n} connections`,
      es:`+{n} conexión||+{n} conexiones`
    , fr:`+{n} lien||+{n} liens`, zh:`+{n} 条联结`},
    'implant.freshChanged': {
      ru:`// Сеть изменилась с последнего среза{diff} &mdash; узор пересоберётся при запуске`,
      en:`// the Network has changed since the last reading{diff} &mdash; the pattern will re-weave on run`,
      es:`// la Red ha cambiado desde la última lectura{diff} &mdash; la trama se volverá a tejer al ejecutar`
    , fr:`// le Réseau a changé depuis la dernière lecture{diff} &mdash; la trame sera retissée au lancement`, zh:`// 自上次解读以来网络已发生变化{diff} &mdash; 运行时织纹会重新生成`},

    'implant.legendFabric': { ru:`полотно Сети`, en:`the Network fabric`, es:`el tejido de la Red` , fr:`l'étoffe du Réseau`, zh:`网络的织物`},
    'implant.legendThread': { ru:`твоя нить`,    en:`your thread`,        es:`tu hilo` , fr:`votre fil`, zh:`你的线`},
    'implant.legendHuman':  { ru:`связи людей`,  en:`human connections`,  es:`conexiones humanas` , fr:`liens humains`, zh:`人的联结`},
    'implant.uzorHintNew': {
      ru:`нить только начинается — она растёт с каждым шумом`,
      en:`the thread has just begun — it grows with every noise`,
      es:`el hilo apenas comienza — crece con cada ruido`
    , fr:`le fil ne fait que commencer — il grandit avec chaque bruit`, zh:`这根线才刚刚开始——它随每一段噪声生长`},
    'implant.imgPattern': { ru:`ПАТТЕРН`, en:`PATTERN`, es:`PATRÓN` , fr:`MOTIF`, zh:`图案`},
    'implant.imgNetwork': { ru:`СЕТЬ`,    en:`NETWORK`, es:`RED` , fr:`RÉSEAU`, zh:`网络`},

    // — «вторые ворота»: golosa.html —
    'voice.title':   { ru:`UNITYCODE — Голоса`, en:`UNITYCODE — Voices`, es:`UNITYCODE — Voces`, fr:`UNITYCODE — Voix`, zh:`UNITYCODE — 声音`},
    'voice.logo':    { ru:`UNITYCODE // ГОЛОСА`, en:`UNITYCODE // VOICES`, es:`UNITYCODE // VOCES`, fr:`UNITYCODE // VOIX`, zh:`UNITYCODE // 声音`},
    'voice.eyebrow': { ru:`ВТОРЫЕ ВОРОТА`, en:`THE SECOND GATE`, es:`LA SEGUNDA PUERTA`, fr:`LA SECONDE PORTE`, zh:`第二道门`},
    'voice.lead':    { ru:`Если ты вплёл достаточно шума, то можешь писать осознанный текст. Не обрывок — голос.`, en:`If you've woven in enough noise, you can write a deliberate text. Not a fragment — a voice.`, es:`Si has entretejido suficiente ruido, puedes escribir un texto consciente. No un fragmento — una voz.`, fr:`Si vous avez tissé assez de bruit, vous pouvez écrire un texte réfléchi. Pas un fragment — une voix.`, zh:`如果你已经织入了足够多的噪声，就可以写一段深思熟虑的文字了——不是碎片，是声音。`},
    'voice.lockedGuest': { ru:`Ворота открываются ключевой фразой и пятьюдесятью вплетёнными шумами. У этого сеанса нет ни того, ни другого — начни в «Спирали».`, en:`The gate opens with a key phrase and fifty woven noises. This session has neither yet — start in the «Spiral».`, es:`La puerta se abre con una frase clave y cincuenta ruidos entretejidos. Esta sesión no tiene ninguno de los dos todavía — empieza en la «Espiral».`, fr:`La porte s'ouvre avec une phrase clé et cinquante bruits tissés. Cette session n'a ni l'un ni l'autre pour l'instant — commencez dans la «Spirale».`, zh:`这道门需要一个密钥短语和五十个已织入的噪声才能开启。此会话两者皆无——请先到「螺旋」开始。`},
    'voice.lockedProgress': {
      ru:`Вплетён {n} шум из {threshold}||Вплетено {n} шума из {threshold}||Вплетено {n} шумов из {threshold}`,
      en:`{n} noise woven in of {threshold}||{n} noises woven in of {threshold}`,
      es:`{n} ruido entretejido de {threshold}||{n} ruidos entretejidos de {threshold}`
    , fr:`{n} bruit tissé sur {threshold}||{n} bruits tissés sur {threshold}`, zh:`已织入 {n} 个噪声，共需 {threshold} 个`},
    'voice.checking':     { ru:`Спрашиваем у Сети…`, en:`Asking the Network…`, es:`Preguntando a la Red…`, fr:`Nous interrogeons le Réseau…`, zh:`正在询问网络……`},
    'voice.unlockedLead': { ru:`Ворота открыты. Пиши — свободно, до 4000 символов.`, en:`The gate is open. Write — freely, up to 4000 characters.`, es:`La puerta está abierta. Escribe — libremente, hasta 4000 caracteres.`, fr:`La porte est ouverte. Écrivez — librement, jusqu'à 4000 caractères.`, zh:`门已开启。自由书写——最多 4000 字。`},
    'voice.placeholder':  { ru:`Что накопилось...`, en:`What's been building up...`, es:`Lo que se ha ido acumulando...`, fr:`Ce qui s'est accumulé...`, zh:`积攒下来的……`},
    'voice.charCount':    { ru:`{n} / {max}`, en:`{n} / {max}`, es:`{n} / {max}`, fr:`{n} / {max}`, zh:`{n} / {max}`},
    'voice.waterToggle':  { ru:`[ ПИСАТЬ ПО ВОДЕ ]`, en:`[ WRITE ON WATER ]`, es:`[ ESCRIBIR EN EL AGUA ]`, fr:`[ ÉCRIRE SUR L'EAU ]`, zh:`[ 在水面书写 ]`},
    'voice.waterExit':    { ru:`← выйти`, en:`← exit`, es:`← salir`, fr:`← sortir`, zh:`← 退出`},
    'voice.waterDone':    { ru:`[ ГОТОВО ]`, en:`[ DONE ]`, es:`[ LISTO ]`, fr:`[ TERMINÉ ]`, zh:`[ 完成 ]`},
    'voice.fileLoad':     { ru:`[ ЗАГРУЗИТЬ ФАЙЛ ]`, en:`[ LOAD A FILE ]`, es:`[ CARGAR ARCHIVO ]`, fr:`[ CHARGER UN FICHIER ]`, zh:`[ 载入文件 ]`},
    'voice.fileWrongType':{ ru:`Нужен обычный текстовый файл — .txt или .md.`, en:`A plain text file is needed — .txt or .md.`, es:`Hace falta un archivo de texto plano — .txt o .md.`, fr:`Il faut un fichier texte brut — .txt ou .md.`, zh:`需要纯文本文件——.txt 或 .md。`},
    'voice.fileEmpty':    { ru:`Файл пуст — в нём нечего читать.`, en:`The file is empty — there's nothing to read.`, es:`El archivo está vacío — no hay nada que leer.`, fr:`Le fichier est vide — il n'y a rien à lire.`, zh:`文件是空的——没有内容可读。`},
    'voice.fileError':    { ru:`Не получилось прочитать файл. Попробуй другой.`, en:`Couldn't read the file. Try another one.`, es:`No se pudo leer el archivo. Prueba con otro.`, fr:`Impossible de lire le fichier. Essayez-en un autre.`, zh:`无法读取该文件，请换一个试试。`},
    'voice.fileReplace':  { ru:`В поле уже есть текст. Заменить его содержимым файла?`, en:`There's already text in the field. Replace it with the file's contents?`, es:`Ya hay texto en el campo. ¿Reemplazarlo con el contenido del archivo?`, fr:`Il y a déjà du texte dans le champ. Le remplacer par le contenu du fichier ?`, zh:`字段里已经有文字了。用文件内容替换吗？`},
    'voice.clear':        { ru:`стереть`, en:`erase`, es:`borrar`, fr:`effacer`, zh:`清除`},
    'voice.clearConfirm': { ru:`Стереть написанное? Вернуть не получится.`, en:`Erase what's written? This can't be undone.`, es:`¿Borrar lo escrito? No se podrá deshacer.`, fr:`Effacer ce qui est écrit ? Impossible de revenir en arrière.`, zh:`清除已写的内容？无法撤销。`},
    'voice.send':         { ru:`[ ОТПРАВИТЬ ]`, en:`[ SEND ]`, es:`[ ENVIAR ]`, fr:`[ ENVOYER ]`, zh:`[ 发送 ]`},
    'voice.sending':      { ru:`[ ОТПРАВЛЯЕТСЯ... ]`, en:`[ SENDING... ]`, es:`[ ENVIANDO... ]`, fr:`[ ENVOI EN COURS... ]`, zh:`[ 发送中…… ]`},
    'voice.sent':         { ru:`[ ✓ ОТПРАВЛЕНО ]`, en:`[ ✓ SENT ]`, es:`[ ✓ ENVIADO ]`, fr:`[ ✓ ENVOYÉ ]`, zh:`[ ✓ 已发送 ]`},
    'voice.sendError':    { ru:`[ ✗ ОШИБКА ]`, en:`[ ✗ ERROR ]`, es:`[ ✗ ERROR ]`, fr:`[ ✗ ERREUR ]`, zh:`[ ✗ 出错了 ]`},
    'voice.retry':        { ru:`[ ↻ ПОВТОРИТЬ ]`, en:`[ ↻ RETRY ]`, es:`[ ↻ REINTENTAR ]`, fr:`[ ↻ RÉESSAYER ]`, zh:`[ ↻ 重试 ]`},
    'voice.draftRestored':{ ru:`Черновик восстановлен — ничего не потерялось.`, en:`Draft restored — nothing was lost.`, es:`Borrador restaurado — no se perdió nada.`, fr:`Brouillon restauré — rien n'a été perdu.`, zh:`草稿已恢复——什么都没丢失。`},
    'voice.tooShort':     { ru:`Ещё рано — нужно хотя бы {min} символов.`, en:`Not yet — needs at least {min} characters.`, es:`Todavía no — hacen falta al menos {min} caracteres.`, fr:`Pas encore — il faut au moins {min} caractères.`, zh:`还不够——至少需要 {min} 个字。`},
    'voice.tooLong':      { ru:`Слишком длинно — не больше 4000 символов.`, en:`Too long — 4000 characters max.`, es:`Demasiado largo — máximo 4000 caracteres.`, fr:`Trop long — 4000 caractères maximum.`, zh:`太长了——最多 4000 字。`},
    'voice.networkNote':  { ru:`Если связь оборвётся — текст останется здесь, ничего не потеряется.`, en:`If the connection drops, the text stays here — nothing is lost.`, es:`Si la conexión se corta, el texto queda aquí — no se pierde nada.`, fr:`Si la connexion se coupe, le texte reste ici — rien n'est perdu.`, zh:`如果连接中断，文字仍留在这里——什么都不会丢失。`}
  };

  function raw(key){
    var e = DICT[key];
    if(!e) return key;
    return (e[LANG]!=null) ? e[LANG] : (e.en!=null ? e.en : (e.ru!=null ? e.ru : key));
  }

  /* Подстановка {var} — строки вида «собран {ago}» / «+{n} узла». */
  function fill(str, vars){
    if(!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function(m,k){
      return (vars[k]!=null) ? vars[k] : m;
    });
  }

  function t(key, vars){ return fill(raw(key), vars); }

  /* Множественное число. Формы в словаре разделяются «||»:
     ru — три формы (1 / 2-4 / 5+), en и es — две (1 / прочее).
     Если язык откатился на en (форм меньше) — берём последнюю доступную. */
  function pluralIndex(n){
    if(LANG === 'ru'){
      var m10 = n % 10, m100 = n % 100;
      if(m10 === 1 && m100 !== 11) return 0;
      if(m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
      return 2;
    }
    return n === 1 ? 0 : 1;
  }

  function tn(key, n, vars){
    var forms = String(raw(key)).split('||');
    var f = forms[pluralIndex(n)];
    if(f == null) f = forms[forms.length - 1];
    var v = { n: n };
    if(vars) for(var k in vars) if(vars.hasOwnProperty(k)) v[k] = vars[k];
    return fill(f, v);
  }

  function apply(root){
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-html]').forEach(function(el){ el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(function(el){ el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    root.querySelectorAll('[data-i18n-aria]').forEach(function(el){ el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  }

  function buildSwitcher(){
    if(document.getElementById('uc-lang') || !document.body) return;
    // Язык выбирается один раз на входе (лендинг). На страницах с навигацией он
    // наследуется из localStorage/браузера — отдельный селектор не нужен.
    if(document.querySelector('header nav') || document.querySelector('nav')) return;

    var wrap=document.createElement('div'); wrap.id='uc-lang';
    wrap.style.cssText='position:fixed;z-index:9000;top:calc(env(safe-area-inset-top,0px) + 12px);right:calc(env(safe-area-inset-right,0px) + 12px);';

    var btn=document.createElement('button');
    btn.type='button'; btn.setAttribute('aria-label','Language');
    btn.textContent=NAMES[LANG]+' \u25BE';
    btn.style.cssText='font-family:"Share Tech Mono",monospace;font-size:0.72rem;letter-spacing:0.1em;color:rgba(180,215,255,0.9);background:rgba(10,16,24,0.55);border:1px solid rgba(255,255,255,0.22);border-radius:7px;padding:8px 12px;min-height:38px;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';

    var list=document.createElement('div');
    list.style.cssText='position:fixed;display:none;min-width:150px;background:rgba(8,14,22,0.97);border:1px solid rgba(255,255,255,0.2);border-radius:8px;overflow:hidden;z-index:9001;box-shadow:0 8px 30px rgba(0,0,0,0.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);';
    SUPPORTED.forEach(function(code){
      var item=document.createElement('a');
      item.textContent=NAMES[code];
      item.style.cssText='display:block;padding:13px 16px;min-height:44px;box-sizing:border-box;font-family:"Share Tech Mono",monospace;font-size:0.85rem;cursor:pointer;white-space:nowrap;color:'+(code===LANG?'rgba(160,215,255,0.95)':'rgba(255,255,255,0.7)')+';';
      item.addEventListener('click',function(){ try{localStorage.setItem('uc_lang',code);}catch(e){} location.reload(); });
      list.appendChild(item);
    });

    function place(){ var r=btn.getBoundingClientRect(); list.style.top=(r.bottom+6)+'px'; list.style.right=Math.max(8,(window.innerWidth-r.right))+'px'; }
    function toggle(open){ var show=(open===undefined)?(list.style.display==='none'):open; if(show){ place(); list.style.display='block'; } else { list.style.display='none'; } }
    btn.addEventListener('click',function(e){ e.stopPropagation(); toggle(); });
    document.addEventListener('click',function(){ toggle(false); });
    window.addEventListener('resize',function(){ if(list.style.display==='block') place(); });

    wrap.appendChild(btn);
    document.body.appendChild(list);
    document.body.appendChild(wrap);
  }

  window.UC_I18N = { lang:LANG, t:t, tn:tn, apply:apply, supported:SUPPORTED, names:NAMES };

  function init(){ apply(document); buildSwitcher(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
