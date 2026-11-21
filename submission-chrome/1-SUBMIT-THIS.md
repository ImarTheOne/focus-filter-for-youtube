# Chrome Web Store update — Focus Filter for YouTube 1.4.0

The extension is already **published and public** on the Chrome Web Store
(item ID `bbgifkibgnommegopgnbbepfnbojbkpp`, live version 1.1.0). So this is an
update of an existing item, not a new one. Chrome users jump straight from
1.1.0 to 1.4.0; their settings migrate by themselves (schema 2 → 3).

Dashboard: <https://chrome.google.com/webstore/devconsole>

## Step 1 — Upload the package (done on 21 Nov 2026)

On the item, **Package** → **Upload new package**:

```
build/focus-filter-for-youtube-1.4.0-chrome.zip
```

The draft then shows version 1.4.0 next to the published one. Uploading alone
publishes nothing: the draft only goes out after **Submit for review**.

## Step 2 — Store listing

| Field | What to enter |
| --- | --- |
| Name | comes from the manifest: `Focus Filter for YouTube` |
| Short description | comes from the manifest; `2-short-description.txt` if asked |
| Detailed description | paste `3-description.txt` |
| Category | **Well-being** (alternative: **Workflow & Planning**) |
| Language | English |
| Store icon | `store-icon-128.png` |
| Screenshots | `screenshot-1` to `screenshot-5` (Chrome takes at most 5) |
| Official URL | leave empty (it needs a verified domain) |
| Homepage URL | `https://github.com/ImarTheOne/focus-filter-for-youtube` |
| Support URL | `https://github.com/ImarTheOne/focus-filter-for-youtube/issues` |
| Mature content | No |

The screenshots show the real settings page and the real blocking and pause
screens, rendered by the extension's own code on the test harness
(`tests/serve.js`), so no YouTube page and no logo appears in them:

1. Category rules
2. A blocked video with "Watch anyway"
3. Never show me this and content rules
4. Strict mode
5. The breathing pause with the verse of the day
6. Blocked for good under the hard limit (spare; also fine for AMO)
7. API key, 18+ confirmation and free-tier notice (spare)

Promo tiles (440x280, 1400x560) are optional; skip them.

## Step 3 — Privacy tab

1. **Single purpose**: paste `4-single-purpose.txt`
2. **Permission justifications**: paste the matching block from
   `5-permission-justifications.txt` into each box (`storage`, host
   permissions), and answer **No** to the remote-code question
3. **Data usage**: tick what `6-data-disclosures.txt` says (Website content,
   Web history, Authentication information), then accept all three
   certifications
4. **Privacy policy URL**:
   `https://github.com/ImarTheOne/focus-filter-for-youtube/blob/main/PRIVACY.md`
   Push the latest commit first: the "Limited Use" section that Chrome's User
   Data Policy asks for is new in this release.

## Step 4 — Distribution

- **Visibility**: Public
- **Regions**: all
- **Pricing**: free

## Step 5 — Test instructions

Under **Access** → **Test instructions**, paste `7-reviewer-notes.txt` from
"WHAT IT DOES" down. Its "How to test without a key" part is the important one:
a reviewer can see the extension work through the local title-word rule
without a Gemini key.

## Step 6 — Submit for review

**Submit for review** (top right on the item once the draft is complete).
Leave "publish automatically after approval" on, unless you want to time it.

Review usually takes one to a few days for an item with host permissions on
youtube.com.

## After it goes live

- Make sure the README links the Chrome Web Store listing next to the AMO link.
- Bump `"version"` in **both** `manifest.json` and `manifest.chrome.json`
  before every future upload. Both stores reject a version they already
  accepted; `build.sh` warns when the two drift apart.
- Your own Chrome can switch from the unpacked `build/chrome` to the store
  version, so it updates by itself.
