# Focus Filter for YouTube

A Firefox and Chrome extension that leaves YouTube alone while you browse, and
checks a video against your rules the moment you open it. Anything blocked sends
you somewhere better instead.

Both browsers run the same source. Only the manifest differs — see
[Building for both browsers](#building-for-both-browsers).

**Shipped defaults are deliberately neutral** for a public release: no category
rules preset, blocked videos show a blocking screen rather than redirecting, and
the goals text is a generic example. The one opinionated default is **Smart**
checking: Gemini watches a video when its details are not conclusive. Users who
never want a video's link sent to Google pick Standard. Configure it to taste on the settings page —
nothing here needs a code change.

To get the setup this was originally built around: set **Gaming** and
**Drama, gossip & reactions** to Block, and put your preferred address in
**Send me here instead**.

> **How this was made.** This is live-coded, AI-generated code. It exists to
> help people focus. The person behind it does not have the time to write and
> maintain it all by hand, so nearly all of it was written with an AI coding
> assistant (Claude Code), steered and tested by a human. Read it with that in
> mind: issues and pull requests are welcome, but answers may be slow, and it
> comes with no warranty (see [LICENSE](LICENSE)).

**Get it:** [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/focus-filter-for-youtube/)
for a signed build that updates itself, or the zips under
[Releases](../../releases) (Chrome: unzip, then *Load unpacked* in
`chrome://extensions`). The `main` branch can be ahead of the latest release.

## Install

### Firefox

**Easiest: double-click `Start with Firefox.command`.** It opens Firefox with the
extension already loaded and the settings page showing — no file picker, nothing
to select. Keep the Terminal window it opens; closing that stops the extension.

<details>
<summary>Manual route, if you prefer</summary>

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…**
3. Select **`web-ext-artifacts/focus_filter_for_youtube-1.0.0.zip`**, not
   `manifest.json` — the macOS picker filters to archives, so the manifest is
   often greyed out or hidden.

</details>

Either way this is a *temporary* add-on: it disappears when Firefox quits. See
[Making it permanent](#making-it-permanent).

### Chrome

**Double-click `Start with Chrome.command`.** It builds `build/chrome/`, opens
Chrome, and reveals the folder in Finder ready to drop in.

Then, once:

1. Go to `chrome://extensions`.
2. Turn on **Developer mode**, top right.
3. Click **Load unpacked** and pick the **`build/chrome`** folder — or drag that
   folder straight onto the page.

Unlike Firefox's temporary add-on this survives restarts, so step 1–3 is a
one-time cost. After editing any source file, run `./build.sh chrome` and press
the reload arrow on the extension's card.

There is no Chrome equivalent of `web-ext run`: the `--load-extension`
command-line switch stopped working in Chrome 137, so loading by hand is the
only route for an unpacked build.

The same folder loads in any Chromium browser — Edge, Brave, Chromium, Arc, Opera
— through the same Developer-mode flow.

## Building for both browsers

```
./build.sh            # both
./build.sh chrome     # just Chrome
./build.sh firefox    # just Firefox
```

Each target gets an unpacked folder and a store-ready zip under `build/`.

Every source file is shared. The differences are confined to two places:

| | Firefox | Chrome |
| --- | --- | --- |
| Manifest | `manifest.json` | `manifest.chrome.json` |
| Background | `background.scripts`, a persistent-ish event page | a service worker, via `sw.js` |
| Extras | `browser_specific_settings` (gecko id, data-collection consent) | `minimum_chrome_version`, a 16px icon |
| Main-world script | `page-bridge.js` with `"world": "MAIN"` (Firefox 128+) | same (Chrome 111+, hence `minimum_chrome_version`) |

`sw.js` exists only because Chrome accepts a single background file where
Firefox takes a list; it `importScripts`es the same two scripts in the same
order. **If you add a background script, add it to both** `manifest.json` and
`sw.js`.

The JS itself needs no branching: every context starts from
`const ext = globalThis.browser ?? globalThis.chrome` in `common.js`. Current
Chrome (verified on 151) ships its own `browser` namespace alongside `chrome`,
so `ext` binds to `browser` in *both* browsers; on older Chrome it falls back to
`chrome`, whose promise-based MV3 APIs behave the same. Either way the calling
code is identical.

Version numbers live in each manifest separately, since the two stores accept
releases independently. `build.sh` warns when they drift apart.

## Setup

1. Get a free API key at <https://aistudio.google.com/apikey>.
2. The settings page opens by itself on install. (To reach it later: the toolbar
   icon lives in the **puzzle-piece overflow menu** until you pin it, or use
   `about:addons` → Focus Filter for YouTube → **Preferences**.)
3. Paste the key and hit **Test connection**.
4. Check the **Category rules** — Gaming and Drama ship set to Block. Anything
   left on Judge falls through to the score.
5. Pick **How closely to check a video**. Standard judges from the details;
   **Smart** has Gemini watch the video when the details are not conclusive;
   **Thorough** watches every video. Smart is the default. See [Watching the video](#watching-the-video).
6. Optionally fill in **Never show me this** — things that block a video even
   when they are only a small part of it — and **Content rules** — the kinds
   of video you do not want ("is mostly a sponsor read", "reaction videos").
7. Rewrite the **"What counts as productive for you"** box. This text goes to
   the model word for word and is the biggest lever on quality for every
   category still set to Judge.
8. Save. Every open YouTube tab reloads itself so it uses the new settings (a video already let through would otherwise never be checked against them).

### If you get a 404

A 404 means **the model name is wrong, not your key**. Google retires model IDs
regularly, so any list hard-coded in an extension goes stale. Click **Load models
from my key** on the settings page: it asks your key which models it can actually
use and switches you to a working one. **Test connection** also does this
automatically the first time it hits a 404.

## How it works

Your feed loads completely untouched. Nothing happens until you **click** a
video:

```
you open a video
     │
page-bridge.js  the player's own data for exactly this video ID:
     │          title, channel, description, tags, category, length
background.js   channel and title lists → cache → Gemini
     │              (a video the lists decide never reaches Google at all)
     │
     │   Standard   one call on the details
     │   Smart      details first; if unsure or a close call → Gemini watches it
     │   Thorough   Gemini watches it
     ▼  { category, score, never hits, content-rule hits, summary }
your rules   contains something from Never?  → blocked
             matches a content rule?        → blocked
             category set to Block?         → blocked
             category set to Allow?         → allowed
             category left on Judge?        → score vs threshold
                                              (and vs the hard limit)
     │
     ▼  blocked
redirect to your URL, or a blocking screen if you set none
(under the hard limit the screen has no "Watch anyway")
```

- **One API call per video you open**, not per video that scrolls past. If you
  open ten videos in an evening that is ten cheap requests.
- **What is sent** — the video's title, channel, description, tags, YouTube
  category and length; in Smart/Thorough mode possibly its public link too. No
  browsing history, no account data, and the extension never downloads or
  uploads the video. Requests go only to `generativelanguage.googleapis.com`.
- **Verdicts are cached** per video ID, so reopening a video is free. TTL 30 days.
  Each verdict remembers which goals and rules it was judged against; edit
  any of them and videos are re-judged instead of served a stale answer.
- **The details are matched to the video ID.** `page-bridge.js` runs in the
  page's own JS world and reads YouTube's player data, but only answers for the
  exact ID in the URL. The previous version read the title off the page, which
  for a moment after in-app navigation is still the *previous* video's title —
  so the new video was judged, and cached, as the old one.

### Watching the video

Titles lie. In Smart and Thorough mode the extension passes the video's public
link to Gemini as a `fileData` part, and Google fetches and processes the video
itself — the frames and the audio. The model then judges the content, checks
both lists of rules against what was actually shown and said, and writes a
short summary of what is in the video, which the blocking screen shows.

| | |
| --- | --- |
| **Cost control** | Only the first *N* minutes are watched (setting, default 10), via `videoMetadata` offsets. Frames are sampled at ≤ 300 per video and at low media resolution; audio is ~32 tokens/s regardless. A 10-minute watch is roughly 40k input tokens. |
| **Free-tier limit** | Google allows about 8 hours of YouTube video per day on a free key. A 429 falls back to the details verdict. |
| **What cannot be watched** | Unlisted, private and live videos. These are judged on their details; the blocking screen says so. |
| **Waiting** | Either keep the video paused behind the breathing screen, with no skip button, or let it play and stop it if the verdict comes back blocked. |
| **Smart mode triggers** | The details call returns `sure: false` (vague title, empty description), or the score is within 12 points of your threshold or of your hard limit. A firm category block or allow is not re-checked. |
| **Failure** | Any error while watching falls back to the details verdict — never to "no verdict". |

The YouTube-link feature is marked *preview* by Google, and `videoMetadata` is
marked deprecated in favour of a request-level option that is not yet
documented for `generateContent`. If clipping stops working, that is where to
look in `watchWithGemini()` in `background.js`.

### A pause before every video (optional)

Under **Pause before every video**, every video and every Short is held behind
a guided breathing exercise for 5 to 60 seconds (25 by default) — also a video
that was checked before and is fine. The circle grows on the in-breath and
shrinks on the out-breath, the screen says which, and a counter shows the
breath you are on and the seconds left. There is no way to skip it, only
**Take me back**, and the seconds only count while the tab is visible, so
switching away does not shorten it. The check runs alongside; whether the video
is blocked, you learn when the pause is over. A check that hangs never cuts the
pause short either. It works without an API key, because nothing is judged or
sent.

**Verse of the day.** The same card can put a Bible verse on the breathing
screen. It changes at midnight and comes from `verses.js`: over 500 verses from the
World English Bible (British Edition), which is in the public domain, shipped
with the extension. Nothing is fetched to show it.

### Strict mode (optional)

For when the filter is too easy to get around. **Strict mode** is one switch on
the settings page that holds everything that takes a way out away, from a
little to completely. Off, its settings stay saved but do nothing
(`applyStrict()` in `common.js`), so the normal setup stays short. Switched on
for the first time, it starts at a hard limit of 25 and three "Watch anyway"
a day; set each part as strict as you want.

**Hard limit.** A second, lower line on the same score. With the threshold at
50 and the hard limit at 25:

| Score | What happens |
| --- | --- |
| 0–24 | Blocked for good: the screen only offers **Back to YouTube home** and **Take me back**, no **Watch anyway**, and the video stays paused |
| 25–49 | Blocked, with the gentler "You shouldn't watch this, but it's not bad" and a **Watch anyway** button |
| 50–100 | Plays |

It stands on its own: lowering the threshold does not lower it, and in Strict
mode the threshold slider stops at the hard limit. It applies to the score; a
category set to Block or a content rule still offer **Watch anyway** (the never
list never does). **Also remove
those videos from the YouTube home page** (ticked by default) judges the home
page as it loads and hides only the tiles under the hard limit, with no "Show
anyway" card; everything else on the home page stays. That costs one API call
per 15 home-page videos and sends their titles, channels, lengths and view
lines, like feed filtering does.

**"Watch anyway" per day.** Any number from 0 (never) up, or no limit. The count
is shared by all tabs (the background hands them out one at a time, so two tabs
cannot both spend the last one) and starts again at local midnight. The button
says how many are left; once they are used up, a blocked video offers only the
way back, with a line saying so. The popup shows what is left today.

**Insane mode,** the strictest setting. Gemini watches every video and Short
you open, whatever **How closely to check** says, and the always-allow channel
list is ignored. The video stays paused behind the breathing circle until the
check is done, with no time limit, no skip and no **Watch anyway**. It fails
closed: a video that cannot be identified or checked stays blocked. A blocked
video offers **Back to YouTube home**. Insane mode needs an API key; the
settings page will not save it without one.

**A delay before it gets less strict.** While Strict mode is on, a saved change
that loosens it does not apply at once: it waits for the delay you pick (no
delay, 1 hour, 1 day by default, 3 days, 1 week) and every new loosening change
restarts the wait. Loosening means switching Strict mode or filtering off (the
popup's switch included), a lower hard limit, more "Watch anyway", Insane mode
or the home page option off, a shorter delay, or a different API key
(`GUARDED` and `holdBack()` in `common.js`, applied inside `saveSettings`).
Making it stricter works at once. The settings page shows what waits and until
when, with **Cancel, stay strict**; the popup shows it too. Once the time has
come, the change counts as saved the next time the settings are read; open tabs
pick it up when reloaded. The rest of the filter (goals, rules, categories,
channel lists, threshold) stays freely editable.

**Upgrading from 1.3:** whoever had Insane mode on finds Strict mode on, with
the hard limit off, no daily limit and no delay, so nothing they did not choose
changes.

### Category rules

Every video is sorted into one of 20 categories (gaming, drama, education,
technology, music…). Each category is **Judge** (default), **Allow** or
**Block**.

Two things fall out of this that are worth knowing:

- **Changing a rule costs nothing.** The category is cached with the video, and
  your rules are applied on top afterwards. Flipping Gaming from Judge to Block
  re-decides everything you have already seen without a single API call.
- **If you rule on every category, the score is dropped entirely** — the model
  stops being asked for it and the scoring rubric leaves the prompt, so requests
  get smaller. The settings page tells you when this happens.

Precedence: **blocked channel → allowed channel → blocked title word → never
list → content rule → category rule → score**.

### Channels and title words

The always-allow and always-block channel lists and the blocked title words are
matched here in the browser. They need no API key, never cost an API call, and
a video they decide is never sent to Google.

- A channel is written as its **name**, its **@handle** or its **link**. A
  handle or a link (or a `UC…` channel ID) means exactly that one channel.
- Names and title words match **whole words**, ignoring case and accents: `Vox`
  finds "Vox" and "Vox Media" but not "Voxel", and `ai` no longer blocks
  "maintain".
- A `*` stands for the rest of a word: `react*` also finds "reacts" and
  "reaction".
- Title words are checked against the title YouTube stores and the translated
  one it may show you.
- In Insane mode the always-allow list is ignored.

### Never show me this (zero tolerance)

One thing per line, in plain words, up to 20. A video that contains any of it
is blocked completely, even when it is only a small part and the rest is
exactly what you want; this beats category rules and the score. When Gemini
watches a video, one occurrence is enough — a scene, a sentence, a sponsor
segment — and the blocking screen says what it was and roughly when. There is
no **Watch anyway** for it, in any mode: the screen only offers **Back to
YouTube home** and **Take me back**, and in a filtered feed the tile is removed
without a "Show anyway" card.

How well this works depends on what Gemini gets to see, and the settings page
says so under the list: from the details alone only what the title, description
and tags give away can be caught; in Smart mode a video is watched when such
content is plausible but the details cannot tell; for full cover choose
**Thorough** and **the whole video**. Even then a long video is sampled at a
frame every few seconds, so a brief image can slip through; everything said is
heard.

### Content rules

The kinds of video you do not want ("promotes gambling or betting", "reaction
videos"), one per line, up to 20 — a full sentence or just a topic. A rule
blocks a video when it fits the video as a whole or a substantial part of it,
whatever its category or score; a passing mention is not enough, which is what
the never list is for. From the details alone a rule only matches on real
evidence; when Gemini watches the video it is judged on what is actually in it.

### Filtering the feed as well (optional)

The original behaviour — hiding rubbish from the home page before you see it —
is still there, switched off, under **Also filter the feed**. It is genuinely
better to browse, but it costs an API call for every video that scrolls past
rather than every video you open.

## Settings worth knowing about

| Setting | Notes |
| --- | --- |
| **How closely to check** | Standard / Smart / Thorough, plus how many minutes to watch and whether to wait paused or keep playing. |
| **Never show me this** | Zero tolerance: any trace of it blocks the video, whatever the rest is, with no **Watch anyway**. |
| **Content rules** | Plain-language block rules for what a video is, as a whole or in substantial part. |
| **Category rules** | Allow / Block / Judge per category. Absolute — Block means blocked whatever it scores. |
| **Send me here instead** | Where a blocked video sends you. Must be outside YouTube. Leave empty for a blocking screen with a **Watch anyway** button. |
| **Strictness** | The score below which a video is blocked. Applies *only* to categories left on Judge. |
| **Channels and title words** | Always-allow and always-block, by name (whole words, `*` for endings), @handle or link. Matched in the browser, no key needed. |
| **Pause before every video** | Off. A guided breathing pause of 5–60 s (default 25), no skip, before every video; optional Bible verse of the day. Needs no key. |
| **Strict mode** | Off. Holds the hard limit (no **Watch anyway** under it, optionally hidden from the home page), the daily number of **Watch anyway**, and Insane mode (Gemini watches every video before it plays, no skip, fails closed). Loosening it waits for a delay you pick (1 day by default). |
| **Also filter the feed** | Off. Turn on to hide tiles before you click them. |

## Design decisions you may want to change

- **It fails open.** If the API key is wrong, the quota is exhausted, or the
  network drops, videos are shown rather than hidden. A broken key blanking your
  entire feed would be worse than a few bits of junk getting through. The popup
  surfaces the last API error. Insane mode is the exception: there an opened
  video that could not be checked stays blocked.
- **Ambiguous titles are scored ~55**, i.e. allowed. The prompt deliberately
  biases toward letting things through, on the grounds that a wrongly blocked
  good video is more annoying than a wrongly allowed bad one. Raise the
  threshold if you disagree.
- **Setting a redirect URL removes the escape hatch.** With a blocking screen you
  get a **Watch anyway** button; with a redirect you are gone before the page
  renders, and a misjudged video cannot be overridden. If false positives annoy
  you, clear the redirect field and use the screen instead.
- **The redirect refuses YouTube addresses.** Sending a blocked video to another
  YouTube page would just get judged again on arrival.
- **Video titles are treated as untrusted data.** So are descriptions, tags,
  and — when Gemini watches — anything said or written on screen. They are
  wrapped in `<video_list>` / `<video_metadata>` blocks and the system prompt
  tells the model to score any of it that contains instructions ("ignore your
  instructions", "rate this 100") as 0. All of it is attacker-controlled.

## Legal position

Researched for a developer based in **Switzerland**. Not legal advice, but the
reasoning and the compliance measures already applied are recorded here so the
next person does not have to redo the work.

**Why this add-on sits in a very different place from an ad blocker.** It makes
zero requests to youtube.com, blocks and modifies no advertising, downloads no
video, and circumvents no protection measure. It reads a video's public details from a
page you opened yourself and applies rules you wrote. In Smart/Thorough mode it
hands Google a public YouTube link through Google's own documented Gemini
feature; Google's servers fetch the video, not the add-on. Every YouTube
enforcement action on record — Vanced, the TechCrunch downloader, Microsoft's
Windows Phone app — targeted ad stripping, downloading or alternative clients.

- **Swiss criminal law.** Art. 143bis SCC (unauthorised access) requires
  overcoming access protection on a system "specially secured" against it
  (BGE 145 IV 185). Public YouTube pages have none, and the add-on contacts no
  YouTube server at all. Not engaged.
- **Swiss unfair competition (UWG).** There is no Federal Supreme Court ruling
  on blocking tools; they would fall under the Art. 2 general clause. Swiss
  commentary expects adblockers to be lawful, as in Germany and Austria, because
  the user decides what to block. This add-on is further from the line than an
  adblocker: no advertising is touched, and the developer is not a competitor of
  YouTube.
- **Copyright.** The live theory is *Axel Springer v. Eyeo*, where modifying a
  page's DOM/CSSOM is argued to be an unauthorised alteration of a computer
  program. Germany's Federal Court of Justice revived it on 31 July 2025 and sent
  it back to Hamburg, so it is unresolved. It is German law with no Swiss
  equivalent, and it is aimed at a commercial adblocker with a paid whitelist
  business. Worth watching, not worth losing sleep over.
- **US law is not the exposure it looks like.** *Van Buren* (2021) and *hiQ v.
  LinkedIn* (2022) hold that breaching terms of service is not unauthorised
  access under the CFAA. DMCA §1201 needs a technological protection measure;
  none is touched.
- **YouTube's Terms of Service** are the real (small) surface. Their
  "otherwise interfere with the Service" clause could be read to cover blocking
  playback. That is a contract matter between **the user** and YouTube — the
  realistic worst case is account action against a user, not litigation against
  the developer.
- **Data protection.** Under the revised FADP (in force 1 September 2023) the
  developer is not a controller: there is no server and no data is ever received.
  The one outbound request goes from the user's browser to Google under the
  user's own key. The same reasoning covers GDPR for EU/UK users.
- **Gemini API terms, version of 23 March 2026 — open points.** Two new
  sentences matter for a bring-your-own-key add-on. First, the API "is for
  developers building with Google AI models for professional or business
  purposes, not for consumer use". Second, only Paid Services may be used "when
  making API Clients available to users" in the EEA, Switzerland or the UK.
  Each user signs up with Google and uses their own key, so the user, not the
  developer, is Google's API customer; how Google reads these clauses for such a
  tool is not settled. Reassess before marketing the add-on more widely, and
  never offer a shared or bundled key. The same version applies the paid-use
  data rules to free keys in the EEA, Switzerland and the UK; `PRIVACY.md`
  reflects that, while the settings page still warns about the free tier for
  everyone, which errs on the safe side.

### Obligations that are actually binding, and how they are met

| Obligation | Source | Where it is satisfied |
| --- | --- | --- |
| User must be 18+ | Gemini API terms | Checkbox gates the key in `options.html`; enforced in `options.js`; stated in listing and `PRIVACY.md` |
| Not aimed at under-18s | Gemini API terms | Never described as a parental control or a study tool for pupils — keep it that way |
| Free-tier data use disclosed | honesty, and store review | Settings page, `PRIVACY.md`, store description |
| Trademark attribution | Google branding guidelines | Settings page footer, `PRIVACY.md`, store description |
| Name must not lead with the mark | Google branding guidelines | "Focus Filter **for** YouTube" is the permitted form — do not reorder it |
| Icon must not imitate the mark | Google branding guidelines | Funnel mark; no red rounded rectangle, no play triangle |

**Do not** re-describe this as a parental control, a "kids mode", or a tool for
schools. That single wording change is what would move it from compliant to
in breach of the Gemini terms.

## Publishing

Three routes: two for Firefox, depending on whether you want it public, and one
for Chrome.

### Firefox, just for yourself (unlisted, signed, no review)

1. Sign in at <https://addons.mozilla.org/developers/>.
2. **Submit a New Add-on** → **On your own**. Unlisted: never published, never
   searchable, no human review — it is just signed and handed back.
3. Upload `build/focus-filter-for-youtube-<version>-firefox.zip`.
4. Download the signed `.xpi`, then install via `about:addons` → gear icon →
   **Install Add-on From File…**

### Firefox, on the store (listed, human-reviewed)

Same submission flow but choose **On this site**. Everything a reviewer will ask
for is written out in **`STORE-LISTING.md`**: name, summary, description,
category, tags, and a "Notes for Reviewer" block covering network activity, data
handling, permissions and prompt-injection handling.

You also need:

- **Privacy policy** — paste `PRIVACY.md`. Required, because the add-on transmits
  video titles to a third party.
- **Screenshots** — three suggestions are listed in `STORE-LISTING.md`.
- **Listing icon** — `icons/icon-512.png` (kept out of the package itself).

Expect review to take days rather than minutes, and expect questions about the
`*://*.youtube.com/*` permission and the outbound API call. The reviewer notes
answer both in advance.

### Chrome Web Store

Everything paste-ready lives in **`submission-chrome/`** — work through
`submission-chrome/1-SUBMIT-THIS.md` top to bottom. In outline:

1. Pay the one-off developer registration fee at
   <https://chrome.google.com/webstore/devconsole> (US$5, once, not per
   extension).
2. **Add new item** and upload `build/focus-filter-for-youtube-<version>-chrome.zip`.
3. Fill in the listing. `STORE-LISTING.md` still applies — name, summary,
   description and the reviewer notes are browser-agnostic.
4. Under **Privacy practices** you must declare, and justify in the box beside
   each one:
   - the `storage` permission — settings and the verdict cache, local only;
   - host access to `*://*.youtube.com/*` — reading video titles on the page;
   - host access to `generativelanguage.googleapis.com` — the classification call
     (and, in Smart/Thorough mode, passing the video's public link to Gemini);
   - **remote code: none.** Everything executed ships in the package.
5. Declare the data use honestly: video details (title, channel, description,
   tags) and, optionally, the video's link leave the browser for Google's
   Gemini API. Link `PRIVACY.md` as the privacy policy
   (<https://github.com/ImarTheOne/focus-filter-for-youtube/blob/main/PRIVACY.md>) —
   it is required, for exactly that reason, and its "Limited Use" section is
   the statement Chrome's User Data Policy asks for.

Review is usually faster than AMO's, but an extension asking for host permissions
on youtube.com can be pulled aside for a manual pass. The reviewer notes in
`STORE-LISTING.md` answer the predictable questions in advance.

### Compliance items every submission needs

Both stores, every time:

- **Privacy policy** must state the free-tier human-review point. `PRIVACY.md`
  does; if you rewrite it, keep that paragraph.
- **Listing must state 18+** and must not present the add-on as a parental
  control.
- **Trademark attribution line** must appear in the description.
- **Screenshots must show the new icon.** Retake any that still show the old
  red-and-play-triangle mark.

### Every upload after the first

Bump `"version"` in **both** `manifest.json` and `manifest.chrome.json` — AMO and
the Chrome Web Store each reject a version they have already seen. `build.sh`
warns if the two drift apart.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest, Firefox-flavoured (`background.scripts`, not a service worker) |
| `manifest.chrome.json` | MV3 manifest, Chrome-flavoured (service worker, no gecko block) |
| `sw.js` | Chrome-only service-worker entry; `importScripts`es `common.js`, `verses.js` and `background.js` |
| `build.sh` | Assembles `build/chrome` and `build/firefox` plus a zip for each |
| `submission/` | Paste-ready AMO submission pack (Firefox) |
| `submission-chrome/` | Paste-ready Chrome Web Store submission pack |
| `common.js` | Defaults, settings/stats helpers, shared by every context |
| `background.js` | API key handling, list matching, Gemini calls, verdict cache, cross-tab de-duplication |
| `verses.js` | The verses of the day, over 500 (World English Bible, public domain), read by the background script |
| `content.js` | Tile detection, hide/reveal state machine, watch-page gate |
| `page-bridge.js` | Runs in the page's main world; answers "details of video X" from the player's data |
| `content.css` | Injected at `document_start` so nothing flashes |
| `options.html/.css/.js` | Settings page |
| `popup.html/.js` | Toolbar popup: on/off switch, counters, error surface |
| `tools/verses/` | How `verses.js` was made: `refs.txt` (the chosen references), `fetch.mjs` (gets them from bible-api.com into `raw.json`), `gen.mjs ../../verses.js` (writes the list). Run from inside the folder. Not shipped. |
| `tests/logic.test.js` | `node tests/logic.test.js` checks list matching, rule order and the prompt, without a browser |
| `tests/e2e-firefox.mjs` | The built Firefox extension on a real YouTube page, in a headless, muted Firefox with a throwaway profile. Needs `npm install --no-save puppeteer-core` once |
| `tests/serve.js` | `node tests/serve.js` serves a fake player page and a fake home page (`tests/home.html`) that run the real `content.js`, and the settings page, on localhost:8780 (8765 is AnkiConnect's) |

## Known limits

- **YouTube changes its DOM often.** Tile detection covers the renderer names in
  use as of writing (`ytd-rich-item-renderer`, `yt-lockup-view-model`,
  `ytd-video-renderer`, the Shorts lockups, and others). If filtering silently
  stops working after a YouTube redesign, the selectors in `CONTAINERS` and
  `extract()` in `content.js` are the place to look.
- In Standard mode the model only sees the details, so a genuinely misleading
  title and description will fool it. Smart and Thorough exist for that.
- Watching takes 10–40 seconds the first time a video is opened.
- Blocked tiles in *hide* mode leave a gap in YouTube's grid layout until it
  reflows; this is cosmetic.
