/* Single source of truth for the countdown target.
   Dev override:
     ?countdown=15    -> target becomes 15 seconds from now
     ?countdown=0     -> already launched (test the post-zero state)
     ?countdown=off   -> back to the real date
   The override is kept in sessionStorage (per tab), so navigating or
   reloading doesn't reset the timer. */
(function () {
  'use strict';

  var REAL_TARGET = new Date('2026-09-20T20:00:00+07:00');
  var KEY = 'countdown-dev-target';
  var target = REAL_TARGET;

  try {
    var param = new URLSearchParams(location.search).get('countdown');
    if (param !== null) {
      if (param === '' || param === 'off') {
        sessionStorage.removeItem(KEY);
      } else {
        var secs = parseFloat(param);
        if (isFinite(secs)) {
          sessionStorage.setItem(KEY, String(Date.now() + secs * 1000));
        }
      }
    }

    var stored = sessionStorage.getItem(KEY);
    if (stored !== null && isFinite(Number(stored))) {
      target = new Date(Number(stored));
      console.info('[countdown] DEV OVERRIDE active, target =', target.toString(),
                   '(use ?countdown=off to clear)');
    }
  } catch (e) { /* storage blocked: fall back to the real target */ }

  window.COUNTDOWN_TARGET = target;
})();