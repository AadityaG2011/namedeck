// google-import.js — optional "Import from Google" using Google Sign-In + the Picker with
// the narrow `drive.file` scope (per-file access only; no full-Drive access, no security audit).
//
// Flow: sign in (drive.file) -> Picker to select the responses spreadsheet AND the photos ->
// read the sheet (name + photo file ID per row) -> download each photo by ID -> hand back
// [{ preferredName, blob }] matched by file ID. Private (the teacher's own auth) and stored
// on-device by the app. The Google client libraries are loaded lazily on first use, so the
// app stays dependency-free and offline-capable until this feature is actually used.
//
// SETUP (only you can do this — see README "Google import"): create a Google Cloud project,
// enable the Picker API + Drive API, make an OAuth Client ID (Web) and an API key, then paste
// them below. Until both are filled in, the button explains it isn't configured yet.

window.NameDeck = window.NameDeck || {};

(function () {
  // ---- Paste your Google Cloud credentials here ----
  var CLIENT_ID = '905358747786-rs954olnn8q7sn51igv6sp21pdbu7ugg.apps.googleusercontent.com';
  var API_KEY = 'AIzaSyAk84A3wN67i4OW-BjuHHUiliiFpO90vf4';
  // --------------------------------------------------

  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var FOLDER_MIME = 'application/vnd.google-apps.folder';
  var NAME_HEADER = 'Preferred Full Name';   // must match your form's name question title
  var PHOTO_HEADER = 'Your Photo';           // must match your form's photo question title

  var pickerReady = false, tokenClient = null, accessToken = null;

  function configured() { return !!CLIENT_ID && !!API_KEY; }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true; s.defer = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  // Load Google Identity Services (auth) + gapi (Picker), once.
  function ensureLibs() {
    if (pickerReady) return Promise.resolve();
    return Promise.all([
      loadScript('https://accounts.google.com/gsi/client'),
      loadScript('https://apis.google.com/js/api.js')
    ]).then(function () {
      return new Promise(function (resolve) {
        gapi.load('picker', function () { pickerReady = true; resolve(); });
      });
    });
  }

  function ensureTokenClient() {
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: function () {} });
    }
  }

  // Get an OAuth access token for the drive.file scope (prompts the teacher to sign in/consent).
  function getToken() {
    return new Promise(function (resolve, reject) {
      ensureTokenClient();
      tokenClient.callback = function (resp) {
        if (resp && resp.access_token) { accessToken = resp.access_token; resolve(accessToken); }
        else reject(new Error('Sign-in was cancelled'));
      };
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    });
  }

  // Build + show a Picker; resolves with the selected docs (or null if cancelled).
  function buildPicker(token, opts) {
    return new Promise(function (resolve) {
      var b = new google.picker.PickerBuilder()
        .setOAuthToken(token)
        .setDeveloperKey(API_KEY)
        .setAppId(CLIENT_ID.split('-')[0]) // project number: grants drive.file access to picked files
        .setTitle(opts.title)
        .addView(opts.view)
        .setCallback(function (data) {
          var a = data[google.picker.Response.ACTION];
          if (a === google.picker.Action.PICKED) resolve(data[google.picker.Response.DOCUMENTS] || []);
          else if (a === google.picker.Action.CANCEL) resolve(null);
        });
      if (opts.multiselect) b.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      b.build().setVisible(true);
    });
  }
  // Step 1: pick the responses spreadsheet (single).
  function pickSpreadsheet(token) {
    return buildPicker(token, {
      title: 'Step 1 of 2 — select your responses spreadsheet',
      view: new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
    }).then(function (docs) { return docs && docs[0]; });
  }
  // Step 2: pick the photos folder (one click) or the photos (multi-select fallback).
  function pickPhotos(token) {
    return buildPicker(token, {
      title: 'Step 2 of 2 — select your photos folder (or the photos)',
      multiselect: true,
      view: new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(true)
    });
  }

  function authFetch(url, token) {
    return fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  }
  function httpError(label, r) {
    return r.text().then(function (t) {
      throw new Error(label + ' (HTTP ' + r.status + '): ' + String(t).slice(0, 300));
    });
  }
  function downloadFile(id, token) {
    return authFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media', token)
      .then(function (r) { return r.ok ? r.blob() : httpError('Photo download failed', r); });
  }
  function exportSheetCsv(id, token) {
    return authFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '/export?mimeType=text%2Fcsv', token)
      .then(function (r) { return r.ok ? r.text() : httpError('Could not read the spreadsheet', r); });
  }

  // Minimal RFC-4180-ish CSV parser (handles quoted fields, embedded commas/newlines).
  function parseCsv(text) {
    var rows = [], row = [], field = '', inQ = false, i = 0, c;
    for (; i < text.length; i++) {
      c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') { inQ = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') { field += c; }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // From the responses CSV, produce [{ name, fileId }] using the name + photo columns.
  function pairsFromCsv(text) {
    var rows = parseCsv(text);
    if (rows.length < 2) return [];
    var header = rows[0].map(function (h) { return h.trim(); });
    var nameCol = header.indexOf(NAME_HEADER);
    var photoCol = header.indexOf(PHOTO_HEADER);
    if (nameCol < 0 || photoCol < 0) throw new Error('Could not find the "' + NAME_HEADER + '" / "' + PHOTO_HEADER + '" columns');
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var name = (rows[i][nameCol] || '').trim();
      var m = (rows[i][photoCol] || '').match(/[-\w]{25,}/); // the Drive file ID inside the link
      if (name && m) out.push({ name: name, fileId: m[0] });
    }
    return out;
  }

  NameDeck.googleImport = {
    configured: configured,
    // Warm up the Google libraries ahead of time (e.g. when the roster opens), so the first
    // click can open the sign-in popup within the user's tap — otherwise the async load loses
    // the tap gesture and the browser blocks the popup (you'd have to click twice).
    preload: function () {
      if (configured()) ensureLibs().then(ensureTokenClient).catch(function () {});
    },
    // Runs the whole flow; resolves with [{ preferredName, blob }] (blobs are the photo bytes).
    // onStatus(message) is called at each phase (for the in-app progress line).
    run: function (onStatus) {
      onStatus = onStatus || function () {};
      if (!configured()) return Promise.reject(new Error('Google import is not configured'));
      return ensureLibs().then(getToken).then(function (token) {
        return pickSpreadsheet(token).then(function (sheet) {
          if (!sheet) return []; // cancelled
          return pickPhotos(token).then(function (photoDocs) {
            if (!photoDocs) return []; // cancelled
            var folderPicked = false, pickedIds = {};
            photoDocs.forEach(function (d) {
              if (d.mimeType === FOLDER_MIME) folderPicked = true;
              else if (/^image\//.test(d.mimeType || '')) pickedIds[d.id] = true;
            });
            onStatus('Reading responses…');
            return exportSheetCsv(sheet.id, token).then(function (csv) {
              var pairs = pairsFromCsv(csv);
              // If a folder was picked, try every response's photo (folder grant should allow it);
              // otherwise only the photos that were individually selected.
              var candidates = pairs.filter(function (p) { return folderPicked || pickedIds[p.fileId]; });
              if (!candidates.length) {
                throw new Error(folderPicked
                  ? 'No photos matched — is that the "(File responses)" folder for this form?'
                  : 'None of the selected photos matched the responses');
              }
              var total = candidates.length, done = 0;
              var tick = function () { done++; onStatus('Downloading photos… (' + done + ' of ' + total + ')'); };
              onStatus('Downloading photos… (0 of ' + total + ')');
              return Promise.all(candidates.map(function (p) {
                return downloadFile(p.fileId, token).then(
                  function (blob) { tick(); return { preferredName: p.name, blob: blob }; },
                  function () { tick(); return null; } // tolerate individual failures
                );
              })).then(function (results) {
                var students = results.filter(Boolean);
                if (!students.length && folderPicked) {
                  throw new Error("Couldn't open the photos in that folder — try selecting the photos individually instead.");
                }
                return students;
              });
            });
          });
        });
      });
    }
  };
})();
