import Dexie from 'dexie';

/**
 * ==============================================================================
 * سِجِل (Sejel) - قاعدة بيانات IndexedDB المحلية المتطابقة مع الجداول السبعة
 * ==============================================================================
 */

export const db = new Dexie('SejelHealthDB');

db.version(1).stores({
  patients: '++id, PatientID, Name, BirthDate, GuardianEmail, _syncStatus',
  visits: '++id, VisitID, PatientID, Date, DoctorName, Specialty, Clinic, _syncStatus',
  medications: '++id, MedicationID, PatientID, Name, ReminderEnabled, _syncStatus',
  vitals: '++id, VitalID, PatientID, Date, Type, _syncStatus',
  symptoms: '++id, SymptomID, PatientID, Date, Severity, _syncStatus',
  appointments: '++id, AppointmentID, PatientID, Date, Time, _syncStatus',
  files: '++id, FileID, PatientID, Category, FileType, VisitID, UploadedAt, _syncStatus',
  syncQueue: '++id, table, operation, data, localId, timestamp, attempts',
  settings: 'key, value'
});

// بيانات أولية تجريبية لبدء الاستخدام الفوري
export const initialSeedData = {
  patients: [
    {
      PatientID: 'P_01',
      Name: 'أحمد عبد الله المنصوري',
      BirthDate: '1990-05-15',
      Gender: 'Male',
      BloodType: 'O+',
      Height: 178,
      Weight: 76,
      Allergies: 'بنسلين (Penicillin)، حبوب اللقاح',
      ChronicDiseases: 'ضغط الدم المرتفع (خفيف)',
      Surgeries: 'استئصال الزائدة الدودية (2018)',
      EmergencyContactName: 'سارة المنصوري (الزوجة)',
      EmergencyContactPhone: '+966501234567',
      GuardianEmail: 'guardian@example.com',
      PIN: '1990',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      _syncStatus: 'synced'
    },
    {
      PatientID: 'P_02',
      Name: 'نور أحمد المنصوري (الابنة)',
      BirthDate: '2020-03-10',
      Gender: 'Female',
      BloodType: 'A+',
      Height: 110,
      Weight: 19,
      Allergies: 'الفول السوداني (Peanuts)',
      ChronicDiseases: 'حساسية صدرية موسمية',
      Surgeries: 'لا يوجد',
      EmergencyContactName: 'أحمد المنصوري (الأب)',
      EmergencyContactPhone: '+966501234567',
      GuardianEmail: 'guardian@example.com',
      PIN: '2020',
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      _syncStatus: 'synced'
    }
  ],
  visits: [
    {
      VisitID: 'V_01',
      PatientID: 'P_01',
      Date: '2026-08-10',
      DoctorName: 'د. خالد السعيد',
      Specialty: 'أمراض القلب والأوعية الدموية',
      Clinic: 'مركز الرعاية التخصصي',
      Diagnosis: 'استقرار ضغط الدم وفحص دوري منتظم',
      Notes: 'الاستمرار على الجرعة الحالية وتقليل الملح مع ممارسة رياضة المشي',
      NextAppointmentDate: '2026-11-10',
      Attachments: '[]',
      _syncStatus: 'synced'
    },
    {
      VisitID: 'V_02',
      PatientID: 'P_02',
      Date: '2026-07-20',
      DoctorName: 'د. ليلى فهد',
      Specialty: 'طب الأطفال وحديثي الولادة',
      Clinic: 'مستشفى المستقبل للأطفال',
      Diagnosis: 'تطعيم سن 6 سنوات وفحص النمو الدوري',
      Notes: 'النمو ممتاز ومتطابق مع المعدلات الطبيعية',
      NextAppointmentDate: '2027-01-20',
      Attachments: '[]',
      _syncStatus: 'synced'
    }
  ],
  medications: [
    {
      MedicationID: 'M_01',
      PatientID: 'P_01',
      Name: 'كونكور (Concor)',
      Dosage: '5mg',
      Frequency: 'مرة واحدة صباحاً',
      StartDate: '2026-01-01',
      EndDate: '2026-12-31',
      Instructions: 'يؤخذ مع كوب ماء على الريق بعد الإفطار',
      ReminderEnabled: true,
      LastTakenDate: new Date().toISOString(),
      _syncStatus: 'synced'
    },
    {
      MedicationID: 'M_02',
      PatientID: 'P_01',
      Name: 'أوميغا 3 (Omega 3)',
      Dosage: '1000mg',
      Frequency: 'حبة بعد الغداء',
      StartDate: '2026-06-01',
      EndDate: '2026-12-31',
      Instructions: 'مكمل غذائي لصحة الأوعية والشرايين',
      ReminderEnabled: true,
      LastTakenDate: new Date().toISOString(),
      _syncStatus: 'synced'
    },
    {
      MedicationID: 'M_03',
      PatientID: 'P_02',
      Name: 'فينتولين شراب (Ventolin)',
      Dosage: '2.5ml',
      Frequency: 'عند اللزوم (وقت السعال الحاد)',
      StartDate: '2026-07-01',
      EndDate: '2026-09-30',
      Instructions: 'يرج جيداً قبل الاستخدام',
      ReminderEnabled: false,
      LastTakenDate: '',
      _syncStatus: 'synced'
    }
  ],
  vitals: [
    {
      VitalID: 'VIT_01',
      PatientID: 'P_01',
      Date: '2026-08-25T08:00:00.000Z',
      Type: 'BloodPressure',
      Value: '120/80',
      Unit: 'mmHg',
      Notes: 'قراءة صباحية بعد الاستيقاظ بربع ساعة',
      _syncStatus: 'synced'
    },
    {
      VitalID: 'VIT_02',
      PatientID: 'P_01',
      Date: '2026-08-24T08:30:00.000Z',
      Type: 'BloodPressure',
      Value: '122/82',
      Unit: 'mmHg',
      Notes: 'في وضع الجلوس والراحة',
      _syncStatus: 'synced'
    },
    {
      VitalID: 'VIT_03',
      PatientID: 'P_01',
      Date: '2026-08-25T08:00:00.000Z',
      Type: 'Sugar',
      Value: '95',
      Unit: 'mg/dL',
      Notes: 'سكر صائم 8 ساعات',
      _syncStatus: 'synced'
    },
    {
      VitalID: 'VIT_04',
      PatientID: 'P_01',
      Date: '2026-08-25T08:00:00.000Z',
      Type: 'Pulse',
      Value: '72',
      Unit: 'bpm',
      Notes: 'نبض منتظم',
      _syncStatus: 'synced'
    },
    {
      VitalID: 'VIT_05',
      PatientID: 'P_01',
      Date: '2026-08-25T08:00:00.000Z',
      Type: 'Temperature',
      Value: '36.8',
      Unit: '°C',
      Notes: 'حرارة طبيعية',
      _syncStatus: 'synced'
    },
    {
      VitalID: 'VIT_06',
      PatientID: 'P_01',
      Date: '2026-08-25T08:00:00.000Z',
      Type: 'Weight',
      Value: '76',
      Unit: 'kg',
      Notes: 'وزن الصباح قبل الإفطار',
      _syncStatus: 'synced'
    }
  ],
  symptoms: [
    {
      SymptomID: 'SYM_01',
      PatientID: 'P_01',
      Date: '2026-08-22T20:00:00.000Z',
      Description: 'صداع نصفي خفيف في الجهة اليمنى مع إجهاد العينين بعد استخدام الشاشة',
      Severity: 4,
      AudioFileURL: '',
      Duration: '3 ساعات',
      Notes: 'تحسن بعد أخذ قسط من الراحة وشرب كوبين ماء',
      _syncStatus: 'synced'
    }
  ],
  appointments: [
    {
      AppointmentID: 'APT_01',
      PatientID: 'P_01',
      Title: 'مراجعة فحص الدم والدهون الشامل',
      DoctorName: 'د. خالد السعيد',
      Date: '2026-09-15',
      Time: '10:30',
      Location: 'مركز الرعاية التخصصي - عيادة 4',
      Notes: 'الصيام لمدة 10 ساعات قبل أخذ العينات',
      CalendarEventID: '',
      _syncStatus: 'synced'
    },
    {
      AppointmentID: 'APT_02',
      PatientID: 'P_02',
      Title: 'فحص الأسنان الدوري للأطفال',
      DoctorName: 'د. مروة كمال',
      Date: '2026-09-20',
      Time: '16:00',
      Location: 'مركز طب الأسنان الوقائي',
      Notes: 'فحص وقائي وتطبيق الفلورايد',
      CalendarEventID: '',
      _syncStatus: 'synced'
    }
  ],
  files: [
    {
      FileID: 'FIL_01',
      PatientID: 'P_01',
      FileName: 'تقرير_تحليل_الدم_الشامل_2026.pdf',
      Category: 'Lab',
      FileType: 'PDF',
      DriveURL: 'https://drive.google.com',
      VisitID: 'V_01',
      UploadedAt: '2026-08-10T11:00:00.000Z',
      _syncStatus: 'synced'
    },
    {
      FileID: 'FIL_02',
      PatientID: 'P_01',
      FileName: 'تخطيط_القلب_ECG.jpg',
      Category: 'Radiology',
      FileType: 'Image',
      DriveURL: 'https://drive.google.com',
      VisitID: 'V_01',
      UploadedAt: '2026-08-10T11:05:00.000Z',
      _syncStatus: 'synced'
    },
    {
      FileID: 'FIL_03',
      PatientID: 'P_01',
      FileName: 'روشتة_العلاج_الشهرية.pdf',
      Category: 'Prescription',
      FileType: 'PDF',
      DriveURL: 'https://drive.google.com',
      VisitID: 'V_01',
      UploadedAt: '2026-08-10T11:10:00.000Z',
      _syncStatus: 'synced'
    }
  ]
};

/**
 * تفريغ كافة البيانات المحلية عند تسجيل الخروج أو تبديل الحساب
 */
export async function clearUserCache() {
  try {
    const tables = [
      db.patients, db.visits, db.medications, db.vitals, 
      db.symptoms, db.appointments, db.files, db.syncQueue
    ];
    await db.transaction('rw', tables, async () => {
      for (const t of tables) {
        await t.clear();
      }
    });
    try {
      window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { action: 'cache-cleared' } }));
    } catch {}
    return true;
  } catch (err) {
    console.error('[Sejel DB] Error clearing user cache:', err);
    return false;
  }
}

/**
 * تهيئة التخزين المحلي للمستخدم المسجل وتعيينه كمريض نشط
 */
export async function initUserCache(userProfile) {
  if (!userProfile || !userProfile.uid) return;
  try {
    const patientId = userProfile.uid;
    const existing = await db.patients.where('PatientID').equals(patientId).first();
    
    const patientRecord = {
      PatientID: patientId,
      uid: patientId,
      Name: userProfile.Name || userProfile.displayName || 'مستخدم سِجِل',
      BirthDate: userProfile.BirthDate || '1990-01-01',
      Gender: userProfile.Gender || 'Male',
      BloodType: userProfile.BloodType || 'O+',
      Height: userProfile.Height || 175,
      Weight: userProfile.Weight || 75,
      Allergies: userProfile.Allergies || '',
      ChronicDiseases: userProfile.ChronicDiseases || '',
      Surgeries: userProfile.Surgeries || '',
      EmergencyContactName: userProfile.EmergencyContactName || '',
      EmergencyContactPhone: userProfile.EmergencyContactPhone || '',
      GuardianEmail: userProfile.GuardianEmail || userProfile.email || '',
      PhotoURL: userProfile.PhotoURL || userProfile.photoURL || '',
      PIN: userProfile.PIN || '1990',
      CreatedAt: userProfile.CreatedAt || new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      _syncStatus: 'synced'
    };

    if (existing) {
      await db.patients.update(existing.id, patientRecord);
    } else {
      await db.patients.add(patientRecord);
    }

    await db.settings.put({ key: 'activePatientId', value: patientId });
    await db.settings.put({ key: 'currentUserId', value: patientId });

    try {
      window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table: 'patients', action: 'user-initialized' } }));
    } catch {}

    return patientRecord;
  } catch (err) {
    console.error('[Sejel DB] Error initializing user cache:', err);
  }
}

/**
 * تهيئة البيانات الأولية إذا كانت قاعدة البيانات فارغة
 */
export async function initDatabaseSeed() {
  try {
    const patientCount = await db.patients.count();
    if (patientCount === 0) {
      console.log('[Sejel DB] Seeding initial mock data for immediate testing...');
      await db.transaction('rw', [
        db.patients, db.visits, db.medications, db.vitals, 
        db.symptoms, db.appointments, db.files, db.settings
      ], async () => {
        await db.patients.bulkAdd(initialSeedData.patients);
        await db.visits.bulkAdd(initialSeedData.visits);
        await db.medications.bulkAdd(initialSeedData.medications);
        await db.vitals.bulkAdd(initialSeedData.vitals);
        await db.symptoms.bulkAdd(initialSeedData.symptoms);
        await db.appointments.bulkAdd(initialSeedData.appointments);
        await db.files.bulkAdd(initialSeedData.files);
        
        await db.settings.put({ key: 'activePatientId', value: 'P_01' });
        await db.settings.put({ key: 'language', value: 'ar' });
        await db.settings.put({ key: 'theme', value: 'light' });
        await db.settings.put({ key: 'pinCode', value: '1990' });
        await db.settings.put({ key: 'pinLocked', value: false });
        await db.settings.put({ key: 'appsScriptUrl', value: '' });
      });
      console.log('[Sejel DB] Seed completed successfully.');
    }
  } catch (error) {
    console.error('[Sejel DB] Error seeding database:', error);
  }
}

/**
 * جلب جميع السجلات لجدول معين مع الفلترة حسب المريض
 */
export async function getRecords(table, patientId = null) {
  try {
    if (!db[table]) return [];
    if (patientId && table !== 'patients') {
      return await db[table].where('PatientID').equals(patientId).toArray();
    }
    return await db[table].toArray();
  } catch (err) {
    console.error(`[Sejel DB] Error getting records from ${table}:`, err);
    return [];
  }
}

/**
 * إضافة سجل جديد محلياً ووضعه في قائمة انتظار المزامنة (Sync Queue)
 */
export async function addRecord(table, recordData, isLocalOnly = false) {
  try {
    const pkName = getPkName(table);
    const localId = recordData[pkName] || `${table.substring(0, 3).toUpperCase()}_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    const now = new Date().toISOString();

    const record = {
      ...recordData,
      [pkName]: localId,
      CreatedAt: recordData.CreatedAt || now,
      UpdatedAt: now,
      _syncStatus: isLocalOnly ? 'synced' : 'pending_create'
    };

    const insertedId = await db[table].add(record);

    if (!isLocalOnly) {
      await db.syncQueue.add({
        table,
        operation: 'create',
        data: record,
        localId,
        timestamp: Date.now(),
        attempts: 0
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table, operation: 'create' } }));
    } catch {}

    return { ...record, id: insertedId };
  } catch (err) {
    console.error(`[Sejel DB] Error adding record to ${table}:`, err);
    throw err;
  }
}

/**
 * تحديث سجل قائم ووضعه في قائمة الانتظار
 */
export async function updateRecord(table, pkValue, updatedFields, isLocalOnly = false) {
  try {
    const pkName = getPkName(table);
    const existing = await db[table].where(pkName).equals(pkValue).first();
    
    if (!existing) {
      throw new Error(`Record with ${pkName}=${pkValue} not found in ${table}`);
    }

    const updated = {
      ...existing,
      ...updatedFields,
      UpdatedAt: new Date().toISOString(),
      _syncStatus: isLocalOnly ? 'synced' : (existing._syncStatus === 'pending_create' ? 'pending_create' : 'pending_update')
    };

    await db[table].update(existing.id, updated);

    if (!isLocalOnly) {
      await db.syncQueue.add({
        table,
        operation: 'update',
        data: updated,
        localId: pkValue,
        timestamp: Date.now(),
        attempts: 0
      });
    }

    try {
      window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table, operation: 'update' } }));
    } catch {}

    return updated;
  } catch (err) {
    console.error(`[Sejel DB] Error updating record in ${table}:`, err);
    throw err;
  }
}

/**
 * حذف سجل ووضعه في قائمة الانتظار
 */
export async function deleteRecord(table, pkValue, isLocalOnly = false) {
  try {
    const pkName = getPkName(table);
    const existing = await db[table].where(pkName).equals(pkValue).first();
    if (existing) {
      await db[table].delete(existing.id);

      if (!isLocalOnly) {
        await db.syncQueue.add({
          table,
          operation: 'delete',
          data: { [pkName]: pkValue },
          localId: pkValue,
          timestamp: Date.now(),
          attempts: 0
        });
      }

      try {
        window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table, operation: 'delete' } }));
      } catch {}
    }
    return true;
  } catch (err) {
    console.error(`[Sejel DB] Error deleting record from ${table}:`, err);
    throw err;
  }
}

/**
 * استخراج اسم المفتاح الأساسي للجدول
 */
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
