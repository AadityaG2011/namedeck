// roster-store.js — persistence adapter for the teacher's OWN roster.
//
// The rest of the app treats a roster as a plain array of student objects
// ({ id, preferredName, photo, avatarSeed, wiki, weight }); this module is the only place that
// knows *where* that data is kept. Because photos are large, storage is split:
//   - METADATA (names, ids, avatar seeds, etc.) — small — lives in localStorage as JSON, so the
//     app can load and render instantly (synchronously).
//   - PHOTOS (downscaled JPEG data URLs) — large — live in IndexedDB, which holds hundreds of MB
//     (vs. localStorage's ~5 MB), so a full class of photos fits. Loaded asynchronously after the
//     first paint (see loadPhotos), just like the demo portraits.
//
// IndexedDB isn't available everywhere (e.g. jsdom in tests, some private modes), so every photo
// call falls back to a per-key localStorage store, and everything is wrapped to degrade quietly.

window.NameDeck = window.NameDeck || {};

(function () {
  var META_KEY = 'namedeck.roster.v1';        // roster metadata (NO photos) in localStorage
  var SEEDED_KEY = 'namedeck.seeded.v1';       // set once the first-run demo roster has been placed
  var PHOTO_PREFIX = 'namedeck.photo.';        // fallback per-photo localStorage keys
  var DB_NAME = 'namedeck', STORE = 'photos';
  var dbPromise = null;

  function hasIDB() { try { return !!window.indexedDB; } catch (e) { return false; } }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  // ---- IndexedDB photo operations (id -> data URL) ----
  function idbGetAll() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = {}, req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
        req.onsuccess = function () {
          var c = req.result;
          if (c) { out[c.key] = c.value; c.continue(); } else resolve(out);
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }
  function idbPut(id, url) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(url, id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbDelete(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    });
  }
  function idbClear() {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    });
  }

  // ---- localStorage fallback (tests / no-IndexedDB environments) ----
  function lsGetAll() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PHOTO_PREFIX) === 0) out[k.slice(PHOTO_PREFIX.length)] = localStorage.getItem(k);
      }
    } catch (e) { /* ignore */ }
    return out;
  }
  function lsPut(id, url) { try { localStorage.setItem(PHOTO_PREFIX + id, url); return true; } catch (e) { return false; } }
  function lsDelete(id) { try { localStorage.removeItem(PHOTO_PREFIX + id); } catch (e) { /* ignore */ } }
  function lsClear() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PHOTO_PREFIX) === 0) keys.push(k); }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
  }

  // Keep only the small (non-photo) fields for localStorage metadata.
  function toMeta(s) {
    return { id: s.id, preferredName: s.preferredName, avatarSeed: s.avatarSeed, wiki: s.wiki, weight: s.weight };
  }

  NameDeck.rosterStore = {
    // Synchronous: the roster metadata (photos come back as null; fill them via loadPhotos()).
    load: function () {
      try {
        var raw = localStorage.getItem(META_KEY);
        var list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        var migrated = false, store = this;
        var out = list.map(function (s) {
          // One-time migration from the old all-in-localStorage format: if a photo rode along in the
          // metadata, move it into the photo store (and keep showing it now) so upgrades don't lose it.
          if (s.photo) { store.savePhoto(s.id, s.photo); migrated = true; }
          return { id: s.id, preferredName: s.preferredName, avatarSeed: s.avatarSeed, wiki: s.wiki, weight: s.weight, photo: s.photo || null };
        });
        if (migrated) this.saveMeta(out); // rewrite metadata without photos, freeing up localStorage
        return out;
      } catch (e) { return []; }
    },
    saveMeta: function (list) {
      try { localStorage.setItem(META_KEY, JSON.stringify(list.map(toMeta))); return true; }
      catch (e) { return false; } // metadata is tiny, so this practically never fails
    },
    // Async photo store (IndexedDB, big) with a localStorage fallback.
    loadPhotos: function () {
      if (hasIDB()) return idbGetAll().catch(function () { return lsGetAll(); });
      return Promise.resolve(lsGetAll());
    },
    savePhoto: function (id, url) {
      if (hasIDB()) return idbPut(id, url).catch(function () { return lsPut(id, url); });
      return Promise.resolve(lsPut(id, url));
    },
    removePhoto: function (id) {
      if (hasIDB()) return idbDelete(id).catch(function () { lsDelete(id); });
      lsDelete(id);
      return Promise.resolve();
    },
    clear: function () {
      try { localStorage.removeItem(META_KEY); } catch (e) { /* ignore */ }
      lsClear();
      if (hasIDB()) idbClear().catch(function () {});
    },
    // Has the one-time demo roster already been seeded? Used so we place it only on the very
    // first launch and never re-add it after the user clears or edits their roster.
    seeded: function () {
      try { return localStorage.getItem(SEEDED_KEY) === '1'; } catch (e) { return false; }
    },
    markSeeded: function () {
      try { localStorage.setItem(SEEDED_KEY, '1'); } catch (e) { /* nothing to do */ }
    }
  };
})();
