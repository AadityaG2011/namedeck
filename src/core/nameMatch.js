// nameMatch.js — fuzzy matching of a typed guess against the correct name.
//
// PORTABLE CORE LOGIC. Pure functions, no UI. Translates directly to Swift.
//
// Goal: forgive small typos and missing accents (so a teacher isn't punished for not
// knowing how to type "Léo"), while still teaching the exact spelling — the caller is
// expected to always reveal the canonical spelling after a guess.

window.NameDeck = window.NameDeck || {};

(function () {
  // Lowercase, strip diacritics, collapse whitespace, drop punctuation/hyphens.
  function normalize(s) {
    return (s || '')
      .normalize('NFD')                 // split accented chars into base + mark
      .replace(/[\u0300-\u036f]/g, '')  // remove the combining marks
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')     // punctuation/hyphens -> space
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Standard Levenshtein edit distance.
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = [];
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      let cur = [i];
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Allowed edit distance scales gently with word length.
  function tolerance(len) {
    if (len <= 4) return 1;
    if (len <= 8) return 2;
    return 3;
  }

  // Result: { correct, exact, distance }.
  //   exact   -> matched the canonical spelling including accents
  //   correct -> close enough to count as right (typo/accent forgiven)
  function check(guess, canonicalName) {
    const rawGuess = (guess || '').trim();
    const exact = rawGuess === canonicalName.trim();

    const g = normalize(guess);
    const target = normalize(canonicalName);
    if (!g) return { correct: false, exact: false, distance: Infinity };

    // Compare against the full name and also just the first token (many teachers will
    // type only the first name).
    const targetFirst = target.split(' ')[0];
    const dFull = levenshtein(g, target);
    const dFirst = levenshtein(g, targetFirst);
    const distance = Math.min(dFull, dFirst);

    const correct =
      distance === 0 ||
      dFull <= tolerance(target.length) ||
      dFirst <= tolerance(targetFirst.length);

    return { correct: correct, exact: exact, distance: distance };
  }

  NameDeck.nameMatch = {
    normalize: normalize,
    levenshtein: levenshtein,
    check: check,
  };
})();
