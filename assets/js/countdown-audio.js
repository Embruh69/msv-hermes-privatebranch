/* ====================================================================
   PASSENGER :: COUNTDOWN AUDIO
   ---------------------------------------------------------------
   Adds sound to the departure countdown (both the site gate and the
   standalone /countdown.html):

     - 2001: A Space Odyssey theme, looping in the background
     - Apollo 11 launch audio, started when 20 seconds remain

   Browsers block audio until the visitor interacts with the page, so a
   SOUND button is added to the countdown. Sound starts on the first
   click (or by itself, if the browser allows autoplay); after that the
   button mutes / unmutes.

   The Apollo clip is timed against the countdown TARGET, not against
   the moment it started. If someone turns sound on with, say, 12
   seconds left, the clip seeks 8 seconds in so it stays in sync.

   While the Apollo clip plays, the music ducks down so the callouts
   are audible. When the gate is dismissed (ENTER SITE) everything
   fades out and stops.

   Loaded with data attributes so Jekyll can resolve the file URLs
   (baseurl-safe):
     <script src="..." data-music="..." data-apollo="..." defer></script>

   Pair with: assets/css/countdown.css   (.sound-toggle styles)
              assets/js/countdown-target.js (sets window.COUNTDOWN_TARGET)
              assets/audio/2001-theme.mp3, assets/audio/apollo-11-launch.mp3
   ==================================================================== */

(function () {
  'use strict';

  /* ---------- settings ---------- */

  var APOLLO_TRIGGER_SECONDS = 20;  // start the Apollo clip when this many seconds remain
  var APOLLO_CLIP_OFFSET = 0;       // ...beginning this many seconds into the clip
  var MUSIC_VOLUME = 0.6;           // background music level (0-1)
  var MUSIC_DUCKED_VOLUME = 0.15;   // music level while the Apollo clip plays
  var APOLLO_VOLUME = 1;
  var STORAGE_KEY = 'countdown-sound'; // sessionStorage: 'on' | 'off' (remembered per tab)

  var THIS_SCRIPT = document.currentScript;
  var MUSIC_SRC = THIS_SCRIPT && THIS_SCRIPT.dataset.music;
  var APOLLO_SRC = THIS_SCRIPT && THIS_SCRIPT.dataset.apollo;

  function fade(audio, to, ms, done) {
    clearInterval(audio._fadeTimer);
    var from = audio.volume;
    var start = Date.now();
    audio._fadeTimer = setInterval(function () {
      var t = Math.min(1, (Date.now() - start) / ms);
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * t));
      if (t >= 1) {
        clearInterval(audio._fadeTimer);
        if (done) done();
      }
    }, 50);
  }

  function init() {
    if (!MUSIC_SRC || !APOLLO_SRC) return;

    var root = document.documentElement;
    var overlay = document.getElementById('gate-overlay');
    var host;

    if (overlay) {
      // Site gate: only relevant while it's actually showing.
      if (!root.classList.contains('gate-active')) return;
      host = overlay;
    } else {
      // Standalone /countdown.html
      host = document.querySelector('.countdown-page');
      if (!host) return;
    }

    // The time the clock is counting to lives in assets/js/countdown-target.js
    // (window.COUNTDOWN_TARGET). If it's missing we can't know the real
    // target, so say so out loud instead of quietly cueing off the wrong
    // time (the music still plays).
    var target = Infinity;
    if (window.COUNTDOWN_TARGET) {
      target = window.COUNTDOWN_TARGET.getTime();
      console.info('[countdown-audio] counting to', new Date(target).toString(),
                   '- Apollo cue at T-' + APOLLO_TRIGGER_SECONDS + 's');
    } else {
      console.warn('[countdown-audio] window.COUNTDOWN_TARGET is not set, so the Apollo cue is disabled. ' +
                   'Make sure assets/js/countdown-target.js loads before this script.');
    }
    if (target - Date.now() <= 0) return; // already launched, nothing to score

    var music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.preload = 'auto';
    music.volume = MUSIC_VOLUME;

    var apollo = new Audio(APOLLO_SRC);
    apollo.preload = 'auto';
    apollo.volume = APOLLO_VOLUME;

    var started = false;       // the browser let us start playback
    var muted = false;
    var apolloStarted = false;
    var closed = false;        // gate dismissed; audio is shutting down
    var timer = null;

    /* ---------- button ---------- */

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sound-toggle needs-click';
    var iconEl = document.createElement('span');
    iconEl.setAttribute('aria-hidden', 'true');
    var labelEl = document.createElement('span');
    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    host.appendChild(btn);

    function render() {
      if (!started) {
        iconEl.textContent = '\uD83D\uDD08';
        labelEl.textContent = 'ENABLE SOUND';
        btn.classList.add('needs-click');
        btn.setAttribute('aria-pressed', 'false');
      } else if (muted) {
        iconEl.textContent = '\uD83D\uDD07';
        labelEl.textContent = 'SOUND OFF';
        btn.classList.remove('needs-click');
        btn.setAttribute('aria-pressed', 'false');
      } else {
        iconEl.textContent = '\uD83D\uDD0A';
        labelEl.textContent = 'SOUND ON';
        btn.classList.remove('needs-click');
        btn.setAttribute('aria-pressed', 'true');
      }
    }

    function remember(value) {
      try { sessionStorage.setItem(STORAGE_KEY, value); } catch (e) { /* storage blocked */ }
    }

    /* ---------- Apollo clip ---------- */

    // Where in the clip we should be right now, given the countdown.
    function apolloSeekTarget() {
      var remaining = (target - Date.now()) / 1000;
      return APOLLO_CLIP_OFFSET + (APOLLO_TRIGGER_SECONDS - remaining);
    }

    function duck(on) {
      if (closed) return;
      fade(music, on ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME, on ? 800 : 2000);
    }

    function playApollo() {
      function go() {
        var seekTo = apolloSeekTarget();
        if (isFinite(apollo.duration) && seekTo >= apollo.duration) return; // clip is already over
        try { apollo.currentTime = Math.max(0, seekTo); } catch (e) { /* not seekable yet */ }
        duck(true);
        var p = apollo.play();
        if (p && p.catch) p.catch(function () { duck(false); });
      }
      if (apollo.readyState >= 1) {
        go();
      } else {
        apollo.addEventListener('loadedmetadata', go, { once: true });
      }
    }

    apollo.addEventListener('ended', function () { duck(false); });

    function checkApollo() {
      if (!started || apolloStarted || closed) return;
      if ((target - Date.now()) / 1000 > APOLLO_TRIGGER_SECONDS) return;
      apolloStarted = true;
      playApollo();
    }

    // iOS / Safari only let an <audio> element start on its own later if
    // that element was first started by a tap. Kick the Apollo element
    // off (silently) inside the click, then park it until T-20.
    function primeApollo() {
      apollo.muted = true;
      var p = apollo.play();
      if (!p || !p.then) { apollo.muted = muted; return; }
      p.then(function () {
        if (!apolloStarted) {
          apollo.pause();
          try { apollo.currentTime = 0; } catch (e) { /* ignore */ }
        }
        apollo.muted = muted;
      }).catch(function () {
        apollo.muted = muted;
      });
    }

    /* ---------- starting / muting ---------- */

    function onStarted() {
      if (closed) { music.pause(); return; }
      started = true;
      remember('on');
      render();
      checkApollo(); // in case sound was enabled late
    }

    function tryStart(fromGesture) {
      if (started || closed) return;
      var p;
      try { p = music.play(); } catch (e) { return; }
      if (fromGesture) primeApollo();
      if (p && p.then) {
        p.then(onStarted).catch(function () { /* blocked: wait for a click */ });
      } else {
        onStarted();
      }
    }

    btn.addEventListener('click', function () {
      if (!started) {
        tryStart(true);
        return;
      }
      muted = !muted;
      music.muted = muted;
      apollo.muted = muted;
      remember(muted ? 'off' : 'on');
      render();
    });

    /* ---------- gate dismissed: fade out and stop ---------- */

    function shutDown() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      fade(music, 0, 800, function () { music.pause(); });
      fade(apollo, 0, 800, function () { apollo.pause(); });
    }

    if (overlay && typeof MutationObserver !== 'undefined') {
      new MutationObserver(function () {
        if (!root.classList.contains('gate-active')) shutDown();
      }).observe(root, { attributes: true, attributeFilter: ['class'] });
    }

    /* ---------- go ---------- */

    render();
    timer = setInterval(checkApollo, 250);

    var stored = null;
    try { stored = sessionStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    if (stored !== 'off') tryStart(false); // autoplay attempt; usually blocked until a click
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
