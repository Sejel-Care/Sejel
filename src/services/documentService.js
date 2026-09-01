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
 * سِجِل (Sejel) - خدمة إدارة المستندات والملفات الطبية (Documents / Files Service)
 * documentService.js - Google Drive Cloud Storage & Firestore Metadata
 * ==============================================================================
 */

const COLLECTION_NAME = 'files';

export const documentService = {
  /**
   * جلب كافة المستندات مع دعم الفلترة حسب المريض والتصنيف
   * @param {string|null} patientId معرف المريض أو uid
   * @param {string|null} category تصنيف المستند (Prescription, Lab, Radiology, etc.)
   * @returns {Promise<Array>} قائمة المستندات
   */
  async getDocuments(patientId = null, category = null) {
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
      let documents = [];
      querySnapshot.forEach((docSnap) => {
        documents.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      if (category) {
        documents = documents.filter(d => d.Category === category);
      }

      // فرز محلي حسب تاريخ الرفع تنازلياً
      return documents.sort((a, b) => new Date(b.UploadedAt || 0) - new Date(a.UploadedAt || 0));
    } catch (error) {
      console.error('[documentService] Error fetching documents:', error);
      throw error;
    }
  },

  /**
   * جلب مستند محدد بواسطة المعرف
   * @param {string} fileId معرف الملف
   * @returns {Promise<Object|null>} بيانات المستند
   */
  async getDocumentById(fileId) {
    if (!fileId) return null;
    try {
      const docRef = doc(db, COLLECTION_NAME, String(fileId));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error(`[documentService] Error fetching document ${fileId}:`, error);
      throw error;
    }
  },

  /**
   * رفع وتوثيق مستند طبي في Google Drive وربطه بـ Firestore مع دعم اسم المريض
   * @param {Object} options { file, uid, patientId, patientName, category, visitId }
   * @returns {Promise<Object>} المستند الموثق مع روابط Google Drive
   */
  async uploadDocument({ file, uid = null, patientId = null, patientName = null, category = 'Other', visitId = '' }) {
    if (!file) throw new Error('الملف مطلوب للرفع');
    try {
      const fileId = `FIL_${Date.now()}`;
      const now = new Date().toISOString();
      const currentUid = uid || auth.currentUser?.uid || 'General';
      const effectivePatientId = patientId || 'P_01';
      
      // 1. الرفع إلى Google Drive الخاص بالمستخدم عبر driveService (مجلد المريض باسمه)
      const driveUpload = await driveService.uploadDocument({
        file,
        uid: currentUid,
        patientId: effectivePatientId,
        patientName,
        category,
        visitId
      });

      const driveUrl = driveUpload.driveUrl || driveUpload.downloadUrl || '';
      const downloadUrl = driveUpload.downloadUrl || driveUpload.directUrl || driveUrl;
      const previewUrl = driveUpload.previewUrl || (driveUpload.fileId ? `https://drive.google.com/file/d/${driveUpload.fileId}/preview` : downloadUrl);

      // 2. إعداد وتوثيق سجل المستند مع uid و patientId و downloadUrl و previewUrl
      const fileRecord = {
        FileID: fileId,
        uid: currentUid,
        PatientID: effectivePatientId,
        FileName: file.name,
        Category: category || 'Other',
        FileType: driveUpload.fileType || getFileTypeFromName(file.name, file.type),
        DriveURL: driveUrl,
        PreviewURL: previewUrl,
        DownloadURL: downloadUrl,
        FileUrl: downloadUrl,
        DriveFileID: driveUpload.fileId || '',
        VisitID: visitId || '',
        UploadedAt: now,
        CreatedAt: now,
        UpdatedAt: now
      };

      // 3. الحفظ في Firestore في مجموعتي files و documents لضمان التوافق
      try {
        await Promise.all([
          setDoc(doc(db, 'files', fileId), fileRecord, { merge: true }),
          setDoc(doc(db, 'documents', fileId), fileRecord, { merge: true })
        ]);
      } catch (fsErr) {
        console.warn('[documentService] Firestore save deferred:', fsErr);
      }

      // 4. ربط المرفق بالزيارة إن كانت محددة
      if (visitId) {
        try {
          const visitDocRef = doc(db, 'visits', String(visitId));
          const visitSnap = await getDoc(visitDocRef);
          if (visitSnap.exists()) {
            const vData = visitSnap.data();
            let attachments = [];
            try {
              attachments = typeof vData.Attachments === 'string' ? JSON.parse(vData.Attachments || '[]') : (vData.Attachments || []);
            } catch {
              attachments = [];
            }
            if (!attachments.includes(fileId)) {
              attachments.push(fileId);
              await setDoc(visitDocRef, { Attachments: JSON.stringify(attachments) }, { merge: true });
            }
          }
        } catch (vErr) {
          console.warn('[documentService] Could not link attachment to visit:', vErr);
        }
      }

      return { id: fileId, ...fileRecord, localBlobUrl: driveUpload.localBlobUrl };
    } catch (error) {
      console.error('[documentService] Error uploading document to Google Drive:', error);
      throw error;
    }
  },

  /**
   * إضافة سجل مستند يدوياً (Metadata)
   * @param {Object} documentData بيانات المستند
   * @returns {Promise<Object>} المستند المضاف
   */
  async addDocument(documentData) {
    try {
      const fileId = documentData.FileID || `FIL_${Date.now()}`;
      const now = new Date().toISOString();
      const currentUid = documentData.uid || auth.currentUser?.uid || documentData.PatientID || 'General';

      const newDoc = {
        FileID: fileId,
        uid: currentUid,
        PatientID: documentData.PatientID || currentUid,
        FileName: documentData.FileName || 'Document',
        Category: documentData.Category || 'Other',
        FileType: documentData.FileType || 'Document',
        DriveURL: documentData.DriveURL || documentData.DownloadURL || documentData.FileUrl || '',
        DownloadURL: documentData.DownloadURL || documentData.DriveURL || documentData.FileUrl || '',
        FileUrl: documentData.FileUrl || documentData.DownloadURL || documentData.DriveURL || '',
        VisitID: documentData.VisitID || '',
        UploadedAt: documentData.UploadedAt || now,
        CreatedAt: documentData.CreatedAt || now,
        UpdatedAt: now,
        ...documentData
      };

      await Promise.all([
        setDoc(doc(db, COLLECTION_NAME, fileId), newDoc, { merge: true }),
        setDoc(doc(db, 'documents', fileId), newDoc, { merge: true })
      ]);

      return { id: fileId, ...newDoc };
    } catch (error) {
      console.error('[documentService] Error adding document record:', error);
      throw error;
    }
  },

  /**
   * تحديث بيانات مستند قائم
   * @param {string} fileId معرف الملف
   * @param {Object} updatedFields الحقول المحدثة
   * @returns {Promise<Object>} المستند بعد التحديث
   */
  async updateDocument(fileId, updatedFields) {
    if (!fileId) throw new Error('معرف الملف مطلوب للتحديث');
    try {
      const payload = {
        ...updatedFields,
        UpdatedAt: new Date().toISOString()
      };

      await Promise.all([
        setDoc(doc(db, COLLECTION_NAME, String(fileId)), payload, { merge: true }),
        setDoc(doc(db, 'documents', String(fileId)), payload, { merge: true })
      ]);

      return { FileID: fileId, ...payload };
    } catch (error) {
      console.error(`[documentService] Error updating document ${fileId}:`, error);
      throw error;
    }
  },

  /**
   * حذف مستند من Firestore
   * @param {string} fileId معرف الملف
   * @returns {Promise<boolean>} نجاح الحذف
   */
  async deleteDocument(fileId) {
    if (!fileId) throw new Error('معرف الملف مطلوب للحذف');
    try {
      await Promise.all([
        deleteDoc(doc(db, COLLECTION_NAME, String(fileId))),
        deleteDoc(doc(db, 'documents', String(fileId)))
      ]);

      return true;
    } catch (error) {
      console.error(`[documentService] Error deleting document ${fileId}:`, error);
      throw error;
    }
  }
};

function getFileTypeFromName(fileName = '', mimeType = '') {
  const lower = fileName.toLowerCase();
  if (mimeType.includes('pdf') || lower.endsWith('.pdf')) return 'PDF';
  if (mimeType.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lower)) return 'Image';
  if (mimeType.includes('audio') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(lower)) return 'Audio';
  return 'Document';
}

// Aliases
export const fetchDocuments = (patientId, category) => documentService.getDocuments(patientId, category);
export const fetchDocumentById = (id) => documentService.getDocumentById(id);
export const uploadDocument = (options) => documentService.uploadDocument(options);
export const createDocument = (data) => documentService.addDocument(data);
export const updateDocument = (id, data) => documentService.updateDocument(id, data);
export const deleteDocument = (id) => documentService.deleteDocument(id);

export default documentService;
