// fx: two background effects on the home page.
//   mesh()      live deception mesh behind "Help build the future of defense"
//   floaters()  real and decoy cloud icons drifting beside the section headings
// (The "Spot the real resources" game lives separately in js/game.js.)
(function () {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  // =====================================================================
  // A. live deception mesh: drifting nodes, some of them decoys; every few seconds an attacker
  //    hops along the links, touches a decoy, and the alert runs up to the headline.
  // =====================================================================
  function mesh() {
    const host = document.querySelector('.pitch');
    if (!host) return;
    const cv = document.createElement('canvas');
    cv.className = 'fx-mesh';
    cv.setAttribute('aria-hidden', 'true');
    host.prepend(cv);
    const ctx = cv.getContext('2d');
    const LINK = 150;
    let W = 0, H = 0, nodes = [], col = {}, head = { x: 0, y: 0 }, visible = false, raf = 0, last = 0;
    const atk = { path: [], i: 0, t: 0, state: 'wait', timer: 1, target: null, alertT: 0 };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    function colors() { col = { ink: css('--ink') || '#121212', red: css('--red') || '#e5372b' }; }
    function seed() {
      const n = W < 700 ? 22 : 44;
      nodes = Array.from({ length: n }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 16, vy: (Math.random() - .5) * 16, decoy: i % 4 === 0 }));
    }
    function size() {
      const r = host.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      // the section can be hidden (the game locks sections it hasn't reached); a 0×0 size would
      // squash every node into the corner, so keep the last real size until it's visible again
      if (!r.width || !r.height) return;
      const sx = W ? r.width / W : 1, sy = H ? r.height / H : 1;
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!nodes.length) seed(); else nodes.forEach((p) => { p.x *= sx; p.y *= sy; });
      const h2 = host.querySelector('h2');
      if (h2) { const hr = h2.getBoundingClientRect(); head = { x: hr.left - r.left + hr.width / 2, y: hr.bottom - r.top + 6 }; }
    }

    // the attacker picks a decoy (it can't know it is one) and walks the links towards it
    function plan() {
      const inner = nodes.filter((n) => n.decoy && n.x > W * .12 && n.x < W * .88 && n.y > H * .12 && n.y < H * .88);
      const pool = inner.length ? inner : nodes.filter((n) => n.decoy);
      const target = pool[Math.floor(Math.random() * pool.length)];
      const reals = nodes.filter((n) => !n.decoy).sort((a, b) => dist(b, target) - dist(a, target));
      let cur = reals[Math.floor(Math.random() * Math.min(5, reals.length))];
      const path = [cur];
      for (let k = 0; k < 10 && cur !== target; k++) {
        const opts = nodes.filter((n) => n !== cur && !path.includes(n) && dist(n, cur) < LINK * 1.15 && (n === target || !n.decoy));
        if (!opts.length) break;
        opts.sort((a, b) => dist(a, target) - dist(b, target));
        if (dist(opts[0], target) >= dist(cur, target)) break;
        cur = opts[0];
        path.push(cur);
      }
      if (path[path.length - 1] !== target) path.push(target);
      Object.assign(atk, { path, i: 0, t: 0, state: 'move', target, alertT: 0 });
    }

    function step(dt) {
      nodes.forEach((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0 || p.x > W) { p.vx *= -1; p.x = Math.max(0, Math.min(W, p.x)); }
        if (p.y < 0 || p.y > H) { p.vy *= -1; p.y = Math.max(0, Math.min(H, p.y)); }
      });
      if (atk.state === 'wait') { atk.timer -= dt; if (atk.timer <= 0) plan(); }
      else if (atk.state === 'move') {
        atk.t += dt / .45;
        if (atk.t >= 1) { atk.t = 0; atk.i++; if (atk.i >= atk.path.length - 1) { atk.state = 'alert'; atk.alertT = 0; } }
      } else if (atk.state === 'alert') { atk.alertT += dt; if (atk.alertT > 2.8) { atk.state = 'wait'; atk.timer = 1.6; } }
    }
    function attackerAt() {
      if (atk.state === 'move') {
        const a = atk.path[atk.i], b = atk.path[atk.i + 1], t = atk.t, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
      }
      return atk.state === 'alert' ? { x: atk.target.x, y: atk.target.y } : null;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = col.ink;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const d = dist(nodes[i], nodes[j]);
        if (d < LINK) { ctx.globalAlpha = (1 - d / LINK) * .22; ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke(); }
      }
      const pos = attackerAt();
      // the route taken so far
      if (pos) {
        ctx.globalAlpha = .5; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(atk.path[0].x, atk.path[0].y);
        for (let k = 1; k <= atk.i; k++) ctx.lineTo(atk.path[k].x, atk.path[k].y);
        ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.setLineDash([]);
      }
      // nodes: real = solid dot, decoy = hatched ring
      nodes.forEach((p) => {
        if (atk.state === 'alert' && p === atk.target) return;
        ctx.fillStyle = ctx.strokeStyle = col.ink;
        if (!p.decoy) { ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, 7); ctx.fill(); return; }
        ctx.globalAlpha = .55; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.8, 0, 7); ctx.stroke();
        [-2, 0, 2].forEach((dy) => { const w = Math.sqrt(4.8 * 4.8 - dy * dy) - 1; ctx.beginPath(); ctx.moveTo(p.x - w, p.y + dy); ctx.lineTo(p.x + w, p.y + dy); ctx.stroke(); });
      });
      // the alert: the touched decoy goes red, pings, and the signal runs to the headline
      if (atk.state === 'alert') {
        const p = atk.target, a = atk.alertT, fade = Math.max(0, 1 - Math.max(0, a - 2) / .8);
        ctx.fillStyle = ctx.strokeStyle = col.red;
        ctx.globalAlpha = fade; ctx.beginPath(); ctx.arc(p.x, p.y, 5.2, 0, 7); ctx.fill();
        [0, .5].forEach((off) => {
          const r = ((a + off) % 1.2) / 1.2;
          ctx.globalAlpha = (1 - r) * .8 * fade; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, 5 + r * 26, 0, 7); ctx.stroke();
        });
        const k = Math.min(1, Math.max(0, (a - .3) / .7));
        if (k > 0) {
          ctx.globalAlpha = .55 * fade; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (head.x - p.x) * k, p.y + (head.y - p.y) * k); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      if (pos) {
        ctx.fillStyle = ctx.strokeStyle = atk.state === 'alert' ? col.red : col.ink;
        ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(pos.x, pos.y, 3.2, 0, 7); ctx.fill();
        ctx.globalAlpha = .3; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(pos.x, pos.y, 8, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (t - (last || t)) / 1000);
      last = t;
      step(dt); draw();
    }
    const run = () => { if (raf || reduce || !visible || document.hidden) return; last = 0; raf = requestAnimationFrame(frame); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    colors(); size();
    if (reduce) { plan(); Object.assign(atk, { state: 'alert', alertT: 1.2, i: atk.path.length - 1 }); }
    draw();
    new ResizeObserver(() => { size(); if (!raf) draw(); }).observe(host);
    // recolour when the theme changes, or when the game switches the page to its spooky palette
    let spooky = root.classList.contains('gm-spooky');
    new MutationObserver(() => { colors(); if (!raf) draw(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    new MutationObserver(() => {
      const now = root.classList.contains('gm-spooky');
      if (now !== spooky) { spooky = now; colors(); if (!raf) draw(); }
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? run() : stop(); }, { rootMargin: '120px' }).observe(host);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
  }

  // =====================================================================
  // 2. floating icons beside the section headings: solid = real, striped = decoy.
  //    Each drifts at its own speed as you scroll, and bobs gently.
  // =====================================================================
  function floaters() {
    // [section, side, top px, icon, decoy?, parallax speed, small?]
    const PLAN = [
      // tops keep each icon level with its section heading, clear of the cards below it
      ['#problem', 'l', 110, 'i-server', 0, 1, 0], ['#problem', 'r', 150, 'i-key', 1, .6, 1],
      ['#process', 'l', 170, 'i-database', 1, .8, 1], ['#process', 'r', 130, 'i-lock', 0, 1.2, 0],
      ['#in-action', 'l', 140, 'i-key', 0, .7, 0], ['#in-action', 'r', 200, 'i-server', 1, 1.1, 1],
      ['#different', 'l', 190, 'i-lock', 1, 1, 0], ['#different', 'r', 130, 'i-database', 0, .7, 1],
      ['#advantages', 'l', 100, 'i-workflow', 0, .9, 1], ['#advantages', 'r', 150, 'i-key', 1, 1.2, 0],
      ['#coverage', 'l', 60, 'i-database', 1, .6, 0], ['#coverage', 'r', 40, 'i-server', 0, 1, 1],
    ];
    PLAN.forEach(([sel, side, top, icon, decoy, speed, small], i) => {
      const host = document.querySelector(sel);
      if (!host) return;
      host.classList.add('fx-host');
      const el = document.createElement('div');
      el.className = 'fx-float' + (decoy ? ' decoy' : '') + (small ? ' sm' : '');
      el.setAttribute('aria-hidden', 'true');
      el.style.top = top + 'px';
      el.style[side === 'l' ? 'left' : 'right'] = 'max(20px, calc(50% - 575px))';
      el.innerHTML = `<div class="tile" style="--bob:${5 + (i % 4)}s;animation-delay:-${i * .7}s"><svg><use href="#${icon}" /></svg></div>`;
      host.appendChild(el);
      if (hasGsap && !reduce) {
        gsap.to(el, { y: -150 * speed, ease: 'none', scrollTrigger: { trigger: host, start: 'top bottom', end: 'bottom top', scrub: true } });
      }
    });
  }

  mesh();
  floaters();
})();
