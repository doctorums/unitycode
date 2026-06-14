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
    'index.btnSpiral': { ru:`[ Спираль ]`, en:`[ Spiral ]` }
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
    var wrap=document.createElement('div');
    wrap.id='uc-lang';
    wrap.style.cssText='position:fixed;top:12px;right:14px;z-index:9000;font-family:"Share Tech Mono",monospace;font-size:0.62rem;letter-spacing:0.12em;';
    var btn=document.createElement('button');
    btn.type='button';
    btn.textContent=NAMES[LANG]+' \u25BE';
    btn.style.cssText='background:rgba(10,16,24,0.6);color:rgba(180,215,255,0.9);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:5px 10px;cursor:pointer;font:inherit;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';
    var list=document.createElement('div');
    list.style.cssText='display:none;margin-top:4px;background:rgba(8,14,22,0.96);border:1px solid rgba(255,255,255,0.18);border-radius:6px;overflow:hidden;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';
    SUPPORTED.forEach(function(code){
      var item=document.createElement('a');
      item.textContent=NAMES[code];
      item.style.cssText='display:block;padding:7px 12px;cursor:pointer;white-space:nowrap;color:'+(code===LANG?'rgba(160,215,255,0.95)':'rgba(255,255,255,0.6)')+';';
      item.addEventListener('click',function(){ try{localStorage.setItem('uc_lang',code);}catch(e){} location.reload(); });
      item.addEventListener('mouseenter',function(){ item.style.background='rgba(255,255,255,0.06)'; });
      item.addEventListener('mouseleave',function(){ item.style.background='transparent'; });
      list.appendChild(item);
    });
    btn.addEventListener('click',function(e){ e.stopPropagation(); list.style.display=(list.style.display==='none'?'block':'none'); });
    document.addEventListener('click',function(e){ if(!wrap.contains(e.target)) list.style.display='none'; });
    wrap.appendChild(btn); wrap.appendChild(list);
    document.body.appendChild(wrap);
  }

  window.UC_I18N = { lang:LANG, t:t, apply:apply, supported:SUPPORTED, names:NAMES };

  function init(){ apply(document); buildSwitcher(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
