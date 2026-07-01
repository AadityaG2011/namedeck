// quiz.js — multiple-choice question generation.
//
// PORTABLE CORE LOGIC. Pure functions, no UI.
//
// Builds a set of answer options for a card: the correct name plus plausible
// distractors. Distractors prefer players in the SAME position (harder, more useful
// practice) and fall back to any other player.

window.NameDeck = window.NameDeck || {};

(function () {
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // roster: full array of players. correctId: the answer. count: total options.
  // Returns an array of player objects (length up to `count`), shuffled.
  function multipleChoice(roster, correctId, count) {
    count = count || 4;
    const correct = roster.find(function (p) { return p.id === correctId; });
    if (!correct) return [];

    const others = roster.filter(function (p) { return p.id !== correctId; });
    const samePos = shuffle(others.filter(function (p) { return p.position === correct.position; }));
    const rest = shuffle(others.filter(function (p) { return p.position !== correct.position; }));

    const distractors = samePos.concat(rest).slice(0, count - 1);
    return shuffle([correct].concat(distractors));
  }

  NameDeck.quiz = {
    multipleChoice: multipleChoice,
    shuffle: shuffle,
  };
})();
