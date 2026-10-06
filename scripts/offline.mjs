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
// index.html is cached as "./": Cloudflare Pages redirects /index.html to /, and a
// redirected response cannot be used to answer a navigation.
const skip = [
  "/sw.js",
  "/_headers",
  "/_redirects",
  "/robots.txt",
  "/index.html",
];
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
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/api/'))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{if(!r.ok)throw Error('offline');return r;}).catch(()=>caches.match('./')));return;}e.respondWith(caches.match(e.request,{ignoreVary:true}).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('./'):Response.error())));});`,
);
console.log(`Offline manifest: ${paths.length} local files`);
