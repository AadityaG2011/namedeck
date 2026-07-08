// test/render.smoke.js — loads the built MVP in jsdom and exercises the flow:
// empty state -> build a roster -> timed reveal / auto-advance, plus the gear/roster panels.
// Run: node test/render.smoke.js
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'dist/index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true });
const doc = dom.window.document;

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
  // --- A. Initial state: empty deck (no bundled sample), PWA wired, controls present ---
  ok('empty state shown when no students', !!doc.querySelector('.empty-deck'));
  ok('empty state has an "Add roster" button', !!doc.querySelector('#emptyAdd'));
  ok('no card avatar while empty', !doc.querySelector('.avatar img, .avatar svg'));
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

  // --- C. Build a roster: the empty-state button opens it; add names, edit, import ---
  doc.querySelector('#emptyAdd').click();
  ok('empty-state button opens the roster panel', !doc.querySelector('#rosterSheet').hidden);

  doc.querySelector('#nameInput').value = 'Alice Johnson\nBob Smith\nCara Diaz';
  doc.querySelector('#addNames').click();
  ok('adding names creates a row per student', rowCount() === 3);
  ok('a named student with no photo shows a fallback avatar', !!doc.querySelector('#rosterList .rthumb svg'));

  // Edit button: names are locked until Edit is clicked, then a typo can be corrected.
  const firstRow = doc.querySelector('#rosterList .rrow');
  const nameField = firstRow.querySelector('.rname');
  ok('name field is read-only until Edit is clicked', nameField.hasAttribute('readonly'));
  firstRow.querySelector('.edit').click();
  ok('Edit unlocks the name field', !nameField.hasAttribute('readonly'));
  nameField.value = 'Alicia Johnson';
  nameField.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  doc.querySelector('#nameInput').value = 'Dana Fox';
  doc.querySelector('#addNames').click(); // forces a re-render from the data
  ok('edited name persists in the roster', rowNames()[0] === 'Alicia Johnson');

  // Import Photos: one student per file, name from the filename.
  const before = rowCount();
  fireChange(doc.querySelector('#photoImport'), [
    new dom.window.File(['x'], 'Zoe Martin.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['y'], 'liam_okafor (1).png', { type: 'image/png' }),
  ]);
  ok('import photos adds one student per file', rowCount() === before + 2);
  ok('import derives the name from the file name', rowNames().indexOf('Zoe Martin') !== -1);
  ok('import cleans underscores and dup-suffix', rowNames().indexOf('liam okafor') !== -1);

  // Import Folder: grabs the folder but ignores non-image files.
  const beforeFolder = rowCount();
  fireChange(doc.querySelector('#folderImport'), [
    new dom.window.File(['a'], 'Ana Reyes.jpg', { type: 'image/jpeg' }),
    new dom.window.File(['b'], 'notes.txt', { type: 'text/plain' }),
  ]);
  ok('import folder adds only the image file (skips notes.txt)', rowCount() === beforeFolder + 1);

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
