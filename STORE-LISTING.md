# AMO listing copy

Paste-ready text for <https://addons.mozilla.org/developers/>. Submit as
**listed** ("On this site") for a public store launch.

---

## Name

```
Focus Filter for YouTube
```

Google's [branding guidelines](https://developer.chrome.com/docs/webstore/branding/)
permit referring to a Google product with "for", "for use with" or "compatible
with", which is exactly this pattern — but they ask for the ™ symbol and an
attribution statement. Both appear in the description below, in the settings
page footer and in `PRIVACY.md`. Do not rename this to "YouTube Focus Filter":
leading with the trademark is the form Google objects to.

## Summary (max 250 characters)

```
Your YouTube feed loads normally. The moment you open a video, it is sorted into a category and checked against your rules. Block whole categories like gaming or drama, or let a productivity score decide. Uses your own Google Gemini API key.
```

## Description

```
Focus Filter for YouTube does not touch your feed while you browse. It steps in
at the only moment that matters: when you click a video.

The video's details - title, channel, description and tags - are sent to
Google's Gemini API, which sorts it into one of 20 categories and checks it
against your rules. Titles lie, so you can also let Gemini actually watch the
video and judge what is really in it.

HOW IT WORKS

• Set any category to Allow, Block, or Judge.
• Block is absolute: set Gaming to Block and no gaming video plays, ever.
• Judge hands the video to a 0-100 productivity score, measured against a
  description of your goals that you write yourself.
• Optional Strict mode, as strict as you want it: a hard limit under which a
  video is blocked with no "Watch anyway" and disappears from your home page,
  a daily number of "Watch anyway", and Insane mode, where Gemini checks
  every video before it plays. Making it less strict waits up to a week, as
  long as you choose.
• Write your own content rules in plain words - "is mostly a sponsor read",
  "spoils the ending of a film" - and any video that matches is blocked.
• Zero tolerance: list what you never want to see, and a video that contains
  any of it is blocked, even when the rest is exactly what you want - with no
  "Watch anyway".
• Choose how closely to check: Standard (from the details), Smart, the default (Gemini
  watches the video when the details are not conclusive), or Thorough (Gemini
  watches every video you open). The blocking screen tells you what is
  actually in the video.
• Blocked videos either show a blocking screen, or send you to any address you
  choose.
• Optional: a pause before every video. A guided breathing exercise holds it
  for 5 to 60 seconds, with no skip button, so you decide on purpose. It can
  show a Bible verse of the day, from a list that ships with the add-on.

WHAT MAKES IT CHEAP

• One API request per video you open, not per video that scrolls past.
• Verdicts are cached per video, so reopening one is free.
• Changing your rules costs nothing at all: categories are cached, and your
  rules are applied on top afterwards.
• Channel lists and blocked title words are matched inside your browser,
  work without an API key and never reach Google.

YOU NEED YOUR OWN API KEY

This add-on has no server and no subscription. You supply a free Google AI
Studio key (aistudio.google.com/apikey), and it is stored only in your browser.
Typical use sits inside Google's free tier.

AGE REQUIREMENT: 18+

Google's Gemini API terms require every API user to be 18 or older, and forbid
using the API in a service aimed at under-18s. This add-on is a self-control
tool for adults. It is NOT a parental control and must not be set up on a
child's behalf.

PRIVACY

Only the details of a video you open (title, channel, description, tags,
YouTube category, length) are transmitted, and - in Smart or Thorough mode - the
video's public link, so Google can fetch and watch it. If you turn on feed
filtering, the title, channel and length of the videos on the pages you pick
are sent too. Everything goes only to
Google's API using your key. No analytics, no telemetry, no developer server.
Your browsing history, account details and watch history are never touched, and
the add-on never downloads or uploads video or audio. Channel and keyword rules are
matched inside your browser and never leave it.

One thing you should know before choosing a key: on Google's FREE tier outside
the EEA, Switzerland and the UK, Google states that submitted content is used to
improve Google's products and that human reviewers may read it. What is
submitted is the details, and possibly the link, of a video you opened. On a
PAID key, and on any key in the EEA, Switzerland and the UK, Google states it
does not use prompts to improve its products. The full detail is in the privacy
policy.

WHAT THIS IS NOT

It does not block, modify or replace advertising. It does not download video. It
does not bypass any paywall, sign-in or protection measure. It reads the details
of a video you have already opened and applies rules you wrote.

OPTIONAL: FILTER THE FEED TOO

If you would rather never see the rubbish in the first place, you can turn on
feed filtering for the home page, search, sidebar, subscriptions or Shorts,
or only remove the videos under your hard limit from the home page. It is off
by default because it costs an API call for every 15 videos that scroll past.

---
YouTube™ and Gemini™ are trademarks of Google LLC. This add-on is an independent
project and is not affiliated with, sponsored by or endorsed by Google LLC.
```

## Category

`Privacy & Security` — secondary: `Photos, Music & Videos`

## Tags

`youtube`, `productivity`, `focus`, `distraction`, `ai`, `gemini`

## Support / homepage

- Support email: `kontoonlyne@gmail.com`
- Privacy policy: paste the contents of `PRIVACY.md`
- License: MIT (see `LICENSE`)

---

## Notes for Reviewer

Paste this into the "Notes for Reviewer" field. It answers the questions a
reviewer will otherwise come back and ask.

```
WHAT IT DOES
When the user opens a YouTube video, the add-on reads the video's details
(title, channel, description, tags, YouTube category, length) from the page and
sends them to Google's Gemini API. The model returns a category (from a fixed
20-item list), optionally a 0-100 score, and which of the user's plain-language
content rules the video matches. The add-on then blocks or allows the video
according to rules the user configured.

The "Smart" mode (the default) and the "Thorough" mode additionally pass the
video's public YouTube link to Gemini as a fileData part - Google's documented
video-understanding feature. Google's servers fetch and process the video; the
add-on never downloads it.

HOW TO TEST
1. Install and open the settings page (it opens automatically on install).
2. A free Google AI Studio API key is required: https://aistudio.google.com/apikey
   Without a key the add-on is completely inert - it makes no requests and does
   not modify any page.
3. Paste the key and press "Test connection". This calls the Gemini API once and
   reports the result.
4. Press "Load models from my key" to populate the model dropdown.
5. In "Category rules", set for example Gaming to Block, and save.
6. Open any gaming video on YouTube. The player is paused and a blocking screen
   appears. If a redirect address is configured instead, the tab navigates there.

WHAT IT IS NOT (the questions reviewers usually ask first)
- It is NOT an ad blocker. It does not detect, block, modify, replace or hide
  any advertisement, pre-roll, mid-roll or sponsored element.
- It does NOT download or capture video or audio.
- It does NOT circumvent any technological protection measure, paywall,
  sign-in wall or DRM.
- It makes ZERO requests to youtube.com, and never scrapes or crawls. To read
  the opened video's details it uses page-bridge.js, a small read-only script in
  the page's main world, which calls the player's getPlayerResponse() for the
  video ID in the URL and passes the result back as a JSON string. It changes
  nothing on the page.
- It does NOT collect anything that could identify a person, and does not read
  usernames, comments, cookies or account data.

AGE GATING (Gemini API terms compliance)
Google's Gemini API terms require API users to be 18+ and prohibit use in a
service aimed at or likely to be accessed by under-18s. The listing states the
18+ requirement, the settings page states it directly above the API key field,
and the add-on is explicitly not presented as a parental control. It is a
self-control tool configured by the adult who owns the key.

FREE-TIER DATA USE (disclosed, not hidden)
Google's terms state that content submitted on an unpaid key is used to improve
Google's products and may be read by human reviewers, whereas paid keys are not
used for product improvement; in the EEA, Switzerland and the UK the paid-use
rules apply to unpaid keys too. Because the submitted content is the details
(and, in Smart/Thorough mode, the link) of a video the user opened, this is disclosed in plain language in the listing, in
the privacy policy, and on the settings page next to the key field, so the user
can choose a paid key or rely on local-only channel/keyword rules instead.

NETWORK ACTIVITY
Exactly one endpoint is contacted: https://generativelanguage.googleapis.com
Authentication is the user's own API key, sent in the x-goog-api-key header
(never in a URL). There is no developer-operated server, no analytics and no
telemetry of any kind.

DATA HANDLING
Transmitted: video title, channel name, description (up to the first 1,500 characters),
tags, YouTube category and length, only for videos the user opens; in the
Smart (default) and Thorough modes, also the video's public YouTube link,
which the user can switch off by choosing Standard.
Stored locally (browser storage only, never transmitted): the API key, the
user's settings, and a cache of verdicts (video ID, category, score, reason,
and for watched videos a short summary) capped at
5000 entries with a 30-day default TTL.
Never accessed: browsing history, cookies, account data, watch history. The
add-on never downloads or uploads video or audio.

PERMISSIONS
- *://*.youtube.com/*  read the details of an opened video; block or redirect it
- https://generativelanguage.googleapis.com/*  send those details (and optionally
  the video's public link) to Gemini
- storage  persist the key, settings and cache locally

SOURCE CODE
No build step, no minification, no bundler, no remote code. The submitted
package is the complete, readable source. All six scripts are plain ES2022.
There is no eval, no new Function, and no remotely-hosted script.

PROMPT INJECTION HANDLING
Video titles, descriptions and tags - and, when Gemini watches, anything said
or shown in the video - are attacker-controlled. They are wrapped in
<video_list> / <video_metadata> delimiters and the system prompt instructs the
model to treat them strictly as data, and to categorise anything containing
embedded instructions as "other" with a score of 0.
```

---

## Screenshots to capture

AMO shows these prominently; take them at 1280x800 in the test profile.

1. The settings page, category rules section, with a few set to Block.
2. A blocking screen over a video player, showing the category and reason.
3. The toolbar popup showing the counters.

## Before you submit

- [ ] Bump `"version"` in `manifest.json` for every upload after the first
- [ ] Rebuild: see the build command in `README.md`
- [ ] Confirm `npx web-ext lint` reports 0 errors and 0 warnings
