const $ = (sel) => document.querySelector(sel);

const API_ORIGINS = ["https://generativelanguage.googleapis.com/*"];

/* Whether the Gemini endpoint is already ours to call. Checked up front rather
   than inside the click handler on purpose: Chrome only allows
   permissions.request() while a user gesture is still live, and awaiting
   permissions.contains() first would spend the gesture and make the call
   throw. Firefox is happy either way. */
let apiOriginGranted = false;

async function refreshApiOriginGrant() {
  try {
    apiOriginGranted = await ext.permissions.contains({ origins: API_ORIGINS });
  } catch {
    apiOriginGranted = true; // older builds grant host permissions at install time
  }
}

function flash(el, message, kind) {
  el.textContent = message;
  el.className = `status ${kind || ""}`.trim();
  if (kind !== "err" && kind !== "warn") setTimeout(() => { if (el.textContent === message) el.textContent = ""; }, 4000);
}

function thresholdLabel(value) {
  if (value <= 20) return "Very relaxed — only the most obvious junk is blocked.";
  if (value <= 40) return "Relaxed — light entertainment still gets through.";
  if (value <= 60) return "Balanced — anything without real substance is blocked.";
  if (value <= 80) return "Strict — only clearly useful videos survive.";
  return "Ruthless — near enough nothing but material straight from your goals.";
}

function fillModels(list, selected) {
  const select = $("#model");
  select.textContent = "";
  const ids = [...new Set([...list, selected].filter(Boolean))].sort();
  for (const id of ids) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    select.append(opt);
  }
  select.value = selected;
}

async function refreshModels({ silent } = {}) {
  const key = $("#apiKey").value.trim();
  if (!key) {
    if (!silent) flash($("#modelResult"), "Paste your API key first.", "err");
    return;
  }
  if (!silent && !ageGateOk("#modelResult")) return;
  if (!silent) flash($("#modelResult"), "Asking Google what your key supports…");

  const res = await ext.runtime.sendMessage({ type: "listModels", apiKey: key });
  if (!res?.ok) {
    if (!silent) flash($("#modelResult"), res?.error || "Could not load models.", "err");
    return;
  }

  // If the saved model is not in the real list, it would 404. Move to a good one.
  const current = $("#model").value;
  const target = res.models.includes(current) ? current : res.suggested;
  fillModels(res.models, target);

  if (target !== current) {
    flash($("#modelResult"), `${res.models.length} models. Switched to ${target}, which your key has.`, "ok");
  } else if (!silent) {
    flash($("#modelResult"), `${res.models.length} models available.`, "ok");
  }
}

function renderCategoryRules(rules) {
  const host = $("#categoryRules");
  host.textContent = "";

  for (const category of CATEGORIES) {
    const row = document.createElement("div");
    row.className = "rule";

    const name = document.createElement("span");
    name.textContent = category.label;
    row.append(name);

    const seg = document.createElement("div");
    seg.className = "seg";
    const current = rules[category.id] || RULE_JUDGE;

    for (const [value, text] of [[RULE_JUDGE, "Judge"], [RULE_ALLOW, "Allow"], [RULE_BLOCK, "Block"]]) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `rule-${category.id}`;
      input.value = value;
      input.checked = current === value;
      input.dataset.category = category.id;
      input.addEventListener("change", summariseRules);

      const span = document.createElement("span");
      span.textContent = text;
      label.append(input, span);
      seg.append(label);
    }

    row.append(seg);
    host.append(row);
  }
  summariseRules();
}

function collectCategoryRules() {
  const rules = {};
  for (const input of document.querySelectorAll("#categoryRules input:checked")) {
    if (input.value !== RULE_JUDGE) rules[input.dataset.category] = input.value;
  }
  return rules;
}

/* The score only matters for categories left on Judge; say so, so nobody tunes
   a slider that no longer affects anything. */
function summariseRules() {
  const rules = collectCategoryRules();
  const blocked = Object.values(rules).filter((r) => r === RULE_BLOCK).length;
  const allowed = Object.values(rules).filter((r) => r === RULE_ALLOW).length;
  const judged = CATEGORIES.length - blocked - allowed;

  $("#ruleSummary").textContent =
    `${blocked} blocked, ${allowed} always allowed, ${judged} left to the score.`;

  const scope = $("#thresholdScope");
  if (judged === 0) {
    scope.textContent =
      "Nothing is left on Judge, so the score is unused right now — your category " +
      "rules decide everything, and the model is asked for less per video.";
  } else {
    scope.textContent = `Applies only to the ${judged} categories still set to Judge.`;
  }
}

async function load() {
  // As saved: with Strict mode off, its settings are kept here even though they do nothing.
  const settings = await getStoredSettings();

  fillModels(settings.knownModels.length ? settings.knownModels : FALLBACK_MODELS, settings.model);

  $("#apiKey").value = settings.apiKey;
  $("#ageConfirmed").checked = !!settings.ageConfirmed;
  $("#goals").value = settings.goals;
  $("#threshold").value = settings.threshold;
  $("#hardThreshold").value = settings.hardThreshold;
  $("#hardHome").checked = settings.hardHome;
  $("#cacheTtlDays").value = settings.cacheTtlDays;
  $("#shortsAlwaysTrash").checked = settings.shortsAlwaysTrash;
  $("#enforceWatch").checked = settings.enforceWatch;
  $("#breathe").checked = settings.breathe;
  $("#breatheSeconds").value = String(settings.breatheSeconds);
  $("#verse").checked = settings.verse;
  $("#insane").checked = settings.insane;
  $("#strict").checked = settings.strict;
  $("#strictDelayHours").value = String(settings.strictDelayHours);
  showPending(settings.strictPending);
  $("#anywayLimit").checked = settings.anywayPerDay >= 0;
  $("#anywayPerDay").value = settings.anywayPerDay >= 0 ? settings.anywayPerDay : DEFAULTS.anywayPerDay;
  $("#allowChannels").value = settings.allowChannels.join("\n");
  $("#blockChannels").value = settings.blockChannels.join("\n");
  $("#blockKeywords").value = settings.blockKeywords.join("\n");
  $("#redirectUrl").value = settings.redirectUrl;
  $("#blockRules").value = settings.blockRules.join("\n");
  $("#neverRules").value = settings.neverRules.join("\n");
  $("#deepMinutes").value = String(settings.deepMinutes);
  for (const [name, value] of [["reviewMode", settings.reviewMode], ["deepWhile", settings.deepWhile]]) {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }
  syncStrict();
  renderCategoryRules(settings.categoryRules || {});

  for (const box of document.querySelectorAll("[data-surface]")) {
    box.checked = settings.surfaces[box.dataset.surface] === true;
  }
  const mode = document.querySelector(`input[name="blockMode"][value="${settings.blockMode}"]`);
  if (mode) mode.checked = true;

  syncThreshold();

  // A saved key with a stale model list is exactly the 404 case; fix it quietly.
  if (settings.apiKey && !settings.knownModels.length) refreshModels({ silent: true });
}

function showPending(pending) {
  $("#strictPending").hidden = !pending;
  if (pending) {
    $("#strictPendingText").textContent =
      `Waiting: ${describeChanges(pending.changes)}. Takes effect ${formatWhen(pending.at)}.`;
  }
}

/* Strict mode's settings only show, and only count, while it is on. */
function syncStrict() {
  $("#strictOptions").hidden = !$("#strict").checked;
  $("#anywayPerDay").disabled = !$("#anywayLimit").checked;
  syncReviewMode();
  syncThreshold();
}

/* "Watch anyway" as the form stands: null = no daily limit. */
function anywayLimit() {
  if (!$("#strict").checked || !$("#anywayLimit").checked) return null;
  return Math.max(0, Math.round(Number($("#anywayPerDay").value) || 0));
}

/* The watching options only matter when something can trigger a watch.
   Insane mode always watches, always waits paused and skips no channel. */
function syncReviewMode() {
  const mode = document.querySelector('input[name="reviewMode"]:checked')?.value || "smart";
  const insane = $("#strict").checked && $("#insane").checked;
  $("#deepOptions").hidden = mode === "standard" && !insane;
  for (const input of document.querySelectorAll('input[name="deepWhile"]')) input.disabled = insane;
  $("#allowNote").hidden = !insane;

  // Zero tolerance is only as good as what Gemini gets to see; say how good.
  const minutes = Number($("#deepMinutes").value);
  const reach = minutes > 0
    ? `only the first ${minutes} minutes of each, so anything later is missed. Pick "the whole video" to cover all of it`
    : "all of each video";
  $("#neverCoverage").textContent = insane || mode === "deep"
    ? `Right now Gemini watches every video you open: ${reach}.`
    : mode === "smart"
      ? `Right now Gemini watches a video only when its details leave doubt, and then ${reach}. ` +
        "Pick Thorough to have every video watched."
      : "Right now videos are judged from their title, description and tags alone, so this only " +
        "catches what those give away. Pick Smart or Thorough so Gemini watches the video.";
}

/* The hard limit sits at or under the threshold, so dragging one slider past
   the other takes the other along. */
function syncThreshold() {
  const main = $("#threshold");
  const hard = $("#hardThreshold");
  // In Strict mode the threshold cannot go under the hard limit: lowering the
  // hard limit is what the delay guards.
  if ($("#strict").checked && Number(hard.value) > Number(main.value)) main.value = hard.value;
  const value = Number(main.value);
  const limit = Number(hard.value);

  $("#thresholdOut").textContent = value;
  $("#thresholdHint").textContent = `Videos scoring under ${value} are blocked. ${thresholdLabel(value)}`;
  $("#hardThresholdOut").textContent = limit || "Off";
  const daily = anywayLimit();
  const anyway = daily === null ? "\"Watch anyway\" is there"
    : daily === 0 ? "\"Watch anyway\" is switched off below"
      : `"Watch anyway" works ${daily === 1 ? "once" : `${daily} times`} a day`;
  $("#anywayUnit").textContent = Number($("#anywayPerDay").value) === 1 ? "time a day" : "times a day";
  const zones = [`Under ${limit}: blocked, with no way to watch it.`];
  if (value > limit) zones.push(`${limit} to ${value - 1}: blocked, but ${anyway}.`);
  zones.push(`${value} and up: plays.`);
  $("#hardThresholdHint").textContent = limit
    ? zones.join(" ")
    : `Off: every blocked video is treated alike, and ${anyway}. Drag it up to block the worst videos for good.`;
  $("#zones").style.setProperty("--hard", `${limit}%`);
  $("#zones").style.setProperty("--soft", `${value}%`);
  $("#hardHome").disabled = !limit;
}

/* Google's terms make the 18+ confirmation a precondition for using a key at
   all, so it gates saving one and gates the test call. Everything else on this
   page stays usable without it: channel and keyword rules never reach Google. */
function ageGateOk(target) {
  if ($("#ageConfirmed").checked) return true;
  flash($(target), "Tick the 18-or-older confirmation first.", "err");
  return false;
}

/* Up to twenty rules of two hundred characters: they go into every request. */
function parseRules(text) {
  return parseList(text).map((rule) => rule.slice(0, 200)).slice(0, 20);
}

async function save() {
  const surfaces = {};
  for (const box of document.querySelectorAll("[data-surface]")) {
    surfaces[box.dataset.surface] = box.checked;
  }

  if ($("#apiKey").value.trim() && !ageGateOk("#saveResult")) return false;
  if ($("#strict").checked && $("#insane").checked && !$("#apiKey").value.trim()) {
    flash($("#saveResult"), "Not saved — Insane mode needs an API key to check anything.", "err");
    return false;
  }

  const redirect = validateRedirect($("#redirectUrl").value);
  if (!redirect.ok) {
    flash($("#redirectResult"), redirect.error, "err");
    flash($("#saveResult"), "Not saved — fix the redirect address first.", "err");
    return false;
  }
  $("#redirectUrl").value = redirect.url;
  $("#redirectResult").textContent = "";

  const waiting = (await getStoredSettings()).strictPending?.at;
  const saved = await saveSettings({
    apiKey: $("#apiKey").value.trim(),
    ageConfirmed: $("#ageConfirmed").checked,
    model: $("#model").value,
    goals: $("#goals").value,
    threshold: Number($("#threshold").value),
    hardThreshold: Number($("#hardThreshold").value),
    strictDelayHours: Number($("#strictDelayHours").value),
    hardHome: $("#hardHome").checked,
    cacheTtlDays: Math.max(0, Number($("#cacheTtlDays").value) || 0),
    shortsAlwaysTrash: $("#shortsAlwaysTrash").checked,
    enforceWatch: $("#enforceWatch").checked,
    breathe: $("#breathe").checked,
    breatheSeconds: Number($("#breatheSeconds").value) || DEFAULTS.breatheSeconds,
    verse: $("#verse").checked,
    insane: $("#insane").checked,
    strict: $("#strict").checked,
    anywayPerDay: $("#anywayLimit").checked ? Math.max(0, Math.round(Number($("#anywayPerDay").value) || 0)) : -1,
    redirectUrl: redirect.url,
    blockMode: document.querySelector('input[name="blockMode"]:checked')?.value || "hide",
    reviewMode: document.querySelector('input[name="reviewMode"]:checked')?.value || "smart",
    deepMinutes: Math.max(0, Number($("#deepMinutes").value) || 0),
    deepWhile: document.querySelector('input[name="deepWhile"]:checked')?.value || "hold",
    blockRules: parseRules($("#blockRules").value),
    neverRules: parseRules($("#neverRules").value),
    categoryRules: collectCategoryRules(),
    allowChannels: parseList($("#allowChannels").value),
    blockChannels: parseList($("#blockChannels").value),
    blockKeywords: parseList($("#blockKeywords").value),
    surfaces
  });

  // Open tabs keep the settings they loaded with; only a reload applies these.
  const pending = saved.strictPending;
  if (pending && pending.at !== waiting) {
    flash($("#saveResult"), `Saved, except: ${describeChanges(pending.changes)} — Strict mode holds that until ` +
      `${formatWhen(pending.at)}. Reload your open YouTube tabs to apply the rest.`, "warn");
    await load(); // back to what is really in force
  } else {
    flash($("#saveResult"), "Saved. Reload your open YouTube tabs so they use the new settings.", "warn");
  }
  return true;
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  refreshApiOriginGrant();

  $("#threshold").addEventListener("input", syncThreshold);
  $("#hardThreshold").addEventListener("input", syncThreshold);
  $("#anywayPerDay").addEventListener("input", syncThreshold);
  $("#cancelPending").addEventListener("click", async () => {
    showPending((await saveSettings({ strictPending: null })).strictPending);
    flash($("#saveResult"), "Cancelled. Strict mode stays as it is.", "ok");
  });
  for (const box of [$("#strict"), $("#anywayLimit")]) box.addEventListener("change", syncStrict);
  for (const input of document.querySelectorAll('input[name="reviewMode"], #insane, #deepMinutes')) {
    input.addEventListener("change", syncReviewMode);
  }
  $("#save").addEventListener("click", save);

  $("#toggleKey").addEventListener("click", () => {
    const field = $("#apiKey");
    const hidden = field.type === "password";
    field.type = hidden ? "text" : "password";
    $("#toggleKey").textContent = hidden ? "Hide" : "Show";
  });

  $("#testKey").addEventListener("click", async () => {
    if (!ageGateOk("#testResult")) return;
    flash($("#testResult"), "Testing…");

    // Firefox can hold host permissions back until the user grants them; this
    // button is a user gesture, which is the only place we are allowed to ask.
    // Nothing may be awaited before request() or Chrome loses the gesture,
    // which is why the "already granted?" answer was fetched at page load.
    if (!apiOriginGranted) {
      let granted = false;
      try {
        granted = await ext.permissions.request({ origins: API_ORIGINS });
      } catch {
        granted = true; // older builds grant host permissions at install time
      }
      if (!granted) {
        flash($("#testResult"), "Access to the Google API endpoint was declined.", "err");
        return;
      }
      apiOriginGranted = true;
    }

    const probe = () =>
      ext.runtime.sendMessage({
        type: "testKey",
        apiKey: $("#apiKey").value.trim(),
        model: $("#model").value
      });

    let res = await probe();

    // A 404 means the model is gone, not that the key is bad. Re-read the real
    // model list, switch to one that exists, and try again before complaining.
    if (!res?.ok && /does not exist/i.test(res?.error || "")) {
      flash($("#testResult"), "That model is retired — finding one your key has…");
      await refreshModels({ silent: true });
      res = await probe();
    }

    if (res?.ok) {
      flash($("#testResult"), `${res.message} Using ${$("#model").value}.`, "ok");
      await save();
    } else {
      flash($("#testResult"), res?.error || "Failed.", "err");
    }
  });

  $("#loadModels").addEventListener("click", () => refreshModels());

  $("#allJudge").addEventListener("click", () => {
    for (const input of document.querySelectorAll('#categoryRules input[value="judge"]')) {
      input.checked = true;
    }
    summariseRules();
  });

  $("#redirectUrl").addEventListener("blur", () => {
    const result = validateRedirect($("#redirectUrl").value);
    if (!result.ok) flash($("#redirectResult"), result.error, "err");
    else $("#redirectResult").textContent = "";
  });

  $("#clearCache").addEventListener("click", async () => {
    await ext.runtime.sendMessage({ type: "clearCache" });
    flash($("#cacheResult"), "Cached verdicts cleared.", "ok");
  });

  $("#resetStats").addEventListener("click", async () => {
    await ext.runtime.sendMessage({ type: "resetStats" });
    flash($("#cacheResult"), "Counters reset.", "ok");
  });
});
