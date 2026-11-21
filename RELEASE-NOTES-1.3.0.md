# Focus Filter for YouTube 1.3.0

Version 1.3.0 reworks the filter: a zero-tolerance list, channel and title lists that match the way you expect, and a longer, clearer pause before every video. It also includes Insane mode, which was added after 1.2.0.

## New

- **Never show me this (zero tolerance).** List what you never want to see, one thing per line. A video that contains any of it is blocked completely, even when it is only a small part and the rest is exactly what you want. It beats category rules and the score. When Gemini watches the video, one occurrence is enough, and the blocking screen says what it was and roughly when. The settings page tells you how much Gemini gets to see with your current settings. For full cover choose **Thorough** and **the whole video**.
- **Pause before every video.** The old five-second breath is now a pause of 5 to 60 seconds, 25 by default. It comes before every video, also one that was checked before and is fine. If the video is blocked, you learn that after the pause. The seconds only count while you are looking at the tab, and a check that hangs no longer cuts the pause short.
- **A clearer breathing exercise.** The screen now says "Breathe in" and "Breathe out" in large letters, in step with the circle, and shows which breath you are on and how many seconds are left. It fits small players and Shorts.
- **Bible verse of the day.** An option in the pause card puts a verse on the breathing screen. It changes at midnight. The verses, over 500 of them, ship with the extension (World English Bible, public domain), so nothing is fetched.
- **Insane mode.** Gemini watches every video before it plays, with no skip, no "Watch anyway" and no always-allowed channels. A video that cannot be checked stays blocked.

## Changed

- **Channel lists and title words match whole words.** They used to match any part of a name, so "ai" blocked "maintain" and "Vox" allowed "Voxel". Now `Vox` finds "Vox" and "Vox Media" only. End a word with `*` to cover its endings: `react*` also finds "reacts" and "reaction". **If an entry of yours relied on matching part of a word, add a `*`.**
- **Channels can be listed by @handle or link.** A handle, a channel link or a channel ID means exactly that one channel. Names still work.
- **Accents, case and doubled spaces are ignored**, and title words are also checked against the translated title YouTube may show you.
- **The lists work without an API key.** Before, nothing was checked until a key was saved.
- **One entry per line.** A comma no longer splits an entry, so "Crosby, Stills & Nash" stays one channel.
- **Content rules are judged more carefully.** A rule can be a full sentence or just a topic, the model goes through the rules one by one, and a rule matches when it fits the video as a whole or a substantial part of it. A passing mention belongs in the never list.
- **More of the description is sent for a video you open:** up to 1,500 characters instead of 600. Sponsors and topics are often named further down.
- The settings page says so when Insane mode is ignoring your always-allowed channels.

## Fixed

- **A held video could play for a fraction of a second.** The video is now stopped the moment it starts, not up to a third of a second later.

## Upgrading

Existing settings are kept. If the breath before a video was on, it is now 25 seconds long; pick 5 seconds under **Pause before every video** to get the old length back. The never list, like your goals and content rules, is sent to Google with each check. Nothing else about what is sent has changed, apart from the longer description.
