document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('nav.primary a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.addEventListener('click', function () {
      item.classList.toggle('open');
    });
  });

  var header = document.querySelector('header.site');
  if (header) {
    var lastScroll = window.pageYOffset || document.documentElement.scrollTop;
    var ticking = false;

    var updateHeader = function () {
      var current = window.pageYOffset || document.documentElement.scrollTop;

      if (document.body.classList.contains('menu-open')) {
        lastScroll = current;
        ticking = false;
        return;
      }

      if (current <= 80) {
        header.classList.remove('nav-hidden');
      } else if (current > lastScroll) {
        header.classList.add('nav-hidden');
      } else {
        header.classList.remove('nav-hidden');
      }

      lastScroll = current;
      ticking = false;
    };

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    }, { passive: true });
  }
});
