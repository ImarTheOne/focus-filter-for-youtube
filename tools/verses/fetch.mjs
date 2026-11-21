// Fetches each reference in refs.txt from bible-api.com (World English Bible,
// British Edition, public domain) into raw.json. Resumable; ~2.2 s apart to
// stay under the service's 15-requests-per-30-seconds limit.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const refs = readFileSync("refs.txt", "utf8").split("\n").map((x) => x.trim()).filter(Boolean);
const out = existsSync("raw.json") ? JSON.parse(readFileSync("raw.json", "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const ref of refs) {
  if (out[ref]) continue;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=webbe`);
      if (res.status === 429) { await sleep(20000); continue; }
      if (!res.ok) { out[ref] = { error: res.status }; break; }
      const data = await res.json();
      out[ref] = { text: data.text, reference: data.reference, n: data.verses?.length, tr: data.translation_id };
      break;
    } catch (err) { await sleep(5000); }
  }
  writeFileSync("raw.json", JSON.stringify(out, null, 1));
  await sleep(2200);
}
console.log("done", Object.keys(out).length, "of", refs.length, "errors:", Object.entries(out).filter(([, v]) => v.error).map(([k]) => k));
