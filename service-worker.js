const CACHE='rt-v1367';const PRECACHE=[
  "/rest/",
  "/rest/index.html",
  "/rest/styles.css?v=1367",
  "/rest/script.js?v=1367",
  "/rest/config.js?v=1367",
  "/rest/manifest.webmanifest",
  "/rest/icons/icon-192.png",
  "/rest/icons/icon-512.png"
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(url.origin===location.origin){e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return res;})).catch(()=>caches.match('/rest/index.html')));}});
