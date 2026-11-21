# Focus Filter for YouTube 1.1.0

Version 1.1.0 can now judge a video by what is actually in it, not only by its title.

## New

- **Gemini can watch the video.** Pick how closely a video is checked:
  - **Standard** judges it from the title, channel, description and tags.
  - **Smart** (default) starts from those details. It has Gemini watch the video when they don't make clear what's in it, or when the score is close to your threshold.
  - **Thorough** has Gemini watch every video you open.
- **Watch settings.** Choose how much of each video Gemini watches (3, 5, 10, 20 or 45 minutes, or the whole video). Choose whether the video stays paused during the check or plays and is stopped if blocked.
- **Content rules.** Describe in plain words what you never want to see, one rule per line (for example "is mostly a sponsor read" or "spoils the ending of a film"). Any match blocks the video, whatever its category or score.
- **Richer video details.** Judging now uses the description, tags and YouTube's own category, in addition to title and channel.
- **Clearer block screen.** It shows what blocked the video (your rule, the category or the score), a short summary when Gemini watched it, and a pulsing title while a check is running.
- **"Watched" counter** in the popup.

## Improved

- **Fewer wrong verdicts.** Details are now read for the exact video you opened. Before, the previous video's title could linger for a moment after in-app navigation and get judged instead.
- **Cache follows your wording.** If you rewrite your goals or content rules, videos are re-judged instead of answered from the old question. Earlier verdicts are kept, so changing the text back costs nothing.
- Changing category rules or the threshold still re-decides the feed without any new API calls.

## Good to know

- In Smart and Thorough mode, Gemini receives the **video's public link** and Google fetches and processes it. The extension never downloads the video. Standard mode sends only the details text.
- Only public videos can be watched. Unlisted videos and live streams fall back to judging by their details.
- A free Google key covers about 8 hours of YouTube video a day, so a shorter watch limit lets you check more videos. Each verdict is cached, so a video is watched only once.
- The settings page and privacy text now describe this. Check `PRIVACY.md` and the store privacy policy still match before you submit.

## Upgrading

Existing settings are kept. New installs and upgraded installs use Smart mode. Switch to Standard in the settings if you want the old title-only behaviour.
