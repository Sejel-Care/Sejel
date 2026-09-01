/**
 * ==============================================================================
 * سِجِل (Sejel) - Service Worker للعمل دون اتصال بالإنترنت (Offline-First)
 * ==============================================================================
 */

const CACHE_NAME = 'sejel-health-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&family=Tajawal:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap'
];

// 1. تثبيت الـ Service Worker وتخزين الأصول الثابتة
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Sejel SW] Caching app shell & static assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Sejel SW] Pre-cache non-fatal error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. تفعيل الـ Service Worker وتنظيف النسخ القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Sejel SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. اعتراض الطلبات وتوفير تجربة استجابة ذكية دون إنترنت (Stale-While-Revalidate / Cache-First)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // لا نعترض طلبات الـ Google Apps Script أو الـ POST requests عبر الـ SW (تتم عبر syncEngine)
  if (request.method !== 'GET' || url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // تحديث الكاش في الخلفية
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {/* Offline */});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // في حال فشل الطلب بالكامل وكون الطلب صفحة HTML، نعيد index.html المخزنة
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
