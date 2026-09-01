import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';
import { patientService } from './patientService';
import { visitService } from './visitService';
import { medicationService } from './medicationService';
import { vitalService } from './vitalService';
import { symptomService } from './symptomService';
import { appointmentService } from './appointmentService';
import { documentService } from './documentService';
import { driveService } from './driveService';

/**
 * ==============================================================================
 * سِجِل (Sejel) - طبقة خدمات الاتصال بالواجهة الخلفية السحابية (API Service)
 * apiService.js - Firebase Firestore Backend & Google Drive Storage
 * ==============================================================================
 */

const serviceMap = {
  patients: patientService,
  visits: visitService,
  medications: medicationService,
  vitals: vitalService,
  symptoms: symptomService,
  appointments: appointmentService,
  files: documentService
};

export const apiService = {
  /**
   * فحص الاتصال بقاعدة بيانات Firebase
   */
  async testConnection() {
    try {
      await getDocs(query(collection(db, 'patients')));
      return {
        success: true,
        data: { status: 'online', engine: 'firebase' },
        message: 'تم الاتصال بقاعدة بيانات Firebase السحابية بنجاح!'
      };
    } catch (err) {
      console.error('[Sejel API] Firebase connection test error:', err);
      return {
        success: false,
        error: err.message,
        message: 'تعذر الاتصال بـ Firebase: ' + err.message
      };
    }
  },

  /**
   * جلب كافة بيانات المريض من الـ 7 جداول من Firebase Firestore
   */
  async fetchAllData(urlOrOptions = null, patientId = null) {
    try {
      const pid = (typeof urlOrOptions === 'string' && !urlOrOptions.startsWith('http') ? urlOrOptions : null) || patientId;

      const [
        patients,
        visits,
        medications,
        vitals,
        symptoms,
        appointments,
        files
      ] = await Promise.all([
        patientService.getPatients(),
        visitService.getVisits(pid),
        medicationService.getMedications(pid),
        vitalService.getVitals(pid),
        symptomService.getSymptoms(pid),
        appointmentService.getAppointments(pid),
        documentService.getDocuments(pid)
      ]);

      return {
        success: true,
        data: {
          patients,
          visits,
          medications,
          vitals,
          symptoms,
          appointments,
          files
        },
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('[Sejel API] fetchAllData Error:', err);
      throw err;
    }
  },

  /**
   * جلب قائمة المرضى المسجلين
   */
  async fetchPatients() {
    try {
      const patients = await patientService.getPatients();
      return {
        success: true,
        data: patients
      };
    } catch (err) {
      console.error('[Sejel API] fetchPatients Error:', err);
      throw err;
    }
  },

  /**
   * إرسال قائمة العمليات العالقة دفعة واحدة عبر Firebase Batch (Batch Synchronization)
   */
  async batchSync(apiUrlOrNull, operations = []) {
    if (!operations || operations.length === 0) {
      return { success: true, results: [] };
    }

    try {
      const batch = writeBatch(db);
      const results = [];

      for (const op of operations) {
        const { table, operation, data, localId } = op;
        const tableName = (table || '').toLowerCase();
        const pk = getPkName(tableName);
        const recordId = (data && data[pk]) || localId;

        if (!recordId) continue;

        const docRef = doc(db, tableName, String(recordId));

        if (operation === 'delete') {
          batch.delete(docRef);
          results.push({ localId, operation: 'delete', table: tableName, success: true });
        } else {
          // create or update
          const cleanData = { ...data };
          delete cleanData.id;
          delete cleanData.localBlobUrl;
          cleanData.UpdatedAt = cleanData.UpdatedAt || new Date().toISOString();

          batch.set(docRef, cleanData, { merge: true });
          results.push({ localId, operation, table: tableName, success: true, data: cleanData });
        }
      }

      await batch.commit();

      return {
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('[Sejel API] batchSync Error:', err);
      throw err;
    }
  },

  /**
   * حفظ سجل فردي في Firebase
   */
  async saveRecord(urlOrTable, tableOrData, dataOrOptions = {}, extraOptions = {}) {
    let tableName = typeof urlOrTable === 'string' && !urlOrTable.startsWith('http') ? urlOrTable : tableOrData;
    let recordData = typeof tableOrData === 'object' ? tableOrData : dataOrOptions;

    tableName = String(tableName || '').toLowerCase();
    const service = serviceMap[tableName];

    if (!service) {
      throw new Error(`الجدول ${tableName} غير مدعوم في Firebase Service`);
    }

    const pk = getPkName(tableName);
    const id = recordData[pk];

    if (id) {
      return await service[`update${capitalizeSingular(tableName)}`](id, recordData);
    } else {
      return await service[`add${capitalizeSingular(tableName)}`](recordData);
    }
  },

  /**
   * رفع ملف إلى Google Drive وتوثيقه في Firestore مع حقل uid
   */
  async uploadFileToDrive(urlOrPayload, maybePayload = {}) {
    const payload = (typeof urlOrPayload === 'object' ? urlOrPayload : maybePayload) || {};
    const { fileName, fileData, mimeType, uid, patientId, category, visitId, fileType, file } = payload;

    try {
      let uploadTarget = file;

      if (!uploadTarget && fileData) {
        uploadTarget = base64ToBlob(fileData, mimeType || 'application/octet-stream');
        if (fileName) {
          uploadTarget.name = fileName;
        }
      }

      if (!uploadTarget) {
        throw new Error('لم يتم تمرير ملف صالح للرفع');
      }

      const targetUid = uid || 'General';
      const targetPatientId = patientId || targetUid;

      const uploadResult = await driveService.uploadDocument({
        file: uploadTarget,
        uid: targetUid,
        patientId: targetPatientId,
        category: category || 'Other',
        visitId: visitId || ''
      });

      const fileId = uploadResult.fileId || `FIL_${Date.now()}`;
      const fileRecord = {
        FileID: fileId,
        uid: targetUid,
        PatientID: targetPatientId,
        FileName: fileName || uploadTarget.name || 'Document',
        Category: category || 'Other',
        FileType: fileType || uploadResult.fileType || 'Document',
        DriveURL: uploadResult.driveUrl || uploadResult.downloadUrl || '',
        PreviewURL: uploadResult.previewUrl || (uploadResult.fileId ? `https://drive.google.com/file/d/${uploadResult.fileId}/preview` : ''),
        DownloadURL: uploadResult.downloadUrl || uploadResult.driveUrl || '',
        FileUrl: uploadResult.downloadUrl || uploadResult.driveUrl || '',
        DriveFileID: uploadResult.fileId || '',
        VisitID: visitId || '',
        UploadedAt: new Date().toISOString(),
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };

      await Promise.all([
        setDoc(doc(db, 'files', fileId), fileRecord, { merge: true }),
        setDoc(doc(db, 'documents', fileId), fileRecord, { merge: true })
      ]);

      return {
        success: true,
        data: fileRecord
      };
    } catch (err) {
      console.error('[Sejel API] uploadFileToDrive (Google Drive) Error:', err);
      throw err;
    }
  },

  /**
   * حذف سجل من جدول معين في Firebase
   */
  async deleteRecord(urlOrTable, tableOrId, idOrNull = null) {
    let tableName = typeof urlOrTable === 'string' && !urlOrTable.startsWith('http') ? urlOrTable : tableOrId;
    let id = idOrNull || (typeof tableOrId === 'string' ? tableOrId : urlOrTable);

    tableName = String(tableName || '').toLowerCase();
    const service = serviceMap[tableName];

    if (service && service[`delete${capitalizeSingular(tableName)}`]) {
      return await service[`delete${capitalizeSingular(tableName)}`](id);
    }

    const docRef = doc(db, tableName, String(id));
    await deleteDoc(docRef);
    return { success: true };
  }
};

/**
 * تحويل Base64 إلى Blob
 */
function base64ToBlob(base64Data, contentType = '') {
  let base64String = base64Data;
  if (base64String.includes('base64,')) {
    base64String = base64String.split('base64,')[1];
  }
  const sliceSize = 1024;
  const byteCharacters = atob(base64String);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

function getPkName(table) {
  const map = {
    patients: 'PatientID',
    visits: 'VisitID',
    medications: 'MedicationID',
    vitals: 'VitalID',
    symptoms: 'SymptomID',
    appointments: 'AppointmentID',
    files: 'FileID'
  };
  return map[table] || 'id';
}

function capitalizeSingular(tableName) {
  const map = {
    patients: 'Patient',
    visits: 'Visit',
    medications: 'Medication',
    vitals: 'Vital',
    symptoms: 'Symptom',
    appointments: 'Appointment',
    files: 'Document'
  };
  return map[tableName] || tableName;
}

export default apiService;
