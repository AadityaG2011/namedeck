# NameDeck (web prototype — MVP)

A flashcard app that helps teachers learn their students' names before day one.
This is the **minimum viable product**: one simple mode.

## What it does
A student's photo appears. After a short delay (default **3 seconds**), their name
appears — giving you a moment to recall it first. A slider lets you set the delay
(1–10s). Tap the card to reveal early; "Next student" shuffles to a new face.

That's the whole app, on purpose. Quiz modes, spaced repetition, and typed answers
are intentionally out of scope for the MVP (the earlier versions of that logic are
preserved in this repo's Git history for when we add them back).

## Privacy stance
- The real product is **local-first**: photos live encrypted on the teacher's device
  and auto-delete at term end.
- **No facial recognition. No biometrics.** The app only *displays* an image.
- This prototype uses **synthetic sample data only** — invented names + procedurally
  generated avatars. No real people, no real photos. Real student data must never be
  committed (see `.gitignore`).

## How to run
**Easiest:** open `dist/index.html` in any browser (double-click it).

**From source:**
```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Structure
```
src/
  data/roster.js    # synthetic sample roster
  core/avatar.js    # deterministic procedural avatars (stand-in for photos)
  ui/app.js         # the one-mode UI (web-only; rewritten in SwiftUI later)
index.html          # dev entry
dist/index.html     # built single-file demo (open this)
build.js            # bundles src/ into dist/index.html
test/               # headless render test (npm test)
```

## Next steps
Validate the feel → native SwiftUI iOS app (local-first, encrypted) → then layer the
quiz/spaced-repetition features back on.
