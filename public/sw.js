/**
 * ==============================================================================
 * سِجِل (Sejel) - Service Worker للعمل دون اتصال ودعم الإشعارات الفورية (PWA & Web Push)
 * ==============================================================================
 */

const CACHE_NAME = 'sejel-health-v1.1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&family=Tajawal:wght@400;500;700&family=Roboto:wght@400;500;700&display=swap'
];

// 1. Install Event: Cache Static Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Sejel SW] Caching app shell & static assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Sejel SW] Pre-cache non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean Old Caches & Claim Clients
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

// 3. Fetch Event: Stale-While-Revalidate with offline fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests or Google API / Firebase dynamic requests
  if (
    request.method !== 'GET' || 
    url.hostname.includes('script.google.com') || 
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
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
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});

// 4. Web Push Notification Event Handler (Medications & Appointments)
self.addEventListener('push', (event) => {
  console.log('[Sejel SW] Push message received:', event);
  let data = {
    title: 'سِجِل - تذكير صحي 💊',
    body: 'حان موعد تناول الدواء أو فحصك الطبي المجدول.',
    url: '/#medications'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = {
        title: 'سِجِل - تذكير صحي',
        body: event.data.text(),
        url: '/'
      };
    }
  }

  const options = {
    body: data.body || data.message || 'لديك موعد دواء أو زيارة طبية مجدولة الآن.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || `sejel-rem-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || (data.type === 'appointment' ? '/#appointments' : '/#medications'),
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'فتح التطبيق' },
      { action: 'taken', title: 'تم أخذ الجرعة ✓' },
      { action: 'dismiss', title: 'إغلاق' }
    ],
    dir: 'rtl',
    lang: 'ar'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'سِجِل - تنبيه صحي', options)
  );
});

// 5. Notification Click Action Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
