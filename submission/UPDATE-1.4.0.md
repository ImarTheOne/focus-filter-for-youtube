# Publishing 1.4.0 as an update — Firefox

The add-on is already listed (1.3.0 is live), so this is a new version, not a new submission.

1. Open <https://addons.mozilla.org/developers/addon/focus-filter-for-youtube/versions/submit/>
   and sign in.
2. Keep **On this site**. Upload `build/focus-filter-for-youtube-1.4.0-firefox.zip`.
3. Source code: answer **No**. Nothing is minified or generated.
4. Paste the two blocks below, then submit.
5. On the listing itself (**Edit Product Page**), replace the description with
   `3-description.txt` and the privacy policy with `5-privacy-policy.txt`. Both
   changed: they mention Strict mode, now say what feed filtering sends, and list the local "Watch anyway" counter.

Once Mozilla approves it, Firefox updates the installed add-on by itself.

## Release notes (shown to users)

```
New: Strict mode - one switch for everything that takes a way out away, as strict as you want it. Off by default; your normal setup is unchanged.
New in Strict mode: a hard limit - under it a video is blocked with no "Watch anyway" and disappears from your home page. Between it and your threshold you can still choose to watch.
New in Strict mode: "Watch anyway" only a set number of times a day (0 = never). The button shows how many are left; they come back at midnight.
New in Strict mode: making it less strict - including switching it or filtering off - waits for a delay you choose (1 day by default, up to a week). Making it stricter works at once.
Changed: "Never show me this" no longer offers "Watch anyway". Zero tolerance means zero.
Changed: saving settings reloads your open YouTube tabs, so a video already playing is checked against the new settings too.
Changed: Insane mode now lives in Strict mode and works as before. If it was on, Strict mode is on after the update and nothing else changes.
Changed: the privacy policy now spells out what feed filtering sends for each video tile.
```

## Notes for the reviewer

```
Changes since 1.3.0. No new permissions and no new endpoint: the only host contacted is still https://generativelanguage.googleapis.com, with the user's own API key.

New optional "Strict mode" (off by default). applyStrict() in common.js keeps its settings stored but inert while it is off. It holds:
- a hard limit on the score: decide() in background.js marks a verdict under it as hard, and content.js shows the blocking screen without the "Watch anyway" button;
- a daily limit on "Watch anyway": the background script keeps a local count (key "anyway": a day number and a count, nothing about videos) and hands it out one at a time;
- the existing Insane mode, moved here. migrate() (schema 3) turns Strict mode on for users who had Insane mode on, so their behaviour is unchanged;
- a user-chosen delay for loosening changes: holdBack() in common.js, called from saveSettings(), keeps such a change in the stored settings under strictPending until its time; it is applied when settings are next read. Nothing is sent anywhere.

Also changed: a video blocked by the user's "Never show me this" list no longer offers "Watch anyway" (decide() marks it hard). And when the user saves settings, each YouTube tab's content script reloads its own tab (storage.onChanged in content.js, location.reload()); no tabs permission is used.

The optional "remove those videos from the YouTube home page" reuses the existing, opt-in feed-filtering path (scan() in content.js, classify() in background.js): home-page tiles are judged and only those under the hard limit are hidden. Data sent per tile is unchanged from earlier versions' feed filtering - title, channel name, length, views/age line and a Short flag. The privacy policy now spells this out; it previously described only what is sent for an opened video.

To test without a key: the hard limit needs a Gemini score, so it cannot be seen without a key. The daily limit can: tick Strict mode, set "Allow Watch anyway only 1 time a day", add a word from a video's title under "Always block titles containing", save, and open that video twice.

No build step, no minification, no remote code.
```
