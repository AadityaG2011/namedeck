// test/render.smoke.js — loads the built app in jsdom and exercises the UI paths.
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

// Home should render with the brand + all four mode buttons.
ok('home renders brand', /NameDeck/.test(doc.querySelector('.brand').textContent));
ok('four mode buttons', doc.querySelectorAll('.mode').length === 4);
ok('progress bar present', !!doc.querySelector('.bar-fill'));

// Enter multiple-choice mode; expect an avatar SVG and 4 options.
doc.querySelector('[data-mode="mc"]').click();
ok('MC shows avatar svg', !!doc.querySelector('.avatar svg'));
ok('MC shows 4 options', doc.querySelectorAll('.opt').length === 4);

// Click an option; expect the round to advance (options get disabled then replaced).
const firstOpt = doc.querySelector('.opt');
firstOpt.click();
ok('MC records an answer (option disabled)', doc.querySelector('.opt').disabled === true);

// Back home, then study mode reveal flow.
doc.querySelector('.back').click();
doc.querySelector('[data-mode="study"]').click();
ok('study shows reveal button', !!doc.querySelector('.reveal'));
doc.querySelector('.reveal').click();
ok('study reveals a name', !!doc.querySelector('.answer .name').textContent);
ok('study shows rate buttons', doc.querySelectorAll('.rate .btn').length === 2);

// Roster browse.
doc.querySelector('.back').click();
doc.querySelector('[data-mode="roster"]').click();
ok('roster shows 20 cards', doc.querySelectorAll('.grid-card').length === 20);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
