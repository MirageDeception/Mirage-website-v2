// motion: theme switch, page transitions, smooth scrolling, the hero intro and scroll reveals.
// Loaded at the end of <body>, after GSAP, ScrollTrigger and Lenis. Works with js/loader.js.
(function () {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- theme toggle: the new theme spreads out from the button ----
  const themeBtn = document.getElementById('themeBtn');
  let pendingTheme = null; // a switch still animating; quick second clicks toggle from it, not the old theme
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = (pendingTheme || root.dataset.theme) === 'dark' ? 'light' : 'dark';
    pendingTheme = next;
    const apply = () => { root.dataset.theme = next; if (pendingTheme === next) pendingTheme = null; try { localStorage.setItem('mirage-theme', next); } catch (e) {} };
    if (!document.startViewTransition || reduce) return apply();
    const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.7,0,.3,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(() => {}); // the browser skips the effect (e.g. tab in the background); the theme still changes
    vt.finished.catch(() => {});
  });

  // ---- page transitions: links to other pages of the site raise the curtain first ----
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || reduce || !window.mirageLeave) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    window.mirageLeave(url.href);
  });

  // ---- mobile menu: the three-line button folds the nav links, GitHub and Deploy the Mesh into a sheet ----
  const topnav = document.querySelector('.topnav'), menuBtn = document.getElementById('menuBtn');
  if (topnav && menuBtn) {
    const sheet = document.createElement('div');
    sheet.className = 'mmenu'; sheet.id = 'mobileMenu';
    const list = document.createElement('nav');
    list.setAttribute('aria-label', 'Menu');
    let n = 0;
    topnav.querySelectorAll('.links a').forEach((a) => { const c = a.cloneNode(true); c.style.setProperty('--i', n++); list.appendChild(c); });
    const foot = document.createElement('div');
    foot.className = 'mmenu__foot';
    [topnav.querySelector('.actions .gh'), topnav.querySelector('.actions > .btn')].forEach((a) => {
      if (!a) return;
      const c = a.cloneNode(true);
      c.classList.remove('sm');
      c.style.setProperty('--i', n++);
      foot.appendChild(c);
    });
    sheet.append(list, foot);
    topnav.appendChild(sheet);

    const setOpen = (open) => {
      if (open) sheet.style.height = (innerHeight - topnav.getBoundingClientRect().bottom) + 'px';
      topnav.classList.toggle('menu-open', open);
      root.classList.toggle('menu-locked', open);
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      const lenis = window.__mirageLenis;
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    menuBtn.addEventListener('click', () => setOpen(!topnav.classList.contains('menu-open')));
    // picking a link closes the sheet (the link then scrolls or changes page as usual)
    // (capture phase, so the menu is closed and scrolling is unlocked before the link's own handler scrolls)
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && topnav.classList.contains('menu-open')) { setOpen(false); menuBtn.focus(); } });
    addEventListener('resize', () => { if (innerWidth > 960 && topnav.classList.contains('menu-open')) setOpen(false); });
  }

  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  if (reduce || !hasGsap) {
    document.querySelectorAll('.road').forEach((r) => r.classList.add('drawn'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Everything waits behind the loader: animations are set up now (so nothing flashes),
  // but the clock only starts once the curtain begins to lift.
  const waiting = !root.classList.contains('is-ready');
  if (waiting) gsap.globalTimeline.pause();
  const whenReady = (fn) => (waiting ? document.addEventListener('mirage:ready', fn, { once: true }) : fn());
  whenReady(() => { gsap.globalTimeline.resume(); ScrollTrigger.refresh(); });

  // ---- smooth inertia scrolling ----
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    window.__mirageLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    if (waiting) { lenis.stop(); whenReady(() => lenis.start()); }
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -72, duration: 1.4, force: true });
      history.replaceState(null, '', a.getAttribute('href'));
    }));
  }

  // wrap each word in a mask so it can slide up into view
  function words(el) {
    if (!el.dataset.split) {
      const list = el.textContent.trim().split(/\s+/);
      el.setAttribute('aria-label', el.textContent.trim());
      el.textContent = '';
      list.forEach((w, i) => {
        const outer = document.createElement('span'), inner = document.createElement('span');
        outer.className = 'w'; outer.setAttribute('aria-hidden', 'true');
        inner.textContent = w;
        outer.appendChild(inner); el.appendChild(outer);
        if (i < list.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.dataset.split = '1';
    }
    return el.querySelectorAll('.w > span');
  }
  // Play each reveal once and leave it. (Not ScrollTrigger's `once: true`: that deletes the trigger while
  // GSAP is re-measuring the page, which on a load part-way down the page skips the next trigger and
  // leaves its content invisible.)
  const once = (trigger, start = 'top 84%') => ({ trigger, start, toggleActions: 'play none none none' });
  const $ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  // ---- reading progress under the nav ----
  const nav = document.querySelector('.topnav');
  if (nav) {
    const bar = document.createElement('span');
    bar.className = 'progress';
    nav.appendChild(bar);
    gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
  }

  // ---- hero intro (home): the horizon draws, the mark rises onto it, the headline lifts in ----
  const hero = document.querySelector('.hero');
  if (hero) {
    const h1 = words(hero.querySelector('h1'));
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from(hero.querySelector(':scope > .horizon'), { scaleX: 0, duration: 1.4, ease: 'power3.inOut' }, 0)
      .from('#tilt', { y: 46, opacity: 0, duration: 1.2, ease: 'expo.out' }, .15)
      .from('#tilt .layer-decoy', { x: 10, opacity: 0, duration: 1, ease: 'power2.out' }, .55)
      .from(h1, { yPercent: 115, duration: 1.05, ease: 'power4.out', stagger: .1 }, .35)
      .from('.hero .reflect', { opacity: 0, duration: 1.4, ease: 'power2.out' }, .85)
      .from(['.hero .sub', '.hero .cta'], { y: 22, opacity: 0, duration: .9, stagger: .12 }, .8);
    // gentle parallax as the hero scrolls away
    const away = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero .scene', { yPercent: -22, ease: 'none', scrollTrigger: away });
    gsap.to('.hero h1', { y: -36, ease: 'none', scrollTrigger: away });
  }

  // ---- section headings: label, then the title word by word, then the text ----
  $('.head-c, .qs > div:first-child, .pitch > .wrap, .page-head').forEach((h) => {
    const label = h.querySelector(':scope > .label');
    const title = h.querySelector(':scope > h2, :scope > h1');
    const rest = [...h.children].filter((c) => c !== label && c !== title && c.tagName !== 'DIV');
    const tl = gsap.timeline({ scrollTrigger: once(h, 'top 88%') });
    if (label) tl.from(label, { y: 14, opacity: 0, duration: .6, ease: 'power3.out' }, 0);
    if (title) tl.from(words(title), { yPercent: 115, duration: 1, ease: 'power4.out', stagger: .07 }, .08);
    if (rest.length) tl.from(rest, { y: 20, opacity: 0, duration: .8, ease: 'power3.out', stagger: .08 }, .35);
    // buttons get their own trigger, so they never depend on the heading's timeline finishing
    const cta = h.querySelector(':scope > .cta');
    if (cta) gsap.from(cta.children, { y: 20, opacity: 0, duration: .8, ease: 'power3.out', stagger: .1, delay: .3, clearProps: 'transform,opacity', scrollTrigger: once(cta, 'top 95%') });
  });

  // ---- groups of cards rise in one after another ----
  $('.three, .steps, .arch-notes, .posts, .team, .road').forEach((g) => {
    gsap.from(g.children, {
      y: 40, opacity: 0, duration: .95, ease: 'power3.out', stagger: .11, clearProps: 'transform,opacity',
      scrollTrigger: { ...once(g), onEnter: () => g.classList.add('drawn') },
    });
  });

  // ---- big visuals ease up and settle ----
  $('.graph, .ar-anim, .arch-diagram, .term').forEach((el) => {
    gsap.from(el, { y: 56, opacity: 0, scale: .975, duration: 1.2, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: once(el, 'top 90%') });
  });

  // architecture: accounts slide in from the left, then the hub's stages light up in order
  const arch = document.querySelector('.arch-diagram');
  if (arch) {
    gsap.timeline({ scrollTrigger: once(arch, 'top 75%') })
      .from($('.arch-spoke', arch), { x: -28, opacity: 0, duration: .8, ease: 'power3.out', stagger: .12, clearProps: 'transform,opacity' }, .3)
      .from($('.arch-node', arch), { y: 22, opacity: 0, duration: .8, ease: 'power3.out', stagger: .14, clearProps: 'transform,opacity' }, .55);
  }

  // comparison table: row by row
  const cmp = document.querySelector('.cmp');
  if (cmp) {
    gsap.from(cmp.children, { y: 18, opacity: 0, duration: .7, ease: 'power3.out', delay: (i) => Math.floor(i / 3) * .12, clearProps: 'transform,opacity', scrollTrigger: once(cmp) });
  }

  // quickstart: the commands appear line by line, like they are being typed
  const term = document.querySelector('.term');
  if (term) gsap.from(term.children, { x: -10, opacity: 0, duration: .45, ease: 'power2.out', stagger: .16, delay: .35, scrollTrigger: once(term, 'top 85%') });

  // horizon lines draw outwards from the middle as they come into view
  $('.horizon').filter((h) => !h.closest('.topnav') && !h.closest('.hero')).forEach((h) => {
    gsap.from(h, { scaleX: 0, duration: 1.5, ease: 'power3.inOut', scrollTrigger: once(h, 'top 96%') });
  });

  // Safety net: whenever scrolling settles, anything a reveal left hidden on screen is shown.
  // (A reveal can be cut short, e.g. by a big jump in scroll position, and must never leave content invisible.)
  let settle;
  const showStragglers = () => {
    document.querySelectorAll('main [style*="opacity: 0"], section [style*="opacity: 0"], footer [style*="opacity: 0"], .page-head [style*="opacity: 0"]').forEach((el) => {
      // [data-motion-own]: a section that runs its own timeline and hides things on purpose
      if (el.closest('.ar-anim, [data-motion-own]') || gsap.isTweening(el)) return;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) gsap.to(el, { opacity: 1, y: 0, x: 0, scale: 1, duration: .5, ease: 'power2.out', clearProps: 'transform,opacity' });
    });
  };
  addEventListener('scroll', () => { clearTimeout(settle); settle = setTimeout(showStragglers, 1200); }, { passive: true });

  // footer
  $('.foot').forEach((f) => gsap.from(f.children, { y: 16, opacity: 0, duration: .8, ease: 'power3.out', stagger: .1, scrollTrigger: once(f, 'top 98%') }));

  // ---- "Coming soon" hover & click badge for GitHub / Deploy links ----
  (function () {
    const tip = document.createElement('div');
    tip.className = 'soon-tip';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-hidden', 'true');
    tip.innerHTML = '<span class="dot"></span><span>Coming soon</span>';
    document.body.appendChild(tip);

    let currentTarget = null;
    let clickTimeout = null;
    let lastScrollY = window.scrollY;

    const positionTip = (target) => {
      const r = target.getBoundingClientRect();
      const tipW = tip.offsetWidth || 110;
      const tipH = tip.offsetHeight || 28;
      let left = r.left + r.width / 2 - tipW / 2;
      left = Math.max(8, Math.min(innerWidth - tipW - 8, left));
      let top = r.top - tipH - 8;
      if (top < 8) top = r.bottom + 8;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    };

    const isSoonTarget = (el) => {
      if (!el) return null;
      const node = el.nodeType === 3 ? el.parentElement : el;
      const a = node && node.closest ? node.closest('a[href], button') : null;
      if (!a) return null;
      if (a.hasAttribute('data-soon')) return a;
      const href = (a.getAttribute('href') || '') + ' ' + (a.href || '');
      if (href.includes('github.com/MirageDeception/Mirage-OS') || a.classList.contains('soon-btn')) return a;
      return null;
    };

    const show = (target, text = 'Coming soon') => {
      currentTarget = target;
      lastScrollY = window.scrollY;
      tip.querySelector('span:last-child').textContent = text;
      positionTip(target);
      tip.classList.add('is-visible');
    };

    const hide = () => {
      if (clickTimeout) return;
      currentTarget = null;
      tip.classList.remove('is-visible', 'shake');
    };

    const dismiss = () => {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      currentTarget = null;
      tip.classList.remove('is-visible', 'shake');
    };

    document.addEventListener('mouseover', (e) => {
      const t = isSoonTarget(e.target);
      if (t) show(t, t.getAttribute('data-soon') || 'Coming soon');
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      const t = isSoonTarget(e.target);
      if (t && (!e.relatedTarget || !t.contains(e.relatedTarget))) hide();
    }, { passive: true });

    document.addEventListener('click', (e) => {
      const t = isSoonTarget(e.target);
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      show(t, 'Coming soon — stay tuned!');
      tip.classList.remove('shake');
      void tip.offsetWidth;
      tip.classList.add('shake');
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        clickTimeout = null;
        if (!currentTarget || !t.matches(':hover')) hide();
      }, 1600);
    }, true);

    const onScroll = () => {
      if (Math.abs(window.scrollY - lastScrollY) > 4) {
        dismiss();
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (window.__mirageLenis) {
      window.__mirageLenis.on('scroll', onScroll);
    }
  })();
})();
