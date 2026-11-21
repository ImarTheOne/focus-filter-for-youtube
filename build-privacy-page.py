#!/usr/bin/env python3
"""Renders PRIVACY.md into docs/privacy-policy.html.

Kept as a script rather than a hand-written page so the hosted policy can never
drift from the one in the repo. Re-run it after editing PRIVACY.md.
"""
import html as H
import re
import sys

SRC, OUT = "PRIVACY.md", "docs/privacy-policy.html"

def inline(t):
    t = H.escape(t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"&lt;(https?://[^&]+)&gt;", r'<a href="\1">\1</a>', t)
    t = re.sub(r"&lt;([\w.+-]+@[\w.-]+)&gt;", r'<a href="mailto:\1">\1</a>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", t)
    # _underscore italics_ too. Bounded by non-word chars so it can never chew
    # through a snake_case identifier that happens to appear in prose.
    t = re.sub(r"(?<![\w>])_([^_<>]+)_(?![\w])", r"<em>\1</em>", t)
    return t

def convert(md):
    out, i, lines = [], 0, md.split("\n")
    while i < len(lines):
        ln = lines[i]
        if not ln.strip():
            i += 1; continue
        if ln.strip() == "---":
            out.append("<hr>"); i += 1; continue
        m = re.match(r"^(#{1,6})\s+(.*)$", ln)
        if m:
            lv = len(m.group(1))
            out.append(f"<h{lv}>{inline(m.group(2))}</h{lv}>"); i += 1; continue
        # table
        if ln.lstrip().startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i+1]):
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            out.append("<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in cells) + "</tr></thead><tbody>")
            i += 2
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                row = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>")
                i += 1
            out.append("</tbody></table>"); continue
        # list
        if re.match(r"^\s*-\s+", ln):
            out.append("<ul>")
            while i < len(lines) and (re.match(r"^\s*-\s+", lines[i]) or (lines[i].startswith("  ") and lines[i].strip())):
                if re.match(r"^\s*-\s+", lines[i]):
                    # Join the item's continuation lines BEFORE formatting: bold
                    # and links routinely wrap across lines in the source, and
                    # converting line-by-line would split the markers apart.
                    parts = [re.sub(r"^\s*-\s+", "", lines[i])]
                    i += 1
                    while i < len(lines) and lines[i].startswith("  ") and lines[i].strip() and not re.match(r"^\s*-\s+", lines[i]):
                        parts.append(lines[i].strip()); i += 1
                    out.append("<li>" + inline(" ".join(parts)) + "</li>")
                else:
                    i += 1
            out.append("</ul>"); continue
        # paragraph
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{1,6}\s|\s*-\s|\s*\||---\s*$)", lines[i]):
            buf.append(lines[i].strip()); i += 1
        if buf:
            out.append("<p>" + inline(" ".join(buf)) + "</p>")
    return "\n".join(out)

body = convert(open(SRC, encoding="utf-8").read())
title = "Privacy Policy — Focus Filter for YouTube"

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{H.escape(title)}</title>
<style>
  :root {{
    --bg:#ffffff; --fg:#1a1d23; --muted:#5b6472; --line:#e3e7ee;
    --accent:#1a56db; --code-bg:#f3f5f9;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      --bg:#0f1115; --fg:#e6e9ef; --muted:#98a2b3; --line:#252a33;
      --accent:#7aa2f7; --code-bg:#1a1f27;
    }}
  }}
  :root[data-theme="dark"] {{
    --bg:#0f1115; --fg:#e6e9ef; --muted:#98a2b3; --line:#252a33;
    --accent:#7aa2f7; --code-bg:#1a1f27;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin:0; padding:3rem 1.25rem 5rem; background:var(--bg); color:var(--fg);
    font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }}
  main {{ max-width: 46rem; margin: 0 auto; }}
  h1 {{ font-size:1.9rem; line-height:1.25; margin:0 0 .5rem; letter-spacing:-.02em; }}
  h2 {{ font-size:1.3rem; margin:2.5rem 0 .75rem; padding-top:1.25rem; border-top:1px solid var(--line); letter-spacing:-.01em; }}
  h3 {{ font-size:1.05rem; margin:1.75rem 0 .5rem; }}
  p, li {{ color:var(--fg); }}
  em {{ color:var(--muted); font-style:italic; }}
  a {{ color:var(--accent); text-decoration:underline; text-underline-offset:2px; }}
  code {{ background:var(--code-bg); padding:.15em .4em; border-radius:4px;
          font:13.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; word-break:break-word; }}
  ul {{ padding-left:1.25rem; }}
  li {{ margin:.35rem 0; }}
  hr {{ border:0; border-top:1px solid var(--line); margin:2.5rem 0 1.5rem; }}
  .table-wrap {{ overflow-x:auto; margin:1rem 0; }}
  table {{ border-collapse:collapse; width:100%; min-width:32rem; font-size:.94rem; }}
  th, td {{ border:1px solid var(--line); padding:.6rem .7rem; text-align:left; vertical-align:top; }}
  th {{ background:var(--code-bg); font-weight:600; }}
  body > main > p:last-of-type {{ color:var(--muted); font-size:.9rem; }}
</style>
</head>
<body>
<main>
{body}
</main>
</body>
</html>
"""
# Tables need a scroll container so narrow screens never scroll the whole page.
page = page.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
open(OUT, "w", encoding="utf-8").write(page)
print(f"wrote {OUT} ({len(page):,} bytes)")
