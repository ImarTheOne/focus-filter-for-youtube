# Chrome Web Store launch checklist — Focus Filter for YouTube 1.0.0

Everything in this folder is paste-ready. Work top to bottom.

Dashboard: <https://chrome.google.com/webstore/devconsole>

**Two blockers before you start.** Both are things Chrome requires that AMO did
not, and neither can be fixed from inside this repo:

1. A **publicly reachable privacy policy URL** (step 5). Chrome will not accept
   pasted text the way AMO did.
2. **At least one screenshot** at 1280x800 or 640x400 (step 6).

---

## Step 0 — Register

One-off US$5 developer registration, paid once per account, not per extension.
You will also verify a contact email before you can publish.

## Step 1 — Upload the package

Upload:

```
build/focus-filter-for-youtube-1.0.0-chrome.zip
```

Deliberately **not** copied into this folder: `build.sh` regenerates it, and a
stale duplicate sitting next to the checklist is exactly how the wrong build
gets published. Rebuild first if in any doubt:

```bash
./build.sh chrome
```

Upload the **zip**, not the `build/chrome/` folder.

## Step 2 — Store listing

| Field | What to enter |
| --- | --- |
| Name | `Focus Filter for YouTube` |
| Short description | paste `2-short-description.txt` (126 chars, limit 132) |
| Detailed description | paste `3-description.txt` |
| Category | **Well-being** — alternate: **Workflow & Planning** |
| Language | English |

Chrome's category list is not AMO's, so the `Privacy & Security` choice from the
AMO listing does not map across. A focus/distraction tool sits most naturally
under Well-being; pick Workflow & Planning instead if you would rather be
shelved next to productivity tooling.

## Step 3 — Graphic assets

| Asset | Size | Status |
| --- | --- | --- |
| Store icon | 128x128 | ready: `icons/icon-128.png` |
| Screenshots (1–5) | 1280x800 or 640x400 | **you must capture these** |
| Small promo tile | 440x280 | optional |
| Marquee promo tile | 1400x560 | optional |

The promo tiles only matter if you want a shot at editorial placement. Skip them
for launch.

## Step 4 — Privacy tab

This is the tab that decides how long review takes. Four things:

1. **Single purpose** — paste `4-single-purpose.txt`
2. **Permission justifications** — paste the matching block from
   `5-permission-justifications.txt` into each box (`storage`, the two host
   permissions), and answer **No** to the remote-code question
3. **Data usage** — tick the categories set out in `6-data-disclosures.txt`,
   then accept all three certifications (all three are true here)
4. **Privacy policy URL** — see step 5

## Step 5 — Privacy policy URL (blocker)

You have the text in `PRIVACY.md`, but Chrome needs it at a URL. Cheapest routes,
in order of effort:

- **Public GitHub repo**: push the project and link the rendered file, e.g.
  `https://github.com/<you>/<repo>/blob/main/PRIVACY.md`
- **GitHub Pages**: turn Pages on for the repo and link the built page
- **Gist**: paste `PRIVACY.md` into a public gist and link that — works, though
  it looks less official to a reviewer

Whichever you pick, the URL must stay reachable for as long as the extension is
listed. A dead privacy policy link is grounds for takedown.

## Step 6 — Screenshots (blocker)

Capture these yourself, in a real Chrome with a real API key:

1. The settings page, Category rules section, a few set to Block
2. A blocking screen over a video player, showing the category and reason
3. The toolbar popup showing the counters

Load the extension first: `chrome://extensions` → Developer mode → Load unpacked
→ `build/chrome`. Automated capture is not worth attempting — signed-out YouTube
serves a cookie consent wall that covers the player.

## Step 7 — Distribution

- **Visibility**: Public. (Unlisted also exists — reachable by direct link only,
  and still fully reviewed. Private restricts it to trusted testers or a
  Workspace domain.)
- **Regions**: all, unless you have a reason to narrow it
- **Pricing**: free

---

## What will actually slow you down

**The reviewer cannot test it without their own Gemini key.** The extension is
inert until a key is pasted. `7-reviewer-notes.txt` says so explicitly and links
the free key page. If review stalls with no explanation, this is the likeliest
cause — reply with that text.

**Broad host access on youtube.com invites a manual pass.** The justifications in
`5-permission-justifications.txt` are written to answer that up front.

**Chrome has no prominent reviewer-notes field** the way AMO does. Keep
`7-reviewer-notes.txt` on hand for the reply if you get a rejection or a
clarification request.

## After it goes live

Bump `"version"` in **both** `manifest.json` and `manifest.chrome.json` before
every future upload. The two stores reject a version they have already accepted,
and they track it independently — `build.sh` warns when the numbers drift apart.
