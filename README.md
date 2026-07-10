# IELTS Practice Hub — LANDING PAGE EXPERIMENT

> 🚧 **This is the landing-page experiment for [ielts-hub](https://github.com/maqsudjon-cell/ielts-hub) (flarestamina.com).**
> Visitors see a modern landing page with login (Google or guest); after
> sign-in the practice hub appears. Built on top of the Firebase layer from
> [ielts-hub-staging](https://github.com/maqsudjon-cell/ielts-hub-staging).
> If Firebase is unreachable the gate **fails open** into the hub so students
> are never locked out. Like staging, this copy never writes to the
> production Google Sheet.
>
> **Preview:** https://flarestamina.com/ielts-hub-landing/

A static, single-page site that lists IELTS practice tests grouped by category. Hosted on GitHub Pages.

**Live site:** https://flarestamina.com/ielts-hub/

---

## 🚀 Adding a new test (READ THIS FIRST)

Every new test needs **TWO things** or it won't work properly. Do both. Don't skip step 1 — that's the one everyone forgets.

### ✅ Step 1 — Paste this ONE line into your test page

In your test HTML file (the one students open), put this line **right before `</body>`**:

```html
<!-- IELTS Hub auto-loader: name modal + footer + Sheets logging -->
<script src="https://flarestamina.com/ielts-hub/js/test-page-auto.js" defer></script>
```

**Without this line:** the page is just a quiz — no name modal, no footer, no score logging to your Google Sheet.

**With this line:** you get all three automatically. Zero per-page configuration.

### ✅ Step 2 — Register the test in [`tests.json`](./tests.json)

Edit https://github.com/maqsudjon-cell/ielts-hub/blob/main/tests.json (pencil ✏️ icon, even works from mobile) and add a new entry to the `tests` array:

```json
{
  "title":      "My New Test Name",
  "category":   "Listening",
  "url":        "https://flarestamina.com/<your-repo>/<your-file>.html",
  "date":       "YYYY-MM-DD",
  "difficulty": "Band 6-7"
}
```

**Without this:** the test won't appear on the hub homepage.

`category` must be one of: `Listening`, `Reading`, `Writing`, `Speaking`, `Tools`.

### 🧪 How to verify both steps worked

Open your test page in a fresh browser tab. You should see:

| ✅ Working | ❌ Step 1 forgotten |
| --- | --- |
| Name modal pops up on first visit | No modal |
| "Hi, {name} · Change" pill in the corner | No pill |
| Telegram footer at the bottom of the page | No footer |
| After you submit, the score lands in your Google Sheet within ~5s | Nothing in the sheet |

And on https://flarestamina.com/ielts-hub/ — your new test should appear on a card.

If anything's off, open DevTools console on the test page and run:

```js
IELTSAuto.diagnose();
// Shows: { title, score, sent, patterns }
```

---

## More about `tests.json`

You don't need to touch any code. All test data lives in **[`tests.json`](./tests.json)** at the root of this repo. Edit that file — even from the GitHub mobile app — and the site updates within ~30 seconds.

### From the GitHub web/mobile interface

1. Open https://github.com/maqsudjon-cell/ielts-hub/blob/main/tests.json
2. Tap the pencil ✏️ icon (top-right) to edit
3. Add a new entry to the `tests` array (see schema below)
4. Scroll down → write a short commit message → **Commit changes**
5. Wait ~30s for GitHub Pages to redeploy, then refresh the site

### Entry schema

```json
{
  "title":      "Test name shown on the card",
  "category":   "Listening | Reading | Writing | Speaking",
  "url":        "https://...",
  "date":       "YYYY-MM-DD",
  "difficulty": "Band 6-7"
}
```

| Field        | Required | Notes                                                          |
| ------------ | -------- | -------------------------------------------------------------- |
| `title`      | yes      | Shown as the card heading. Max 2 lines on the card.            |
| `category`   | yes      | Must be one of: `Listening`, `Reading`, `Writing`, `Speaking`. |
| `url`        | yes      | Opens in a new tab when the card is clicked.                   |
| `date`       | yes      | ISO format (`YYYY-MM-DD`). Used for sorting and "Last updated". |
| `difficulty` | no       | Free text (e.g. `Band 6-7`, `Band 7+`). Shown as a pill.        |

### Example

```json
{
  "tests": [
    {
      "title": "Mocklab Essential Test 5",
      "category": "Listening",
      "url": "https://flarestamina.com/mocklabtest5listening/mocklab-essential-test5-listening.html",
      "date": "2026-05-19",
      "difficulty": "Band 6-7"
    },
    {
      "title": "Cambridge IELTS 18 — Reading Test 1",
      "category": "Reading",
      "url": "https://example.com/cambridge-18-r1",
      "date": "2026-06-01",
      "difficulty": "Band 7+"
    }
  ]
}
```

> ⚠️ **JSON is strict.** Commas between entries, double quotes around all keys and strings, no trailing comma after the last entry. If the site shows "Could not load tests", paste the file into [jsonlint.com](https://jsonlint.com) to find the syntax error.

---

## Test-page auto-loader — what it does, and overrides

The script tag from [Step 1](#-step-1--paste-this-one-line-into-your-test-page) above does all of this automatically:

- Loads **`tracker.js`** → name modal on first visit, "Hi, {name} · Change" pill thereafter
- Loads **`footer.js`** → premium Telegram contact footer
- Detects the test title from the page's `<h1>` (or `<title>`)
- Watches the page's result modal — when it opens, reads the displayed score and calls `IELTSTracker.sendResult(title, score)` for you

**No per-page configuration needed** for the standard MockLab / Cambridge / Trainer test layouts. The auto-detector handles them all.

### When auto-detection misses your custom modal

If you have a non-standard results modal, drop these meta tags in `<head>` to point the tracker at the right selectors:

```html
<meta name="test-title"          content="Custom Test Name">
<meta name="test-modal-selector" content="#myResultsModal.show">
<meta name="test-score-selector" content="#myScoreText">
```

### Debugging in DevTools console

```js
IELTSAuto.diagnose();
// → { title: "...", score: null|"...", sent: false, patterns: [...] }
```

`sent: false` after submitting means the score wasn't logged — usually a selector mismatch. Add the meta tags above.

---

## Tech

- Single `index.html` — embedded CSS + vanilla JS, no build step, no frameworks
- `tests.json` fetched at runtime
- Inter + JetBrains Mono from Google Fonts
- Light / dark theme with system-preference detection and `localStorage` persistence
- GitHub Pages deploys from `main` / root automatically

## Local preview

```bash
cd ielts-hub
python3 -m http.server 8000
# open http://localhost:8000
```
