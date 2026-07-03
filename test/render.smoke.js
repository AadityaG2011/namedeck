// test/render.smoke.js — loads the built MVP in jsdom and exercises the timed-reveal
// and auto-advance flow, plus the gear/settings panel.
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

(async function () {
  // Initial render: photo present, name hidden, settings panel closed.
  ok('photo (or fallback) is shown', !!doc.querySelector('.avatar img, .avatar svg'));
  ok('name hidden initially', !nameShown());
  ok('gear button present', !!doc.querySelector('#gear'));
  ok('settings hidden initially', doc.querySelector('#settings').hidden);
  ok('reveal-delay control present', !!doc.querySelector('#delay'));
  ok('default reveal delay is 3s', doc.querySelector('#delayVal').textContent === '3s');
  ok('advance-gap control present', !!doc.querySelector('#gap'));
  ok('default advance gap is 4s', doc.querySelector('#gapVal').textContent === '4s');

  // Removed features should be gone.
  ok('no "Next" button', !doc.querySelector('.btn.next'));
  ok('no brand/subtitle/meta text', !doc.querySelector('.brand, .subtitle, .meta'));

  // Gear opens the settings panel.
  doc.querySelector('#gear').click();
  ok('gear opens the settings panel', !doc.querySelector('#settings').hidden);

  // Both sliders update their labels.
  const delaySlider = doc.querySelector('#delay');
  delaySlider.value = '1';
  delaySlider.dispatchEvent(new dom.window.Event('input'));
  ok('changing reveal slider updates label to 1s', doc.querySelector('#delayVal').textContent === '1s');
  const gapSlider = doc.querySelector('#gap');
  gapSlider.value = '1';
  gapSlider.dispatchEvent(new dom.window.Event('input'));
  ok('changing gap slider updates label to 1s', doc.querySelector('#gapVal').textContent === '1s');

  // Close button hides the panel again.
  doc.querySelector('#closeSettings').click();
  ok('close button hides the settings panel', doc.querySelector('#settings').hidden);

  // First tap: reveal the name early.
  doc.querySelector('#card').click();
  ok('tapping card reveals the name', nameShown());

  // Second tap: skip straight to the next student, no waiting for the gap timer.
  doc.querySelector('#card').click();
  ok('tapping again advances to the next student', !nameShown());
  ok('advancing keeps an avatar', !!doc.querySelector('.avatar img, .avatar svg'));

  // The new card auto-reveals via the 1s reveal timer (no tap needed).
  await new Promise(function (r) { setTimeout(r, 1200); });
  ok('name auto-reveals after the delay', nameShown());

  // ...and then auto-advances on its own after the 1s gap.
  await new Promise(function (r) { setTimeout(r, 1200); });
  ok('auto-advances to next student after the gap', !nameShown());

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();