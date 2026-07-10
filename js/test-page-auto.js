/*!
 * IELTS Hub — Test-page auto-loader (single-tag installer)
 *
 * Drop this on any test page:
 *   <script src="https://flarestamina.com/ielts-hub/js/test-page-auto.js" defer></script>
 *
 * What it does, with zero per-page configuration:
 *   1. Injects tracker.js  → name modal + "Hi, {name} · Change" pill + sendResult()
 *   2. Injects footer.js   → Telegram contact footer
 *   3. Auto-detects the test title (from <meta name="test-title">, the first <h1>,
 *      or <title>) and the score (from the page's existing result modal) and fires
 *      IELTSTracker.sendResult(title, score) the moment the result modal opens.
 *
 * Optional per-page overrides (only if auto-detection misses your modal):
 *   <meta name="test-title"          content="Custom Test Name">
 *   <meta name="test-modal-selector" content="#myResultsModal.show">
 *   <meta name="test-score-selector" content="#myScoreText">
 */
(function () {
  'use strict';
  if (window.__ihAutoLoaded) return;
  window.__ihAutoLoaded = true;

  var BASE = 'https://flarestamina.com/ielts-hub';

  // ─── 1. Inject tracker.js + footer.js ─────────────────────────
  function ensureScript(src) {
    if (document.querySelector('script[data-ih-src="' + src + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute('data-ih-src', src);
    (document.head || document.documentElement).appendChild(s);
  }
  ensureScript(BASE + '/js/tracker.js');
  ensureScript(BASE + '/js/footer.js');

  // ─── 2. Title detection ───────────────────────────────────────
  function detectTitle() {
    var meta = document.querySelector('meta[name="test-title"]');
    if (meta && meta.content) return meta.content.trim();

    // Prefer the most visually prominent heading — first <h1> on the page
    var h1 = document.querySelector('h1');
    if (h1 && h1.textContent && h1.textContent.trim()) {
      return h1.textContent.replace(/\s+/g, ' ').trim();
    }

    // Fall back to <title>, stripping any " | Site" suffix
    var t = (document.title || '').replace(/\s*[|–—-]\s*.*$/, '').trim();
    return t || 'Untitled Test';
  }

  // ─── 3. Score detection patterns ──────────────────────────────
  // Known patterns across existing test pages. The first pattern whose
  // `container` is in the DOM and matches AND whose `score` element holds
  // a non-placeholder value wins.
  var PATTERNS = [
    // MockLab Essential / Trainer 2 series
    { container: '#resultsModal.open',  score: '#modalScore' },
    // Single-passage reading template (e.g. Kakapo, Manatees)
    { container: '#result-panel.show',  score: '#score-num' },
    // CDI multi-passage reading template (Submit Final Answers → showResults):
    // results render into #screen-results with a .score-hero; grab the raw "X / 40".
    { container: '#screen-results',     score: '.score-hero .stat strong' },
    // Same template, fallback to band score if the raw-score cell ever changes.
    { container: '#screen-results',     score: '.score-hero .band' },
    // Generic modal-overlay pattern
    { container: '.modal-overlay.open', score: '.modal-score' },
    // Trainer 2 series alt: body class signals submission
    { container: 'body.test-submitted', score: '#modalScore' }
  ];

  // Page-level overrides (highest priority)
  (function applyOverrides() {
    var modalMeta = document.querySelector('meta[name="test-modal-selector"]');
    var scoreMeta = document.querySelector('meta[name="test-score-selector"]');
    if (modalMeta && modalMeta.content && scoreMeta && scoreMeta.content) {
      PATTERNS.unshift({ container: modalMeta.content.trim(), score: scoreMeta.content.trim() });
    }
  })();

  function isPlaceholder(text) {
    if (!text) return true;
    var t = text.replace(/\s+/g, '').trim();
    return t === '' || t === '-' || t === '–' || t === '—' || t === '?' || t === 'N/A';
  }

  function pickScore() {
    for (var i = 0; i < PATTERNS.length; i++) {
      var p = PATTERNS[i];
      var container;
      try { container = document.querySelector(p.container); }
      catch (e) { continue; } // bad selector — skip
      if (!container) continue;

      var scoreEl;
      try { scoreEl = document.querySelector(p.score); }
      catch (e) { continue; }
      if (!scoreEl) continue;

      var txt = (scoreEl.textContent || '').replace(/\s+/g, ' ').trim();
      if (isPlaceholder(txt)) continue;
      return txt; // e.g. "32", "8/13", "Band 7.5"
    }
    return null;
  }

  // ─── 4. Fire sendResult once when the result modal appears ────
  var sent = false;
  function maybeSend() {
    if (sent) return;
    if (!window.IELTSTracker || typeof window.IELTSTracker.sendResult !== 'function') return;
    var score = pickScore();
    if (score == null) return;
    sent = true;
    try {
      window.IELTSTracker.sendResult(detectTitle(), score);
    } catch (e) {
      // Re-arm so we can retry on the next mutation
      sent = false;
      console.warn('[IELTS Auto] sendResult failed:', e);
    }
  }

  function init() {
    // Check once in case the result is already on screen
    maybeSend();

    var observer, poll, stopTimer;
    function stopAll() {
      if (observer) observer.disconnect();
      if (poll) clearInterval(poll);
      if (stopTimer) clearTimeout(stopTimer);
    }

    // Trailing debounce: every mutation (re)schedules a check ~40ms after the
    // DOM settles. Unlike a drop-throttle this never loses the critical
    // showResults() mutation, so detection is effectively instant.
    var debTimer = null;
    observer = new MutationObserver(function () {
      if (sent) { stopAll(); return; }
      if (debTimer) return;
      debTimer = setTimeout(function () {
        debTimer = null;
        maybeSend();
        if (sent) stopAll();
      }, 40);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'open']
    });

    // Safety net: a very cheap poll (a few querySelectors) guarantees the score
    // is picked up within ~300ms even if some page swallows mutation events.
    poll = setInterval(function () {
      maybeSend();
      if (sent) stopAll();
    }, 300);

    // Give up after 60 min — nobody's still on the page that long.
    stopTimer = setTimeout(stopAll, 60 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Tiny diagnostic surface for the console:
  //   IELTSAuto.diagnose()   // prints what it'd send right now
  window.IELTSAuto = {
    diagnose: function () {
      return {
        title: detectTitle(),
        score: pickScore(),
        sent:  sent,
        patterns: PATTERNS
      };
    }
  };
})();
