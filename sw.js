/* A build.js a teljes alkalmazás tartalmából számolja az új kiadás azonosítóját. */
'use strict';
const CACHE_VERSION = 'ba9b360a831473ad';
const SCOPE = new URL('./', self.location.href);
const CACHE_PREFIX = 'vegvar-app-' + SCOPE.pathname + '-';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const CORE_FILES = [
  './', 'style.css', 'engine.js', 'game.js', 'scene.js', 'world3d.js',
  'vendor/three.min.js', 'multiplayer-client.js','cloud-client.js','city-view.js', 'pwa.js', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
self.addEventListener('install', event => {
  // Egy kiadás csak akkor használható, ha minden szükséges fájl megérkezett.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES.map(file => new Request(new URL(file, SCOPE), {cache: 'reload'})));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  const relative = url.pathname.slice(SCOPE.pathname.length);
  if (relative === 'sw.js' || relative.startsWith('api/')) return;
  // Csak az alkalmazás lapja kap offline navigációs választ; más URL nem nyeli el a 404-et.
  const appNavigation = request.mode === 'navigate' && ['', 'index.html'].includes(relative);
  event.respondWith((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      if (appNavigation) {
        // Cloudflare redirects /index.html to /. A redirected cached Response
        // is invalid for navigations whose redirect mode is manual (ERR_FAILED).
        const cached = await cache.match(SCOPE.href) || await cache.match(new URL('index.html', SCOPE));
        if (cached) return cached.redirected
          ? new Response(cached.body, {status: cached.status, statusText: cached.statusText, headers: cached.headers})
          : cached;
      } else {
        const cached = await cache.match(request, {ignoreSearch: true});
        if (cached) return cached;
      }
    } catch {
      // Unavailable browser cache must not prevent an online launch.
    }
    return fetch(request);
  })());
});
