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

  // Get an OAuth access token for the drive.file scope. We pass prompt:'' (not 'consent'), so a
  // teacher who has already consented isn't forced through the consent screen again — Google
  // still shows it automatically on the first-ever grant, but returning users go straight through.
  // This matters most in the native app, where each import opens a fresh sign-in page.
  function getToken() {
    return new Promise(function (resolve, reject) {
      ensureTokenClient();
      tokenClient.callback = function (resp) {
        if (resp && resp.access_token) { accessToken = resp.access_token; resolve(accessToken); }
        else reject(new Error('Sign-in was cancelled'));
      };
      tokenClient.requestAccessToken({ prompt: '' });
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
  // Step 2: pick the photos folder (one click grabs all) — or open a folder and multi-select the
  // photos. Picking the "(File responses)" folder is the easy path; recursion handles nesting.
  function pickPhotos(token) {
    return buildPicker(token, {
      title: 'Step 2 of 2 — pick a "(File responses)" folder (either one works)',
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

  // Pull the Drive file ID out of a photo-response cell. Google Forms writes a Drive URL like
  // "https://drive.google.com/open?id=FILE_ID" (or ".../d/FILE_ID/..."); we target those forms
  // first so we never accidentally grab a long filename, then fall back to a bare ID-like token.
  function extractFileId(cell) {
    var s = String(cell || '');
    var m = s.match(/[?&]id=([-\w]{20,})/) || s.match(/\/(?:file\/)?d\/([-\w]{20,})/);
    if (m) return m[1];
    m = s.match(/[-\w]{25,}/);
    return m ? m[0] : null;
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
      var fileId = extractFileId(rows[i][photoCol]);
      if (name && fileId) out.push({ name: name, fileId: fileId });
    }
    return out;
  }

  // Recursively collect the image file IDs inside the picked folder(s). Google Forms stores the
  // uploaded photos in a NESTED "(File responses)" subfolder, so we walk into subfolders too. This
  // only uses the drive.file access granted by picking the folder — no broader Drive access.
  function listImagesInFolder(folderId, token, depth) {
    if (depth > 6) return Promise.resolve({});
    var q = "'" + folderId + "' in parents and trashed = false";
    var url = 'https://www.googleapis.com/drive/v3/files?pageSize=1000&fields=' +
      encodeURIComponent('files(id,mimeType)') + '&q=' + encodeURIComponent(q);
    return authFetch(url, token)
      .then(function (r) { return r.ok ? r.json() : { files: [] }; })
      .then(function (data) {
        var files = (data && data.files) || [], ids = {}, subs = [];
        files.forEach(function (f) {
          if (f.mimeType === FOLDER_MIME) subs.push(listImagesInFolder(f.id, token, depth + 1));
          else if (/^image\//.test(f.mimeType || '')) ids[f.id] = true;
        });
        return Promise.all(subs).then(function (subMaps) {
          subMaps.forEach(function (m) { for (var k in m) ids[k] = true; });
          return ids;
        });
      })
      .catch(function () { return {}; }); // listing may be blocked; the caller falls back
  }
  function gatherFolderImageIds(folderIds, token) {
    if (!folderIds.length) return Promise.resolve({});
    return Promise.all(folderIds.map(function (id) { return listImagesInFolder(id, token, 0); }))
      .then(function (maps) { var all = {}; maps.forEach(function (m) { for (var k in m) all[k] = true; }); return all; });
  }
  // A short, human-readable preview of the names about to import (for the confirmation line).
  function previewNames(pairs) {
    var names = pairs.map(function (p) { return p.name; });
    if (names.length <= 4) return names.join(', ');
    return names.slice(0, 3).join(', ') + ', and ' + (names.length - 3) + ' more';
  }

  // Sign in + pick the sheet, read it (so we can show which students will import), then pick the
  // photos and resolve the accessible ones. Resolves with { token, folderPicked, students:[{
  // preferredName, fileId }] } — no downloading here. The web flow downloads inline (see run); the
  // native flow hands this back to the app, since the sign-in + Picker must run in a real browser.
  function collect(onStatus) {
    onStatus = onStatus || function () {};
    if (!configured()) return Promise.reject(new Error('Google import is not configured'));
    return ensureLibs().then(getToken).then(function (token) {
      return pickSpreadsheet(token).then(function (sheet) {
        if (!sheet) return { token: token, folderPicked: false, students: [] }; // cancelled
        onStatus('Reading responses…');
        return exportSheetCsv(sheet.id, token).then(function (csv) {
          var pairs = pairsFromCsv(csv);
          if (!pairs.length) {
            throw new Error('No students with photos were found in that spreadsheet — make sure you picked the form’s responses sheet.');
          }
          // Confirmation: show which class/names are about to import BEFORE choosing photos.
          onStatus('Importing ' + pairs.length + ' student' + (pairs.length === 1 ? '' : 's') +
            ' (' + previewNames(pairs) + '). Now choose the photos folder…');
          return pickPhotos(token).then(function (photoDocs) {
            if (!photoDocs) return { token: token, folderPicked: false, students: [] }; // cancelled
            var folderIds = [], pickedIds = {};
            photoDocs.forEach(function (d) {
              if (d.mimeType === FOLDER_MIME) folderIds.push(d.id);
              else if (/^image\//.test(d.mimeType || '')) pickedIds[d.id] = true;
            });
            onStatus('Finding the photos…');
            return gatherFolderImageIds(folderIds, token).then(function (folderImageIds) {
              var accessible = {};
              for (var a in pickedIds) accessible[a] = true;
              for (var b in folderImageIds) accessible[b] = true;
              var candidates = pairs.filter(function (p) { return accessible[p.fileId]; });
              // If a folder was picked but the listing surfaced nothing (e.g. it was blocked), fall
              // back to trying every row directly — the folder grant may still allow the downloads.
              if (!candidates.length && folderIds.length) candidates = pairs.slice();
              if (!candidates.length) {
                throw new Error(folderIds.length
                  ? 'No matching photos were found in that folder. Choose the "(File responses)" folder that holds the uploaded photos — it may be nested inside another "(File responses)" folder named after the form.'
                  : 'None of the chosen photos matched the responses. Pick the "(File responses)" folder instead, or select the photos themselves.');
              }
              return {
                token: token,
                folderPicked: folderIds.length > 0,
                students: candidates.map(function (p) { return { preferredName: p.name, fileId: p.fileId }; })
              };
            });
          });
        });
      });
    });
  }

  NameDeck.googleImport = {
    configured: configured,
    // Warm up the Google libraries ahead of time (e.g. when the roster opens), so the first
    // click can open the sign-in popup within the user's tap — otherwise the async load loses
    // the tap gesture and the browser blocks the popup (you'd have to click twice).
    preload: function () {
      if (configured()) ensureLibs().then(ensureTokenClient).catch(function () {});
    },
    // Sign in + pick + read (no download). Used by the native handoff page.
    collect: collect,
    // Download one photo by Drive file ID with a token from collect(). Used by the native app
    // to finish the import after the handoff.
    downloadPhoto: function (fileId, token) { return downloadFile(fileId, token); },
    // Web flow: collect, then download the photos inline. Resolves with [{ preferredName, blob }].
    // onStatus(message) is called at each phase (for the in-app progress line).
    run: function (onStatus) {
      onStatus = onStatus || function () {};
      return collect(onStatus).then(function (res) {
        var candidates = res.students || [];
        if (!candidates.length) return [];
        var total = candidates.length, done = 0, firstError = null;
        var tick = function () { done++; onStatus('Downloading photos… (' + done + ' of ' + total + ')'); };
        onStatus('Downloading photos… (0 of ' + total + ')');
        return Promise.all(candidates.map(function (p) {
          return downloadFile(p.fileId, res.token).then(
            function (blob) { tick(); return { preferredName: p.preferredName, blob: blob }; },
            function (err) { tick(); if (!firstError) firstError = err; return null; } // tolerate; keep the first error
          );
        })).then(function (results) {
          var students = results.filter(Boolean);
          // If nothing downloaded, surface the real reason (HTTP status) instead of a vague message.
          if (!students.length) {
            throw new Error('Found ' + total + ' student' + (total === 1 ? '' : 's') +
              ' but couldn’t download any photos. ' +
              (firstError && firstError.message ? firstError.message
                : 'The photos may not be accessible — pick a "(File responses)" folder, or select the photos directly.'));
          }
          return students;
        });
      });
    }
  };
})();
