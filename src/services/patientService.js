import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * ==============================================================================
 * سِجِل (Sejel) - خدمة إدارة بيانات المرضى (Patients Service)
 * patientService.js - Firebase Firestore CRUD operations for Patients
 * ==============================================================================
 */

const COLLECTION_NAME = 'patients';

export const patientService = {
  /**
   * جلب كافة سجلات المرضى المسجلين
   * @returns {Promise<Array>} قائمة المرضى
   */
  async getPatients() {
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      const patients = [];
      querySnapshot.forEach((docSnap) => {
        patients.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      return patients;
    } catch (error) {
      console.error('[patientService] Error fetching patients:', error);
      throw error;
    }
  },

  /**
   * جلب بيانات مريض محدد بواسطة المعرف الفريد
   * @param {string} patientId معرف المريض
   * @returns {Promise<Object|null>} بيانات المريض
   */
  async getPatientById(patientId) {
    if (!patientId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, String(patientId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`[patientService] Error fetching patient ${patientId}:`, error);
      throw error;
    }
  },

  /**
   * إضافة مريض جديد إلى Firebase
   * @param {Object} patientData بيانات المريض
   * @returns {Promise<Object>} المريض بعد الإضافة
   */
  async addPatient(patientData) {
    try {
      const patientId = patientData.PatientID || `P_${Date.now()}`;
      const now = new Date().toISOString();

      const newPatient = {
        PatientID: patientId,
        Name: patientData.Name || '',
        BirthDate: patientData.BirthDate || '',
        Gender: patientData.Gender || 'Male',
        BloodType: patientData.BloodType || 'O+',
        Height: Number(patientData.Height) || 0,
        Weight: Number(patientData.Weight) || 0,
        Allergies: patientData.Allergies || '',
        ChronicDiseases: patientData.ChronicDiseases || '',
        Surgeries: patientData.Surgeries || '',
        EmergencyContactName: patientData.EmergencyContactName || '',
        EmergencyContactPhone: patientData.EmergencyContactPhone || '',
        GuardianEmail: patientData.GuardianEmail || '',
        PIN: patientData.PIN || (patientData.BirthDate ? String(patientData.BirthDate).substring(0, 4) : '1990'),
        CreatedAt: patientData.CreatedAt || now,
        UpdatedAt: now,
        ...patientData
      };

      // استخدام PatientID كمعرّف للوثيقة في Firestore
      const docRef = doc(db, COLLECTION_NAME, patientId);
      await setDoc(docRef, newPatient, { merge: true });

      return { id: patientId, ...newPatient };
    } catch (error) {
      console.error('[patientService] Error adding patient:', error);
      throw error;
    }
  },

  /**
   * تحديث بيانات مريض قائم
   * @param {string} patientId معرف المريض
   * @param {Object} updatedFields الحقول المحدثة
   * @returns {Promise<Object>} البيانات بعد التحديث
   */
  async updatePatient(patientId, updatedFields) {
    if (!patientId) throw new Error('معرف المريض مطلوب للتحديث');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(patientId));
      const payload = {
        ...updatedFields,
        UpdatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      return { PatientID: patientId, ...payload };
    } catch (error) {
      console.error(`[patientService] Error updating patient ${patientId}:`, error);
      throw error;
    }
  },

  /**
   * حذف مريض من Firebase
   * @param {string} patientId معرف المريض
   * @returns {Promise<boolean>} نجاح الحذف
   */
  async deletePatient(patientId) {
    if (!patientId) throw new Error('معرف المريض مطلوب للحذف');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(patientId));
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[patientService] Error deleting patient ${patientId}:`, error);
      throw error;
    }
  }
};

// Aliases for convenience
export const fetchPatients = () => patientService.getPatients();
export const fetchPatientById = (id) => patientService.getPatientById(id);
export const createPatient = (data) => patientService.addPatient(data);
export const updatePatient = (id, data) => patientService.updatePatient(id, data);
export const deletePatient = (id) => patientService.deletePatient(id);

export default patientService;
