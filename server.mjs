// Statik sunucu (bağımlılıksız): dist/ içindeki sayfaları temiz URL'lerle servis eder.
// nginx yerine Node: yayında sorunsuz çalışan MCP imajıyla aynı çalışma zamanı ve
// yerelde birebir test edilebiliyor (bu makinede Docker yok).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("./dist/", import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".json": "application/json; charset=utf-8" };

async function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const base = join(ROOT, clean);
  if (!base.startsWith(ROOT)) return null;
  for (const candidate of [base, `${base}.html`, join(base, "index.html")]) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch { /* sıradaki aday */ }
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://x");
  const base = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" };
  if (pathname === "/health") { res.writeHead(200, { ...base, "Content-Type": "text/plain" }).end("ok\n"); return; }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { ...base, Allow: "GET, HEAD" }).end(); return; }
  try {
    const file = await resolveFile(pathname);
    const body = await readFile(file ?? join(ROOT, "404.html"));
    const type = TYPES[extname(file ?? "x.html")] ?? "application/octet-stream";
    const headers = { ...base, "Content-Type": type };
    if (file && /^\/(llms\.txt|llms-full\.txt)$/.test(pathname)) { headers["Access-Control-Allow-Origin"] = "*"; headers["Cache-Control"] = "public, max-age=3600"; }
    else if (file && pathname.startsWith("/assets/")) headers["Cache-Control"] = "public, max-age=3600";
    else if (file) headers["Cache-Control"] = "public, max-age=300";
    res.writeHead(file ? 200 : 404, headers).end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(500, base).end("error");
  }
}).listen(PORT, () => console.error(`docs listening on :${PORT}`));
