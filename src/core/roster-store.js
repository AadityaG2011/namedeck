// roster-store.js — persistence adapter for the teacher's OWN roster.
//
// The rest of the app treats a roster as a plain array of student objects
// ({ id, preferredName, photo, avatarSeed }); this module is the only place that
// knows *where* that array is kept. In the web prototype it lives in localStorage
// as JSON (photos are small downscaled data URLs). In the native app this boundary
// is swapped for on-device storage — so it's intentionally web-specific and thin.
//
// Every call is wrapped: localStorage can be missing, blocked (opaque origin), or
// over quota. On any failure we degrade quietly and the app falls back to the sample.

window.NameDeck = window.NameDeck || {};

(function () {
  var KEY = 'namedeck.roster.v1';

  NameDeck.rosterStore = {
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        var list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    },
    save: function (list) {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
        return true;
      } catch (e) {
        return false; // unavailable or over quota — kept in memory for this session only
      }
    },
    clear: function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* nothing to do */ }
    }
  };
})();