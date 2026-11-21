# Focus Filter for YouTube 1.2.0

Version 1.2.0 adds a moment to breathe before a video, and fixes several bugs.

## New

- **Take a breath first.** A new setting holds every video and Short for five seconds behind a breathing circle: "Breathe. Take one deep breath." There is no skip button, only "Take me back". It runs alongside the check, so the verdict usually arrives during the breath. It needs no API key and sends nothing.
- **No skipping while Gemini watches.** If you chose to keep the video paused during the check, the "Skip the check" button is gone. The same breathing screen shows instead. If Google takes longer than about three minutes, the video is released anyway.

## Fixed

- **Shorts after a normal video.** YouTube keeps the hidden watch player in the page after you move from a video to Shorts. The extension paused that hidden player and put its screens there, so the Short kept playing with sound. It now uses the player you are looking at, and pauses every video while it decides.
- **Blocked videos could be played with the keyboard.** After eight seconds the blocking screen stopped holding the video, so pressing Space or K played it behind the screen. A blocked video now stays paused for as long as it is open. "Watch anyway" also starts it for you now.
- **Settings page interrupting YouTube tabs.** Loading the model list saved the settings, which reset the feed and restarted the check in every open YouTube tab. That save is now ignored. A video that has already passed is no longer paused again when you change a setting.
- **Lost counter updates.** Two requests finishing at once could each overwrite the other's count. Updates now run one after another, and "Reset counters" waits for them.
- **Double counting.** Opening the same video in two tabs while Gemini watched it counted the watch twice. It now counts once.
- The save message no longer tells you to reload YouTube tabs, which pick up changes by themselves.

## Upgrading

Existing settings are kept. The breathing pause is off until you turn it on under **Take a breath first**. Nothing about what is sent to Google has changed.
