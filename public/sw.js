/*
 * Setji's Swings service worker — makes the app usable offline once it's been opened.
 *
 * Conservative on purpose: navigations are network-first (so a new build is
 * always picked up when online), and same-origin static assets are cache-first
 * with a runtime cache (so the shell, fonts we host, the pose model, and the
 * wasm keep working with no connection). Cross-origin requests are left alone.
 */
const CACHE = 'setjis-swings-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // leave the fonts CDN etc. alone

  // Navigations: try the network, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(CACHE)
          cache.put('/index.html', fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(CACHE)
          return (await cache.match('/index.html')) || Response.error()
        }
      })(),
    )
    return
  }

  // Same-origin static assets: cache-first, then network (and cache it).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const hit = await cache.match(req)
      if (hit) return hit
      try {
        const res = await fetch(req)
        if (res.ok) cache.put(req, res.clone())
        return res
      } catch {
        return hit || Response.error()
      }
    })(),
  )
})
