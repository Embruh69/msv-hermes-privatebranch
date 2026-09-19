/* ====================================================================
   PASSENGER :: STANDALONE DEPARTURE COUNTDOWN (/countdown.html)
   ---------------------------------------------------------------
   Builds the segmented digit clock and ticks it down to the target.
   Once the target time passes, reveals the "ENTER SITE" link.

   Pairs with: countdown.html, assets/css/countdown.css

   The target time comes from window.COUNTDOWN_TARGET, which is set
   in assets/js/countdown-target.js (the only place to edit it).
   ==================================================================== */

(function () {
  'use strict';

  var TARGET = window.COUNTDOWN_TARGET;

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
    var clockEl = document.getElementById('clock');
    if (!clockEl || !TARGET) return; // not on the countdown page — nothing to do

    // Build the clock only once, even if this script ends up included
    // (or init() called) twice; otherwise every digit slot gets doubled.
    if (clockEl.hasAttribute('data-clock-built')) return;
    clockEl.setAttribute('data-clock-built', '');

    var units = clockEl.querySelectorAll('.clock-unit');
    var digitPairs = {};

    units.forEach(function (unit) {
      var slot = unit.querySelector('.digit-slot');
      var d0 = buildDigit(slot);
      var d1 = buildDigit(slot);
      digitPairs[unit.getAttribute('data-unit')] = [d0, d1];
    });

    var statusEl = document.getElementById('status');
    var enterBtn = document.getElementById('enterBtn');
    var timer;
    var launched = false;

    function renderPair(pair, str) {
      setDigit(pair[0], str.charAt(0));
      setDigit(pair[1], str.charAt(1));
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
          clockEl.classList.add('launched');
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

    tick();
    timer = setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
