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
 * سِجِل (Sejel) - خدمة إدارة الأدوية والجرعات (Medications Service)
 * medicationService.js - Firebase Firestore CRUD operations for Medications
 * ==============================================================================
 */

const COLLECTION_NAME = 'medications';

export const medicationService = {
  /**
   * جلب كافة الأدوية مع دعم الفلترة حسب المريض
   * @param {string|null} patientId معرف المريض
   * @returns {Promise<Array>} قائمة الأدوية
   */
  async getMedications(patientId = null) {
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
      const medications = [];
      querySnapshot.forEach((docSnap) => {
        medications.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      return medications;
    } catch (error) {
      console.error('[medicationService] Error fetching medications:', error);
      throw error;
    }
  },

  /**
   * جلب دواء محدد بواسطة المعرف
   * @param {string} medicationId معرف الدواء
   * @returns {Promise<Object|null>} بيانات الدواء
   */
  async getMedicationById(medicationId) {
    if (!medicationId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, String(medicationId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`[medicationService] Error fetching medication ${medicationId}:`, error);
      throw error;
    }
  },

  /**
   * إضافة دواء جديد
   * @param {Object} medicationData بيانات الدواء
   * @returns {Promise<Object>} الدواء بعد الإضافة
   */
  async addMedication(medicationData) {
    try {
      const medicationId = medicationData.MedicationID || `M_${Date.now()}`;
      const now = new Date().toISOString();

      const newMed = {
        MedicationID: medicationId,
        PatientID: medicationData.PatientID || 'P_01',
        Name: medicationData.Name || '',
        Dosage: medicationData.Dosage || '',
        Frequency: medicationData.Frequency || '',
        StartDate: medicationData.StartDate || new Date().toISOString().split('T')[0],
        EndDate: medicationData.EndDate || '',
        Instructions: medicationData.Instructions || '',
        ReminderEnabled: typeof medicationData.ReminderEnabled === 'boolean' ? medicationData.ReminderEnabled : true,
        LastTakenDate: medicationData.LastTakenDate || '',
        CreatedAt: medicationData.CreatedAt || now,
        UpdatedAt: now,
        ...medicationData
      };

      const docRef = doc(db, COLLECTION_NAME, medicationId);
      await setDoc(docRef, newMed, { merge: true });

      return { id: medicationId, ...newMed };
    } catch (error) {
      console.error('[medicationService] Error adding medication:', error);
      throw error;
    }
  },

  /**
   * تحديث دواء قائم
   * @param {string} medicationId معرف الدواء
   * @param {Object} updatedFields الحقول المحدثة
   * @returns {Promise<Object>} الدواء بعد التحديث
   */
  async updateMedication(medicationId, updatedFields) {
    if (!medicationId) throw new Error('معرف الدواء مطلوب للتحديث');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(medicationId));
      const payload = {
        ...updatedFields,
        UpdatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      return { MedicationID: medicationId, ...payload };
    } catch (error) {
      console.error(`[medicationService] Error updating medication ${medicationId}:`, error);
      throw error;
    }
  },

  /**
   * تسجيل أخذ الجرعة وتحديث تاريخ آخر أخذ
   * @param {string} medicationId معرف الدواء
   * @returns {Promise<Object>} الدواء المحدث
   */
  async recordDoseTaken(medicationId) {
    const now = new Date().toISOString();
    return await this.updateMedication(medicationId, { LastTakenDate: now });
  },

  /**
   * حذف دواء من Firebase
   * @param {string} medicationId معرف الدواء
   * @returns {Promise<boolean>} نجاح الحذف
   */
  async deleteMedication(medicationId) {
    if (!medicationId) throw new Error('معرف الدواء مطلوب للحذف');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(medicationId));
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[medicationService] Error deleting medication ${medicationId}:`, error);
      throw error;
    }
  }
};

// Aliases
export const fetchMedications = (patientId) => medicationService.getMedications(patientId);
export const fetchMedicationById = (id) => medicationService.getMedicationById(id);
export const createMedication = (data) => medicationService.addMedication(data);
export const updateMedication = (id, data) => medicationService.updateMedication(id, data);
export const deleteMedication = (id) => medicationService.deleteMedication(id);

export default medicationService;
