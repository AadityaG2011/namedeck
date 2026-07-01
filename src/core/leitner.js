// leitner.js — spaced-repetition scheduler (Leitner box system).
//
// PORTABLE CORE LOGIC. No UI, no DOM, no platform APIs. Pure functions over plain
// data. This translates to Swift almost line-for-line for the native app.
//
// Model: every card sits in a "box" 1..5. Correct answers promote it up a box;
// wrong answers send it back to box 1. Lower boxes are shown far more often, so the
// names you struggle with resurface frequently and the ones you know recede.
// "Mastered" = reached box 5.

window.NameDeck = window.NameDeck || {};

(function () {
  const MAX_BOX = 5;
  // Relative frequency weight per box. Box 1 shows ~8x as often as box 5.
  const BOX_WEIGHT = { 1: 8, 2: 5, 3: 3, 4: 2, 5: 1 };

  // Build initial state from a list of ids. Every card starts in box 1.
  function createDeck(ids) {
    const cards = {};
    ids.forEach(function (id) {
      cards[id] = { id: id, box: 1, seen: 0, correct: 0, streak: 0 };
    });
    return { cards: cards, lastId: null };
  }

  // Record an answer and return the (mutated) state.
  function recordAnswer(state, id, wasCorrect) {
    const c = state.cards[id];
    if (!c) return state;
    c.seen += 1;
    if (wasCorrect) {
      c.correct += 1;
      c.streak += 1;
      c.box = Math.min(MAX_BOX, c.box + 1);
    } else {
      c.streak = 0;
      c.box = 1;
    }
    return state;
  }

  // Weighted-random pick of the next card. Avoids repeating the immediately previous
  // card when possible so you don't get the same name twice in a row.
  function pickNext(state) {
    const entries = Object.values(state.cards);
    if (entries.length === 0) return null;

    const eligible = entries.filter(function (c) {
      return entries.length === 1 || c.id !== state.lastId;
    });

    let total = 0;
    eligible.forEach(function (c) { total += BOX_WEIGHT[c.box]; });

    let roll = Math.random() * total;
    let chosen = eligible[eligible.length - 1];
    for (let i = 0; i < eligible.length; i++) {
      roll -= BOX_WEIGHT[eligible[i].box];
      if (roll <= 0) { chosen = eligible[i]; break; }
    }
    state.lastId = chosen.id;
    return chosen.id;
  }

  // Progress summary for the whole deck.
  function progress(state) {
    const entries = Object.values(state.cards);
    const total = entries.length;
    const mastered = entries.filter(function (c) { return c.box >= MAX_BOX; }).length;
    const learning = entries.filter(function (c) { return c.box > 1 && c.box < MAX_BOX; }).length;
    const fresh = entries.filter(function (c) { return c.box === 1; }).length;
    return { total: total, mastered: mastered, learning: learning, fresh: fresh };
  }

  NameDeck.leitner = {
    MAX_BOX: MAX_BOX,
    createDeck: createDeck,
    recordAnswer: recordAnswer,
    pickNext: pickNext,
    progress: progress,
  };
})();
