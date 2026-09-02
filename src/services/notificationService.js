import { app, db, auth } from './firebase';
import { doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { db as dexieDb } from '../db/indexedDB';

/**
 * ==============================================================================
 * سِجِل (Sejel) - خدمة الإشعارات والتذكيرات الفورية (Web Push & FCM)
 * notificationService.js - Firebase Cloud Messaging & Medication/Appointment Reminders
 * ==============================================================================
 */

// المفتاح العام الافتراضي لـ VAPID (يمكن تخصيصه عبر VITE_FIREBASE_VAPID_KEY في Vercel)
const DEFAULT_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let messagingInstance = null;
let reminderCheckInterval = null;

export const notificationService = {
  /**
   * التحقق من دعم المتصفح للإشعارات والـ Service Worker
   */
  isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  },

  /**
   * جلب حالة صلاحية الإشعارات الحالية
   */
  getPermission() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * طلب إذن الإشعارات من المستخدم
   */
  async requestPermission() {
    if (!this.isSupported()) {
      return { success: false, permission: 'unsupported', error: 'المتصفح لا يدعم الإشعارات الفورية' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await this.initFcmToken();
        return { success: true, permission, token };
      } else {
        return { success: false, permission, error: 'تم رفض إذن الإشعارات' };
      }
    } catch (err) {
      console.error('[notificationService] Error requesting permission:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * جلب كائن Firebase Messaging
   */
  async getMessaging() {
    if (messagingInstance) return messagingInstance;
    try {
      const supported = await isSupported();
      if (supported) {
        messagingInstance = getMessaging(app);
        return messagingInstance;
      }
    } catch (err) {
      console.warn('[notificationService] Firebase Messaging isSupported error:', err);
    }
    return null;
  },

  /**
   * جلب وتسجيل رمز FCM للـ Web Push
   */
  async initFcmToken(customVapidKey = null) {
    if (!this.isSupported() || Notification.permission !== 'granted') return null;

    try {
      const messaging = await this.getMessaging();
      if (!messaging) return null;

      // التأكد من تسجيل الـ Service Worker
      let swReg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!swReg) {
        swReg = await navigator.serviceWorker.register('/sw.js');
      }

      const vapidKey = customVapidKey || DEFAULT_VAPID_KEY;
      const options = { serviceWorkerRegistration: swReg };
      if (vapidKey) options.vapidKey = vapidKey;

      const currentToken = await getToken(messaging, options);
      if (currentToken) {
        localStorage.setItem('sejel_fcm_token', currentToken);
        await this.saveTokenToFirestore(currentToken);
        return currentToken;
      }
    } catch (err) {
      console.warn('[notificationService] Unable to get FCM token:', err);
    }
    return null;
  },

  /**
   * حفظ رمز الجهاز في Firestore تحت ملف المستخدم
   */
  async saveTokenToFirestore(token) {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || !token) return;

    try {
      const userRef = doc(db, 'patients', currentUid);
      await setDoc(userRef, {
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true,
        lastTokenUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('[notificationService] Could not save FCM token to Firestore:', err);
    }
  },

  /**
   * إرسال إشعار فوري محلي
   */
  async showLocalNotification(title, options = {}) {
    if (!this.isSupported()) return;

    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }

    if (Notification.permission !== 'granted') return;

    const defaultOptions = {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      dir: 'rtl',
      lang: 'ar',
      ...options
    };

    try {
      const swReg = await navigator.serviceWorker.getRegistration();
      if (swReg && swReg.showNotification) {
        await swReg.showNotification(title, defaultOptions);
      } else {
        new Notification(title, defaultOptions);
      }
    } catch (err) {
      try {
        new Notification(title, defaultOptions);
      } catch (fallbackErr) {
        console.warn('[notificationService] Failed to display notification:', fallbackErr);
      }
    }
  },

  /**
   * إرسال إشعار تجريبي لاختبار التفعيل
   */
  async sendTestNotification() {
    await this.showLocalNotification('سِجِل - تنبيه تجريبي 🔔', {
      body: 'نظام الإشعارات والتذكير بالأدوية والمواعيد يعمل بنجاح!',
      tag: 'sejel-test-notification'
    });
  },

  /**
   * بدء جدولة ومراقبة تذكيرات الأدوية والمواعيد في الخلفية
   */
  startScheduler() {
    if (reminderCheckInterval) return;

    // الفحص الفوري ثم كل 60 ثانية
    this.checkDueReminders();
    reminderCheckInterval = setInterval(() => {
      this.checkDueReminders();
    }, 60000);

    // الاستماع لرسائل Firebase Messaging في الواجهة الأمامية (Foreground)
    this.getMessaging().then(messaging => {
      if (messaging) {
        onMessage(messaging, (payload) => {
          console.log('[notificationService] Foreground message received:', payload);
          this.showLocalNotification(
            payload.notification?.title || 'سِجِل - تنبيه صحي',
            {
              body: payload.notification?.body || payload.data?.body || '',
              data: payload.data
            }
          );
        });
      }
    });
  },

  /**
   * إيقاف الجدولة
   */
  stopScheduler() {
    if (reminderCheckInterval) {
      clearInterval(reminderCheckInterval);
      reminderCheckInterval = null;
    }
  },

  /**
   * فحص مواعيد الأدوية والزيارات المستحقة الآن وإطلاق الإشعار
   */
  async checkDueReminders() {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    try {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = now.toISOString().split('T')[0];

      // 1. فحص تذكيرات الأدوية
      const activeMeds = await dexieDb.medications.toArray();
      for (const med of activeMeds) {
        if (!med.Name) continue;

        // استخراج أوقات الجرعات (دعم 1، 2، 3 جرعات أو أوقات مخصصة)
        let doseTimes = [];
        if (Array.isArray(med.DoseTimes) && med.DoseTimes.length > 0) {
          doseTimes = med.DoseTimes;
        } else if (med.Frequency) {
          // استنتاج افتراضي للأوقات إذا لم تكن محددة يدوياً
          if (med.Frequency.includes('1') || med.Frequency.includes('مرة') || med.Frequency.includes('once')) {
            doseTimes = ['08:00'];
          } else if (med.Frequency.includes('2') || med.Frequency.includes('مرت') || med.Frequency.includes('twice')) {
            doseTimes = ['08:00', '20:00'];
          } else if (med.Frequency.includes('3') || med.Frequency.includes('ثلاث') || med.Frequency.includes('three')) {
            doseTimes = ['08:00', '14:00', '20:00'];
          }
        }

        for (const doseTime of doseTimes) {
          if (doseTime === currentTimeStr) {
            const reminderKey = `med_${med.MedicationID}_${todayStr}_${doseTime}`;
            const alreadySent = sessionStorage.getItem(reminderKey);

            if (!alreadySent) {
              sessionStorage.setItem(reminderKey, 'sent');
              await this.showLocalNotification(`تذكير بموعد دواء 💊: ${med.Name}`, {
                body: `حان الآن موعد أخذ الجرعة: ${med.Dosage || 'حسب التوصية'} (${doseTime}).`,
                tag: reminderKey,
                url: '/#medications'
              });
            }
          }
        }
      }

      // 2. فحص تذكيرات المواعيد والزيارات القادمة
      const appointments = await dexieDb.appointments.toArray();
      for (const appt of appointments) {
        if (!appt.AppointmentDate) continue;
        const apptDate = new Date(appt.AppointmentDate);
        const diffMs = apptDate.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));

        // تذكير قبل الموعد بـ 60 دقيقة
        if (diffMinutes >= 55 && diffMinutes <= 65) {
          const apptKey = `appt_60m_${appt.AppointmentID}`;
          if (!sessionStorage.getItem(apptKey)) {
            sessionStorage.setItem(apptKey, 'sent');
            await this.showLocalNotification(`تذكير بموعد طبي قادم 🏥`, {
              body: `لديك موعد مع ${appt.DoctorName || 'الطبيب'} في ${appt.ClinicName || 'العيادة'} بعد ساعة واحدة.`,
              tag: apptKey,
              url: '/#appointments'
            });
          }
        }
      }

      // 3. التنبيهات الصحية التفاعلية الذكية (Smart Engagement & Personalized Chronic Care)
      const currentHourNum = now.getHours();

      // رسالة الصباح التفاعلية المخصصة (بين 08:30 و 09:30)
      if (currentHourNum === 9 && now.getMinutes() === 0) {
        const morningKey = `smart_engage_morning_${todayStr}`;
        if (!localStorage.getItem(morningKey)) {
          localStorage.setItem(morningKey, 'sent');

          const patients = await dexieDb.patients.toArray();
          const p = patients[0] || {};
          const chronic = (p.ChronicDiseases || '').toLowerCase();

          let title = 'صباح الخير من سِجِل ☀️';
          let body = 'ابدأ يومك بنشاط وكوب من الماء 💧 وتفقد مواعيد أدويتك اليومية.';

          if (chronic.includes('سكر') || chronic.includes('diabet')) {
            title = 'سِجِل - رعاية السكري 🩸';
            body = 'صباح الخير! تذكير بقياس مستوى السكر في الدم على الريق وتوثيقه في سِجِل.';
          } else if (chronic.includes('ضغط') || chronic.includes('hypertens')) {
            title = 'سِجِل - صحة القلب 🫀';
            body = 'صباح الصحة! لا تنس قياس ضغط الدم في وضع الراحة وتسجيل القراءة.';
          } else if (chronic.includes('ربو') || chronic.includes('asthma')) {
            title = 'سِجِل - سلامة التنفس 🫁';
            body = 'صباح الخير! تأكد من وجود البخاخ في متناول يدك وتجنب المثيرات التنفسية.';
          }

          await this.showLocalNotification(title, { body, tag: morningKey, url: '/' });
        }
      }

      // رسالة المساء للمتابعة والالتزام العلاجي (الساعة 20:00)
      if (currentHourNum === 20 && now.getMinutes() === 0) {
        const eveningKey = `smart_engage_evening_${todayStr}`;
        if (!localStorage.getItem(eveningKey)) {
          localStorage.setItem(eveningKey, 'sent');

          await this.showLocalNotification('سِجِل - متابعة المساء 🌙', {
            body: 'مساء الخير! هل تناولت جميع أدويتك اليوم؟ راجع سجلك وتأكد من اكتمال جرعاتك.',
            tag: eveningKey,
            url: '/#medications'
          });
        }
      }
    } catch (err) {
      console.warn('[notificationService] Error during checkDueReminders:', err);
    }
  }
};
