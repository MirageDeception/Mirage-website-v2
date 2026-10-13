// Loader: the Twin mark builds itself on the horizon, then a curtain lifts off the page.
// Runs synchronously as the first thing in <body>, so the page is covered before it paints.
// The <head> script decides the mode: html.is-loading (full build) or html.is-loading.quick-load
// (arriving from another page of the site: the mark is already built, the curtain just lifts).
(function () {
  var root = document.documentElement;
  var stripes = '';
  [47, 41.4, 35.8, 30.2, 24.6, 19].forEach(function (y, i) {
    stripes += '<rect x="-2" y="' + y + '" width="68" height="3" style="--i:' + i + '" />';
  });
  document.body.insertAdjacentHTML('afterbegin',
    '<div class="loader" id="loader" aria-hidden="true">' +
      '<svg class="loader__mark" viewBox="-48 6 160 46">' +
        '<defs>' +
          '<clipPath id="ld-above"><rect x="-48" y="0" width="160" height="50.4" /></clipPath>' +
          '<clipPath id="ld-clip"><path d="M26 50 L43 14 L60 50 Z" /></clipPath>' +
          '<mask id="ld-counters" maskUnits="userSpaceOnUse" x="-48" y="-48" width="160" height="160"><rect x="-48" y="-48" width="160" height="160" fill="#fff" /><path d="M13.03 51 L21 34.12 L28.97 51 Z" fill="#000" /><path d="M35.03 51 L43 34.12 L50.97 51 Z" fill="#000" /></mask>' +
          '<mask id="ld-decoy" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff" /><path d="M4 50 L21 14 L38 50 Z" fill="#000" stroke="#000" stroke-width="3.2" /><rect x="24" y="39.4" width="17.8" height="12" fill="#000" /></mask>' +
        '</defs>' +
        '<line class="ld-horizon" x1="-48" y1="50.4" x2="112" y2="50.4" />' +
        '<g mask="url(#ld-counters)"><g clip-path="url(#ld-clip)"><g mask="url(#ld-decoy)" class="ld-stripes" fill="currentColor">' + stripes + '</g></g></g>' +
        '<g clip-path="url(#ld-above)"><g class="ld-real"><g mask="url(#ld-counters)"><path d="M4 50 L21 14 L38 50 Z" fill="currentColor" /></g></g></g>' +
        '<circle class="ld-ring" cx="43" cy="14.4" r="3.4" />' +
        '<circle class="ld-dot" cx="43" cy="14.4" r="3.4" />' +
      '</svg>' +
      '<div class="loader__word">' + 'mirage'.split('').map(function (c, i) { return '<span style="--i:' + i + '">' + c + '</span>'; }).join('') + '</div>' +
    '</div>');

  var loader = document.getElementById('loader');
  var ready = false;
  function finish() {
    if (ready) return;
    ready = true;
    loader.classList.remove('play');
    loader.classList.add('out');
    // the page underneath starts its own intro while the curtain is still lifting
    setTimeout(function () {
      root.classList.add('is-ready');
      document.dispatchEvent(new Event('mirage:ready'));
    }, 180);
    setTimeout(function () {
      root.classList.remove('is-loading', 'quick-load');
      loader.classList.remove('out');
    }, 1150);
  }

  // Leaving for another page of the site: the curtain comes back up, then we navigate.
  window.mirageLeave = function (href) {
    loader.classList.remove('out', 'play', 'cover');
    loader.classList.add('enter');
    root.classList.add('is-leaving');
    loader.offsetHeight; // commit the start state before transitioning
    loader.classList.remove('enter');
    loader.classList.add('cover');
    setTimeout(function () { location.href = href; }, 560);
  };
  // coming back with the browser's back button restores the page from cache: drop the curtain
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { root.classList.remove('is-leaving'); loader.classList.remove('cover'); }
  });

  if (!root.classList.contains('is-loading')) { ready = true; root.classList.add('is-ready'); return; }

  var quick = root.classList.contains('quick-load');
  if (!quick) loader.classList.add('play');
  var minTime = quick ? 120 : 2050, start = Date.now();
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  function go() { setTimeout(finish, Math.max(0, minTime - (Date.now() - start))); }
  document.addEventListener('DOMContentLoaded', function () { Promise.race([fonts, new Promise(function (r) { setTimeout(r, 1500); })]).then(go); });
  setTimeout(finish, 4500); // never leave the page covered, whatever happens
})();
