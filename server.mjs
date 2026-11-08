// Statik sunucu (bağımlılıksız): dist/ içindeki sayfaları temiz URL'lerle servis eder.
// nginx yerine Node: yayında sorunsuz çalışan MCP imajıyla aynı çalışma zamanı ve
// yerelde birebir test edilebiliyor (bu makinede Docker yok).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("./dist/", import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".json": "application/json; charset=utf-8", ".md": "text/markdown; charset=utf-8" };

// İçerik pazarlığı: `Accept` text/markdown'ı text/html'den önde (daha yüksek q, eşitse önce) tutuyorsa
// sayfanın .md sürümü döner. `*/*` HTML sayılmaz; yalnız açıkça markdown isteyen alır.
function prefersMarkdown(accept) {
  if (!accept) return false;
  let md = null, html = null;
  accept.split(",").forEach((part, i) => {
    const [type, ...params] = part.trim().toLowerCase().split(";").map((x) => x.trim());
    const qp = params.find((x) => x.startsWith("q="));
    const q = qp ? Number(qp.slice(2)) : 1;
    const hit = { q: Number.isFinite(q) ? q : 0, i };
    if ((type === "text/markdown" || type === "text/x-markdown") && (!md || hit.q > md.q)) md = hit;
    if ((type === "text/html" || type === "application/xhtml+xml") && (!html || hit.q > html.q)) html = hit;
  });
  if (!md || md.q <= 0) return false;
  return !html || md.q > html.q || (md.q === html.q && md.i < html.i);
}
// Sayfa yolu → markdown yolu: / → /index.md, /foo veya /foo/ veya /foo.html → /foo.md.
const mdFor = (pathname) => (pathname === "/" || pathname === "/index.html" ? "/index.md" : `${pathname.replace(/\/$/, "").replace(/\.html$/, "")}.md`);

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
    let file = await resolveFile(pathname);
    // HTML sayfası (uzantısız temiz URL veya .html) ise ve bir .md eşi varsa, yanıt Accept'e göre değişir.
    const page = file && extname(file) === ".html" && extname(pathname) !== ".md";
    const mdFile = page ? await resolveFile(mdFor(pathname)) : null;
    if (mdFile && extname(mdFile) === ".md" && prefersMarkdown(req.headers.accept)) file = mdFile;
    const body = await readFile(file ?? join(ROOT, "404.html"));
    const type = TYPES[extname(file ?? "x.html")] ?? "application/octet-stream";
    const headers = { ...base, "Content-Type": type };
    if (mdFile) headers.Vary = "Accept";
    if (file && /^\/(llms\.txt|llms-full\.txt)$/.test(pathname)) { headers["Access-Control-Allow-Origin"] = "*"; headers["Cache-Control"] = "public, max-age=3600"; }
    else if (file && extname(file) === ".md") { headers["Access-Control-Allow-Origin"] = "*"; headers["Cache-Control"] = "public, max-age=300"; }
    else if (file && pathname.startsWith("/assets/")) headers["Cache-Control"] = "public, max-age=3600";
    else if (file) headers["Cache-Control"] = "public, max-age=300";
    res.writeHead(file ? 200 : 404, headers).end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(500, base).end("error");
  }
}).listen(PORT, () => console.error(`docs listening on :${PORT}`));
