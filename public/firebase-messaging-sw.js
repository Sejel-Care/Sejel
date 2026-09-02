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

// Handle Background Push Messages from Firebase
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'سِجِل - تنبيه صحي';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'لديك موعد دواء أو فحص صحي مجدول.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: payload.data || { url: '/' },
    actions: [
      { action: 'open', title: 'فتح سجل' },
      { action: 'dismiss', title: 'إغلاق' }
    ],
    dir: 'rtl',
    lang: 'ar'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
