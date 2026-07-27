// ═══════════════════════════════════════════════════════════════
// UNITYCODE — uc-door.js: экран за выходом.
//
// Общий для лендинга и Спирали: когда сцена погасла, здесь человек
// решает, что дальше. Три исхода:
//   — вернуться: тап по экрану, как было до появления остальных;
//   — первоисточник: уйти читать зерно, из которого выросла книга;
//   — уйти совсем: с устройства стирается ключ.
//
// Что происходит при окончательном уходе — и чего НЕ происходит:
//
//   Сеть не меняется. Узлы, связи и журнал остаются как были: мысль
//   уже вплетена и принадлежит связям, а не автору. Стирается только
//   нить, которая вела от узлов к этому устройству.
//
//   Уход не одинаково окончателен, и экран говорит об этом честно.
//   Токен из ключевой фразы — это её SHA-256: он исчезнет отсюда, но
//   человек введёт фразу снова и вернётся собой. Гостевой токен —
//   случайный UUID, и его стирание необратимо ни для кого.
//
//   Очередь неприкосновенна. Пока в uc_weave_queue лежит неотправленный
//   шум, окончательный уход не предлагается вовсе: правило «шум не
//   теряется никогда» сильнее любого жеста.
//
//   Настройки удобства (язык, шрифт и тема Книги, закладки) не трогаем:
//   это не личность. Особенно закладки — с этого же экрана зовут читать.
//
// В сеть не ходит. Подключать после i18n.js.
// ═══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  // личность и следы прохода — стираются
  var IDENTITY = ['uc_token', 'uc_visits', 'uc_last_personal_read'];
  var SESSION  = ['uc_petlya_dialog', 'uc_petlya_intro', 'uc_petlya_memout', 'uc_petlya_userfx'];
  var PREFIXES = ['uc_noise_', 'uc_woven_idx_'];
  // не трогаем: uc_lang, uc_theme, uc_fs, uc_pane, unitycode-navpad, uc_bm,
  //             uc_char_hint_seen, uc_intro_seen, uc_audio_came_from_nav
  // и никогда:  uc_weave_queue

  function t(key, fallback) {
    try { return global.UC_I18N ? global.UC_I18N.t(key) : fallback; }
    catch (e) { return fallback; }
  }

  // в очереди лежит шум, который ещё не подтверждён сервером
  function queuePending() {
    try {
      var q = JSON.parse(localStorage.getItem('uc_weave_queue') || '[]');
      return Array.isArray(q) && q.length > 0;
    } catch (e) { return false; }
  }

  // токен из ключевой фразы — SHA-256, ровно 64 hex-символа
  function isPhraseKey() {
    try { return /^[0-9a-f]{64}$/i.test(localStorage.getItem('uc_token') || ''); }
    catch (e) { return false; }
  }

  function erase() {
    try {
      IDENTITY.forEach(function (k) { localStorage.removeItem(k); });
      // ключи с номерами собираем заранее: удаление на ходу сдвигает индексы
      var kill = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k) continue;
        for (var j = 0; j < PREFIXES.length; j++) {
          if (k.indexOf(PREFIXES[j]) === 0) { kill.push(k); break; }
        }
      }
      kill.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    try { SESSION.forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
  }

  var CHOICE = 'font-size:0.62rem;letter-spacing:0.24em;text-transform:uppercase;'
             + 'text-decoration:none;cursor:pointer;padding:16px 20px;margin:-16px -20px;'
             + 'transition:opacity 3.4s ease,color 0.4s ease;';

  function open() {
    if (document.getElementById('uc-door')) return;
    var confirming = false, gone = false;

    // z-index выше вуали обеих страниц: на лендинге она 150, на Спирали 9000
    var box = document.createElement('div');
    box.id = 'uc-door';
    box.style.cssText = 'position:fixed;inset:0;z-index:9001;display:flex;flex-direction:column;'
      + 'align-items:center;justify-content:center;gap:2.2rem;cursor:pointer;padding:2rem;'
      + 'font-family:"Share Tech Mono",monospace;text-align:center;';

    // ── что видно сразу: строка и два пути
    var main = document.createElement('div');
    main.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2.2rem;'
      + 'transition:opacity 0.9s ease;';

    var line = document.createElement('div');
    line.style.cssText = 'font-size:0.7rem;letter-spacing:0.3em;color:rgba(200,215,235,0.28);'
      + 'opacity:0;transition:opacity 4s ease;padding:0 1.2rem;';
    line.textContent = t('index.exitDoor', 'дверь осталась');

    // Первоисточник — зерно, из которого выросло всё остальное. Появляется
    // позже строки: сначала тишина, и только потом то, что можно читать.
    var read = document.createElement('a');
    read.id = 'uc-door-read';
    read.href = 'istok.html';
    read.style.cssText = CHOICE + 'color:rgba(216,166,74,0.5);opacity:0;'
      + 'border-bottom:1px solid rgba(216,166,74,0.18);';
    read.textContent = t('index.exitRead', 'первоисточник');

    // Уход. Последним и тише всех: это не авария, это выбор.
    var held = queuePending();
    var fin = document.createElement('div');
    fin.id = 'uc-door-final';
    fin.style.cssText = held
      ? 'font-size:0.58rem;letter-spacing:0.12em;line-height:1.9;color:rgba(200,215,235,0.2);'
        + 'opacity:0;transition:opacity 3.4s ease;max-width:26rem;'
      : CHOICE + 'color:rgba(200,215,235,0.22);opacity:0;';
    fin.textContent = held ? t('index.exitHeld', '') : t('index.exitFinal', 'уйти совсем');

    main.appendChild(line);
    main.appendChild(read);
    main.appendChild(fin);
    box.appendChild(main);
    document.body.appendChild(box);

    requestAnimationFrame(function () { line.style.opacity = '1'; });
    setTimeout(function () { read.style.opacity = '1'; }, 2800);
    setTimeout(function () { fin.style.opacity  = '1'; }, 5600);

    // тап по экрану — возврат, как было до появления остальных путей
    function back(e) {
      if (confirming || gone) return;
      if (e) e.preventDefault();
      location.reload();
    }
    box.addEventListener('click', back);
    box.addEventListener('touchend', back);
    function stop(e) { e.stopPropagation(); }
    read.addEventListener('click', stop);
    read.addEventListener('touchend', stop);

    // ── подтверждение: сказать честно, что произойдёт, и что не произойдёт
    function askFinal(e) {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      if (confirming || gone) return;
      confirming = true;
      main.style.opacity = '0';

      var conf = document.createElement('div');
      conf.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2.4rem;'
        + 'opacity:0;transition:opacity 1.6s ease;';

      var words = document.createElement('div');
      words.id = 'uc-door-words';
      words.style.cssText = 'font-size:0.66rem;letter-spacing:0.1em;line-height:2.2;'
        + 'color:rgba(200,215,235,0.42);max-width:30rem;';
      [ t('index.exitKept', ''), t('index.exitKey', ''),
        isPhraseKey() ? t('index.exitPhraseBack', '') : t('index.exitNoBack', '')
      ].forEach(function (s) {
        var p = document.createElement('div');
        p.textContent = s;
        words.appendChild(p);
      });

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:2.6rem;align-items:center;flex-wrap:wrap;justify-content:center;';

      var go = document.createElement('div');
      go.id = 'uc-door-go';
      go.style.cssText = CHOICE + 'color:rgba(200,215,235,0.34);';
      go.textContent = t('index.exitGo', 'уйти');

      var stay = document.createElement('div');
      stay.id = 'uc-door-stay';
      stay.style.cssText = CHOICE + 'color:rgba(160,215,255,0.5);';
      stay.textContent = t('index.exitStay', 'остаться');

      row.appendChild(go);
      row.appendChild(stay);
      conf.appendChild(words);
      conf.appendChild(row);

      setTimeout(function () {
        if (main.parentNode) main.parentNode.removeChild(main);
        box.appendChild(conf);
        requestAnimationFrame(function () { conf.style.opacity = '1'; });
      }, 900);

      function leaveForGood(ev) {
        if (ev) { ev.stopPropagation(); ev.preventDefault(); }
        if (gone) return;
        gone = true;
        erase();                       // сразу: жест необратим, остальное — послесловие
        conf.style.opacity = '0';
        setTimeout(function () {
          if (conf.parentNode) conf.parentNode.removeChild(conf);
          box.style.cursor = 'default';
          var om = document.createElement('div');
          om.style.cssText = 'font-family:"Newsreader",Georgia,serif;font-size:1.7rem;'
            + 'color:rgba(216,166,74,0.5);opacity:0;transition:opacity 5s ease;';
          om.textContent = 'ω';
          box.appendChild(om);
          requestAnimationFrame(function () { om.style.opacity = '1'; });
        }, 1000);
      }
      function stayHere(ev) {
        if (ev) { ev.stopPropagation(); ev.preventDefault(); }
        if (gone) return;
        conf.style.opacity = '0';
        setTimeout(function () {
          if (conf.parentNode) conf.parentNode.removeChild(conf);
          box.appendChild(main);
          requestAnimationFrame(function () { main.style.opacity = '1'; });
          confirming = false;
        }, 900);
      }
      go.addEventListener('click', leaveForGood);
      go.addEventListener('touchend', leaveForGood);
      stay.addEventListener('click', stayHere);
      stay.addEventListener('touchend', stayHere);
      conf.addEventListener('click', stop);
      conf.addEventListener('touchend', stop);
    }

    if (!held) {
      fin.addEventListener('click', askFinal);
      fin.addEventListener('touchend', askFinal);
    } else {
      fin.addEventListener('click', stop);
      fin.addEventListener('touchend', stop);
    }
  }

  global.UCDoor = { open: open };
})(window);
