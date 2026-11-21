/* A fake of the few extension APIs the pages use, for tests/serve.js.

   Settings live in this tab's sessionStorage, so the settings page can save
   and reload. On the harness, query parameters override them:

     breathe=1 seconds=5 verse=1 insane=1 mode=standard|smart|deep while=hold|play
     key=0                  no API key
     verdict=allowed|blocked|soft|hard|never|none   what the fake background
                            answers; a tile titled "… [hard]" gets that one
     threshold=50 hard=25 hardHome=0 feed=1   the two lines on the score, and
                            whether the home page hides all blocked tiles
     anyway=3 used=2        "Watch anyway" per day, and how many are spent
     strict=0|1             Strict mode; on by itself with insane, hard or anyway
     delay=3000             how long it takes to answer, in ms
     blockWord=prank title=… channel=…    for the local lists
     frames=timer           draw frames from a timer, for a browser pane that
                            is hidden and therefore gets none                */

(() => {
  const q = new URLSearchParams(location.search);
  if (q.get("frames") === "timer") {
    window.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 16);
  }
  const saved = JSON.parse(sessionStorage.getItem("settings") || "null");
  const fromQuery = {
    schemaVersion: 3, // = SCHEMA_VERSION, or migrate() rewrites these as an old install
    apiKey: q.get("key") === "0" ? "" : "test-key",
    ageConfirmed: true,
    breathe: q.get("breathe") === "1",
    breatheSeconds: Number(q.get("seconds")) || 25,
    verse: q.get("verse") === "1",
    insane: q.get("insane") === "1",
    strict: q.has("strict") ? q.get("strict") === "1" : ["insane", "hard", "anyway"].some((k) => q.has(k)),
    anywayPerDay: q.has("anyway") ? Number(q.get("anyway")) : -1,
    reviewMode: q.get("mode") || "standard",
    deepWhile: q.get("while") || "hold",
    blockKeywords: q.get("blockWord") ? [q.get("blockWord")] : [],
    threshold: Number(q.get("threshold")) || 50,
    hardThreshold: Number(q.get("hard")) || 0,
    hardHome: q.get("hardHome") !== "0",
    surfaces: { home: q.get("feed") === "1" }
  };
  const store = { settings: location.pathname.endsWith(".html") ? saved || { apiKey: "test-key", ageConfirmed: true } : fromQuery };

  const verdicts = {
    allowed: { blocked: false, via: "score", s: 80, c: "education", r: "A solid tutorial." },
    blocked: { blocked: true, via: "score", s: 20, c: "drama", why: "Mostly gossip.", r: "Mostly gossip." },
    soft: { blocked: true, via: "score", s: 35, c: "entertainment", why: "Light fun, little substance." },
    hard: { blocked: true, hard: true, via: "score", s: 10, c: "drama", why: "Pure celebrity gossip." },
    never: {
      blocked: true, via: "never", c: "education", d: true,
      why: 'Contains something you never want to see: "gambling". A betting sponsor segment at 12:40.',
      m: "A maths lecture on probability with a betting sponsor read in the middle."
    }
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const messages = [];
  let used = Number(q.get("used")) || 0;
  window.mock = { messages, store };

  globalThis.chrome = {
    runtime: {
      openOptionsPage() {},
      async sendMessage(msg) {
        messages.push(msg);
        if (msg.type === "verse") {
          // The longest verse in the list: the worst case for the layout.
          const [ref, text] = [...VERSES].sort((a, b) => b[1].length - a[1].length)[0];
          return { ok: true, ref, text };
        }
        if (msg.type === "anyway") {
          const limit = applyStrict(store.settings).anywayPerDay;
          if (!(limit >= 0)) return { ok: true, left: null, limit: null };
          const left = Math.max(0, limit - used);
          if (!msg.take) return { ok: true, left, limit };
          if (!left) return { ok: false, left: 0, limit };
          used++;
          return { ok: true, left: left - 1, limit };
        }
        if (msg.type === "listModels") return { ok: true, models: ["gemini-flash-lite-latest"], suggested: "gemini-flash-lite-latest" };
        await sleep(Number(q.get("delay")) || 50);
        const word = store.settings.blockKeywords?.[0];
        const verdictFor = (item) => word && item?.title.toLowerCase().includes(word)
          ? { local: true, via: "local", blocked: true, why: `Title contains your blocked word "${word}".` }
          : store.settings.apiKey ? verdicts[item?.title.match(/\[(\w+)\]/)?.[1] || q.get("verdict") || "allowed"] || null : null;
        if (msg.type === "review") return { ok: true, verdict: verdictFor(msg.item) };
        if (msg.type === "classify") {
          const out = {};
          for (const item of msg.items) if (verdictFor(item)) out[item.id] = verdictFor(item);
          return { ok: true, verdicts: out, watchNext: false };
        }
        return { ok: true };
      }
    },
    permissions: { contains: async () => true, request: async () => true },
    storage: {
      onChanged: { addListener() {} },
      local: {
        get: async (key) => ({ [key]: store[key] }),
        set: async (patch) => {
          Object.assign(store, patch);
          if (patch.settings) sessionStorage.setItem("settings", JSON.stringify(patch.settings));
        }
      }
    }
  };
})();
