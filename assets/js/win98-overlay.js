/* ====================================================================
   Windows 98 / Internet Explorer retro overlay
   ---------------------------------------------------------------
   Wraps the page's existing content in a fake IE6-on-Win98 browser
   window sitting on the Win98 desktop, and adds a toggle button
   (floating, bottom-right corner) to switch the effect on and off.

   Pair with: assets/css/win98-overlay.css, assets/css/retro.css, and the
   pages under /retro/ (a full 90s-styled parallel version of the site).
   When retro mode is on, the fake browser window's content area shows
   /retro/<current-page>.html in an iframe instead of the live modern site.

   Retro mode is remembered across page loads (sessionStorage), so
   clicking a real link to another page while in retro mode keeps that
   next page in retro mode too, instead of silently reverting to normal.
   A ?retro=on or ?retro=off query string always overrides the stored
   state (handy for a shareable link), and is cleaned out of the address
   bar afterwards.

   INTEGRATION — add to your layout's <head>, as early as possible
   (before other stylesheets, so the class is set before first paint
   and there's no flash of the normal page on navigation):

     <script>
       (function () {
         try {
           var qs = new URLSearchParams(location.search).get('retro');
           if (qs === 'on' || (qs !== 'off' && sessionStorage.getItem('win98-retro') === '1')) {
             document.documentElement.classList.add('win98-active');
           }
         } catch (e) {}
       })();
     </script>
     <link rel="stylesheet" href="{{ "/assets/css/win98-overlay.css" | relative_url }}">

   ...and this, right before </body>:

     <script src="{{ "/assets/js/win98-overlay.js" | relative_url }}" defer></script>

   Optional: <script ... data-retro-base="/retro/"> to point at a
   different retro folder (defaults to "retro/", relative to the current
   page).

   No other markup changes are required — this script moves the
   page's existing body content into the fake browser window itself.
   ==================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'win98-retro';
  var THIS_SCRIPT = document.currentScript;

  function readStoredState() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false; // storage blocked (privacy mode, etc.) — just default to off
    }
  }

  function writeStoredState(active) {
    try {
      sessionStorage.setItem(STORAGE_KEY, active ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
  }

  // ?retro=on / ?retro=off in the URL always wins over stored state, and
  // gets stripped from the address bar afterwards (shareable retro links).
  function readQueryOverride() {
    var params = new URLSearchParams(location.search);
    var val = params.get('retro');
    if (val !== 'on' && val !== 'off') return null;
    params.delete('retro');
    var qs = params.toString();
    var cleanUrl = location.pathname + (qs ? '?' + qs : '') + location.hash;
    if (window.history && history.replaceState) {
      history.replaceState(null, '', cleanUrl);
    }
    return val === 'on';
  }

  // Maps the current real page to its retro equivalent, e.g.
  // /mission.html -> /retro/mission.html (or /retro/index.html for "/").
  // Override the folder with: <script ... data-retro-base="/retro/">
  function computeRetroUrl() {
    var base = (THIS_SCRIPT && THIS_SCRIPT.dataset.retroBase) || 'retro/';
    if (base.charAt(base.length - 1) !== '/') base += '/';
    var file = location.pathname.split('/').pop();
    if (!file) file = 'index.html';
    return base + file;
  }

  function buildOverlay() {
    if (document.getElementById('win98-desktop')) return;

    // 1. Grab everything currently in <body> — this is the real site.
      // keep the countdown gate as a direct child of <body>; countdown-gate.css relies on that
      var originalChildren = Array.prototype.slice.call(document.body.childNodes)
          .filter(function (node) { return node.id !== 'gate-overlay'; });

    // 2. Build the desktop / window frame skeleton.
    var desktop = document.createElement('div');
    desktop.id = 'win98-desktop';

    var frame = document.createElement('div');
    frame.id = 'win98-frame';

    var titlebar = document.createElement('div');
    titlebar.className = 'win98-chrome win98-titlebar';
    titlebar.innerHTML =
      '<div class="win98-titlebar-left">' +
        '<span class="win98-ie-icon" aria-hidden="true">e</span>' +
        '<span class="win98-title-text"></span>' +
      '</div>' +
      '<div class="win98-titlebar-btns">' +
        '<button type="button" class="win98-tb-btn" aria-label="Minimize">_</button>' +
        '<button type="button" class="win98-tb-btn" aria-label="Maximize">&#9633;</button>' +
        '<button type="button" class="win98-tb-btn win98-tb-close" aria-label="Close">&#10005;</button>' +
      '</div>';

    var menubar = document.createElement('div');
    menubar.className = 'win98-chrome win98-menubar';
    ['File', 'Edit', 'View', 'Go', 'Favorites', 'Help'].forEach(function (label) {
      var span = document.createElement('span');
      span.textContent = label;
      menubar.appendChild(span);
    });

    var toolbar = document.createElement('div');
    toolbar.className = 'win98-chrome win98-toolbar';

    var addressbar = document.createElement('div');
    addressbar.className = 'win98-chrome win98-addressbar';
    addressbar.innerHTML =
      '<span class="win98-address-label">Address</span>' +
      '<span class="win98-address-field">' +
        '<span class="win98-address-icon" aria-hidden="true">\uD83C\uDF10</span>' +
        '<input class="win98-address-input" type="text" readonly spellcheck="false" aria-label="Address">' +
      '</span>' +
      '<span class="win98-address-dropdown" aria-hidden="true">&#9660;</span>' +
      '<span class="win98-links-label">Links</span>';

    var contentArea = document.createElement('div');
    contentArea.className = 'win98-content-area';

    var realContent = document.createElement('div');
    realContent.id = 'win98-real-content';

    var retroFrame = document.createElement('iframe');
    retroFrame.id = 'win98-retro-frame';
    retroFrame.setAttribute('title', 'Retro site preview');

    var statusbar = document.createElement('div');
    statusbar.className = 'win98-chrome win98-statusbar';
    statusbar.innerHTML =
      '<span class="win98-status-text">Done</span>' +
      '<span class="win98-status-cell" aria-hidden="true"></span>' +
      '<span class="win98-status-cell" aria-hidden="true"></span>' +
      '<span class="win98-status-zone"><span aria-hidden="true">\uD83C\uDF10</span> Internet zone</span>';

    function goRetroHome() {
      var base = (THIS_SCRIPT && THIS_SCRIPT.dataset.retroBase) || 'retro/';
      if (base.charAt(base.length - 1) !== '/') base += '/';
      loadRetroUrl(base + 'index.html');
    }

    function loadRetroUrl(url) {
      if (retroFrame.dataset.loadedUrl !== url) {
        retroFrame.src = url;
        retroFrame.dataset.loadedUrl = url;
      }
    }

    // Toolbar buttons — a few are genuinely functional, the rest are
    // authentic period decoration (just like the real thing half the time).
    var tools = [
      { icon: '\u25C1', label: 'Back', action: function () { history.back(); } },
      { icon: '\u25B7', label: 'Forward', action: function () { history.forward(); } },
      { sep: true },
      { icon: '\u2715', label: 'Stop', action: function () {} },
      { icon: '\u27F3', label: 'Refresh', action: function () { location.reload(); } },
      { icon: '\u2302', label: 'Home', action: goRetroHome },
      { sep: true },
      { icon: '\uD83D\uDD0D', label: 'Search', action: function () {} },
      { icon: '\u2606', label: 'Favorites', action: function () {} },
      { icon: '\uD83D\uDD52', label: 'History', action: function () {} }
    ];

    tools.forEach(function (t) {
      if (t.sep) {
        var sep = document.createElement('div');
        sep.className = 'win98-tool-sep';
        toolbar.appendChild(sep);
        return;
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'win98-tool-btn';
      btn.innerHTML =
        '<span class="win98-tool-icon" aria-hidden="true">' + t.icon + '</span><span>' + t.label + '</span>';
      btn.addEventListener('click', t.action);
      toolbar.appendChild(btn);
    });

    // 3. Move the real site content into its own wrapper, and add the
    //    (initially empty) retro iframe alongside it. Only one of the two
    //    is ever visible at a time — see win98-overlay.css.
    originalChildren.forEach(function (node) { realContent.appendChild(node); });
    contentArea.appendChild(realContent);
    contentArea.appendChild(retroFrame);

    frame.appendChild(titlebar);
    frame.appendChild(menubar);
    frame.appendChild(toolbar);
    frame.appendChild(addressbar);
    frame.appendChild(contentArea);
    frame.appendChild(statusbar);
    desktop.appendChild(frame);
    document.body.appendChild(desktop);

    // 4. Toggle button (always visible, in both modes).
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'win98-toggle';
    toggle.setAttribute('aria-pressed', 'false');
    var toggleIcon = document.createElement('span');
    toggleIcon.className = 'win98-toggle-icon';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleIcon.textContent = '\uD83D\uDDB1';
    var toggleLabel = document.createElement('span');
    toggleLabel.textContent = '1998 Mode';
    toggle.appendChild(toggleIcon);
    toggle.appendChild(toggleLabel);
    document.body.appendChild(toggle);

    // 5. Fill in the title bar / address bar with real page info.
    var titleTextEl = titlebar.querySelector('.win98-title-text');
    var addressInputEl = addressbar.querySelector('.win98-address-input');
    var HOST = 'HERMES-MISSION.COM';

    function refreshChrome() {
      var active = document.documentElement.classList.contains('win98-active');
      if (active) {
        var retroPath = computeRetroUrl().replace(/^\.?\/+/, '');
        addressInputEl.value = 'WWW.' + HOST + '/' + retroPath.toUpperCase();
        titleTextEl.textContent = 'PASSENGER - Microsoft Internet Explorer';
      } else {
        addressInputEl.value = 'WWW.' + HOST;
        titleTextEl.textContent = (document.title || 'Passenger') + ' - Microsoft Internet Explorer';
      }
    }
    refreshChrome();

    // Clicking a link inside the retro nav sidebar navigates the iframe
    // directly (it's a same-origin <a href> to another /retro/*.html page),
    // which never touches the outer page's URL — so refreshChrome() alone
    // can't see it. Re-sync the address bar from the iframe's own location
    // every time it finishes navigating, so it always reflects whichever
    // retro page is actually showing (mission, crew, player-guide, ...).
    retroFrame.addEventListener('load', function () {
      if (!document.documentElement.classList.contains('win98-active')) return;
      try {
        var framePath = retroFrame.contentWindow.location.pathname;
        var file = framePath.split('/').filter(Boolean).pop() || 'index.html';
        var base = (THIS_SCRIPT && THIS_SCRIPT.dataset.retroBase) || 'retro/';
        if (base.charAt(base.length - 1) !== '/') base += '/';
        addressInputEl.value = 'WWW.' + HOST + '/' + (base + file).toUpperCase();
        retroFrame.dataset.loadedUrl = base + file;
      } catch (e) {
        /* cross-origin or detached frame — leave the address bar as-is */
      }
    });

    // 6. Wire up the toggle + close button + Escape key.
    function setActive(active) {
      document.documentElement.classList.toggle('win98-active', active);
      toggle.setAttribute('aria-pressed', String(active));
      toggleLabel.textContent = active ? 'Exit Retro' : '1998 Mode';
      writeStoredState(active);
      if (active) {
        loadRetroUrl(computeRetroUrl());
      }
      refreshChrome();
    }

    // Restore retro mode if it was on before this page was loaded — this is
    // what makes clicking a link to another page (or a real reload) stay in
    // retro mode instead of silently dropping back to the normal site. A
    // ?retro=on / ?retro=off in the URL always wins over stored state.
    // (document.documentElement may already carry the class here if the
    // early inline snippet in <head> ran first — see integration notes.)
    var queryOverride = readQueryOverride();
    setActive(
      queryOverride !== null
        ? queryOverride
        : document.documentElement.classList.contains('win98-active') || readStoredState()
    );

    toggle.addEventListener('click', function () {
      setActive(!document.documentElement.classList.contains('win98-active'));
    });

    titlebar.querySelector('.win98-tb-close').addEventListener('click', function () {
      setActive(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.documentElement.classList.contains('win98-active')) {
        setActive(false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildOverlay);
  } else {
    buildOverlay();
  }
})();
