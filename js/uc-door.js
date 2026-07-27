// ═══════════════════════════════════════════════════════════════
// UNITYCODE — uc-door.js: экран за выходом.
//
// Общий для лендинга и Спирали: когда сцена погасла, здесь человек
// решает, что дальше. Сейчас выбора два — вернуться (тап по экрану,
// как было) и уйти читать первоисточник. Место под третий пункт —
// окончательный уход со стиранием ключа — оставлено осознанно: это
// решение доктрины, оно ещё не принято.
//
// Ничего не стирает и в сеть не ходит. Подключать после i18n.js.
// ═══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  function t(key, fallback) {
    try { return global.UC_I18N ? global.UC_I18N.t(key) : fallback; }
    catch (e) { return fallback; }
  }

  function open() {
    if (document.getElementById('uc-door')) return;

    // Весь экран остаётся возвратом — как было до появления второго пункта,
    // чтобы у тех, кто просто тапает, ничего не изменилось.
    var box = document.createElement('div');
    box.id = 'uc-door';
    // z-index выше вуали обеих страниц: на лендинге она 150, на Спирали 9000
    box.style.cssText = 'position:fixed;inset:0;z-index:9001;display:flex;flex-direction:column;'
      + 'align-items:center;justify-content:center;gap:2.2rem;cursor:pointer;'
      + 'font-family:"Share Tech Mono",monospace;';

    var line = document.createElement('div');
    line.style.cssText = 'font-size:0.7rem;letter-spacing:0.3em;color:rgba(200,215,235,0.28);'
      + 'opacity:0;transition:opacity 4s ease;text-align:center;padding:0 1.2rem;';
    line.textContent = t('index.exitDoor', 'дверь осталась');

    // Первоисточник — зерно, из которого выросло всё остальное. Появляется
    // позже строки: сначала тишина, и только потом то, что можно читать.
    var read = document.createElement('a');
    read.href = 'istok.html';
    read.style.cssText = 'font-size:0.62rem;letter-spacing:0.24em;text-transform:uppercase;'
      + 'color:rgba(216,166,74,0.5);text-decoration:none;opacity:0;'
      + 'transition:opacity 3.4s ease,color 0.4s ease;padding:16px 20px;margin:-16px -20px;'
      + 'border-bottom:1px solid rgba(216,166,74,0.18);';
    read.textContent = t('index.exitRead', 'первоисточник');
    // тап по ссылке — это не «вернуться», гасим всплытие к экрану
    function stop(e){ e.stopPropagation(); }
    read.addEventListener('click', stop);
    read.addEventListener('touchend', stop);

    box.appendChild(line);
    box.appendChild(read);
    document.body.appendChild(box);

    requestAnimationFrame(function () { line.style.opacity = '1'; });
    setTimeout(function () { read.style.opacity = '1'; }, 2800);

    function back(e) {
      if (e) e.preventDefault();
      location.reload();
    }
    box.addEventListener('click', back);
    box.addEventListener('touchend', back);
  }

  global.UCDoor = { open: open };
})(window);
