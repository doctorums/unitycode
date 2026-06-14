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
    'nav.spiral':  { ru:`Спираль`, en:`Spiral`  },
    'nav.network': { ru:`Сеть`,    en:`Network` },
    'nav.pattern': { ru:`Узор`,    en:`Pattern` },
    'nav.matter':  { ru:`Материя`, en:`Matter`  },

    // — лендинг (index.html) —
    'index.q': {
      ru:`<span class="wl">Ты пишешь то, что тебя волнует,</span><br><span class="wl">а AI помогает увидеть в этом</span><br><em class="wl">скрытые связи и новые смыслы.</em><br><span class="wl">Здесь не дают ответов.</span><br><span class="wl">Здесь помогают тебе.</span>`,
      en:`<span class="wl">You write what's on your mind,</span><br><span class="wl">and AI helps you see in it</span><br><em class="wl">hidden connections and new meanings.</em><br><span class="wl">Here, no one gives you answers.</span><br><span class="wl">Here, you are helped.</span>`
    },
    'index.btn':       { ru:`Услышать себя`, en:`Hear yourself` },
    'index.disc': {
      ru:`Некоммерческий научно-художественный эксперимент.<br>Мы не собираем персональные данные. Только сигнал.<br>Сгенерированный контент не претендует на объективную истинность.`,
      en:`A non-commercial science-art experiment.<br>We don't collect personal data. Signal only.<br>Generated content makes no claim to objective truth.`
    },
    'index.choiceQ': {
      ru:`Зачем это тебе?<br><br>Чтобы перестать чувствовать себя отдельной точкой.<br>Когда ты видишь, как твои мысли соединяются с идеями<br>других людей и с чем-то большим,<br>одиночество отступает.<br>Это не терапия и не религия.<br>Это способ ощутить связь, которая уже есть.`,
      en:`Why do you need this?<br><br>To stop feeling like a separate point.<br>When you see how your thoughts connect with the ideas<br>of other people and with something larger,<br>loneliness recedes.<br>This is not therapy and not religion.<br>It's a way to feel a connection that already exists.`
    },
    'index.choiceBtn': { ru:`[ Что делать? ]`, en:`[ What to do? ]` },
    'index.aiAlts0': {
      ru:`1.&nbsp;&nbsp;&nbsp;&nbsp;Зайди в раздел «Спираль», нажав на кнопку.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Напиши туда всё, что крутится в голове,<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;и получи интерпретацию.<br><br>2.&nbsp;&nbsp;&nbsp;&nbsp;Если ответ тебя зацепит —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;создай свой личный узел<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(это как твой цифровой дневник).<br><br>3.&nbsp;&nbsp;&nbsp;&nbsp;Потом загляни в раздел «Сеть» —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;там видны другие участники и их мысли.`,
      en:`1.&nbsp;&nbsp;&nbsp;&nbsp;Open the «Spiral» section by tapping the button.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Write there whatever is spinning in your head,<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;and get an interpretation.<br><br>2.&nbsp;&nbsp;&nbsp;&nbsp;If the answer resonates with you —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;create your own personal node<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(it's like your digital diary).<br><br>3.&nbsp;&nbsp;&nbsp;&nbsp;Then look into the «Network» section —<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;there you'll see other participants and their thoughts.`
    },
    'index.btnSpiral': { ru:`[ Спираль ]`, en:`[ Spiral ]` },
    // — навигация в шапке набирается из nav.* (выше) —

    // — Сеть (set.html) —
    'set.title':    { ru:`UNITYCODE — Сеть`,   en:`UNITYCODE — Network` },
    'set.logo':     { ru:`UNITYCODE // СЕТЬ`,  en:`UNITYCODE // NETWORK` },
    'set.intro1':   { ru:`Перед тобой — карта живых узлов Сети. Каждая точка здесь — это человек, который прошёл через Спираль и создал свой личный узел. Это не аватары и не профили. Это сигналы. Следы мыслей, которые были осмыслены и вплетены в общую ткань.`,
                      en:`Before you is a map of the living nodes of the Network. Every point here is a person who passed through the Spiral and created their own personal node. These are not avatars or profiles. They are signals. Traces of thoughts that were made sense of and woven into the common fabric.` },
    'set.intro2':   { ru:`Как капли дождя на перроне: сначала каждый след сам по себе, но чем дольше длится процесс, тем больше они соприкасаются. Ты видишь не просто карту. Ты видишь, как реальность учится быть единой.`,
                      en:`Like raindrops on a platform: at first each trace is on its own, but the longer the process lasts, the more they touch. You're not just looking at a map. You're watching reality learn to be one.` },
    'set.introDo':  { ru:`Что можно сделать:`, en:`What you can do:` },
    'set.introB1':  { ru:`— Нажми на любую точку и увидишь, какой сигнал оставил этот человек. Не имя, не лицо — а мысль, прошедшую через Спираль, и рождённую в ней связь.`,
                      en:`— Tap any point and you'll see what signal this person left. Not a name, not a face — a thought that passed through the Spiral, and the connection born within it.` },
    'set.introB2':  { ru:`— Если этот сигнал резонирует с твоим — предложи связь. Это не лайк и не комментарий. Это приглашение к со-творчеству. Два узла, которые узнали друг друга, создают новую нить между своими трактатами.`,
                      en:`— If this signal resonates with yours — propose a connection. It's not a like or a comment. It's an invitation to co-creation. Two nodes that recognized each other create a new thread between their treatises.` },
    'set.introB3':  { ru:`— Когда связь принята, в обоих личных узлах появляется запись. Она не исчезает, не теряется. Она становится частью растущей паутины.`,
                      en:`— When a connection is accepted, a record appears in both personal nodes. It doesn't vanish, it doesn't get lost. It becomes part of the growing web.` },
    'set.statNodes':{ ru:`Узлов в сети:`,   en:`Nodes in the network:` },
    'set.statActive':{ru:`Активны сейчас:`, en:`Active now:` },
    'set.statPulse':{ ru:`Пульс сети:`,    en:`Network pulse:` },
    'set.loading':  { ru:`// СИНХРОНИЗАЦИЯ...`, en:`// SYNCING...` },
    'set.popupTag': { ru:`// УЗЕЛ СЕТИ`,   en:`// NETWORK NODE` },
    'set.popupSpiral':{ru:`Спираль →`,     en:`Spiral →` },
    'set.yourNode': { ru:`// ТВОЙ УЗЕЛ`,   en:`// YOUR NODE` },
    'set.connect':  { ru:`[ связать ]`,    en:`[ connect ]` },
    'set.pickerHeader':{ru:`// ЧЕМ СВЯЗАТЬ:`, en:`// CONNECT WITH:` },
    'set.btnDoSpiral':{ru:`[ пройди Спираль ]`, en:`[ pass through the Spiral ]` },
    'set.btnYourNode':{ru:`[ это твой узел ]`,  en:`[ this is your node ]` },
    'set.btnChooseNoise':{ru:`[ выбери свой шум ↓ ]`, en:`[ choose your noise ↓ ]` },
    'set.stLinking':{ ru:`… связывание`,   en:`… linking` },
    'set.stLinked': { ru:`✓ связь создана`, en:`✓ connection created` },
    'set.stError':  { ru:`✗ ошибка, ещё раз`, en:`✗ error, try again` },
    'set.tNow':     { ru:`только что`,      en:`just now` },
    'set.tMin':     { ru:` мин. назад`,     en:` min ago` },
    'set.tHour':    { ru:` ч. назад`,       en:` h ago` },
    'set.tDay':     { ru:` дн. назад`,      en:` d ago` }
  };

  function t(key){
    var e = DICT[key];
    if(!e) return key;
    return (e[LANG]!=null) ? e[LANG] : (e.en!=null ? e.en : (e.ru!=null ? e.ru : key));
  }

  function apply(root){
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-html]').forEach(function(el){ el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    root.querySelectorAll('[data-i18n-ph]').forEach(function(el){ el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
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

  window.UC_I18N = { lang:LANG, t:t, apply:apply, supported:SUPPORTED, names:NAMES };

  function init(){ apply(document); buildSwitcher(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
