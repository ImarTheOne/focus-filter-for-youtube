/* Shared constants and helpers, loaded by the background script, the content
   script, the options page and the popup. */

/* eslint-disable no-unused-vars */
const ext = globalThis.browser ?? globalThis.chrome;

const DEFAULT_GOALS = [
  "Describe what you want out of YouTube, in your own words. The more specific",
  "you are, the better this works. For example:",
  "",
  "I want videos that teach me something or move my work forward: tutorials,",
  "long-form technical talks, documentaries and serious interviews.",
  "",
  "I consider these a waste of my time: gossip, reaction videos, clickbait and",
  "rage-bait, prank videos, celebrity news, and anything designed purely to keep",
  "me scrolling."
].join("\n");

/* Bumped when a default changes in a way that must override what is already
   saved. v2: feed filtering became opt-in — videos are judged when you open
   them, so the home page must be left alone even for existing installs. */
const SCHEMA_VERSION = 2;

const DEFAULTS = {
  schemaVersion: SCHEMA_VERSION,
  enabled: true,
  apiKey: "",

  /* Google's Gemini API terms require the user to be 18+ and forbid aiming
     the service at under-18s. The key is refused until this is ticked. */
  ageConfirmed: false,
  model: "gemini-flash-lite-latest",
  knownModels: [], // filled in from the API, see pickBestModel
  threshold: 50,
  goals: DEFAULT_GOALS,
  blockMode: "hide", // "hide" | "placeholder"

  /* The main mode: judge a video when you open it, not while you browse. */
  enforceWatch: true,
  redirectUrl: "", // empty = show a blocking screen instead of navigating away

  /* A pause before every video, behind a guided breathing exercise with no
     skip button, optionally with a Bible verse of the day from verses.js.
     Needs no API key: nothing is judged or sent. */
  breathe: false,
  breatheSeconds: 25,
  verse: false,

  /* Insane mode: Gemini watches every video before it plays, behind the
     breathing screen, for as long as that takes. No skip, no "Watch anyway",
     no always-allow channels, and a video that cannot be checked stays
     blocked. A blocked video only offers the way back to the YouTube home. */
  insane: false,

  /* Feed filtering is off by default now — the home page loads untouched.
     Turn a surface back on to also hide tiles before you click them. */
  surfaces: {
    home: false,
    search: false,
    related: false,
    subscriptions: false,
    shorts: false
  },
  shortsAlwaysTrash: false,

  /* How closely a video you open is checked:
       "standard" — its details only: title, channel, description, tags
       "smart"    — details first; Gemini watches the video when they are not
                    conclusive (vague title, score near the line)
       "deep"     — Gemini watches every video you open                      */
  reviewMode: "smart",
  deepMinutes: 10, // how much of the video Gemini watches; 0 = all of it
  deepWhile: "hold", // "hold" = keep it paused while watching | "play"

  /* Zero tolerance, in plain language: a video that contains any of these,
     however little of it, is blocked whatever else it is. */
  neverRules: [],

  /* Plain-language content rules, e.g. "is mostly a sponsor read". The model
     checks every video against them; a rule that fits the video as a whole
     or a substantial part of it blocks it. */
  blockRules: [],
  categoryRules: {}, // category id -> "judge" | "allow" | "block"
  allowChannels: [],
  blockChannels: [],
  blockKeywords: [],
  cacheTtlDays: 30
};

/* Fallback list, used only until the options page asks the key which models it
   actually has. Google retires model IDs regularly, so never trust this list —
   "Load models from my key" is the source of truth. */
const FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro"
];

/* When the real model list arrives, prefer these in order: cheap flash tiers
   first, since this is a high-volume, low-difficulty classification job. */
const MODEL_PREFERENCE = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash"
];

function pickBestModel(available) {
  for (const wanted of MODEL_PREFERENCE) {
    if (available.includes(wanted)) return wanted;
  }
  return available.find((m) => m.includes("flash-lite")) ||
    available.find((m) => m.includes("flash")) ||
    available[0] ||
    null;
}

/* Thinking is configured differently per model generation, and sending the
   wrong field is a hard 400. Gemini 3 cannot disable thinking at all. */
function thinkingConfigFor(model) {
  if (/gemini-2\.5/.test(model)) return { thinkingBudget: 0 };
  if (/gemini-3/.test(model)) return { thinking_level: "low" };
  return null; // unknown generation: send nothing and take the default
}

const MAX_CACHE_ENTRIES = 5000;

/* A fingerprint of everything the model's answer depends on that you can edit.
   It is stored with each cached verdict, so rewriting your goals or either
   list of rules re-judges videos instead of serving answers to the old
   question. */
function promptHash(settings) {
  const source = [
    settings.goals || "",
    ...(settings.blockRules || []),
    "\u0001", // keeps a rule moved from one list to the other from hashing the same
    ...(settings.neverRules || [])
  ].join("\u0000");
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/* A closed taxonomy. It has to be fixed rather than free-form, because the
   category is cached per video and matched against your rules later — a model
   inventing new labels would break both. */
const CATEGORIES = [
  { id: "education", label: "Education & tutorials" },
  { id: "science", label: "Science & maths" },
  { id: "technology", label: "Technology & software" },
  { id: "business", label: "Business & finance" },
  { id: "news", label: "News & politics" },
  { id: "documentary", label: "Documentary & history" },
  { id: "podcasts", label: "Podcasts & long interviews" },
  { id: "gaming", label: "Gaming" },
  { id: "music", label: "Music" },
  { id: "entertainment", label: "Entertainment & comedy" },
  { id: "drama", label: "Drama, gossip & reactions" },
  { id: "vlogs", label: "Vlogs & lifestyle" },
  { id: "sports", label: "Sports" },
  { id: "fitness", label: "Health & fitness" },
  { id: "food", label: "Food & cooking" },
  { id: "diy", label: "DIY, crafts & making" },
  { id: "travel", label: "Travel & outdoors" },
  { id: "shopping", label: "Product reviews & shopping" },
  { id: "kids", label: "Kids & animation" },
  { id: "other", label: "Anything else" }
];

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/* Each category is one of:
     "judge" — hand it to the productivity score, as before (default)
     "allow" — always show, whatever it scores
     "block" — always hide, whatever it scores                              */
const RULE_JUDGE = "judge";
const RULE_ALLOW = "allow";
const RULE_BLOCK = "block";

function ruleFor(settings, category) {
  const rule = settings.categoryRules?.[category];
  return rule === RULE_ALLOW || rule === RULE_BLOCK ? rule : RULE_JUDGE;
}

/* True when at least one category still needs a productivity score. If nothing
   does, we can ask the model for less and skip the scoring rubric entirely. */
function needsScoring(settings) {
  return CATEGORY_IDS.some((id) => ruleFor(settings, id) === RULE_JUDGE);
}

function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label || "Uncategorised";
}

/* Applied in memory on every read, so a stale saved copy never brings the old
   behaviour back even before the background script rewrites it. */
function migrate(stored) {
  const s = { ...stored };
  if ((s.schemaVersion || 1) < 2) {
    // Settings saved before feed filtering became opt-in: switch it off, since
    // leaving the browsing experience untouched is the whole point of v2.
    s.surfaces = { ...DEFAULTS.surfaces };
    s.enforceWatch = true;
    s.schemaVersion = 2;
  }
  return s;
}

function anySurfaceEnabled(settings) {
  return Object.values(settings.surfaces || {}).some(Boolean);
}

async function getSettings() {
  const stored = await ext.storage.local.get("settings");
  const s = migrate(stored.settings || {});
  return {
    ...DEFAULTS,
    ...s,
    surfaces: { ...DEFAULTS.surfaces, ...(s.surfaces || {}) }
  };
}

async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await ext.storage.local.set({ settings: next });
  return next;
}

async function getStats() {
  const stored = await ext.storage.local.get("stats");
  return { allowed: 0, blocked: 0, apiCalls: 0, errors: 0, watched: 0, ...(stored.stats || {}) };
}

/* Only http(s), and never back to YouTube — redirecting a blocked YouTube video
   to another YouTube page would just get judged again on arrival. */
function validateRedirect(raw) {
  const value = String(raw || "").trim();
  if (!value) return { ok: true, url: "" };

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { ok: false, error: "That is not a valid web address." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// addresses are allowed." };
  }
  if (/(^|\.)(youtube\.com|youtu\.be)$/i.test(url.hostname)) {
    return { ok: false, error: "Pick somewhere outside YouTube, or you will just be judged again on arrival." };
  }
  return { ok: true, url: url.href };
}

/* One entry per line. Commas are left alone: channel names and rules have them. */
function parseList(text) {
  return String(text || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}
