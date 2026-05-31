/* Service worker – Kalorický Tracker
   index.html: network-first (online vždy nejnovější verze, offline z cache)
   ikony/manifest: cache-first */
const CACHE = 'kalorie-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // cizí (Open Food Facts) necháme projít

  const isDoc = req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('index.html');
  if (isDoc) {
    // NETWORK-FIRST: zkus stáhnout nejnovější, jinak z cache
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
  } else {
    // CACHE-FIRST pro statické soubory (ikony, manifest)
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
