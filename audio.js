/* ============================================================
   UnityCode · Global Audio Module
   Web Audio синтез + BT-носитель для iOS
   Подключение: <script src="audio.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const LS_KEY = 'uc_audio_muted';
  const MASTER_VOL = 0.55;
  // Носитель нужен только iOS (держит медиа-сессию на Bluetooth-выходе).
  // На Android он, наоборот, иногда душит реальный звук системным ducking —
  // подтверждено диагностикой на устройстве Артёма (28.06).
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // ═══════════════════════════════════════════════════════════════
  // АДДИТИВНО (14.07): три независимых слоя звуковой вариативности,
  // каждый — множитель поверх УЖЕ существующих пресетов страниц, не
  // замена их индивидуальности (petlya остаётся стеклянной, implant —
  // разреженным, и т.д.). Та же логика, что применена днём к картине
  // анализа: композиция/плотность/настроение как независимые слои.
  //   1) время суток — тепло тембра + общая громкость (один узел внизу
  //      графа, ниже mute — см. initCtx)
  //   2) характер (angle) — ритм: паузы между событиями, частота удвоений
  //   3) плотность Сети — интенсивность: как часто вообще что-то звучит
  // ═══════════════════════════════════════════════════════════════

  // --- 1) Время суток ---------------------------------------------
  // cutoff — срез lowpass-фильтра в самом низу графа (выше = ярче/полнее).
  // volMul — общий множитель громкости после masterGain (mute его не трогает).
  const TIME_MOODS = {
    night:   { cutoff: 2600,  volMul: 0.65 }, // 0–5:  глуше и тише
    morning: { cutoff: 6000,  volMul: 0.85 }, // 6–10: мягкое пробуждение
    day:     { cutoff: 16000, volMul: 1.0  }, // 11–17: полный и светлый
    evening: { cutoff: 4200,  volMul: 0.9  }, // 18–23: теплее, чуть приглушен
  };
  function getTimeMood() {
    const h = new Date().getHours();
    const key = h < 6 ? 'night' : h < 11 ? 'morning' : h < 18 ? 'day' : 'evening';
    return TIME_MOODS[key];
  }

  // --- 2) Характер (то же меню ⚙, что красит картину анализа) -----
  // КЛЮЧ ДОЛЖЕН СОВПАДАТЬ с CHAR_KEY в implant.html — источник истины там,
  // здесь только чтение. Если когда-нибудь переименуешь ключ в implant.html,
  // не забудь синхронно поправить и тут (иначе звук молча перестанет слышать
  // выбор персонажа — тот же класс риска, что и version drift).
  const CHAR_KEY = 'uc_agent_character';
  const CHARACTER_RHYTHM = {
    '':              { gapMul: 1.0,  pairMul: 1.0 },  // без изменений — как заложено в пресете страницы
    practical:       { gapMul: 0.75, pairMul: 0.8  },  // короче паузы, меньше хаоса удвоений — «по делу»
    philosophical:   { gapMul: 1.5,  pairMul: 0.6  },  // реже и разреженнее — созерцательно
    emotional:       { gapMul: 0.9,  pairMul: 1.6  },  // чаще удвоения — живее, «пульс»
    connections:     { gapMul: 0.8,  pairMul: 1.8  },  // акцент на частоте сетевых импульсов
  };
  function getCharacterRhythm() {
    let v = '';
    try { v = localStorage.getItem(CHAR_KEY) || ''; } catch (e) {}
    return CHARACTER_RHYTHM[v] || CHARACTER_RHYTHM[''];
  }

  // --- 3) Плотность Сети --------------------------------------------
  // netDensity читается ЖИВЬЁМ внутри пресет-функций на каждой итерации —
  // не только один раз при старте. Если фоновый fetch придёт ПОЗЖЕ, чем
  // эмбиент уже начал играть с нейтральным значением, следующий цикл всё
  // равно подхватит новое число — не нужно ничего перезапускать.
  // Нейтральное значение (1.0 из диапазона 0..2) — на случай оффлайна/сбоя:
  // эмбиент стартует сразу, без ожидания сети (принцип «работает на любом
  // канале» — см. DECISIONS.md).
  let netDensity = 1.0;
  const DENSITY_CACHE_KEY = 'uc_audio_density_cache';
  const DENSITY_CACHE_TTL = 10 * 60 * 1000; // 10 минут — не долбить сеть на каждой навигации между страницами
  // Те же публичные креды, что уже трижды продублированы в petlya/implant/
  // set.html (anon/publishable-ключ, только чтение через RLS — дублирование
  // безопасно, но держи в уме при следующей правке доступа).
  const SB_URL = 'https://lukyyqabkxzrgdixzphs.supabase.co';
  const SB_KEY = 'sb_publishable_c94zOuVnId_NFhHZgRzQ2Q_h3tljPjf';

  function loadNetDensity() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(DENSITY_CACHE_KEY) || 'null');
      if (cached && Number.isFinite(cached.density) && Date.now() - cached.ts < DENSITY_CACHE_TTL) {
        netDensity = cached.density;
        return;
      }
    } catch (e) { /* битый кэш — просто идём в сеть заново */ }

    const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Prefer: 'count=exact' };
    Promise.all([
      fetch(SB_URL + '/rest/v1/nodes?select=id&limit=1', { headers }),
      fetch(SB_URL + '/rest/v1/connections?select=id&limit=1', { headers }),
    ]).then(([nRes, cRes]) => {
      const nCount = parseInt((nRes.headers.get('content-range') || '').split('/')[1] || '0', 10);
      const cCount = parseInt((cRes.headers.get('content-range') || '').split('/')[1] || '0', 10);
      if (!Number.isFinite(nCount) || nCount <= 0) return; // нет данных — остаёмся на нейтральном
      let d = cCount / nCount;                              // связей на узел, тот же расчёт, что для картины
      if (!Number.isFinite(d)) return;
      d = Math.min(2, Math.max(0, d));
      netDensity = d;
      try { sessionStorage.setItem(DENSITY_CACHE_KEY, JSON.stringify({ density: d, ts: Date.now() })); } catch (e) {}
    }).catch(() => { /* сеть недоступна — ambient уже играет на нейтральном значении, это ок */ });
  }

  // Характер (сессия почти никогда не меняется на лету) × плотность Сети
  // (может доехать позже — читается свежей на каждый вызов).
  function getRhythmMul() {
    const ch = getCharacterRhythm();
    const d = netDensity; // 0..2
    const densityGapMul = 1.25 - 0.25 * d; // 0 связей на узел → паузы ×1.25 (реже); 2 → ×0.75 (чаще)
    const densityVolMul = 0.85 + 0.15 * d; // 0 → ×0.85 (тише); 2 → ×1.15 (громче)
    return {
      gapMul: ch.gapMul * densityGapMul,
      pairMul: ch.pairMul,
      volMul: densityVolMul,
    };
  }
  // ═══════════════════════════════════════════════════════════════

  let ctx = null;
  let masterGain = null;
  let toneFilter = null;   // время суток: тепло/яркость
  let timeVolGain = null;  // время суток: общая громкость
  let carrier = null;
  let started = false;
  let muted = localStorage.getItem(LS_KEY) === '1';
  // Кнопка мьюта убрана из интерфейса — у человека больше нет способа снять
  // старое заглушение. Не доверяем сохранённому true при загрузке, иначе
  // тот, кто когда-то приглушил звук (например, до удаления кнопки),
  // навсегда остаётся в тишине без какой-либо возможности это исправить.
  if (muted) { muted = false; localStorage.removeItem(LS_KEY); }
  let ambientNodes = [];
  let presetStarted = false;
  let presetRunning = false;

  function initCtx() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime + 1.2);

    // Время суток — один узел ниже masterGain по цепи. mute управляет ТОЛЬКО
    // masterGain.gain (см. toggleMute) и с этими узлами не конфликтует.
    const tm = getTimeMood();
    toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = tm.cutoff;
    timeVolGain = ctx.createGain();
    timeVolGain.gain.value = tm.volMul;

    masterGain.connect(toneFilter);
    toneFilter.connect(timeVolGain);
    timeVolGain.connect(ctx.destination);
  }

  function startCarrier() {
    if (carrier) return;
    carrier = new Audio(SILENT_WAV);
    carrier.loop = true;
    carrier.volume = 0.0001;
    carrier.setAttribute('playsinline', '');
    const p = carrier.play();
    if (p && p.catch) p.catch(() => {});
  }

  function start() {
    if (started) return;
    started = true;
    if (isIOS) startCarrier();
    initCtx();
    if (ctx.state === 'suspended') ctx.resume();
    startAmbient();
    updateBtn();
  }

  function fadeOutForNav(duration) {
    if (!ctx || !masterGain) return;
    const d = typeof duration === 'number' ? duration : 0.2;
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + d);
  }
  window.addEventListener('pagehide', () => fadeOutForNav(0.2));
  window.addEventListener('beforeunload', () => fadeOutForNav(0.2));

  // ФИКС 27.08: у гашения при уходе не было парного возврата. Браузер при
  // «назад» отдаёт ту же ЖИВУЮ страницу из bfcache — скрипт не
  // перезапускается, start() не зовётся, а masterGain так и остался в нуле
  // после pagehide. Дальше всё «работало»: эмбиент шёл, голос эссенции
  // исправно декодировался и стартовал — в тишину. Диагностика писала ok,
  // потому что ok и было: звук честно играл на нулевой громкости.
  // Поймано на маршруте Спираль → Сеть → назад → второе вплетение (27.08):
  // «голоса второй раз нет».
  // persisted=false — это обычная загрузка, там свой путь через start(),
  // трогать не нужно. muted не трогаем принципиально: если человек
  // выключил звук, возврат на страницу — не повод его включать.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    if (!ctx || !masterGain || !started || muted) return;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(MASTER_VOL, now + 0.6);
  });

  function fxSubspace() {
    if (!ctx || muted) return;
    fxPortal();
    setTimeout(fxAbyss, 1300);
  }

  function fxPortal() {
    const t = ctx.currentTime;
    const dur = 2.0;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc1.type = 'sine'; osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(82.5, t);
    osc1.frequency.linearRampToValueAtTime(55, t + dur);
    osc2.frequency.setValueAtTime(165, t);
    osc2.frequency.linearRampToValueAtTime(110, t + dur);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.linearRampToValueAtTime(250, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.3);
    g.gain.linearRampToValueAtTime(0.16, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.4);
    osc1.connect(filter); osc2.connect(filter);
    filter.connect(g); g.connect(masterGain);
    osc1.start(); osc2.start();
    osc1.stop(t + dur + 0.5);
    osc2.stop(t + dur + 0.5);
  }

  function fxAbyss() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 2.2;
    const bufSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, t);
    filter.frequency.linearRampToValueAtTime(500, t + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(80, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.2, t + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start(t); src.stop(t + dur + 0.1);
  }

  function prepNav() {
    fadeOutForNav(0.8); // долгий — под длительность fxSubspace (Портал→Бездна) на кнопке index
    sessionStorage.setItem('uc_audio_came_from_nav', '1');
  }

  // Глобальный fade-out для ЛЮБОГО перехода по навигационным ссылкам
  // (меню Спираль/Сеть/Паттерн/Материя и т.п.), кроме уже обработанной
  // кнопки на index (та делает это сама через prepNav()+fxSubspace()).
  // Никакого звукового эффекта здесь не добавляется — только тишина
  // вместо резкого обрыва звука при переходе.
  document.addEventListener('click', function (e) {
    try {
      if (!started || muted) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
      if (a.id === 'btn') return;
      e.preventDefault();
      fadeOutForNav();
      sessionStorage.setItem('uc_audio_came_from_nav', '1');
      setTimeout(() => { window.location.href = href; }, 220);
    } catch (err) { /* никогда не мешаем остальной странице */ }
  });

  function startAmbient() {
    if (!ctx) return;
    createDrone(55, 0.06, 0);
    setTimeout(() => createDrone(82.4, 0.04, 3.7), 80);
    setTimeout(() => createDrone(110, 0.035, 7.1), 160);
    createPulse(440, 0.015, 5);
    createPulse(528, 0.012, 11);
    createPulse(396, 0.010, 17);
    setTimeout(() => createSpaceNoise(0.022), 240);
  }

  function createDrone(freq, vol, detune) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    lfo.frequency.value = 0.05 + Math.random() * 0.08;
    lfoGain.gain.value = vol * 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    lfo.start();
    ambientNodes.push(osc, lfo);
  }

  function createPulse(freq, vol, interval) {
    const scheduleNext = () => {
      if (!started) return;
      if (!muted) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq + (Math.random() * 4 - 2);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.5);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 5);
      }
      setTimeout(scheduleNext, (interval + Math.random() * interval) * 1000);
    };
    setTimeout(scheduleNext, interval * 1000);
  }

  function createSpaceNoise(vol) {
    const bufSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
    ambientNodes.push(source);
  }

  function fx(type, extra) {
    if (!started) { start(); }
    if (!ctx || muted) return;
    if (ctx.state === 'suspended') ctx.resume();
    switch (type) {
      case 'submit':  fxSubmit(); break;
      case 'node':    fxNode(); break;
      case 'connect': fxConnect(); break;
      case 'page':    fxSubspace(); break;
      case 'ping':    fxPing(); break;
      case 'error':   fxError(); break;
      case 'sparks':  fxSparks(extra); break;
      case 'explode': fxExplode(); break;
      case 'shipCapture': fxShipCapture(); break;
    }
  }

  // ФИКС 16.07 — голос эссенций (unitycode-voice) молчал почти всегда:
  // и в Спирали, и в Материи звук создавался через `new Audio(blob).play()`,
  // а это подчиняется политике автоплея браузера — в Материи вызов идёт
  // из автономного цикла анимации (без единого жеста вообще), в Спирали —
  // спустя два последовательных сетевых ответа после клика, когда «жест»
  // уже почти наверняка протух для Safari. Деньги за синтез списывались
  // (Яндекс исправно работал), но .play() тихо отклонялся политикой.
  //
  // Решение — тот же канал, что уже держит sparks/explode/shipCapture:
  // Web Audio API поверх УЖЕ разблокированного ctx, а не отдельный
  // <audio>-элемент. AudioContext, однажды снятый с паузы жестом, не
  // требует нового жеста на каждый последующий узел — можно планировать
  // buffer source из любого места, хоть из цикла requestAnimationFrame,
  // ровно как уже делают fxSparks/fxExplode. decodeAudioData сам по себе
  // асинхронный, но не имеет отношения к политике автоплея.
  //
  // Вход — ArrayBuffer (не Blob!) с синтезированным TTS (oggopus от
  // unitycode-voice). Возвращает Promise<boolean> — true если реально
  // заиграло, false если тихо пропущено (не начат/muted/сбой декодирования).
  // Причина последнего отказа — читается снаружи (UCAudio.speakFail).
  // Голос украшение и падать не должен громко, но и пропадать безымянно
  // ему больше нельзя: немой отказ уже стоил разбора 07.08. Различаем
  // «контекста нет», «заглушено» и «не декодировалось» — последнее самое
  // вероятное на Safari, где Web Audio плохо берёт oggopus.
  let lastSpeakFail = '';
  function speak(arrayBuffer) {
    lastSpeakFail = '';
    if (!started) { start(); }
    if (!ctx) { lastSpeakFail = 'no_ctx (звук не запущен — не было жеста?)'; return Promise.resolve(false); }
    if (muted) { lastSpeakFail = 'muted'; return Promise.resolve(false); }
    if (ctx.state === 'suspended') ctx.resume();
    const bytes = (arrayBuffer && arrayBuffer.byteLength) || 0;
    return ctx.decodeAudioData(arrayBuffer.slice(0)).then(buf => {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      g.gain.value = 0.55; // тише (было 1.0) — по прослушиванию 16.07: голос перебивал эмбиент
      src.connect(g); g.connect(masterGain);
      src.start();
      return true;
    }).catch(e => {
      // битый буфер или формат, который движок не берёт — голос лишь украшение,
      // поэтому тихо, но с именем причины
      lastSpeakFail = 'decode_failed (' + bytes + ' Б, ctx=' + ctx.state + '): ' + String(e).slice(0, 120);
      return false;
    });
  }

  function fxSubmit() {
    [220, 330, 440].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.08 + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 1.2);
      osc.connect(g); g.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 1.3);
    });
  }

  function fxNode() {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(264, ctx.currentTime + 1.5);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + 2.1);
  }

  function fxConnect() {
    [396, 528].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.3 + i * 0.15);
      g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 1.2);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.connect(g); g.connect(masterGain);
      osc.start(); osc.stop(ctx.currentTime + 2.6);
    });
  }

  function fxPage() {
    const bufSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.4);
    filter.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start(); src.stop(ctx.currentTime + 0.6);
  }

  function fxPing() {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 880;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(g); g.connect(masterGain);
    osc.start(); osc.stop(ctx.currentTime + 0.9);
  }

  function fxError() {
    [200, 180].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + i * 0.12 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.3);
      osc.connect(g); g.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });
  }

  function toggleMute() {
    if (!started) start();
    muted = !muted;
    localStorage.setItem(LS_KEY, muted ? '1' : '0');
    if (masterGain && ctx) {
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime + 0.3);
    }
    updateBtn();
  }

  function buildBtn() {
    const btn = document.createElement('button');
    btn.id = 'uc-audio-btn';
    btn.setAttribute('aria-label', 'Звук');
    btn.innerHTML = '&#9834;';
    Object.assign(btn.style, {
      position: 'fixed', top: 'max(64px, calc(env(safe-area-inset-top) + 48px))', right: '16px',
      width: '42px', height: '42px', borderRadius: '50%',
      background: 'rgba(20,20,45,0.85)', border: '1px solid #333366',
      color: '#8888cc', fontSize: '18px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '9999', transition: 'color .3s, border-color .3s',
      webkitTapHighlightColor: 'transparent', backdropFilter: 'blur(4px)'
    });
    btn.addEventListener('touchend', e => { e.preventDefault(); toggleMute(); });
    btn.addEventListener('click', toggleMute);
    document.body.appendChild(btn);
    updateBtn();
  }

  function updateBtn() {
    const btn = document.getElementById('uc-audio-btn');
    if (!btn) return;
    btn.style.color = muted ? '#444466' : '#8888cc';
    btn.style.borderColor = muted ? '#222244' : '#333366';
    btn.title = muted ? 'Включить звук' : 'Выключить звук';
  }

  function presetVoidDrone(vol) {
    const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 41.2;
    osc2.type = 'sine'; osc2.frequency.value = 41.2 * 1.5;
    lfo.frequency.value = 0.04; lfoGain.gain.value = vol * 0.3;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    osc.connect(g); osc2.connect(g); g.connect(masterGain);
    osc.start(); osc2.start(); lfo.start();
    ambientNodes.push(osc, osc2, lfo);
  }

  function presetAirNoise(vol) {
    const bufSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start();
    ambientNodes.push(src);
  }

  // --- Язык интерфейса → характер эха (метафора множественности) ------
  // Каждый язык — голос, вошедший в проект в свою эпоху (см. i18n.js:
  // SUPPORTED=['ru','en','es','fr','zh'] — порядок добавления в проект,
  // не какая-либо иерархия важности). Голос, пришедший позже/издалека,
  // несёт более длинный и тёплый след в пространстве; ближний — короче
  // и ярче. Сознательно НЕ про «как звучит культура X» — такое чтение
  // обсуждалось и отклонено 14.07 как стереотипное; здесь только дистанция
  // и множественность голосов, сходящихся в одну Сеть.
  const LANG_RESONANCE = {
    ru: { delay: 0.40, feedback: 0.45, cutoff: 1400 },
    en: { delay: 0.55, feedback: 0.55, cutoff: 1200 },
    es: { delay: 0.68, feedback: 0.60, cutoff: 1000 },
    fr: { delay: 0.80, feedback: 0.65, cutoff: 850  },
    zh: { delay: 0.95, feedback: 0.70, cutoff: 700  },
  };
  function getLangResonance() {
    let lang = 'ru';
    try { lang = (window.UC_I18N && UC_I18N.lang) || 'ru'; } catch (e) {}
    return LANG_RESONANCE[lang] || LANG_RESONANCE.ru;
  }

  function presetSpaceEcho(minGap, maxGap, vol) {
    if (!presetRunning) return;
    // Читаем множитель СЕЙЧАС, а не при первом вызове: характер и особенно
    // плотность Сети (фоновый fetch) могут «доехать» уже после старта
    // ambient — следующая итерация подхватит их сама, без перезапуска.
    const rm = getRhythmMul();
    const lr = getLangResonance();
    const t = ctx.currentTime;
    const freq = [110, 146, 165, 196][Math.floor(Math.random() * 4)];
    const osc = ctx.createOscillator(), g = ctx.createGain();
    const delay = ctx.createDelay(2.5), feedback = ctx.createGain(), delayFilter = ctx.createBiquadFilter();
    osc.type = 'sine'; osc.frequency.value = freq;
    delay.delayTime.value = lr.delay; feedback.gain.value = lr.feedback;
    delayFilter.type = 'lowpass'; delayFilter.frequency.value = lr.cutoff;
    const effVol = vol * rm.volMul;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(effVol, t + 1.2);
    g.gain.linearRampToValueAtTime(0, t + 3.5);
    osc.connect(g); g.connect(masterGain);
    g.connect(delay); delay.connect(delayFilter); delayFilter.connect(feedback);
    feedback.connect(delay); delay.connect(masterGain);
    osc.start(t); osc.stop(t + 3.6);
    // ВАЖНО: в рекурсию уходят БАЗОВЫЕ minGap/maxGap/vol, не effVol/effGap —
    // иначе множитель применялся бы повторно на каждой итерации и паузы
    // экспоненциально схлопнулись бы (или громкость улетела бы в ноль/бесконечность).
    const next = (minGap * rm.gapMul) + Math.random() * ((maxGap - minGap) * rm.gapMul);
    setTimeout(() => presetSpaceEcho(minGap, maxGap, vol), next * 1000);
  }

  // --- Petlya: хрупкий, стеклянный тембр (страница плетения шума).
  // Раньше petlya и index звучали ИДЕНТИЧНО — оба падали в generic
  // startAmbient(). Здесь принципиально другой регистр и другая физика
  // звука, не просто другие частоты того же дрона: основной тон поднят
  // в верхний регистр (220 Гц вместо гула 41-110 Гц), и обертон — не
  // чистая гармоника, а слегка расстроенная октава (×3.01, а не ×3) —
  // это и даёт медленные биения, на слух читающиеся как «стекло», а не
  // как ровный синус.
  function presetGlassDrone(vol) {
    const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 220;
    osc2.type = 'sine'; osc2.frequency.value = 220 * 3.01; // расстроенный обертон — биения, не чистая гармоника
    g2.gain.value = 0.16; // верхний обертон заметно тише основного тона
    lfo.frequency.value = 0.06; lfoGain.gain.value = vol * 0.25;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    osc.connect(g);
    osc2.connect(g2); g2.connect(g);
    g.connect(masterGain);
    osc.start(); osc2.start(); lfo.start();
    ambientNodes.push(osc, osc2, lfo);
  }

  // Перезвон — не пульс генератора (тот жил в среднем регистре 200-600 Гц
  // с быстрым спадом), а звон: высокий регистр (E5-D6), пара расстроенных
  // осцилляторов вместо одного (та же логика биений, что в дроне), резкая
  // атака и долгий экспоненциальный хвост — как удар по стеклу, а не тон.
  // highpass вместо bandpass у оригинала: там, где networkPulse вырезает
  // узкую полосу вокруг частоты, здесь просто срезан низ — звенит весь верх.
  function presetGlassChime(minGap, maxGap, vol) {
    if (!presetRunning) return;
    const rm = getRhythmMul();
    const t = ctx.currentTime;
    const scale = [659.3, 784, 880, 987.8, 1174.7]; // E5 G5 A5 B5 D6
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine'; osc.frequency.value = freq;
    osc2.type = 'sine'; osc2.frequency.value = freq * 2.006; // расстроенная октава — то же биение, что в дроне
    filter.type = 'highpass'; filter.frequency.value = 500;
    const effVol = vol * rm.volMul;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(effVol, t + 0.02);              // резкая атака — щелчок по стеклу
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.8 + Math.random() * 1.2); // долгий хвост
    osc.connect(filter); osc2.connect(filter); filter.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 3.2);
    osc2.start(t); osc2.stop(t + 3.2);
    // рекурсия — по БАЗОВЫМ minGap/maxGap, см. комментарий в presetSpaceEcho
    const next = (minGap * rm.gapMul) + Math.random() * ((maxGap - minGap) * rm.gapMul);
    setTimeout(() => presetGlassChime(minGap, maxGap, vol), next * 1000);
  }

  function presetNetworkPulse(minGap, maxGap, vol, pairChance) {
    if (!presetRunning) return;
    const rm = getRhythmMul();
    const t = ctx.currentTime;
    const freq = 200 + Math.random() * 400;
    const osc = ctx.createOscillator(), g = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = 'triangle'; osc.frequency.value = freq;
    filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 8;
    const effVol = vol * rm.volMul;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(effVol, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.5 + Math.random() * 0.4);
    osc.connect(filter); filter.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 1);
    // рекурсия — по БАЗОВЫМ minGap/maxGap/pairChance, см. presetSpaceEcho
    const next = (minGap * rm.gapMul) + Math.random() * ((maxGap - minGap) * rm.gapMul);
    setTimeout(() => presetNetworkPulse(minGap, maxGap, vol, pairChance), next * 1000);
    const effPairChance = Math.min(0.95, pairChance * rm.pairMul);
    if (Math.random() < effPairChance) {
      setTimeout(() => presetNetworkPulse(minGap, maxGap, vol, pairChance), (next + 0.3) * 1000);
    }
  }

  // --- Materials A+D: низкий дрон-фундамент ---
  function presetDroneBase(vol) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 48;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.5);
    osc.connect(g); g.connect(masterGain);
    osc.start();
    ambientNodes.push(osc);
  }

  // --- Materials A+D: медленно плывущие ноты пентатоники, легато ---
  function presetMelodicLayer() {
    if (!presetRunning) return;
    const t = ctx.currentTime;
    const scale = [110, 130.8, 146.8, 164.8, 196]; // A C D E G от A2
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const octaveUp = Math.random() < 0.4 ? 2 : 1;
    const osc = ctx.createOscillator(), g = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = freq * octaveUp;
    filter.type = 'lowpass'; filter.frequency.value = 1200;
    const dur = 3 + Math.random() * 2.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.05, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(filter); filter.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + dur + 0.2);
    const next = 1.5 + Math.random() * 2;
    setTimeout(presetMelodicLayer, next * 1000);
  }

  // --- Materials A+D: регулярный мягкий низкочастотный пульс (heartbeat) ---
  function presetHeartbeat(bpm, vol, freq, shape) {
    if (!presetRunning) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = shape || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.25);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.4);
    const interval = 60 / bpm;
    setTimeout(() => presetHeartbeat(bpm, vol, freq, shape), interval * 1000);
  }

  // --- Materials: общий "разлёт частиц" — используется и прошивом, и разрывом ---
  function materialsSparkles(t, count, baseFreq, vol, spread) {
    for (let i = 0; i < count; i++) {
      const delay = Math.random() * spread;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = baseFreq + Math.random() * baseFreq * 1.5;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(vol * (0.5 + Math.random() * 0.5), t + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.15 + Math.random() * 0.2);
      osc.connect(g); g.connect(masterGain);
      osc.start(t + delay); osc.stop(t + delay + 0.4);
    }
  }

  // --- Materials: ПРОШИВ — острый укол + свист на длительность прохода ---
  function fxSparks(passDuration) {
    if (!ctx) initCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const dur = typeof passDuration === 'number' ? passDuration : 0.12;

    const click = ctx.createOscillator(), clickG = ctx.createGain(), clickF = ctx.createBiquadFilter();
    click.type = 'square';
    click.frequency.setValueAtTime(2200, t);
    clickF.type = 'highpass'; clickF.frequency.value = 1500;
    clickG.gain.setValueAtTime(0.14, t);
    clickG.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    click.connect(clickF); clickF.connect(clickG); clickG.connect(masterGain);
    click.start(t); click.stop(t + 0.04);

    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + dur);
    g.gain.setValueAtTime(0.05, t);
    if (dur > 0.8) {
      g.gain.linearRampToValueAtTime(0.035, t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0.045, t + dur * 0.8);
    }
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + dur + 0.05);

    if (dur > 0.8) {
      const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
      lfo.frequency.value = 5 + Math.random() * 2;
      lfoGain.gain.value = 15;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }

    materialsSparkles(t + 0.01, 6, 800, 0.03, Math.min(dur * 0.5, 0.2));

    if (dur > 0.8) {
      const stitchCount = Math.floor(dur * 1.5);
      for (let i = 0; i < stitchCount; i++) {
        const delay = (Math.random() * 0.6 + 0.2) * (dur / stitchCount) * (i + 1);
        const stitch = ctx.createOscillator(), stitchG = ctx.createGain();
        stitch.type = 'square';
        stitch.frequency.value = 1800 + Math.random() * 600;
        stitchG.gain.setValueAtTime(0.03, t + delay);
        stitchG.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.02);
        stitch.connect(stitchG); stitchG.connect(masterGain);
        stitch.start(t + delay); stitch.stop(t + delay + 0.03);
      }
    }
  }

  // --- Materials: РАЗРЫВ — тяжёлый удар + разрезание + широкий разлёт искр ---
  function fxExplode() {
    if (!ctx) initCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.55);

    const cut = ctx.createOscillator(), cutG = ctx.createGain(), cutF = ctx.createBiquadFilter();
    cut.type = 'sawtooth';
    cut.frequency.setValueAtTime(800, t);
    cut.frequency.exponentialRampToValueAtTime(100, t + 0.2);
    cutF.type = 'highpass'; cutF.frequency.value = 600;
    cutG.gain.setValueAtTime(0.08, t);
    cutG.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    cut.connect(cutF); cutF.connect(cutG); cutG.connect(masterGain);
    cut.start(t); cut.stop(t + 0.25);

    materialsSparkles(t + 0.1, 16, 200, 0.06, 0.5);
  }

  // --- Materials: ЗАХВАТ кораблём — всасывающий sweep + частицы сходятся ---
  function fxShipCapture() {
    if (!ctx) initCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const dur = 1.4; // под реальную длительность swallow (~1.39с при swp+=0.012/кадр)

    const osc = ctx.createOscillator(), g = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + dur);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.16, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08);
    osc.connect(filter); filter.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + dur + 0.1);

    const click = ctx.createOscillator(), clickG = ctx.createGain();
    click.type = 'sine'; click.frequency.value = 1800;
    clickG.gain.setValueAtTime(0.05, t + dur);
    clickG.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.06);
    click.connect(clickG); clickG.connect(masterGain);
    click.start(t + dur); click.stop(t + dur + 0.08);

    // частицы сходятся к точке поглощения — обратный разлёту
    for (let i = 0; i < 12; i++) {
      const delay = Math.random() * dur * 0.6;
      const startFreq = 200 + Math.random() * 600;
      const sOsc = ctx.createOscillator(), sG = ctx.createGain();
      sOsc.type = 'sine';
      sOsc.frequency.setValueAtTime(startFreq, t + delay);
      sOsc.frequency.exponentialRampToValueAtTime(60, t + dur);
      sG.gain.setValueAtTime(0, t + delay);
      sG.gain.linearRampToValueAtTime(0.04 * (0.4 + Math.random() * 0.4), t + delay + 0.05);
      sG.gain.linearRampToValueAtTime(0.04 * 0.6, t + dur - 0.05);
      sG.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
      sOsc.connect(sG); sG.connect(masterGain);
      sOsc.start(t + delay); sOsc.stop(t + dur + 0.1);
    }
  }

  function startPreset(name) {
    if (presetStarted) return;
    presetStarted = true;
    presetRunning = true;

    if (!started) start();
    initCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const launch = () => {
      if (name === 'setBalance') {
        presetVoidDrone(0.05);
        presetAirNoise(0.012);
        // ритмичнее: пара идёт чуть чаще, и удвоения (pairChance) выросли
        // заметно — созвездие должно ощущаться живее implant, не только
        // тише/громче, а именно ЧАЩЕ происходящим.
        setTimeout(() => presetSpaceEcho(5, 10, 0.1), 800);
        setTimeout(() => presetNetworkPulse(1.2, 4, 0.025, 0.45), 2000);
      } else if (name === 'implantMinimal') {
        // тише и разреженнее: громкости снижены ещё, паузы между событиями
        // раздвинуты дальше, двойные импульсы почти выключены (0.05→0.015) —
        // implant должен ощущаться как пауза для чтения, а не фон с делами.
        presetVoidDrone(0.025);
        setTimeout(() => presetSpaceEcho(18, 30, 0.055), 1500);
        setTimeout(() => presetNetworkPulse(8, 16, 0.012, 0.015), 4000);
      } else if (name === 'petlyaGlass') {
        presetGlassDrone(0.025);
        setTimeout(() => presetGlassChime(4, 9, 0.03), 1000);
      } else if (name === 'materialsAD') {
        presetDroneBase(0.035);
        presetMelodicLayer();
        presetHeartbeat(48, 0.07, 60, 'sine');
      }
    };

    launch();
  }

  function pageAmbientName() {
    const file = location.pathname.split('/').pop() || '';
    if (file === 'set.html') return 'setBalance';
    if (file === 'implant.html') return 'implantMinimal';
    if (file === 'materials.html') return 'materialsAD';
    if (file === 'petlya.html') return 'petlyaGlass';
    return null; // index.html — единственная страница на generic startAmbient()
  }

  function launchForPage() {
    const preset = pageAmbientName();
    if (preset) startPreset(preset);
    else start();
  }

  function firstGesture() {
    launchForPage();
    document.removeEventListener('touchend', firstGesture);
    document.removeEventListener('click', firstGesture);
  }

  function boot() {
    // Плотность Сети — фоновый запрос сразу при загрузке, а не по жесту.
    // Есть запас времени до реального старта эмбиента (первый тап/переход) —
    // часто fetch успеет разрешиться заранее. Если нет — presetSpaceEcho/
    // NetworkPulse/GlassChime подхватят значение на следующей же итерации.
    try { loadNetDensity(); } catch (e) {}

    if (sessionStorage.getItem('uc_audio_came_from_nav') === '1' && !muted) {
      sessionStorage.removeItem('uc_audio_came_from_nav');
      try {
        launchForPage();
        // Автозапуск без настоящего тапа (переход между страницами) может на
        // Android тихо не получить 'running' (resume() без жеста не срабатывает).
        // Если контекст не реально запущен — снимаем флаги, чтобы следующий
        // настоящий тап не упёрся в "уже запущено" и по-настоящему стартовал звук.
        setTimeout(() => {
          if (ctx && ctx.state !== 'running') {
            started = false;
            presetStarted = false;
            presetRunning = false;
          }
        }, 300);
      } catch (e) {}
    }
    document.addEventListener('touchend', firstGesture);
    document.addEventListener('click', firstGesture);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.UCAudio = {
    fx: fx,
    speak: speak, // голос эссенций — через уже разблокированный ctx, см. фикс 16.07
    speakFail: () => lastSpeakFail, // причина последнего молчания, для Журнала
    toggleMute: toggleMute,
    isMuted: () => muted,
    start: start,
    prepNav: prepNav,
    startPreset: startPreset
  };
})();
