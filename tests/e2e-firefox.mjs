/* The real Firefox build on a real YouTube watch page: the pause, the verse and
   the channel and title lists. No API key is used, so nothing goes to Gemini.

     npm install --no-save puppeteer-core     once; it is not part of the extension
     ./build.sh firefox
     node tests/e2e-firefox.mjs

   It starts the installed Firefox headless with a throwaway profile — your own
   profile and windows are not touched — and muted, because a headless browser
   still plays sound. */
import puppeteer from "puppeteer-core";

const EXT = new URL("../build/firefox", import.meta.url).pathname;
const VIDEO = "https://www.youtube.com/watch?v=fNk_zzaMoSs"; // 3Blue1Brown, "Vectors | Chapter 1…"
const UUID = "11111111-2222-4333-8444-555555555555";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = "") => { results.push([ok ? "PASS" : "FAIL", name, detail]); console.log(ok ? "PASS" : "FAIL", name, detail); };

const browser = await puppeteer.launch({
  browser: "firefox",
  executablePath: "/Applications/Firefox.app/Contents/MacOS/firefox",
  headless: true,
  env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: "1" }, // lets the script open the extension's own pages
  defaultViewport: { width: 1280, height: 800 },
  extraPrefsFirefox: { "extensions.webextensions.uuids": JSON.stringify({ "{8c74ba9b-1b42-439c-ad14-3f88366f8eb0}": UUID }), "media.volume_scale": "0.0", /* silent: a headless browser still plays sound */ "media.autoplay.default": 0, "media.autoplay.blocking_policy": 0, "intl.accept_languages": "en-US, en" }
});
try {
  const id = await browser.installExtension(EXT);
  console.log("installed", id);

  // The settings page, at the internal address preset below.
  const options = await browser.newPage();
  await options.goto(`moz-extension://${UUID}/options.html`, { timeout: 6000 }).catch(() => {}); // its load is not reported
  await options.waitForSelector("#neverRules");
  check("settings page has the new cards", await options.evaluate(() =>
    Boolean(document.querySelector("#neverRules") && document.querySelector("#breatheSeconds") && document.querySelector("#verse"))));
  // Saving reloads every open YouTube tab; park the test tab first, so that
  // reload cannot race the next page.goto.
  const configure = async (patch) => {
    await page.goto("about:blank");
    return options.evaluate((p) => saveSettings(p), patch);
  };
  const verse = await options.evaluate(() => browser.runtime.sendMessage({ type: "verse" }));
  check("background answers with today's verse", Boolean(verse?.ok && verse.text), `${verse?.ref}: ${String(verse?.text).slice(0, 50)}…`);

  const page = await browser.newPage();
  let consented = false;
  const open = async () => {
    await page.goto(VIDEO, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (consented) return;
    // A fresh profile gets YouTube's cookie dialog, which also stops playback.
    // Decline everything optional, once; YouTube then reloads the page.
    const reject = await page.waitForFunction(() =>
      [...document.querySelectorAll("button")].find((b) => /^\s*Reject all\s*$/i.test(b.textContent)), { timeout: 15000 }).catch(() => null);
    if (reject) {
      await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /^\s*Reject all\s*$/i.test(b.textContent)).forEach((b) => b.click()));
      await sleep(4000);
      await page.goto(VIDEO, { waitUntil: "domcontentloaded", timeout: 60000 });
    }
    consented = true;
    console.log("cookie dialog:", reject ? "declined" : "not shown");
  };
  const state = () => page.evaluate(() => {
    const o = document.querySelector("#movie_player .yff-overlay");
    const v = document.querySelector("#movie_player video");
    return {
      breathing: Boolean(o?.classList.contains("yff-breathing")),
      cue: o?.querySelector(".yff-breath-cue")?.textContent || "",
      count: o?.querySelector(".yff-breath-count")?.textContent || "",
      verse: o?.querySelector(".yff-verse-text")?.textContent || "",
      ref: o?.querySelector(".yff-verse-ref")?.textContent || "",
      title: o?.querySelector(".yff-overlay-title")?.textContent || "",
      reason: o?.querySelector(".yff-overlay-reason")?.textContent || "",
      buttons: o ? [...o.querySelectorAll("button")].map((b) => b.textContent) : [],
      fits: o ? o.scrollHeight <= o.clientHeight : null,
      paused: v ? v.paused : null,
      time: v ? v.currentTime : null
    };
  });

  // 0. Baseline: with the extension switched off, does this browser play the video at all?
  await configure({ enabled: false });
  await open();
  await sleep(7000);
  let base = await page.evaluate(() => {
    const v = document.querySelector("#movie_player video");
    const p = document.querySelector("#movie_player");
    return { paused: v?.paused, time: v?.currentTime, ready: v?.readyState, state: p?.getPlayerState?.(), error: document.querySelector(".ytp-error, yt-playability-error-supported-renderers")?.innerText?.slice(0, 120) || "" };
  });
  console.log("baseline without the extension:", JSON.stringify(base));
  await page.evaluate(() => document.querySelector("#movie_player").playVideo());
  await sleep(3000);
  console.log("baseline after pressing play:", JSON.stringify(await page.evaluate(() => { const v = document.querySelector("#movie_player video"); return { paused: v.paused, time: v.currentTime }; })));
  await configure({ enabled: true });

  // This headless browser does not autoplay even with the extension off (see
  // the baseline), so press play and see whether the video is left to run.
  const pressPlay = async () => {
    await page.evaluate(() => document.querySelector("#movie_player").playVideo());
    await sleep(3000);
    return page.evaluate(() => { const v = document.querySelector("#movie_player video"); return { paused: v.paused, time: v.currentTime }; });
  };

  // 1. The pause with a verse, nothing blocked.
  await configure({ breathe: true, breatheSeconds: 10, verse: true, blockKeywords: [], blockChannels: [] });
  await open();
  await page.waitForSelector("#movie_player .yff-breathing", { timeout: 30000 });
  await sleep(1500);
  let s = await state();
  check("pause screen shows on a real watch page", s.breathing, `${s.cue} | ${s.count}`);
  check("counter is running", /Breath 1 of 1 · \d+ s left/.test(s.count), s.count);
  check("verse of the day is shown", s.verse.length > 20 && /World English Bible/.test(s.ref), s.ref);
  check("only \"Take me back\" during the pause", s.buttons.join("|") === "Take me back", s.buttons.join("|"));
  check("video held during the pause", s.paused === true && s.time < 0.5, `paused=${s.paused} t=${s.time}`);
  check("screen fits the player", s.fits === true);
  const started = Date.now();
  await page.waitForFunction(() => !document.querySelector("#movie_player .yff-overlay"), { timeout: 30000 });
  const took = (Date.now() - started) / 1000 + 1.5;
  check("pause ends by itself after about 10 s", took > 8.5 && took < 16, `${took.toFixed(1)} s`);
  let played = await pressPlay();
  check("video is free to play afterwards", played.paused === false && played.time > 1, `paused=${played.paused} t=${played.time.toFixed(1)}`);

  // 2. A blocked title word, with no API key.
  await configure({ breatheSeconds: 5, blockKeywords: ["vector*"] });
  await open();
  await page.waitForFunction(() => document.querySelector("#movie_player .yff-overlay-title"), { timeout: 40000 });
  s = await state();
  check("title word blocks without an API key", /Blocked/.test(s.title) && /vector\*/.test(s.reason), `${s.title} — ${s.reason}`);
  check("block screen offers the two buttons", s.buttons.join("|") === "Take me back|Watch anyway", s.buttons.join("|"));
  played = await pressPlay();
  check("blocked video cannot be played", played.paused === true && played.time < 1, `paused=${played.paused} t=${played.time.toFixed(2)}`);

  // 3. A channel blocked by its @handle; a word inside a longer word must not block.
  await configure({ breathe: false, blockKeywords: ["vect", "hapter"], blockChannels: ["@3blue1brown"] });
  await open();
  await page.waitForFunction(() => document.querySelector("#movie_player .yff-overlay-title"), { timeout: 40000 });
  s = await state();
  check("channel blocked by @handle", /3Blue1Brown/.test(s.reason), s.reason);

  // 4. Parts of words block nothing, and a similar handle is another channel.
  await configure({ blockChannels: ["@3blue1brownfans", "Blue"] });
  await open();
  await sleep(6000);
  s = await state();
  played = await pressPlay();
  check("parts of words and a similar handle do not block", !s.title && played.paused === false && played.time > 1, `title="${s.title}" paused=${played.paused} t=${played.time.toFixed(1)}`);
} catch (err) {
  console.log("ERROR", err.message);
  results.push(["FAIL", "run", err.message]);
} finally {
  await browser.close();
}
console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${results.filter((r) => r[0] === "FAIL").length} failed`);
