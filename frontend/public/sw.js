/* eslint-disable no-redeclare */
/* global self */
// NagarSetu Worker PWA Service Worker
// ONLINE-ONLY: Caches nothing and serves no cached pages or offline requests.
// Exists solely to satisfy browser criteria for PWA installation eligibility.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request))
  }
})

