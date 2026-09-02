import { db } from './indexedDB';
import { apiService } from '../services/apiService';
import { documentService } from '../services/documentService';

/**
 * ==============================================================================
 * سِجِل (Sejel) - محرك المزامنة السحابية للعمل بدون إنترنت والرفع إلى Firebase
 * syncEngine.js - Offline-First Sync Engine powered by Firebase
 * ==============================================================================
 */

export const syncEngine = {
  /**
   * جلب معرف/رابط الواجهة السحابية المحفوظ
   */
  async getApiUrl() {
    try {
      const setting = await db.settings.get('appsScriptUrl');
      return setting ? setting.value : (localStorage.getItem('sejel_gas_url') || 'firebase');
    } catch {
      return localStorage.getItem('sejel_gas_url') || 'firebase';
    }
  },

  /**
   * حفظ معرف/رابط السحابة
   */
  async setApiUrl(url) {
    const cleanUrl = url ? url.trim() : '';
    await db.settings.put({ key: 'appsScriptUrl', value: cleanUrl });
    localStorage.setItem('sejel_gas_url', cleanUrl);
    return cleanUrl;
  },

  /**
   * اختبار الاتصال بسحابة Firebase
   */
  async testConnection(url = null) {
    return await apiService.testConnection();
  },

  /**
   * تنفيذ المزامنة الكاملة (إرسال التغييرات العالقة ثم سحب التحديثات من Firebase)
   */
  async syncAll() {
    if (!navigator.onLine) {
      return { success: false, offline: true, message: 'الجهاز غير متصل بالإنترنت حالياً' };
    }

    let pushedCount = 0;
    let pulledCount = 0;

    try {
      // 1. إرسال قائمة التعديلات العالقة في syncQueue (Push Sync)
      const queueItems = await db.syncQueue.toArray();
      if (queueItems.length > 0) {
        const operations = queueItems.map(item => ({
          table: item.table.toLowerCase(),
          operation: item.operation,
          data: item.data,
          localId: item.localId
        }));

        const pushResult = await apiService.batchSync(null, operations);

        if (pushResult && pushResult.success) {
          pushedCount = operations.length;
          await db.syncQueue.clear();
          
          const tables = ['patients', 'visits', 'medications', 'vitals', 'symptoms', 'appointments', 'files'];
          for (const table of tables) {
            if (db[table]) {
              await db[table].toCollection().modify({ _syncStatus: 'synced' });
            }
          }
        }
      }

      // 2. سحب البيانات الحديثة من Firebase Firestore (Pull Sync)
      const pullData = await apiService.fetchAllData();

      if (pullData && pullData.success && pullData.data) {
        const remoteData = pullData.data;

        for (const [tableKey, records] of Object.entries(remoteData)) {
          const tableName = tableKey.toLowerCase();
          if (db[tableName] && Array.isArray(records)) {
            const pkName = getPkName(tableName);
            for (const record of records) {
              const pkVal = record[pkName];
              if (!pkVal) continue;

              const existing = await db[tableName].where(pkName).equals(pkVal).first();
              if (existing) {
                if (existing._syncStatus === 'synced') {
                  await db[tableName].update(existing.id, { ...record, _syncStatus: 'synced' });
                }
              } else {
                await db[tableName].add({ ...record, _syncStatus: 'synced' });
                pulledCount++;
              }
            }
          }
        }
      }

      try {
        window.dispatchEvent(new CustomEvent('sejel:sync-completed', { detail: { pushedCount, pulledCount } }));
      } catch {}

      return {
        success: true,
        pushedCount,
        pulledCount,
        timestamp: new Date().toISOString(),
        message: `تمت المزامنة بنجاح مع Firebase: تم إرسال ${pushedCount} وتحديث ${pulledCount} سجل.`
      };
    } catch (err) {
      console.error('[Sejel Sync] Error during Firebase sync:', err);
      return { success: false, error: err.message, message: 'حدث خطأ أثناء المزامنة: ' + err.message };
    }
  },

  /**
   * رفع ملف أو روشتة إلى Google Drive وتوثيقه في جدول Files وربطه بـ VisitID
   */
  async uploadFileToDrive({ file, uid = null, patientId = null, patientName = null, category = 'Other', visitId = '' }) {
    const now = new Date().toISOString();
    const localFileId = `FIL_${Date.now()}`;
    const fileType = getFileTypeFromName(file.name, file.type);
    const targetUid = uid || 'General';
    const effectivePatientId = patientId || 'P_01';
    let blobUrl = '';
    try {
      blobUrl = URL.createObjectURL(file);
    } catch {}

    const fileRecord = {
      FileID: localFileId,
      uid: targetUid,
      PatientID: effectivePatientId,
      FileName: file.name,
      Category: category || 'Other',
      FileType: fileType,
      DriveURL: '',
      DownloadURL: '',
      FileUrl: blobUrl,
      VisitID: visitId || '',
      UploadedAt: now,
      localBlobUrl: blobUrl,
      _syncStatus: 'pending_create'
    };

    // 1. حفظ فوري في IndexedDB لدعم السرعة والعمل Offline
    try {
      await db.files.add(fileRecord);
      try {
        window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table: 'files', operation: 'create' } }));
      } catch {}
    } catch (dbErr) {
      console.warn('Error adding local file to Dexie:', dbErr);
    }

    // 2. ربط المرفق بالزيارة إن وُجدت
    if (visitId) {
      try {
        const visit = await db.visits.where('VisitID').equals(visitId).first();
        if (visit) {
          let attachments = [];
          try {
            attachments = typeof visit.Attachments === 'string' ? JSON.parse(visit.Attachments || '[]') : (visit.Attachments || []);
          } catch {
            attachments = [];
          }
          if (!attachments.includes(localFileId)) {
            attachments.push(localFileId);
            await db.visits.update(visit.id, { Attachments: JSON.stringify(attachments) });
          }
        }
      } catch (vErr) {
        console.warn('Could not link attachment to visit locally:', vErr);
      }
    }

    // 3. الرفع السحابي الفوري إلى Google Drive
    if (navigator.onLine) {
      try {
        const uploadedDoc = await documentService.uploadDocument({
          file,
          uid: targetUid,
          patientId: effectivePatientId,
          patientName,
          category: category || 'Other',
          visitId: visitId || ''
        });

        if (uploadedDoc) {
          const finalUrl = uploadedDoc.DownloadURL || uploadedDoc.DriveURL || uploadedDoc.FileUrl;
          const previewUrl = uploadedDoc.PreviewURL || uploadedDoc.previewUrl || (uploadedDoc.DriveFileID ? `https://drive.google.com/file/d/${uploadedDoc.DriveFileID}/preview` : finalUrl);
          const existing = await db.files.where('FileID').equals(localFileId).first();
          if (existing) {
            await db.files.update(existing.id, {
              DriveURL: finalUrl,
              DownloadURL: finalUrl,
              FileUrl: finalUrl,
              PreviewURL: previewUrl,
              DriveFileID: uploadedDoc.DriveFileID || uploadedDoc.fileId || '',
              uid: targetUid,
              _syncStatus: 'synced'
            });
          }

          try {
            window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table: 'files', operation: 'update' } }));
          } catch {}

          return { 
            ...fileRecord, 
            uid: targetUid,
            DriveURL: finalUrl, 
            DownloadURL: finalUrl, 
            FileUrl: finalUrl, 
            PreviewURL: previewUrl,
            DriveFileID: uploadedDoc.DriveFileID || uploadedDoc.fileId || '',
            _syncStatus: 'synced' 
          };
        }
      } catch (err) {
        console.error('[Sejel File] Google Drive upload failed:', err);
        throw err;
      }
    } else {
      // إضافة إلى queue في حالة عدم وجود شبكة
      await db.syncQueue.add({
        table: 'files',
        operation: 'create',
        data: fileRecord,
        localId: localFileId,
        timestamp: Date.now(),
        attempts: 0
      });
    }

    return fileRecord;
  }
};

function getFileTypeFromName(fileName = '', mimeType = '') {
  const lower = fileName.toLowerCase();
  if (mimeType.includes('pdf') || lower.endsWith('.pdf')) return 'PDF';
  if (mimeType.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lower)) return 'Image';
  if (mimeType.includes('audio') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(lower)) return 'Audio';
  return 'Document';
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

export default syncEngine;
