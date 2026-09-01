import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * ==============================================================================
 * سِجِل (Sejel) - خدمة إدارة المواعيد والتكامل مع Google Calendar (Appointments Service)
 * appointmentService.js - Firebase Firestore CRUD & Google Calendar Integration
 * ==============================================================================
 */

const COLLECTION_NAME = 'appointments';

export const appointmentService = {
  /**
   * جلب كافة المواعيد مع دعم الفلترة حسب المريض
   * @param {string|null} patientId معرف المريض
   * @returns {Promise<Array>} قائمة المواعيد
   */
  async getAppointments(patientId = null) {
    try {
      let q;
      if (patientId) {
        q = query(
          collection(db, COLLECTION_NAME),
          where('PatientID', '==', String(patientId))
        );
      } else {
        q = query(collection(db, COLLECTION_NAME));
      }

      const querySnapshot = await getDocs(q);
      const appointments = [];
      querySnapshot.forEach((docSnap) => {
        appointments.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // فرز حسب تاريخ ووقت الموعد
      return appointments.sort((a, b) => {
        const dateA = new Date(`${a.Date || '1970-01-01'}T${a.Time || '00:00'}:00`);
        const dateB = new Date(`${b.Date || '1970-01-01'}T${b.Time || '00:00'}:00`);
        return dateA - dateB;
      });
    } catch (error) {
      console.error('[appointmentService] Error fetching appointments:', error);
      throw error;
    }
  },

  /**
   * جلب موعد محدد بواسطة المعرف
   * @param {string} appointmentId معرف الموعد
   * @returns {Promise<Object|null>} بيانات الموعد
   */
  async getAppointmentById(appointmentId) {
    if (!appointmentId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, String(appointmentId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`[appointmentService] Error fetching appointment ${appointmentId}:`, error);
      throw error;
    }
  },

  /**
   * توليد رابط إضافة الموعد مباشرة إلى تقويم Google Calendar
   * @param {Object} appointment بيانات الموعد
   * @returns {string} رابط Google Calendar Web
   */
  generateGoogleCalendarUrl(appointment) {
    if (!appointment || !appointment.Date) return '';
    try {
      const title = encodeURIComponent(`سِجِل الطبي: ${appointment.Title || 'موعد استشارة'} - ${appointment.DoctorName || ''}`);
      const dateStr = appointment.Date.replace(/-/g, ''); // YYYYMMDD
      const timeStr = (appointment.Time || '09:00').replace(/:/g, '') + '00'; // HHMMSS
      
      // توقيت البدء والانتهاء (ساعة افتراضية)
      const startIso = `${dateStr}T${timeStr}`;
      
      // حساب وقت الانتهاء بعد ساعة
      const startDateTime = new Date(`${appointment.Date}T${appointment.Time || '09:00'}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
      const endDateStr = endDateTime.toISOString().split('T')[0].replace(/-/g, '');
      const endTimeHours = String(endDateTime.getHours()).padStart(2, '0');
      const endTimeMinutes = String(endDateTime.getMinutes()).padStart(2, '0');
      const endIso = `${endDateStr}T${endTimeHours}${endTimeMinutes}00`;

      const dates = `${startIso}/${endIso}`;
      const details = encodeURIComponent(
        `تطبيق سِجِل الطبي\nالطبيب: ${appointment.DoctorName || '-'}\nالعيادة / الموقع: ${appointment.Location || '-'}\nملاحظات: ${appointment.Notes || '-'}`
      );
      const location = encodeURIComponent(appointment.Location || '');

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    } catch (err) {
      console.error('[appointmentService] Error generating Google Calendar URL:', err);
      return '';
    }
  },

  /**
   * إضافة موعد جديد مع دعم التكامل مع Google Calendar
   * @param {Object} appointmentData بيانات الموعد
   * @returns {Promise<Object>} الموعد بعد الإضافة
   */
  async addAppointment(appointmentData) {
    try {
      const appointmentId = appointmentData.AppointmentID || `APT_${Date.now()}`;
      const now = new Date().toISOString();

      // توليد رابط تقويم جوجل تلقائياً إذا كان مفعل
      const googleCalUrl = this.generateGoogleCalendarUrl(appointmentData);

      const newAppt = {
        AppointmentID: appointmentId,
        PatientID: appointmentData.PatientID || 'P_01',
        Title: appointmentData.Title || '',
        DoctorName: appointmentData.DoctorName || '',
        Date: appointmentData.Date || new Date().toISOString().split('T')[0],
        Time: appointmentData.Time || '09:00',
        Location: appointmentData.Location || '',
        Notes: appointmentData.Notes || '',
        CalendarEventID: appointmentData.CalendarEventID || (appointmentData.syncCalendar ? `cal_${appointmentId}` : ''),
        GoogleCalendarUrl: googleCalUrl,
        syncCalendar: !!appointmentData.syncCalendar,
        CreatedAt: appointmentData.CreatedAt || now,
        UpdatedAt: now,
        ...appointmentData
      };

      const docRef = doc(db, COLLECTION_NAME, appointmentId);
      await setDoc(docRef, newAppt, { merge: true });

      return { id: appointmentId, ...newAppt };
    } catch (error) {
      console.error('[appointmentService] Error adding appointment:', error);
      throw error;
    }
  },

  /**
   * تحديث موعد قائم
   * @param {string} appointmentId معرف الموعد
   * @param {Object} updatedFields الحقول المحدثة
   * @returns {Promise<Object>} الموعد بعد التحديث
   */
  async updateAppointment(appointmentId, updatedFields) {
    if (!appointmentId) throw new Error('معرف الموعد مطلوب للتحديث');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(appointmentId));
      
      let googleCalUrl = updatedFields.GoogleCalendarUrl;
      if (updatedFields.Date || updatedFields.Time || updatedFields.Title) {
        googleCalUrl = this.generateGoogleCalendarUrl({
          ...updatedFields,
          AppointmentID: appointmentId
        });
      }

      const payload = {
        ...updatedFields,
        ...(googleCalUrl ? { GoogleCalendarUrl: googleCalUrl } : {}),
        UpdatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      return { AppointmentID: appointmentId, ...payload };
    } catch (error) {
      console.error(`[appointmentService] Error updating appointment ${appointmentId}:`, error);
      throw error;
    }
  },

  /**
   * حذف موعد من Firebase
   * @param {string} appointmentId معرف الموعد
   * @returns {Promise<boolean>} نجاح الحذف
   */
  async deleteAppointment(appointmentId) {
    if (!appointmentId) throw new Error('معرف الموعد مطلوب للحذف');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(appointmentId));
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[appointmentService] Error deleting appointment ${appointmentId}:`, error);
      throw error;
    }
  }
};

// Aliases
export const fetchAppointments = (patientId) => appointmentService.getAppointments(patientId);
export const fetchAppointmentById = (id) => appointmentService.getAppointmentById(id);
export const createAppointment = (data) => appointmentService.addAppointment(data);
export const updateAppointment = (id, data) => appointmentService.updateAppointment(id, data);
export const deleteAppointment = (id) => appointmentService.deleteAppointment(id);
export const getGoogleCalendarUrl = (appt) => appointmentService.generateGoogleCalendarUrl(appt);

export default appointmentService;
