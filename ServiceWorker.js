const cacheName = "Academy_Hamrah-Codica-1.1.2";
const contentToCache = [
    "Build/bb0d9ecdb05db3e84da20bd14a4f84dc.loader.js",
    "Build/1af364aed65fdda5a2b5c84fbd206b04.framework.js",
    "Build/6b30428f4cc463c205a58befe80eb176.data",
    "Build/7336b22d8b1dbbc45826e817fa29072a.wasm",
    "TemplateData/style.css",
    // Add the new loading screen images
    "TemplateData/tiger-character.png",
    "TemplateData/lightbulb.png"
];

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    
    e.waitUntil((async function () {
      const cache = await caches.open(cacheName);
      console.log('[Service Worker] Caching all: app shell and content');
      await cache.addAll(contentToCache);
    })());
});

self.addEventListener('fetch', function (e) {
    e.respondWith((async function () {
      let response = await caches.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
      if (response) { return response; }

      response = await fetch(e.request);
      const cache = await caches.open(cacheName);
      console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
      cache.put(e.request, response.clone());
      return response;
    })());
});
