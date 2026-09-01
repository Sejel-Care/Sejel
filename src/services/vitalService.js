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
 * سِجِل (Sejel) - خدمة إدارة المؤشرات والقياسات الحيوية (Vitals Service)
 * vitalService.js - Firebase Firestore CRUD operations for Vitals
 * ==============================================================================
 */

const COLLECTION_NAME = 'vitals';

export const vitalService = {
  /**
   * جلب القياسات الحيوية مع دعم الفلترة حسب المريض ونوع القياس
   * @param {string|null} patientId معرف المريض
   * @param {string|null} vitalType نوع القياس (BloodPressure, Sugar, Pulse, etc.)
   * @returns {Promise<Array>} قائمة القياسات
   */
  async getVitals(patientId = null, vitalType = null) {
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
      let vitals = [];
      querySnapshot.forEach((docSnap) => {
        vitals.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      if (vitalType) {
        vitals = vitals.filter(v => v.Type === vitalType);
      }

      // فرز محلي حسب التاريخ والوقت تنازلياً
      return vitals.sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0));
    } catch (error) {
      console.error('[vitalService] Error fetching vitals:', error);
      throw error;
    }
  },

  /**
   * جلب قياس حيوي محدد
   * @param {string} vitalId معرف القياس
   * @returns {Promise<Object|null>} بيانات القياس
   */
  async getVitalById(vitalId) {
    if (!vitalId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, String(vitalId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`[vitalService] Error fetching vital ${vitalId}:`, error);
      throw error;
    }
  },

  /**
   * إضافة قياس حيوي جديد
   * @param {Object} vitalData بيانات القياس
   * @returns {Promise<Object>} القياس بعد الإضافة
   */
  async addVital(vitalData) {
    try {
      const vitalId = vitalData.VitalID || `VIT_${Date.now()}`;
      const now = new Date().toISOString();

      const newVital = {
        VitalID: vitalId,
        PatientID: vitalData.PatientID || 'P_01',
        Date: vitalData.Date || now,
        Type: vitalData.Type || 'BloodPressure',
        Value: vitalData.Value || '',
        Unit: vitalData.Unit || '',
        Notes: vitalData.Notes || '',
        CreatedAt: vitalData.CreatedAt || now,
        UpdatedAt: now,
        ...vitalData
      };

      const docRef = doc(db, COLLECTION_NAME, vitalId);
      await setDoc(docRef, newVital, { merge: true });

      return { id: vitalId, ...newVital };
    } catch (error) {
      console.error('[vitalService] Error adding vital:', error);
      throw error;
    }
  },

  /**
   * تحديث قياس حيوي قائم
   * @param {string} vitalId معرف القياس
   * @param {Object} updatedFields الحقول المحدثة
   * @returns {Promise<Object>} القياس بعد التحديث
   */
  async updateVital(vitalId, updatedFields) {
    if (!vitalId) throw new Error('معرف القياس الحيوي مطلوب للتحديث');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(vitalId));
      const payload = {
        ...updatedFields,
        UpdatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      return { VitalID: vitalId, ...payload };
    } catch (error) {
      console.error(`[vitalService] Error updating vital ${vitalId}:`, error);
      throw error;
    }
  },

  /**
   * حذف قياس حيوي من Firebase
   * @param {string} vitalId معرف القياس
   * @returns {Promise<boolean>} نجاح الحذف
   */
  async deleteVital(vitalId) {
    if (!vitalId) throw new Error('معرف القياس مطلوب للحذف');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(vitalId));
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[vitalService] Error deleting vital ${vitalId}:`, error);
      throw error;
    }
  }
};

// Aliases
export const fetchVitals = (patientId, vitalType) => vitalService.getVitals(patientId, vitalType);
export const fetchVitalById = (id) => vitalService.getVitalById(id);
export const createVital = (data) => vitalService.addVital(data);
export const updateVital = (id, data) => vitalService.updateVital(id, data);
export const deleteVital = (id) => vitalService.deleteVital(id);

export default vitalService;
