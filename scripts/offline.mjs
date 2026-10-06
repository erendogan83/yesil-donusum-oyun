import { readdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}
// Cloudflare Pages deploys all of dist/. Original generation sheets (~36 MB)
// and the contact sheet are never loaded by the game, so keep them out.
await rm("dist/assets/source", { recursive: true, force: true });
await rm("dist/assets/contact-sheet.jpg", { force: true });
const skip = ["/sw.js", "/_headers", "/_redirects", "/robots.txt"];
const paths = (await files("dist"))
  .map((p) => "./" + p.slice(5))
  .filter((p) => !skip.some((s) => p.endsWith(s)));
const version = createHash("sha256")
  .update(paths.join("|") + Date.now())
  .digest("hex")
  .slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE='yesil-${version}';const FILES=${JSON.stringify(["./", ...paths])};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('yesil-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{if(!r.ok)throw Error('offline');return r;}).catch(()=>caches.match('./index.html')));return;}e.respondWith(caches.match(e.request,{ignoreVary:true}).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('./index.html'):Response.error())));});`,
);
console.log(`Offline manifest: ${paths.length} local files`);
