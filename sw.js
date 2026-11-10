/* ==========================================================================
   Service worker — permite abrir el regalo sin conexión una vez cargado.
   Sube el número de versión cuando cambies archivos, para forzar la
   actualización de la caché.
   ========================================================================== */

const VERSION = "lolacrush-v11";
const CACHE = "cache-" + VERSION;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/config.js",
  "./js/audio.js",
  "./js/ui.js",
  "./js/match3.js",
  "./js/app.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/nivel-superado.jpg",
  "./assets/lola-anim.webp",
  "./assets/david.png",
  "./assets/david-anim.webp",
  "./assets/intro-poster.jpg",
  "./assets/presentacion-poster.jpg",
  "./assets/regalo-poster.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;

      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
