/* ═══════════════════════════════════════════════════════
   UNITYCODE — analytics.js  v1.0
   Cloudflare Web Analytics: анонимный счётчик посещений.
   Без cookies, без персональных данных, без записи в базу —
   только внешний маяк Cloudflare.

   Настройка (один раз):
   Cloudflare Dashboard → Analytics & Logs → Web Analytics →
   Add a site → домен unitycode.space → скопировать token
   и вставить в CF_BEACON_TOKEN ниже.

   Пока токен пуст — скрипт ничего не делает.
   Если маяк не загрузился (офлайн, блокировщик) — портал
   работает как обычно: аналитика не имеет права ломать шум.
═══════════════════════════════════════════════════════ */
(function () {
  var CF_BEACON_TOKEN = '';
  if (!CF_BEACON_TOKEN) return;
  try {
    var s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: CF_BEACON_TOKEN }));
    document.head.appendChild(s);
  } catch (e) { /* тихий fail-safe */ }
})();
