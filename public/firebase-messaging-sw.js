importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDR0z-aYWC9PRfIZnw1A5DQL482fXTB2R0",
  authDomain: "segel-1b227.firebaseapp.com",
  projectId: "segel-1b227",
  storageBucket: "segel-1b227.firebasestorage.app",
  messagingSenderId: "340656361735",
  appId: "1:340656361735:web:97025c73feed07983335a2"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 1. Handle Background Push Messages from Firebase (FCM)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'سِجِل - تنبيه صحي 💊';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'لديك موعد دواء أو فحص صحي مجدول الآن.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: payload.data?.tag || `sejel-rem-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: payload.data || { url: '/' },
    actions: [
      { action: 'open', title: 'فتح سجل' },
      { action: 'taken', title: 'تم أخذ الجرعة ✓' },
      { action: 'dismiss', title: 'إغلاق' }
    ],
    dir: 'rtl',
    lang: 'ar'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 2. Handle Notification Click
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
