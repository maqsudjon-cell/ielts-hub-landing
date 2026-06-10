/*!
 * IELTS Hub — Firebase bootstrap (compat SDK)
 * Self-contained: loads the Firebase compat scripts, initializes the app,
 * and resolves the signed-in user.
 *
 * Modes (set BEFORE this script loads):
 *   window.IH_AUTH_MODE = 'manual'  → never signs in by itself; the page
 *                                     calls IHFirebase.signInWithGoogle() /
 *                                     signInAsGuest(). Used by the landing
 *                                     page login gate.
 *   (default)                       → signs in anonymously when nobody is
 *                                     signed in. Used by tracker.js on
 *                                     test pages (zero-friction logging).
 *
 * Usage:
 *   <script src="js/firebase-init.js" defer></script>
 *   IHFirebase.ready.then(function (fb) {
 *     if (!fb) return;             // Firebase unavailable — degrade gracefully
 *     fb.user                      // current user or null (manual mode)
 *     fb.db.collection('results')…
 *   });
 *
 * NOTE: the apiKey below is a public app identifier, not a secret.
 * Access control lives in Firestore security rules.
 */
(function () {
  'use strict';
  if (window.IHFirebase) return;

  var SDK_VERSION = '12.14.0';
  var SDK_BASE = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/';
  var MANUAL = window.IH_AUTH_MODE === 'manual';

  var CONFIG = {
    apiKey: 'AIzaSyAqS59ek0seZ0rcSZb3RPhiwTzleIAZ-9E',
    authDomain: 'ieltshub-e2aa8.firebaseapp.com',
    projectId: 'ieltshub-e2aa8',
    storageBucket: 'ieltshub-e2aa8.firebasestorage.app',
    messagingSenderId: '645780307385',
    appId: '1:645780307385:web:1dc8640e294be2204b4a68'
  };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.getAttribute('data-ih-loaded')) { resolve(); return; }
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('load failed: ' + src)); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { s.setAttribute('data-ih-loaded', '1'); resolve(); };
      s.onerror = function () { reject(new Error('load failed: ' + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  /* Waits for the persisted auth state. In default mode, signs in
     anonymously when nobody is signed in — never clobbers an existing
     (e.g. Google) session. In manual mode, resolves null instead so the
     page can show a login screen. */
  function resolveUser(auth) {
    return new Promise(function (resolve) {
      var unsub = auth.onAuthStateChanged(function (user) {
        unsub();
        if (user || MANUAL) { resolve(user || null); return; }
        auth.signInAnonymously().then(function (cred) {
          resolve(cred.user);
        }).catch(function (err) {
          // Most common cause: Anonymous provider not enabled in the console.
          console.warn('[IH Firebase] anonymous sign-in failed:', err && err.code, err && err.message);
          resolve(null);
        });
      });
    });
  }

  var ready = loadScript(SDK_BASE + 'firebase-app-compat.js')
    .then(function () { return loadScript(SDK_BASE + 'firebase-auth-compat.js'); })
    .then(function () { return loadScript(SDK_BASE + 'firebase-firestore-compat.js'); })
    .then(function () {
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(CONFIG);
      var auth = firebase.auth();
      var db = firebase.firestore();
      return resolveUser(auth).then(function (user) {
        return { app: app, auth: auth, db: db, user: user, firebase: firebase };
      });
    })
    .catch(function (err) {
      console.warn('[IH Firebase] unavailable:', err && err.message);
      return null;
    });

  /* Google sign-in: popup first (best UX), redirect fallback when the
     popup is blocked. */
  function signInWithGoogle() {
    return ready.then(function (fb) {
      if (!fb) return Promise.reject(new Error('firebase-unavailable'));
      var provider = new fb.firebase.auth.GoogleAuthProvider();
      return fb.auth.signInWithPopup(provider).catch(function (err) {
        if (err && err.code === 'auth/popup-blocked') {
          return fb.auth.signInWithRedirect(provider);
        }
        throw err;
      });
    });
  }

  function signInAsGuest() {
    return ready.then(function (fb) {
      if (!fb) return Promise.reject(new Error('firebase-unavailable'));
      return fb.auth.signInAnonymously();
    });
  }

  function signOut() {
    return ready.then(function (fb) {
      if (!fb) return;
      return fb.auth.signOut();
    });
  }

  window.IHFirebase = {
    ready: ready,
    signInWithGoogle: signInWithGoogle,
    signInAsGuest: signInAsGuest,
    signOut: signOut
  };
})();
