import { driveService } from './driveService';

/**
 * ==============================================================================
 * سِجِل (Sejel) - خدمة التكامل مع تقويم Google (Google Calendar API)
 * calendarService.js - Seamless Google Calendar sync with smart phone alerts
 * ==============================================================================
 */

export const calendarService = {
  /**
   * جلب رمز وصول Google OAuth
   */
  getAccessToken() {
    return driveService.getAccessToken();
  },

  /**
   * إنشاء حدث موعد طبي في تقويم Google مع تنبيهات مسبقة
   * @param {Object} params
   * @param {string} params.title - عنوان الموعد (مثال: فحص دوري مع د. أحمد)
   * @param {string} params.description - تفاصيل وملاحظات الموعد
   * @param {string} params.location - اسم العيادة أو المستشفى
   * @param {string} params.date - تاريخ الموعد (YYYY-MM-DD)
   * @param {string} params.time - وقت الموعد (HH:mm)
   * @param {Array<number>} params.reminderMinutes - دقائق التنبيه المسبق (مثال: [1440, 60] ليوم وساعة)
   */
  async createCalendarEvent({
    title,
    description = '',
    location = '',
    date,
    time = '09:00',
    reminderMinutes = [1440, 60] // تنبيه قبل 24 ساعة وقبل ساعة
  }) {
    if (!date) {
      throw new Error('تاريخ الموعد مطلوب لإضافته إلى تقويم Google');
    }

    const token = this.getAccessToken();
    const cleanTime = time && time.includes(':') ? time : '09:00';
    const startDateTimeStr = `${date}T${cleanTime}:00`;
    const startDate = new Date(startDateTimeStr);

    // افتراض مدة الموعد ساعة واحدة
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const endDateTimeStr = endDate.toISOString();

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh';

    const eventPayload = {
      summary: `سِجِل 🏥: ${title || 'موعد طبي'}`,
      description: `${description || ''}\n\nتمت الجدولة تلقائياً عبر تطبيق سِجِل الطبي الذكي.`,
      location: location || '',
      start: {
        dateTime: startDate.toISOString(),
        timeZone
      },
      end: {
        dateTime: endDateTimeStr,
        timeZone
      },
      reminders: {
        useDefault: false,
        overrides: (reminderMinutes || [1440, 60]).map(mins => ({
          method: 'popup',
          minutes: Number(mins)
        }))
      }
    };

    // 1. محاولة الإنشاء المباشر عبر Google Calendar REST API v3
    if (token) {
      try {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventPayload)
        });

        if (res.ok) {
          const data = await res.json();
          console.log('[calendarService] Event created on Google Calendar:', data.id);
          return {
            success: true,
            eventId: data.id,
            htmlLink: data.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${data.id}`,
            method: 'api'
          };
        } else {
          const errText = await res.text();
          console.warn('[calendarService] Calendar API error response:', res.status, errText);
        }
      } catch (apiErr) {
        console.warn('[calendarService] Calendar API fetch error:', apiErr);
      }
    }

    // 2. Fallback: إنشاء رابط ويب لتقويم Google (Google Calendar Web Template URL)
    const fallbackUrl = this.getDirectCalendarWebUrl({
      title,
      description,
      location,
      date,
      time
    });

    return {
      success: true,
      htmlLink: fallbackUrl,
      method: 'web_link'
    };
  },

  /**
   * إنشاء رابط ويب مباشر لإضافة الحدث في تقويم Google
   */
  getDirectCalendarWebUrl({ title, description = '', location = '', date, time = '09:00' }) {
    if (!date) return 'https://calendar.google.com';

    const cleanDate = date.replace(/-/g, '');
    const cleanTime = (time || '0900').replace(/:/g, '').padEnd(4, '0') + '00';
    const startStr = `${cleanDate}T${cleanTime}`;
    
    // نهاية الموعد بعد ساعة
    const endHour = String(Math.min(23, parseInt(cleanTime.slice(0, 2), 10) + 1)).padStart(2, '0');
    const endStr = `${cleanDate}T${endHour}${cleanTime.slice(2)}`;

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `سِجِل 🏥: ${title || 'موعد طبي'}`,
      details: `${description}\n\nمسجل عبر تطبيق سِجِل الصحي.`,
      location: location || '',
      dates: `${startStr}/${endStr}`
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
};
