// test/render.smoke.js — loads the built MVP in jsdom and exercises the timed-reveal flow.
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
  // Initial render: photo present, name hidden, delay control at default 3s.
  ok('photo (or fallback) is shown', !!doc.querySelector('.avatar img, .avatar svg'));
  ok('name hidden initially', !nameShown());
  ok('delay control present', !!doc.querySelector('#delay'));
  ok('default delay is 3s', doc.querySelector('#delayVal').textContent === '3s');

  // Tap the card to reveal early.
  doc.querySelector('#card').click();
  ok('tapping card reveals the name', nameShown());

  // Next student: name hidden again, avatar still present.
  doc.querySelector('#next').click();
  ok('next hides the name again', !nameShown());
  ok('next keeps an avatar', !!doc.querySelector('.avatar img, .avatar svg'));

  // Change the delay control; label updates.
  const slider = doc.querySelector('#delay');
  slider.value = '1';
  slider.dispatchEvent(new dom.window.Event('input'));
  ok('changing slider updates label to 1s', doc.querySelector('#delayVal').textContent === '1s');

  // With a 1s delay and no tap, the name should auto-reveal via the timer.
  ok('name not shown before the timer fires', !nameShown());
  await new Promise(function (r) { setTimeout(r, 1200); });
  ok('name auto-reveals after the delay', nameShown());

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
