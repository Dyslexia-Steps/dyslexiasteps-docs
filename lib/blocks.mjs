/**
 * Her sayfa bir BLOK listesi: aynı bloklardan hem HTML hem de llms-full.txt
 * (markdown) üretiliyor. İki çıktı tek kaynaktan geldiği için "sayfada yazan ile
 * yapay zekâya verilen metin" birbirinden ayrışamaz.
 *
 * Blok türleri: h2 · h3 · p · ul · ol · code · table · note
 */
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Satır içi: `kod`, **kalın**, *italik*, [metin](url). Önce kaçış, sonra işaretler. */
export function inlineHtml(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) =>
      /^https?:/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : `<a href="${u}">${t}</a>`);
}
export const inlineMd = (text, base) => text.replace(/\]\((\/[^)]*)\)/g, (_, u) => `](${base}${u})`);

export function renderHtml(blocks) {
  return blocks.map((b) => {
    switch (b.t) {
      case "h2": return `<h2 id="${slug(b.text)}">${inlineHtml(b.text)}</h2>`;
      case "h3": return `<h3 id="${slug(b.text)}">${inlineHtml(b.text)}</h3>`;
      case "p": return `<p>${inlineHtml(b.text)}</p>`;
      case "ul": return `<ul>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ul>`;
      case "ol": return `<ol>${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ol>`;
      case "note": return `<div class="note">${inlineHtml(b.text)}</div>`;
      case "code":
        return `<div class="code"><div class="code-head"><span>${esc(b.label || "")}</span><button type="button" data-copy>Copy</button></div><pre><code>${esc(b.code)}</code></pre></div>`;
      case "table":
        return `<div class="table-wrap"><table><thead><tr>${b.head.map((h) => `<th>${inlineHtml(h)}</th>`).join("")}</tr></thead><tbody>${b.rows
          .map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(String(c))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      default: throw new Error(`unknown block ${b.t}`);
    }
  }).join("\n");
}

export function renderMd(blocks, base) {
  return blocks.map((b) => {
    switch (b.t) {
      case "h2": return `## ${b.text}`;
      case "h3": return `### ${b.text}`;
      case "p": case "note": return inlineMd(b.text, base);
      case "ul": return b.items.map((i) => `- ${inlineMd(i, base)}`).join("\n");
      case "ol": return b.items.map((i, n) => `${n + 1}. ${inlineMd(i, base)}`).join("\n");
      case "code": return `${b.label ? `**${b.label}**\n\n` : ""}\`\`\`\n${b.code}\n\`\`\``;
      case "table": return [`| ${b.head.join(" | ")} |`, `| ${b.head.map(() => "---").join(" | ")} |`, ...b.rows.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n");
      default: throw new Error(`unknown block ${b.t}`);
    }
  }).join("\n\n");
}
