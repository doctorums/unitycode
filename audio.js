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

  let ctx = null;
  let masterGain = null;
  let carrier = null;
  let started = false;
  let muted = localStorage.getItem(LS_KEY) === '1';
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

  function start() {
    if (started) return;
    started = true;
    startCarrier();
    initCtx();
    if (ctx.state === 'suspended') ctx.resume();
    setTimeout(startAmbient, 300);
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

  function presetSpaceEcho(minGap, maxGap, vol) {
    if (!presetRunning) return;
    const t = ctx.currentTime;
    const freq = [110, 146, 165, 196][Math.floor(Math.random() * 4)];
    const osc = ctx.createOscillator(), g = ctx.createGain();
    const delay = ctx.createDelay(2.5), feedback = ctx.createGain(), delayFilter = ctx.createBiquadFilter();
    osc.type = 'sine'; osc.frequency.value = freq;
    delay.delayTime.value = 0.55; feedback.gain.value = 0.55;
    delayFilter.type = 'lowpass'; delayFilter.frequency.value = 1200;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 1.2);
    g.gain.linearRampToValueAtTime(0, t + 3.5);
    osc.connect(g); g.connect(masterGain);
    g.connect(delay); delay.connect(delayFilter); delayFilter.connect(feedback);
    feedback.connect(delay); delay.connect(masterGain);
    osc.start(t); osc.stop(t + 3.6);
    const next = minGap + Math.random() * (maxGap - minGap);
    setTimeout(() => presetSpaceEcho(minGap, maxGap, vol), next * 1000);
  }

  function presetNetworkPulse(minGap, maxGap, vol, pairChance) {
    if (!presetRunning) return;
    const t = ctx.currentTime;
    const freq = 200 + Math.random() * 400;
    const osc = ctx.createOscillator(), g = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = 'triangle'; osc.frequency.value = freq;
    filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 8;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.5 + Math.random() * 0.4);
    osc.connect(filter); filter.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 1);
    const next = minGap + Math.random() * (maxGap - minGap);
    setTimeout(() => presetNetworkPulse(minGap, maxGap, vol, pairChance), next * 1000);
    if (Math.random() < pairChance) {
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
        setTimeout(() => presetSpaceEcho(6, 14, 0.1), 800);
        setTimeout(() => presetNetworkPulse(1.5, 5, 0.025, 0.3), 2000);
      } else if (name === 'implantMinimal') {
        presetVoidDrone(0.03);
        setTimeout(() => presetSpaceEcho(14, 24, 0.07), 1500);
        setTimeout(() => presetNetworkPulse(6, 12, 0.015, 0.05), 4000);
      } else if (name === 'materialsAD') {
        presetDroneBase(0.035);
        presetMelodicLayer();
        presetHeartbeat(48, 0.07, 60, 'sine');
      }
    };

    setTimeout(launch, 350);
  }

  function pageAmbientName() {
    const file = location.pathname.split('/').pop() || '';
    if (file === 'set.html') return 'setBalance';
    if (file === 'implant.html') return 'implantMinimal';
    if (file === 'materials.html') return 'materialsAD';
    return null;
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
    if (sessionStorage.getItem('uc_audio_came_from_nav') === '1' && !muted) {
      sessionStorage.removeItem('uc_audio_came_from_nav');
      try { launchForPage(); } catch (e) {}
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
    toggleMute: toggleMute,
    isMuted: () => muted,
    start: start,
    prepNav: prepNav,
    startPreset: startPreset
  };
})();
