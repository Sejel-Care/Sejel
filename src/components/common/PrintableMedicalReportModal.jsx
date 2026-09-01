import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { db } from '../../db/indexedDB';
import { 
  FileText, Share2, Download, Printer, X, HeartPulse, Stethoscope, 
  Pill, Activity, AlertTriangle, ShieldCheck, CheckCircle2, Loader2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { printService } from '../../services/printService';

export function PrintableMedicalReportModal({ isOpen, onClose }) {
  const { lang, t } = useI18n();
  const { activePatient } = usePatient();

  const [visits, setVisits] = useState([]);
  const [medications, setMedications] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [shareFeedback, setShareFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState('');

  const reportContentRef = useRef(null);

  useEffect(() => {
    if (isOpen && activePatient) {
      async function loadData() {
        const [visList, medList, vitList] = await Promise.all([
          db.visits.where('PatientID').equals(activePatient.PatientID).reverse().sortBy('Date'),
          db.medications.where('PatientID').equals(activePatient.PatientID).toArray(),
          db.vitals.where('PatientID').equals(activePatient.PatientID).reverse().sortBy('Date')
        ]);
        setVisits(visList || []);
        setMedications(medList || []);
        setVitals(vitList || []);
      }
      loadData();
      setShareFeedback('');
      setIsProcessing(false);
    }
  }, [isOpen, activePatient]);

  if (!isOpen || !activePatient) return null;

  // مشاركة ملف PDF حقيقي عبر Web Share API
  const handleShare = async () => {
    if (!reportContentRef.current) return;
    setIsProcessing(true);
    setActionType('share');

    try {
      const result = await printService.shareMedicalReportPdf({
        element: reportContentRef.current,
        patient: activePatient
      });

      if (result && result.success) {
        setShareFeedback(lang === 'ar' ? 'تم فتح قائمة مشاركة PDF بنجاح!' : 'PDF Share sheet opened successfully!');
        try {
          confetti({ particleCount: 25, spread: 50, origin: { y: 0.7 } });
        } catch {}
        setTimeout(() => setShareFeedback(''), 4000);
      }
    } catch (err) {
      console.error('Error sharing PDF report:', err);
      setShareFeedback(lang === 'ar' ? 'تعذر فتح المشاركة المباشرة: ' + err.message : 'Share failed: ' + err.message);
    } finally {
      setIsProcessing(false);
      setActionType('');
    }
  };

  // تنزيل ملف PDF حقيقي إلى الجهاز
  const handleSaveDownload = async () => {
    if (!reportContentRef.current) return;
    setIsProcessing(true);
    setActionType('download');

    try {
      const result = await printService.saveMedicalReportPdf({
        element: reportContentRef.current,
        patient: activePatient
      });

      if (result && result.success) {
        setShareFeedback(lang === 'ar' ? `تم تنزيل ملف "${result.fileName}" بنجاح!` : 'PDF downloaded successfully!');
        try {
          confetti({ particleCount: 20, spread: 40, origin: { y: 0.7 } });
        } catch {}
        setTimeout(() => setShareFeedback(''), 4000);
      }
    } catch (err) {
      console.error('Error saving PDF report:', err);
      setShareFeedback(lang === 'ar' ? 'حدث خطأ أثناء إنشاء PDF' : 'Error generating PDF');
    } finally {
      setIsProcessing(false);
      setActionType('');
    }
  };

  // طباعة ورقية تقليدية اختيارية
  const handleManualPrint = () => {
    printService.printMedicalReport({
      patient: activePatient,
      medications,
      vitals,
      visits
    });
  };

  const todayStr = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl my-8 bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print-container printable-card print:border-none print:shadow-none print:my-0">
        
        {/* Top Header Bar for Screen */}
        <div className="bg-primary-600 px-6 py-4 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5" />
            <h3 className="font-extrabold text-base">
              التقرير الطبي الشامل (حفظ ومشاركة PDF)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {shareFeedback && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in no-print">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Printable / Canvas-Rendered Report Body */}
        <div 
          ref={reportContentRef}
          id="printable-medical-report"
          className="p-8 sm:p-10 space-y-6 text-right rtl:text-right bg-white text-black font-cairo"
        >
          
          {/* Header of the Official Report */}
          <div className="flex items-center justify-between border-b-2 border-primary-600 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary-600 font-black text-2xl">
                <HeartPulse className="w-7 h-7" />
                <span>سِجِل | Sejel Health</span>
              </div>
              <p className="text-xs font-bold text-slate-500">
                التقرير الطبي الشامل وملف المتابعة الصحية
              </p>
            </div>

            <div className="text-left rtl:text-left ltr:text-right font-mono text-xs text-slate-600 space-y-1">
              <p><span className="font-bold">تاريخ التقرير:</span> {todayStr}</p>
              <p><span className="font-bold">رقم الملف:</span> {activePatient.PatientID}</p>
            </div>
          </div>

          {/* Section 1: Patient Bio & Emergency Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="block text-slate-400 font-bold mb-0.5">اسم المريض:</span>
              <span className="font-extrabold text-sm text-slate-900">{activePatient.Name}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-bold mb-0.5">تاريخ الميلاد:</span>
              <span className="font-bold">{activePatient.BirthDate || '-'}</span>
            </div>
            <div>
              <span className="block text-slate-400 font-bold mb-0.5">الجنس / فصيلة الدم:</span>
              <span className="font-bold">{activePatient.Gender === 'Male' ? 'ذكر' : 'أنثى'} • <strong className="text-danger-600 font-black">{activePatient.BloodType || 'O+'}</strong></span>
            </div>
            <div>
              <span className="block text-slate-400 font-bold mb-0.5">هاتف الطوارئ:</span>
              <span className="font-bold font-mono">{activePatient.EmergencyContactPhone || '-'}</span>
            </div>
          </div>

          {/* Critical Warnings */}
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-extrabold text-danger-700">
              <AlertTriangle className="w-4 h-4" />
              <span>الحساسيات والتحذيرات الحرجة:</span>
            </div>
            <p className="font-bold text-slate-800 pr-5">
              {activePatient.Allergies || 'لا توجد حساسيات مسجلة'}
            </p>
          </div>

          {/* Section 2: Active Medications Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-primary-700 border-b pb-1">
              <Pill className="w-4 h-4" />
              <span>جدول الأدوية والعلاجات الحالية:</span>
            </div>

            {medications.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد أدوية مسجلة</p>
            ) : (
              <table className="w-full text-xs text-right border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="p-2 border border-slate-200">اسم الدواء</th>
                    <th className="p-2 border border-slate-200">الجرعة</th>
                    <th className="p-2 border border-slate-200">التكرار</th>
                    <th className="p-2 border border-slate-200">الإرشادات</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map(m => (
                    <tr key={m.MedicationID} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200 font-bold">{m.Name}</td>
                      <td className="p-2 border border-slate-200 font-mono">{m.Dosage}</td>
                      <td className="p-2 border border-slate-200">{m.Frequency}</td>
                      <td className="p-2 border border-slate-200 text-slate-600">{m.Instructions || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section 3: Latest Vitals */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-indigo-700 border-b pb-1">
              <Activity className="w-4 h-4" />
              <span>آخر القياسات والمؤشرات الحيوية:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {vitals.slice(0, 4).map(v => (
                <div key={v.VitalID} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <span className="block text-slate-400 font-bold">{t(`vitals.types.${v.Type}`) || v.Type}</span>
                  <span className="text-sm font-black font-mono text-slate-900">{v.Value} {v.Unit}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{new Date(v.Date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Recent Visits & Consultations */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-teal-700 border-b pb-1">
              <Stethoscope className="w-4 h-4" />
              <span>سجل الاستشارات الطبية والزيارات:</span>
            </div>

            <div className="space-y-2">
              {visits.slice(0, 3).map(v => (
                <div key={v.VisitID} className="p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{v.DoctorName} ({v.Specialty}) - {v.Clinic || ''}</span>
                    <span className="font-mono text-slate-500">{v.Date}</span>
                  </div>
                  <p className="font-bold text-teal-800">التشخيص: {v.Diagnosis}</p>
                  {v.Notes && <p className="text-slate-600">التوصيات: {v.Notes}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Official Footer */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>تم استخراج هذا التقرير عبر تطبيق سِجِل (Sejel Health Platform).</span>
            <span className="font-mono">صفحة 1 من 1</span>
          </div>

        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Web Share (WhatsApp, Email, etc.) with Real PDF */}
            <button
              onClick={handleShare}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs shadow-md shadow-primary-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing && actionType === 'share' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>مشاركة ملف PDF (WhatsApp / تطبيقات)</span>
            </button>

            {/* Save directly as PDF file */}
            <button
              onClick={handleSaveDownload}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing && actionType === 'download' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>حفظ كملف PDF على الجهاز</span>
            </button>

            {/* Optional manual print */}
            <button
              onClick={handleManualPrint}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
              title="طباعة ورقية تقليدية"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقية</span>
            </button>
          </div>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
          >
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
}
