# Publishing 1.3.0 as an update — Firefox

The add-on is already listed, so this is a new version, not a new submission.

1. Open <https://addons.mozilla.org/developers/addon/focus-filter-for-youtube/versions/submit/>
   and sign in.
2. Keep **On this site**. Upload `build/focus-filter-for-youtube-1.3.0-firefox.zip`.
   It lints with 0 errors, 0 warnings and 0 notices.
3. Source code: answer **No**. Nothing is minified or generated.
4. Paste the two blocks below, then submit.
5. On the listing itself (**Edit Product Page**), replace the description with
   `3-description.txt` and the privacy policy with `5-privacy-policy.txt`. Both
   changed: the never list is sent to Google like the other rules, and the
   description of an opened video is sent up to 1,500 characters instead of 600.

Once Mozilla approves it, Firefox updates the installed add-on by itself.

## Release notes (shown to users)

```
New: "Never show me this" - a zero-tolerance list. A video that contains any of it is blocked, even when the rest is exactly what you want.
New: a pause before every video, 5 to 60 seconds, behind a guided breathing exercise with no skip button. Optional Bible verse of the day.
New: Insane mode - every video is checked before it plays, with no way around it.
Changed: channel lists and blocked title words now match whole words. "ai" no longer blocks "maintain". End a word with * to cover its endings (react* also finds "reaction"). If an entry of yours relied on matching part of a word, add a *.
Changed: channels can be listed by @handle or link, and the lists work without an API key.
Changed: content rules are judged more carefully, and more of a video's description is checked.
Fixed: a blocked video could play for a fraction of a second before it was held.
```

## Notes for the reviewer

```
Changes since 1.1.0. No new permissions and no new endpoint: the only host contacted is still https://generativelanguage.googleapis.com, with the user's own API key.

Data sent: unchanged in kind. Two differences in amount, both disclosed in the updated privacy policy and listing: (1) the description of a video the user opens is sent up to its first 1,500 characters (was 600); (2) the user's new "Never show me this" list is sent with each check, like their goals text and content rules.

New local-only features, which send nothing: the pause before a video (content.js, showBreathing/breathFrame) and the verse of the day. The verses are a static list in verses.js (World English Bible, British Edition, public domain) read by the background script; nothing is fetched.

Channel lists and blocked title words are matched in the background script before any request (localVerdict in background.js) and now work without an API key.

To test without a key: on the settings page tick "Hold every video behind a breathing exercise first", add a word from a video's title under "Always block titles containing", save, and open that video.

No build step, no minification, no remote code.
```
