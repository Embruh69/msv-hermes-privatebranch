/* ====================================================================
   PASSENGER :: COUNTDOWN TARGET  (the ONLY place the time lives)
   ---------------------------------------------------------------
   Everything reads window.COUNTDOWN_TARGET:
     _includes/gate-head.html   (decides whether the gate shows at all)
     assets/js/countdown-gate.js
     assets/js/countdown.js
     assets/js/countdown-audio.js

   To test, change the line below and nothing else. For example, to
   launch 60 seconds after you save + reload, put a time 60 seconds
   from now. For the real launch, use the date shown here.
   ==================================================================== */

window.COUNTDOWN_TARGET = new Date('2026-09-20T20:00:00+07:00');
