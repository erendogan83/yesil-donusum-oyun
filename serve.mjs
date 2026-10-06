import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { spawn } from "node:child_process";
const root = resolve(import.meta.dirname, "dist");
const mime = {
  ".html": "text/html;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain;charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
// Apply dist/_headers (Cloudflare Pages syntax) so local play matches production.
async function loadRules() {
  const rules = [];
  try {
    let current;
    for (const line of (
      await readFile(resolve(root, "_headers"), "utf8")
    ).split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith("#")) continue;
      if (!/^\s/.test(line)) {
        current = { path: line.trim(), headers: {} };
        rules.push(current);
      } else if (current) {
        const i = line.indexOf(":");
        if (i > 0)
          current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      }
    }
  } catch {
    /* No header rules: serve with defaults. */
  }
  return rules;
}
const rules = await loadRules();
const matches = (pattern, path) =>
  pattern.endsWith("*")
    ? path.startsWith(pattern.slice(0, -1))
    : path === pattern;
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let p = resolve(root, "." + decodeURIComponent(url.pathname));
    if (p !== root && !p.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if ((await stat(p)).isDirectory()) p = resolve(p, "index.html");
    } catch {
      if (extname(p)) {
        res.writeHead(404);
        res.end();
        return;
      }
      p = resolve(root, "index.html");
    }
    const body = await readFile(p);
    const headers = {
      "Content-Type": mime[extname(p)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    };
    for (const rule of rules)
      if (matches(rule.path, url.pathname))
        Object.assign(headers, rule.headers);
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end("Dosya okunamadi");
  }
});
server.on("error", (e) => {
  console.error("Sunucu baslatilamadi:", e.message);
  process.exitCode = 1;
});
const port = Number(
  process.env.PORT ||
    process.argv.find((a) => a.startsWith("--port="))?.slice(7) ||
    4173,
);
server.listen(port, "127.0.0.1", () => {
  const address = `http://127.0.0.1:${port}`;
  console.log(`Yesil Donusum: ${address}`);
  if (process.argv.includes("--open") && process.platform === "win32") {
    const child = spawn("explorer.exe", [address], {
      windowsHide: true,
    });
    child.on("error", () => console.log("Tarayicida yukaridaki adresi acin."));
  }
});
