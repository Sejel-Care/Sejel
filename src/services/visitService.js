import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * ==============================================================================
 * سِجِل (Sejel) - خدمة إدارة الزيارات الطبية (Visits Service)
 * visitService.js - Firebase Firestore CRUD operations for Visits
 * ==============================================================================
 */

const COLLECTION_NAME = 'visits';

export const visitService = {
  /**
   * جلب الزيارات الطبية مع دعم الفلترة حسب المريض
   * @param {string|null} patientId معرف المريض للفلترة
   * @returns {Promise<Array>} قائمة الزيارات
   */
  async getVisits(patientId = null) {
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
      const visits = [];
      querySnapshot.forEach((docSnap) => {
        visits.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // فرز محلي حسب التاريخ تنازلياً لضمان عدم الحاجة لفهارس مركبة مسبقة
      return visits.sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0));
    } catch (error) {
      console.error('[visitService] Error fetching visits:', error);
      throw error;
    }
  },

  /**
   * جلب زيارة طبية محددة بواسطة المعرف
   * @param {string} visitId معرف الزيارة
   * @returns {Promise<Object|null>} بيانات الزيارة
   */
  async getVisitById(visitId) {
    if (!visitId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, String(visitId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`[visitService] Error fetching visit ${visitId}:`, error);
      throw error;
    }
  },

  /**
   * إضافة زيارة طبية جديدة
   * @param {Object} visitData بيانات الزيارة
   * @returns {Promise<Object>} الزيارة بعد الإضافة
   */
  async addVisit(visitData) {
    try {
      const visitId = visitData.VisitID || `V_${Date.now()}`;
      const now = new Date().toISOString();

      const newVisit = {
        VisitID: visitId,
        PatientID: visitData.PatientID || 'P_01',
        Date: visitData.Date || new Date().toISOString().split('T')[0],
        DoctorName: visitData.DoctorName || '',
        Specialty: visitData.Specialty || '',
        Clinic: visitData.Clinic || '',
        Diagnosis: visitData.Diagnosis || '',
        Notes: visitData.Notes || '',
        NextAppointmentDate: visitData.NextAppointmentDate || '',
        Attachments: visitData.Attachments || '[]',
        CreatedAt: visitData.CreatedAt || now,
        UpdatedAt: now,
        ...visitData
      };

      const docRef = doc(db, COLLECTION_NAME, visitId);
      await setDoc(docRef, newVisit, { merge: true });

      return { id: visitId, ...newVisit };
    } catch (error) {
      console.error('[visitService] Error adding visit:', error);
      throw error;
    }
  },

  /**
   * تحديث بيانات زيارة طبية قائمة
   * @param {string} visitId معرف الزيارة
   * @param {Object} updatedFields الحقول المحدثة
   * @returns {Promise<Object>} الزيارة بعد التحديث
   */
  async updateVisit(visitId, updatedFields) {
    if (!visitId) throw new Error('معرف الزيارة مطلوب للتحديث');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(visitId));
      const payload = {
        ...updatedFields,
        UpdatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      return { VisitID: visitId, ...payload };
    } catch (error) {
      console.error(`[visitService] Error updating visit ${visitId}:`, error);
      throw error;
    }
  },

  /**
   * حذف زيارة طبية من Firebase
   * @param {string} visitId معرف الزيارة
   * @returns {Promise<boolean>} نجاح العملية
   */
  async deleteVisit(visitId) {
    if (!visitId) throw new Error('معرف الزيارة مطلوب للحذف');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(visitId));
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[visitService] Error deleting visit ${visitId}:`, error);
      throw error;
    }
  }
};

// Aliases
export const fetchVisits = (patientId) => visitService.getVisits(patientId);
export const fetchVisitById = (id) => visitService.getVisitById(id);
export const createVisit = (data) => visitService.addVisit(data);
export const updateVisit = (id, data) => visitService.updateVisit(id, data);
export const deleteVisit = (id) => visitService.deleteVisit(id);

export default visitService;
