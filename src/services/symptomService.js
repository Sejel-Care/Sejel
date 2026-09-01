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
import { db, auth } from './firebase';
import { driveService } from './driveService';

/**
 * ==============================================================================
 * سِجِل (Sejel) - خدمة إدارة الأعراض والتسجيلات الصوتية (Symptoms Service)
 * symptomService.js - Google Drive Audio Storage & Firestore Data
 * ==============================================================================
 */

const COLLECTION_NAME = 'symptoms';

export const symptomService = {
  /**
   * جلب سجلات الأعراض مع دعم الفلترة حسب المريض
   * @param {string|null} patientId معرف المريض أو uid
   * @returns {Promise<Array>} قائمة الأعراض
   */
  async getSymptoms(patientId = null) {
    try {
      const pid = patientId || auth.currentUser?.uid;
      let q;
      if (pid) {
        q = query(
          collection(db, COLLECTION_NAME),
          where('PatientID', '==', String(pid))
        );
      } else {
        q = query(collection(db, COLLECTION_NAME));
      }

      const querySnapshot = await getDocs(q);
      const symptoms = [];
      querySnapshot.forEach((docSnap) => {
        symptoms.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // فرز حسب التاريخ تنازلياً
      return symptoms.sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0));
    } catch (error) {
      console.error('[symptomService] Error fetching symptoms:', error);
      throw error;
    }
  },

  /**
   * جلب عرض مرضي محدد بواسطة المعرف
   * @param {string} symptomId معرف العرض
   * @returns {Promise<Object|null>} بيانات العرض
   */
  async getSymptomById(symptomId) {
    if (!symptomId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, String(symptomId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`[symptomService] Error fetching symptom ${symptomId}:`, error);
      throw error;
    }
  },

  /**
   * رفع تسجيل صوتي إلى Google Drive الخاص بالمستخدم تحت: Sejel/{uid}/{PatientName}/Audio/{filename}
   * @param {Blob|File} audioBlob ملف أو تسجيل الصوت
   * @param {string|null} uid معرف المستخدم
   * @param {string|null} patientId معرف المريض
   * @param {string|null} patientName اسم المريض
   * @returns {Promise<string>} رابط Google Drive المباشر للتنزيل والتشغيل
   */
  async uploadAudio(audioBlob, uid = null, patientId = null, patientName = null) {
    if (!audioBlob) return '';
    try {
      const currentUid = uid || auth.currentUser?.uid || 'General';
      const effectivePatientId = patientId || 'P_01';
      const driveUpload = await driveService.uploadAudio({
        audioBlob,
        uid: currentUid,
        patientId: effectivePatientId,
        patientName
      });

      return driveUpload.directUrl || driveUpload.downloadUrl || driveUpload.driveUrl || '';
    } catch (error) {
      console.warn('[symptomService] Error uploading audio to Google Drive:', error);
      return '';
    }
  },

  /**
   * إضافة عرض مرضي جديد وحفظه في Firestore مع حقل uid ورابط الصوت
   * @param {Object} symptomData بيانات العرض
   * @returns {Promise<Object>} العرض بعد الإضافة
   */
  async addSymptom(symptomData) {
    try {
      const symptomId = symptomData.SymptomID || `SYM_${Date.now()}`;
      const now = new Date().toISOString();
      const currentUid = symptomData.uid || auth.currentUser?.uid || symptomData.PatientID || 'General';

      const newSymptom = {
        SymptomID: symptomId,
        uid: currentUid,
        PatientID: symptomData.PatientID || currentUid,
        Date: symptomData.Date || now,
        Description: symptomData.Description || '',
        Severity: Number(symptomData.Severity) || 5,
        AudioFileURL: symptomData.AudioFileURL || symptomData.audioUrl || '',
        Duration: symptomData.Duration || '',
        Notes: symptomData.Notes || '',
        CreatedAt: symptomData.CreatedAt || now,
        UpdatedAt: now,
        ...symptomData
      };

      const docRef = doc(db, COLLECTION_NAME, symptomId);
      await setDoc(docRef, newSymptom, { merge: true });

      return { id: symptomId, ...newSymptom };
    } catch (error) {
      console.error('[symptomService] Error adding symptom:', error);
      throw error;
    }
  },

  /**
   * تحديث عرض مرضي قائم
   * @param {string} symptomId معرف العرض
   * @param {Object} updatedFields الحقول المحدثة
   * @returns {Promise<Object>} العرض بعد التحديث
   */
  async updateSymptom(symptomId, updatedFields) {
    if (!symptomId) throw new Error('معرف العرض مطلوب للتحديث');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(symptomId));
      const payload = {
        ...updatedFields,
        UpdatedAt: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge: true });
      return { SymptomID: symptomId, ...payload };
    } catch (error) {
      console.error(`[symptomService] Error updating symptom ${symptomId}:`, error);
      throw error;
    }
  },

  /**
   * حذف عرض مرضي من Firebase
   * @param {string} symptomId معرف العرض
   * @returns {Promise<boolean>} نجاح الحذف
   */
  async deleteSymptom(symptomId) {
    if (!symptomId) throw new Error('معرف العرض مطلوب للحذف');
    try {
      const docRef = doc(db, COLLECTION_NAME, String(symptomId));
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[symptomService] Error deleting symptom ${symptomId}:`, error);
      throw error;
    }
  }
};

// Aliases
export const fetchSymptoms = (patientId) => symptomService.getSymptoms(patientId);
export const fetchSymptomById = (id) => symptomService.getSymptomById(id);
export const uploadSymptomAudio = (blob, patientId) => symptomService.uploadAudio(blob, patientId);
export const createSymptom = (data) => symptomService.addSymptom(data);
export const updateSymptom = (id, data) => symptomService.updateSymptom(id, data);
export const deleteSymptom = (id) => symptomService.deleteSymptom(id);

export default symptomService;
