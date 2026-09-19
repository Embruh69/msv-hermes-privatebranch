/* ====================================================================
   Retro crew page :: A.D.A.M. easter egg
   ---------------------------------------------------------------
   Click A.D.A.M.'s crew entry on /retro/crew.html three times to
   trigger a brief screen glitch (via mgGlitch.js) and reveal a
   hidden, unlisted crew entry. A little foreshadowing.

   Scoped to retro/crew.html only — this file isn't loaded anywhere
   else on the site.

   Pair with: assets/js/mgGlitch.min.js, assets/css/retro-easter-egg.css
   (jQuery is required by mgGlitch.js and must load before this file.)
   ==================================================================== */

(function () {
  'use strict';

  var GLITCH_DURATION_MS = 900;

  document.addEventListener('DOMContentLoaded', function () {
    var adamCell = document.getElementById('adam-cell');
    var overlay = document.getElementById('glitch-overlay');
    var mysteryRow = document.getElementById('mystery-row');

    if (!adamCell || !overlay || !mysteryRow || typeof window.jQuery === 'undefined') {
      return; // fail quietly — this is a bonus, not core functionality
    }

    var clicks = 0;
    var triggered = false;

    adamCell.addEventListener('click', function () {
      if (triggered) return;
      clicks += 1;
      if (clicks >= 3) {
        triggered = true;
        runGlitch();
      }
    });

    function runGlitch() {
      var $ = window.jQuery;

      overlay.style.display = 'block';

      // mgGlitch clones #glitch-overlay into extra layers (.back,
      // .front-2, .front-3) and tags the original element itself
      // .front-1, then randomly clips/offsets each one — see
      // retro-easter-egg.css for how those layers are styled.
      $(overlay).mgGlitch({
        glitch: true,
        scale: true,
        blend: true,
        blendModeType: 'hue',
        glitch1TimeMin: 40,
        glitch1TimeMax: 90,
        glitch2TimeMin: 15,
        glitch2TimeMax: 45,
        zIndexStart: 5
      });

      setTimeout(function () {
        // mgGlitch doesn't have a reliable "stop" of its own (its
        // destroy option checks the wrong element for this usage
        // pattern), and its internal timers keep running forever
        // once started. Rather than removing the layers it created
        // — which would leave those timers walking onto whatever
        // real element ends up next in the DOM — we just hide every
        // layer instead, so the loops keep ticking harmlessly on
        // invisible elements.
        $('#glitch-overlay, #glitch-overlay.back, #glitch-overlay.front-2, #glitch-overlay.front-3')
          .css('display', 'none');

        mysteryRow.classList.remove('hidden-crew');
        mysteryRow.classList.add('mystery-reveal');
        mysteryRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, GLITCH_DURATION_MS);
    }
  });
})();
