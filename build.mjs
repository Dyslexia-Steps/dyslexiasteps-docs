// Docs sitesi üreticisi: sayfa blokları → HTML + sitemap + llms.txt + llms-full.txt.
// Araç referansı elle yazılmıyor: yayınlanmış MCP paketi başlatılıp `tools/list` ve örnek
// çağrıların GERÇEK yanıtları alınıyor; sayılar yayınlanmış veri paketinden okunuyor.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { renderMd } from "./lib/blocks.mjs";
import { BASE, CSS, JS, MAIN, ORG, buildNav, page } from "./lib/layout.mjs";

const require = createRequire(import.meta.url);
const S = JSON.parse(readFileSync(new URL("./content/shared.json", import.meta.url), "utf8"));
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const dataDir = dirname(require.resolve("dyslexiasteps-data"));
const mcpDir = join(dirname(require.resolve("dyslexiasteps-mcp/dist/stdio.js")), "..");
const dataPkg = readJson(join(dataDir, "package.json"));
const mcpPkg = readJson(join(mcpDir, "package.json"));
const wl = readJson(join(dataDir, "word-lists.json"));
// Gömülebilir oyun kataloğu ve platform rehberi: sitedeki lib/embedTargets.ts ve content/embedGuide.ts'in kopyası (README'de yazıyor).
const catalog = JSON.parse(readFileSync(new URL("./content/embed-catalog.json", import.meta.url), "utf8"));
const platforms = JSON.parse(readFileSync(new URL("./content/platforms.json", import.meta.url), "utf8"));

const UPDATED = "2026-10-18";
const URL_MCP = S.MCP_URL;
const code = (label, c) => ({ t: "code", label, code: c });

// Sayılar yayınlanmış veriden (elle yazılmış sayı yok).
const en = wl.lists.filter((l) => l.language === "en");
const other = wl.lists.filter((l) => l.language !== "en");
const uniqueEn = new Set(en.flatMap((l) => l.words)).size;
const kLists = en.filter((l) => l.gradeFrom && wl.grades.findIndex((g) => g.label === l.gradeFrom) <= 1 && wl.grades.findIndex((g) => g.label === l.gradeTo) >= 1).length;
if (String(kLists) !== S.MCP_CHECK_ANSWER) throw new Error(`MCP_CHECK_ANSWER ${S.MCP_CHECK_ANSWER} ≠ veriden ${kLists}`);
const nf = (n) => n.toLocaleString("en-US");

/* ------------------------------------------------ gerçek MCP: araç şemaları */
const client = new Client({ name: "docs-build", version: "0" });
await client.connect(new StdioClientTransport({ command: "node", args: [require.resolve("dyslexiasteps-mcp/dist/stdio.js")] }));
const { tools } = await client.listTools();
const SAMPLE = {
  list_word_lists: { grade: "kindergarten", section: "cvc" },
  get_word_list: { id: "short-a" },
  get_words_for_grade: { grade: "grade-1", section: "digraphs", limit: 8 },
  find_words: { starts_with: "sh", language: "en", limit: 6 },
  get_placement_basis: {},
  get_citation: {},
};
const calls = {};
for (const t of tools) {
  const r = await client.callTool({ name: t.name, arguments: SAMPLE[t.name] ?? {} });
  calls[t.name] = JSON.parse(r.content[0].text);
}
await client.close();
const missing = S.MCP_TOOLS.filter((t) => !tools.some((x) => x.name === t.name));
if (missing.length || tools.length !== S.MCP_TOOLS.length) throw new Error(`araç listesi paketle uyuşmuyor: ${missing.map((m) => m.name)}`);

const clip = (obj, max = 2200) => {
  const s = JSON.stringify(obj, null, 2);
  return s.length <= max ? s : `${s.slice(0, max).replace(/\n[^\n]*$/, "")}\n  … (truncated)`;
};

const toolBlocks = tools.flatMap((t) => {
  const props = t.inputSchema?.properties ?? {};
  const req = new Set(t.inputSchema?.required ?? []);
  const rows = Object.entries(props).map(([k, v]) => [`\`${k}\``, v.enum ? `enum: ${v.enum.map((e) => `\`${e}\``).join(", ")}` : v.type, req.has(k) ? "yes" : "no", v.description ?? ""]);
  const args = SAMPLE[t.name] ?? {};
  return [
    { t: "h2", text: t.name },
    { t: "p", text: t.description },
    rows.length ? { t: "table", head: ["Parameter", "Type", "Required", "Description"], rows } : { t: "p", text: "No parameters." },
    code("Example request (MCP tools/call)", JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: t.name, arguments: args } }, null, 2)),
    code("Real response (from the published server at build time)", clip(calls[t.name])),
  ];
});

/* ------------------------------------------------------------------- sayfalar */
const clients = S.MCP_CLIENTS;
const pages = [];

pages.push({
  path: "/", label: "Overview", title: "Dyslexia Steps Developer Docs: Word Lists Dataset and MCP Server",
  description: "Developer documentation for Dyslexia Steps: free English phonics and sight word lists placed by grade with sources, as CSV, JSON and an MCP server for AI assistants. Open source.",
  h1: "Dyslexia Steps developer docs",
  lede: `Two free, open-source building blocks from [Dyslexia Steps](${MAIN}): the word lists as data (CSV, JSON and an npm package) and an MCP server that lets AI assistants such as Claude, ChatGPT, Codex and Cursor look the lists up. ${en.length} English lists with ${nf(uniqueEn)} different words are placed from Pre-K to Grade 3, each with the source of its placement.`,
  blocks: [
    { t: "h2", text: "Start here" },
    { t: "table", head: ["I want to…", "Go to"], rows: [
      ["Let an AI assistant look up word lists for a class", "[MCP server](/mcp)"],
      ["Download the lists as CSV or JSON, or use them in code", "[Word lists dataset](/data)"],
      ["Put a free reading game on my website", "[Embed the games](/embed)"],
      ["Try it in two minutes", "[Quickstart](/quickstart)"],
      ["See the lists as pages you can print", `[Word lists by grade](${MAIN}/word-lists-by-grade)`],
    ] },
    { t: "h2", text: "What is published" },
    { t: "table", head: ["Package", "Version", "What it is", "Source"], rows: [
      ["`dyslexiasteps-mcp`", mcpPkg.version, "Read-only MCP server: six tools, stdio and hosted HTTP", `[GitHub](${S.MCP_REPO})`],
      ["`dyslexiasteps-data`", dataPkg.version, "The word lists as JSON and CSV with small helpers", `[GitHub](${S.DATA_REPO})`],
      ["`dyslexiasteps-embed`", "0.1.0", "The free reading games as a web component and React wrapper", `[GitHub](${S.GITHUB_ORG}/dyslexiasteps-embed)`],
    ] },
    { t: "h2", text: "What the lists are, and are not" },
    { t: "p", text: `The English lists are phonics and sight word lists (CVC words, word families, digraphs, vowel teams, Dolch sight words and more). Each is placed at the grade where a Common Core Foundational Skills item or Dolch's classic list first expects it, and says which. Another ${other.length} lists in ${new Set(other.map((l) => l.language)).size} languages (German, Spanish, French, Dutch, Brazilian Portuguese) follow each language's own reading curriculum and have no grade.` },
    { t: "note", text: "A grade is a typical guide, not a rule: programs and standards differ, and a placement is not an assessment of any child. The free screening test on dyslexiasteps.com is a screening, not a diagnosis; only a specialist can diagnose dyslexia." },
    { t: "h2", text: "Licenses" },
    { t: "ul", items: ["**Code** (MCP server, dataset package, these docs): MIT.", `**Word lists** (the compilation: selection, grouping, grade placement): CC BY 4.0. Credit Dyslexia Steps and link [word lists by grade](${MAIN}/word-lists-by-grade). The Dolch words are public domain.`] },
  ],
});

pages.push({
  path: "/quickstart", label: "Quickstart", title: "Quickstart: Connect an AI Assistant to Dyslexia Steps Word Lists in Two Minutes",
  description: "Add the hosted MCP server to Claude, ChatGPT, Codex or Cursor, ask for word lists by grade, verify with curl, then use the dataset in code. Copy-paste commands.",
  h1: "Quickstart",
  lede: "Connect an AI assistant to the word lists, check it works, then use the data in code. No account and no API key are needed for any step.",
  blocks: [
    { t: "h2", text: "1. Connect your assistant" },
    { t: "p", text: "The hosted server works in every client that supports remote MCP servers. Claude Code is one command:" },
    code("Claude Code", `claude mcp add --transport http --scope user dyslexiasteps ${URL_MCP}`),
    { t: "p", text: `For other clients use the same URL: \`${URL_MCP}\`. Step-by-step pages: ${clients.map((c) => `[${c.name}](/mcp/${c.id})`).join(", ")}.` },
    { t: "h2", text: "2. Ask a question" },
    { t: "p", text: S.MCP_CHECK_PROMPT },
    { t: "p", text: `The answer should be **${S.MCP_CHECK_ANSWER}**, counted by the \`list_word_lists\` tool.` },
    { t: "h2", text: "3. Check without a client" },
    code("curl", `curl -s ${URL_MCP} \\\n  -H 'content-type: application/json' \\\n  -H 'accept: application/json, text/event-stream' \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`),
    { t: "p", text: "The address `https://mcp.dyslexiasteps.com/health` answers `ok`. The server is stateless and accepts only `POST /mcp`, so a browser visit to `/mcp` shows 405." },
    { t: "h2", text: "4. Use the data directly" },
    code("JavaScript", `npm install dyslexiasteps-data\n\nimport { wordsForGrade } from "dyslexiasteps-data";\nwordsForGrade("kindergarten").length;`),
    { t: "p", text: "Files, columns and examples in Python and R are on the [dataset page](/data)." },
    { t: "h2", text: "5. Put a game on a page" },
    code("HTML", `<div data-dys-game="listen" data-list="short-a"></div>\n<script async src="${MAIN}/embed.js"></script>`),
    { t: "p", text: "Options, languages, platform steps and the credit-line terms are on the [embed page](/embed)." },
  ],
});

pages.push({
  path: "/mcp", label: "Overview", title: "MCP Server: Phonics and Sight Word Lists by Grade for AI Assistants",
  description: "A free, read-only MCP server with phonics and sight word lists placed from Pre-K to Grade 3, with the source of each placement. Hosted URL or npx; open source.",
  h1: "MCP server",
  lede: `A free, read-only Model Context Protocol server. It gives an AI assistant ${en.length} English word lists placed by grade with sources, and ${other.length} lists in five other languages, so a teacher can ask for "20 words with sh for a first grader" and get an answer from sourced lists. Hosted at \`${URL_MCP}\`, or run locally with \`npx -y ${S.MCP_NPM}\`.`,
  blocks: [
    { t: "h2", text: "Hosted or local" },
    { t: "table", head: ["", "Hosted", "Local (npx)"], rows: [
      ["Install", "Nothing", `Node.js 18+, \`npx -y ${S.MCP_NPM}\``],
      ["Works in ChatGPT and Claude custom connectors", "Yes", "No (they cannot start a local process)"],
      ["Works offline", "No", "Yes"],
      ["Tools", "Same six", "Same six"],
    ] },
    { t: "h2", text: "Connect your client" },
    { t: "ul", items: clients.map((c) => `[${c.name}](/mcp/${c.id}): ${c.summary.replace(/`/g, "")}`) },
    { t: "h2", text: "Tools" },
    { t: "table", head: ["Tool", "What it returns"], rows: S.MCP_TOOLS.map((t) => [`[\`${t.name}\`](/mcp/tools#${t.name.replace(/_/g, "-")})`, t.returns]) },
    { t: "p", text: "Parameters and real example responses are on the [tool reference](/mcp/tools)." },
    { t: "h2", text: "What it does not do" },
    { t: "ul", items: S.NOT_DOING },
    { t: "h2", text: "Example questions" },
    { t: "ul", items: S.MCP_EXAMPLES.map((e) => `“${e}”`) },
  ],
});

for (const c of clients) {
  pages.push({
    path: `/mcp/${c.id}`, label: c.name,
    title: `Connect ${c.name} to the Dyslexia Steps MCP Server`,
    description: `How to add the Dyslexia Steps word lists MCP server to ${c.name}: ${c.summary.replace(/`/g, "")}`.slice(0, 200),
    h1: `Connect ${c.name}`,
    lede: c.summary,
    blocks: [
      { t: "h2", text: "Steps" },
      { t: "ol", items: c.steps },
      { t: "h2", text: "Configuration" },
      ...c.code.map((b) => code(b.label, b.code)),
      { t: "h2", text: "Check it works" },
      { t: "p", text: `Ask: “${S.MCP_CHECK_PROMPT}” The answer should be ${S.MCP_CHECK_ANSWER}.` },
      ...(c.note ? [{ t: "note", text: c.note }] : []),
      { t: "p", text: `Source for the ${c.name} syntax: [${c.source.label}](${c.source.url}). Client menus and file locations change; if a step no longer matches, follow that page and tell us on [GitHub](${S.MCP_REPO}/issues).` },
      { t: "p", text: "See also the [tool reference](/mcp/tools) and [troubleshooting](/faq#troubleshooting)." },
    ],
  });
}

pages.push({
  path: "/mcp/tools", label: "Tool reference", title: "MCP Tool Reference: Parameters and Real Responses",
  description: "Reference for all six tools of the Dyslexia Steps MCP server: parameters, types, example requests and real responses generated from the published server.",
  h1: "Tool reference",
  lede: `Six read-only tools. This page is generated at build time from the published \`${S.MCP_NPM}\` package (version ${mcpPkg.version}): the parameters come from the server's own \`tools/list\` and the responses from calling each tool, so it cannot drift from the server.`,
  blocks: [{ t: "note", text: "Every tool is read-only, needs no authentication and assesses no child. Invalid input returns a result with `isError: true` and a message that points to the valid options." }, ...toolBlocks],
});

pages.push({
  path: "/data", label: "Files and schema", title: "Word Lists Dataset: CSV and JSON by Grade, Schema, Examples and License",
  description: "Download free phonics and sight word lists placed from Pre-K to Grade 3 as CSV and JSON, with the source of each placement. Columns, examples in curl, JavaScript, Python and R. CC BY 4.0.",
  h1: "Word lists dataset",
  lede: `Two files carry the lists shown on [word lists by grade](${MAIN}/word-lists-by-grade): ${en.length} English lists (${nf(uniqueEn)} different words) placed from Pre-K to Grade 3, and ${other.length} lists in five other languages. Free to download and reuse under CC BY 4.0. The files hold word lists only: no child's data of any kind.`,
  blocks: [
    { t: "h2", text: "Files" },
    { t: "table", head: ["File", "Contents", "Address"], rows: S.DATA_FILES.map((f) => [`\`${f.file}\``, f.what, `${MAIN}${f.path}`]) },
    { t: "p", text: "Both are static, served with CORS open (`Access-Control-Allow-Origin: *`) and cached for an hour, so a browser app can fetch them directly. The same files ship in the npm package `dyslexiasteps-data`." },
    { t: "h2", text: "CSV columns" },
    { t: "table", head: ["Column", "Values"], rows: S.CSV_COLUMNS.map(([c, v]) => [`\`${c}\``, v]) },
    { t: "h2", text: "How grades were placed" },
    { t: "table", head: ["Basis", "Kind", "Meaning"], rows: Object.values(wl.placementBasis).map((b) => [`[${b.code}](${b.url})`, b.kind, b.summary]) },
    { t: "p", text: `A grade is a typical guide, not a rule. Full explanation: [how word lists are placed by grade](${MAIN}/word-lists-by-grade#how-placement-works).` },
    { t: "h2", text: "Examples" },
    ...S.DATA_EXAMPLES.map((e) => code(e.label, e.code)),
    { t: "h2", text: "License and citation" },
    { t: "p", text: `${wl.license.note} Licence: [${wl.license.name}](${wl.license.url}).` },
    code("Cite as", wl.citeAs),
    { t: "h2", text: "Limits" },
    { t: "p", text: "The lists are for teaching and practice. They are not an assessment of any child and a placement is not a rule: programs and standards differ. The lists in other languages are written for each language's reading curriculum and are not translations of the English lists." },
    { t: "h2", text: "Versions" },
    { t: "p", text: `The files change when lists change or a placement is revised. The npm package version follows, so a pinned dependency never shifts under you. Current package version: \`${dataPkg.version}\`. Data last updated ${wl.updated}.` },
  ],
});


const gameCounts = Object.fromEntries(Object.entries(catalog.games).map(([g, byLoc]) => [g, Object.values(byLoc).flat().length]));
const gameLangs = Object.fromEntries(Object.entries(catalog.games).map(([g, byLoc]) => [g, Object.keys(byLoc).join(", ")]));
pages.push({
  path: "/embed", label: "Embed the reading games", title: "Embed Free Reading Games on Your Website: Script, Web Component and React",
  description: "Add free reading games to a school, tutoring or parenting site: script tag, web component or React; options, catalog, platform steps, credit link and privacy.",
  h1: "Embed the reading games",
  lede: `Free reading games for your own site: ${catalog.total} ready-to-embed games across ${catalog.lists} word lists in six languages. The embedded game page loads no analytics and sets no cookies. Three ways to add one: a script tag, a web component or a React component.`,
  blocks: [
    { t: "p", text: `A code builder with a live sample page is on [dyslexiasteps.com/embed](${MAIN}/embed): pick a game and see the result before you paste anything.` },
    { t: "h2", text: "Script tag" },
    code("HTML", `<div data-dys-game="listen" data-list="short-a"></div>\n<script async src="${MAIN}/embed.js"></script>`),
    { t: "p", text: "The script builds the iframe, keeps its height equal to its content and writes a visible credit line under the game into your page." },
    { t: "h2", text: "npm: web component" },
    code("Install", "npm install dyslexiasteps-embed"),
    code("Use", `<script type="module">import "dyslexiasteps-embed";</script>\n<dyslexiasteps-game game="listen" list="short-a" lang="en" size="standard"></dyslexiasteps-game>`),
    { t: "h2", text: "npm: React" },
    code("React", `import { Game } from "dyslexiasteps-embed/react";\n\n<Game game="build" list="short-a" size="wide" />\n<Game game="choice" lang="es" list="vaya-o-valla" />`),
    { t: "p", text: "The wrapper registers the web component on the client only, so it is safe in server-rendered apps." },
    { t: "h2", text: "Plain iframe" },
    { t: "p", text: "For pages that block scripts. Add the credit line yourself." },
    code("HTML", `<iframe src="${MAIN}/embed/en/listen/short-a" title="Reading game by Dyslexia Steps" width="480" height="560" style="border:0;width:100%;max-width:480px" loading="lazy"></iframe>\n<p style="text-align:center;font:12px system-ui,sans-serif">Free reading games by <a href="${MAIN}/">Dyslexia Steps</a></p>`),
    { t: "h2", text: "Options" },
    { t: "table", head: ["Script", "Component / React", "Values"], rows: [
      ["`data-dys-game`", "`game`", "`listen`, `build`, `choice`, `dictation`"],
      ["`data-list`", "`list`", "An id such as `short-a` (English) or the list page name such as `palabras-con-m` (other languages)"],
      ["`data-lang`", "`lang`", "`en` (default), `de`, `es`, `fr`, `nl`, `pt-br`"],
      ["`data-size`", "`size`", "`compact` (360 px), `standard` (480 px, default), `wide` (720 px)"],
    ] },
    { t: "h2", text: "Games and languages" },
    { t: "table", head: ["Game", "What the child does", "Languages", "Ready to embed"], rows: [
      ["`listen`", "Hears a word and taps the matching one out of four", gameLangs.listen, String(gameCounts.listen)],
      ["`build`", "Hears a word and builds it from letter or syllable tiles", gameLangs.build, String(gameCounts.build)],
      ["`choice`", "Fills a gap in a sentence with the right sound-alike word", gameLangs.choice, String(gameCounts.choice)],
      ["`dictation`", "Listens, writes and checks word by word", gameLangs.dictation, String(gameCounts.dictation)],
    ] },
    { t: "p", text: `Not every list has every game. The full catalog, with list ids and page addresses, is machine-readable: [embed-catalog.json](${BASE}/embed-catalog.json).` },
    { t: "h2", text: "Add it on your platform" },
    { t: "p", text: "Steps taken from each platform's own help pages (read 18 October 2026). Menus and plan limits change; if a platform removes scripts, use the plain iframe and add the credit line by hand." },
    { t: "table", head: ["Platform", "Where to paste", "Good to know"], rows: platforms.map((p) => [p.source ? `[${p.name}](${p.source})` : p.name, p.where, p.limits + (p.verified ? "" : " (Not fully confirmed from the official page.)")]) },
    { t: "h2", text: "Height" },
    { t: "p", text: "The game posts its content height to the parent window and the iframe follows. The script and the web component handle it; with a plain iframe you can listen yourself." },
    code("JavaScript", `window.addEventListener("message", (e) => {\n  if (e.origin !== "${MAIN}") return;\n  const m = e.data;\n  if (m && m.source === "dys-embed" && m.type === "resize") {\n    iframe.style.height = Math.ceil(m.height) + "px";\n  }\n});`),
    { t: "h2", text: "The credit link" },
    { t: "p", text: "The script and the component write one small line under the game into your page: “Free reading games by Dyslexia Steps”, linking to the Dyslexia Steps home page. We ask that it stays visible. A link inside the frame would belong to the game's own document, which is why the line is written into your page." },
    { t: "h2", text: "Privacy" },
    { t: "p", text: "The embedded game page loads no analytics and sets no cookies, and has no sign-up or account. Audio files load from dyslexiasteps.com like any embedded file, so ordinary server request logs exist. The credit link on your page is only a link." },
    { t: "h2", text: "Terms" },
    { t: "ul", items: ["Free to use on any website, including schools, tutoring businesses and commercial sites.", "Keep the credit line under the game visible. Do not hide it or restyle it to invisibility.", "Do not change the game or present it as your own. The games are practice with word lists: not a test, and not an assessment of any child."] },
    { t: "p", text: `Source: [dyslexiasteps-embed](${S.GITHUB_ORG}/dyslexiasteps-embed).` },
  ],
});

pages.push({
  path: "/faq", label: "FAQ and troubleshooting", title: "FAQ and Troubleshooting for the Word Lists MCP Server and Dataset",
  description: "Answers about the Dyslexia Steps MCP server and word lists dataset: accounts, grades, printing, licenses, and fixes when tools do not appear or a connector option is missing.",
  h1: "FAQ and troubleshooting",
  lede: "Answers to the common questions about the MCP server and the dataset, and fixes for the problems people hit most often.",
  faq: S.MCP_FAQ,
  blocks: [
    { t: "h2", text: "Frequently asked questions" },
    ...S.MCP_FAQ.flatMap((f) => [{ t: "h3", text: f.q }, { t: "p", text: f.a }]),
    { t: "h2", text: "Troubleshooting" },
    ...S.MCP_TROUBLESHOOTING.flatMap((f) => [{ t: "h3", text: f.q }, { t: "p", text: f.a }]),
  ],
});

pages.push({
  path: "/changelog", label: "Changelog", title: "Changelog: Packages and Docs",
  description: "Dated changes to the Dyslexia Steps developer packages, the hosted MCP server and these docs.",
  h1: "Changelog",
  lede: "What changed in the developer packages and these docs. Changes to the lists themselves are dated in the data files (`updated`).",
  blocks: [
    { t: "table", head: ["Date", "Change"], rows: [
      [UPDATED, `First release of \`${S.MCP_NPM}\` and \`dyslexiasteps-data\` at 0.1.0; these docs; the hosted MCP server at \`${URL_MCP}\`.`],
      ["2026-10-17", `Word lists by grade published on dyslexiasteps.com with the CSV and JSON files (${en.length} English lists placed Pre-K to Grade 3).`],
    ] },
  ],
});

/* -------------------------------------------------------------------- çıktı */
const nav = buildNav(clients);
const flat = nav.flatMap(([, items]) => items.map(([path, label]) => ({ path, label }))).filter((x) => x.path !== "/llms.txt");
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/assets", { recursive: true });
// public/: IndexNow anahtar dosyası gibi kökte durması gereken dosyalar (klasör yoksa atla: git boş klasörü tutmaz).
if (existsSync("public")) cpSync("public", "dist", { recursive: true });
writeFileSync("dist/assets/docs.css", CSS.trim());
writeFileSync("dist/assets/docs.js", JS.trim());
const outPath = (p) => (p === "/" ? "dist/index.html" : `dist${p}.html`);
for (const p of pages) {
  mkdirSync(dirname(outPath(p.path)), { recursive: true });
  writeFileSync(outPath(p.path), page({ p, nav, flat, updated: UPDATED }));
}
writeFileSync("dist/404.html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Dyslexia Steps developer docs</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/docs.css"></head><body><main style="max-width:640px;margin:15vh auto;padding:0 20px"><h1>Page not found</h1><p>That page is not in the docs. Start from the <a href="/">overview</a> or the <a href="/quickstart">quickstart</a>.</p></main></body></html>`);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
writeFileSync("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${BASE}${p.path === "/" ? "/" : p.path}</loc><lastmod>${UPDATED}</lastmod></url>`).join("\n")}\n</urlset>\n`);

writeFileSync("dist/llms.txt", [
  "# Dyslexia Steps developer docs", "",
  `> Documentation for the free, open-source developer tools of Dyslexia Steps (dyslexiasteps.com): phonics and sight word lists placed from Pre-K to Grade 3 with the source of each placement, as CSV and JSON (CC BY 4.0) and as a read-only MCP server for AI assistants. A grade is a typical guide, not a rule, and a placement is not an assessment of any child.`, "",
  `Hosted MCP server: ${URL_MCP}`, `Source: ${ORG}`, "",
  "## Docs", "",
  ...pages.map((p) => `- [${p.h1}](${BASE}${p.path}): ${p.description}`), "",
  "## Optional", "",
  `- [Word lists by grade](${MAIN}/word-lists-by-grade): the lists as printable pages, with sources.`,
  `- [Full documentation as one file](${BASE}/llms-full.txt)`, "",
].join("\n"));
writeFileSync("dist/llms-full.txt", [
  "# Dyslexia Steps developer docs (full text)", "", `Source: ${BASE} · Updated ${UPDATED}`, "",
  ...pages.map((p) => `# ${p.h1}\n\nURL: ${BASE}${p.path}\n\n${renderMd([{ t: "p", text: p.lede }, ...p.blocks], BASE)}\n`),
].join("\n\n"));
console.log(`built ${pages.length} pages · tools documented: ${tools.length} · mcp ${mcpPkg.version} · data ${dataPkg.version} · ${en.length} en lists · ${kLists} kindergarten`);
