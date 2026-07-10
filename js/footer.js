/*!
 * IELTS Hub — Contact Footer
 * Self-contained: injects a link to footer.css and renders a premium contact section.
 *
 * Usage on any page (one line, anywhere in <body> or <head>):
 *   <script src="https://flarestamina.com/ielts-hub/js/footer.js" defer></script>
 */
(function () {
  'use strict';

  // Resolve own URL so footer.css is loaded from the same place as footer.js.
  var CSS_URL = (function () {
    try {
      var s = document.currentScript;
      if (s && s.src) return s.src.replace(/\/js\/footer\.js(\?.*)?$/, '/css/footer.css');
    } catch (e) {}
    return 'https://flarestamina.com/ielts-hub/css/footer.css';
  })();

  var FOOTER_CLASS = 'ih-footer';

  // Official-ish Telegram paper-plane glyph
  var TELEGRAM_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 7.5a2.25 2.25 0 0 0 .126 4.122l3.9 1.205 2.306 7.18a1.125 1.125 0 0 0 1.926.45l2.689-2.927 4.658 3.42a2.25 2.25 0 0 0 3.526-1.342l3.005-15.002a2.25 2.25 0 0 0-2.614-2.821ZM9.984 14.493l9.252-7.073-7.83 8.376a1.125 1.125 0 0 0-.298.61l-.295 1.93-.829-3.843Z"/>' +
    '</svg>';

  function injectStylesheet() {
    if (document.querySelector('link[data-ih-footer]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL;
    link.setAttribute('data-ih-footer', '1');
    document.head.appendChild(link);
  }

  function build() {
    if (document.querySelector('.' + FOOTER_CLASS)) return;

    var f = document.createElement('footer');
    f.className = FOOTER_CLASS;
    f.setAttribute('role', 'contentinfo');
    f.setAttribute('aria-label', 'Site contact and channel');

    var year = new Date().getFullYear();

    f.innerHTML =
      '<div class="ih-footer-inner">' +
        '<div class="ih-footer-content">' +
          '<span class="ih-footer-kicker">Get in Touch</span>' +
          '<h2 class="ih-footer-title">Have a question or feedback?</h2>' +
          '<p class="ih-footer-sub">Reach out on Telegram or subscribe to our channel for updates.</p>' +

          '<div class="ih-footer-actions">' +
            '<a class="ih-cta ih-cta-primary" href="https://t.me/pangea8" target="_blank" rel="noopener noreferrer" aria-label="Join Telegram channel: Flarestamina">' +
              '<span class="ih-cta-icon">' + TELEGRAM_SVG + '</span>' +
              '<span class="ih-cta-text">' +
                '<span class="ih-cta-label">Join Channel</span>' +
                '<span class="ih-cta-handle">@Flarestamina</span>' +
              '</span>' +
              '<span class="ih-cta-chev" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>' +
              '</span>' +
            '</a>' +

            '<a class="ih-cta ih-cta-secondary" href="https://t.me/mrbmp13" target="_blank" rel="noopener noreferrer" aria-label="Contact on Telegram: mrbmp13">' +
              '<span class="ih-cta-icon">' + TELEGRAM_SVG + '</span>' +
              '<span class="ih-cta-text">' +
                '<span class="ih-cta-label">Get in Touch</span>' +
                '<span class="ih-cta-handle">@mrbmp13</span>' +
              '</span>' +
              '<span class="ih-cta-chev" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>' +
              '</span>' +
            '</a>' +
          '</div>' +
        '</div>' +

        '<div class="ih-footer-divider" aria-hidden="true"></div>' +
        '<div class="ih-footer-bottom">© ' + year + ' IELTS Hub · Built with passion</div>' +
      '</div>';

    document.body.appendChild(f);

    // Fade-in on scroll
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            f.classList.add('is-visible');
            io.unobserve(f);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      io.observe(f);
    } else {
      f.classList.add('is-visible');
    }
  }

  function init() {
    injectStylesheet();
    build();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
