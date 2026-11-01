const CACHE = 'drivelegal-v24';
const ASSETS = [
  './', './index.html', './styles.css?v=24', './app.js?v=24', './config.js',
  './js/domain.mjs?v=24', './js/store.mjs?v=24', './data/snapshot.json', './manifest.json',
  './assets/drivelegal-motion-d.png', './assets/road-journey.svg', './assets/logo.png', './icons/icon-192.png', './icons/icon-512.png',
  './assets/lib/jspdf.umd.min.js', './assets/lib/jspdf.plugin.autotable.min.js',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('drivelegal-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({error:'offline'}), {status:503,headers:{'Content-Type':'application/json'}})));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
