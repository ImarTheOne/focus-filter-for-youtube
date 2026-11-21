# Launch checklist — Focus Filter for YouTube 1.0.0

Everything in this folder is paste-ready. Work top to bottom.

Go to <https://addons.mozilla.org/developers/addon/submit/distribution>

---

## Step 1 — Distribution

Choose **On this site**. (That is the listed, public option. "On your own" would
make it unlisted and invisible to the people asking for it.)

## Step 2 — Upload

Upload **`focus_filter_for_youtube-1.0.0.zip`** from this folder.

Tick **Firefox** for desktop. Android is declared supported from Firefox 142, so
tick it only if you intend to actually test it on Android — otherwise leave it
off, since a broken Android experience produces bad reviews.

Automated validation runs here and should pass cleanly: the package lints with
0 errors, 0 warnings and 0 notices.

## Step 3 — Add-on details

| Field | What to enter |
| --- | --- |
| Name | `Focus Filter for YouTube` |
| Add-on URL | suggested: `focus-filter-for-youtube` |
| Summary | paste `2-summary.txt` (241 chars, limit 250) |
| Description | paste `3-description.txt` |
| Category | **Privacy & Security**, secondary **Photos, Music & Videos** |
| Tags | `youtube`, `productivity`, `focus`, `distraction`, `ai` |
| Support email | your choice — see the warning below |
| License | **MIT** (pick from the dropdown; do not paste text) |

## Step 4 — Privacy

- "Does your add-on collect or transmit user data?" → **Yes**
- Paste `5-privacy-policy.txt` into the privacy policy field
- The data-collection permission (`websiteContent`) is already declared in the
  manifest, so it should be pre-filled

## Step 5 — Images

- **Icon**: upload `listing-icon-512.png` — this is the **new funnel mark**. The
  original icon (red rounded rectangle + white play triangle) was effectively
  the YouTube logo and had to go; Google enforces this, and it is what the
  Vanced cease-and-desist demanded be changed.
- **Screenshots**: you still need these. Take them yourself at 1280x800, and
  make sure none of them still shows the old icon in the toolbar:
  1. Settings page showing Category rules with a few set to Block
  2. A blocking screen over a video, showing the category and reason
  3. The toolbar popup with its counters

## Step 6 — Notes for Reviewer

Paste `4-reviewer-notes.txt`. This is the step most likely to save you a
round-trip: it explains up front why the add-on needs YouTube access, what leaves
the browser, that there is no build step or remote code, and how to test without
your API key.

**A reviewer cannot test this without a Gemini API key of their own.** The notes
tell them where to get a free one and state that the add-on is completely inert
without it. If review stalls, that is the likeliest reason.

---

## Compliance points baked into the text — do not edit them out

These are in `3-description.txt`, `4-reviewer-notes.txt` and
`5-privacy-policy.txt` because Google's terms or Google's branding guidelines
require them. If you rewrite the copy, carry them across:

- **18+ statement**, and no framing as a parental control. The Gemini API terms
  require users to be 18+ and forbid aiming the service at under-18s. The
  settings page now gates the API key behind a confirmation checkbox.
- **Free-tier data use.** Google states unpaid-key content is used to improve
  Google products and may be read by human reviewers. Users are told this before
  they paste a key.
- **Trademark attribution** — "YouTube™ and Gemini™ are trademarks of Google
  LLC… not affiliated with, sponsored by or endorsed by Google LLC."
- **Never rename to "YouTube Focus Filter."** Leading with the trademark is the
  form Google objects to; "Focus Filter **for** YouTube" is the permitted one.

## Two warnings before you press submit

**Your support email becomes public.** `kontoonlyne@gmail.com` is currently in
the privacy policy text. If you would rather not publish a personal address,
change it in `5-privacy-policy.txt` and in the support field before submitting.

**The YouTube selectors have never been tested against real YouTube.** Every test
I ran was against fixtures I wrote, because YouTube is blocked in my tooling. If
the title selector does not match current markup, the add-on will do nothing at
all — and with people waiting on it, that lands as one-star reviews rather than a
quiet bug. Open a gaming video in the test profile and confirm it actually blocks
before you submit.

## After it goes live

Bump `"version"` in `manifest.json` before every future upload — AMO rejects a
version number it has already accepted.
