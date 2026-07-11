/*!
 * IELTS Hub — Student Tracker (FS Account edition)
 * Self-contained: requires an FS Account (one sign-up for the whole
 * FLARESTAMINA ecosystem), shows a "Hi, {name}" pill, exposes
 * window.IELTSTracker.
 *
 * Usage on a test page (one line, anywhere in <body> or <head>):
 *   <script src="https://flarestamina.com/ielts-hub/js/tracker.js" defer></script>
 *
 * Then where the final score is computed:
 *   IELTSTracker.sendResult('Trainer 2 Test 5 Listening', score);
 *
 * Identity comes from FS Account (fs-auth.js). Auth is mandatory — with no
 * session the student is redirected to https://flarestamina.com/account/.
 * Results carry {phone, first_name, last_name}; phone is the stable user ID.
 */
(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwfdFsU9ZSg-52UvH8rHWCfbuj6K4W4RWFCbX93GyFabAjeZIEyJJk6qDGKmJLDzGVSOA/exec';
  var FS_AUTH_URL = 'https://flarestamina.com/assets/fs-auth.js';
  var ACCOUNT_URL = 'https://flarestamina.com/account/';
  var LEGACY_NAME_KEY = 'ielts_student_name'; // read-only fallback if fs-auth.js cannot load
  // ────────────────────────────────────────────────────────

  var STYLE_ID = 'ih-tracker-styles';
  var PILL_ID  = 'ih-tracker-pill';

  // Firebase results database — loaded lazily. Everything here degrades
  // gracefully: if Firebase is blocked or misconfigured, the Sheets
  // pipeline below still works untouched.
  var FIREBASE_INIT_URL = 'https://flarestamina.com/ielts-hub/js/firebase-init.js';
  function ensureFirebase() {
    if (window.IHFirebase) return window.IHFirebase.ready;
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = FIREBASE_INIT_URL;
      s.defer = true;
      s.onload = function () { resolve(window.IHFirebase ? window.IHFirebase.ready : null); };
      s.onerror = function () { resolve(null); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function syncStudent(user) {
    if (!user || !user.name) return;
    ensureFirebase().then(function (fb) {
      if (!fb || !fb.user) return;
      fb.db.collection('students').doc(fb.user.uid).set({
        name: user.name,
        phone: user.phone || '',
        updatedAt: fb.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function (err) {
        console.warn('[IELTS Tracker] student sync failed:', err && err.code);
      });
    });
  }

  // ─── CSS (injected once) ───────────────────────────────
  var CSS = [
    '#ih-tracker-pill{',
    '  --ih-bg:#0f172a;',
    '  --ih-surface:rgba(17,24,39,0.78);',
    '  --ih-text:#f8fafc;',
    '  --ih-muted:#94a3b8;',
    '  --ih-border:rgba(255,255,255,0.08);',
    '  --ih-accent:#FF5A1F;',
    '  --ih-accent-2:#FF7A3D;',
    '  --ih-radius:16px;',
    '  font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;',
    '  -webkit-font-smoothing:antialiased;',
    '  -moz-osx-font-smoothing:grayscale;',
    '}',

    /* Greeting pill */
    '#ih-tracker-pill{',
    '  position:fixed;top:10px;left:10px;z-index:2147483500;',
    '  display:flex;align-items:center;gap:0;',
    '  background:var(--ih-surface);',
    '  backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);',
    '  border:1px solid var(--ih-border);border-radius:999px;',
    '  color:var(--ih-text);font-size:13px;font-weight:500;',
    '  box-shadow:0 8px 24px rgba(0,0,0,0.35);',
    '  padding:4px;max-width:calc(100vw - 20px);',
    '  transition:padding 200ms ease;',
    '}',
    '#ih-tracker-pill .ih-pill-avatar{',
    '  width:30px;height:30px;border-radius:50%;flex:0 0 30px;',
    '  display:flex;align-items:center;justify-content:center;',
    '  background:linear-gradient(135deg,var(--ih-accent),var(--ih-accent-2));',
    '  color:#180702;font-weight:700;font-size:14px;text-transform:uppercase;',
    '  border:none;cursor:pointer;padding:0;',
    '}',
    '#ih-tracker-pill .ih-pill-body{',
    '  display:flex;align-items:center;gap:6px;overflow:hidden;',
    '  max-width:0;opacity:0;transition:max-width 240ms ease,opacity 200ms ease,padding 200ms ease;',
    '  white-space:nowrap;padding:0;',
    '}',
    '#ih-tracker-pill:hover .ih-pill-body,#ih-tracker-pill.is-open .ih-pill-body{',
    '  max-width:280px;opacity:1;padding:0 10px 0 8px;',
    '}',
    '#ih-tracker-pill .ih-pill-greet{color:var(--ih-muted);}',
    '#ih-tracker-pill .ih-pill-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;max-width:150px;}',
    '#ih-tracker-pill .ih-pill-sep{color:var(--ih-muted);}',
    '#ih-tracker-pill .ih-pill-change{',
    '  background:none;border:none;padding:2px 2px;cursor:pointer;',
    '  color:var(--ih-accent-2);font:inherit;font-weight:600;font-size:12.5px;',
    '  border-radius:6px;transition:color 150ms ease;',
    '}',
    '#ih-tracker-pill .ih-pill-change:hover{color:var(--ih-accent);text-decoration:underline;}',

    /* Toast */
    '.ih-tracker-toast{',
    '  position:fixed;left:50%;bottom:26px;transform:translate(-50%,8px);',
    '  z-index:2147483600;display:flex;align-items:center;gap:9px;',
    '  padding:11px 16px;border-radius:12px;',
    '  background:rgba(15,23,42,0.92);color:#f8fafc;',
    '  border:1px solid rgba(255,255,255,0.1);',
    '  font:500 13px Inter,sans-serif;',
    '  box-shadow:0 12px 30px rgba(0,0,0,0.35);',
    '  opacity:0;pointer-events:none;',
    '  transition:opacity 220ms ease,transform 220ms ease;',
    '}',
    '.ih-tracker-toast.is-shown{opacity:1;transform:translate(-50%,0);}',
    '.ih-tracker-toast.is-share{pointer-events:auto;bottom:72px;}',
    '.ih-tracker-toast.is-share a{color:#FF7A3D;font-weight:700;text-decoration:none;}',
    '.ih-tracker-toast.is-share a:hover{color:#FF5A1F;text-decoration:underline;}',
    '.ih-tracker-toast .dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,0.2);}',
    '.ih-tracker-toast.is-error .dot{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,0.2);}',

    /* Mobile */
    '@media (max-width:480px){',
    '  #ih-tracker-pill{top:8px;left:8px;font-size:12px;}',
    '}',

    /* Reduced motion */
    '@media (prefers-reduced-motion:reduce){',
    '  #ih-tracker-pill,#ih-tracker-pill .ih-pill-body,.ih-tracker-toast{',
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

  // ─── FS Account session ───────────────────────────────
  var fsUser = null; // {name, first_name, last_name, phone}

  function toDisplay(u) {
    if (!u) return null;
    var name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim();
    return { name: name, first_name: u.first_name || '', last_name: u.last_name || '', phone: u.phone || '' };
  }

  function legacyName() {
    try { return (localStorage.getItem(LEGACY_NAME_KEY) || '').trim(); }
    catch (e) { return ''; }
  }

  function ensureAuthScript() {
    return new Promise(function (resolve) {
      if (window.FSAuth) { resolve(true); return; }
      var existing = document.querySelector('script[data-fs-auth]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(!!window.FSAuth); });
        existing.addEventListener('error', function () { resolve(false); });
        return;
      }
      var s = document.createElement('script');
      s.src = FS_AUTH_URL;
      s.setAttribute('data-fs-auth', '1');
      s.onload = function () { resolve(!!window.FSAuth); };
      s.onerror = function () { resolve(false); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  // Resolves with the user object. With no session it redirects to the
  // account page (auth is mandatory) and the promise never resolves.
  // If fs-auth.js itself cannot load (network failure), we degrade to any
  // legacy stored name rather than bricking the test page.
  function ensureUser() {
    return ensureAuthScript().then(function (loaded) {
      if (loaded) {
        var u = window.FSAuth.getUser();
        if (!u) {
          if (!window.FSAuth.require()) {
            return new Promise(function () {}); // redirecting to /account/
          }
          // Enforcement is off (transition mode) — legacy name keeps tools usable.
          fsUser = { name: legacyName() || 'Student', first_name: '', last_name: '', phone: '' };
          return fsUser;
        }
        fsUser = toDisplay(u);
        return fsUser;
      }
      console.warn('[IELTS Tracker] fs-auth.js failed to load — falling back to legacy name');
      fsUser = { name: legacyName(), first_name: '', last_name: '', phone: '' };
      return fsUser;
    });
  }

  function readName() {
    return fsUser ? fsUser.name : '';
  }

  // ─── Greeting pill ────────────────────────────────────
  function ensurePill() {
    if (!fsUser || !fsUser.name) return;
    var pill = document.getElementById(PILL_ID);
    if (!pill) {
      pill = document.createElement('div');
      pill.id = PILL_ID;
      pill.innerHTML =
        '<button type="button" class="ih-pill-avatar" aria-label="FS Account"></button>' +
        '<div class="ih-pill-body">' +
          '<span class="ih-pill-greet">Hi,</span>' +
          '<span class="ih-pill-name"></span>' +
          '<span class="ih-pill-sep">·</span>' +
          '<button type="button" class="ih-pill-change" aria-label="Manage FS Account">Account</button>' +
        '</div>';
      pill.querySelector('.ih-pill-avatar').addEventListener('click', function (e) {
        e.stopPropagation();
        pill.classList.toggle('is-open');
      });
      pill.querySelector('.ih-pill-change').addEventListener('click', goToAccount);
      document.addEventListener('click', function (e) {
        if (!pill.contains(e.target)) pill.classList.remove('is-open');
      });
      document.body.appendChild(pill);
    }
    pill.querySelector('.ih-pill-name').textContent = fsUser.first_name || fsUser.name;
    pill.querySelector('.ih-pill-avatar').textContent = (fsUser.name || '?').charAt(0);
  }

  function goToAccount() {
    location.href = ACCOUNT_URL + '?return=' + encodeURIComponent(location.href);
  }

  // ─── Toast ────────────────────────────────────────────
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

  /* Small celebration burst when a result is saved. No-op on reduced motion. */
  function confetti() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var colors = ['#FF5A1F', '#FF7A3D', '#FFA45C', '#FFD166', '#F59E0B', '#EC4899'];
      var frag = document.createDocumentFragment();
      var pieces = [];
      for (var i = 0; i < 28; i++) {
        var el = document.createElement('div');
        var size = 6 + Math.random() * 6;
        el.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;top:-12px;left:' +
          (10 + Math.random() * 80) + 'vw;width:' + size + 'px;height:' + (size * 0.6) + 'px;border-radius:2px;background:' +
          colors[i % colors.length] + ';opacity:1;';
        frag.appendChild(el);
        pieces.push({ el: el, x: (Math.random() - 0.5) * 2, r: Math.random() * 360, v: 2 + Math.random() * 3 });
      }
      document.body.appendChild(frag);
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var t = (ts - start) / 1000;
        var done = t > 1.8;
        pieces.forEach(function (p) {
          p.el.style.transform = 'translate(' + (p.x * t * 60) + 'px,' + (p.v * t * t * 160) + 'px) rotate(' + (p.r + t * 320) + 'deg)';
          if (t > 1.2) p.el.style.opacity = String(Math.max(0, 1 - (t - 1.2) / 0.6));
        });
        if (done) pieces.forEach(function (p) { p.el.remove(); });
        else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    } catch (e) {}
  }

  /* ─── Full Mock cross-promo ──────────────────────────
     Shown once per 24h, ~4s after a result is saved (high-intent moment,
     never during a test). Dismissible, auto-hides after 30s. */
  function showFullMockPromo() {
    try {
      if (location.pathname.indexOf('/full-mock/') === 0) return;
      var KEY = 'p8_fm_promo_ts';
      var last = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() - last < 24 * 60 * 60 * 1000) return;
      localStorage.setItem(KEY, String(Date.now()));

      var st = document.createElement('style');
      st.textContent =
        '.p8-fm-promo{position:fixed;right:16px;bottom:16px;z-index:2147483000;max-width:330px;' +
        'background:#151009;color:#fafafa;border:1px solid #3d2a1f;border-radius:16px;padding:16px 18px;' +
        'box-shadow:0 12px 40px rgba(0,0,0,.45);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.5;' +
        'transform:translateY(16px);opacity:0;transition:transform .35s,opacity .35s}' +
        '.p8-fm-promo.on{transform:none;opacity:1}' +
        '.p8-fm-promo .tag{display:inline-block;background:#FF5A1F;color:#180702;font-weight:800;font-size:10px;' +
        'letter-spacing:.08em;border-radius:6px;padding:3px 8px;margin-bottom:8px}' +
        '.p8-fm-promo b{color:#FF7A3D}' +
        '.p8-fm-promo .x{position:absolute;top:8px;right:10px;background:none;border:none;color:#9ca3af;' +
        'font-size:15px;cursor:pointer;padding:4px}' +
        '.p8-fm-promo a.go{display:inline-block;margin-top:10px;background:linear-gradient(135deg,#E8501A,#FF7A3D);' +
        'color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:9px 16px;font-size:13.5px}' +
        '@media(max-width:600px){.p8-fm-promo{left:12px;right:12px;bottom:12px;max-width:none}}';
      document.head.appendChild(st);

      var el = document.createElement('div');
      el.className = 'p8-fm-promo';
      el.innerHTML =
        '<button class="x" aria-label="Close">✕</button>' +
        '<span class="tag">NEW · FULL MOCK</span>' +
        '<div>Ready for the real exam? <b>Listening + Reading + Writing</b> in one sitting — ' +
        'real timers, AI-marked writing, instant IELTS-style result sheet.</div>' +
        '<div style="margin-top:6px;color:#9ca3af;font-size:12.5px">Just <b>10 000 UZS</b> — the cheapest full mock around.</div>' +
        '<a class="go" href="https://flarestamina.com/full-mock/">Try the Full Mock →</a>';
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.classList.add('on'); });

      function hide() { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 400); }
      el.querySelector('.x').addEventListener('click', hide);
      setTimeout(hide, 30000);
    } catch (e) {}
  }

  /* one-tap share to Telegram — every shared result markets the site */
  function shareToast(data) {
    try {
      var text = 'I scored ' + data.score + ' on \u201C' + data.test + '\u201D \uD83D\uDD38 Free IELTS practice: flarestamina.com';
      var href = 'https://t.me/share/url?url=' + encodeURIComponent(location.href.split('#')[0]) +
                 '&text=' + encodeURIComponent(text);
      var el = document.createElement('div');
      el.className = 'ih-tracker-toast is-share';
      el.innerHTML = '<span class="dot"></span><span>\uD83D\uDCE4 <a target="_blank" rel="noopener"></a></span>';
      var a = el.querySelector('a');
      a.href = href;
      a.textContent = 'Share your result';
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.classList.add('is-shown'); });
      setTimeout(function () {
        el.classList.remove('is-shown');
        setTimeout(function () { el.remove(); }, 240);
      }, 12000);
    } catch (e) {}
  }

  function sendResult(testName, score) {
    var data = {
      name:  readName(),
      phone: fsUser ? fsUser.phone : '',
      first_name: fsUser ? fsUser.first_name : '',
      last_name:  fsUser ? fsUser.last_name : '',
      test:  String(testName || ''),
      score: (score === undefined || score === null) ? '' : score,
      date:  new Date().toISOString()
    };
    // Always log so the user can verify integration even before deploying Apps Script
    try { console.log('[IELTS Tracker] result', data); } catch (e) {}

    // Local history — the hub (same origin) reads this to show "done" badges.
    try {
      var hist = JSON.parse(localStorage.getItem('p8_results') || '[]');
      hist.push({ test: data.test, score: data.score, href: location.href, date: data.date });
      if (hist.length > 300) hist = hist.slice(-300);
      localStorage.setItem('p8_results', JSON.stringify(hist));
    } catch (e) {}

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
          phone: data.phone,
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

    if (!WEB_APP_URL) {
      console.warn('[IELTS Tracker] WEB_APP_URL is empty — set it in tracker.js to enable Google Sheets logging.');
      toast('Result saved locally (Sheets URL not set)', true);
      return Promise.resolve(false);
    }

    confetti();
    setTimeout(showFullMockPromo, 4000);
    shareToast(data);

    // Show confirmation immediately — don't make the student wait on the network.
    toast('Result saved ✓', false);

    // IMPORTANT: mode 'no-cors' is required for Apps Script.
    // Apps Script answers a POST with a 302 redirect to googleusercontent.com,
    // which sends no CORS headers — in default ('cors') mode the browser blocks
    // that redirect and the fetch rejects even though the row was written.
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

  function ensureName() {
    if (fsUser) { ensurePill(); return Promise.resolve(fsUser.name); }
    return ensureUser().then(function (u) { ensurePill(); return u.name; });
  }

  function init() {
    injectStyles();
    ensureUser().then(function (u) {
      ensurePill();
      syncStudent(u);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.IELTSTracker = {
    getName:     readName,
    getUser:     function () { return fsUser; },
    ensureName:  ensureName,
    sendResult:  sendResult,
    changeName:  goToAccount // backward compat — now opens the FS Account page
  };
})();
