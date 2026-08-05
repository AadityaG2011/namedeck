# NameDeck

A flashcard app that helps teachers learn their students' names before day one.

A student's photo appears. After a short delay (default **2s**), their name appears — giving
you a moment to recall it first — then it **auto-advances** to the next student after another
delay (default **1s**). Tap the card to reveal the name early; tap again to skip ahead. A gear
**Settings** panel adjusts both delays. That's the whole app, on purpose — quiz modes, spaced
repetition, and typed answers are intentionally out of scope for now.

**Live app:** [namedeck.pages.dev](https://namedeck.pages.dev)

---

## Contents
- [Ways to use NameDeck](#ways-to-use-namedeck)
- [Get the app](#get-the-app)
  - [1. On the web (nothing to install)](#1-on-the-web-nothing-to-install)
  - [2. As a PWA on your phone](#2-as-a-pwa-on-your-phone)
  - [3. As a native iOS app](#3-as-a-native-ios-app)
- [The roster](#the-roster)
- [Import from Google](#import-from-google)
- [Privacy](#privacy)
- [Build the native iOS app (full guide)](#build-the-native-ios-app-full-guide)
- [Troubleshooting (native build)](#troubleshooting-native-build)
- [For developers](#for-developers)
- [Roadmap](#roadmap)

---

## Ways to use NameDeck
The same app runs three ways — pick whichever fits:

| Way | What it is | Best for | How to get it |
| --- | --- | --- | --- |
| **Web** | Runs in any browser at the hosted URL | A quick try, or desktop use | [Open the link](#1-on-the-web-nothing-to-install) |
| **PWA** | The web app "installed" to your phone — app icon, full-screen, offline | Teachers who want an app feel with **no App Store** | [Add to Home Screen](#2-as-a-pwa-on-your-phone) |
| **Native iOS** | A real iOS app (Capacitor), installed via Xcode | The path toward **TestFlight / App Store** | [Build guide](#3-as-a-native-ios-app) |

Your roster is stored **on each device**, so it doesn't automatically move between them.

---

## Get the app

### 1. On the web (nothing to install)
Open **[namedeck.pages.dev](https://namedeck.pages.dev)** in any browser — desktop or
mobile. That's the whole app.

### 2. As a PWA on your phone
Installing the web app to your home screen gives it an **app icon**, a **full-screen** view
(no browser bar), and **offline** support — no App Store required.

**On your iPhone / iPad (Safari):**
1. Open **[namedeck.pages.dev](https://namedeck.pages.dev)** in **Safari**.
2. Tap the **•••** (More) button in the **bottom-right** corner of Safari.
3. Tap **Share** (the square with an up-arrow). *(On some iOS versions the Share icon sits in
   the toolbar directly — tap that instead.)*
4. Scroll down → **Add to Home Screen** → **Add**.
5. Launch **NameDeck** from your home screen.

**On your Android phone (Chrome):**
1. Open **[namedeck.pages.dev](https://namedeck.pages.dev)** in **Chrome**.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**) → **Install**.

**On a desktop (Chrome / Edge):** click the **install icon** in the address bar (or **⋮ menu →
Install NameDeck**).

### 3. As a native iOS app
A real iOS app built with [Capacitor](https://capacitorjs.com/), installed through Xcode —
the route toward TestFlight and the App Store. It needs a **Mac** and ~30–45 minutes the first
time. Full walkthrough: **[Build the native iOS app](#build-the-native-ios-app-full-guide)**.

---

## The roster
On first open, NameDeck shows a small **demo roster** of well-known historical figures (Albert
Einstein, Marie Curie, Rosa Parks, …) — with portraits pulled from Wikipedia — so a new user
sees the flow working right away. It's fully editable, and **Clear All** in *My Roster* removes
it for good (it's never re-added).

Teachers build their own roster from the **My Roster** panel:
- **Paste or type names** (one per line), and/or
- **Import Photos** / **Import Folder** — one student per photo, with the file name used as the
  name (edit any afterward), and/or
- **Import from Google** — pull names + photos collected through a Google Form, matched
  automatically (see [Import from Google](#import-from-google)).

Photos are downscaled and saved **on the device** (localStorage). A student with no photo yet
shows a generated avatar, so a roster can be built names-first and photographed later. Once the
demo (or your own roster) is cleared, the deck shows an empty state until you add students.

---

## Import from Google
The **Import from Google** button lets a teacher collect student names + photos through a Google
Form and pull them straight into the roster, matched automatically — no renaming files or
matching names to faces by hand. It works in **all three** ways of running NameDeck:

- **Web / PWA:** Google Sign-In + the Google Picker run in-page (real browser origin), using the
  narrow `drive.file` permission (per-file access only).
- **Native iOS:** because Google blocks its sign-in inside app webviews, the app opens a small
  NameDeck page (`native-import.html`) in the **real browser**; that page signs in, picks, and
  reads the responses, then returns to the app via a `namedeck://` link carrying the token +
  `{name, fileId}` list, and the app downloads the photos. This needs the `@capacitor/app` +
  `@capacitor/browser` plugins (`npm install` + `npx cap sync ios`) and the `namedeck` URL scheme
  (already in `ios/App/App/Info.plist`).

### Set up the Google Form (one time)

**Fastest — copy the ready-made template.** It already has both questions with the exact titles
the importer needs, so there's nothing to name by hand:

1. Open **[this template form and click "Make a copy"](https://docs.google.com/forms/d/1LPtee-jJjrAMUg4oLP0DvetcocHsgyT5nTZqiwZ0jt8/copy)** — a copy lands in your own Google Drive.
2. Link a spreadsheet: open **your copy's** **Responses** tab → click the green **Link to Sheets**
   icon → **Create a new spreadsheet**.
3. **Send** the form to your students. Each submits their name + one photo. (Google automatically
   creates a **"<Form name> (File responses)"** folder in your Drive for the uploaded photos.)

Then jump to [Import into NameDeck](#import-into-namedeck).

**Or build the form by hand.** The importer looks for two specific question titles, so **name
them exactly** (including capitalization):

1. Create a form at **[forms.google.com](https://forms.google.com)**.
2. Add a **Short answer** question titled exactly **`Preferred Full Name`**.
3. Add a **File upload** question titled exactly **`Your Photo`** — allow **image** files, limit
   to **1 file**. (This makes the form require Google sign-in and auto-creates the "(File
   responses)" folder in your Drive.)
4. Link a spreadsheet: **Responses** tab → **Link to Sheets** → **Create a new spreadsheet**.
5. **Send** it to your students.

> Want different question wording? Change `NAME_HEADER` / `PHOTO_HEADER` at the top of
> `src/ui/google-import.js` to match your titles.

### Import into NameDeck
1. In the app, open **My Roster → Import from Google**. (On the native app this opens Safari; on
   web/PWA it happens in-page.)
2. **Sign in** with the Google account that **owns** the form (and its Drive folder).
3. **Step 1** — select your **responses spreadsheet**. NameDeck then shows **which students it
   found** (e.g. "Importing 24 students: John Smith, …") so you can confirm you picked the right
   class before continuing.
4. **Step 2** — pick the **"Your Photo (File responses)"** folder (one tap grabs every photo). Google
   Forms makes **two** nested folders: an outer one named after your **form**, and inside it the
   **"Your Photo (File responses)"** folder (named after the photo question) that **directly holds the
   photos** — **pick that inner one.** *(If you renamed the photo question, the folder is named after
   whatever you called it, still ending in "(File responses)". The outer form folder may also work,
   but the inner one is the reliable choice.)*
   - *Selecting photos manually?* Open the folder and multi-select — on a computer, click the first
     and **Shift-click** the last to grab a range.
   - *List vs. grid view doesn't matter* — use whichever's easier to navigate.
5. NameDeck matches each name to its photo, downloads them, and adds the students — with a progress
   line as it goes.

### Building your own copy (credentials)
If you're building your **own** copy of NameDeck, the committed Google credentials are locked to
this project's web origins and won't work for you. Create your own **Google Cloud** project
(enable the Picker API + Drive API, make an OAuth Client ID + API key) and paste them into
`src/ui/google-import.js`. The core app and manual photo imports work without any of this.

---

## Privacy
- **Local-first:** the roster and photos live on the teacher's device; nothing is sent to a server.
- **No facial recognition, no biometrics.** The app only *displays* an image.
- **Optional Google sign-in** (for Import from Google) uses the narrow `drive.file` permission —
  access only to the spreadsheet and photos you pick.

Full policy: **[namedeck.pages.dev/privacy.html](https://namedeck.pages.dev/privacy.html)**
(also linked from the app's **Settings**).

---

## Build the native iOS app (full guide)

A complete, start-from-nothing walkthrough. Follow it top to bottom and you'll have NameDeck
running on your own iPhone. Budget ~30–45 minutes the first time.

> **Why a Mac?** Building an iOS app requires **Xcode**, which only runs on macOS. There's no way
> around this — you need access to a Mac.

**Each step below is tagged with where you do it — 💻 *on the Mac* or 📱 *on the iPhone*.** Most
of the work is on the Mac; the phone is only involved in Steps 4 and part of 6. The Mac and the
iPhone are connected by the cable throughout.

### What you need first
- A **Mac** (macOS recent enough for the current Xcode) with **~15 GB free disk** (Xcode is big).
- An **iPhone** and a cable to connect it to the Mac:
  - **iPhone 15 or newer** → a **USB-C to USB-C** cable.
  - **iPhone 14 or older** → a **Lightning** cable (your charging cable usually works for data).
- A **free Apple ID** (the same one you use for the App Store — no paid account needed).
- ~30–45 minutes (mostly waiting on downloads).

Every command below goes in the **Terminal** app (press ⌘-Space, type "Terminal", Enter). Each of
the four tools has a quick "already have it?" check so you can skip what's installed.

### Step 1 — Install the tools 💻 on the Mac

**1a. Xcode**
- *Already have it?* Run `xcodebuild -version`. If it prints a version (e.g. `Xcode 16.x`), skip
  to **1b**.
- Otherwise, open the **Mac App Store**, search **Xcode**, and install it. It's several GB, so
  this takes a while.
- **Launch Xcode once** after it installs. On first launch it offers to install additional
  components / platform support — **select both macOS and iOS** and let it finish downloading. If
  it asks you to agree to the license, accept it (or run `sudo xcodebuild -license accept`).

**1b. Homebrew** (a package manager that makes the next two installs easy)
- *Already have it?* Run `brew --version`. If it prints a version, skip to **1c**.
- Otherwise, paste this in and follow the prompts:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
> When it asks for your password, type your **Mac login password** — the characters won't show as
> you type (that's normal), just type it and press Return. Afterward it may print two "Next steps"
> `echo`/`eval` commands to add Homebrew to your PATH — run those if shown, then confirm with
> `brew --version`.

**1c. Node.js and CocoaPods**
- *Already have them?* Run `node -v` and `pod --version`. If both print versions, skip to Step 2.
- Otherwise, install whichever is missing:
```bash
brew install node
brew install cocoapods
```
Confirm all three tools are ready:
```bash
node -v          # e.g. v24.x
npm -v           # e.g. 11.x   (comes with node)
pod --version    # e.g. 1.17.x
```

### Step 2 — Get the code 💻 on the Mac
Move into a folder you'll remember (your Desktop works), then clone the repo:
```bash
cd ~/Desktop                                                # or any folder you like
git clone https://github.com/AadityaG2011/namedeck.git
cd namedeck
```
**You should now be inside the project folder** (`~/Desktop/namedeck`). Every command from here
runs from this folder.
> **GitHub note:** if a later `git push` ever fails with *"Password authentication is not
> supported"*, that's expected — GitHub no longer accepts your account password for git. Run
> `gh auth login` (install with `brew install gh`) and log in through the browser, or use a
> Personal Access Token as the password. Cloning a public repo doesn't need this.

### Step 3 — Build the app and open it in Xcode 💻 on the Mac
From inside the `namedeck` folder:
```bash
npm install          # installs the build/test tooling and Capacitor
node build.js        # builds dist/ (the app the native shell loads)
npx cap sync ios     # copies dist/ into the iOS project + updates native bits
npx cap open ios     # opens the project in Xcode
```
> If `ios/` doesn't exist yet (fresh checkout without it), run `npx cap add ios` once before
> `npx cap sync ios`.

**Xcode should now open with the project loaded** — you'll see a blue **"App"** project at the top
of the left sidebar. If Xcode shows **"Update to recommended settings,"** click it → **Perform
Changes** (it's safe — just modern defaults).

### Step 4 — Connect and prepare your iPhone 📱 on the iPhone (plugged into the Mac)
Doing this *before* signing means Xcode can register your device and create the signing profile
without errors.
1. **Connect** the iPhone to the Mac with the cable. On the phone, tap **Trust** ("Trust This
   Computer?") and enter your passcode.
2. **Enable Developer Mode** (required on iOS 16 and later): on the iPhone go to **Settings →
   Privacy & Security → Developer Mode** → turn it **On** → **Restart** when asked. After the
   reboot, unlock the phone and tap **Turn On** at the prompt.
   > If you don't see "Developer Mode" yet, it appears once the phone has been connected to Xcode
   > — keep it plugged in and re-check.

### Step 5 — Sign the app in Xcode 💻 on the Mac
In the left sidebar, click the top blue **"App"** item → select the **"App" target** → **Signing
& Capabilities** tab:
1. Check **Automatically manage signing**.
2. **Team** → pick your Apple ID. If none is listed, choose **Add an Account…**, sign in with your
   free Apple ID, then select your personal team.
3. If it complains the **Bundle Identifier** is taken, change it to something unique to you, e.g.
   `com.yourname.namedeck`.

**When there are no red errors in this panel, signing is set.**

> **If you see "No profiles for 'com.…' were found":** the bundle ID isn't unique, or no device is
> registered yet. Make the **Bundle Identifier** unique (point 3 above) and make sure your iPhone
> is connected (Step 4) — free provisioning creates the profile once a device is attached.
>
> **If you see "Communication with Apple failed":** usually just a hiccup. Check your internet,
> click **Try Again**, confirm your Apple ID is listed under **Xcode → Settings (⌘,) → Accounts**,
> and if it persists, quit and reopen Xcode.

### Step 6 — Run it 💻 on the Mac, then 📱 on the iPhone
**On the Mac (in Xcode):**
1. In Xcode's top toolbar **device dropdown**, select **your iPhone** (not a simulator).
2. Click **▶ Run**.
3. If macOS asks to use a keychain key (*"codesign wants to access… Apple Development…"*), enter
   your **Mac login password** and click **Always Allow**.

**On the iPhone:**
4. First launch is blocked as an untrusted developer. Go to **Settings → General → VPN & Device
   Management** → tap your developer certificate → **Trust**. Then open the **NameDeck** icon on
   your home screen.

> **If Run stops with "Developer Mode disabled":** you skipped enabling it — do **Step 4**, then
> click **▶ Run** again.

That's it — NameDeck is running natively on your iPhone. 🎉

### The 7-day catch (free Apple ID)
Because you signed with a **free** Apple ID, the installed app **stops opening after ~7 days**. To
refresh it, just plug the phone back into the Mac and **▶ Run** again from Xcode. A paid **Apple
Developer account ($99/yr)** removes this limit and unlocks TestFlight and the App Store.

### Faster check: the Simulator 💻 on the Mac (no signing, no phone)
To just see the app without any signing setup, pick a simulator (e.g. **iPhone 15**) in the device
dropdown and click **▶ Run**. Good for a quick look; use a real device to test the actual feel and
the photo picker.

### After you change the code 💻 on the Mac
The native app bundles a snapshot of `dist/`, so refresh it after any edits:
```bash
git pull          # only if the changes were made/pushed from elsewhere
node build.js
npx cap sync ios
```
Then **▶ Run** again in Xcode.

---

## Troubleshooting (native build)
Every fix is written inline at the step where the error shows up — this table is just a lookup so
you can jump straight to it:

| Error / symptom | Where the fix is |
| --- | --- |
| `git push` → "Password authentication is not supported" | Step 2 note (use `gh auth login` or a token) |
| "No profiles for 'com.…' were found" | Step 5 note (unique bundle ID + connect the phone) |
| "Communication with Apple failed" | Step 5 note (retry / check Apple ID in Accounts) |
| "codesign wants to access key … in your keychain" | Step 6, point 3 (Mac login password → Always Allow) |
| "Developer Mode disabled" | Step 4 (enable it on the phone) |
| "Untrusted Developer" when the app launches | Step 6, point 4 (Trust the cert on the phone) |
| App opened before but now won't launch | The 7-day catch (re-Run from Xcode) |

---

## For developers

### Run from source
```bash
python3 -m http.server 8000   # then open http://localhost:8000/
```
Or just open `dist/index.html` directly in a browser.

### Build
```bash
node build.js   # bundles src/ into dist/ (index.html + native-import.html + privacy.html + PWA assets)
```

### Deployment
The production site is hosted on **Cloudflare Pages**, which auto-builds from the `main` branch
(build command `node build.js`, output directory `dist`) and publishes to
[namedeck.pages.dev](https://namedeck.pages.dev) on every push.

### Project structure
```
src/
  core/avatar.js        # generated-avatar fallback when there's no photo
  core/roster-store.js  # on-device roster persistence
  ui/app.js             # the one-mode UI
  ui/google-import.js   # optional "Import from Google" (Picker + drive.file)
  ui/styles.css         # styling
  native-import.html    # native Google-import handoff page (opened in the real browser)
  privacy.html          # privacy policy page
  pwa/                  # manifest, service worker, and generated app icons
index.html              # dev entry
dist/                   # built output: index.html + native-import.html + privacy.html + PWA assets
build.js                # bundles src/ into dist/
scripts/make-icons.js   # generates the PWA icons (zero dependencies)
test/                   # headless render test (npm test)
capacitor.config.json   # Capacitor config (app id/name, webDir=dist)
ios/                    # the native iOS project (opened in Xcode)
```

### Tests
```bash
npm test   # headless jsdom smoke test of the full flow
```

---

## Roadmap
**Done:** web + PWA + Capacitor iOS all live (hosted on Cloudflare Pages); Google import published
to production, so any teacher can use it — no test-user list.

**Next:** optional **App Store** release (needs a paid Apple Developer account) → native **SwiftUI**
rebuild (local-first) → then layer the quiz / spaced-repetition features back on.
