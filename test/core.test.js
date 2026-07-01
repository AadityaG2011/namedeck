// test/core.test.js — sanity tests for the portable core modules.
// Run with: node test/core.test.js
//
// The core files attach to a global `window.NameDeck`. We provide a fake `window`,
// load the files, and assert behavior. (In the browser they load via <script>.)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {};
sandbox.window = sandbox; // in a browser, window IS the global object
sandbox.Math = Math;
vm.createContext(sandbox);

['src/core/nameMatch.js', 'src/core/leitner.js', 'src/core/quiz.js', 'src/data/roster.js']
  .forEach(function (f) {
    const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    vm.runInContext(code, sandbox);
  });

const ND = sandbox.window.NameDeck;
let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ok  - ' + name); }
  else { fail++; console.log('  FAIL- ' + name); }
}

// --- nameMatch ---
console.log('nameMatch:');
ok('exact match', ND.nameMatch.check('Mateo', 'Mateo').correct);
ok('accent forgiven (Leo vs Léo)', ND.nameMatch.check('Leo', 'Léo').correct);
ok('accent flagged as non-exact', !ND.nameMatch.check('Leo', 'Léo').exact);
ok('single typo forgiven', ND.nameMatch.check('Matteo', 'Mateo').correct);
ok('first name accepted for full name', ND.nameMatch.check('Amara', 'Amara Okafor').correct);
ok('wrong name rejected', !ND.nameMatch.check('Kenji', 'Mateo').correct);
ok('empty rejected', !ND.nameMatch.check('', 'Mateo').correct);

// --- leitner ---
console.log('leitner:');
let deck = ND.leitner.createDeck(['a', 'b', 'c']);
ok('starts in box 1', deck.cards.a.box === 1);
ND.leitner.recordAnswer(deck, 'a', true);
ok('correct promotes box', deck.cards.a.box === 2);
ND.leitner.recordAnswer(deck, 'a', false);
ok('wrong resets to box 1', deck.cards.a.box === 1);
for (let i = 0; i < 10; i++) ND.leitner.recordAnswer(deck, 'b', true);
ok('box caps at MAX_BOX', deck.cards.b.box === ND.leitner.MAX_BOX);
ok('progress counts mastered', ND.leitner.progress(deck).mastered === 1);
let next = ND.leitner.pickNext(deck);
ok('pickNext returns an id', ['a', 'b', 'c'].indexOf(next) !== -1);

// --- quiz ---
console.log('quiz:');
const opts = ND.quiz.multipleChoice(ND.roster, 'p01', 4);
ok('returns 4 options', opts.length === 4);
ok('includes the correct answer', opts.some(function (p) { return p.id === 'p01'; }));
ok('options are unique', new Set(opts.map(function (p) { return p.id; })).size === opts.length);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
