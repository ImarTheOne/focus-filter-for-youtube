# Focus Filter for YouTube 1.4.0

Version 1.4.0 adds **Strict mode**: one switch that holds everything that takes a way out away, from a little to completely. The normal setup stays short; whoever wants it strict can set it as strict as they like.

## New

- **Strict mode.** A new card on the settings page. Switched off, its settings are kept but do nothing. Switched on for the first time, it starts at a hard limit of 25 and three "Watch anyway" a day.
- **Hard limit.** A second, lower line on the score. With the threshold at 50 and the hard limit at 25, a video scoring 0 to 24 is blocked for good: the screen only offers **Back to YouTube home** and **Take me back**, and the video stays paused. A video scoring 25 to 49 is blocked with "You shouldn't watch this, but it's not bad" and keeps its **Watch anyway** button. 50 and up plays. A coloured bar shows the three zones. The hard limit can never sit above the threshold.
- **Hard-blocked videos vanish from the home page.** **Also remove those videos from the YouTube home page** (ticked by default) judges the home page as it loads and hides only the videos under the hard limit. Everything else stays. This costs one API call per 15 home-page videos.
- **A delay before Strict mode gets less strict.** While it is on, a change that loosens it waits: no delay, 1 hour, 1 day (the default), 3 days or a week, your choice. That covers switching Strict mode or filtering off (also with the popup's switch), a lower hard limit, more "Watch anyway", Insane mode or the home page option off, a shorter delay and a different API key. A new change restarts the wait. Making it stricter works at once. The settings page and the popup show what waits and until when, and **Cancel, stay strict** takes it back.
- **"Watch anyway" a limited number of times a day.** Pick any number, 0 for never, or no limit. The button says how many are left today, the count is shared by all tabs, and it starts again at midnight. Once they are used up, a blocked video only offers the way back. The toolbar popup shows what is left.

## Changed

- **"Never show me this" has no "Watch anyway" any more.** Zero tolerance means zero: a video that contains something from the list only offers **Back to YouTube home** and **Take me back**, in every mode.
- **Insane mode moved into Strict mode.** It works as before.
- **Saving reloads your open YouTube tabs.** Before, a video that was already playing was never checked against new settings. Now every open YouTube tab reloads itself when you save or use the popup's switch, and the settings page and popup say so beforehand. A refreshed model list or a Strict mode change that is only waiting does not reload anything.
- **Smart mode looks closer near the hard limit.** A score within 12 points of the hard limit now makes Gemini watch the video, because that block cannot be overridden.
- **The privacy policy now says what feed filtering sends:** the title, channel name, length, views line and Short flag of each video tile on the pages you picked. Earlier versions sent the same when feed filtering was on, but the policy did not spell it out. It also lists the new local "Watch anyway" counter.

## Upgrading

If Insane mode was on, Strict mode is on after the update, with the hard limit off, no daily limit and no delay, so nothing changes that you did not choose. Everyone else: nothing changes until you switch Strict mode on, except that the never list no longer offers "Watch anyway". The hard limit applies to the score; category and content-rule blocks keep "Watch anyway" (within your daily limit).
