/* ============================================================
   UnityCode · Global Audio Module
   Web Audio синтез + BT-носитель для iOS
   Подключение: <script src="audio.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  // Тихий зацикленный WAV — держит медиа-сессию iOS на текущем выходе (вкл. Bluetooth)
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

  const LS_KEY = 'uc_audio_muted';
  const MASTER_VOL = 0.55;

  let ctx = null;
  let masterGain = null;
  let carrier = null;        // <audio> носитель сессии
  let started = false;
  let muted = localStorage.getItem(LS_KEY) === '1';
  let ambientNodes = [];

  // ---------- Инициализация ----------
  function initCtx() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime + 1.2);
    masterGain.connect(ctx.destination);
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

  // ---------- Запуск всей системы (внутри user gesture) ----------
  function start() {
    if (started) return;
    started = true;
    startCarrier();          // 1. носитель сессии для BT
    initCtx();               // 2. web audio
    if (ctx.state === 'suspended') ctx.resume();
    setTimeout(startAmbient, 300);
    updateBtn();
  }

  // ---------- Плавный уход со страницы ----------
  function fadeOutForNav() {
    if (!ctx || !masterGain) return;
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.8);
  }
  window.addEventListener('pagehide', fadeOutForNav);
  window.addEventListener('beforeunload', fadeOutForNav);

  // Эффект перехода "Портал → Бездна": мягкий портал на -2 окт. затухает,
  // дыхание бездны подхватывает на хвосте — без провала тишины.
  function fxSubspace() {
    if (!ctx || muted) return;
    fxPortal();
    setTimeout(fxAbyss, 900);
  }

  function fxPortal() {
    const t = ctx.currentTime;
    const dur = 1.4;
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
    const dur = 1.8;
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
    fadeOutForNav();
    sessionStorage.setItem('uc_audio_came_from_nav', '1');
  }

  // Переход на внутреннюю страницу через обычные <a href>: fade-out + эффект
  // подпространства, затем честная навигация с задержкой под длительность эффекта.
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || a.target === '_blank') return;
    if (!started) return; // звук ещё не запущен — переход как обычно

    e.preventDefault();
    fxSubspace();
    prepNav();
    setTimeout(() => { window.location.href = href; }, 900);
  }, true);

  // ---------- Ambient ----------
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
    // fade-in вместо мгновенного скачка — убирает щелчок старта
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

  // ---------- Эффекты ----------
  function fx(type) {
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
    }
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

  // ---------- Mute ----------
  function toggleMute() {
    if (!started) start();
    muted = !muted;
    localStorage.setItem(LS_KEY, muted ? '1' : '0');
    if (masterGain && ctx) {
      masterGain.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime + 0.3);
    }
    updateBtn();
  }

  // ---------- Кнопка ----------
  function buildBtn() {
    const btn = document.createElement('button');
    btn.id = 'uc-audio-btn';
    btn.setAttribute('aria-label', 'Звук');
    btn.innerHTML = '&#9834;'; // ♪
    Object.assign(btn.style, {
      position: 'fixed', bottom: '20px', right: '20px',
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

  // ---------- Автозапуск при первом жесте ----------
  function firstGesture() {
    start();
    document.removeEventListener('touchend', firstGesture);
    document.removeEventListener('click', firstGesture);
  }

  function boot() {
    buildBtn();
    if (sessionStorage.getItem('uc_audio_came_from_nav') === '1' && !muted) {
      sessionStorage.removeItem('uc_audio_came_from_nav');
      try { start(); } catch (e) { /* если браузер блокирует — ждём тап */ }
    }
    document.addEventListener('touchend', firstGesture);
    document.addEventListener('click', firstGesture);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ---------- Публичный API ----------
  window.UCAudio = {
    fx: fx,
    toggleMute: toggleMute,
    isMuted: () => muted,
    start: start,
    prepNav: prepNav
  };
})();
