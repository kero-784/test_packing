--- START OF FILE sw.js ---

const CACHE_NAME = 'stockwise-v2'; // Changed from v1 to v2 to force update
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './state.js',
  './config.js',
  './i18n.js',
  './utils.js',
  './api.js',
  './calculations.js',
  './ui-renderers.js',
  './app.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forces the new service worker to take over immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim(); // Immediately control all open clients
});

// Fetch Event (Network first, fall back to cache)
self.addEventListener('fetch', (event) => {
  // If it's an API call to Google Scripts, always go to network
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For other assets, try network first, then cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
