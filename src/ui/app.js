// app.js — UI controller (WEB-ONLY; rewritten in SwiftUI for the native app).
// Drives the DOM using the portable NameDeck core modules. State is in-memory only
// (no persistence in the prototype — a deliberate choice; the real app stores locally
// and encrypted on device).

(function () {
  const ND = window.NameDeck;
  const roster = ND.roster;
  const $ = function (sel) { return document.querySelector(sel); };
  const el = function (tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const byId = function (id) { return roster.find(function (p) { return p.id === id; }); };

  let deck = ND.leitner.createDeck(roster.map(function (p) { return p.id; }));
  let session = { asked: 0, right: 0 };
  const app = $('#app');

  function renderProgressBar() {
    const p = ND.leitner.progress(deck);
    const pct = Math.round((p.mastered / p.total) * 100);
    return `<div class="progress">
      <div class="progress-head">
        <span>You know <b>${p.mastered}</b> of <b>${p.total}</b></span>
        <span class="muted">${pct}%</span>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="legend">
        <span><i class="dot fresh"></i>${p.fresh} new</span>
        <span><i class="dot learning"></i>${p.learning} learning</span>
        <span><i class="dot mastered"></i>${p.mastered} mastered</span>
      </div>
    </div>`;
  }

  // ---------- Home ----------
  function home() {
    app.innerHTML = '';
    const wrap = el('div', 'screen');
    wrap.innerHTML = `
      <div class="brand">NameDeck</div>
      <div class="subtitle">Learn your roster before day one</div>
      ${renderProgressBar()}
      <div class="modes">
        <button class="mode" data-mode="study"><span class="mode-emoji">🃏</span>
          <span class="mode-title">Study</span><span class="mode-sub">Flip cards, no pressure</span></button>
        <button class="mode" data-mode="mc"><span class="mode-emoji">🔤</span>
          <span class="mode-title">Multiple choice</span><span class="mode-sub">Pick the name</span></button>
        <button class="mode" data-mode="type"><span class="mode-emoji">⌨️</span>
          <span class="mode-title">Type the name</span><span class="mode-sub">Spelling counts (accents forgiven)</span></button>
        <button class="mode" data-mode="roster"><span class="mode-emoji">📋</span>
          <span class="mode-title">Browse roster</span><span class="mode-sub">See everyone</span></button>
      </div>
      <button class="reset" data-mode="reset">Reset progress</button>
      <div class="footer">Sample data · Real app keeps photos on-device · No facial recognition</div>
    `;
    wrap.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        const m = b.getAttribute('data-mode');
        if (m === 'study') startStudy();
        else if (m === 'mc') startMC();
        else if (m === 'type') startType();
        else if (m === 'roster') browse();
        else if (m === 'reset') { deck = ND.leitner.createDeck(roster.map(function (p) { return p.id; })); home(); }
      });
    });
    app.appendChild(wrap);
  }

  function topBar(title) {
    const bar = el('div', 'topbar');
    bar.innerHTML = `<button class="back">‹ Back</button><span class="topbar-title">${title}</span><span class="topbar-count"></span>`;
    bar.querySelector('.back').addEventListener('click', home);
    return bar;
  }

  function avatarNode(seed) {
    const box = el('div', 'avatar');
    box.innerHTML = ND.avatar(seed, 200);
    return box;
  }

  // ---------- Study ----------
  function startStudy() {
    app.innerHTML = '';
    const screen = el('div', 'screen');
    screen.appendChild(topBar('Study'));
    const card = el('div', 'card');
    screen.appendChild(card);
    app.appendChild(screen);

    function show() {
      const id = ND.leitner.pickNext(deck);
      const p = byId(id);
      card.innerHTML = '';
      card.appendChild(avatarNode(p.avatarSeed));
      const revealBtn = el('button', 'reveal', 'Tap to reveal');
      const answer = el('div', 'answer hidden');
      answer.innerHTML = `<div class="name">${p.preferredName}</div>
        <div class="phonetic">${p.phonetic ? '“' + p.phonetic + '”' : ''}</div>
        <div class="meta">#${p.number} · ${p.position} · ${p.legalName}</div>`;
      card.appendChild(revealBtn);
      card.appendChild(answer);

      revealBtn.addEventListener('click', function () {
        revealBtn.classList.add('hidden');
        answer.classList.remove('hidden');
        const rate = el('div', 'rate');
        rate.innerHTML = `<button class="btn bad">Didn't know</button><button class="btn good">Knew it</button>`;
        card.appendChild(rate);
        rate.querySelector('.good').addEventListener('click', function () { ND.leitner.recordAnswer(deck, id, true); show(); });
        rate.querySelector('.bad').addEventListener('click', function () { ND.leitner.recordAnswer(deck, id, false); show(); });
      });
    }
    show();
  }

  // ---------- Multiple choice ----------
  function startMC() {
    session = { asked: 0, right: 0 };
    app.innerHTML = '';
    const screen = el('div', 'screen');
    screen.appendChild(topBar('Multiple choice'));
    const card = el('div', 'card');
    screen.appendChild(card);
    app.appendChild(screen);

    function show() {
      const id = ND.leitner.pickNext(deck);
      const p = byId(id);
      const options = ND.quiz.multipleChoice(roster, id, 4);
      card.innerHTML = '';
      card.appendChild(avatarNode(p.avatarSeed));
      const opts = el('div', 'options');
      options.forEach(function (opt) {
        const b = el('button', 'opt', opt.preferredName);
        b.addEventListener('click', function () {
          const correct = opt.id === id;
          session.asked++; if (correct) session.right++;
          ND.leitner.recordAnswer(deck, id, correct);
          opts.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; });
          b.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) {
            opts.querySelectorAll('.opt').forEach(function (x) {
              if (x.textContent === p.preferredName) x.classList.add('correct');
            });
          }
          setTimeout(show, correct ? 550 : 1100);
        });
        opts.appendChild(b);
      });
      card.appendChild(opts);
      screen.querySelector('.topbar-count').textContent = session.asked ? session.right + '/' + session.asked : '';
    }
    show();
  }

  // ---------- Type the name ----------
  function startType() {
    session = { asked: 0, right: 0 };
    app.innerHTML = '';
    const screen = el('div', 'screen');
    screen.appendChild(topBar('Type the name'));
    const card = el('div', 'card');
    screen.appendChild(card);
    app.appendChild(screen);

    function show() {
      const id = ND.leitner.pickNext(deck);
      const p = byId(id);
      card.innerHTML = '';
      card.appendChild(avatarNode(p.avatarSeed));
      const form = el('div', 'typeform');
      form.innerHTML = `<input class="nameinput" type="text" placeholder="Their name…" autocomplete="off" autocapitalize="words" />
        <button class="btn submit">Check</button>
        <div class="feedback"></div>`;
      card.appendChild(form);
      const input = form.querySelector('.nameinput');
      const fb = form.querySelector('.feedback');
      input.focus();

      function submit() {
        const res = ND.nameMatch.check(input.value, p.preferredName);
        session.asked++; if (res.correct) session.right++;
        ND.leitner.recordAnswer(deck, id, res.correct);
        input.disabled = true;
        form.querySelector('.submit').disabled = true;
        if (res.correct && res.exact) {
          fb.innerHTML = `<span class="ok">✓ ${p.preferredName}</span>`;
        } else if (res.correct) {
          fb.innerHTML = `<span class="ok">✓ Close! It's spelled <b>${p.preferredName}</b></span>` +
            (p.phonetic ? `<div class="phonetic">“${p.phonetic}”</div>` : '');
        } else {
          fb.innerHTML = `<span class="no">✗ It's <b>${p.preferredName}</b></span>` +
            (p.phonetic ? `<div class="phonetic">“${p.phonetic}”</div>` : '');
        }
        const next = el('button', 'btn next', 'Next →');
        next.addEventListener('click', show);
        fb.appendChild(next);
        screen.querySelector('.topbar-count').textContent = session.right + '/' + session.asked;
      }
      form.querySelector('.submit').addEventListener('click', submit);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    }
    show();
  }

  // ---------- Browse roster ----------
  function browse() {
    app.innerHTML = '';
    const screen = el('div', 'screen');
    screen.appendChild(topBar('Roster'));
    const grid = el('div', 'grid');
    roster.forEach(function (p) {
      const c = el('div', 'grid-card');
      c.innerHTML = ND.avatar(p.avatarSeed, 96) +
        `<div class="grid-name">${p.preferredName}</div>
         <div class="grid-meta">#${p.number} · ${p.position}</div>`;
      grid.appendChild(c);
    });
    screen.appendChild(grid);
    app.appendChild(screen);
  }

  home();
})();
