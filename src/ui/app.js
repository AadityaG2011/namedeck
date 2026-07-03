// app.js — MVP: one mode. Show a photo, reveal the name after a delay, then
// auto-advance to the next student after a second delay. Both delays are adjustable
// from a gear/settings panel. Tap the card to reveal the name early; tap again to
// skip to the next student. State is in-memory (a prototype choice).
// WEB-ONLY; rewritten in SwiftUI later.

(function () {
  const ND = window.NameDeck;
  const roster = ND.roster;
  const app = document.querySelector('#app');

  let delay = 3;        // seconds before the name appears
  let gap = 4;          // seconds the name stays up before advancing to the next student
  let current = null;   // current student
  let revealTimer = null;
  let advanceTimer = null;
  let revealed = false;

  // Feather "settings" gear icon (inline so the app stays zero-dependency).
  const GEAR_SVG =
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 ' +
    '1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 ' +
    '1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 ' +
    '4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 ' +
    '0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 ' +
    '1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  function pick() {
    let p;
    do { p = roster[Math.floor(Math.random() * roster.length)]; }
    while (roster.length > 1 && current && p.id === current.id);
    return p;
  }

  function render() {
    app.innerHTML =
      '<div class="screen">' +
        '<button class="gear" id="gear" aria-label="Settings" title="Settings">' + GEAR_SVG + '</button>' +
        '<div class="settings" id="settings" hidden>' +
          '<div class="settings-head">' +
            '<span>Settings</span>' +
            '<button class="close" id="closeSettings" aria-label="Close settings">&times;</button>' +
          '</div>' +
          '<div class="control">' +
            '<label>Reveal name after <b id="delayVal">' + delay + 's</b></label>' +
            '<input id="delay" type="range" min="1" max="10" step="1" value="' + delay + '" />' +
          '</div>' +
          '<div class="control">' +
            '<label>Next student after <b id="gapVal">' + gap + 's</b></label>' +
            '<input id="gap" type="range" min="1" max="15" step="1" value="' + gap + '" />' +
          '</div>' +
        '</div>' +
        '<div class="card" id="card">' +
          '<div class="avatar" id="avatar"></div>' +
          '<div class="name-slot" id="nameSlot"></div>' +
        '</div>' +
      '</div>';

    document.querySelector('#delay').addEventListener('input', function (e) {
      delay = parseInt(e.target.value, 10);
      document.querySelector('#delayVal').textContent = delay + 's';
      if (!revealed) armReveal(); // apply the new delay to the current card
    });
    document.querySelector('#gap').addEventListener('input', function (e) {
      gap = parseInt(e.target.value, 10);
      document.querySelector('#gapVal').textContent = gap + 's';
      if (revealed) armAdvance(); // apply the new gap to a card already showing its name
    });
    document.querySelector('#gear').addEventListener('click', toggleSettings);
    document.querySelector('#closeSettings').addEventListener('click', closeSettings);
    document.querySelector('#card').addEventListener('click', onCardTap);

    nextCard();
  }

  function toggleSettings() {
    const s = document.querySelector('#settings');
    s.hidden = !s.hidden;
  }
  function closeSettings() { document.querySelector('#settings').hidden = true; }

  function loadPhoto(p, imgEl, fallback) {
    // Fetch the person's public-domain portrait from Wikipedia's REST API at runtime.
    // Fall back to a generated avatar on any failure (no network, blocked, no image).
    if (typeof fetch !== 'function' || !p.wiki) { fallback(); return; }
    fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(p.wiki))
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        if (current !== p) return; // a newer card is showing; ignore stale result
        var src = data && data.thumbnail && data.thumbnail.source;
        if (src) { imgEl.src = src; } else { fallback(); }
      })
      .catch(function () { if (current === p) fallback(); });
  }

  function showCard(p) {
    current = p;
    revealed = false;
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    const av = document.querySelector('#avatar');
    av.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'photo';
    img.alt = 'portrait';
    const fallback = function () { if (current === p) av.innerHTML = ND.avatar(p.avatarSeed, 320); };
    img.onerror = fallback;
    av.appendChild(img);
    loadPhoto(p, img, fallback);
    document.querySelector('#nameSlot').innerHTML = '<div class="waiting">tap or wait…</div>';
    armReveal();
  }

  function armReveal() {
    if (revealTimer) clearTimeout(revealTimer);
    revealTimer = setTimeout(reveal, delay * 1000);
  }

  function armAdvance() {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(nextCard, gap * 1000);
  }

  function reveal() {
    if (!current || revealed) return;
    revealed = true;
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
    const p = current;
    document.querySelector('#nameSlot').innerHTML = '<div class="name">' + p.preferredName + '</div>';
    armAdvance(); // once the name is up, wait `gap` then move to the next student automatically
  }

  // Tap the card: first tap reveals the name, a second tap skips to the next student.
  function onCardTap() { if (revealed) nextCard(); else reveal(); }
  function nextCard() { showCard(pick()); }

  render();
})();
