import { db } from '../db/indexedDB';
import { patientService } from './patientService';

/**
 * ==============================================================================
 * سِجِل (Sejel) - خدمة التكامل والرفع السحابي على Google Drive (Drive API & OAuth2)
 * driveService.js - Google Drive Cloud Storage Integration
 * ==============================================================================
 */

// معرفات مجلدات التخزين
const DRIVE_ROOT_FOLDER_NAME = 'Sejel';
const DRIVE_DOCUMENTS_FOLDER_NAME = 'Documents';
const DRIVE_AUDIO_FOLDER_NAME = 'Audio';

/**
 * تطهير اسم المجلد لحذف أي رموز غير صالحة لأنظمة الملفات وGoogle Drive
 */
export function sanitizeFolderName(name) {
  if (!name || typeof name !== 'string') return 'Patient';
  // إزالة الرموز غير المسموحة: / \ ? * : " < > | والتحكم
  const cleaned = name.replace(/[/\\?*:"<>|\x00-\x1F]/g, '_').trim();
  return cleaned || 'Patient';
}

/**
 * تحويل أي رابط Google Drive إلى رابط تشغيل/تنزيل صوتي مباشر
 */
export function getPlayableAudioUrl(url = '') {
  if (!url) return '';
  // إذا كان Data URL أو Blob URL
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  // استخراج ID الملف من مختلف صيغ روابط Google Drive
  let fileId = null;
  const matchView = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const matchLh3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (matchView) fileId = matchView[1];
  else if (matchId) fileId = matchId[1];
  else if (matchLh3) fileId = matchLh3[1];

  if (fileId) {
    // رابط التشغيل والتنزيل المباشر الصالح لـ HTML5 <audio>
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
}

/**
 * جلب رابط فتح الملف أو التسجيل مباشرة في Google Drive
 */
export function getDriveDirectViewUrl(url = '') {
  if (!url) return '';
  let fileId = null;
  const matchView = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const matchLh3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (matchView) fileId = matchView[1];
  else if (matchId) fileId = matchId[1];
  else if (matchLh3) fileId = matchLh3[1];

  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  return url;
}

export const driveService = {
  getPlayableAudioUrl,
  getDriveDirectViewUrl,
  sanitizeFolderName,

  /**
   * جلب رمز وصول Google OAuth2 إن وُجد
   */
  getAccessToken() {
    return (
      localStorage.getItem('google_access_token') ||
      sessionStorage.getItem('google_access_token') ||
      ''
    );
  },

  /**
   * حفظ رمز وصول Google OAuth2
   */
  setAccessToken(token) {
    if (token) {
      localStorage.setItem('google_access_token', token);
    } else {
      localStorage.removeItem('google_access_token');
    }
  },

  /**
   * جلب رابط Google Apps Script Web App المحفوظ (إن وجد)
   */
  getAppsScriptUrl() {
    return localStorage.getItem('sejel_gas_url') || '';
  },

  /**
   * إيجاد أو إنشاء مجلد على Google Drive عبر Google Drive API v3
   */
  async findOrCreateFolder(folderName, parentId = null, accessToken = null) {
    const token = accessToken || this.getAccessToken();
    if (!token) {
      throw new Error('Google Drive Access Token is missing. Please sign in with Google.');
    }

    try {
      let queryStr = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      if (parentId) {
        queryStr += ` and '${parentId}' in parents`;
      } else {
        // Enforce Root Folder check in My Drive
        queryStr += ` and 'root' in parents`;
      }

      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)&spaces=drive`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
          }
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          return searchData.files[0].id;
        }
      } else if (searchRes.status === 401) {
        throw new Error('Google Drive session expired (401). Please sign in again.');
      }

      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : ['root']
      };

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        return createData.id;
      } else {
        const errText = await createRes.text();
        throw new Error(`Failed to create folder "${folderName}": ${createRes.status} ${errText}`);
      }
    } catch (err) {
      console.error(`[driveService] Error finding/creating folder "${folderName}":`, err);
      throw err;
    }
  },

  /**
   * إيجاد أو إنشاء شجرة المجلدات في Google Drive باسم المريض:
   * Sejel/{uid}/{PatientName}/{subfolder}
   * مثل: Sejel/{uid}/Ahmed_Ali/Documents و Sejel/{uid}/Ahmed_Ali/Audio
   */
  async getDestinationFolderId(subfolder = 'Documents', uid = null, patientId = null, patientName = null, accessToken = null) {
    const token = accessToken || this.getAccessToken();
    if (!token) throw new Error('رمز Google Drive غير متوفر.');

    try {
      // 1. المجلد الرئيسي "Sejel" في جذر My Drive
      const rootFolderId = await this.findOrCreateFolder(DRIVE_ROOT_FOLDER_NAME, null, token);
      if (!rootFolderId) throw new Error('فشل إيجاد أو إنشاء مجلد Sejel الرئيسي في Google Drive');

      // 2. مجلد الحساب الرئيسي للمستخدم "{uid}" داخل "Sejel"
      const userFolder = uid || 'General';
      const userFolderId = await this.findOrCreateFolder(userFolder, rootFolderId, token);
      if (!userFolderId) return rootFolderId;

      // 3. تحديد وتطهير اسم المريض (Patient Name)
      let resolvedName = patientName;
      if (!resolvedName && patientId) {
        // محاولة جلب الاسم من Dexie IndexedDB
        try {
          if (db && db.patients) {
            const p = await db.patients.where('PatientID').equals(patientId).first();
            if (p && (p.Name || p.name || p.fullName)) {
              resolvedName = p.Name || p.name || p.fullName;
            }
          }
        } catch {}

        // إذا لم يوجد محلياً، محاولة جلبه من Firestore
        if (!resolvedName) {
          try {
            const p = await patientService.getPatientById(patientId);
            if (p && (p.Name || p.name || p.fullName)) {
              resolvedName = p.Name || p.name || p.fullName;
            }
          } catch {}
        }
      }

      const folderPatientName = sanitizeFolderName(resolvedName || patientId || 'Patient');

      // 4. مجلد المريض/فرد العائلة "{PatientName}" داخل "Sejel/{uid}/"
      const patientFolderId = await this.findOrCreateFolder(folderPatientName, userFolderId, token);
      if (!patientFolderId) return userFolderId;

      // 5. المجلد الفرعي "Documents" أو "Audio" داخل "Sejel/{uid}/{PatientName}/"
      const subFolderId = await this.findOrCreateFolder(subfolder, patientFolderId, token);
      return subFolderId || patientFolderId;
    } catch (err) {
      console.error(`[driveService] Error resolving folder hierarchy (Sejel/${uid}/${patientName || patientId}/${subfolder}):`, err);
      throw err;
    }
  },

  /**
   * رفع ملف إلى Google Drive باستخدام Direct Multipart REST API (OAuth2)
   */
  async uploadViaDriveApi(fileBlob, fileName, mimeType, folderId, accessToken = null) {
    const token = accessToken || this.getAccessToken();
    if (!token) throw new Error('OAuth2 Token is required for Direct Google Drive API');

    const metadata = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
      parents: folderId ? [folderId] : ['root']
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const fileReader = new FileReader();
    const arrayBufferPromise = new Promise((resolve, reject) => {
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(fileBlob);
    });

    const arrayBuffer = await arrayBufferPromise;
    const mediaPartHeader = delimiter +
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;

    const enc = new TextEncoder();
    const part1 = enc.encode(metadataPart);
    const part2Header = enc.encode(mediaPartHeader);
    const part3 = enc.encode(closeDelimiter);

    const combinedLength = part1.length + part2Header.length + arrayBuffer.byteLength + part3.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(part1, offset);
    offset += part1.length;
    combinedBuffer.set(part2Header, offset);
    offset += part2Header.length;
    combinedBuffer.set(new Uint8Array(arrayBuffer), offset);
    offset += arrayBuffer.byteLength;
    combinedBuffer.set(part3, offset);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: combinedBuffer
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Google Drive API error: ${uploadRes.status} ${errText}`);
    }

    const driveData = await uploadRes.json();
    const fileId = driveData.id;

    // جعل الملف متاحاً للمعاينة والتشغيل (Reader)
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      });
    } catch (permErr) {
      console.warn('[driveService] Set file permission skipped:', permErr);
    }

    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const viewUrl = driveData.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

    return {
      fileId,
      driveUrl: viewUrl,
      previewUrl,
      downloadUrl: downloadUrl,
      directUrl: downloadUrl,
      name: fileName
    };
  },

  /**
   * رفع ملف عبر Google Apps Script Web App (Fallback)
   */
  async uploadViaAppsScript(fileBlob, fileName, mimeType, patientId, category, visitId, fileType) {
    const gasUrl = this.getAppsScriptUrl();
    if (!gasUrl) throw new Error('Apps Script Web App URL is not set');

    const base64Data = await blobToBase64(fileBlob);

    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'uploadFile',
        fileName,
        fileData: base64Data,
        mimeType: mimeType || 'application/octet-stream',
        patientId: patientId || 'P_01',
        category: category || 'Other',
        visitId: visitId || '',
        fileType: fileType || 'Document'
      })
    });

    if (!response.ok) {
      throw new Error(`Apps Script upload failed: ${response.status}`);
    }

    const resJson = await response.json();
    if (resJson && resJson.success && resJson.data) {
      const driveUrl = resJson.data.DriveURL || '';
      const downloadUrl = resJson.data.DownloadURL || getPlayableAudioUrl(driveUrl);
      const fileId = resJson.data.FileID || resJson.data.DriveFileID;
      return {
        fileId: fileId,
        driveUrl: driveUrl,
        previewUrl: fileId ? `https://drive.google.com/file/d/${fileId}/preview` : driveUrl,
        downloadUrl: downloadUrl,
        directUrl: downloadUrl,
        name: fileName
      };
    }

    throw new Error(resJson.error || 'Failed to upload via Apps Script');
  },

  /**
   * الرفع الرئيسي لمستند طبي إلى Google Drive الخاص بالمستخدم: Sejel/{uid}/{PatientName}/Documents/{filename}
   */
  async uploadDocument({ file, uid = null, patientId = null, patientName = null, category = 'Other', visitId = '' }) {
    if (!file) throw new Error('الملف مطلوب للرفع');
    const timestamp = Date.now();
    const safeName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const mimeType = file.type || 'application/octet-stream';
    const fileType = getFileTypeFromName(file.name, mimeType);
    const targetUid = uid || 'General';
    const targetPatientId = patientId || targetUid;

    let localBlobUrl = '';
    try {
      localBlobUrl = URL.createObjectURL(file);
    } catch {}

    const token = this.getAccessToken();
    const gasUrl = this.getAppsScriptUrl();

    // 1. محاولة الرفع المباشر عبر Google Drive API v3 (OAuth2) للمستخدم الحالي
    if (token) {
      try {
        const folderId = await this.getDestinationFolderId(DRIVE_DOCUMENTS_FOLDER_NAME, targetUid, targetPatientId, patientName, token);
        if (!folderId) {
          throw new Error(`تعذر الوصول إلى مجلد Sejel/${targetUid}/${patientName || targetPatientId}/Documents على Google Drive`);
        }
        const result = await this.uploadViaDriveApi(file, safeName, mimeType, folderId, token);
        return {
          ...result,
          uid: targetUid,
          patientId: targetPatientId,
          patientName: patientName || '',
          category,
          visitId,
          fileType,
          localBlobUrl
        };
      } catch (err) {
        console.error('[driveService] Direct Drive API upload failed:', err);
        if (!gasUrl) {
          throw new Error(`فشل الرفع إلى Google Drive: ${err.message || 'يرجى التحقق من اتصالك وإعادة تسجيل الدخول'}`);
        }
      }
    }

    // 2. محاولة الرفع عبر Google Apps Script Web App (إن وُجد)
    if (gasUrl) {
      try {
        const result = await this.uploadViaAppsScript(file, safeName, mimeType, targetPatientId, category, visitId, fileType);
        return {
          ...result,
          uid: targetUid,
          patientId: targetPatientId,
          patientName: patientName || '',
          category,
          visitId,
          fileType,
          localBlobUrl
        };
      } catch (gasErr) {
        console.error('[driveService] Apps Script Drive upload failed:', gasErr);
        throw new Error(`فشل الرفع عبر Apps Script: ${gasErr.message}`);
      }
    }

    throw new Error('رمز Google Drive غير متوفر. يرجى تسجيل الدخول بحساب Google أولاً لتفعيل الرفع إلى Drive.');
  },

  /**
   * الرفع الرئيسي لتسجيل صوتي إلى Google Drive الخاص بالمستخدم: Sejel/{uid}/{PatientName}/Audio/{filename}
   */
  async uploadAudio({ audioBlob, uid = null, patientId = null, patientName = null, filename = null }) {
    if (!audioBlob) return { driveUrl: '', downloadUrl: '', directUrl: '' };
    const timestamp = Date.now();
    let ext = 'webm';
    if (audioBlob.type) {
      if (audioBlob.type.includes('mp4') || audioBlob.type.includes('aac') || audioBlob.type.includes('m4a')) ext = 'm4a';
      else if (audioBlob.type.includes('mp3')) ext = 'mp3';
      else if (audioBlob.type.includes('ogg')) ext = 'ogg';
      else if (audioBlob.type.includes('wav')) ext = 'wav';
      else if (audioBlob.type.includes('webm')) ext = 'webm';
    }
    const safeName = filename || `${timestamp}_audio_recording.${ext}`;
    const mimeType = audioBlob.type || 'audio/webm';
    const targetUid = uid || 'General';
    const targetPatientId = patientId || targetUid;

    let localBlobUrl = '';
    try {
      localBlobUrl = URL.createObjectURL(audioBlob);
    } catch {}

    const token = this.getAccessToken();
    const gasUrl = this.getAppsScriptUrl();

    // 1. محاولة الرفع المباشر عبر Google Drive API v3 (OAuth2) للمستخدم الحالي
    if (token) {
      try {
        const folderId = await this.getDestinationFolderId(DRIVE_AUDIO_FOLDER_NAME, targetUid, targetPatientId, patientName, token);
        if (!folderId) {
          throw new Error(`تعذر الوصول إلى مجلد Sejel/${targetUid}/${patientName || targetPatientId}/Audio على Google Drive`);
        }
        const result = await this.uploadViaDriveApi(audioBlob, safeName, mimeType, folderId, token);
        return {
          ...result,
          uid: targetUid,
          patientId: targetPatientId,
          patientName: patientName || '',
          localBlobUrl
        };
      } catch (err) {
        console.error('[driveService] Direct Audio upload via Drive API failed:', err);
        if (!gasUrl) {
          throw new Error(`فشل رفع التسجيل الصوتي إلى Google Drive: ${err.message}`);
        }
      }
    }

    // 2. محاولة الرفع عبر Google Apps Script
    if (gasUrl) {
      try {
        const result = await this.uploadViaAppsScript(audioBlob, safeName, mimeType, targetPatientId, 'Audio', '', 'Audio');
        return {
          ...result,
          uid: targetUid,
          patientId: targetPatientId,
          patientName: patientName || '',
          localBlobUrl
        };
      } catch (gasErr) {
        console.error('[driveService] Apps Script Audio upload failed:', gasErr);
        throw new Error(`فشل رفع التسجيل الصوتي عبر Apps Script: ${gasErr.message}`);
      }
    }

    throw new Error('رمز Google Drive غير متوفر لرفع الصوت. يرجى تسجيل الدخول بحساب Google.');
  }
};

/**
 * تحويل Blob/File إلى Base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function getFileTypeFromName(fileName = '', mimeType = '') {
  const lower = fileName.toLowerCase();
  if (mimeType.includes('pdf') || lower.endsWith('.pdf')) return 'PDF';
  if (mimeType.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lower)) return 'Image';
  if (mimeType.includes('audio') || /\.(mp3|wav|ogg|m4a|webm)$/i.test(lower)) return 'Audio';
  return 'Document';
}

export default driveService;
