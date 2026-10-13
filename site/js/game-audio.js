// Sound for the "Spot the real resources" game, synthesised live with the Web Audio API (no audio files).
//   window.MirageGameAudio.start()      begin the background music (call from a click, so browsers allow sound)
//   .stop()                             fade the music out
//   .correct() .decoy() .unlock()       game sound effects
//   .win() .lose() .glitch() .breakIn() .tick()
//   .urgency(level)                     0 = calm, 1 = heartbeat (time is low), 2 = fast heartbeat
//   .muted / .setMuted(bool)            remembered in localStorage
// Without this file the game simply runs silently.
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  let ctx, out, sfxBus, musicBus, verb, delay, music = null, beatTimer = null, beatLevel = 0;
  let muted = false;
  try { muted = localStorage.getItem('mirage-game-muted') === '1'; } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    out = ctx.createGain(); out.gain.value = muted ? 0 : .9;
    out.connect(comp).connect(ctx.destination);
    sfxBus = gain(.8, out);
    musicBus = gain(0, out);
    // a long dark reverb (generated impulse) and an echo, shared by everything
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    verb.connect(gain(.55, out));
    delay = ctx.createDelay(1); delay.delayTime.value = .42;
    const fb = gain(.42); delay.connect(fb).connect(delay); delay.connect(gain(.5, verb)); delay.connect(gain(.35, out));
  }
  const now = () => ctx.currentTime;
  function gain(v, to) { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
  function osc(type, f, to) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (to) o.connect(to); return o; }
  // an envelope: silent -> peak in `a` seconds -> silent over `d` seconds
  function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noise(seconds) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  }
  function filter(type, f, q, to) { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q != null) x.Q.value = q; if (to) x.connect(to); return x; }
  function shaper(amount, to) {
    const ws = ctx.createWaveShaper(), n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; curve[i] = (1 + amount) * x / (1 + amount * Math.abs(x)); }
    ws.curve = curve; if (to) ws.connect(to); return ws;
  }
  // a cold bell: a sine plus inharmonic partials
  function bell(f, t, peak, to, len = 2.4) {
    [[1, 1], [2.76, .35], [5.4, .18], [8.93, .08]].forEach(([m, v]) => {
      const g = gain(0, to); env(g, t, .004, len / m * 1.6, peak * v);
      const o = osc('sine', f * m, g); o.start(t); o.stop(t + len * 1.7);
    });
  }

  // ---------- sound effects ----------
  const SFX = {
    // a real resource: a clear, rising two-note chime
    correct() {
      const t = now(), bus = gain(1, sfxBus); bus.connect(gain(.35, verb));
      [[880, 0], [1318.5, .09]].forEach(([f, dt]) => {
        const g = gain(0, bus); env(g, t + dt, .006, .5, .32);
        const o = osc('triangle', f, g); o.start(t + dt); o.stop(t + dt + .7);
        const s = gain(0, bus); env(s, t + dt, .004, .25, .08); const o2 = osc('sine', f * 2, s); o2.start(t + dt); o2.stop(t + dt + .4);
      });
    },
    // a decoy: a low hit that drops away, a distorted snarl and a burst of static
    decoy() {
      const t = now();
      const thud = gain(0, sfxBus); env(thud, t, .005, .55, 1);
      const o1 = osc('sine', 150, thud); o1.frequency.exponentialRampToValueAtTime(32, t + .5); o1.start(t); o1.stop(t + .7);
      const lp = filter('lowpass', 1400, 2, null); const g2 = gain(0, sfxBus); env(g2, t, .01, .6, .45);
      lp.connect(g2); lp.connect(gain(.4, verb));
      const sh = shaper(40, lp);
      const o2 = osc('sawtooth', 210, sh); o2.frequency.exponentialRampToValueAtTime(48, t + .6); o2.start(t); o2.stop(t + .8);
      const o3 = osc('sawtooth', 213, sh); o3.frequency.exponentialRampToValueAtTime(46, t + .6); o3.start(t); o3.stop(t + .8);
      const n = noise(.35), bp = filter('bandpass', 2200, .8, null), g3 = gain(0, sfxBus); env(g3, t, .002, .28, .35);
      n.connect(bp).connect(g3); n.start(t);
    },
    // a section unlocks: a creaking door and a cold bell
    unlock() {
      const t = now();
      const creak = gain(0, sfxBus); env(creak, t, .08, 1.1, .22); creak.connect(gain(.5, verb));
      const bp = filter('bandpass', 900, 6, creak);
      const o = osc('sawtooth', 38, bp);
      for (let k = 0; k < 14; k++) o.frequency.setValueAtTime(30 + Math.random() * 40, t + k * .08);
      o.start(t); o.stop(t + 1.3);
      bell(392, t + .35, .16, gain(1, sfxBus));
      bell(392, t + .35, .12, delay);
    },
    // a whisper of static under a heading glitch
    glitch() {
      const t = now(), n = noise(.18), hp = filter('highpass', 3000, .7, null), g = gain(0, sfxBus);
      env(g, t, .002, .14, .12); n.connect(hp).connect(g); n.start(t);
    },
    // the site breaks: a tearing burst of static over a sub-bass drop
    breakIn() {
      const t = now(), n = noise(1.3), lp = filter('lowpass', 6000, 1, null), g = gain(0, sfxBus);
      lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(180, t + 1.1);
      env(g, t, .01, 1.1, .5); n.connect(lp).connect(g); lp.connect(gain(.5, verb)); n.start(t);
      const sub = gain(0, sfxBus); env(sub, t + .05, .02, 1.6, 1);
      const o = osc('sine', 70, sub); o.frequency.exponentialRampToValueAtTime(22, t + 1.5); o.start(t); o.stop(t + 1.9);
      [0, .18, .43].forEach((dt) => { const c = noise(.06), hp = filter('highpass', 2500, .7, null), cg = gain(0, sfxBus); env(cg, t + dt, .001, .05, .4); c.connect(hp).connect(cg); c.start(t + dt); });
    },
    tick() {
      const t = now(), g = gain(0, sfxBus); env(g, t, .002, .05, .15); const o = osc('square', 1800, filter('bandpass', 1800, 4, g)); o.start(t); o.stop(t + .1);
    },
    win() {
      const t = now(), bus = gain(1, sfxBus); bus.connect(gain(.4, verb));
      [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => bell(f, t + k * .16, .2, bus, 2.8));
    },
    lose() {
      const t = now();
      const boom = gain(0, sfxBus); env(boom, t, .01, 2, .9);
      const b = osc('sine', 90, boom); b.frequency.exponentialRampToValueAtTime(24, t + 1.8); b.start(t); b.stop(t + 2.2);
      const lp = filter('lowpass', 900, 1, null), g = gain(0, sfxBus); env(g, t, .05, 2.6, .3); lp.connect(g); lp.connect(gain(.6, verb));
      [110, 116.5, 155.6].forEach((f) => { const o = osc('sawtooth', f, lp); o.frequency.exponentialRampToValueAtTime(f / 2, t + 2.4); o.start(t); o.stop(t + 2.8); });
    },
  };
  function heartbeat() {
    const t = now();
    [[0, 1], [.24, .7]].forEach(([dt, v]) => {
      const g = gain(0, sfxBus); env(g, t + dt, .008, .22, .7 * v);
      const o = osc('sine', 62, g); o.frequency.exponentialRampToValueAtTime(38, t + dt + .2); o.start(t + dt); o.stop(t + dt + .35);
    });
  }

  // ---------- background music: a dark generative drone with distant bells and wind ----------
  function startMusic() {
    if (music) return;
    const t = now(), nodes = [];
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(.55, t + 3);
    // the drone: detuned low saws under a slowly breathing filter
    const lp = filter('lowpass', 380, 3, gain(.32, musicBus));
    const lfo = osc('sine', .05), lfoAmt = gain(220); lfo.connect(lfoAmt).connect(lp.frequency); lfo.start(); nodes.push(lfo);
    [[55, 'sawtooth', .5], [55.4, 'sawtooth', .5], [82.4, 'sawtooth', .22], [27.5, 'sine', .9]].forEach(([f, type, v]) => {
      const o = osc(type, f, gain(v, lp)); o.start(); nodes.push(o);
    });
    // a minor second that swells in and out, for unease
    const tense = gain(0, musicBus), tlfo = osc('sine', .03), tAmt = gain(.05);
    tlfo.connect(tAmt).connect(tense.gain); tlfo.start(); nodes.push(tlfo);
    const tf = filter('lowpass', 900, 1, tense);
    [[233.1, 'triangle'], [246.9, 'triangle']].forEach(([f, type]) => { const o = osc(type, f, gain(.5, tf)); o.start(); nodes.push(o); });
    // wind
    const w = noise(8); w.loop = true;
    const wf = filter('bandpass', 500, .9, gain(.09, musicBus)), wl = osc('sine', .07), wAmt = gain(380);
    wl.connect(wAmt).connect(wf.frequency); wl.start(); w.connect(wf); w.start(); nodes.push(w, wl);
    // distant bells on a diminished scale, every few seconds, echoing
    const SCALE = [440, 523.25, 622.25, 739.99, 880, 1046.5];
    let timer;
    const ring = () => {
      const f = SCALE[Math.floor(Math.random() * SCALE.length)] / (Math.random() < .5 ? 2 : 1);
      const g = gain(1, delay); bell(f, now() + .02, .07, g, 3);
      const d = gain(1, musicBus); bell(f, now() + .02, .05, d, 3);
      timer = setTimeout(ring, 2600 + Math.random() * 3800);
    };
    timer = setTimeout(ring, 1800);
    music = { nodes, stopBells: () => clearTimeout(timer) };
  }
  function stopMusic() {
    setUrgency(0);
    if (!music) return;
    const m = music; music = null;
    m.stopBells();
    const t = now();
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(0, t + 1.4);
    setTimeout(() => m.nodes.forEach((n) => { try { n.stop(); } catch (e) {} }), 1600);
  }
  function setUrgency(level) {
    if (level === beatLevel) return;
    beatLevel = level;
    clearInterval(beatTimer);
    if (level && ctx) { heartbeat(); beatTimer = setInterval(heartbeat, level === 2 ? 560 : 900); }
  }

  const safe = (fn) => (...a) => { try { init(); fn(...a); } catch (e) {} };
  window.MirageGameAudio = {
    start: safe(startMusic), stop: () => { if (ctx) stopMusic(); },
    correct: safe(SFX.correct), decoy: safe(SFX.decoy), unlock: safe(SFX.unlock), glitch: safe(SFX.glitch), win: safe(SFX.win), lose: safe(SFX.lose),
    breakIn: safe(SFX.breakIn), tick: safe(SFX.tick),
    urgency: (l) => { if (ctx) setUrgency(l); },
    get muted() { return muted; },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('mirage-game-muted', muted ? '1' : '0'); } catch (e) {}
      if (ctx) { const t = now(); out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(muted ? 0 : .9, t, .05); }
    },
  };
  // pause sound while the tab is hidden, like the game clock
  document.addEventListener('visibilitychange', () => { if (!ctx) return; document.hidden ? ctx.suspend() : ctx.resume(); });
})();
