/*!
 * IELTS Hub — Student Tracker
 * Self-contained: injects modal + change-name pill, exposes window.IELTSTracker.
 *
 * Usage on a test page (one line, anywhere in <body> or <head>):
 *   <script src="https://maqsudjon-cell.github.io/ielts-hub/js/tracker.js" defer></script>
 *
 * Then where the final score is computed:
 *   IELTSTracker.sendResult('Trainer 2 Test 5 Listening', score);
 */
(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────
  // Paste your Apps Script Web App URL here after deploying Code.gs.
  // While empty, results are logged to console only (no network call).
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwfdFsU9ZSg-52UvH8rHWCfbuj6K4W4RWFCbX93GyFabAjeZIEyJJk6qDGKmJLDzGVSOA/exec';
  // ────────────────────────────────────────────────────────

  // ─── Base URL / environment ───────────────────────────
  // Derive where this script was loaded from, so firebase-init.js and the
  // "My results" page resolve to the same deployment (staging vs production).
  var SCRIPT_SRC = (function () {
    try {
      if (document.currentScript && document.currentScript.src) return document.currentScript.src;
    } catch (e) {}
    return 'https://maqsudjon-cell.github.io/ielts-hub/js/tracker.js';
  })();
  var BASE_URL   = SCRIPT_SRC.replace(/\/js\/tracker\.js(\?.*)?$/, '');
  // Staging *and* local development must never write to the production Sheet.
  var IS_STAGING = /ielts-hub-staging|localhost|127\.0\.0\.1/.test(BASE_URL);

  // Firebase results database — loaded lazily. Everything here degrades
  // gracefully: if Firebase is blocked or misconfigured, the Sheets
  // pipeline below still works untouched.
  function ensureFirebase() {
    if (window.IHFirebase) return window.IHFirebase.ready;
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = BASE_URL + '/js/firebase-init.js';
      s.defer = true;
      s.onload = function () { resolve(window.IHFirebase ? window.IHFirebase.ready : null); };
      s.onerror = function () { resolve(null); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function syncStudent(name) {
    if (!name) return;
    ensureFirebase().then(function (fb) {
      if (!fb || !fb.user) return;
      fb.db.collection('students').doc(fb.user.uid).set({
        name: name,
        updatedAt: fb.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function (err) {
        console.warn('[IELTS Tracker] student sync failed:', err && err.code);
      });
    });
  }

  var STORAGE_KEY = 'ielts_student_name';
  var STYLE_ID    = 'ih-tracker-styles';
  var MODAL_ID    = 'ih-tracker-modal';
  var PILL_ID     = 'ih-tracker-pill';

  // ─── CSS (injected once) ───────────────────────────────
  var CSS = [
    '.ih-tracker-root,#ih-tracker-pill{',
    '  --ih-bg:#0f172a;',
    '  --ih-surface:rgba(17,24,39,0.78);',
    '  --ih-text:#f8fafc;',
    '  --ih-muted:#94a3b8;',
    '  --ih-border:rgba(255,255,255,0.08);',
    '  --ih-accent:#0088cc;',
    '  --ih-accent-2:#2AABEE;',
    '  --ih-radius:16px;',
    '  font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;',
    '  -webkit-font-smoothing:antialiased;',
    '  -moz-osx-font-smoothing:grayscale;',
    '}',

    /* Modal root */
    '.ih-tracker-root{',
    '  position:fixed;inset:0;z-index:2147483600;',
    '  display:flex;align-items:center;justify-content:center;',
    '  padding:20px;',
    '}',
    '.ih-tracker-overlay{',
    '  position:absolute;inset:0;',
    '  background:rgba(2,6,23,0.65);',
    '  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
    '  opacity:0;transition:opacity 260ms cubic-bezier(0.4,0,0.2,1);',
    '}',
    '.ih-tracker-root.is-open .ih-tracker-overlay{opacity:1;}',
    '.ih-tracker-root.is-closing .ih-tracker-overlay{opacity:0;}',

    /* Modal card */
    '.ih-tracker-card{',
    '  position:relative;width:100%;max-width:420px;',
    '  background:var(--ih-surface);',
    '  backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);',
    '  border:1px solid var(--ih-border);',
    '  border-radius:var(--ih-radius);',
    '  padding:32px;',
    '  color:var(--ih-text);',
    '  box-shadow:0 25px 50px -12px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.04),inset 0 1px 0 rgba(255,255,255,0.06);',
    '  transform:scale(0.95);opacity:0;',
    '  transition:transform 280ms cubic-bezier(0.4,0,0.2,1),opacity 220ms ease;',
    '}',
    '.ih-tracker-root.is-open .ih-tracker-card{transform:scale(1);opacity:1;}',
    '.ih-tracker-root.is-closing .ih-tracker-card{transform:scale(0.98);opacity:0;transition-duration:180ms;}',

    '.ih-tracker-kicker{',
    '  display:inline-block;font-size:11px;font-weight:700;',
    '  letter-spacing:0.14em;text-transform:uppercase;',
    '  color:var(--ih-accent-2);',
    '  padding:4px 10px;border-radius:999px;',
    '  background:rgba(0,136,204,0.14);',
    '  margin-bottom:16px;',
    '}',
    '.ih-tracker-card h2{',
    '  margin:0 0 8px;font-size:24px;font-weight:700;',
    '  letter-spacing:-0.02em;line-height:1.2;color:#fff;',
    '}',
    '.ih-tracker-sub{',
    '  margin:0 0 24px;color:var(--ih-muted);font-size:14px;line-height:1.55;',
    '}',
    '.ih-tracker-form{display:flex;flex-direction:column;gap:12px;}',
    '.ih-tracker-input{',
    '  width:100%;min-height:48px;',
    '  background:rgba(255,255,255,0.04);',
    '  border:1px solid var(--ih-border);',
    '  border-radius:12px;padding:0 16px;',
    '  color:var(--ih-text);',
    '  font:500 15px Inter,sans-serif;outline:none;',
    '  transition:border-color 220ms ease,box-shadow 220ms ease,background-color 220ms ease;',
    '}',
    '.ih-tracker-input::placeholder{color:var(--ih-muted);}',
    '.ih-tracker-input:focus{',
    '  border-color:var(--ih-accent);',
    '  background:rgba(255,255,255,0.06);',
    '  box-shadow:0 0 0 4px rgba(0,136,204,0.2);',
    '}',
    '.ih-tracker-btn{',
    '  display:inline-flex;align-items:center;justify-content:center;',
    '  min-height:48px;border:none;cursor:pointer;',
    '  border-radius:12px;',
    '  background:linear-gradient(135deg,#2AABEE 0%,#0088cc 100%);',
    '  color:#fff;font:600 15px Inter,sans-serif;letter-spacing:0.005em;',
    '  box-shadow:0 6px 18px rgba(0,136,204,0.38),inset 0 1px 0 rgba(255,255,255,0.18);',
    '  transition:transform 220ms cubic-bezier(0.4,0,0.2,1),box-shadow 220ms ease,filter 220ms ease;',
    '}',
    '.ih-tracker-btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(0,136,204,0.5),inset 0 1px 0 rgba(255,255,255,0.2);}',
    '.ih-tracker-btn:active{transform:translateY(0);filter:brightness(0.96);}',
    '.ih-tracker-btn:focus-visible{outline:2px solid #fff;outline-offset:3px;}',

    /* Account chip — collapses to a small avatar at top-left so it never covers',
       a test page\'s timer/menu (top-right) or question nav (bottom). Expands',
       to "Hi, {name} · Change" on hover (desktop) or tap (touch). */
    '#ih-tracker-pill{',
    '  position:fixed;top:10px;left:10px;z-index:2147483500;',
    '  display:inline-flex;align-items:center;',
    '  height:40px;padding:4px;',
    '  background:rgba(15,23,42,0.55);',
    '  backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);',
    '  border:1px solid var(--ih-border);',
    '  border-radius:999px;',
    '  color:var(--ih-text);font-size:13px;line-height:1;',
    '  box-shadow:0 6px 16px rgba(0,0,0,0.22);',
    '  opacity:0.6;',
    '  transition:opacity 200ms ease,box-shadow 200ms ease;',
    '}',
    '#ih-tracker-pill:hover,#ih-tracker-pill.is-open{opacity:1;box-shadow:0 10px 24px rgba(0,0,0,0.32);}',
    /* Avatar (always visible) */
    '#ih-tracker-pill .ih-pill-avatar{',
    '  flex:0 0 auto;width:32px;height:32px;border-radius:50%;',
    '  display:inline-flex;align-items:center;justify-content:center;',
    '  background:linear-gradient(135deg,#2AABEE 0%,#0088cc 100%);',
    '  color:#fff;font:600 14px Inter,sans-serif;text-transform:uppercase;',
    '  cursor:pointer;border:none;padding:0;',
    '}',
    '#ih-tracker-pill .ih-pill-avatar:focus-visible{outline:2px solid #fff;outline-offset:2px;}',
    /* Collapsible body — hidden by default, revealed on hover/open */
    '#ih-tracker-pill .ih-pill-body{',
    '  display:inline-flex;align-items:center;gap:6px;white-space:nowrap;',
    '  max-width:0;overflow:hidden;opacity:0;',
    '  transition:max-width 240ms cubic-bezier(0.4,0,0.2,1),opacity 200ms ease,padding 240ms ease;',
    '  padding:0;',
    '}',
    '#ih-tracker-pill:hover .ih-pill-body,#ih-tracker-pill.is-open .ih-pill-body{',
    '  max-width:340px;opacity:1;padding:0 8px 0 8px;',
    '}',
    '#ih-tracker-pill .ih-pill-greet{color:var(--ih-muted);}',
    '#ih-tracker-pill .ih-pill-name{font-weight:600;}',
    '#ih-tracker-pill .ih-pill-sep{color:var(--ih-muted);opacity:0.5;}',
    '#ih-tracker-pill .ih-pill-change,#ih-tracker-pill .ih-pill-results{',
    '  display:inline-flex;align-items:center;justify-content:center;',
    '  background:none;border:none;cursor:pointer;',
    '  color:var(--ih-accent-2);font:500 12px Inter,sans-serif;',
    '  padding:6px 8px;border-radius:999px;min-height:30px;',
    '  text-decoration:none;white-space:nowrap;',
    '  transition:background-color 180ms ease,color 180ms ease;',
    '}',
    '#ih-tracker-pill .ih-pill-change:hover,#ih-tracker-pill .ih-pill-results:hover{background:rgba(0,136,204,0.18);color:#7ec8ed;}',
    '#ih-tracker-pill .ih-pill-change:focus-visible,#ih-tracker-pill .ih-pill-results:focus-visible{outline:2px solid var(--ih-accent-2);outline-offset:2px;}',

    /* Toast (non-blocking confirmation) */
    '.ih-tracker-toast{',
    '  position:fixed;left:50%;bottom:24px;transform:translate(-50%,8px);',
    '  z-index:2147483700;',
    '  display:inline-flex;align-items:center;gap:10px;',
    '  padding:10px 16px;border-radius:999px;',
    '  background:rgba(15,23,42,0.92);color:#f8fafc;',
    '  border:1px solid rgba(255,255,255,0.1);',
    '  font:500 13px Inter,sans-serif;',
    '  box-shadow:0 12px 30px rgba(0,0,0,0.35);',
    '  opacity:0;pointer-events:none;',
    '  transition:opacity 220ms ease,transform 220ms ease;',
    '}',
    '.ih-tracker-toast.is-shown{opacity:1;transform:translate(-50%,0);}',
    '.ih-tracker-toast .dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.2);}',
    '.ih-tracker-toast.is-error .dot{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,0.2);}',

    /* Mobile */
    '@media (max-width:480px){',
    '  .ih-tracker-card{padding:24px;border-radius:18px;}',
    '  .ih-tracker-card h2{font-size:22px;}',
    '  #ih-tracker-pill{top:8px;left:8px;font-size:12px;}',
    '}',

    /* Reduced motion */
    '@media (prefers-reduced-motion:reduce){',
    '  .ih-tracker-overlay,.ih-tracker-card,.ih-tracker-input,.ih-tracker-btn,',
    '  #ih-tracker-pill,#ih-tracker-pill .ih-pill-change,.ih-tracker-toast{',
    '    transition:none !important;',
    '  }',
    '}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ─── Storage helpers ──────────────────────────────────
  function readName() {
    try { return (localStorage.getItem(STORAGE_KEY) || '').trim(); }
    catch (e) { return ''; }
  }
  function saveName(n) {
    try { localStorage.setItem(STORAGE_KEY, (n || '').trim()); }
    catch (e) { /* private mode etc. — still works in memory for this session */ }
  }
  function clearName() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  // ─── Modal ────────────────────────────────────────────
  function showModal() {
    return new Promise(function (resolve) {
      if (document.getElementById(MODAL_ID)) {
        document.getElementById(MODAL_ID).remove();
      }

      var root = document.createElement('div');
      root.className = 'ih-tracker-root';
      root.id = MODAL_ID;
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-labelledby', 'ih-tracker-title');

      root.innerHTML =
        '<div class="ih-tracker-overlay" aria-hidden="true"></div>' +
        '<div class="ih-tracker-card">' +
          '<span class="ih-tracker-kicker">Welcome</span>' +
          '<h2 id="ih-tracker-title">Enter your name</h2>' +
          '<p class="ih-tracker-sub">We\'ll save it on this device so you don\'t need to enter it again.</p>' +
          '<form class="ih-tracker-form" novalidate>' +
            '<input type="text" class="ih-tracker-input" placeholder="Your name" autocomplete="name" required maxlength="60" aria-label="Your name" />' +
            '<button type="submit" class="ih-tracker-btn">Continue</button>' +
          '</form>' +
        '</div>';

      document.body.appendChild(root);
      // Trigger open animation on next frame
      requestAnimationFrame(function () { root.classList.add('is-open'); });

      var input = root.querySelector('.ih-tracker-input');
      var form  = root.querySelector('.ih-tracker-form');

      // Focus the input shortly after opening so the animation looks intentional
      setTimeout(function () { input.focus(); }, 80);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = (input.value || '').trim();
        if (!v) { input.focus(); input.classList.add('is-invalid'); return; }
        saveName(v);

        root.classList.add('is-closing');
        setTimeout(function () {
          root.remove();
          ensurePill();
          resolve(v);
        }, 200);
      });

      // Keep focus inside the modal (simple trap on Tab)
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
          // Single focusable area — input then button → re-loop
          var focusables = [input, root.querySelector('.ih-tracker-btn')];
          var i = focusables.indexOf(document.activeElement);
          if (e.shiftKey) { e.preventDefault(); focusables[(i - 1 + focusables.length) % focusables.length].focus(); }
          else            { e.preventDefault(); focusables[(i + 1) % focusables.length].focus(); }
        }
      });
    });
  }

  // ─── Change-name pill ─────────────────────────────────
  function ensurePill() {
    var name = readName();
    if (!name) {
      var existing = document.getElementById(PILL_ID);
      if (existing) existing.remove();
      return;
    }
    var pill = document.getElementById(PILL_ID);
    if (!pill) {
      pill = document.createElement('div');
      pill.id = PILL_ID;
      pill.innerHTML =
        '<button type="button" class="ih-pill-avatar" aria-label="Account — tap to change name"></button>' +
        '<div class="ih-pill-body">' +
          '<span class="ih-pill-greet">Hi,</span>' +
          '<span class="ih-pill-name"></span>' +
          '<span class="ih-pill-sep">·</span>' +
          '<a class="ih-pill-results" target="_blank" rel="noopener" hidden>My results</a>' +
          '<span class="ih-pill-sep ih-pill-results-sep" hidden>·</span>' +
          '<button type="button" class="ih-pill-change" aria-label="Change name">Change</button>' +
        '</div>';
      // Avatar toggles the expanded state (needed for touch where there is no hover)
      pill.querySelector('.ih-pill-avatar').addEventListener('click', function (e) {
        e.stopPropagation();
        pill.classList.toggle('is-open');
      });
      pill.querySelector('.ih-pill-change').addEventListener('click', changeName);
      // "My results" link appears once Firebase resolves the student's uid —
      // the uid travels in the URL so the dashboard works cross-origin.
      ensureFirebase().then(function (fb) {
        if (!fb || !fb.user) return;
        var link = pill.querySelector('.ih-pill-results');
        var sep  = pill.querySelector('.ih-pill-results-sep');
        if (!link) return;
        link.href = BASE_URL + '/me.html?uid=' + encodeURIComponent(fb.user.uid);
        link.hidden = false;
        if (sep) sep.hidden = false;
      });
      // Tap anywhere else collapses it again
      document.addEventListener('click', function (e) {
        if (!pill.contains(e.target)) pill.classList.remove('is-open');
      });
      document.body.appendChild(pill);
    }
    pill.querySelector('.ih-pill-name').textContent = name;
    pill.querySelector('.ih-pill-avatar').textContent = name.charAt(0);
  }

  function changeName() {
    clearName();
    location.reload();
  }

  // ─── Toast (small "Saved ✓" notification) ─────────────
  function toast(message, isError) {
    var el = document.createElement('div');
    el.className = 'ih-tracker-toast' + (isError ? ' is-error' : '');
    el.innerHTML = '<span class="dot"></span><span>' + escapeHtml(message) + '</span>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-shown'); });
    setTimeout(function () {
      el.classList.remove('is-shown');
      setTimeout(function () { el.remove(); }, 240);
    }, 2400);
  }
  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  // ─── Public API ───────────────────────────────────────
  function ensureName() {
    return new Promise(function (resolve) {
      var n = readName();
      if (n) { ensurePill(); resolve(n); return; }
      showModal().then(resolve);
    });
  }

  function sendResult(testName, score) {
    var data = {
      name:  readName(),
      test:  String(testName || ''),
      score: (score === undefined || score === null) ? '' : score,
      date:  new Date().toISOString()
    };
    // Always log so the user can verify integration even before deploying Apps Script
    try { console.log('[IELTS Tracker] result', data); } catch (e) {}

    // ─── Firestore write (fire-and-forget, independent of Sheets) ───
    // Security rules accept numeric scores 0–40 only; anything else is
    // skipped here so a rules rejection never surfaces to the student.
    var numScore = Number(data.score);
    if (Number.isFinite(numScore) && numScore >= 0 && numScore <= 40) {
      ensureFirebase().then(function (fb) {
        if (!fb || !fb.user) return;
        fb.db.collection('results').add({
          uid:   fb.user.uid,
          name:  data.name,
          test:  data.test.slice(0, 180),
          score: numScore,
          ts:    fb.firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
          console.log('[IELTS Tracker] result saved to Firestore');
        }).catch(function (err) {
          console.warn('[IELTS Tracker] Firestore write failed:', err && err.code);
        });
      });
    }

    // Staging deployments skip the Sheets write so test runs never
    // pollute the real student spreadsheet.
    if (IS_STAGING) {
      console.log('[IELTS Tracker] staging — Sheets write skipped');
      toast('Result saved ✓ (staging)', false);
      return Promise.resolve(true);
    }

    if (!WEB_APP_URL) {
      console.warn('[IELTS Tracker] WEB_APP_URL is empty — set it in tracker.js to enable Google Sheets logging.');
      toast('Result saved locally (Sheets URL not set)', true);
      return Promise.resolve(false);
    }

    // Show confirmation immediately — don't make the student wait on the network.
    // The write happens server-side, and a no-cors response is opaque (unreadable)
    // anyway, so there's nothing to wait for. Apps Script cold starts can add
    // several seconds to the round-trip; firing the toast now keeps it instant.
    toast('Result saved ✓', false);

    // IMPORTANT: mode 'no-cors' is required for Apps Script.
    // Apps Script answers a POST with a 302 redirect to googleusercontent.com,
    // which sends no CORS headers — in default ('cors') mode the browser blocks
    // that redirect and the fetch rejects even though the row was written.
    // 'no-cors' sends a simple request (text/plain is safelisted, no preflight)
    // and the row is written. Fire-and-forget: keepalive lets it complete even
    // if the page navigates away right after submit.
    return fetch(WEB_APP_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify(data),
      keepalive: true
    }).then(function () {
      return true;
    }).catch(function (err) {
      console.warn('[IELTS Tracker] send failed:', err);
      return false;
    });
  }

  function init() {
    injectStyles();
    ensureName().then(syncStudent);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.IELTSTracker = {
    getName:     readName,
    ensureName:  ensureName,
    sendResult:  sendResult,
    changeName:  changeName
  };
})();
