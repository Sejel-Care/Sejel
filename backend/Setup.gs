/**
 * ==============================================================================
 * سِجِل (Sejel) - تهيئة قاعدة بيانات الجداول ومجلد Google Drive
 * Setup.gs - Database Initialization & Folder Setup Script
 * ==============================================================================
 * قم بتشغيل دالة setupDatabase() لإنشاء كافة التبويبات الـ 7 وتنسيقها وإعداد مجلد Drive.
 */

const SEJEL_FOLDER_NAME = "Sejel_Medical_Files";

// أسماء التبويبات والأعمدة المحددة
const SCHEMAS = {
  Patients: [
    "PatientID", "Name", "BirthDate", "Gender", "BloodType", 
    "Height", "Weight", "Allergies", "ChronicDiseases", "Surgeries", 
    "EmergencyContactName", "EmergencyContactPhone", "GuardianEmail", 
    "PIN", "CreatedAt", "UpdatedAt"
  ],
  Visits: [
    "VisitID", "PatientID", "Date", "DoctorName", "Specialty", 
    "Clinic", "Diagnosis", "Notes", "NextAppointmentDate", "Attachments"
  ],
  Medications: [
    "MedicationID", "PatientID", "Name", "Dosage", "Frequency", 
    "StartDate", "EndDate", "Instructions", "ReminderEnabled", "LastTakenDate"
  ],
  Vitals: [
    "VitalID", "PatientID", "Date", "Type", "Value", "Unit", "Notes"
  ],
  Symptoms: [
    "SymptomID", "PatientID", "Date", "Description", "Severity", 
    "AudioFileURL", "Duration", "Notes"
  ],
  Appointments: [
    "AppointmentID", "PatientID", "Title", "DoctorName", "Date", 
    "Time", "Location", "Notes", "CalendarEventID"
  ],
  Files: [
    "FileID", "PatientID", "FileName", "Category", "FileType", 
    "DriveURL", "VisitID", "UploadedAt"
  ]
};

/**
 * الدالة الرئيسية لتهيئة قاعدة البيانات كاملة في Google Sheets
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("يرجى فتح ملف Google Spreadsheet أولاً وتشغيل السكريبت من داخله (Extensions -> Apps Script).");
  }

  Logger.log("بدء تهيئة قاعدة بيانات سِجِل...");

  // 1. إنشاء الجداول وتنسيقها
  Object.keys(SCHEMAS).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    const headers = SCHEMAS[sheetName];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`تم إنشاء التبويب: ${sheetName}`);
    } else {
      Logger.log(`التبويب موجود بالفعل: ${sheetName}`);
    }

    // إعداد الصف الأول (Headers)
    const currentRange = sheet.getRange(1, 1, 1, headers.length);
    currentRange.setValues([headers]);
    
    // تنسيق ترويسة الجدول
    currentRange.setBackground("#1A73E8"); // اللون الطبي الأساسي
    currentRange.setFontColor("#FFFFFF");
    currentRange.setFontWeight("bold");
    currentRange.setFontFamily("Cairo");
    currentRange.setHorizontalAlignment("center");
    currentRange.setVerticalAlignment("middle");
    
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 40);

    // تطبيق قواعد التحقق من الصحة (Data Validations)
    applyValidations(sheet, sheetName);
  });

  // حذف الورقة الافتراضية "Sheet1" أو "ورقة 1" إن وجدت وكانت فارغة
  const defaultSheets = ["Sheet1", "ورقة 1"];
  defaultSheets.forEach(name => {
    const s = ss.getSheetByName(name);
    if (s && ss.getSheets().length > 1 && s.getLastRow() === 0) {
      try {
        ss.deleteSheet(s);
      } catch (e) {
        Logger.log("تعذر حذف الورقة الافتراضية: " + e.message);
      }
    }
  });

  // 2. إعداد مجلد Google Drive المخصص للملفات الطبية
  const folder = getOrCreateDriveFolder();
  
  // حفظ معرّف المجلد في ScriptProperties للوصول السريع
  const scriptProps = PropertiesService.getScriptProperties();
  scriptProps.setProperty("DRIVE_FOLDER_ID", folder.getId());
  scriptProps.setProperty("SPREADSHEET_ID", ss.getId());

  // 3. إدراج بيانات تجريبية للمعاينة الأولية إذا كان جدول المرضى فارغاً
  seedSampleData(ss);

  Logger.log("تمت تهيئة قاعدة بيانات سِجِل بنجاح!");
  Logger.log(`معرف مجلد Drive: ${folder.getId()} (${folder.getUrl()})`);
  
  return {
    status: "success",
    message: "تمت تهيئة الجداول الـ 7 ومجلد Google Drive بنجاح!",
    folderUrl: folder.getUrl(),
    tables: Object.keys(SCHEMAS)
  };
}

/**
 * تطبيق قواعد التحقق من الصحة على الأعمدة الحرجة
 */
function applyValidations(sheet, sheetName) {
  if (sheetName === "Patients") {
    // Gender: Male, Female (ذكر، أنثى)
    const genderRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Male", "Female", "ذكر", "أنثى"], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange("D2:D500").setDataValidation(genderRule);

    // BloodType
    const bloodRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "غير معروف"], true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange("E2:E500").setDataValidation(bloodRule);
  }

  if (sheetName === "Vitals") {
    // Vital Type
    const vitalTypeRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["BloodPressure", "Sugar", "Pulse", "Temperature", "Weight", "Oxygen", "Height"], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange("D2:D1000").setDataValidation(vitalTypeRule);
  }

  if (sheetName === "Files") {
    // Category
    const categoryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Prescription", "Lab", "Radiology", "Report", "Vaccination", "Other"], true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange("D2:D1000").setDataValidation(categoryRule);

    // FileType
    const fileTypeRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["Image", "PDF", "Audio", "Document", "Other"], true)
      .setAllowInvalid(true)
      .build();
    sheet.getRange("E2:E1000").setDataValidation(fileTypeRule);
  }
}

/**
 * إنشاء أو جلب المجلد المخصص على Google Drive
 */
function getOrCreateDriveFolder() {
  const folders = DriveApp.getFoldersByName(SEJEL_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  const newFolder = DriveApp.createFolder(SEJEL_FOLDER_NAME);
  // ضبط صلاحيات المشاركة بحيث يمكن للأعضاء وعارض التطبيق تنزيل الوثائق بروابط
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * إدراج بيانات تجريبية أولية متكاملة للمعاينة والتجربة الفورية
 */
function seedSampleData(ss) {
  const patientsSheet = ss.getSheetByName("Patients");
  if (!patientsSheet || patientsSheet.getLastRow() > 1) {
    Logger.log("تخطي إدراج البيانات التجريبية - الجداول تحتوي بالفعل على بيانات.");
    return;
  }

  const now = new Date().toISOString();
  
  // 1. Patient Demo
  const demoPatient = [
    "P_DEMO_01", "أحمد عبد الله المنصوري", "1990-05-15", "Male", "O+",
    178, 76, "بنسلين (Penicillin)، حبوب اللقاح", "ضغط الدم المرتفع (خفيف)", "استئصال الزائدة الدودية (2018)",
    "سارة المنصوري (الزوجة)", "+966501234567", "guardian@example.com",
    "1990", now, now
  ];
  patientsSheet.appendRow(demoPatient);

  // 2. Visits Demo
  const visitsSheet = ss.getSheetByName("Visits");
  if (visitsSheet) {
    visitsSheet.appendRow([
      "V_DEMO_01", "P_DEMO_01", "2026-08-10", "د. خالد السعيد", "أمراض القلب والأوعية",
      "مركز الرعاية التخصصي", "فحص دوري واستقرار ضغط الدم", "استمرار على نفس الجرعة الحالية وإجراء فحص دهون",
      "2026-11-10", "[]"
    ]);
  }

  // 3. Medications Demo
  const medsSheet = ss.getSheetByName("Medications");
  if (medsSheet) {
    medsSheet.appendRow([
      "M_DEMO_01", "P_DEMO_01", "كونكور (Concor)", "5mg", "مرة واحدة صباحاً",
      "2026-01-01", "2026-12-31", "يؤخذ مع كوب ماء على الريق بعد الإفطار", true, "2026-08-25"
    ]);
    medsSheet.appendRow([
      "M_DEMO_02", "P_DEMO_01", "أوميغا 3 (Omega 3)", "1000mg", "حبة بعد الغداء",
      "2026-06-01", "2026-12-31", "مكمل غذائي لصحة القلب", true, "2026-08-25"
    ]);
  }

  // 4. Vitals Demo
  const vitalsSheet = ss.getSheetByName("Vitals");
  if (vitalsSheet) {
    vitalsSheet.appendRow(["VIT_DEMO_01", "P_DEMO_01", "2026-08-24T08:00:00.000Z", "BloodPressure", "120/80", "mmHg", "قراءة صباحية ممتازة"]);
    vitalsSheet.appendRow(["VIT_DEMO_02", "P_DEMO_01", "2026-08-25T07:30:00.000Z", "Sugar", "95", "mg/dL", "صائم 8 ساعات"]);
    vitalsSheet.appendRow(["VIT_DEMO_03", "P_DEMO_01", "2026-08-25T07:30:00.000Z", "Pulse", "72", "bpm", "حالة راحة"]);
    vitalsSheet.appendRow(["VIT_DEMO_04", "P_DEMO_01", "2026-08-25T07:30:00.000Z", "Temperature", "36.8", "°C", "حرارة طبيعية"]);
    vitalsSheet.appendRow(["VIT_DEMO_05", "P_DEMO_01", "2026-08-25T07:30:00.000Z", "Weight", "76", "kg", "وزن ثابت"]);
  }

  // 5. Symptoms Demo
  const sympSheet = ss.getSheetByName("Symptoms");
  if (sympSheet) {
    sympSheet.appendRow([
      "SYM_DEMO_01", "P_DEMO_01", "2026-08-22T19:00:00.000Z", "صداع خفيف في منطقة الجبهة بعد العمل",
      3, "", "ساعتان", "اختفى بعد شرب الماء والراحة"
    ]);
  }

  // 6. Appointments Demo
  const apptSheet = ss.getSheetByName("Appointments");
  if (apptSheet) {
    apptSheet.appendRow([
      "APT_DEMO_01", "P_DEMO_01", "مراجعة فحص الدم والدهون", "د. خالد السعيد",
      "2026-09-15", "10:30", "مركز الرعاية التخصصي - عيادة 4", "الصيام 10 ساعات قبل الموعد", ""
    ]);
  }

  // 7. Files Demo
  const filesSheet = ss.getSheetByName("Files");
  if (filesSheet) {
    filesSheet.appendRow([
      "FIL_DEMO_01", "P_DEMO_01", "تقرير_التحاليل_الشاملة_2026.pdf", "Lab", "PDF",
      "https://drive.google.com", "V_DEMO_01", now
    ]);
  }

  Logger.log("تم إدراج البيانات التجريبية بنجاح!");
}
