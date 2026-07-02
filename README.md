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
- This prototype uses the **USA Men's National Team (World Cup 2026) squad** — senior,
  adult public figures (no minors). Their names are public facts. Photos are **not
  bundled**: the app fetches each player's portrait from **Wikipedia's REST API at
  runtime**, and Wikipedia disallows unlicensed photos of living people, so those
  portraits are freely licensed. If one can't load, it falls back to a generated avatar.
  In the real product this becomes a school-authorized student roster kept on-device.

## How to run
**Easiest:** open `dist/index.html` in any browser (double-click it).

**From source:**
```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```

## Structure
```
src/
  data/roster.js    # USMNT 2026 squad (name, number, position, Wikipedia title)
  core/avatar.js    # generated-avatar fallback when a portrait can't load
  ui/app.js         # the one-mode UI (web-only; rewritten in SwiftUI later)
index.html          # dev entry
dist/index.html     # built single-file demo (open this)
build.js            # bundles src/ into dist/index.html
test/               # headless render test (npm test)
```

## Next steps
Validate the feel → native SwiftUI iOS app (local-first, encrypted) → then layer the
quiz/spaced-repetition features back on.
