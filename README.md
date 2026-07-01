# NameDeck (web prototype)

A flashcard app that helps teachers learn — and correctly pronounce — their students'
names before day one. This repo is the **web prototype**: a clickable proof of the
UX and a reference implementation of the core learning logic, ahead of a native
iPhone (SwiftUI) build.

## Why a web prototype first
The shipped product is a native iOS app, but native code can only be built/run on a
Mac with Xcode. This web prototype lets us validate the flashcard feel and lock the
core logic *now*, in any browser. The logic is written as framework-agnostic modules
so it ports cleanly to Swift later.

## Privacy stance (this matters for this product)
- The real product is **local-first**: student photos and names live encrypted on the
  teacher's device and auto-delete at term end.
- **No facial recognition. No biometrics.** The app only *displays* an image for a
  human to look at.
- This prototype ships with **synthetic sample data only** — invented names paired with
  procedurally generated avatars. No real people, no real photos, no minors' data.
- Real student data must **never** be committed to Git (see `.gitignore`).

## How to run
It's a zero-dependency static app. Two ways:

**Easiest — just open the built file:**
Open `dist/index.html` in any browser (double-click it).

**From source (recommended for development):**
```bash
# any static server works; e.g. Python:
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Project structure
```
src/
  core/
    leitner.js     # spaced-repetition scheduler (Leitner box) — PORTABLE
    nameMatch.js   # fuzzy name matching (diacritics/typos) — PORTABLE
    quiz.js        # multiple-choice generation — PORTABLE
    avatar.js      # deterministic procedural SVG avatars
  data/
    roster.js      # synthetic U23-style sample roster
  ui/
    app.js         # DOM/UI controller (web-only; rewritten in SwiftUI later)
index.html         # dev entry (loads src/ files)
dist/index.html    # built single-file demo (open this directly)
build.js           # bundles src/ into dist/index.html
```

## What ports to the iOS app
The `src/core/` modules (`leitner`, `nameMatch`, `quiz`) are pure logic with no UI or
platform coupling. They translate to Swift almost verbatim. The `app.js` UI layer is
web-only and gets rewritten in SwiftUI; the *design and flows* it demonstrates carry over.

## Roadmap (see the full plan document)
Prototype (this) → validate UX → native SwiftUI iOS app (local-first, encrypted) →
pronunciation audio → roster integrations → Android.
