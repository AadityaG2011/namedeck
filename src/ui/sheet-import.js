// sheet-import.js — read a teacher's DOWNLOADED responses sheet (a local file) and pull out the
// list of preferred names. No Google connection: this powers the "Local Google" flow, where the
// teacher has downloaded the responses spreadsheet unchanged and just selects it.
//
// Two formats are handled:
//   - CSV  — read as text and parsed directly (no dependency).
//   - XLSX — a ZIP of XML; unzipped with fflate (loaded lazily, only when an .xlsx is picked),
//            then the shared-strings table + first worksheet are read with the built-in DOMParser.
// Either way we end up with a 2-D array of rows and take the "Preferred Full Name" column.

window.NameDeck = window.NameDeck || {};

(function () {
  // Must match the form's name-question title (same as google-import.js NAME_HEADER).
  var NAME_HEADER = 'Preferred Full Name';

  function readText(file) {
    if (file.text) return file.text();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(r.error); };
      r.readAsText(file);
    });
  }
  function readArrayBuffer(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsArrayBuffer(file);
    });
  }

  // Lazily load the vendored fflate (ZIP) library, once. Resolves with the global it exposes.
  var fflateState = {};
  function loadFflate() {
    if (window.fflate) return Promise.resolve(window.fflate);
    if (fflateState.p) return fflateState.p;
    fflateState.p = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'vendor/fflate.min.js';
      s.onload = function () { resolve(window.fflate); };
      s.onerror = function () { fflateState.p = null; reject(new Error('Could not load the spreadsheet reader')); };
      document.head.appendChild(s);
    });
    return fflateState.p;
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

  // "B12" -> 1 (zero-based column index). Cell refs in xlsx carry their column letters.
  function colIndex(ref) {
    var m = /^([A-Z]+)/.exec(ref || '');
    if (!m) return -1;
    var s = m[1], n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }
  // Namespace-agnostic element lookup (real xlsx uses a default namespace, which a plain
  // getElementsByTagName can miss; matching by local name in any namespace is robust).
  function tags(node, name) {
    return node.getElementsByTagNameNS ? node.getElementsByTagNameNS('*', name) : node.getElementsByTagName(name);
  }
  function allText(el) { // concatenate every <t> under an element (handles rich-text runs)
    var ts = tags(el, 't'), out = '';
    for (var i = 0; i < ts.length; i++) out += ts[i].textContent;
    return out;
  }
  // Turn an unzipped xlsx (map of path -> Uint8Array) into a 2-D array of cell strings.
  function rowsFromXlsx(files) {
    var fflate = window.fflate;
    var shared = [];
    if (files['xl/sharedStrings.xml']) {
      var sdoc = new DOMParser().parseFromString(fflate.strFromU8(files['xl/sharedStrings.xml']), 'application/xml');
      var sis = tags(sdoc, 'si');
      for (var i = 0; i < sis.length; i++) shared.push(allText(sis[i]));
    }
    var sheetPath = Object.keys(files)
      .filter(function (k) { return /^xl\/worksheets\/sheet\d+\.xml$/i.test(k); })
      .sort()[0];
    if (!sheetPath) return [];
    var wdoc = new DOMParser().parseFromString(fflate.strFromU8(files[sheetPath]), 'application/xml');
    var rowEls = tags(wdoc, 'row'), rows = [];
    for (var r = 0; r < rowEls.length; r++) {
      var cells = tags(rowEls[r], 'c'), row = [];
      for (var c = 0; c < cells.length; c++) {
        var cell = cells[c], ref = cell.getAttribute('r'), ci = ref ? colIndex(ref) : c;
        var t = cell.getAttribute('t'), val = '';
        if (t === 'inlineStr') { val = allText(cell); }
        else {
          var v = tags(cell, 'v')[0], raw = v ? v.textContent : '';
          val = (t === 's') ? (shared[parseInt(raw, 10)] || '') : raw; // 's' -> shared-strings index
        }
        if (ci >= 0) row[ci] = val;
      }
      rows.push(row);
    }
    return rows;
  }

  // From a 2-D array of rows, take the "Preferred Full Name" column (skips the header row).
  function namesFromRows(rows) {
    if (!rows || rows.length < 2) return [];
    var header = rows[0].map(function (h) { return (h || '').trim(); });
    var col = header.indexOf(NAME_HEADER);
    if (col < 0) throw new Error('Could not find a "' + NAME_HEADER + '" column — is that the form’s responses sheet?');
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var n = (rows[i][col] || '').trim();
      if (n) out.push(n);
    }
    return out;
  }

  function isXlsx(file) {
    return /\.xlsx$/i.test(file.name || '') || /spreadsheetml/i.test(file.type || '');
  }

  NameDeck.sheetImport = {
    // Read a downloaded responses sheet (CSV or XLSX) and resolve with [preferred names].
    readFile: function (file) {
      if (isXlsx(file)) {
        return loadFflate()
          .then(function () { return readArrayBuffer(file); })
          .then(function (buf) { return namesFromRows(rowsFromXlsx(window.fflate.unzipSync(new Uint8Array(buf)))); });
      }
      return readText(file).then(function (text) { return namesFromRows(parseCsv(text)); });
    },
    // Exposed for tests (pure, no file/network needed).
    parseCsv: parseCsv,
    rowsFromXlsx: rowsFromXlsx,
    namesFromRows: namesFromRows
  };
})();
