import { esc, inlineHtml } from "./blocks.mjs";
import { renderHtml } from "./blocks.mjs";

export const BASE = "https://docs.dyslexiasteps.com";
export const MAIN = "https://dyslexiasteps.com";
export const ORG = "https://github.com/Dyslexia-Steps";

/** Gezinme: bölüm → [yol, etiket]. Yol sırası = önceki/sonraki sırası. */
export function buildNav(clients) {
  return [
    ["Getting started", [["/", "Overview"], ["/quickstart", "Quickstart"]]],
    ["MCP server", [["/mcp", "Overview"], ...clients.map((c) => [`/mcp/${c.id}`, c.name]), ["/mcp/tools", "Tool reference"]]],
    ["Word lists", [["/data", "Files and schema"]]],
    ["Reference", [["/faq", "FAQ and troubleshooting"], ["/changelog", "Changelog"], ["/llms.txt", "llms.txt"]]],
  ];
}

export const CSS = `
:root{--bg:#fbfaf7;--fg:#17151f;--soft:#4b4858;--mute:#7b7788;--line:#e6e2da;--card:#fff;--acc:#4f46e5;--acc-soft:#eceafd;--code:#f1efe9}
@media (prefers-color-scheme:dark){:root{--bg:#121118;--fg:#efedf5;--soft:#bdb9cb;--mute:#8b879a;--line:#2a2833;--card:#1a1822;--acc:#a5b4fc;--acc-soft:#23214a;--code:#1f1d29}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 Inter,system-ui,-apple-system,Segoe UI,sans-serif}
a{color:var(--acc);text-underline-offset:2px}
.top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:16px;padding:12px 20px;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.brand{font:600 18px Georgia,serif;color:var(--fg);text-decoration:none}.brand span{color:var(--mute);font:500 13px Inter,sans-serif;margin-left:8px}
.top nav{margin-left:auto;display:flex;gap:18px;font-size:14px}.top nav a{color:var(--soft);text-decoration:none}.top nav a:hover{color:var(--acc)}
.shell{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:250px minmax(0,1fr);gap:48px;padding:0 20px}
.side{position:sticky;top:58px;align-self:start;max-height:calc(100vh - 58px);overflow:auto;padding:28px 0 40px;font-size:14px}
.side h4{margin:18px 0 6px;font:600 11px Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}.side h4:first-child{margin-top:0}
.side a{display:block;padding:4px 10px;margin-left:-10px;border-radius:8px;color:var(--soft);text-decoration:none}.side a:hover{background:var(--acc-soft)}
.side a[aria-current=page]{background:var(--acc-soft);color:var(--acc);font-weight:600}
main{padding:36px 0 80px;min-width:0}
.crumbs{font-size:13px;color:var(--mute);margin-bottom:10px}.crumbs a{color:var(--mute)}
h1{font:600 38px/1.15 Georgia,serif;letter-spacing:-.01em;margin:0 0 6px}
.meta{font-size:13px;color:var(--mute);margin:0 0 20px}
.lede{font-size:18px;color:var(--soft);margin:0 0 8px}
h2{font:600 25px/1.25 Georgia,serif;margin:44px 0 8px;scroll-margin-top:72px}h3{font-size:17px;margin:26px 0 6px;scroll-margin-top:72px}
p,li{color:var(--soft)}li{margin:5px 0}
code{background:var(--code);padding:1px 6px;border-radius:5px;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--fg)}
.code{margin:16px 0;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--code)}
.code-head{display:flex;justify-content:space-between;align-items:center;padding:6px 12px;font-size:12px;font-weight:600;color:var(--soft);border-bottom:1px solid var(--line)}
.code-head button{border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:99px;padding:2px 12px;font:600 12px Inter,sans-serif;cursor:pointer}
pre{margin:0;padding:14px 16px;overflow-x:auto}pre code{background:none;padding:0;font-size:12.5px;line-height:1.6}
.table-wrap{overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:12px}
table{border-collapse:collapse;width:100%;font-size:14px}th{background:var(--card);text-align:left;font-weight:600;color:var(--fg)}
th,td{padding:9px 14px;border-top:1px solid var(--line);vertical-align:top}thead th{border-top:0}
.note{margin:16px 0;padding:12px 16px;border-radius:12px;background:var(--acc-soft);font-size:14.5px;color:var(--soft)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:18px 0}
.card{display:block;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:var(--card);text-decoration:none;color:var(--fg)}.card:hover{border-color:var(--acc)}
.card b{display:block;margin-bottom:4px}.card span{font-size:14px;color:var(--soft)}
.pager{display:flex;justify-content:space-between;gap:12px;margin-top:56px;padding-top:20px;border-top:1px solid var(--line);font-size:14px}
footer{border-top:1px solid var(--line);padding:26px 20px;text-align:center;font-size:13px;color:var(--mute)}footer a{color:var(--mute)}
@media(max-width:860px){.shell{grid-template-columns:1fr;gap:0}.side{position:static;max-height:none;padding:16px 0 0;border-bottom:1px solid var(--line)}h1{font-size:30px}.top nav a:not(:last-child){display:none}}
`;

export const JS = `
document.addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(!b)return;
var t=b.closest(".code").querySelector("code").innerText;
navigator.clipboard.writeText(t).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1600)}).catch(function(){})});
`;

export function page({ p, nav, flat, updated }) {
  const url = BASE + p.path;
  const idx = flat.findIndex((x) => x.path === p.path);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  const section = nav.find(([, items]) => items.some(([path]) => path === p.path));
  const ld = [
    { "@context": "https://schema.org", "@type": "TechArticle", headline: p.h1, description: p.description, url, dateModified: updated, inLanguage: "en", isPartOf: { "@type": "WebSite", name: "Dyslexia Steps developer docs", url: BASE + "/" }, publisher: { "@type": "Organization", name: "Dyslexia Steps", url: MAIN } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Docs", item: BASE + "/" },
      ...(p.path === "/" ? [] : [{ "@type": "ListItem", position: 2, name: p.h1, item: url }]),
    ] },
    ...(p.faq ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/[`*]/g, "") } })) }] : []),
  ];
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Dyslexia Steps developer docs"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${MAIN}/logo.png">
<link rel="alternate" type="text/plain" href="${BASE}/llms.txt" title="llms.txt">
<link rel="stylesheet" href="/assets/docs.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head><body>
<header class="top"><a class="brand" href="/">Dyslexia Steps<span>Developer docs</span></a>
<nav><a href="${MAIN}/word-lists-by-grade">Word lists by grade</a><a href="${ORG}" target="_blank" rel="noopener">GitHub</a><a href="${MAIN}">dyslexiasteps.com</a></nav></header>
<div class="shell">
<aside class="side" aria-label="Documentation">${nav.map(([title, items]) => `<h4>${esc(title)}</h4>${items.map(([path, label]) => `<a href="${path}"${path === p.path ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("")}`).join("")}</aside>
<main>
<div class="crumbs"><a href="/">Docs</a>${section && p.path !== "/" ? ` / ${esc(section[0])}` : ""}${p.path !== "/" ? ` / ${esc(p.h1)}` : ""}</div>
<h1>${esc(p.h1)}</h1>
<p class="meta">Updated ${esc(updated)}</p>
<p class="lede" data-speakable>${inlineHtml(p.lede)}</p>
${renderHtml(p.blocks)}
<div class="pager"><span>${prev ? `<a href="${prev.path}">&larr; ${esc(prev.label)}</a>` : ""}</span><span>${next ? `<a href="${next.path}">${esc(next.label)} &rarr;</a>` : ""}</span></div>
</main></div>
<footer>Dyslexia Steps developer docs · code MIT, word lists CC BY 4.0 · <a href="${MAIN}/word-lists-by-grade#how-placement-works">how grades are placed</a> · <a href="${ORG}" target="_blank" rel="noopener">GitHub</a> · <a href="/llms.txt">llms.txt</a></footer>
<script src="/assets/docs.js" defer></script>
</body></html>`;
}
