// Turns raw.json into the extension's verses.js: tidy the text, keep those
// short enough for the screen, and shuffle them with a fixed seed so
// neighbouring days mostly come from different books.
import { readFileSync, writeFileSync } from "node:fs";
const refs = readFileSync("refs.txt", "utf8").split("\n").map((x) => x.trim()).filter(Boolean);
const raw = JSON.parse(readFileSync("raw.json", "utf8"));
const MAX = 260;
// Cut out of a longer sentence these do not stand on their own.
const DROP = ["Isaiah 30:15", "Psalm 37:5", "Ephesians 4:2", "1 Corinthians 13:6-7", "2 Peter 1:3", "Romans 10:9",
  "1 Thessalonians 4:11-12", "Ephesians 4:23-24", "Acts 17:27-28", "Habakkuk 3:18-19"];

let verses = [];
for (const ref of refs) {
  const hit = raw[ref];
  if (!hit?.text || DROP.includes(ref)) continue;
  let text = hit.text.replace(/\s+/g, " ").trim();
  // A verse cut out of a longer speech can open a quotation it never closes,
  // or close one it never opened: complete it.
  let depth = 0, unopened = 0;
  for (const ch of text) {
    if (ch === "“") depth++;
    else if (ch === "”") depth ? depth-- : unopened++;
  }
  text = "“".repeat(unopened) + text + "”".repeat(depth);
  // Cut out of a longer sentence: start with a capital, end with a full stop.
  text = text.replace(/^(“?)(\p{Ll})/u, (_, q, c) => q + c.toUpperCase());
  if (!/[.!?][’”]*$/.test(text)) text = text.replace(/[,;:—]?([’”]*)$/, ".$1");
  if (text.length > MAX) continue;
  verses.push([ref, text]);
}
let seed = 20261120;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (let i = verses.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [verses[i], verses[j]] = [verses[j], verses[i]]; }

const out = `/* The verses of the day for the breathing screen: ${verses.length} verses, a new one
   each day, chosen by the date in background.js. They ship with the extension
   so that showing one fetches nothing.

   Text: World English Bible, British Edition — public domain. Only the edges
   of a verse were touched, where it was cut out of a longer passage: line
   breaks were joined, a quotation left open or unopened was completed, the
   first letter was capitalised, and a closing comma, semicolon, colon or dash
   became a full stop. */

/* eslint-disable no-unused-vars */
const VERSES = [
${verses.map((v) => "  " + JSON.stringify(v)).join(",\n")}
];
`;
writeFileSync(process.argv[2], out);
console.log("wrote", verses.length, "longest", Math.max(...verses.map((v) => v[1].length)));
// What the tidying changed, for a look.
for (const [ref, text] of verses) {
  const before = raw[ref].text.replace(/\s+/g, " ").trim();
  if (before !== text) console.log(ref, "|", before.slice(0, 28), "…", before.slice(-22), "=>", text.slice(0, 28), "…", text.slice(-22));
}
