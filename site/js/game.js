// "Spot the real resources": an opt-in game on the home page.
// A "Play a game!!" tab hops on the right edge; it opens a ribbon ("Will you play a short game?").
// Yes -> rules -> the site "breaks" into a spooky playground: find every real resource in a section
// (decoys are mixed in) to unlock the next one. 5 lives, 100 seconds; a decoy costs 1 life and 10 seconds.
// `?game=off` hides the invitation.
(function () {
  if (new URLSearchParams(location.search).get('game') === 'off') return;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const lenis = () => window.__mirageLenis;
  const scrollToEl = (target, opts = {}) => {
    const y = target.getBoundingClientRect().top + scrollY - 72;
    lenis() ? lenis().scrollTo(y, { duration: 1.2, force: true, ...opts }) : window.scrollTo({ top: y, behavior: reduce || opts.immediate ? 'auto' : 'smooth' });
  };

  // ---- the resources ----
  // real ones are named plainly for their job; decoys are bait. Later sections use subtler decoy names
  // (look-alikes of real ones), and those decoys carry a faint visual tell instead.
  const REAL = [['billing-db', 'i-database'], ['orders-api', 'i-server'], ['ci-runner-role', 'i-key'], ['web-frontend', 'i-server'], ['payments-queue', 'i-workflow'],
    ['auth-service', 'i-lock'], ['logs-bucket', 'i-layers'], ['metrics-collector', 'i-brain'], ['user-profile-db', 'i-database'], ['deploy-pipeline', 'i-workflow'],
    ['cdn-assets', 'i-layers'], ['search-index', 'i-database'], ['email-worker', 'i-server'], ['invoice-store', 'i-layers'], ['session-cache', 'i-database'],
    ['inventory-api', 'i-server'], ['analytics-etl', 'i-workflow'], ['vpn-gateway', 'i-lock'], ['alerting-hook', 'i-bell'], ['k8s-node-pool', 'i-server']];
  const BAIT = [['admin-creds-backup', 'i-key'], ['root-key-old', 'i-key'], ['prod-db-copy', 'i-database'], ['secrets-dump', 'i-lock'], ['aws-keys-temp', 'i-key'],
    ['domain-admin-token', 'i-key'], ['terraform-state.bak', 'i-layers'], ['finance-export-2023', 'i-layers'], ['ceo-mailbox-archive', 'i-layers'], ['passwords-vault-old', 'i-lock']];
  const SUBTLE = [['billing-db-replica-old', 'i-database'], ['ci-runner-role-admin', 'i-key'], ['orders-api-legacy', 'i-server'], ['auth-service-debug', 'i-lock'],
    ['logs-bucket-public', 'i-layers'], ['payments-queue-test', 'i-workflow'], ['deploy-pipeline-keys', 'i-workflow'], ['user-profile-db-snapshot', 'i-database'],
    ['web-frontend-staging-admin', 'i-server'], ['session-cache-dump', 'i-database'], ['vpn-gateway-break-glass', 'i-lock'], ['metrics-collector-root', 'i-brain']];
  // [section, real pieces, decoys, subtle?]
  const LEVELS = [['#problem', 2, 1, 0], ['#process', 2, 2, 0], ['#in-action', 2, 2, 0], ['#architecture', 2, 2, 0], ['#different', 2, 2, 1],
    ['#advantages', 2, 3, 1], ['#coverage', 2, 2, 1], ['#quickstart', 2, 3, 1], ['.pitch', 2, 3, 1]];
  const LIVES = 5, TIME = 100, PENALTY = 10;

  const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const piece = ([name, icon], cls = '') => `<button type="button" class="gm-piece ${cls}" aria-label="Resource ${name}"><span class="ico"><svg><use href="#${icon}" /></svg></span><span class="nm">${name}</span></button>`;

  // =====================================================================
  // 1. the invitation
  // =====================================================================
  const tab = el('button', 'gm-tab', '<i></i>Play a game!!');
  tab.type = 'button';
  tab.setAttribute('aria-label', 'Open: play a short game');
  const ribbon = el('div', 'gm-ribbon', '<b>Will you play a short game?</b><span class="acts"><button type="button" class="gm-btn yes">Yes</button><button type="button" class="gm-btn no">No</button></span>');
  ribbon.setAttribute('role', 'dialog');
  ribbon.setAttribute('aria-label', 'Play a short game');
  document.body.append(tab, ribbon);
  const showTab = () => { tab.hidden = false; requestAnimationFrame(() => tab.classList.add('in', 'hop')); };
  const hideTab = () => { tab.classList.remove('in', 'hop'); };
  const ready = () => setTimeout(showTab, 2000);
  root.classList.contains('is-ready') ? ready() : document.addEventListener('mirage:ready', ready, { once: true });
  tab.addEventListener('click', () => { hideTab(); ribbon.classList.add('open'); $('.yes', ribbon).focus({ preventScroll: true }); });
  // No, a click anywhere outside the ribbon, or Escape: fold it back into the tab
  const closeRibbon = () => { if (!ribbon.classList.contains('open')) return; ribbon.classList.remove('open'); setTimeout(showTab, 450); };
  $('.no', ribbon).addEventListener('click', closeRibbon);
  document.addEventListener('pointerdown', (e) => { if (!ribbon.contains(e.target)) closeRibbon(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRibbon(); });
  $('.yes', ribbon).addEventListener('click', () => { ribbon.classList.remove('open'); rules(); });

  // ---- modal helper ----
  function modal(html) {
    const m = el('div', 'gm-modal', `<div class="gm-card" role="dialog" aria-modal="true">${html}</div>`);
    document.body.appendChild(m);
    requestAnimationFrame(() => m.classList.add('show'));
    const close = () => new Promise((r) => { m.classList.remove('show'); setTimeout(() => { m.remove(); r(); }, 350); });
    setTimeout(() => { const b = $('.gm-btn', m); if (b) b.focus({ preventScroll: true }); }, 60);
    return { m, close };
  }

  // =====================================================================
  // 2. rules
  // =====================================================================
  function rules() {
    const { m, close } = modal(`
      <h2>Spot the real resources</h2>
      <p>Your cloud is full of resources, and some of them are decoys. Find the real ones before the attacker does.</p>
      <ul class="gm-rules">
        <li><span>Click every <b>real resource</b> in a section to unlock the next one. Reach the end to win.</span></li>
        <li><span>You have <b>${LIVES} lives</b> and <b>${TIME} seconds</b>. Touching a decoy costs <b>1 life and ${PENALTY} seconds</b>.</span></li>
        <li><span>Real resources are named plainly for their job. Decoys are <b>bait</b>: they look valuable, old, copied or over-privileged.</span></li>
        <li><span>Later on the names get subtler, but decoys leave a <b>faint visual trace</b>. Look closely.</span></li>
      </ul>
      <div class="gm-examples">
        <figure>${piece(['billing-db', 'i-database'])}real</figure>
        <figure>${piece(['admin-creds-backup', 'i-key'])}decoy (bait)</figure>
        <figure>${piece(['billing-db-replica-old', 'i-database'], 'tell')}decoy (subtle)</figure>
      </div>
      <div class="acts"><button type="button" class="gm-btn yes">Start</button><button type="button" class="gm-btn no">Not now</button></div>`);
    $('.yes', m).addEventListener('click', () => { A('breakIn'); A('start'); close().then(start); });
    $('.no', m).addEventListener('click', () => close().then(showTab));
  }

  // =====================================================================
  // 3. the game
  // =====================================================================
  let S = null; // game state
  // sound (js/game-audio.js); the game runs silently if that file isn't loaded
  const A = (name, ...args) => { const a = window.MirageGameAudio; if (a && a[name]) a[name](...args); };
  const SPEAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path class="w1" d="M15.5 8.5a5 5 0 0 1 0 7"/><path class="w2" d="M19 5a10 10 0 0 1 0 14"/><path class="x" d="m22 9-6 6M16 9l6 6"/></svg>';
  const fxLayer = el('div', 'gm-fx');
  const staticFlash = el('div', 'gm-static');
  const hud = el('div', 'gm-hud', `<div class="gm-lives" aria-label="Lives">${'<i></i>'.repeat(LIVES)}</div><div class="gm-time" aria-label="Time left">1:40</div><div class="gm-prog" aria-live="polite"></div><button type="button" class="gm-mute" aria-label="Mute sound">${SPEAKER}</button><button type="button" class="gm-quit">Quit</button>`);
  document.body.append(fxLayer, staticFlash, hud);
  $('.gm-quit', hud).addEventListener('click', () => end(false, true));
  const muteBtn = $('.gm-mute', hud);
  const showMute = () => { const m = window.MirageGameAudio && window.MirageGameAudio.muted; muteBtn.classList.toggle('off', !!m); muteBtn.setAttribute('aria-pressed', m ? 'true' : 'false'); muteBtn.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound'); };
  muteBtn.addEventListener('click', () => { const a = window.MirageGameAudio; if (!a) return; a.setMuted(!a.muted); showMute(); });
  showMute();

  // the sections in play, in order, and everything after the last one (footer)
  const levels = () => LEVELS.map(([sel, real, decoys, subtle]) => ({ host: $(sel), real, decoys, subtle })).filter((l) => l.host);
  const afterLast = () => $$('footer');

  function start() {
    hideTab();
    const lv = levels();
    // deal the resources: no name repeats across the whole run
    const real = shuffle(REAL.slice()), bait = shuffle(BAIT.slice()), subtle = shuffle(SUBTLE.slice());
    lv.forEach((l) => {
      l.pieces = [
        ...real.splice(0, l.real).map((r) => ({ r, decoy: false })),
        ...Array.from({ length: l.decoys }, () => ({ r: (l.subtle ? subtle.shift() : null) || bait.shift() || subtle.shift(), decoy: true, tell: !!l.subtle })),
      ];
      shuffle(l.pieces);
      l.found = 0;
    });
    S = { lv, i: 0, lives: LIVES, time: TIME, caught: [], found: 0, running: false, timer: null, glitch: null };
    lv.forEach((l) => l.host.classList.add('gm-lane'));
    root.classList.add('gm-on');
    // the break: shudder and slice, then the dark theme, cracks and crooked components
    if (!reduce) root.classList.add('gm-breaking');
    setTimeout(() => { root.classList.add('gm-spooky'); crack(); haunt(true); }, reduce ? 0 : 480);
    setTimeout(() => {
      root.classList.remove('gm-breaking');
      lock(0);
      scrollToEl(S.lv[0].host);
      hud.classList.add('show');
      lives(); progress();
      S.running = true;
      tick();
      if (!reduce) { S.glitch = setInterval(glitchOne, 3200); S.flick = setInterval(flickOne, 11000); }
    }, reduce ? 50 : 1150);
  }

  // hide every section after level i (and the footer), and put the locked barrier under level i
  function lock(i) {
    S.lv.forEach((l, k) => l.host.classList.toggle('gm-locked', k > i));
    afterLast().forEach((f) => f.classList.add('gm-locked'));
    $$('.gm-barrier').forEach((b) => b.remove());
    if (i < S.lv.length - 1) {
      const bar = el('div', 'gm-barrier', `${ICON_LOCK}<span>Find every real resource above to unlock the next section</span>`);
      S.lv[i].host.after(bar);
    }
    deal(i);
    refresh();
  }
  const refresh = () => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    if (lenis()) lenis().resize();
  };

  // put a level's pieces into free spots in its section (never over text, cards or diagrams)
  function deal(i) {
    const l = S.lv[i];
    l.host.classList.add('gm-host');
    let layer = $(':scope > .gm-layer', l.host);
    if (!layer) {
      layer = el('div', 'gm-layer');
      l.host.appendChild(layer);
      l.pieces.forEach((p, k) => {
        layer.insertAdjacentHTML('beforeend', piece(p.r, p.tell ? 'tell' : ''));
        const b = layer.lastElementChild;
        p.el = b;
        b.style.setProperty('--bob', (4.5 + (k % 3)) + 's');
        b.style.setProperty('--delay', (-k * .8) + 's');
        b.addEventListener('click', () => pick(i, p, b));
      });
    }
    place(l);
  }
  function place(l) {
    const host = l.host, hr = host.getBoundingClientRect(), W = host.clientWidth, H = host.offsetHeight;
    const pad = 12;
    const rel = (r) => ({ l: r.left - hr.left - pad, t: r.top - hr.top - pad, r: r.right - hr.left + pad, b: r.bottom - hr.top + pad });
    const hard = $$('h2, h3, p, li, .btn, img, .cta, .lede', host).filter((e) => e.offsetParent).map((e) => rel(e.getBoundingClientRect()));
    const soft = $$('.panel, .step, .graph, .ar-anim, .arch-diagram, .arch-note, .cmp, .adv, .pack, .term, .road, .head-c, .qs > div', host).filter((e) => e.offsetParent).map((e) => rel(e.getBoundingClientRect()));
    const sizes = l.pieces.map((p) => ({ w: p.el.offsetWidth, h: p.el.offsetHeight }));
    const hits = (a, list) => list.some((b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t);
    const edge = innerWidth < 700 ? 10 : 18;
    const tryPlace = (blockers) => {
      const placed = [];
      for (let k = 0; k < l.pieces.length; k++) {
        const { w, h } = sizes[k];
        const cands = [];
        for (let y = 14; y <= H - h - 14; y += 16) for (let x = edge; x <= W - w - edge; x += 16) cands.push([x, y]);
        shuffle(cands);
        const spot = cands.find(([x, y]) => { const box = { l: x, t: y, r: x + w, b: y + h }; return !hits(box, blockers) && !hits({ l: x - 14, t: y - 14, r: x + w + 14, b: y + h + 14 }, placed); });
        if (!spot) return null;
        placed.push({ l: spot[0], t: spot[1], r: spot[0] + w, b: spot[1] + h });
      }
      return placed;
    };
    // first try to keep clear of whole cards and diagrams; if the section is too full, only keep clear of text
    const spots = tryPlace([...hard, ...soft]) || tryPlace(hard) || l.pieces.map((p, k) => ({ l: edge + (k % 3) * (sizes[k].w + 12), t: 14 + Math.floor(k / 3) * (sizes[k].h + 12) }));
    l.pieces.forEach((p, k) => { p.el.style.left = spots[k].l + 'px'; p.el.style.top = spots[k].t + 'px'; });
  }
  let resizeT;
  addEventListener('resize', () => { if (!S) return; clearTimeout(resizeT); resizeT = setTimeout(() => S.lv.slice(0, S.i + 1).forEach(place), 200); });

  // a resource is clicked
  function pick(i, p, b) {
    if (!S || !S.running || i !== S.i || b.disabled) return;
    b.disabled = true;
    const l = S.lv[i];
    if (!p.decoy) {
      b.classList.add('found');
      A('correct');
      l.found++; S.found++;
      progress();
      if (l.found === l.real) cleared(i);
      return;
    }
    // a decoy: it reports you. One life and ten seconds gone.
    b.classList.add('caught');
    A('decoy');
    hurt();
    S.caught.push(p.r[0]);
    S.lives--; S.time = Math.max(0, S.time - PENALTY);
    const pop = el('span', 'gm-pop', `−1 life · −${PENALTY}s`);
    pop.style.left = b.style.left; pop.style.top = (parseFloat(b.style.top) - 18) + 'px';
    b.parentElement.appendChild(pop);
    setTimeout(() => pop.remove(), 1300);
    const t = $('.gm-time', hud); t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit');
    lives(); clock();
    if (S.lives <= 0 || S.time <= 0) end(false);
  }

  function cleared(i) {
    const l = S.lv[i];
    l.pieces.forEach((p) => { if (p.decoy && !p.el.disabled) { p.el.disabled = true; p.el.classList.add('spent'); } });
    if (i === S.lv.length - 1) return end(true);
    const bar = $('.gm-barrier');
    if (bar) { $('span', bar).textContent = 'Unlocked'; bar.classList.add('open'); }
    A('unlock');
    setTimeout(() => {
      S.i = i + 1;
      const next = S.lv[S.i].host;
      lock(S.i);
      if (!reduce) { next.classList.add('gm-arrive'); setTimeout(() => next.classList.remove('gm-arrive'), 900); }
      crack();
      progress();
      scrollToEl(next);
    }, reduce ? 100 : 650);
  }

  // ---- HUD ----
  function lives() { $$('.gm-lives i', hud).forEach((d, k) => d.classList.toggle('lost', k >= S.lives)); }
  function clock() {
    const s = Math.max(0, Math.ceil(S.time));
    const t = $('.gm-time', hud);
    t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    t.classList.toggle('low', s <= 20);
    // the last 20 seconds: a heartbeat, faster in the last 10, and the edges of the screen pulse red
    const level = !S.running ? 0 : s <= 10 ? 2 : s <= 20 ? 1 : 0;
    if (level !== S.urgency) { S.urgency = level; A('urgency', level); root.classList.toggle('gm-urgent', level > 0); }
  }
  function progress() {
    const l = S.lv[S.i];
    $('.gm-prog', hud).innerHTML = `Section <b>${S.i + 1} / ${S.lv.length}</b> · <b>${l.found} of ${l.real}</b> real found`;
  }
  // the clock: pauses while the tab is hidden
  function tick() {
    clearInterval(S.timer);
    let last = performance.now();
    S.timer = setInterval(() => {
      const now = performance.now();
      if (document.hidden || !S.running) { last = now; return; }
      S.time -= (now - last) / 1000; last = now;
      clock();
      if (S.time <= 0) end(false);
    }, 100);
    clock();
  }

  // ---- spooky details ----
  function crack() {
    const targets = $$('.panel, .adv, .step, .term, .cmp, .graph, .arch-diagram, .pack .logo, .ar-anim > svg').filter((e) => e.offsetParent && !e.querySelector(':scope > .gm-crack'));
    targets.forEach((t) => {
      t.classList.add('gm-cracked');
      // a jagged line from a random edge inwards, with a short branch
      const start = [[0, Math.random() * 100], [100, Math.random() * 100], [Math.random() * 100, 0], [Math.random() * 100, 100]][Math.floor(Math.random() * 4)];
      let [x, y] = start, d = `M${x} ${y}`;
      const dx = (50 - x) / 7, dy = (50 - y) / 7;
      const pts = [];
      for (let k = 0; k < 6; k++) { x += dx + (Math.random() - .5) * 14; y += dy + (Math.random() - .5) * 14; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; pts.push([x, y]); }
      const [bx, by] = pts[2];
      const branch = `M${bx.toFixed(1)} ${by.toFixed(1)} L${(bx + (Math.random() - .5) * 26).toFixed(1)} ${(by + (Math.random() - .5) * 26).toFixed(1)} L${(bx + (Math.random() - .5) * 34).toFixed(1)} ${(by + (Math.random() - .5) * 34).toFixed(1)}`;
      t.insertAdjacentHTML('beforeend', `<svg class="gm-crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" /><path d="${branch}" class="${Math.random() < .5 ? 'red' : ''}" /></svg>`);
    });
  }
  function glitchOne() {
    const hs = $$('h2').filter((h) => h.offsetParent && h.getBoundingClientRect().top < innerHeight && h.getBoundingClientRect().bottom > 0);
    if (!hs.length) return;
    const h = hs[Math.floor(Math.random() * hs.length)];
    h.classList.remove('gm-glitch'); void h.offsetWidth; h.classList.add('gm-glitch');
    setTimeout(() => h.classList.remove('gm-glitch'), 500);
    corrupt(h);
    A('glitch');
  }
  // a word in a heading briefly turns to garbage, then comes back
  const GARBAGE = '█▓▒░#%&@$¥§Ø∆¿?!/\\|<>';
  function corrupt(h) {
    const words = $$('.w > span', h).filter((w) => !w.dataset.gmOrig);
    if (!words.length) return;
    const w = words[Math.floor(Math.random() * words.length)];
    w.dataset.gmOrig = w.textContent;
    w.textContent = [...w.textContent].map((c) => (Math.random() < .55 ? GARBAGE[Math.floor(Math.random() * GARBAGE.length)] : c)).join('');
    setTimeout(() => restoreWord(w), 380);
  }
  const restoreWord = (w) => { if (w.dataset.gmOrig != null) { w.textContent = w.dataset.gmOrig; delete w.dataset.gmOrig; } };
  // now and then one section on screen tears for a split second
  function flickOne() {
    const vis = $$('header.hero, section').filter((x) => x.offsetParent && x.getBoundingClientRect().top < innerHeight && x.getBoundingClientRect().bottom > 0);
    if (!vis.length) return;
    const x = vis[Math.floor(Math.random() * vis.length)];
    x.classList.remove('gm-flick'); void x.offsetWidth; x.classList.add('gm-flick');
    setTimeout(() => x.classList.remove('gm-flick'), 260);
    A('glitch');
  }
  // a decoy hurts: the page jolts and the edges of the screen flash red once
  function hurt() {
    fxLayer.classList.remove('hurt'); void fxLayer.offsetWidth; fxLayer.classList.add('hurt');
    setTimeout(() => fxLayer.classList.remove('hurt'), 700);
    if (reduce) return;
    root.classList.remove('gm-hurt'); void root.offsetWidth; root.classList.add('gm-hurt');
    setTimeout(() => root.classList.remove('gm-hurt'), 450);
  }

  // ---- the haunting: a torch that follows the cursor, drifting ash, blood dripping from the nav ----
  const ash = el('canvas', 'gm-ash');
  ash.setAttribute('aria-hidden', 'true');
  let ashRaf = 0, ashParts = [];
  function haunt(on) {
    if (on) {
      if (!$('.gm-drips')) {
        const nav = $('.topnav');
        if (nav) {
          const drips = el('div', 'gm-drips');
          drips.setAttribute('aria-hidden', 'true');
          for (let k = 0; k < 14; k++) {
            const d = el('i');
            d.style.cssText = `left:${(k + Math.random() * .8) * (100 / 14)}%;--len:${18 + Math.random() * 70}px;--dur:${5 + Math.random() * 7}s;--delay:${-Math.random() * 8}s;--w:${3 + Math.random() * 4}px`;
            drips.appendChild(d);
          }
          nav.appendChild(drips);
        }
      }
      if (!reduce && !ash.isConnected) { document.body.appendChild(ash); startAsh(); }
    } else {
      $$('.gm-drips').forEach((d) => d.remove());
      cancelAnimationFrame(ashRaf); ashRaf = 0;
      ash.remove();
    }
  }
  function startAsh() {
    const c = ash.getContext('2d');
    const size = () => { const dpr = Math.min(2, devicePixelRatio || 1); ash.width = innerWidth * dpr; ash.height = innerHeight * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); addEventListener('resize', size);
    ashParts = Array.from({ length: innerWidth < 700 ? 34 : 70 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: .6 + Math.random() * 1.8, vy: -(6 + Math.random() * 18), vx: (Math.random() - .5) * 8, a: .15 + Math.random() * .4, red: Math.random() < .18 }));
    let last = 0;
    const frame = (t) => {
      ashRaf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
      c.clearRect(0, 0, innerWidth, innerHeight);
      ashParts.forEach((p) => {
        p.y += p.vy * dt; p.x += (p.vx + Math.sin((t / 1000 + p.r) * 1.3) * 6) * dt;
        if (p.y < -10) { p.y = innerHeight + 10; p.x = Math.random() * innerWidth; }
        c.globalAlpha = p.a; c.fillStyle = p.red ? '#e5372b' : '#cbb8b8';
        c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill();
      });
    };
    ashRaf = requestAnimationFrame(frame);
  }
  // the torch: the page is dark except around the cursor (on touch screens it stays in the middle)
  let torchRaf = 0;
  addEventListener('pointermove', (e) => {
    if (!root.classList.contains('gm-spooky') || e.pointerType !== 'mouse' || torchRaf) return;
    torchRaf = requestAnimationFrame(() => { torchRaf = 0; fxLayer.style.setProperty('--mx', e.clientX + 'px'); fxLayer.style.setProperty('--my', e.clientY + 'px'); });
  }, { passive: true });

  // =====================================================================
  // 4. the end
  // =====================================================================
  function end(won, quit) {
    if (!S || !S.running) return;
    S.running = false;
    clearInterval(S.timer); clearInterval(S.glitch); clearInterval(S.flick);
    A('stop');
    root.classList.remove('gm-urgent');
    if (quit) return exit();
    A(won ? 'win' : 'lose');
    const touched = S.caught.length, acc = S.found + touched ? Math.round(100 * S.found / (S.found + touched)) : 100;
    const stats = `<div class="gm-stats"><div><b>${Math.max(0, Math.ceil(S.time))}s</b><span>time left</span></div><div><b>${S.lives}</b><span>lives left</span></div><div><b>${touched}</b><span>decoys touched</span></div><div><b>${acc}%</b><span>accuracy</span></div></div>`;
    const caught = touched ? `<p class="gm-caught">Caught by ${S.caught.map((n) => `<code>${n}</code>`).join(' ')}. That's exactly how MIRAGE works: the moment an attacker touches a decoy, it reports them.</p>` : '';
    const { m, close } = won
      ? modal(`<h2>You saw through the mirage.</h2><p>Every real resource found, all the way to the end.</p>${stats}${caught}<div class="acts"><button type="button" class="gm-btn yes">Play again</button><button type="button" class="gm-btn no">Back to the site</button></div>`)
      : modal(`<h2>The decoys got you.</h2><p>${S.lives <= 0 ? 'Out of lives.' : 'Out of time.'} You reached section ${S.i + 1} of ${S.lv.length}.</p>${stats}${caught}<div class="acts"><button type="button" class="gm-btn yes">Retry</button><button type="button" class="gm-btn no">Back to the site</button></div>`);
    // retry / play again: reset first, then start the sound inside the click (browsers only allow sound from a user action)
    $('.yes', m).addEventListener('click', () => { exit(true); A('breakIn'); A('start'); close().then(start); });
    $('.no', m).addEventListener('click', () => close().then(() => exit()));
  }

  // put the site back exactly as it was
  function exit(again) {
    if (S) { clearInterval(S.timer); clearInterval(S.glitch); clearInterval(S.flick); }
    A('stop');
    $$('[data-gm-orig]').forEach(restoreWord);
    $$('.gm-flick').forEach((e) => e.classList.remove('gm-flick'));
    root.classList.remove('gm-urgent', 'gm-hurt');
    S = null;
    hud.classList.remove('show');
    $$('.gm-layer, .gm-barrier, .gm-crack, .gm-pop').forEach((e) => e.remove());
    $$('.gm-locked').forEach((e) => e.classList.remove('gm-locked'));
    $$('.gm-cracked').forEach((e) => e.classList.remove('gm-cracked'));
    $$('.gm-host').forEach((e) => e.classList.remove('gm-host'));
    $$('.gm-lane').forEach((e) => e.classList.remove('gm-lane'));
    $$('h2.gm-glitch').forEach((e) => e.classList.remove('gm-glitch'));
    if (again) return;
    root.classList.remove('gm-on', 'gm-spooky', 'gm-breaking');
    haunt(false);
    refresh();
    scrollToEl($('.hero') || document.body);
    setTimeout(showTab, 1200);
  }
})();
