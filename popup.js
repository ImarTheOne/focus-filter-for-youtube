const $ = (sel) => document.querySelector(sel);

function notice(kind, text) {
  const box = document.createElement("div");
  box.className = `card warn ${kind}`;
  box.textContent = text;
  $("#notice").append(box);
}

async function render() {
  const [settings, stats, stored] = await Promise.all([
    getSettings(),
    getStats(),
    ext.storage.local.get("lastError")
  ]);

  $("#enabled").checked = settings.enabled;
  $("#enabledLabel").textContent = settings.enabled ? "On" : "Off";
  $("#blocked").textContent = stats.blocked;
  $("#allowed").textContent = stats.allowed;
  $("#apiCalls").textContent = stats.apiCalls;
  $("#watched").textContent = stats.watched;
  const blockedCats = Object.values(settings.categoryRules).filter((r) => r === RULE_BLOCK).length;
  let where = "showing a blocking screen";
  try {
    if (settings.redirectUrl) where = `sending you to ${new URL(settings.redirectUrl).hostname}`;
  } catch {
    where = "sending you to your redirect address";
  }
  const feed = anySurfaceEnabled(settings) ? " Feed filtering is on." : "";
  const breath = settings.breathe ? ` A ${settings.breatheSeconds}-second pause before every video.` : "";

  const how = settings.insane ? "by watching every one, no skipping (Insane mode)," : {
    standard: "from their details",
    smart: "from their details, watching them when unsure,",
    deep: "by watching them"
  }[settings.reviewMode] || "from their details";
  const rules = (settings.neverRules.length ? ` ${settings.neverRules.length} things never shown.` : "") +
    (settings.blockRules.length ? ` ${settings.blockRules.length} content rules.` : "");

  $("#thresholdLine").textContent =
    `Checking videos ${how} when you open them, and ${where}. ` +
    `${blockedCats} categories blocked outright, the rest judged under ${settings.threshold}/100.${rules}${feed}${breath}`;

  $("#notice").textContent = "";
  if (!settings.apiKey) {
    notice("err", "No API key yet. Open Settings and paste a Google AI Studio key to start filtering.");
  }
  const lastError = stored.lastError;
  if (lastError && Date.now() - lastError.at < 10 * 60 * 1000) {
    notice("err", `Last API error: ${lastError.message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  render();

  $("#enabled").addEventListener("change", async (event) => {
    await saveSettings({ enabled: event.target.checked });
    render();
  });

  $("#openOptions").addEventListener("click", () => {
    ext.runtime.openOptionsPage();
    window.close();
  });
});
