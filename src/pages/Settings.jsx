import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { db, initDatabaseSeed, initialSeedData } from '../db/indexedDB';
import { PrintableMedicalReportModal } from '../components/common/PrintableMedicalReportModal';
import { notificationService } from '../services/notificationService';
import { 
  Cloud, RefreshCw, KeyRound, 
  Download, Upload, CheckCircle2, 
  AlertCircle, Database, Printer, ExternalLink, HardDrive, LogOut, UserCheck,
  Bell, BellRing, Send, Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function Settings() {
  const { lang, setLang, t, toggleLang } = useI18n();
  const { pinCode, updatePin, user, logout } = useAuth();
  const { isOnline, isSyncing, triggerSync, lastSyncTime } = useSync();

  const [newPin, setNewPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState('');
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => notificationService.getPermission());
  const [isEnablingNotif, setIsEnablingNotif] = useState(false);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState('');

  useEffect(() => {
    setNotifPermission(notificationService.getPermission());
  }, []);

  const handleEnableNotifications = async () => {
    setIsEnablingNotif(true);
    setNotifSuccessMsg('');
    try {
      const res = await notificationService.requestPermission();
      setNotifPermission(notificationService.getPermission());
      if (res.success) {
        setNotifSuccessMsg('تم تفعيل إشعارات الويب وتنبيهات الأدوية بنجاح!');
        try { confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } }); } catch {}
        await notificationService.sendTestNotification();
      } else {
        alert(res.error || 'تعذر تفعيل الإشعارات');
      }
    } catch (err) {
      alert('خطأ أثناء تفعيل الإشعارات: ' + err.message);
    } finally {
      setIsEnablingNotif(false);
    }
  };

  const handleSendTestNotification = async () => {
    await notificationService.sendTestNotification();
    setNotifSuccessMsg('تم إرسال إشعار تجريبي إلى جهازك!');
    setTimeout(() => setNotifSuccessMsg(''), 3500);
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess(false);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinChangeError('يجب أن يتكون رمز PIN من 4 أرقام عددية');
      return;
    }

    const res = await updatePin(newPin);
    if (res.success) {
      setPinChangeSuccess(true);
      setNewPin('');
      try {
        confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
      } catch {}
      setTimeout(() => setPinChangeSuccess(false), 3000);
    } else {
      setPinChangeError(res.error);
    }
  };

  // Export all IndexedDB data as JSON
  const handleExportJSON = async () => {
    try {
      const tables = ['patients', 'visits', 'medications', 'vitals', 'symptoms', 'appointments', 'files', 'settings'];
      const exportData = {};
      for (const t of tables) {
        exportData[t] = await db[t].toArray();
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `sejel_health_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('فشل تصدير النسخة الاحتياطية: ' + err.message);
    }
  };

  // Import JSON backup
  const handleImportJSON = async (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (window.confirm('هل تريد استبدال البيانات الحالية بالنسخة الاحتياطية؟')) {
            for (const [table, records] of Object.entries(parsed)) {
              if (db[table] && Array.isArray(records)) {
                await db[table].clear();
                await db[table].bulkAdd(records);
              }
            }
            alert('تم استيراد النسخة الاحتياطية بنجاح! يرجى إعادة تحميل الصفحة.');
            window.location.reload();
          }
        } catch (err) {
          alert('ملف النسخة الاحتياطية غير صالح: ' + err.message);
        }
      };
    }
  };

  // Reset to default initial demo data
  const handleResetDemoData = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إعادة تعيين البيانات إلى النماذج التجريبية الأولية؟')) {
      const tables = [db.patients, db.visits, db.medications, db.vitals, db.symptoms, db.appointments, db.files, db.syncQueue];
      await db.transaction('rw', tables, async () => {
        for (const t of tables) {
          await t.clear();
        }
        await db.patients.bulkAdd(initialSeedData.patients);
        await db.visits.bulkAdd(initialSeedData.visits);
        await db.medications.bulkAdd(initialSeedData.medications);
        await db.vitals.bulkAdd(initialSeedData.vitals);
        await db.symptoms.bulkAdd(initialSeedData.symptoms);
        await db.appointments.bulkAdd(initialSeedData.appointments);
        await db.files.bulkAdd(initialSeedData.files);
      });
      alert('تمت إعادة تعيين البيانات التجريبية بنجاح!');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          إعدادات السحابة، قفل الحماية، النسخ الاحتياطي، وحالة قاعدة البيانات
        </p>
      </div>

      {/* 0. Google Account & Google Drive Integration Section */}
      {user && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-extrabold text-sm">
              <HardDrive className="w-5 h-5" />
              <span>{lang === 'ar' ? 'حساب Google وخدمة Google Drive' : 'Google Account & Drive'}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-12 h-12 rounded-2xl object-cover border border-primary-400 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                  {user.displayName ? user.displayName.charAt(0) : 'G'}
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {user.displayName || 'Google User'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {user.email}
                </p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                  UID: {user.uid.substring(0, 12)}...
                </span>
              </div>
            </div>

            <div className="text-right rtl:text-right ltr:text-left sm:text-end">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Google Drive متصل ومخصص</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                Sejel/{user.uid}/Documents & Audio
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Firebase Cloud Database Status Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700 text-primary-600 dark:text-primary-400 font-extrabold text-sm">
          <Cloud className="w-5 h-5" />
          <span>حالة قاعدة البيانات السحابية (Firebase)</span>
        </div>

        {/* Clear Green Connection Status */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-black text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>متصل بقاعدة البيانات بنجاح</span>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-mono font-bold">
            Online
          </span>
        </div>

        {/* Manual Sync Trigger */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span>حالة المزامنة: </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {lastSyncTime ? `آخر مزامنة: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'متزامن تلقائياً'}
            </span>
          </div>

          <button
            onClick={() => triggerSync()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? t('common.loading') : t('settings.sync_now')}</span>
          </button>
        </div>
      </div>

      {/* 2. Web Push Notifications & Medication Reminders */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
            <BellRing className="w-5 h-5" />
            <span>إشعارات وتنبيهات الأدوية والمواعيد (Web Push & FCM)</span>
          </div>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
            notifPermission === 'granted'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
              : notifPermission === 'denied'
              ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
          }`}>
            {notifPermission === 'granted' ? 'مفعلة ✓' : notifPermission === 'denied' ? 'محظورة' : 'غير مفعلة'}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          تتيح لك الإشعارات الفورية تلقي تنبيهات بمواعيد جرعات الأدوية (1 أو 2 أو 3 جرعات يومياً) ومواعيد الزيارات الطبية حتى عندما يكون التطبيق مغلقاً عبر تقنية Service Worker.
        </p>

        {notifSuccessMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{notifSuccessMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 pt-1">
          {notifPermission !== 'granted' ? (
            <button
              onClick={handleEnableNotifications}
              disabled={isEnablingNotif}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>{isEnablingNotif ? 'جاري طلب الإذن...' : 'تفعيل إشعارات الويب وتنبيهات الجرعات'}</span>
            </button>
          ) : (
            <button
              onClick={handleSendTestNotification}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>إرسال إشعار تجريبي 🔔</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Security & PIN Configuration */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700 text-purple-600 dark:text-purple-400 font-extrabold text-sm">
          <KeyRound className="w-5 h-5" />
          <span>{t('settings.security')}</span>
        </div>

        <form onSubmit={handleChangePin} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.change_pin')} (الرمز الحالي: <span className="font-mono">{pinCode}</span>)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                required
                placeholder="4 أرقام جديدة"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-36 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-center tracking-widest font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-colors"
              >
                تحديث PIN
              </button>
            </div>
          </div>

          {pinChangeSuccess && (
            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم تغيير رمز PIN بنجاح!</span>
            </p>
          )}

          {pinChangeError && (
            <p className="text-xs font-bold text-danger-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{pinChangeError}</span>
            </p>
          )}
        </form>
      </div>

      {/* 3. Reports, Backup & Data Management */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
          <Database className="w-5 h-5" />
          <span>{t('settings.backup')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Save & Share PDF Button */}
          <button
            onClick={() => setShowPrintReport(true)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 text-xs font-bold transition-colors"
          >
            <Printer className="w-4 h-4 text-primary-600" />
            <span>حفظ ومشاركة PDF</span>
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-500" />
            <span>{t('settings.export_json')}</span>
          </button>

          {/* Import JSON */}
          <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-500" />
            <span>{t('settings.import_json')}</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          {/* Reset Demo Data */}
          <button
            onClick={handleResetDemoData}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('settings.reset_demo')}</span>
          </button>
        </div>
      </div>

      {/* Printable Medical Report Modal */}
      <PrintableMedicalReportModal
        isOpen={showPrintReport}
        onClose={() => setShowPrintReport(false)}
      />

    </div>
  );
}
