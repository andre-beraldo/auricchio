self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// NÃO cachear API
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/.netlify/functions/')) return;
});