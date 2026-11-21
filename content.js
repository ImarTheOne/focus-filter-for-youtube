/* Finds video tiles on YouTube, hides them until the model has judged them,
   then either releases or blocks them. Also gates the watch page. */

const CONTAINERS = [
  "ytd-rich-item-renderer",
  "ytd-video-renderer",
  "ytd-compact-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-reel-item-renderer",
  "ytm-shorts-lockup-view-model",
  "ytm-shorts-lockup-view-model-v2",
  "yt-lockup-view-model"
].join(",");

const DEBOUNCE_MS = 350;
const PENDING_WATCHDOG_MS = 15000; // fail open if a verdict never arrives

let settings = null;
let active = false; // enabled AND an API key is present
const verdicts = new Map(); // videoId -> decided verdict from the background
const revealed = new Set(); // videoIds free to watch on this page: you chose to, or the gate let them through
const unjudged = new Set(); // videoIds we could not classify — allowed, not retried
const pendingSince = new Map(); // element -> timestamp
let queued = new Map(); // videoId -> record
let flushTimer = null;
let scanTimer = null;
let watchToken = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------ extraction --- */

function videoIdFrom(href) {
  if (!href) return null;
  try {
    const url = new URL(href, location.origin);
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const short = url.pathname.match(/^\/shorts\/([\w-]{6,})/);
    if (short) return short[1];
  } catch {
    /* ignore malformed hrefs */
  }
  return null;
}

function text(el, selector) {
  return el.querySelector(selector)?.textContent?.trim() || "";
}

function videoLink(el) {
  return el.querySelector('a[href*="/watch?v="], a[href*="/shorts/"]');
}

/* Returns null when the tile exists but YouTube has not filled in its title yet. */
function extract(el, link, id) {
  let title =
    text(el, "#video-title") ||
    text(el, ".yt-lockup-metadata-view-model__title") ||
    text(el, "h3 a") ||
    text(el, "h3");

  if (!title) {
    // Lockup cards often only carry the title in the link's accessible name.
    title = (link.getAttribute("title") || link.getAttribute("aria-label") || "").trim();
  }
  if (!title) return null;

  const channel =
    text(el, "ytd-channel-name #text") ||
    text(el, "#channel-name #text") ||
    text(el, "ytd-channel-name a") ||
    text(el, ".yt-content-metadata-view-model__metadata-row a") ||
    text(el, ".ytd-channel-name");

  const duration =
    text(el, "ytd-thumbnail-overlay-time-status-renderer #text") ||
    text(el, "badge-shape .badge-shape-wiz__text") ||
    text(el, ".badge-shape-wiz__text");

  const metaNode =
    el.querySelector("#metadata-line") ||
    el.querySelector(".yt-content-metadata-view-model__metadata-row:last-of-type");
  const meta = metaNode?.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || "";

  const isShort = /\/shorts\//.test(link.getAttribute("href")) || /shorts|reel/i.test(el.tagName);
  // "@name", so a channel listed by its handle is recognised in the feed too.
  const handle = el.querySelector('a[href^="/@"]')?.getAttribute("href").match(/@[^/?#]+/)?.[0] || "";

  return { id, title: title.slice(0, 300), channel: channel.slice(0, 100), handle, duration, meta, isShort };
}

/* --------------------------------------------------------------- surface --- */

function pageSurface() {
  const path = location.pathname;
  if (path === "/" || path.startsWith("/feed/trending") || path.startsWith("/feed/explore")) {
    return "home";
  }
  if (path.startsWith("/results")) return "search";
  if (path.startsWith("/watch")) return "related";
  if (path.startsWith("/feed/subscriptions")) return "subscriptions";
  if (path.startsWith("/shorts")) return "shorts";
  return null;
}

/* How a tile is filtered here: "all" removes every blocked video, "hard" only
   the ones under your hard limit (the home page, when you asked for that),
   and null leaves the tile alone. */
function filterMode(record) {
  const surface = pageSurface();
  const on = record.isShort ? settings.surfaces.shorts : surface && settings.surfaces[surface];
  if (on === true) return "all";
  return surface === "home" && settings.hardHome && hardLimit(settings) > 0 ? "hard" : null;
}

/* ---------------------------------------------------------------- render --- */

function markPending(el) {
  if (!el.classList.contains("yff-pending")) {
    el.classList.add("yff-pending");
    pendingSince.set(el, Date.now());
  }
}

function release(el) {
  el.classList.remove("yff-pending", "yff-hidden", "yff-card-host");
  el.querySelector(":scope > .yff-card")?.remove();
  pendingSince.delete(el);
}

function block(el, record, verdict) {
  el.classList.remove("yff-pending");
  pendingSince.delete(el);

  // Under the hard limit there is no "Show anyway", so there is no card either.
  if (settings.blockMode === "hide" || verdict.hard) {
    el.classList.add("yff-hidden");
    return;
  }

  el.classList.add("yff-card-host");
  if (el.querySelector(":scope > .yff-card")) return;

  const card = document.createElement("div");
  card.className = "yff-card";

  const head = document.createElement("div");
  head.className = "yff-card-head";
  head.append("Blocked");

  // Show what blocked it: the category, the score, or one of your rules.
  const badge = document.createElement("span");
  badge.className = "yff-card-score";
  badge.textContent =
    verdict.via === "category" ? categoryLabel(verdict.c)
      : verdict.via === "score" ? `${verdict.s}/100`
        : "Your rule";
  head.append(badge);

  const reason = document.createElement("div");
  reason.className = "yff-card-reason";
  reason.textContent = verdict.why;

  const title = document.createElement("div");
  title.className = "yff-card-title";
  title.textContent = record.title;

  const btn = document.createElement("button");
  btn.className = "yff-card-btn";
  btn.type = "button";
  btn.textContent = "Show anyway";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    revealed.add(record.id);
    release(el);
  });

  card.append(head, reason, title, btn);
  el.append(card);
}

function applyVerdict(el, record, mode) {
  const verdict = verdicts.get(record.id);
  if (verdict?.hard) block(el, record, verdict);
  else if (revealed.has(record.id) || unjudged.has(record.id)) release(el);
  else if (!verdict) return false;
  else if (verdict.blocked && mode === "all") block(el, record, verdict);
  else release(el);
  return true;
}

/* ----------------------------------------------------------------- scan --- */

function scan() {
  // With feed filtering off, the page is left completely alone: no tiles are
  // touched, nothing is queued, and nothing is sent anywhere until you click.
  if (!active || !filtersFeed(settings)) return;

  for (const el of document.querySelectorAll(CONTAINERS)) {
    // Lockup cards nest inside rich-item wrappers; only handle the outermost.
    if (el.parentElement?.closest(CONTAINERS)) continue;

    // Shelves, posts, ads and other non-video cards are left alone entirely.
    const link = videoLink(el);
    if (!link) continue;
    const id = videoIdFrom(link.getAttribute("href"));
    if (!id) continue;

    const record = extract(el, link, id);

    if (!record) {
      // Real tile, title not rendered yet: hide it so nothing flashes past.
      const isShort = /\/shorts\//.test(link.getAttribute("href"));
      if (filterMode({ isShort }) && !verdicts.has(id) && !unjudged.has(id) && !revealed.has(id)) {
        markPending(el);
      }
      continue;
    }

    // YouTube recycles these nodes while scrolling, so re-check identity.
    if (el.dataset.yffId && el.dataset.yffId !== record.id) release(el);
    el.dataset.yffId = record.id;

    const mode = filterMode(record);
    if (!mode) {
      release(el);
      continue;
    }

    if (applyVerdict(el, record, mode)) continue;

    markPending(el);
    if (!queued.has(record.id)) queued.set(record.id, record);
  }

  releaseStalePending();
  if (queued.size) scheduleFlush();
}

function releaseStalePending() {
  const now = Date.now();
  for (const [el, since] of pendingSince) {
    if (!el.isConnected) {
      pendingSince.delete(el);
      continue;
    }
    if (now - since > PENDING_WATCHDOG_MS) release(el);
  }
}

function scheduleScan() {
  if (scanTimer) return;
  scanTimer = setTimeout(() => {
    scanTimer = null;
    scan();
  }, 120);
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, DEBOUNCE_MS);
}

async function flush() {
  flushTimer = null;
  if (!queued.size) return;
  const items = [...queued.values()];
  queued = new Map();

  try {
    const res = await ext.runtime.sendMessage({ type: "classify", items });
    if (res?.ok && res.verdicts) {
      for (const [id, verdict] of Object.entries(res.verdicts)) verdicts.set(id, verdict);
    }
  } catch (err) {
    console.warn("[Focus Filter for YouTube] classify failed", err);
  } finally {
    // Fail open: anything the model did not judge is allowed through, and is
    // marked so the next scan does not queue it again in a loop.
    for (const item of items) {
      if (!verdicts.has(item.id)) unjudged.add(item.id);
    }
    scan();
  }
}

/* ------------------------------------------------------------ watch gate --- */

const HOLD_MS = 12000; // judging from the details: never hold longer than this
const WATCH_HOLD_MS = 200000; // while Gemini watches; matches the API timeout plus slack
const BREATH_MS = 10000; // one calm breath
const BREATH_IN = 0.4; // the share of a breath spent breathing in: 4 s in, 6 s out

/* Insane mode needs a key to check anything; options.js refuses to save it
   without one. */
const insane = () => active && settings.insane;

/* Stands in for a verdict when Insane mode could not get one: an unchecked
   video is treated as a blocked one. */
const UNCHECKED = {
  blocked: true,
  via: "unchecked",
  why: "Insane mode never lets a video through that it could not check. Reload the page to try again."
};

function currentWatchId() {
  const path = location.pathname;
  if (path.startsWith("/watch")) return new URLSearchParams(location.search).get("v");
  const short = path.match(/^\/shorts\/([\w-]{6,})/);
  return short ? short[1] : null;
}

/* The player you are looking at, chosen by page rather than by first match:
   after moving from a video to Shorts, YouTube keeps the watch player hidden
   in the page, ahead of the Shorts player. */
function player() {
  const id = location.pathname.startsWith("/shorts/") ? "#shorts-player" : "#movie_player";
  return document.querySelector(id) || document.querySelector(".html5-video-player");
}

function removeOverlay() {
  breathing = null; // also stops its frame loop
  document.querySelectorAll(".yff-overlay, .yff-toast").forEach((node) => node.remove());
}

/* Asks page-bridge.js (running in the page's own world) for the player's data
   on this exact video. Event dispatch is synchronous, so the answer has
   arrived by the time dispatchEvent returns. */
function askPage(id) {
  let answer = null;
  const onAnswer = (event) => {
    try {
      const parsed = JSON.parse(event.detail);
      if (parsed?.id === id && !parsed.missing) answer = parsed;
    } catch {
      /* not ours */
    }
  };
  document.addEventListener("yff:answer", onAnswer);
  document.dispatchEvent(new CustomEvent("yff:ask", { detail: id }));
  document.removeEventListener("yff:answer", onAnswer);
  return answer;
}

/* Fallback when the bridge cannot answer: the title on screen. Only trusted
   once the page says it is showing this video, since the previous video's
   title lingers for a moment after in-app navigation. */
function domMetadata(id) {
  const flexy = document.querySelector("ytd-watch-flexy");
  const flexyId = flexy?.getAttribute("video-id");
  if (location.pathname.startsWith("/watch") && flexyId && flexyId !== id) return null;

  const title =
    text(document, "h1.ytd-watch-metadata yt-formatted-string") ||
    text(document, "#title h1") ||
    text(document, "ytd-reel-video-renderer[is-active] h2") ||
    document.title.replace(/\s*-\s*YouTube\s*$/, "").trim();

  const channel =
    text(document, "ytd-video-owner-renderer #channel-name a") ||
    text(document, "#owner #channel-name a") ||
    text(document, "#upload-info #channel-name a");

  return title ? { title, channel } : null;
}

/* Everything we can learn about the opened video without asking anyone. */
async function watchRecord(id, isShort, stale) {
  for (let i = 0; i < 30 && !stale(); i++) {
    const page = askPage(id);
    if (page?.title) {
      return {
        id,
        title: page.title.slice(0, 300),
        channel: page.channel.slice(0, 100),
        channelId: page.channelId,
        handle: page.handle,
        shownTitle: (page.shownTitle || "").slice(0, 300),
        description: page.description,
        tags: page.tags,
        ytCategory: page.ytCategory,
        lengthSeconds: page.lengthSeconds,
        isLive: page.isLive,
        unlisted: page.unlisted,
        duration: "",
        meta: "",
        isShort
      };
    }
    // Give the bridge two seconds before settling for the bare title.
    if (i >= 8) {
      const dom = domMetadata(id);
      if (dom) return { id, ...dom, duration: "", meta: "", isShort };
    }
    await sleep(250);
  }
  return null;
}

function overlayShell(className) {
  const host = player();
  if (!host) return null;
  removeOverlay();
  const overlay = document.createElement("div");
  overlay.className = className;
  host.append(overlay);
  return overlay;
}

function button(label, primary, onClick) {
  const btn = document.createElement("button");
  btn.className = primary ? "yff-overlay-btn yff-primary" : "yff-overlay-btn";
  btn.type = "button";
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function line(className, value) {
  const node = document.createElement("div");
  node.className = className;
  node.textContent = value;
  return node;
}

function actions(...buttons) {
  const row = line("yff-overlay-actions", "");
  row.append(...buttons);
  return row;
}

/* budget is how many "Watch anyway" are left today: { left, limit }, with
   left null when there is no limit. */
function showOverlay(id, verdict, budget) {
  const overlay = overlayShell("yff-overlay");
  if (!overlay) return false;

  // Between the hard limit and the threshold a video is blocked, but not bad.
  const limit = hardLimit(settings);
  let heading = "Blocked by your rules";
  if (verdict.via === "never") heading = "Blocked — contains something you never want to see";
  else if (verdict.via === "rule") heading = "Blocked — matches one of your content rules";
  else if (verdict.via === "category") heading = `Blocked — ${categoryLabel(verdict.c)}`;
  else if (verdict.hard) heading = `Blocked for good — ${verdict.s}/100, under your hard limit of ${limit}`;
  else if (verdict.via === "score" && limit > 0) heading = `You shouldn't watch this, but it's not bad — ${verdict.s}/100`;
  else if (verdict.via === "score") heading = `Blocked — ${verdict.s}/100 for your goals`;
  else if (verdict.via === "unchecked") heading = "Blocked — this video could not be checked";
  overlay.append(line("yff-overlay-title", heading), line("yff-overlay-reason", verdict.why));

  if (verdict.m) {
    const summary = line("yff-overlay-summary", verdict.m);
    summary.prepend(Object.assign(document.createElement("strong"), { textContent: "What's in it: " }));
    overlay.append(summary);
  }
  // d is the number of seconds watched when Gemini saw only the opening, true when it saw it all.
  const note = typeof verdict.d === "number"
    ? `Gemini watched the first ${Math.round(verdict.d / 60)} minutes.`
    : verdict.d
      ? "Gemini watched the whole video."
      : verdict.skipped
        ? `Judged on the title and description — Gemini could not watch it: ${verdict.skipped}`
        : "";
  if (note) overlay.append(line("yff-overlay-note", note));

  // No way around it in Insane mode, under the hard limit, or once today's
  // "Watch anyway" are used up.
  const spent = budget.left === 0;
  if (spent && !insane() && !verdict.hard) {
    overlay.append(line("yff-overlay-note", budget.limit === 0
      ? "Strict mode allows no \"Watch anyway\"."
      : `${budget.limit === 1 ? "Today's one" : `All ${budget.limit} of today's`} "Watch anyway" used up. ` +
        "You get them back at midnight."));
  }

  // replace(), so going back does not land on the blocked video again.
  overlay.append(insane() || verdict.hard || spent
    ? actions(
      button("Back to YouTube home", true, () => location.replace(`${location.origin}/`)),
      button("Take me back", false, () => history.back())
    )
    : actions(
      button("Take me back", true, () => history.back()),
      button(budget.left === null ? "Watch anyway" : `Watch anyway (${budget.left} left today)`, false, async () => {
        if (budget.left !== null) {
          // Another tab may have spent the last one meanwhile.
          const res = await ext.runtime.sendMessage({ type: "anyway", take: true }).catch(() => null);
          if (!res?.ok) {
            showOverlay(id, verdict, { left: 0, limit: budget.limit });
            return;
          }
        }
        revealed.add(id);
        removeOverlay();
        releasePlayback(true);
      })
    ));
  return true;
}

/* The breathing screen. It stands in front of every video when you asked for
   a pause first, and in front of a video you chose to keep paused while
   Gemini watches it. There is no skip button on purpose: the pause is the
   point.

   With ms, it runs a pause of that length, split into whole breaths, and
   resolves when it is over; after that, and without ms, it keeps breathing
   for as long as it is shown. Called again, it only swaps the line under the
   circle, so the rhythm is kept. */
let breathing = null; // the screen being shown; removeOverlay() ends it

function showBreathing(message, ms = 0) {
  const fresh = !breathing;
  if (fresh) {
    const b = breathing = {
      overlay: line("yff-overlay yff-breathing", ""),
      circle: line("yff-breath", ""),
      cue: line("yff-breath-cue", ""),
      count: line("yff-breath-count", ""),
      verse: line("yff-verse", ""),
      reason: line("yff-overlay-reason", ""),
      elapsed: 0,
      total: 0,
      last: 0,
      done: null
    };
    b.overlay.append(
      b.circle,
      b.cue,
      b.count,
      b.verse,
      b.reason,
      actions(button("Take me back", false, () => history.back()))
    );
    if (settings.verse) showVerse(b.verse);
  }

  const b = breathing;
  b.reason.textContent = message;
  let over = Promise.resolve();
  if (ms) {
    b.total = ms;
    b.elapsed = 0;
    over = new Promise((resolve) => {
      b.done = resolve;
    });
  }
  if (fresh) breathFrame(b, performance.now());
  return over;
}

/* One frame of the breathing screen: the circle grows on the in-breath and
   shrinks on the out-breath, the cue says which, and the counter says how
   much of the pause is left. Frames only arrive while you are looking at the
   tab, and a gap between two frames counts as a second at most, so time
   spent elsewhere does not shorten the pause. */
function breathFrame(b, now) {
  if (breathing !== b) return;
  requestAnimationFrame((next) => breathFrame(b, next));

  // YouTube builds the player after the page; move in as soon as it is there.
  if (!b.overlay.isConnected) player()?.append(b.overlay);

  b.elapsed += Math.min(now - (b.last || now), 1000);
  b.last = now;
  if (b.done && b.elapsed >= b.total) {
    b.done();
    b.done = null;
    b.total = 0;
    b.elapsed = 0;
  }

  const breaths = Math.max(1, Math.round(b.total / BREATH_MS));
  const breath = b.total ? b.total / breaths : BREATH_MS;
  const at = (b.elapsed % breath) / breath; // 0 to 1 through one breath
  const inhaling = at < BREATH_IN;
  const lungs = inhaling ? at / BREATH_IN : (1 - at) / (1 - BREATH_IN); // 0 empty, 1 full
  b.circle.style.transform = `scale(${0.5 + 0.25 * (1 - Math.cos(Math.PI * lungs))})`;

  const cue = inhaling ? "Breathe in" : "Breathe out";
  const count = b.total
    ? `Breath ${Math.floor(b.elapsed / breath) + 1} of ${breaths} · ${Math.ceil((b.total - b.elapsed) / 1000)} s left`
    : "";
  if (b.cue.textContent !== cue) b.cue.textContent = cue;
  if (b.count.textContent !== count) b.count.textContent = count;
}

/* Today's verse, from the list the extension ships with: nothing is fetched. */
async function showVerse(node) {
  const res = await ext.runtime.sendMessage({ type: "verse" }).catch(() => null);
  if (!res?.ok) return;
  node.append(
    line("yff-verse-text", res.text),
    line("yff-verse-ref", `${res.ref} · World English Bible`)
  );
}

/* A small note in the corner of the player that goes away by itself. */
function toast(message, ms) {
  const node = overlayShell("yff-toast");
  if (!node) return;
  node.textContent = message;
  setTimeout(() => node.remove(), ms);
}

/* Holds the page silent while we decide. Without this a blocked video plays,
   with sound, for as long as the title poll plus the API call take — which is
   exactly the content you asked not to see. Every video is paused, not just
   the one in view, because YouTube keeps hidden players around. */
let playbackHold = null;
let playbackHoldTimeout = null;
const pauseAll = () => document.querySelectorAll("video").forEach((video) => video.pause());
let pauseOver = Promise.resolve(); // settles when the pause before this video is over

function holdPlayback(maxMs) {
  clearTimeout(playbackHoldTimeout);
  // A check never holds forever: if a request hangs, the video is yours
  // again — though never before the pause you asked for is over. Only a
  // blocked video stays held, for as long as it is open.
  const mine = Number.isFinite(maxMs)
    ? setTimeout(async () => {
      await pauseOver;
      if (playbackHoldTimeout !== mine) return; // held again meanwhile
      removeOverlay();
      releasePlayback(true);
    }, maxMs)
    : null;
  playbackHoldTimeout = mine;
  if (playbackHold) return;

  pauseAll();
  // "play" does not bubble, but capturing it stops a video the moment it
  // starts; the interval alone let a third of a second through.
  document.addEventListener("play", pauseAll, true);
  playbackHold = setInterval(pauseAll, 150);
}

function releasePlayback(resume) {
  clearTimeout(playbackHoldTimeout);
  playbackHoldTimeout = null;
  if (!playbackHold) return;
  document.removeEventListener("play", pauseAll, true);
  clearInterval(playbackHold);
  playbackHold = null;
  // The autoplay policy may say no; then the user presses play.
  if (resume) player()?.querySelector("video")?.play().catch(() => {});
}

/* Has Gemini watch the video. Depending on your setting the video waits
   paused behind the breathing screen, or plays (once any breath is over)
   while the check runs and is stopped if it comes back blocked. */
async function watchVerdict(record, fallback, breath, stale) {
  let settled = false;
  const review = ext.runtime.sendMessage({ type: "review", item: record })
    .catch((err) => console.warn("[Focus Filter for YouTube] watching failed", err))
    .finally(() => {
      settled = true;
    });

  if (settings.deepWhile === "play" && !insane()) {
    await breath;
    // An answer that arrived during the breath is acted on by the gate instead.
    if (!settled && !stale()) {
      releasePlayback(true);
      toast("Gemini is checking this video in the background…", 6000);
    }
  } else {
    holdPlayback(insane() ? Infinity : WATCH_HOLD_MS);
    showBreathing(
      "Meanwhile Gemini checks what's in this video. This usually takes " +
      "10–40 seconds, and only happens once per video."
    );
  }
  return (await review)?.verdict || fallback;
}

/* Asks the background for a verdict on the opened video: from its details,
   by watching it, or details first and watching only when they are not
   conclusive — whichever you picked. */
async function judgeWatch(record, breath, stale) {
  if ((active && settings.reviewMode === "deep") || insane()) return watchVerdict(record, null, breath, stale);

  const res = await ext.runtime.sendMessage({ type: "classify", items: [record], watch: true });
  const verdict = res?.verdicts?.[record.id] || null;
  if (!res?.watchNext || stale()) return verdict;
  return watchVerdict(record, verdict, breath, stale);
}

async function gateWatchPage() {
  removeOverlay();
  releasePlayback(false);
  if (!settings?.enabled) return;

  const id = currentWatchId();
  if (!id || revealed.has(id)) return;
  // Asking the model needs an API key. Your channel and title lists do not,
  // and neither does the pause before a video.
  const lists = settings.blockChannels.length + settings.blockKeywords.length > 0;
  const judging = (settings.enforceWatch && (active || lists)) || insane();
  if (!judging && !settings.breathe) return;

  const token = ++watchToken;
  // "Watch anyway" ends this gate as surely as navigating away.
  const stale = () => token !== watchToken || revealed.has(id);

  // Silence first, ask questions second.
  holdPlayback(insane() ? Infinity : HOLD_MS);
  let breath = Promise.resolve();
  if (settings.breathe) {
    breath = showBreathing(
      "Then ask yourself: is this what you want to watch right now?",
      settings.breatheSeconds * 1000
    );
  } else if (insane()) {
    showBreathing("Insane mode: nothing plays until it has been checked.");
  }
  pauseOver = breath;

  let verdict = null;
  if (judging) {
    try {
      // No record means the video cannot be identified; it is not held
      // hostage, except in Insane mode.
      const record = await watchRecord(id, location.pathname.startsWith("/shorts/"), stale);
      if (record && !stale()) verdict = await judgeWatch(record, breath, stale);
    } catch (err) {
      console.warn("[Focus Filter for YouTube] watch check failed", err); // fail open, unless insane
    }
  }
  await breath;
  if (stale()) return;
  if (verdict) verdicts.set(id, verdict);
  else if (insane()) verdict = UNCHECKED;

  if (!verdict?.blocked) {
    // Free for the rest of this page, so a settings change neither pauses it
    // again nor asks for another breath.
    revealed.add(id);
    removeOverlay();
    releasePlayback(true);
    if (verdict?.d) toast(`Checked: ${verdict.r || "fine by your rules."}`, 5000);
    return;
  }

  // Blocked: nothing plays while it is open, keyboard shortcuts included.
  holdPlayback(Infinity);
  const target = validateRedirect(settings.redirectUrl);
  if (target.ok && target.url) {
    // replace(), not assign(): going back should return to where you came
    // from, not to the blocked video, which would bounce you out again.
    location.replace(target.url);
    return;
  }
  // A counter that cannot be read counts as used up, but only with a limit set.
  const res = await ext.runtime.sendMessage({ type: "anyway" }).catch(() => null);
  const budget = res?.ok ? res : { left: settings.anywayPerDay >= 0 ? 0 : null, limit: settings.anywayPerDay };
  // The player may not be mounted yet, so keep trying for a few seconds.
  for (let i = 0; i < 10 && !stale() && !showOverlay(id, verdict, budget); i++) await sleep(400);
}

/* ------------------------------------------------------------------ boot --- */

async function refreshSettings() {
  settings = await getSettings();
  active = Boolean(settings.enabled && settings.apiKey);
  syncObserver();
  scan();
  gateWatchPage(); // runs regardless of feed settings — this is the main path
}

let observer = null;

/* Only watch the DOM when something actually filters the feed. Otherwise the
   observer would fire on every YouTube render for no reason. */
function syncObserver() {
  const wanted = active && filtersFeed(settings);
  if (wanted && !observer) {
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else if (!wanted && observer) {
    observer.disconnect();
    observer = null;
  }
}

function start() {
  document.addEventListener("yt-navigate-finish", () => {
    revealed.clear();
    unjudged.clear(); // give transient API failures another chance
    scheduleScan();
    gateWatchPage();
  });

  window.addEventListener("yt-page-data-updated", scheduleScan);
  setInterval(releaseStalePending, 5000);

  ext.storage.onChanged.addListener((changes, area) => {
    const change = area === "local" && changes.settings;
    if (!change) return;
    // A refreshed model list, or a Strict mode change that is only waiting,
    // changes nothing in force here and must not reload anything.
    const before = change.oldValue || {};
    const after = change.newValue || {};
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((key) => key !== "knownModels" && key !== "strictPending")
      .some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (!changed) return;
    // Start this tab over with the new settings: a video already let through
    // would otherwise never be checked against them. The settings page and the
    // popup say so when you save.
    location.reload();
  });

  refreshSettings();
}

start();
