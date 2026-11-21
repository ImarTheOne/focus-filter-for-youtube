/* Checks the parts of the extension that decide things, without a browser:
   list matching, the order rules apply in, and what the model is asked.

     node tests/logic.test.js                                              */

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const store = {};
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  fetch: async () => { throw new Error("no network in tests"); },
  chrome: {
    storage: {
      local: {
        get: async (key) => ({ [key]: store[key] }),
        set: async (patch) => Object.assign(store, patch)
      }
    },
    runtime: { onInstalled: { addListener() {} }, onMessage: { addListener(fn) { sandbox.onMessage = fn; } } }
  }
};
vm.createContext(sandbox);
// One script, as in the browser, so the files share their top-level names.
const source = ["common.js", "verses.js", "background.js"]
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");
vm.runInContext(`${source}\nglobalThis.api = { holdBack, saveSettings, DEFAULTS, VERSES, fold, wordMatcher, localVerdict, decide,
  buildSystemPrompt, buildSchema, promptHash, parseList, classify, worthWatching, migrate, applyStrict,
  getSettings, getStoredSettings, localDay };`, sandbox);
const { holdBack, saveSettings, DEFAULTS, VERSES, wordMatcher, localVerdict, decide, buildSystemPrompt, buildSchema,
  promptHash, parseList, classify, worthWatching, migrate, applyStrict, getSettings, getStoredSettings,
  localDay } = sandbox.api;

const settings = (patch) => ({ ...DEFAULTS, apiKey: "test", ...patch });
const video = (patch) => ({ id: "abc12345678", title: "A video", channel: "Someone", ...patch });
const titleBlocked = (word, title) => Boolean(localVerdict(video({ title }), settings({ blockKeywords: [word] }))?.blocked);

/* ---- title words: whole words, with * for endings ---- */
assert.equal(titleBlocked("ai", "How to maintain a bike"), false, "no match inside a longer word");
assert.equal(titleBlocked("ai", "What AI can do"), true, "case is ignored");
assert.equal(titleBlocked("react", "My reaction to the news"), false);
assert.equal(titleBlocked("react*", "My reaction to the news"), true, "* covers word endings");
assert.equal(titleBlocked("react*", "He REACTS badly"), true);
assert.equal(titleBlocked("*tok", "Best of TikTok"), true, "* covers word beginnings");
assert.equal(titleBlocked("you won't believe", "You  Won't Believe this"), true, "phrases, doubled spaces");
assert.equal(titleBlocked("cafe", "Le Café du coin"), true, "accents are ignored");
assert.equal(titleBlocked("!!!", "wow!!!"), true, "punctuation entries match anywhere");
assert.equal(titleBlocked("c++", "Learn C++ in a day"), true, "regex characters are literal");
assert.equal(titleBlocked("*", "anything"), false, "a lone * blocks nothing");
assert.equal(wordMatcher("")("anything"), false);
assert.equal(
  Boolean(localVerdict(video({ title: "Original title", shownTitle: "Streich mit Freunden" }),
    settings({ blockKeywords: ["streich"] }))?.blocked),
  true, "the translated title YouTube shows is checked too");

/* ---- channels: name, @handle, link, ID ---- */
const channel = (entry, item, list = "blockChannels") =>
  localVerdict(video(item), settings({ [list]: [entry] }));
assert.equal(channel("Vox", { channel: "Vox" })?.blocked, true);
assert.equal(channel("vox", { channel: "Vox Media" })?.blocked, true, "whole words of a longer name");
assert.equal(channel("Vox", { channel: "Voxel Games" }), null, "not inside a longer word");
assert.equal(channel("MIT", { channel: "Smith Family Vlogs" }), null);
assert.equal(channel("Kurzgesagt", { channel: "Kurzgesagt – In a Nutshell" })?.blocked, true);
assert.equal(channel("@veritasium", { channel: "Veritasium", handle: "@Veritasium" })?.blocked, true);
assert.equal(channel("https://www.youtube.com/@veritasium/videos", { channel: "V", handle: "@veritasium" })?.blocked, true);
assert.equal(channel("@veritasium", { channel: "Veritasium Fans", handle: "@veritasiumfans" }), null, "a handle is exact");
assert.equal(channel("youtube.com/channel/UCHnyfMqiRRG1u-2MsSQLbXA", { channel: "V", channelId: "UCHnyfMqiRRG1u-2MsSQLbXA" })?.blocked, true);
assert.equal(channel("3blue1brown", { channel: "3Blue1Brown" }, "allowChannels")?.blocked, false);

// Blocked beats allowed; Insane mode ignores the allowed list.
const both = settings({ allowChannels: ["Vox"], blockChannels: ["Vox"] });
assert.equal(localVerdict(video({ channel: "Vox" }), both).blocked, true);
assert.equal(localVerdict(video({ channel: "Vox" }), settings({ allowChannels: ["Vox"], insane: true })), null);
assert.deepEqual([...parseList("Crosby, Stills & Nash\n\n  Vox  ")], ["Crosby, Stills & Nash", "Vox"]);

/* ---- the order rules apply in ---- */
const strict = settings({
  neverRules: ["swearing", "gambling"],
  blockRules: ["reaction videos"],
  categoryRules: { education: "allow", gaming: "block" }
});
let d = decide({ c: "education", s: 95, z: [2], h: [], r: "A betting sponsor at 12:40." }, strict);
assert.equal(d.blocked, true, "zero tolerance beats an allowed category and a high score");
assert.equal(d.via, "never");
assert.equal(d.hard, true, "zero tolerance: no Watch anyway");
assert.equal(d.rule, "gambling");
assert.match(d.why, /gambling.*12:40/);
d = decide({ c: "education", s: 95, z: [], h: [1] }, strict);
assert.equal(d.via, "rule");
assert.equal(decide({ c: "education", s: 5, z: [], h: [] }, strict).blocked, false, "allowed category");
assert.equal(decide({ c: "gaming", s: 99, z: [], h: [] }, strict).blocked, true, "blocked category");
assert.equal(decide({ c: "music", s: 40, z: [], h: [] }, strict).blocked, true, "score under the line");
assert.equal(decide({ c: "music", s: 60, z: [9, 0], h: [7] }, strict).blocked, false, "numbers outside the lists are ignored");
assert.equal(decide({ c: "music", s: 60 }, strict).blocked, false, "verdicts cached before 1.3 still decide");
assert.equal(worthWatching(decide({ c: "music", s: 90, z: [], h: [], u: false }, strict), strict), true,
  "Smart mode watches when the details cannot rule a rule out");

/* ---- the hard limit: blocked with no way around under it ---- */
const hard = settings({ threshold: 50, hardThreshold: 25 });
const zone = (s) => { const v = decide({ c: "music", s, z: [], h: [] }, hard); return v.hard ? "hard" : v.blocked ? "soft" : "plays"; };
assert.deepEqual([0, 24, 25, 49, 50, 100].map(zone), ["hard", "hard", "soft", "soft", "plays", "plays"]);
assert.equal(decide({ c: "music", s: 10 }, applyStrict(settings({ threshold: 50 }))).hard, false,
  "off unless Strict mode is on");
d = decide({ c: "music", s: 55 }, settings({ threshold: 40, hardThreshold: 60 }));
assert.deepEqual([d.hard, d.blocked], [true, true], "a lower threshold does not lower the hard limit");
assert.equal(decide({ c: "gaming", s: 5, z: [], h: [] }, { ...hard, categoryRules: { gaming: "block" } }).hard, undefined,
  "only the score sets it: a category block keeps Watch anyway");
assert.equal(decide({ c: "education", s: 5, z: [], h: [] }, { ...hard, categoryRules: { education: "allow" } }).blocked, false,
  "an allowed category still beats the score");
assert.equal(worthWatching(decide({ c: "music", s: 20, z: [], h: [] }, hard), hard), true,
  "Smart mode takes a closer look near the hard limit too");
const relaxed = applyStrict(settings({ threshold: 50 }));
assert.equal(worthWatching(decide({ c: "music", s: 14, z: [], h: [] }, relaxed), relaxed), false,
  "but not near a hard limit that is off");

/* ---- Strict mode: its settings only count while it is on ---- */
const off = applyStrict(settings({ insane: true, hardThreshold: 30, anywayPerDay: 1 }));
assert.deepEqual([off.insane, off.hardThreshold, off.anywayPerDay], [false, 0, -1], "off: kept but inert");
const on = applyStrict(settings({ strict: true, insane: true, hardThreshold: 30, anywayPerDay: 1 }));
assert.deepEqual([on.insane, on.hardThreshold, on.anywayPerDay], [true, 30, 1]);
assert.equal(localVerdict(video({ channel: "Vox" }), applyStrict(settings({ allowChannels: ["Vox"], insane: true })))?.blocked, false,
  "Insane mode outside Strict mode does not override the allowed list");

// Upgrading: whoever had Insane mode or a hard limit keeps it, and nothing else switches on.
let m = migrate({ schemaVersion: 2, insane: true });
assert.deepEqual([m.strict, m.hardThreshold, m.anywayPerDay, m.schemaVersion], [true, 0, -1, 3]);
m = migrate({ schemaVersion: 2, hardThreshold: 30 });
assert.deepEqual([m.strict, m.hardThreshold, m.anywayPerDay], [true, 30, -1]);
m = migrate({ schemaVersion: 2 });
assert.deepEqual([m.strict, m.hardThreshold, m.anywayPerDay], [false, undefined, undefined],
  "everyone else gets Strict mode's defaults only once they switch it on");

/* ---- what the model is asked ---- */
const watching = buildSystemPrompt(strict, { withScore: true, watching: true });
assert.match(watching, /ZERO TOLERANCE/);
assert.match(watching, /<never>\n1\. swearing\n2\. gambling\n<\/never>/);
assert.match(watching, /One occurrence is a match/);
assert.match(watching, /<user_rules>\n1\. reaction videos\n<\/user_rules>/);
assert.match(watching, /a passing mention is not\na match/);
const details = buildSystemPrompt(strict, { withScore: true, watching: false });
assert.match(details, /plausible for\nthis kind of video/);
assert.doesNotMatch(buildSystemPrompt(settings({}), { withScore: true, watching: true }), /ZERO TOLERANCE|user_rules/);

const schema = buildSchema(strict, { withScore: true, watching: true });
assert.ok(schema.required.includes("never") && schema.required.includes("hits"));
assert.equal(buildSchema(settings({}), { withScore: true, watching: true }).properties.never, undefined);

assert.notEqual(promptHash(strict), promptHash(settings({ ...strict, neverRules: ["swearing"] })),
  "changing the never list re-judges cached videos");
assert.notEqual(
  promptHash(settings({ neverRules: ["x"], blockRules: [] })),
  promptHash(settings({ neverRules: [], blockRules: ["x"] })),
  "moving a rule between the lists re-judges too");

/* ---- the verses ---- */
assert.ok(VERSES.length >= 500);
for (const [ref, text] of VERSES) {
  assert.match(ref, /^(\d )?[A-Z][a-z]+ \d+:\d+(-\d+)?$/, ref);
  assert.ok(text.length > 20 && text.length <= 260 && text === text.trim() && !/\s\s|\n/.test(text), ref);
}
assert.equal(new Set(VERSES.map(([ref]) => ref)).size, VERSES.length, "no verse twice");

/* ---- messages: lists work without a key, the verse without anything ---- */
const ask = (msg) => new Promise((resolve) => sandbox.onMessage(msg, null, resolve));
(async () => {
  store.settings = { ...DEFAULTS, apiKey: "", blockKeywords: ["prank"] };
  const res = await ask({ type: "classify", watch: true, items: [video({ title: "Epic prank" }), video({ id: "zzz12345678" })] });
  assert.equal(res.verdicts.abc12345678.blocked, true, "a title word blocks without an API key");
  assert.equal(res.verdicts.zzz12345678, undefined, "and nothing else is judged or sent");
  assert.equal(res.watchNext, false);

  // A fresh install: Strict mode's defaults are there, and do nothing yet.
  delete store.settings;
  assert.equal((await getStoredSettings()).hardThreshold, 25);
  assert.deepEqual([(await getSettings()).hardThreshold, (await getSettings()).anywayPerDay], [0, -1]);

  // "Watch anyway" per day: counted, shared by every tab, back at midnight.
  store.settings = { ...DEFAULTS, apiKey: "test", strict: true, anywayPerDay: 2 };
  delete store.anyway;
  // Answers come from the sandbox's realm; compare plain copies.
  const take = () => ask({ type: "anyway", take: true }).then((r) => ({ ...r }));
  assert.deepEqual({ ...(await ask({ type: "anyway" })) }, { ok: true, left: 2, limit: 2 });
  assert.equal((await take()).left, 1);
  assert.equal((await take()).left, 0);
  assert.deepEqual(await take(), { ok: false, left: 0, limit: 2 }, "none left");
  store.anyway = { day: localDay() - 1, count: 9 };
  assert.equal((await ask({ type: "anyway" })).left, 2, "a new day starts fresh");
  store.anyway = { day: localDay(), count: 1 };
  const race = await Promise.all([take(), take()]);
  assert.deepEqual(race.map((r) => r.ok).sort(), [false, true], "two tabs cannot both spend the last one");
  store.settings = { ...store.settings, strict: false };
  assert.deepEqual(await take(), { ok: true, left: null, limit: null }, "no limit outside Strict mode");

  // The Strict mode delay: loosening waits, tightening does not.
  store.settings = { ...DEFAULTS, apiKey: "key-1", strict: true, hardThreshold: 25, anywayPerDay: 3, strictDelayHours: 24 };
  let saved = await saveSettings({ hardThreshold: 10, anywayPerDay: 5, insane: true, goals: "new goals" });
  assert.deepEqual([saved.hardThreshold, saved.anywayPerDay, saved.insane, saved.goals], [25, 3, true, "new goals"],
    "loosening waits; tightening and other settings apply at once");
  assert.deepEqual({ ...saved.strictPending.changes }, { hardThreshold: 10, anywayPerDay: 5 });
  assert.ok(Math.abs(saved.strictPending.at - Date.now() - 24 * 3600000) < 5000, "for the delay");
  assert.equal((await getSettings()).hardThreshold, 25, "not in force yet");
  saved = await saveSettings({ enabled: false });
  assert.equal(saved.enabled, true, "the popup's off switch waits too");
  assert.deepEqual(Object.keys(saved.strictPending.changes).sort(), ["anywayPerDay", "enabled", "hardThreshold"]);
  saved = await saveSettings({ anywayPerDay: 1 });
  assert.equal(saved.anywayPerDay, 1);
  assert.equal(saved.strictPending.changes.anywayPerDay, undefined, "tightening drops the waiting change to it");
  saved = await saveSettings({ goals: "edited again" });
  assert.equal(saved.strictPending.changes.hardThreshold, 10, "an unrelated save leaves waiting changes alone");
  store.settings = { ...store.settings, strictPending: { ...store.settings.strictPending, at: Date.now() - 1 } };
  const due = await getSettings();
  assert.deepEqual([due.hardThreshold, due.enabled, due.strictPending], [10, false, null], "applies when its time comes");
  store.settings = { ...DEFAULTS, apiKey: "key-1", strict: true, strictDelayHours: 24 };
  assert.equal((await saveSettings({ strict: false })).strict, true);
  assert.equal((await saveSettings({ strictPending: null })).strictPending, null, "cancelled");
  assert.equal((await saveSettings({ apiKey: "key-2" })).apiKey, "key-1", "a different key waits");
  assert.equal((await saveSettings({ strictDelayHours: 168 })).strictDelayHours, 168, "a longer delay at once");
  store.settings = { ...DEFAULTS, strict: true, strictDelayHours: 0 };
  assert.equal((await saveSettings({ strict: false })).strict, false, "no delay: at once");
  store.settings = { ...DEFAULTS, apiKey: "", strict: true };
  assert.equal((await saveSettings({ apiKey: "first-key" })).apiKey, "first-key", "adding a key is not loosening");
  assert.equal(holdBack({ ...DEFAULTS, strict: false }, { ...DEFAULTS, enabled: false }).enabled, false,
    "outside Strict mode nothing waits");

  const verse = await ask({ type: "verse" });
  assert.ok(verse.ok && verse.ref && verse.text);
  assert.equal((await ask({ type: "verse" })).ref, verse.ref, "the same verse all day");

  console.log("logic: all checks passed");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
