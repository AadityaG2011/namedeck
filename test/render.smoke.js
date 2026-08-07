// test/render.smoke.js — loads the built MVP in jsdom and exercises the flow:
// empty state -> build a roster -> timed reveal / auto-advance, plus the gear/roster panels.
// Run: node test/render.smoke.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'dist/index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const doc = dom.window.document;
// The xlsx reader lazy-loads fflate via a <script> tag, which won't fetch in jsdom — so inject the
// (pure-JS) vendored library directly, exactly as the browser would once it loads.
dom.window.fflate = require(path.join(__dirname, '..', 'src/vendor/fflate.min.js'));

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ok  - ' + name); }
  else { fail++; console.log('  FAIL- ' + name); }
}
const nameShown = function () { return !!doc.querySelector('.name'); };
const rowCount = function () { return doc.querySelectorAll('#rosterList .rrow').length; };
const rowNames = function () {
  return Array.prototype.slice.call(doc.querySelectorAll('#rosterList .rrow .rname'))
    .map(function (n) { return n.value; });
};
function fireChange(input, files) {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

(async function () {
  // --- A0. First run seeds a public-domain demo roster so a new user sees it working ---
  ok('first run shows a card (seeded demo), not the empty state',
     !!doc.querySelector('.avatar img, .avatar svg') && !doc.querySelector('.empty-deck'));
  doc.querySelector('#rosterBtn').click();
  ok('first run seeds demo students into the roster', rowCount() > 0);
  doc.querySelector('#clearRoster').click();
  doc.querySelector('#confirmOk').click();
  doc.querySelector('#useRoster').click();
  // Roster is now empty and the seeded flag is set — the rest of the test builds from scratch.

  // --- A. Initial state: empty deck, PWA wired, controls present ---
  ok('empty state shown when no students', !!doc.querySelector('.empty-deck'));
  ok('empty state has an "Add roster" button', !!doc.querySelector('#emptyAdd'));
  ok('no card avatar while empty', !doc.querySelector('.avatar img, .avatar svg'));
  ok('transport controls hidden while empty', doc.querySelector('#transport').hidden);
  ok('roster/settings buttons present in the bottom bar',
     !!doc.querySelector('#controls #rosterBtn') && !!doc.querySelector('#controls #gear'));
  ok('name hidden initially', !nameShown());
  ok('PWA manifest is linked', !!doc.querySelector('link[rel="manifest"]'));
  ok('apple-touch-icon is linked', !!doc.querySelector('link[rel="apple-touch-icon"]'));
  ok('gear button present', !!doc.querySelector('#gear'));
  ok('settings hidden initially', doc.querySelector('#settings').hidden);
  ok('reveal-delay control present', !!doc.querySelector('#delay'));
  ok('default reveal delay is 2s', doc.querySelector('#delayVal').textContent === '2s');
  ok('advance-gap control present', !!doc.querySelector('#gap'));
  ok('default advance gap is 1s', doc.querySelector('#gapVal').textContent === '1s');
  ok('no "Next" button', !doc.querySelector('.btn.next'));
  ok('no brand/subtitle/meta text', !doc.querySelector('.brand, .subtitle, .meta'));

  // --- B. Settings panel: labels update, Reset restores defaults; leave both at 1s ---
  doc.querySelector('#gear').click();
  ok('gear opens the settings panel', !doc.querySelector('#settings').hidden);
  const delaySlider = doc.querySelector('#delay');
  const gapSlider = doc.querySelector('#gap');
  delaySlider.value = '1'; delaySlider.dispatchEvent(new dom.window.Event('input'));
  ok('changing reveal slider updates label to 1s', doc.querySelector('#delayVal').textContent === '1s');
  gapSlider.value = '1'; gapSlider.dispatchEvent(new dom.window.Event('input'));
  ok('changing gap slider updates label to 1s', doc.querySelector('#gapVal').textContent === '1s');
  ok('settings has a Privacy Policy link', !!doc.querySelector('#privacyLink'));
  doc.querySelector('#resetSettings').click();
  ok('Reset All opens a confirmation dialog', !doc.querySelector('#confirm').hidden);
  ok('reset does not apply until confirmed', doc.querySelector('#delayVal').textContent === '1s');
  doc.querySelector('#confirmOk').click();
  ok('confirming Reset All restores default reveal delay (2s)', doc.querySelector('#delayVal').textContent === '2s');
  ok('confirming Reset All restores default advance gap (1s)', doc.querySelector('#gapVal').textContent === '1s');
  ok('dialog closes after confirming', doc.querySelector('#confirm').hidden);
  delaySlider.value = '1'; delaySlider.dispatchEvent(new dom.window.Event('input')); // 1s for timing below
  gapSlider.value = '1'; gapSlider.dispatchEvent(new dom.window.Event('input'));
  doc.querySelector('#closeSettings').click();
  ok('close button hides the settings panel', doc.querySelector('#settings').hidden);

  // --- C. Build a roster: the empty-state button opens it; import photos (Named Photos), edit ---
  doc.querySelector('#emptyAdd').click();
  ok('empty-state button opens the roster panel', !doc.querySelector('#rosterSheet').hidden);

  // Named Photos: one student per file, name from the filename.
  fireChange(doc.querySelector('#photoImport'), [
    new dom.window.File(['a'], 'Alice Johnson.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['b'], 'Bob Smith.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['c'], 'Cara Diaz.jpg', { type: 'image/jpeg' }),
  ]);
  ok('importing photos creates a row per student', rowCount() === 3);
  ok('a student with no decoded photo shows a fallback avatar', !!doc.querySelector('#rosterList .rthumb svg'));

  // Post-import callout (discoverability). "Add preferred names" hides it for now but does NOT
  // permanently dismiss it (a later import reminds again); the ✕ dismisses for good.
  ok('preferred-names callout appears after importing photos', !doc.querySelector('#preferredCallout').hidden);
  doc.querySelector('#preferredCalloutBtn').click(); // "Add preferred names" -> hide for now
  ok('the Add-names button hides the callout', doc.querySelector('#preferredCallout').hidden);

  // Edit button: names are locked until Edit is clicked, then a typo can be corrected.
  const firstRow = doc.querySelector('#rosterList .rrow');
  const nameField = firstRow.querySelector('.rname');
  ok('name field is read-only until Edit is clicked', nameField.hasAttribute('readonly'));
  firstRow.querySelector('.edit').click();
  ok('Edit unlocks the name field', !nameField.hasAttribute('readonly'));
  nameField.value = 'Alicia Johnson';
  nameField.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  // Import one more — forces a renderList from myRoster, proving the edit persisted to the data.
  fireChange(doc.querySelector('#photoImport'), [new dom.window.File(['d'], 'Dana Fox.jpg', { type: 'image/jpeg' })]);
  ok('edited name persists in the roster (survives a re-render)', rowNames()[0] === 'Alicia Johnson');
  ok('callout returns on a later import (Add did not permanently dismiss it)', !doc.querySelector('#preferredCallout').hidden);
  doc.querySelector('#preferredCalloutDismiss').click(); // ✕ -> dismiss for good
  ok('the dismiss (✕) button hides the callout', doc.querySelector('#preferredCallout').hidden);

  // Import Photos: one student per file, name from the filename.
  const before = rowCount();
  fireChange(doc.querySelector('#photoImport'), [
    new dom.window.File(['x'], 'Zoe Martin.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['y'], 'liam_okafor (1).png', { type: 'image/png' }),
  ]);
  ok('import photos adds one student per file', rowCount() === before + 2);
  ok('import derives the name from the file name', rowNames().indexOf('Zoe Martin') !== -1);
  ok('import cleans underscores and dup-suffix', rowNames().indexOf('liam okafor') !== -1);
  ok('callout stays dismissed on later imports', doc.querySelector('#preferredCallout').hidden);

  // Import Folder: grabs the folder but ignores non-image files.
  const beforeFolder = rowCount();
  fireChange(doc.querySelector('#folderImport'), [
    new dom.window.File(['a'], 'Ana Reyes.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['b'], 'notes.txt', { type: 'text/plain' }),
  ]);
  ok('import folder adds only the image file (skips notes.txt)', rowCount() === beforeFolder + 1);

  // Google-Forms-style filenames "<original> - <Student Name>.<ext>": extract the name after
  // the last " - " (these are the real names from the friend's class, including edge cases).
  const beforeForms = rowCount();
  fireChange(doc.querySelector('#photoImport'), [
    new dom.window.File(['a'], 'IMG_0333 - Dana Prem.jpeg', { type: 'image/jpeg' }),
    new dom.window.File(['b'], '6398631_9056948_25_72718368 - Shania Leubin.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['c'], 'max mracek photo - Max Mracek.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['d'], 'db1b9494-9266-45a1-8fc0-160a426b19a1 - Romy Bos.jpeg', { type: 'image/jpeg' }),
    new dom.window.File(['e'], 'IMG_5898 - Yağmur Ağı.jpeg', { type: 'image/jpeg' }),
    new dom.window.File(['f'], 'IMG_4536 - Kara Reed.HEIC', { type: 'image/heic' }),
    new dom.window.File(['g'], 'IMG_0333 - Dana Prem (1).jpeg', { type: 'image/jpeg' }), // re-downloaded dup
  ]);
  ok('Forms filenames add one student per file', rowCount() === beforeForms + 7);
  ok('extracts the name after " - " (Forms format)', rowNames().indexOf('Dana Prem') !== -1);
  ok('extracts the name when the original part has underscores', rowNames().indexOf('Shania Leubin') !== -1);
  ok('takes the name after the LAST " - "', rowNames().indexOf('Max Mracek') !== -1);
  ok('handles hyphens in the leading part (UUID)', rowNames().indexOf('Romy Bos') !== -1);
  ok('handles non-ASCII names (Yağmur Ağı)', rowNames().indexOf('Yağmur Ağı') !== -1);
  ok('strips an uppercase .HEIC extension', rowNames().indexOf('Kara Reed') !== -1);
  ok('strips a downloaded " (1)" dup suffix in the Forms path',
     rowNames().filter(function (n) { return n === 'Dana Prem'; }).length === 2);

  // Google import: button present and the module loaded (unconfigured until credentials added).
  ok('Import from Google button present', !!doc.querySelector('#importGoogle'));
  ok('Google import status line present (hidden)',
     !!doc.querySelector('#importStatus') && doc.querySelector('#importStatus').hidden);
  ok('Google import module loaded',
     !!dom.window.NameDeck.googleImport && typeof dom.window.NameDeck.googleImport.configured === 'function');

  // "Add preferred names" matcher (pure): pass 1 = exact unambiguous full name (casing/accents,
  // Emmas stay apart); pass 2 = unique last-name anchor for nicknames; ambiguous cases left alone.
  const match = dom.window.NameDeck.matchPreferredNames;
  ok('preferred-name matcher is exposed', typeof match === 'function');
  if (typeof match === 'function') {
    // Main roster: filename (Google-account) names -> the sheet's preferred names.
    const roster = [
      { preferredName: 'molly burke' },     // exact match, casing fixed -> Molly Burke
      { preferredName: 'robbie mungovan' }, // nickname, unique last name -> Robert Mungovan
      { preferredName: 'Brianna Eubank' },  // nickname, unique last name -> Bri Eubank
      { preferredName: 'emma todd' },       // exact -> its OWN row, not the other Emma
      { preferredName: 'emma caetano' },
      { preferredName: 'Jose Garcia' },     // accent-only difference -> José García
    ];
    const res = match(roster, ['Molly Burke', 'Robert Mungovan', 'Bri Eubank', 'Emma Todd', 'Emma Caetano', 'José García']);
    ok('exact match fixes casing (molly burke -> Molly Burke)', roster[0].preferredName === 'Molly Burke');
    ok('last-name anchor applies a nickname (robbie -> Robert Mungovan)', roster[1].preferredName === 'Robert Mungovan');
    ok('last-name anchor applies a nickname (Brianna -> Bri Eubank)', roster[2].preferredName === 'Bri Eubank');
    ok('keeps the two Emmas on their own rows (no cross-match)',
       roster[3].preferredName === 'Emma Todd' && roster[4].preferredName === 'Emma Caetano');
    ok('exact match upgrades accents (Jose Garcia -> José García)', roster[5].preferredName === 'José García');
    ok('reports all six as upgraded, none unmatched', res.upgraded === 6 && res.unmatched === 0);

    // Safety: two students share a last name and both need a nickname match -> ambiguous, leave both.
    const ambiguous = [{ preferredName: 'Bob Smith' }, { preferredName: 'Rob Smith' }];
    const ambRes = match(ambiguous, ['Robert Smith', 'Bobby Smith']);
    ok('leaves ambiguous same-last-name nicknames untouched',
       ambiguous[0].preferredName === 'Bob Smith' && ambiguous[1].preferredName === 'Rob Smith');
    ok('counts both ambiguous rows as unmatched', ambRes.unmatched === 2 && ambRes.upgraded === 0);

    // Ordering: an exact "Sarah Mungovan" is consumed in pass 1, leaving robbie<->Robert unambiguous.
    const shared = [{ preferredName: 'Sarah Mungovan' }, { preferredName: 'robbie mungovan' }];
    match(shared, ['Sarah Mungovan', 'Robert Mungovan']);
    ok('pass 1 consumes the exact match so pass 2 can resolve the nickname',
       shared[0].preferredName === 'Sarah Mungovan' && shared[1].preferredName === 'Robert Mungovan');

    // Ambiguous exact: the same normalized name twice on the sheet must NOT be applied.
    const dupRoster = [{ preferredName: 'john smith' }];
    match(dupRoster, ['John Smith', 'JOHN SMITH']);
    ok('skips an ambiguous duplicate sheet name', dupRoster[0].preferredName === 'john smith');
  }

  // HEIC detection (pure): drives whether a file gets routed through the lazy decoder. The actual
  // HEIC->JPEG conversion needs a real browser (WASM), so only the detection is unit-tested here.
  const isHeic = dom.window.NameDeck.isHeic;
  ok('isHeic is exposed', typeof isHeic === 'function');
  if (typeof isHeic === 'function') {
    ok('detects HEIC by MIME type', isHeic({ type: 'image/heic', name: 'x' }) === true);
    ok('detects HEIC by .HEIC extension (case-insensitive)', isHeic({ type: '', name: 'IMG_4536 - Kara Reed.HEIC' }) === true);
    ok('detects .heif extension', isHeic({ type: '', name: 'photo.heif' }) === true);
    ok('does not flag a JPEG', isHeic({ type: 'image/jpeg', name: 'Dana Prem.jpg' }) === false);
    ok('does not flag a PNG', isHeic({ type: 'image/png', name: 'molly burke.png' }) === false);
    ok('does not flag a TIFF as HEIC', isHeic({ type: 'image/tiff', name: 'scan.tiff' }) === false);
  }
  const isTiff = dom.window.NameDeck.isTiff;
  ok('isTiff is exposed', typeof isTiff === 'function');
  if (typeof isTiff === 'function') {
    ok('detects TIFF by MIME type', isTiff({ type: 'image/tiff', name: 'x' }) === true);
    ok('detects .tif extension', isTiff({ type: '', name: 'scan.tif' }) === true);
    ok('detects .tiff extension', isTiff({ type: '', name: 'scan.TIFF' }) === true);
    ok('does not flag a JPEG as TIFF', isTiff({ type: 'image/jpeg', name: 'Dana Prem.jpg' }) === false);
    ok('does not flag a HEIC as TIFF', isTiff({ type: 'image/heic', name: 'Kara Reed.HEIC' }) === false);
  }

  // Local sheet reader (CSV + XLSX): the "Local Google" flow reads a downloaded responses sheet
  // and returns the preferred-name column. Exercised directly (pure), then a real xlsx round-trip.
  const sheetImport = dom.window.NameDeck.sheetImport;
  ok('sheetImport module loaded', !!sheetImport && typeof sheetImport.readFile === 'function');
  if (sheetImport) {
    // CSV: header row + the "Preferred Full Name" column, with a quoted field containing a comma.
    const csv = 'Timestamp,Preferred Full Name,Your Photo\n' +
      '8/6 10:00,Dana Prem,http://x/id?1\n' +
      '8/6 10:01,"Bri Eubank",http://x/id?2\n' +
      '8/6 10:02,,http://x/id?3\n';          // blank name row is skipped
    const csvNames = sheetImport.namesFromRows(sheetImport.parseCsv(csv));
    ok('CSV: extracts the Preferred Full Name column', csvNames.length === 2 &&
       csvNames[0] === 'Dana Prem' && csvNames[1] === 'Bri Eubank');

    // Missing the name column -> a clear error (so the teacher knows they picked the wrong file).
    let threw = false;
    try { sheetImport.namesFromRows(sheetImport.parseCsv('A,B\n1,2\n')); } catch (e) { threw = true; }
    ok('errors clearly when the name column is absent', threw);

    // XLSX: build a minimal real workbook (shared strings + one worksheet) and read it back.
    const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const shared = ['Timestamp', 'Preferred Full Name', 'Your Photo', 'Robert Mungovan', 'Yağmur Ağı'];
    const sharedXml = '<sst xmlns="' + ns + '">' +
      shared.map(function (s) { return '<si><t>' + s + '</t></si>'; }).join('') + '</sst>';
    const sheetXml = '<worksheet xmlns="' + ns + '"><sheetData>' +
      '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
      '<row r="2"><c r="A2"><v>44000</v></c><c r="B2" t="s"><v>3</v></c></row>' +
      '<row r="3"><c r="A3"><v>44001</v></c><c r="B3" t="s"><v>4</v></c></row>' +
      '</sheetData></worksheet>';
    const files = {
      'xl/sharedStrings.xml': dom.window.fflate.strToU8(sharedXml),
      'xl/worksheets/sheet1.xml': dom.window.fflate.strToU8(sheetXml),
    };
    const xrows = sheetImport.rowsFromXlsx(files);
    ok('XLSX: resolves shared-string cells into a grid', xrows[0][1] === 'Preferred Full Name' && xrows[1][1] === 'Robert Mungovan');
    ok('XLSX: keeps non-ASCII names intact', xrows[2][1] === 'Yağmur Ağı');
    const xNames = sheetImport.namesFromRows(xrows);
    ok('XLSX: name column extracted', xNames.length === 2 && xNames[0] === 'Robert Mungovan' && xNames[1] === 'Yağmur Ağı');

    // Full unzip round-trip through readFile(), so unzipSync + parse + extract all run together.
    const zipped = dom.window.fflate.zipSync(files);
    const xlsxFile = new dom.window.File([zipped], 'responses.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await sheetImport.readFile(xlsxFile).then(function (names) {
      ok('readFile() reads a real .xlsx end-to-end', names.length === 2 && names[0] === 'Robert Mungovan');
    }).catch(function (e) { ok('readFile() reads a real .xlsx end-to-end', false); });
  }

  const expected = rowNames();
  doc.querySelector('#useRoster').click();
  ok('Done closes the roster panel', doc.querySelector('#rosterSheet').hidden);

  // --- D. Deck now has students: card shows, timed reveal + auto-advance work ---
  ok('a card avatar is shown once the roster has students', !!doc.querySelector('.avatar img, .avatar svg'));
  ok('name hidden on a fresh card', !nameShown());
  doc.querySelector('#card').click(); // first tap reveals
  ok('tapping card reveals a custom student name',
     nameShown() && expected.indexOf(doc.querySelector('.name').textContent) !== -1);
  doc.querySelector('#card').click(); // second tap advances
  ok('tapping again advances to the next student', !nameShown());
  await new Promise(function (r) { setTimeout(r, 1200); });
  ok('name auto-reveals after the delay', nameShown());
  await new Promise(function (r) { setTimeout(r, 1200); });
  ok('auto-advances to the next student after the gap', !nameShown());

  // --- D2. Playback controls: pause + prev/next navigation ---
  ok('transport controls visible with a roster', !doc.querySelector('#transport').hidden);
  ok('prev/next disabled while playing',
     doc.querySelector('#prevCard').disabled && doc.querySelector('#nextCard').disabled);
  ok('frequency selector hidden while playing', doc.querySelector('#freq').hidden);

  doc.querySelector('#playPause').click(); // pause
  ok('pause switches the button to Continue', doc.querySelector('#playPause').getAttribute('aria-label') === 'Continue');
  ok('pause enables the Next control', !doc.querySelector('#nextCard').disabled);

  // Frequency selector: visible only when paused, five levels, defaults to Normal (1).
  ok('frequency selector visible when paused', !doc.querySelector('#freq').hidden);
  ok('frequency selector has five levels', doc.querySelectorAll('#freqSeg .freq-opt').length === 5);
  ok('frequency scale shows Rarely/Normal/A lot anchors', /Rarely.*Normal.*A lot/s.test(doc.querySelector('.freq-scale').textContent));
  ok('current card defaults to Normal (1)',
     doc.querySelector('#freqSeg .freq-opt.active').getAttribute('data-w') === '1');
  doc.querySelector('#freqSeg .freq-opt[data-w="5"]').click();
  ok('choosing a level highlights it',
     doc.querySelector('#freqSeg .freq-opt.active').getAttribute('data-w') === '5');

  // A paused deck must not auto-advance: reveal, wait, and the name stays put.
  doc.querySelector('#card').click(); // reveal while paused
  ok('tapping reveals the name while paused', nameShown());
  const pausedName = doc.querySelector('.name').textContent;
  await new Promise(function (r) { setTimeout(r, 1200); });
  ok('paused deck does not auto-advance',
     nameShown() && doc.querySelector('.name').textContent === pausedName);

  // Next steps to a new (hidden) card; Back returns to the one we just saw.
  doc.querySelector('#nextCard').click();
  ok('Next shows a new card (name hidden)', !nameShown());
  ok('Back is enabled after moving forward', !doc.querySelector('#prevCard').disabled);
  doc.querySelector('#prevCard').click();
  doc.querySelector('#card').click(); // reveal it again
  ok('Back returns to the same student', doc.querySelector('.name') &&
     doc.querySelector('.name').textContent === pausedName);

  doc.querySelector('#playPause').click(); // continue
  ok('Continue resumes playing (Next disabled again)', doc.querySelector('#nextCard').disabled);

  // Opening and closing the roster preserves the paused state (like settings does).
  doc.querySelector('#playPause').click(); // pause again
  doc.querySelector('#rosterBtn').click(); // open roster
  doc.querySelector('#useRoster').click(); // close (Done)
  ok('closing the roster keeps the deck paused',
     doc.querySelector('#playPause').getAttribute('aria-label') === 'Continue' &&
     !doc.querySelector('#nextCard').disabled);
  doc.querySelector('#playPause').click(); // back to playing for the section below

  // --- D2. Replace-with-folder + export/import roster file: all the edge cases ---
  doc.querySelector('#rosterBtn').click(); // open the roster panel
  const wait = function () { return new Promise(function (r) { setTimeout(r, 10); }); };

  // Replace-with-folder, cancelled: the roster is left untouched.
  const beforeReplace = rowCount();
  fireChange(doc.querySelector('#replaceFolderInput'), [new dom.window.File(['t'], 'Temp One.jpg', { type: 'image/jpeg' })]);
  ok('Replace-with-folder asks to confirm', !doc.querySelector('#confirm').hidden);
  doc.querySelector('#confirmCancel').click();
  ok('cancelling Replace-with-folder keeps the roster', rowCount() === beforeReplace && beforeReplace > 0);

  // Replace-with-folder, confirmed: clears the roster, keeps only image files.
  fireChange(doc.querySelector('#replaceFolderInput'), [
    new dom.window.File(['a'], 'Nadia Khan.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['b'], 'Omar Reyes.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['c'], 'notes.txt', { type: 'text/plain' }), // non-image, ignored
  ]);
  doc.querySelector('#confirmOk').click();
  ok('Replace-with-folder clears then loads only images', rowCount() === 2 &&
     rowNames().indexOf('Nadia Khan') !== -1 && rowNames().indexOf('Omar Reyes') !== -1);

  // Export -> capture the blob (jsdom has no real object URLs, so stub it) -> parse it back.
  const captured = [];
  dom.window.URL.createObjectURL = function (blob) { captured.push(blob); return 'blob:test'; };
  dom.window.URL.revokeObjectURL = function () {};
  doc.querySelector('#exportRoster').click();
  await wait(); // exportRoster is async (loadPhotos)
  ok('Export produces one downloadable blob', captured.length === 1);
  const readBlob = function (b) {
    return b.text ? b.text() : new Promise(function (res) {
      const r = new dom.window.FileReader(); r.onload = function () { res(String(r.result)); }; r.readAsText(b);
    });
  };
  const exportedText = await readBlob(captured[0]);
  const parsed = JSON.parse(exportedText);
  ok('Exported file is a NameDeck roster with every student',
     parsed.app === 'namedeck' && parsed.students.length === 2);

  // Export with nothing to export -> a clear error, and no blob.
  doc.querySelector('#clearRoster').click();
  doc.querySelector('#confirmOk').click();
  ok('roster is empty after Clear All', rowCount() === 0);
  captured.length = 0;
  doc.querySelector('#exportRoster').click();
  await wait();
  ok('exporting an empty roster errors and downloads nothing',
     captured.length === 0 && /nothing to export/i.test(doc.querySelector('#importStatus').textContent));

  // Replace-with-folder on an EMPTY roster: no confirmation needed, loads straight away.
  fireChange(doc.querySelector('#replaceFolderInput'), [new dom.window.File(['s'], 'Solo Student.jpg', { type: 'image/jpeg' })]);
  ok('Replace on an empty roster skips the confirm', doc.querySelector('#confirm').hidden);
  ok('Replace on an empty roster loads the folder', rowCount() === 1 && rowNames()[0] === 'Solo Student');

  // Import the exported file OVER a non-empty roster -> confirm -> students replaced.
  const rosterFile = new dom.window.File([exportedText], 'namedeck-roster.json', { type: 'application/json' });
  fireChange(doc.querySelector('#rosterFileInput'), [rosterFile]);
  await wait(); // onRosterFilePicked reads the file async, then asks to confirm
  ok('importing a file over a non-empty roster asks to confirm', !doc.querySelector('#confirm').hidden);
  doc.querySelector('#confirmOk').click();
  ok('confirming the import restores the file students', rowCount() === 2 &&
     rowNames().indexOf('Nadia Khan') !== -1 && rowNames().indexOf('Omar Reyes') !== -1);

  // A roster file that carries photos: the photo comes through and shows in the row thumbnail.
  doc.querySelector('#clearRoster').click();
  doc.querySelector('#confirmOk').click();
  const photoJson = JSON.stringify({ app: 'namedeck', version: 1,
    students: [{ preferredName: 'Photo Kid', photo: 'data:image/png;base64,iVBORw0KGgo=' }] });
  fireChange(doc.querySelector('#rosterFileInput'), [new dom.window.File([photoJson], 'p.json', { type: 'application/json' })]);
  await wait();
  ok('imports a roster file that includes a photo', rowCount() === 1 && rowNames()[0] === 'Photo Kid');
  ok('an imported photo shows in the row thumbnail', !!doc.querySelector('#rosterList .rthumb-photo'));

  // A non-roster file is rejected without wiping the current roster.
  fireChange(doc.querySelector('#rosterFileInput'), [new dom.window.File(['not json'], 'x.json', { type: 'application/json' })]);
  await wait();
  ok('a non-roster file is rejected without wiping the roster', rowCount() === 1);
  doc.querySelector('#useRoster').click(); // close roster

  // --- E. Clearing the roster returns to the empty state ---
  doc.querySelector('#rosterBtn').click();
  const countBeforeCancel = rowCount();
  doc.querySelector('#clearRoster').click();
  ok('Clear All opens a confirmation dialog', !doc.querySelector('#confirm').hidden);
  doc.querySelector('#confirmCancel').click();
  ok('cancelling keeps the roster intact', rowCount() === countBeforeCancel && countBeforeCancel > 0);
  ok('dialog closes after cancelling', doc.querySelector('#confirm').hidden);
  doc.querySelector('#clearRoster').click();
  doc.querySelector('#confirmOk').click();
  ok('confirming Clear All empties the roster list', rowCount() === 0);
  doc.querySelector('#useRoster').click();
  ok('clearing the roster returns to the empty state', !!doc.querySelector('.empty-deck'));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
