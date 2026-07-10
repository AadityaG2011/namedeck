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
  var SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
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

  // Get an OAuth access token for the drive.file scope (prompts the teacher to sign in/consent).
  function getToken() {
    return new Promise(function (resolve, reject) {
      var cb = function (resp) {
        if (resp && resp.access_token) { accessToken = resp.access_token; resolve(accessToken); }
        else reject(new Error('Sign-in was cancelled'));
      };
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: cb });
      } else {
        tokenClient.callback = cb;
      }
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    });
  }

  // Show the Picker; resolves with the selected docs (or null if cancelled).
  function showPicker(token) {
    return new Promise(function (resolve) {
      var view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);
      var picker = new google.picker.PickerBuilder()
        .setOAuthToken(token)
        .setDeveloperKey(API_KEY)
        .setAppId(CLIENT_ID.split('-')[0]) // project number: grants drive.file access to picked files
        .setTitle('Select your responses spreadsheet and the photos')
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .addView(view)
        .setCallback(function (data) {
          var a = data[google.picker.Response.ACTION];
          if (a === google.picker.Action.PICKED) resolve(data[google.picker.Response.DOCUMENTS] || []);
          else if (a === google.picker.Action.CANCEL) resolve(null);
        })
        .build();
      picker.setVisible(true);
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
    // Runs the whole flow; resolves with [{ preferredName, blob }] (blobs are the photo bytes).
    run: function () {
      if (!configured()) return Promise.reject(new Error('Google import is not configured'));
      return ensureLibs().then(getToken).then(function (token) {
        return showPicker(token).then(function (docs) {
          if (!docs) return []; // cancelled
          var sheet = null, photos = {};
          docs.forEach(function (d) {
            if (d.mimeType === SHEET_MIME) sheet = d;
            else if (/^image\//.test(d.mimeType || '')) photos[d.id] = true;
          });
          if (!sheet) throw new Error('Please also select your responses spreadsheet');
          return exportSheetCsv(sheet.id, token).then(function (csv) {
            var pairs = pairsFromCsv(csv).filter(function (p) { return photos[p.fileId]; });
            return Promise.all(pairs.map(function (p) {
              return downloadFile(p.fileId, token).then(function (blob) {
                return { preferredName: p.name, blob: blob };
              });
            }));
          });
        });
      });
    }
  };
})();
