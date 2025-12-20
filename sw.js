const CACHE_NAME = 'stockwise-v1';
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
});

// Fetch Event (Network first, fall back to cache)
self.addEventListener('fetch', (event) => {
  // If it's an API call to Google Scripts, always go to network
  if (event.request.url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For other assets, try network first, then cache (good for development updates)
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});