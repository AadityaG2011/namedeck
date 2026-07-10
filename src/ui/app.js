// app.js — MVP: show a photo, reveal the name after a delay, then auto-advance to the
// next student. Delays are adjustable from the gear panel. Tap the card to reveal the
// name early; tap again to skip ahead.
//
// Teachers build their roster from the roster panel: paste/type student names and attach
// a photo to each, or bulk-import photos. It's saved on-device (see roster-store.js).
// Students with no photo yet fall back to a generated avatar, so a roster can be built
// names-first and photographed later. Before any students are added, the deck shows an
// empty state. State is in-memory + localStorage (a prototype choice). WEB-ONLY; SwiftUI later.

(function () {
  var ND = window.NameDeck;
  var app = document.querySelector('#app');

  var delay = 2;        // seconds before the name appears
  var gap = 1;          // seconds the name stays up before advancing to the next student
  var current = null;   // current student
  var revealTimer = null;
  var advanceTimer = null;
  var revealed = false;
  var paused = false;   // when paused, the deck stops auto-cycling and prev/next are usable
  var history = [];     // the students shown, in order (for prev/next navigation)
  var pos = -1;         // index of the current card within history

  var myRoster = ND.rosterStore.load(); // the teacher's own students (may be empty)
  var seq = 0;                          // helps make unique ids within a session

  // Feather "settings" gear icon (inline so the app stays zero-dependency).
  var GEAR_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 ' +
    '1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 ' +
    '1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 ' +
    '4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 ' +
    '0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 ' +
    '1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  // Feather "users" icon for the roster button.
  var ROSTER_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' +
    '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

  // Playback control icons.
  var PLAY_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE_SVG = '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  var PREV_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
  var NEXT_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Pick a student to quiz — weighted by each student's "appears" frequency (default 1),
  // and never the same one twice in a row. Only called when the roster is non-empty.
  function pick() {
    var list = myRoster;
    if (list.length === 1) return list[0];
    var pool = list.filter(function (s) { return !current || s.id !== current.id; });
    var total = 0;
    pool.forEach(function (s) { total += (s.weight || 1); });
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) {
      r -= (pool[i].weight || 1);
      if (r < 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function render() {
    app.innerHTML =
      '<div class="screen">' +
        '<div class="sheet" id="settings" hidden>' +
          '<div class="sheet-head">' +
            '<span>Settings</span>' +
            '<button class="close" id="closeSettings" aria-label="Close settings">&times;</button>' +
          '</div>' +
          '<div class="sheet-body">' +
            '<div class="control">' +
              '<label>Reveal name after <b id="delayVal">' + delay + 's</b></label>' +
              '<input id="delay" type="range" min="1" max="10" step="1" value="' + delay + '" />' +
            '</div>' +
            '<div class="control">' +
              '<label>Next student after <b id="gapVal">' + gap + 's</b></label>' +
              '<input id="gap" type="range" min="1" max="15" step="1" value="' + gap + '" />' +
            '</div>' +
          '</div>' +
          '<div class="sheet-foot">' +
            '<button class="btn ghost" id="resetSettings">Reset All</button>' +
            '<button class="btn primary" id="doneSettings">Done</button>' +
          '</div>' +
        '</div>' +
        '<div class="sheet" id="rosterSheet" hidden>' +
          '<div class="sheet-head">' +
            '<span>My Roster</span>' +
            '<button class="close" id="closeRoster" aria-label="Close roster">&times;</button>' +
          '</div>' +
          '<div class="sheet-body">' +
            '<p class="hint">Paste or type names (one per line), or Import Photos to create a student per photo (the photo&#39;s file name becomes the name). Edit names and photos below.</p>' +
            '<textarea id="nameInput" rows="3" placeholder="Alex Rivera&#10;Jordan Lee&#10;John Smith"></textarea>' +
            '<button class="btn" id="addNames">Add Names</button>' +
            '<div class="add-actions">' +
              '<label class="btn" id="importPhotos">Import Photos' +
                '<input type="file" id="photoImport" accept="image/*" multiple hidden /></label>' +
              '<label class="btn" id="importFolder">Import Folder' +
                '<input type="file" id="folderImport" accept="image/*" webkitdirectory multiple hidden /></label>' +
            '</div>' +
            '<button class="btn" id="importGoogle">Import from Google</button>' +
            '<p class="import-hint">You’ll pick your responses spreadsheet, then your photos folder.</p>' +
            '<p class="import-status" id="importStatus" hidden></p>' +
            '<p class="notice" id="storageNotice" hidden>Storage is full — new photos show now but may not be saved. Remove some students or use fewer/smaller photos.</p>' +
            '<div class="roster-list" id="rosterList"></div>' +
          '</div>' +
          '<div class="sheet-foot">' +
            '<button class="btn ghost" id="clearRoster">Clear All</button>' +
            '<button class="btn primary" id="useRoster">Done</button>' +
          '</div>' +
        '</div>' +
        '<div class="card" id="card">' +
          '<div class="avatar" id="avatar"></div>' +
          '<div class="name-slot" id="nameSlot"></div>' +
        '</div>' +
        '<div class="freq" id="freq" hidden>' +
          '<span class="freq-label">Appears</span>' +
          '<div class="freq-picker">' +
            '<div class="freq-seg" id="freqSeg">' +
              '<button class="freq-opt" data-w="0.2" aria-label="one fifth as often">1/5</button>' +
              '<button class="freq-opt" data-w="0.5" aria-label="half as often">1/2</button>' +
              '<button class="freq-opt" data-w="1" aria-label="normal">1</button>' +
              '<button class="freq-opt" data-w="2" aria-label="twice as often">2</button>' +
              '<button class="freq-opt" data-w="5" aria-label="five times as often">5</button>' +
            '</div>' +
            '<div class="freq-scale"><span>Rarely</span><span>Normal</span><span>A lot</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="controls" id="controls">' +
          '<button class="iconbtn roster-btn" id="rosterBtn" aria-label="My Roster" title="My Roster">' + ROSTER_SVG + '</button>' +
          '<div class="transport" id="transport">' +
            '<button class="ctrl" id="prevCard" aria-label="Previous card">' + PREV_SVG + '</button>' +
            '<button class="ctrl play" id="playPause" aria-label="Pause">' + PAUSE_SVG + '</button>' +
            '<button class="ctrl" id="nextCard" aria-label="Next card">' + NEXT_SVG + '</button>' +
          '</div>' +
          '<button class="iconbtn gear" id="gear" aria-label="Settings" title="Settings">' + GEAR_SVG + '</button>' +
        '</div>' +
        '<div class="modal" id="confirm" hidden>' +
          '<div class="modal-card">' +
            '<p class="modal-msg" id="confirmMsg"></p>' +
            '<div class="modal-actions">' +
              '<button class="btn ghost" id="confirmCancel">Cancel</button>' +
              '<button class="btn danger" id="confirmOk">OK</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // The deck is paused while the settings sheet is open, so new values apply on close.
    document.querySelector('#delay').addEventListener('input', function (e) {
      delay = parseInt(e.target.value, 10);
      document.querySelector('#delayVal').textContent = delay + 's';
    });
    document.querySelector('#gap').addEventListener('input', function (e) {
      gap = parseInt(e.target.value, 10);
      document.querySelector('#gapVal').textContent = gap + 's';
    });
    document.querySelector('#gear').addEventListener('click', toggleSettings);
    document.querySelector('#closeSettings').addEventListener('click', closeSettings);
    document.querySelector('#doneSettings').addEventListener('click', closeSettings);
    document.querySelector('#resetSettings').addEventListener('click', resetSettings);

    document.querySelector('#rosterBtn').addEventListener('click', toggleRoster);
    document.querySelector('#closeRoster').addEventListener('click', closeRoster);
    document.querySelector('#useRoster').addEventListener('click', closeRoster);
    document.querySelector('#addNames').addEventListener('click', addNames);
    document.querySelector('#photoImport').addEventListener('change', onImportPhotos);
    document.querySelector('#folderImport').addEventListener('change', onImportFolder);
    document.querySelector('#importGoogle').addEventListener('click', onImportGoogle);
    document.querySelector('#clearRoster').addEventListener('click', clearRoster);

    // The roster list is re-rendered often, so listen once on the container (delegation).
    var listEl = document.querySelector('#rosterList');
    listEl.addEventListener('input', onListInput);
    listEl.addEventListener('change', onListChange);
    listEl.addEventListener('click', onListClick);
    listEl.addEventListener('focusout', onListFocusOut);
    listEl.addEventListener('keydown', onListKeydown);

    document.querySelector('#card').addEventListener('click', onCardTap);

    document.querySelector('#playPause').addEventListener('click', togglePause);
    document.querySelector('#prevCard').addEventListener('click', function () { if (paused) prevCard(); });
    document.querySelector('#nextCard').addEventListener('click', function () { if (paused) nextCard(); });
    document.querySelector('#freqSeg').addEventListener('click', onFreqClick);

    document.querySelector('#confirmCancel').addEventListener('click', closeConfirm);
    document.querySelector('#confirmOk').addEventListener('click', function () {
      var fn = pendingConfirm;
      closeConfirm();
      if (fn) fn();
    });
    document.querySelector('#confirm').addEventListener('click', function (e) {
      if (e.target.id === 'confirm') closeConfirm(); // clicking the backdrop cancels
    });

    refreshDeck();
  }

  // ---- Confirmation dialog (in-app, styled) ----
  var pendingConfirm = null;
  function askConfirm(message, okLabel, onConfirm) {
    document.querySelector('#confirmMsg').textContent = message;
    document.querySelector('#confirmOk').textContent = okLabel;
    pendingConfirm = onConfirm;
    document.querySelector('#confirm').hidden = false;
  }
  function closeConfirm() {
    document.querySelector('#confirm').hidden = true;
    pendingConfirm = null;
  }

  // ---- Settings panel ----
  var DEFAULT_DELAY = 2, DEFAULT_GAP = 1;

  function toggleSettings() {
    if (document.querySelector('#settings').hidden) openSettings(); else closeSettings();
  }
  function openSettings() {
    clearTimers();                                     // pause the deck while it's open
    document.querySelector('#rosterSheet').hidden = true; // switch away from the roster
    document.querySelector('#settings').hidden = false;
    showTransport(false);
  }
  function closeSettings() {
    document.querySelector('#settings').hidden = true;
    if (current) resumeDeck();  // keep the same card; new timings apply from here
    else refreshDeck();
  }
  function resetSettings() {
    askConfirm('Reset the timing settings to their defaults?', 'Reset All', function () {
      delay = DEFAULT_DELAY;
      gap = DEFAULT_GAP;
      var d = document.querySelector('#delay');
      d.value = delay; document.querySelector('#delayVal').textContent = delay + 's';
      var g = document.querySelector('#gap');
      g.value = gap; document.querySelector('#gapVal').textContent = gap + 's';
    });
  }

  // ---- Roster panel ----
  function toggleRoster() {
    if (document.querySelector('#rosterSheet').hidden) openRoster(); else closeRoster();
  }
  function openRoster() {
    clearTimers();                                    // pause the deck while editing
    document.querySelector('#settings').hidden = true;
    document.querySelector('#nameInput').value = '';
    showStorageNotice(false);
    document.querySelector('#importStatus').hidden = true;
    renderList();
    document.querySelector('#rosterSheet').hidden = false;
    showTransport(false);
    if (ND.googleImport && ND.googleImport.preload) ND.googleImport.preload(); // warm up Google
  }
  function closeRoster() {
    document.querySelector('#rosterSheet').hidden = true;
    refreshDeck();                                    // rebuild the deck (card, or empty state)
  }

  function addNames() {
    var ta = document.querySelector('#nameInput');
    var added = 0;
    ta.value.split('\n').forEach(function (line) {
      var name = line.trim();
      if (!name) return;
      myRoster.push({ id: 'r' + (++seq), preferredName: name, photo: null, avatarSeed: name });
      added++;
    });
    ta.value = '';
    if (added) { save(); renderList(); }
  }

  // Turn a photo's file name into a student name: "Will Smith.jpg" -> "Will Smith".
  // Pure, portable logic — identical on iOS; only the *source* of the name differs.
  function nameFromFilename(filename) {
    var base = String(filename).replace(/^.*[\\/]/, '') // drop any folder path
      .replace(/\.[^.]+$/, '');                          // drop the extension
    base = base.replace(/_+/g, ' ')                      // underscores -> spaces
      .replace(/\s*\(\d+\)\s*$/, '')                     // drop a " (1)" duplicate suffix
      .replace(/\s+/g, ' ').trim();
    return base || 'Student';
  }

  // SEAM 1 (file pick + read): on the web the OS file dialog hands us File objects here.
  // On iOS this same entry point is fed by PhotosPicker / the document picker instead.
  function onImportPhotos(e) {
    importPhotos(e.target.files);
    e.target.value = ''; // let the same files be re-picked later
  }

  // Folder picker (webkitdirectory) returns every file in the folder, so keep images only.
  function onImportFolder(e) {
    var imgs = Array.prototype.slice.call(e.target.files || []).filter(function (f) {
      return /^image\//.test(f.type) || /\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$/i.test(f.name);
    });
    importPhotos(imgs);
    e.target.value = '';
  }

  // Bulk import: one student per photo, name taken from the file name. Photos decode
  // asynchronously, so the rows appear immediately and fill in as each finishes.
  function importPhotos(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    var pending = list.length;
    list.forEach(function (file) {
      var name = nameFromFilename(file.name);
      var student = { id: 'r' + (++seq), preferredName: name, photo: null, avatarSeed: name };
      myRoster.push(student);
      // SEAM 2 (image resize/encode): canvas on web, ImageIO/UIImage on iOS.
      fileToPhoto(file, function (dataUrl) {
        student.photo = dataUrl;
        if (--pending === 0) {           // all decoded: persist once and refresh
          var saved = save();            // SEAM 3 (storage): rosterStore adapter
          renderList();
          showStorageNotice(!saved);
        }
      });
    });
    renderList(); // show the new students right away (names + placeholder) while photos decode
  }

  function setImportStatus(msg, kind) {
    var el = document.querySelector('#importStatus');
    el.textContent = msg;
    el.className = 'import-status' + (kind ? ' ' + kind : '');
    el.hidden = false;
  }

  // Import from Google (Forms responses) via the Picker — names matched to photos by file ID.
  function onImportGoogle() {
    if (!ND.googleImport || !ND.googleImport.configured()) {
      setImportStatus("Google import isn't set up yet — add your credentials in google-import.js.", 'error');
      return;
    }
    setImportStatus('Connecting to Google…', '');
    ND.googleImport.run(function (msg) { setImportStatus(msg, ''); }).then(function (students) {
      if (!students || !students.length) { setImportStatus('No students were imported.', ''); return; }
      students.forEach(function (s) {
        var stud = { id: 'r' + (++seq), preferredName: s.preferredName, photo: null, avatarSeed: s.preferredName };
        myRoster.push(stud);
        fileToPhoto(s.blob, function (dataUrl) { stud.photo = dataUrl; save(); renderList(); });
      });
      save();
      renderList();
      setImportStatus('Imported ' + students.length + ' student' + (students.length === 1 ? '' : 's') + ' ✓', 'ok');
    }).catch(function (err) {
      setImportStatus('Import failed: ' + (err && err.message ? err.message : err), 'error');
    });
  }

  function clearRoster() {
    askConfirm("Remove all students from your roster? This can't be undone.", 'Clear All', function () {
      myRoster = [];
      ND.rosterStore.clear();
      renderList();
    });
  }

  function renderList() {
    var el = document.querySelector('#rosterList');
    if (!myRoster.length) {
      el.innerHTML = '<div class="empty">No students yet — add names or import photos above.</div>';
      return;
    }
    el.innerHTML = myRoster.map(function (s) {
      var thumb = s.photo
        ? '<img src="' + escapeHtml(s.photo) + '" alt="" />'
        : ND.avatar(s.avatarSeed || s.preferredName, 44);
      return '<div class="rrow" data-id="' + escapeHtml(s.id) + '">' +
          '<div class="rthumb">' + thumb + '</div>' +
          '<input class="rname" value="' + escapeHtml(s.preferredName) + '" aria-label="Student name" readonly />' +
          '<button class="btn tiny edit">Edit</button>' +
          '<label class="btn tiny pick">' + (s.photo ? 'Change' : 'Photo') +
            '<input type="file" accept="image/*" class="rphoto" hidden /></label>' +
          '<button class="btn tiny remove" aria-label="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }

  function rowStudent(target) {
    var row = target.closest && target.closest('.rrow');
    if (!row) return null;
    var id = row.getAttribute('data-id');
    for (var i = 0; i < myRoster.length; i++) {
      if (String(myRoster[i].id) === String(id)) return myRoster[i];
    }
    return null;
  }

  function onListInput(e) {
    if (!e.target.classList || !e.target.classList.contains('rname')) return;
    var s = rowStudent(e.target);
    if (!s) return;
    s.preferredName = e.target.value;         // don't re-render here: it would drop the cursor
    save();
  }
  function onListChange(e) {
    if (!e.target.classList || !e.target.classList.contains('rphoto')) return;
    var s = rowStudent(e.target);
    if (!s) return;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    fileToPhoto(file, function (dataUrl) {
      s.photo = dataUrl;
      var saved = save();
      renderList();
      showStorageNotice(!saved); // photos are the big items — warn if the store is full
    });
  }
  function onListClick(e) {
    // Edit: unlock this row's name field so a mistyped name can be corrected.
    var edit = e.target.closest && e.target.closest('.edit');
    if (edit) {
      var input = edit.closest('.rrow').querySelector('.rname');
      input.removeAttribute('readonly');
      input.focus();
      input.select();
      return;
    }
    // Remove: drop this student from the roster.
    var rm = e.target.closest && e.target.closest('.remove');
    if (!rm) return;
    var row = rm.closest('.rrow');
    var id = row && row.getAttribute('data-id');
    myRoster = myRoster.filter(function (s) { return String(s.id) !== String(id); });
    save();
    renderList();
  }

  // Leaving the field (blur) finishes the edit and locks it again.
  function onListFocusOut(e) {
    if (!e.target.classList || !e.target.classList.contains('rname')) return;
    if (e.target.hasAttribute('readonly')) return;
    e.target.setAttribute('readonly', '');
    save();
  }
  // Enter finishes editing (blurs the field).
  function onListKeydown(e) {
    if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('rname')) {
      e.preventDefault();
      e.target.blur();
    }
  }

  function save() { return ND.rosterStore.save(myRoster); }

  function showStorageNotice(show) {
    var n = document.querySelector('#storageNotice');
    if (n) n.hidden = !show;
  }

  // Read an image file, downscale it, and hand back a JPEG data URL. The cap (1000px)
  // is big enough to look sharp on a high-DPI card while staying small enough for
  // on-device storage. Never upscales past the original (scale is clamped to 1).
  function fileToPhoto(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1000;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var h = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        try {
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          cb(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e) {
          cb(reader.result); // canvas unavailable — store the original
        }
      };
      img.onerror = function () { cb(reader.result); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- Flashcard ----
  // Rebuild the deck from scratch (used when the roster changes): fresh history, but keep
  // the current play/pause state (so closing the roster doesn't force it back to playing).
  function refreshDeck() {
    clearTimers();
    history = [];
    pos = -1;
    if (myRoster.length) { updateControls(); nextCard(); }
    else showEmpty();
  }

  // Resume the current card in place (after the settings sheet closes) without resetting.
  function resumeDeck() {
    clearTimers();
    showTransport(true);
    updateControls();
    renderNameSlot();
    if (!paused) armForState();
  }

  function showEmpty() {
    current = null;
    revealed = false;
    showTransport(false);
    document.querySelector('#freq').hidden = true;
    document.querySelector('#avatar').innerHTML =
      '<div class="empty-deck">' +
        '<div class="empty-title">No students yet</div>' +
        '<div class="empty-sub">Add your class to start studying their names.</div>' +
        '<button class="btn primary" id="emptyAdd">Add roster</button>' +
      '</div>';
    document.querySelector('#nameSlot').innerHTML = '';
    document.querySelector('#emptyAdd').addEventListener('click', function (ev) {
      ev.stopPropagation(); // don't also trigger the card tap
      openRoster();
    });
  }

  function showCard(p) {
    current = p;
    revealed = false;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    showTransport(true);
    var av = document.querySelector('#avatar');
    av.innerHTML = '<div class="frame"></div>';
    var frame = av.firstChild;
    var fallback = function () {
      if (current === p) frame.innerHTML = ND.avatar(p.avatarSeed || p.preferredName, 320);
    };
    if (p.photo) {
      var img = document.createElement('img');
      img.className = 'photo'; img.alt = 'portrait';
      img.onerror = fallback;
      img.src = p.photo;
      frame.appendChild(img);
    } else {
      fallback(); // named student, no photo yet
    }
    renderNameSlot();
    updateControls();
    if (!paused) armReveal();
  }

  // Render the name slot for the current state (hidden vs revealed, playing vs paused).
  function renderNameSlot() {
    var slot = document.querySelector('#nameSlot');
    if (!current) { slot.innerHTML = ''; return; }
    if (revealed) {
      slot.innerHTML = '<div class="name">' + escapeHtml(current.preferredName) + '</div>' +
        (paused ? '' : '<div class="waiting">tap or wait…</div>');
    } else {
      slot.innerHTML = '<div class="waiting">' + (paused ? 'tap to reveal' : 'tap or wait…') + '</div>';
    }
  }

  function armReveal() {
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = setTimeout(reveal, delay * 1000);
  }

  function armAdvance() {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(nextCard, gap * 1000);
  }

  function armForState() {   // resume the cycle from wherever the current card is
    if (paused || !current) return;
    if (revealed) armAdvance(); else armReveal();
  }

  function clearTimers() {
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
  }

  function reveal() {
    if (!current || revealed) return;
    revealed = true;
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
    renderNameSlot();
    if (!paused) armAdvance();
  }

  // ---- Playback controls ----
  function togglePause() { setPaused(!paused); }
  function setPaused(p) {
    paused = p;
    if (paused) clearTimers();
    updateControls();
    renderNameSlot();
    if (!paused) armForState();
  }
  function showTransport(show) { document.querySelector('#transport').hidden = !show; }
  function updateControls() {
    var pp = document.querySelector('#playPause');
    pp.innerHTML = paused ? PLAY_SVG : PAUSE_SVG;
    pp.setAttribute('aria-label', paused ? 'Continue' : 'Pause');
    // Prev/Next step through cards, and are only usable while paused.
    document.querySelector('#prevCard').disabled = !paused || pos <= 0;
    document.querySelector('#nextCard').disabled = !paused;
    // The frequency selector is only shown while paused (there's no time to use it mid-cycle).
    document.querySelector('#freq').hidden = !(paused && current);
    renderFreq();
  }

  // Highlight the current student's "appears" level in the frequency selector.
  function renderFreq() {
    var seg = document.querySelector('#freqSeg');
    var w = current ? (current.weight || 1) : 1;
    var opts = seg.querySelectorAll('.freq-opt');
    for (var i = 0; i < opts.length; i++) {
      var active = parseFloat(opts[i].getAttribute('data-w')) === w;
      opts[i].classList.toggle('active', active);
      opts[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  // Set how often the current student appears (a weight for the weighted pick).
  function onFreqClick(e) {
    var btn = e.target.closest && e.target.closest('.freq-opt');
    if (!btn || !current) return;
    current.weight = parseFloat(btn.getAttribute('data-w'));
    save();
    renderFreq();
  }

  // Tap the card: reveal the name; when playing, a second tap skips ahead.
  function onCardTap() {
    if (paused) { if (!revealed) reveal(); return; }
    if (revealed) nextCard(); else reveal();
  }

  // Advance: step forward through history, or draw a new student at the end.
  function nextCard() {
    if (pos < history.length - 1) { pos++; }
    else { history.push(pick()); pos = history.length - 1; }
    showCard(history[pos]);
  }
  // Step back to a previously-shown card (only meaningful while paused).
  function prevCard() {
    if (pos > 0) { pos--; showCard(history[pos]); }
  }

  render();
})();