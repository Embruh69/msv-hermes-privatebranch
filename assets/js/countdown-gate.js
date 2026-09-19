/* ====================================================================
   PASSENGER :: SITE GATE
   ---------------------------------------------------------------
   Ticks the #gate-overlay countdown clock (built the same way as
   the standalone countdown.html page) and, once the target time
   passes, reveals the real page underneath by removing the
   `gate-active` class from <html> — no reload needed.

   Pair with: _includes/gate-head.html (sets `gate-active` on <html>
   before first paint if we're still before TARGET) and
   _includes/gate-overlay.html (the markup this script fills in).

   NOTE: keep TARGET in sync with the date in
   _includes/gate-head.html and assets/js/countdown.js.
   ==================================================================== */

(function () {
  'use strict';

  var TARGET = new Date('2026-09-20T20:00:00+07:00');

  var FONT = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100']
  };

  function buildDigit(container) {
    var digit = document.createElement('div');
    digit.className = 'digit';
    var dots = [];
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 5; c++) {
        var dot = document.createElement('span');
        dot.className = 'dot';
        digit.appendChild(dot);
        dots.push(dot);
      }
    }
    container.appendChild(digit);
    return dots;
  }

  function setDigit(dots, value) {
    var pattern = FONT[value] || FONT['0'];
    var i = 0;
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 5; c++) {
        dots[i].classList.toggle('lit', pattern[r].charAt(c) === '1');
        i++;
      }
    }
  }

  function pad2(n) {
    n = Math.max(0, Math.min(99, n));
    return (n < 10 ? '0' : '') + n;
  }

  function init() {
    var overlay = document.getElementById('gate-overlay');
    if (!overlay) return;

    // If we're already past TARGET (e.g. a visitor loaded the page
    // after launch, so gate-head.html never added gate-active), there's
    // nothing to build or tick — leave the overlay untouched and hidden.
    if (!document.documentElement.classList.contains('gate-active')) return;

    var units = overlay.querySelectorAll('.clock-unit');
    var digitPairs = {};

    units.forEach(function (unit) {
      var slot = unit.querySelector('.digit-slot');
      var d0 = buildDigit(slot);
      var d1 = buildDigit(slot);
      digitPairs[unit.getAttribute('data-unit')] = [d0, d1];
    });

    var statusEl = document.getElementById('gate-status');
    var enterBtn = document.getElementById('gate-enter');
    var clockEl = document.getElementById('gate-clock');
    var timer;
    var launched = false;

    function renderPair(pair, str) {
      setDigit(pair[0], str.charAt(0));
      setDigit(pair[1], str.charAt(1));
    }

    function reveal() {
      document.documentElement.classList.remove('gate-active');
    }

    function tick() {
      var now = new Date();
      var diff = TARGET.getTime() - now.getTime();

      if (diff <= 0) {
        renderPair(digitPairs.days, '00');
        renderPair(digitPairs.hours, '00');
        renderPair(digitPairs.minutes, '00');
        renderPair(digitPairs.seconds, '00');
        if (!launched) {
          launched = true;
          if (statusEl) statusEl.textContent = 'T-0 :: WE HAVE LIFTOFF';
          if (clockEl) clockEl.classList.add('launched');
          if (enterBtn) enterBtn.classList.add('visible');
        }
        clearInterval(timer);
        return;
      }

      var totalSeconds = Math.floor(diff / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;

      renderPair(digitPairs.days, pad2(days));
      renderPair(digitPairs.hours, pad2(hours));
      renderPair(digitPairs.minutes, pad2(minutes));
      renderPair(digitPairs.seconds, pad2(seconds));
    }

    if (enterBtn) {
      enterBtn.addEventListener('click', reveal);
    }

    tick();
    timer = setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
