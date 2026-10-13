// Ship's-wheel section navigator on the home page (`?wheel=off` hides it).
// Each of the 10 handles is a section. The wheel turns as you scroll, so the current section's handle always
// points right; hover (or tap) opens it and labels the handles on the visible half. Each handle owns a whole slice
// of the wheel (hub to label), so anywhere in that slice highlights the handle and clicking it sails there.
(function () {
  if (new URLSearchParams(location.search).get('wheel') === 'off') return;
  const SECTIONS = [['#top', 'Top'], ['#problem', 'The problem'], ['#process', 'How it works'], ['#in-action', 'In action'], ['#architecture', 'Architecture'],
    ['#different', 'Why MIRAGE'], ['#advantages', 'Advantages'], ['#coverage', 'Coverage'], ['#quickstart', 'Quickstart'], ['.pitch', 'Join the mission']]
    .map(([sel, name]) => ({ el: document.querySelector(sel), name })).filter((s) => s.el);
  const N = SECTIONS.length, STEP = 360 / N;
  const $ = (s, c = document) => c.querySelector(s);

  // ---- the wheel: rim, spokes with turned handles, studs and a hub with the Twin mark ----
  let spokes = '';
  for (let i = 0; i < N; i++) {
    spokes += `<g class="spk" transform="rotate(${i * STEP})"><line class="spoke" x1="16" y1="0" x2="80" y2="0" />` +
      `<rect class="collar" x="78" y="-6" width="5" height="12" rx="1.5" /><rect class="handle" x="82" y="-4.2" width="17" height="8.4" rx="4.2" />` +
      `<circle class="handle" cx="101" cy="0" r="6.2" /><circle class="stud" cx="66" cy="0" r="2.1" /></g>`;
  }
  // the clickable slices: one wedge per handle, from just outside the hub to past the end of its label
  const wedge = (r0, r1, half) => {
    const p = (r, a) => `${(r * Math.cos(a * Math.PI / 180)).toFixed(2)} ${(r * Math.sin(a * Math.PI / 180)).toFixed(2)}`;
    return `M${p(r0, -half)} L${p(r1, -half)} A${r1} ${r1} 0 0 1 ${p(r1, half)} L${p(r0, half)} A${r0} ${r0} 0 0 0 ${p(r0, -half)} Z`;
  };
  let hits = '';
  for (let i = 0; i < N; i++) hits += `<path class="hit" data-i="${i}" transform="rotate(${i * STEP})" d="${wedge(22, 228, STEP / 2 - .5)}" />`;
  const helm = document.createElement('nav');
  helm.className = 'helm';
  helm.setAttribute('aria-label', 'Sections');
  helm.innerHTML =
    `<svg class="helm-wheel" viewBox="-110 -110 220 220" aria-hidden="true">${spokes}` +
    `<circle class="rim-out" r="72.5" /><circle class="rim" r="66" /><circle class="rim-in" r="66" />` +
    `<circle class="hub" r="21" /><circle class="hub-in" r="16" /><g class="hits">${hits}</g></svg>` +
    // the logo sits in the hub but outside the turning wheel, so the wheel turns around it and it stays upright
    `<span class="helm-hub" aria-hidden="true"><svg viewBox="0 0 64 64"><use href="#twin" /></svg></span>` +
    `<div class="helm-labels">${SECTIONS.map((s, i) => `<a class="helm-label" href="#" data-i="${i}" style="--a:${i * STEP}deg"><i>${String(i + 1).padStart(2, '0')}</i>${s.name}</a>`).join('')}</div>`;
  document.body.appendChild(helm);
  const labels = [...helm.querySelectorAll('.helm-label')], spk = [...helm.querySelectorAll('.spk')], wedges = [...helm.querySelectorAll('.hit')];

  // ---- turn with the scroll: position = which section you're in, plus how far through it ----
  let rot = 0;
  function update() {
    const y = scrollY + innerHeight * .4;
    const tops = SECTIONS.map((s) => s.el.getBoundingClientRect().top + scrollY);
    let i = 0;
    while (i < N - 1 && y >= tops[i + 1]) i++;
    const next = i < N - 1 ? tops[i + 1] : document.documentElement.scrollHeight;
    const pos = Math.min(N - 1, i + Math.max(0, Math.min(1, (y - tops[i]) / Math.max(1, next - tops[i]))));
    rot = -pos * STEP;
    helm.style.setProperty('--rot', rot + 'deg');
    const cur = Math.round(pos);
    labels.forEach((l, k) => {
      let a = ((k * STEP + rot) % 360 + 540) % 360 - 180; // where this handle points now, -180..180 (0 = right)
      l.classList.toggle('vis', Math.abs(a) <= 82);
      wedges[k].classList.toggle('vis', Math.abs(a) <= 82);
      l.classList.toggle('edge', Math.abs(a) > 62);
      l.classList.toggle('on', k === cur);
      spk[k].classList.toggle('on', k === cur);
    });
  }
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();

  // ---- hovering a slice or a label brings its handle to life ----
  const hot = (i) => { spk.forEach((g, k) => g.classList.toggle('hot', k === i)); labels.forEach((l, k) => l.classList.toggle('hot', k === i)); };
  [...wedges, ...labels].forEach((x) => {
    x.addEventListener('pointerenter', () => hot(+x.dataset.i));
    x.addEventListener('pointerleave', () => hot(-1));
  });

  // ---- sail to a section ----
  const sail = (i) => {
    const target = SECTIONS[i].el;
    const y = Math.max(0, target.getBoundingClientRect().top + scrollY - 72);
    window.__mirageLenis ? window.__mirageLenis.scrollTo(y, { duration: 1.4 }) : window.scrollTo({ top: y, behavior: 'smooth' });
    helm.classList.remove('open');
    hot(-1);
  };
  // on touch screens the first tap only opens the wheel; on desktop it's already open from hovering
  let wasOpen = false;
  helm.addEventListener('pointerdown', (e) => { wasOpen = helm.classList.contains('open') || (e.pointerType === 'mouse' && helm.matches(':hover')); }, true);
  labels.forEach((l) => l.addEventListener('click', (e) => { e.preventDefault(); sail(+l.dataset.i); }));
  wedges.forEach((w) => w.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!wasOpen) { helm.classList.add('open'); return; }
    sail(+w.dataset.i);
  }));
  // touch screens: tap the wheel to open it, tap anywhere else to close
  $('.helm-wheel', helm).addEventListener('click', () => helm.classList.toggle('open'));
  document.addEventListener('pointerdown', (e) => { if (!helm.contains(e.target)) helm.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { helm.classList.remove('open'); if (helm.contains(document.activeElement)) document.activeElement.blur(); } });
})();
