const CACHE='side-c-static-v8';
const FILES=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./assets/favicon.svg','./assets/sponsor-card.jpg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// 只缓存本站文件；音乐 / B站 等外部接口一律直连，不缓存。本站文件网络优先，断网时用缓存。
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
});
