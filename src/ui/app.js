// app.js — MVP: one mode. Show a photo, reveal the name after a delay.
// The delay is adjustable (1–10s). Tap the card to reveal early; "Next" for a new
// student. State is in-memory (a prototype choice). WEB-ONLY; rewritten in SwiftUI later.

(function () {
  const ND = window.NameDeck;
  const roster = ND.roster;
  const app = document.querySelector('#app');

  let delay = 3;        // seconds before the name appears
  let current = null;   // current student
  let timerId = null;
  let revealed = false;

  function pick() {
    let p;
    do { p = roster[Math.floor(Math.random() * roster.length)]; }
    while (roster.length > 1 && current && p.id === current.id);
    return p;
  }

  function render() {
    app.innerHTML =
      '<div class="screen">' +
        '<div class="brand">NameDeck</div>' +
        '<div class="subtitle">Look at the face, then recall the name</div>' +
        '<div class="control">' +
          '<label>Reveal name after <b id="delayVal">' + delay + 's</b></label>' +
          '<input id="delay" type="range" min="1" max="10" step="1" value="' + delay + '" />' +
        '</div>' +
        '<div class="card" id="card">' +
          '<div class="avatar" id="avatar"></div>' +
          '<div class="name-slot" id="nameSlot"></div>' +
        '</div>' +
        '<button class="btn next" id="next">Next student &rarr;</button>' +
        '<div class="footer">Sample data · Real app keeps photos on-device · No facial recognition</div>' +
      '</div>';

    document.querySelector('#delay').addEventListener('input', function (e) {
      delay = parseInt(e.target.value, 10);
      document.querySelector('#delayVal').textContent = delay + 's';
      if (!revealed) arm(); // apply the new delay to the current card
    });
    document.querySelector('#next').addEventListener('click', nextCard);
    document.querySelector('#card').addEventListener('click', revealNow);

    nextCard();
  }

  function showCard(p) {
    current = p;
    revealed = false;
    const av = document.querySelector('#avatar');
    av.innerHTML = '';
    // Real photo, loaded from the web at runtime. If it fails (offline / blocked),
    // fall back to the procedurally generated avatar so the app still works.
    const img = document.createElement('img');
    img.className = 'photo';
    img.alt = 'student photo';
    img.width = 220; img.height = 220;
    img.onerror = function () { av.innerHTML = ND.avatar(p.avatarSeed, 220); };
    img.src = p.photo;
    av.appendChild(img);
    document.querySelector('#nameSlot').innerHTML = '<div class="waiting">tap or wait…</div>';
    arm();
  }

  function arm() {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(reveal, delay * 1000);
  }

  function reveal() {
    if (!current || revealed) return;
    revealed = true;
    if (timerId) { clearTimeout(timerId); timerId = null; }
    const p = current;
    document.querySelector('#nameSlot').innerHTML =
      '<div class="name">' + p.preferredName + '</div>' +
      (p.phonetic ? '<div class="phonetic">“' + p.phonetic + '”</div>' : '') +
      '<div class="meta">#' + p.number + ' · ' + p.position + '</div>';
  }

  function revealNow() { reveal(); }
  function nextCard() { showCard(pick()); }

  render();
})();
