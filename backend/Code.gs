/**
 * ==============================================================================
 * سِجِل (Sejel) - واجهة برمجة التطبيقات الخلفية REST API
 * Code.gs - Google Apps Script Web App REST API Handler
 * ==============================================================================
 */

const APP_NAME = "Sejel Health API";
const APP_VERSION = "1.0.0";
const DRIVE_FOLDER_NAME = "Sejel_Medical_Files";

// خريطة أسماء التبويبات والمفاتيح الأساسية
const PRIMARY_KEYS = {
  Patients: "PatientID",
  Visits: "VisitID",
  Medications: "MedicationID",
  Vitals: "VitalID",
  Symptoms: "SymptomID",
  Appointments: "AppointmentID",
  Files: "FileID"
};

/**
 * معالج طلبات GET
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || "ping";
    const patientId = params.patientId || null;

    if (action === "ping") {
      return createJsonResponse({
        success: true,
        app: APP_NAME,
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        status: "online"
      });
    }

    if (action === "getAllData") {
      const allData = {};
      Object.keys(PRIMARY_KEYS).forEach(table => {
        allData[table.toLowerCase()] = getTableRecords(table, patientId);
      });
      return createJsonResponse({
        success: true,
        data: allData,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "getPatients") {
      const patients = getTableRecords("Patients", null);
      return createJsonResponse({
        success: true,
        data: patients
      });
    }

    if (action === "getTable") {
      const table = params.table;
      if (!table || !PRIMARY_KEYS[table]) {
        return createErrorResponse("اسم الجدول غير صحيح أو غير مدعوم: " + table, 400);
      }
      const records = getTableRecords(table, patientId);
      return createJsonResponse({
        success: true,
        table: table,
        data: records
      });
    }

    return createErrorResponse("إجراء GET غير معروف: " + action, 400);
  } catch (error) {
    return createErrorResponse(error.message, 500);
  }
}

/**
 * معالج طلبات POST
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || "ping";

    // 1. المزامنة المجمعة (Batch Sync)
    if (action === "batchSync") {
      const operations = payload.operations || [];
      const results = executeBatchSync(operations);
      return createJsonResponse({
        success: true,
        results: results,
        timestamp: new Date().toISOString()
      });
    }

    // 2. حفظ مريض (Patient)
    if (action === "savePatient") {
      const patient = payload.data;
      const result = upsertRecord("Patients", "PatientID", patient);
      return createJsonResponse({ success: true, data: result });
    }

    // 3. حفظ زيارة طبيب (Visit)
    if (action === "saveVisit") {
      const visit = payload.data;
      const result = upsertRecord("Visits", "VisitID", visit);
      return createJsonResponse({ success: true, data: result });
    }

    // 4. حفظ دواء (Medication)
    if (action === "saveMedication") {
      const med = payload.data;
      const result = upsertRecord("Medications", "MedicationID", med);
      return createJsonResponse({ success: true, data: result });
    }

    // 5. حفظ قياس حيوي (Vitals)
    if (action === "saveVitals" || action === "saveVital") {
      const vital = payload.data;
      const result = upsertRecord("Vitals", "VitalID", vital);
      return createJsonResponse({ success: true, data: result });
    }

    // 6. حفظ عرض مرضي (Symptom)
    if (action === "saveSymptom") {
      const symptom = payload.data;
      const result = upsertRecord("Symptoms", "SymptomID", symptom);
      return createJsonResponse({ success: true, data: result });
    }

    // 7. حفظ موعد (Appointment) مع تكامل Google Calendar
    if (action === "saveAppointment") {
      const appt = payload.data;
      if (payload.syncCalendar) {
        try {
          const calEventId = syncWithGoogleCalendar(appt);
          appt.CalendarEventID = calEventId;
        } catch (calErr) {
          Logger.log("Calendar sync note: " + calErr.message);
        }
      }
      const result = upsertRecord("Appointments", "AppointmentID", appt);
      return createJsonResponse({ success: true, data: result });
    }

    // 8. رفع ملف إلى Google Drive وتوثيقه في جدول Files
    if (action === "uploadFile") {
      const fileResult = handleFileUpload(payload);
      return createJsonResponse({ success: true, data: fileResult });
    }

    // 9. تحديث سجل عام (Update Record)
    if (action === "updateRecord") {
      const table = payload.table;
      const data = payload.data;
      if (!table || !data || !PRIMARY_KEYS[table]) {
        return createErrorResponse("بيانات السجل أو اسم الجدول غير صحيح", 400);
      }
      const updated = upsertRecord(table, PRIMARY_KEYS[table], data);
      return createJsonResponse({ success: true, data: updated, message: "تم التحديث بنجاح" });
    }

    // 10. حذف سجل (Delete Record)
    if (action === "deleteRecord") {
      const table = payload.table;
      const id = payload.id;
      if (!table || !id || !PRIMARY_KEYS[table]) {
        return createErrorResponse("معرف السجل أو اسم الجدول مفقود", 400);
      }
      const deleted = deleteRecord(table, PRIMARY_KEYS[table], id);
      return createJsonResponse({ success: deleted, message: deleted ? "تم الحذف بنجاح" : "لم يتم العثور على السجل" });
    }

    return createErrorResponse("إجراء POST غير معروف: " + action, 400);
  } catch (error) {
    return createErrorResponse("خطأ في معالجة الطلب: " + error.message, 500);
  }
}

/**
 * تنفيذ قائمة عمليات متسلسلة للمزامنة غير المتصلة (Batch Synchronization)
 */
function executeBatchSync(operations) {
  const results = [];
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  operations.forEach(op => {
    try {
      const { table, operation, data, localId } = op;
      const pk = PRIMARY_KEYS[table];
      if (!pk) {
        results.push({ localId, success: false, error: `جدول غير مدعوم: ${table}` });
        return;
      }

      let resData = null;
      if (operation === "create" || operation === "update") {
        resData = upsertRecord(table, pk, data);
      } else if (operation === "delete") {
        const idToDelete = (data && data[pk]) || localId;
        deleteRecord(table, pk, idToDelete);
      }

      results.push({
        localId: localId,
        remoteId: resData ? resData[pk] : localId,
        table: table,
        operation: operation,
        success: true,
        data: resData
      });
    } catch (e) {
      results.push({
        localId: op.localId,
        success: false,
        error: e.message
      });
    }
  });

  return results;
}

/**
 * قراءة جميع سجلات جدول معين مع فلترة اختيارية بـ PatientID
 */
function getTableRecords(sheetName, filterPatientId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // فقط الترويسة أو فارغ

  const headers = data[0];
  const patientIdIdx = headers.indexOf("PatientID");
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // تخطي الصفوف الفارغة بالكامل
    if (row.every(cell => cell === "" || cell === null)) continue;

    // فلترة حسب المريض إذا تم تمرير filterPatientId (باستثناء جدول Patients نفسه إذا أردنا قائمة الجميع)
    if (filterPatientId && sheetName !== "Patients" && patientIdIdx !== -1) {
      const rowPatientId = String(row[patientIdIdx]);
      if (rowPatientId !== String(filterPatientId)) {
        continue;
      }
    }

    const record = {};
    headers.forEach((header, colIdx) => {
      let value = row[colIdx];
      // تحويل التواريخ لكتابة ISO قياسية
      if (value instanceof Date) {
        value = value.toISOString();
      }
      record[header] = value;
    });
    records.push(record);
  }

  return records;
}

/**
 * إدراج أو تحديث سجل في الجدول المحدد
 */
function upsertRecord(sheetName, pkName, recordData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`الجدول ${sheetName} غير موجود. يرجى تشغيل دالة setupDatabase().`);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let recordId = recordData[pkName];

  // توليد معرّف تلقائي إن لم يكن متوفراً
  if (!recordId || String(recordId).startsWith("temp_") || String(recordId).trim() === "") {
    const prefix = pkName.replace("ID", "").toUpperCase().substring(0, 3);
    recordId = `${prefix}_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}`;
    recordData[pkName] = recordId;
  }

  // إضافة وتحديث الحقول الزمنية
  const now = new Date().toISOString();
  if (headers.indexOf("CreatedAt") !== -1 && !recordData.CreatedAt) {
    recordData.CreatedAt = now;
  }
  if (headers.indexOf("UpdatedAt") !== -1) {
    recordData.UpdatedAt = now;
  }

  // البحث عن وجود السجل مسبقاً
  const idColIdx = headers.indexOf(pkName) + 1;
  let rowIndex = -1;

  if (sheet.getLastRow() > 1) {
    const idColumnValues = sheet.getRange(2, idColIdx, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < idColumnValues.length; i++) {
      if (String(idColumnValues[i][0]) === String(recordId)) {
        rowIndex = i + 2; // +2 لأن البداية من الصف 2
        break;
      }
    }
  }

  // تجهيز مصفوفة القيم المطابقة لترتيب الأعمدة
  const rowValues = headers.map(header => {
    let val = recordData[header];
    if (val === undefined || val === null) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return val;
  });

  if (rowIndex > 1) {
    // تحديث صف قائم
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    // إدراج صف جديد
    sheet.appendRow(rowValues);
  }

  return recordData;
}

/**
 * حذف سجل من جدول
 */
function deleteRecord(sheetName, pkName, recordId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf(pkName) + 1;
  if (idColIdx === 0) return false;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const idValues = sheet.getRange(2, idColIdx, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(recordId)) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }

  return false;
}

/**
 * رفع وتخزين ملف في Google Drive وإدراج بياناته في جدول Files
 */
function handleFileUpload(payload) {
  const { fileName, fileData, mimeType, patientId, category, visitId, fileType } = payload;
  
  if (!fileData || !fileName) {
    throw new Error("بيانات الملف أو اسمه مفقودة.");
  }

  // استخراج البايتات من Base64
  let base64String = fileData;
  if (base64String.indexOf("base64,") !== -1) {
    base64String = base64String.split("base64,")[1];
  }
  const decodedBytes = Utilities.base64Decode(base64String);
  const blob = Utilities.newBlob(decodedBytes, mimeType || "application/octet-stream", fileName);

  // إيجاد أو إنشاء مجلد Sejel على Google Drive
  let folder;
  const scriptProps = PropertiesService.getScriptProperties();
  const savedFolderId = scriptProps.getProperty("DRIVE_FOLDER_ID");
  
  if (savedFolderId) {
    try {
      folder = DriveApp.getFolderById(savedFolderId);
    } catch (e) {
      folder = null;
    }
  }

  if (!folder) {
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    scriptProps.setProperty("DRIVE_FOLDER_ID", folder.getId());
  }

  // حفظ الملف في Drive
  const driveFile = folder.createFile(blob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const driveUrl = driveFile.getUrl();
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveFile.getId()}`;

  // إنشاء سجل في جدول Files
  const fileId = "FIL_" + new Date().getTime();
  const fileRecord = {
    FileID: fileId,
    PatientID: patientId || "P_DEFAULT",
    FileName: fileName,
    Category: category || "Other",
    FileType: fileType || (mimeType && mimeType.includes("pdf") ? "PDF" : (mimeType && mimeType.includes("image") ? "Image" : "Other")),
    DriveURL: driveUrl,
    VisitID: visitId || "",
    UploadedAt: new Date().toISOString()
  };

  upsertRecord("Files", "FileID", fileRecord);
  fileRecord.DownloadURL = downloadUrl;
  fileRecord.DriveFileID = driveFile.getId();

  return fileRecord;
}

/**
 * مزامنة الموعد مع تقويم Google Calendar
 */
function syncWithGoogleCalendar(appointment) {
  const calendar = CalendarApp.getDefaultCalendar();
  if (!calendar) return "";

  const title = `سِجِل الطبي: ${appointment.Title || 'موعد طبي'} - ${appointment.DoctorName || ''}`;
  const dateStr = appointment.Date; // YYYY-MM-DD
  const timeStr = appointment.Time || "09:00"; // HH:MM

  const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
  const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000)); // مدة ساعة افتراضية

  const description = `تطبيق سِجِل الصحي\nالطبيب: ${appointment.DoctorName || '-'}\nالعيادة/المكان: ${appointment.Location || '-'}\nملاحظات: ${appointment.Notes || '-'}`;

  let event;
  if (appointment.CalendarEventID) {
    try {
      event = calendar.getEventById(appointment.CalendarEventID);
      if (event) {
        event.setTitle(title);
        event.setTime(startDateTime, endDateTime);
        event.setLocation(appointment.Location || "");
        event.setDescription(description);
        return appointment.CalendarEventID;
      }
    } catch (e) {
      Logger.log("Event not found or failed to update: " + e.message);
    }
  }

  // إنشاء حدث جديد
  event = calendar.createEvent(title, startDateTime, endDateTime, {
    location: appointment.Location || "",
    description: description
  });

  // إضافة تذكير قبل الموعد بـ 24 ساعة وساعتين
  event.addPopupReminder(1440); // 24 ساعة
  event.addPopupReminder(120);  // ساعتان

  return event.getId();
}

/**
 * دوال مساعدة لإنشاء استجابات JSON متوافقة ومعالجة CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(errorMessage, statusCode) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: errorMessage,
    code: statusCode || 500,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
