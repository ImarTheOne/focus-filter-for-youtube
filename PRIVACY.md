# Privacy Policy — Focus Filter for YouTube

_Last updated: 21 November 2026_

This add-on is designed so that as little as possible leaves your browser. The
developer operates no server and receives no data from you of any kind.

## Who is responsible

Focus Filter for YouTube is an independent open-source project developed by a
private individual in **Switzerland**. Contact: <kontoonlyne@gmail.com>

Because the add-on has no backend, the developer never receives, stores or
processes your personal data. The only outbound request the add-on makes goes
from **your** browser to **Google**, authenticated with **your own** API key —
that is a relationship directly between you and Google, under Google's terms.

## You must be 18 or older

Google's [Gemini API terms](https://ai.google.dev/gemini-api/terms) require every
API user to be **18 years of age or older**, and prohibit using the API as part of
a service directed towards, or likely to be accessed by, individuals under 18.

By supplying a key and using this add-on you confirm you are 18 or older. **This
add-on is not a parental control**, must not be marketed or configured as one,
and must not be set up on a child's behalf.

## What is sent, and to whom

When you open a YouTube video, the add-on sends **the video's details** to the
Google Gemini API (`generativelanguage.googleapis.com`) so the model can judge
it against your rules. The details are the video's **title, channel name,
description (up to the first 1,500 characters), tags, YouTube category and length**, all
read from the page you opened. Your goals text and your two lists of rules
(what you never want to see, and your content rules) are sent with them,
because they are the question the model is answering. The request is
authenticated with **your own Google AI Studio API key**, which you supply.

### If you let Gemini watch videos

The settings page offers three levels of checking. **Standard** sends only the
details above. **Smart**, the default, and **Thorough** may also send the
**video's public link** (`https://www.youtube.com/watch?v=…`). Google then
fetches that video from YouTube itself and processes its pictures and sound to
judge what is actually in it. The add-on never downloads, records or uploads
the video. It hands Google a link, and Google does the fetching. Only public
videos can be watched this way.

Google's servers make that request to YouTube, not the add-on, and it is
covered by Google's terms, not by anything the developer controls.

### If you filter the feed

Feed filtering is off by default. It is on when you tick a page under **Also
filter the feed** (home page, sidebar, search results, subscriptions, Shorts),
or tick **Also remove those videos from the YouTube home page** under the hard
limit. Then, for each video tile on that page, the add-on sends its **title,
channel name, length, the line showing its views and age, and whether it is a
Short**, up to 15 tiles per request, so the model can judge it before you click
it. No description, tags or link are sent for a tile.

These are the only network requests the add-on makes. There is no analytics, no
telemetry, no error reporting and no server operated by the developer. Your data
is never sent to the developer, because there is nowhere for it to be sent.

### Important: what Google does with it on a free key

Google's terms distinguish sharply between unpaid and paid use:

- **Unpaid (free) API keys** — Google states that it uses the content you submit
  to "provide, improve, and develop Google products", and that **human reviewers
  may read, annotate and process your API input and output**.
- **Paid API keys** — Google states that it does **not** use your prompts or the
  responses to improve its products, and logs data only to detect abuse.

What is submitted is the details of a video you chose to open, and in Smart or
Thorough mode possibly its link, plus your goals and your rules. With feed
filtering on, it is also the titles and channels of the videos on the pages you
picked. On a free key
you should assume that information is retained by Google and may be read by a
person. If that matters to you, use a paid key, or restrict the add-on
to the channel and title-word lists, which never leave your browser.

The developer has no influence over any of this and no visibility into it.
Google's handling is governed solely by Google's own terms:
<https://ai.google.dev/gemini-api/terms>

## What is never sent

- Your browsing history as such — no list of pages you have visited is ever
  compiled, read or transmitted. What *is* sent is the details of a video at
  the moment you open it, and with feed filtering on the tiles of the pages
  you picked, as described above
- Your Google, YouTube or any other account details
- Cookies, watch history, or anything identifying you
- The video itself — the add-on never downloads, captures or uploads video or
  audio. (In Smart or Thorough mode Google fetches a public video from YouTube
  by its link; see above.)
- Page contents beyond the details listed above

Choose **Standard** on the settings page if you never want a video's link sent.

Videos decided by your channel lists or your blocked title words are matched
inside your browser and are **never sent anywhere at all**. The pause before a
video and the Bible verse of the day send nothing either: the verses ship with
the add-on.

## What is stored, and where

Everything is stored locally in your browser profile using the WebExtension
storage API. Only your API key ever leaves the browser, and only to Google:

- **Your API key.** Stored locally. It is sent to Google with each request, as
  the `x-goog-api-key` header — that is what authenticates *your* request against
  *your* Google account. It is never sent anywhere else, and never to the
  developer.
- Your settings (category rules, both lists of rules, redirect address, channel
  and title-word lists, goals text)
- A cache of previous verdicts (video ID, category, score, a short reason and,
  for watched videos, a one-paragraph summary of what is in them), kept for 30
  days by default and capped at 5,000 entries
- In Strict mode with a daily limit, how many times you used "Watch anyway"
  today: a count and the date, nothing about which videos

Removing the add-on deletes all of it. You can clear the cache at any time from
the settings page.

## How this maps to the Chrome Web Store disclosures

The Chrome Web Store makes every extension declare data categories from a fixed
list. Its categories are broad, so here is precisely what each one means here:

| Declared | What it actually is |
| --- | --- |
| **Website content** | The title, channel name, description, tags, YouTube category and length of a video you open, read from the page and sent to Google for judging. With feed filtering on, the title, channel, length and views line of the video tiles on the pages you picked. Nothing else on the page is read. |
| **Web history** | Chrome's definition of this category includes "page title" and URLs. The title of a video you open is sent, and in Smart or Thorough mode its link. No list of visited pages is built, stored or transmitted. |
| **Authentication information** | Your own Google AI Studio API key, which you paste in yourself. Stored locally; sent only to Google, to authenticate your own request. Never sent to the developer. |

Nothing else is declared, and nothing else is collected: no personally
identifiable information, no health or financial data, no personal
communications, no location, and no user-activity tracking of any kind.

## Permissions and why they are needed

| Permission | Why |
| --- | --- |
| `*://*.youtube.com/*` | To read the details of a video you open and to block or redirect it. |
| `https://generativelanguage.googleapis.com/*` | To send those details, and optionally the video's link, to Google's Gemini API for judging. |
| `storage` | To save your key, settings and verdict cache locally. |

## Your rights

### Switzerland (FADP / DSG)

The revised Swiss Federal Act on Data Protection (FADP), in force since
1 September 2023, gives you a right of access to personal data held about you.
The developer holds **none** — there is no server, no database and no account
system, so there is nothing to disclose, correct or delete beyond the data
sitting in your own browser profile, which you control and can erase by removing
the add-on.

For the data you send to Google under your own API key, Google is the
responsible party. Exercise those rights through your Google account.

### EU / EEA and UK (GDPR)

The same applies. The developer is not a controller or processor of your personal
data, because none is received. Google acts as controller for the API requests
your key authenticates.

## Changes

Material changes to this policy will be accompanied by a version bump and noted
in the add-on's release notes.

## Contact

Questions about this policy: <kontoonlyne@gmail.com>

---

YouTube™ and Gemini™ are trademarks of Google LLC. This add-on is an independent
project and is not affiliated with, sponsored by or endorsed by Google LLC.
