import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { db, updateRecord } from '../db/indexedDB';
import { syncEngine } from '../db/syncEngine';
import { formatDate } from '../utils/dateUtils';
import { DocumentPreviewModal } from '../components/common/DocumentPreviewModal';
import { 
  HeartPulse, Activity, Pill, Stethoscope, Calendar, 
  FileText, Mic, Plus, ShieldAlert, CheckCircle2, Circle, 
  ChevronRight, ArrowUpRight, TrendingUp, AlertTriangle, Sparkles, 
  WifiOff, ExternalLink, Settings as SettingsIcon, MoreVertical 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function Dashboard({ 
  onOpenEmergency, 
  onOpenVoiceModal, 
  onOpenAddModal, 
  onNavigateTab 
}) {
  const { lang, t } = useI18n();
  const { activePatient, activePatientId, dataVersion } = usePatient();

  const [vitals, setVitals] = useState([]);
  const [medications, setMedications] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [visits, setVisits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [hasGasUrl, setHasGasUrl] = useState(true);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadDashboardData = async () => {
    if (!activePatientId) return;
    try {
      const gasUrl = await syncEngine.getApiUrl();
      setHasGasUrl(!!gasUrl);

      const [vList, mList, aList, visList, dList] = await Promise.all([
        db.vitals.where('PatientID').equals(activePatientId).reverse().sortBy('Date'),
        db.medications.where('PatientID').equals(activePatientId).toArray(),
        db.appointments.where('PatientID').equals(activePatientId).toArray(),
        db.visits.where('PatientID').equals(activePatientId).reverse().sortBy('Date'),
        db.files.where('PatientID').equals(activePatientId).reverse().sortBy('UploadedAt')
      ]);

      setVitals(vList || []);
      setMedications(mList || []);
      setAppointments(aList || []);
      setVisits(visList || []);
      setDocuments(dList || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleDataChanged = () => loadDashboardData();
    window.addEventListener('sejel:data-changed', handleDataChanged);
    return () => window.removeEventListener('sejel:data-changed', handleDataChanged);
  }, [activePatientId, dataVersion]);

  // Toggle medication taken status
  const handleToggleMedTaken = async (med) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isTakenToday = med.LastTakenDate && med.LastTakenDate.startsWith(todayStr);

    const newLastTaken = isTakenToday ? '' : new Date().toISOString();
    await updateRecord('medications', med.MedicationID, { LastTakenDate: newLastTaken });
    
    if (!isTakenToday) {
      try {
        confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
      } catch {}
    }

    loadDashboardData();
  };

  const getLatestVital = (type) => {
    return vitals.find(v => v.Type === type) || null;
  };

  const latestBP = getLatestVital('BloodPressure');
  const latestSugar = getLatestVital('Sugar');
  const latestPulse = getLatestVital('Pulse');
  const latestWeight = getLatestVital('Weight');

  const todayStr = new Date().toISOString().split('T')[0];
  const medsTakenCount = medications.filter(m => m.LastTakenDate && m.LastTakenDate.startsWith(todayStr)).length;
  const isAllMedsTaken = medications.length > 0 && medsTakenCount === medications.length;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* 1. Unconnected Apps Script Demo Mode Banner */}
      {!hasGasUrl && (
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm">
                {lang === 'ar' ? 'أنت في الوضع التجريبي المحلي' : 'You are in Local Demo Mode'}
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 font-medium">
                {lang === 'ar' 
                  ? 'لن يتم حفظ بياناتك سحابياً إلا بعد ربط Google Apps Script من الإعدادات.' 
                  : 'Your medical records will only sync to cloud after linking Google Apps Script in Settings.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('settings')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm transition-all shrink-0 active:scale-95"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الاتصال الآن' : 'Connect Now'}</span>
          </button>
        </div>
      )}

      {/* 2. Patient Welcome Hero Banner (Full width & vertical on mobile) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 p-5 sm:p-8 text-white shadow-xl shadow-primary-500/15">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t('app.tagline')}</span>
            </div>
            
            {/* Single clean greeting */}
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">
              {lang === 'ar' ? `مرحباً بك، ${activePatient ? activePatient.Name : ''}` : `Welcome, ${activePatient ? activePatient.Name : ''}`}
            </h1>
            
            <p className="text-xs sm:text-sm text-white/90 font-medium max-w-xl">
              {lang === 'ar' 
                ? 'سجلك الطبي العائلي محدث. يمكنك مراجعة مؤشراتك وتسجيل الأعراض والمستندات دون اتصال بالإنترنت.' 
                : 'Your family health record is updated. Manage vitals, symptoms and files offline.'}
            </p>
          </div>

          {/* Emergency SOS Quick Button */}
          <button
            onClick={onOpenEmergency}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-danger-500 hover:bg-danger-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-danger-500/30 transition-all emergency-pulse active:scale-95 shrink-0"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>{t('emergency.sos_btn')}</span>
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
      </div>

      {/* 3. Four Shortcut Buttons (2x2 on Mobile, 4 Cols on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={onOpenVoiceModal}
          className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-100 dark:border-purple-900/30 transition-all card-scale text-center sm:text-right rtl:sm:text-right ltr:sm:text-left shadow-xs"
          title="تسجيل عرض مرضي صوتياً"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">
              {t('dashboard.record_symptom_voice')}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
              تحويل الصوت لنص
            </span>
          </div>
        </button>

        <button
          onClick={() => onOpenAddModal('vital')}
          className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-900/30 transition-all card-scale text-center sm:text-right rtl:sm:text-right ltr:sm:text-left shadow-xs"
          title="تسجيل قياس حيوي جديد"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">
              {t('dashboard.log_vitals')}
            </span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
              ضغط / سكر / نبض
            </span>
          </div>
        </button>

        <button
          onClick={() => onOpenAddModal('visit')}
          className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-100 dark:border-teal-900/30 transition-all card-scale text-center sm:text-right rtl:sm:text-right ltr:sm:text-left shadow-xs"
          title="إضافة زيارة طبيب جديدة"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">
              {t('dashboard.add_visit')}
            </span>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
              استشارة طبيب
            </span>
          </div>
        </button>

        <button
          onClick={() => onOpenAddModal('document')}
          className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5 sm:gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-100 dark:border-amber-900/30 transition-all card-scale text-center sm:text-right rtl:sm:text-right ltr:sm:text-left shadow-xs"
          title="رفع تقرير أو تحليل طبي"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-black text-slate-800 dark:text-slate-200 truncate">
              {t('dashboard.upload_doc')}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
              تحليل أو أشعة
            </span>
          </div>
        </button>
      </div>

      {/* 4. Vitals Summary Grid (2 Cols on Mobile, 4 Cols on Desktop) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-500" />
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
              {t('dashboard.recent_vitals')}
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('vitals')}
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            <span>{lang === 'ar' ? 'عرض السجل' : 'View All'}</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Blood Pressure Card */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {t('vitals.types.BloodPressure')}
              </span>
              <HeartPulse className="w-4 h-4 text-danger-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {latestBP ? latestBP.Value : '120/80'}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] font-bold text-slate-500">mmHg</span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                طبيعي
              </span>
            </div>
          </div>

          {/* Blood Sugar Card */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {t('vitals.types.Sugar')}
              </span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {latestSugar ? latestSugar.Value : '95'}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] font-bold text-slate-500">mg/dL</span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                صائم ممتاز
              </span>
            </div>
          </div>

          {/* Pulse Card */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {t('vitals.types.Pulse')}
              </span>
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {latestPulse ? latestPulse.Value : '72'}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] font-bold text-slate-500">bpm</span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                منتظم
              </span>
            </div>
          </div>

          {/* Weight Card */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {t('vitals.types.Weight')}
              </span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
              {latestWeight ? latestWeight.Value : (activePatient ? activePatient.Weight : '76')}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] font-bold text-slate-500">kg</span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                مستقر
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 5. Main 2 Cols: Medications & Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Today's Medications Tracker */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {t('dashboard.today_meds')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {medsTakenCount} من {medications.length} جرعات اليوم
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenAddModal('medication')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
              title={t('medications.add_med')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {medications.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Pill className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p>لا توجد أدوية حالياً. أضف دواءك الأول.</p>
              </div>
            ) : (
              medications.map(med => {
                const isTaken = med.LastTakenDate && med.LastTakenDate.startsWith(todayStr);
                return (
                  <div
                    key={med.MedicationID}
                    onClick={() => handleToggleMedTaken(med)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isTaken
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <button className="text-emerald-600 dark:text-emerald-400 shrink-0">
                        {isTaken ? (
                          <CheckCircle2 className="w-5 h-5 fill-emerald-100 dark:fill-emerald-950" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                        )}
                      </button>
                      <div className="truncate">
                        <h4 className={`text-xs sm:text-sm font-extrabold truncate ${isTaken ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {med.Name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {med.Dosage} • {med.Frequency}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isTaken ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                      {isTaken ? t('medications.taken_today') : t('medications.take_dose')}
                    </span>
                  </div>
                );
              })
            )}

            {isAllMedsTaken && (
              <div className="p-3 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-bold text-center animate-fade-in">
                🎉 {t('dashboard.all_meds_taken')}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {t('dashboard.upcoming_appts')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  المواعيد والاستشارات القادمة
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenAddModal('appointment')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
              title={t('appointments.add_appt')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {appointments.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p>لا توجد مواعيد مجدولة. اضغط لحجز موعدك القادم.</p>
              </div>
            ) : (
              appointments.slice(0, 3).map(appt => (
                <div
                  key={appt.AppointmentID}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5 truncate">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {appt.Title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {appt.DoctorName && `${appt.DoctorName} • `}{appt.Location || 'العيادة'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right rtl:text-right ltr:text-left">
                    <span className="inline-block px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-mono font-bold text-[11px]">
                      {formatDate(appt.Date, lang)} {appt.Time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 6. Recent Visits & Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recent Visits */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {t('dashboard.recent_visits')}
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('visits')}
              className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1"
            >
              <span>{t('nav.visits')}</span>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {visits.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Stethoscope className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p>لا توجد زيارات مسجلة بعد. اضغط على + لإضافة أول زيارة.</p>
              </div>
            ) : (
              visits.slice(0, 3).map(v => (
                <div key={v.VisitID} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {v.DoctorName} ({v.Specialty})
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{formatDate(v.Date, lang)}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                    {v.Diagnosis}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {t('dashboard.recent_documents')}
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('documents')}
              className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1"
            >
              <span>{t('nav.documents')}</span>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {documents.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-500 dark:text-slate-400">
                <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p>لا توجد مستندات مرفوعة. ارفع روشتتك الأولى.</p>
              </div>
            ) : (
              documents.slice(0, 3).map(doc => (
                <div 
                  key={doc.FileID} 
                  onClick={() => setPreviewDoc(doc)}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-300 transition-all"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-700 font-bold text-xs shrink-0">
                      {doc.FileType || 'PDF'}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate hover:text-cyan-600 transition-colors">
                        {doc.FileName}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {t(`documents.categories.${doc.Category}`) || doc.Category}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {formatDate(doc.UploadedAt, lang)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Document & PDF Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          file={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

    </div>
  );
}
