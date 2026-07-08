# NameDeck (web prototype — MVP)

A flashcard app that helps teachers learn their students' names before day one.
This is the **minimum viable product**: one simple mode.

## What it does
A student's photo appears. After a short delay (default **2s**), their name appears —
giving you a moment to recall it first — then it **auto-advances** to the next student
after another delay (default **1s**). Tap the card to reveal the name early; tap again
to skip ahead. A gear **Settings** panel adjusts both delays.

That's the whole app, on purpose. Quiz modes, spaced repetition, and typed answers are
intentionally out of scope for the MVP.

## The roster (teacher-provided, on-device)
There's no bundled sample data. Teachers build their own roster from the **My Roster**
panel:
- **Paste or type names** (one per line), and/or
- **Import Photos** / **Import Folder** — one student per photo, with the file name used
  as the name (edit any afterward).

Photos are downscaled and saved **on the device** (localStorage in this web prototype).
A student with no photo yet shows a generated avatar, so a roster can be built
names-first and photographed later. Until any students are added, the deck shows an
empty state.

## Privacy stance
- **Local-first**: the roster and photos live on the teacher's device; nothing is sent
  to a server.
- **No facial recognition. No biometrics.** The app only *displays* an image.

## Installable (PWA)
The built app is a Progressive Web App — deploy `dist/` over HTTPS and it's installable
(Add to Home Screen) with an app icon and **offline** support via a service worker.

## How to run
**Easiest:** open `dist/index.html` in any browser.

**From source:**
```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Structure
```
src/
  core/avatar.js        # generated-avatar fallback when there's no photo
  core/roster-store.js  # on-device roster persistence (the storage seam for iOS)
  ui/app.js             # the one-mode UI (web-only; rewritten in SwiftUI later)
  ui/styles.css         # styling
  pwa/                  # manifest, service worker, and generated app icons
index.html              # dev entry
dist/index.html         # built single-file app shell (+ PWA assets alongside)
build.js                # bundles src/ into dist/ and copies PWA assets
scripts/make-icons.js   # generates the PWA icons (zero dependencies)
test/                   # headless render test (npm test)
```

## Next steps
Validate the feel → native SwiftUI iOS app (local-first) → then layer the
quiz/spaced-repetition features back on.
