import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { 
  ShieldAlert, PhoneCall, AlertTriangle, 
  Activity, Scissors, X, Printer, QrCode, User, HeartPulse, Share2 
} from 'lucide-react';
import { printService } from '../../services/printService';

export function EmergencyCardModal({ isOpen, onClose }) {
  const { lang, t } = useI18n();
  const { activePatient } = usePatient();

  if (!isOpen || !activePatient) return null;

  // حساب العمر بدقة
  const calculateAge = (birthDate) => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(activePatient.BirthDate);

  // حفظ ومشاركة PDF عبر المتصفح الأصلي مع دعم Web Share API
  const handleSaveAndSharePDF = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `بطاقة طوارئ طبية - ${activePatient.Name}`,
          text: `بطاقة الطوارئ الطبية للمريض: ${activePatient.Name} (فصيلة الدم: ${activePatient.BloodType || 'O+'}) - الحساسيات: ${activePatient.Allergies || 'لا توجد'} - طوارئ: ${activePatient.EmergencyContactPhone || '-'}`,
          url: window.location.href
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Share error, falling back to print:', err);
        }
      }
    }
    // Fallback or Direct Print/Save PDF
    printService.printEmergencyCard(activePatient);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full sm:max-w-lg max-h-[90vh] my-0 sm:my-8 bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-4 border-danger-500 overflow-hidden flex flex-col print-container printable-emergency print:border-4 print:border-danger-600 print:shadow-none print:my-0">
        
        {/* Top Emergency Red Header Bar */}
        <div className="bg-gradient-to-r from-danger-600 via-danger-500 to-danger-600 px-6 py-4 text-white flex items-center justify-between shrink-0 print:bg-danger-600 print:text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm print:bg-transparent">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                {t('emergency.title')}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-white/90 font-bold uppercase tracking-wider">
                سِجِل الطبي • MEDICAL EMERGENCY IDENTIFICATION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors no-print"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Content Area */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white print:bg-white print:text-black overflow-y-auto flex-1">
          
          {/* Patient Hero Info */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 dark:border-slate-800 print:border-slate-300">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                {t('profile.name')}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-black">
                {activePatient.Name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 print:text-slate-700 font-semibold">
                العمر: {age} {t('profile.years')} • {activePatient.Gender === 'Male' ? t('profile.male') : t('profile.female')}
              </p>
            </div>

            {/* Blood Type Large Badge */}
            <div className="text-center px-4 py-2.5 rounded-2xl bg-danger-50 dark:bg-danger-950/80 border-2 border-danger-500 shadow-sm print:bg-red-50 print:border-red-600 shrink-0">
              <span className="block text-[10px] font-extrabold text-danger-600 uppercase">
                {t('emergency.blood_type')}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-danger-600 tracking-wider">
                {activePatient.BloodType || 'O+'}
              </span>
            </div>
          </div>

          {/* Critical Alerts: Allergies */}
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 print:bg-red-50 print:border-red-300">
            <div className="flex items-center gap-2 text-danger-600 font-extrabold text-xs sm:text-sm mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t('emergency.allergies')}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 print:text-black leading-relaxed">
              {activePatient.Allergies || t('emergency.no_critical_allergies')}
            </p>
          </div>

          {/* Chronic Diseases & Past Surgeries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 print:bg-slate-50 print:border-slate-300">
              <div className="flex items-center gap-1.5 text-primary-600 font-bold text-xs mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>{t('emergency.chronic_diseases')}</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">
                {activePatient.ChronicDiseases || t('emergency.no_chronic_diseases')}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 print:bg-slate-50 print:border-slate-300">
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mb-1">
                <Scissors className="w-3.5 h-3.5" />
                <span>{t('emergency.surgeries')}</span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-black">
                {activePatient.Surgeries || 'لا توجد'}
              </p>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mt-3.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-slate-800 border-2 border-emerald-500/50 print:bg-emerald-50 print:border-emerald-600">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 uppercase">
                  {t('emergency.contact_name')}
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white print:text-black">
                  {activePatient.EmergencyContactName || 'جهة الطوارئ الأساسية'}
                </h4>
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 print:text-black mt-0.5" dir="ltr">
                  {activePatient.EmergencyContactPhone || '+966500000000'}
                </p>
              </div>

              {/* Direct Call Button */}
              {activePatient.EmergencyContactPhone && (
                <a
                  href={`tel:${activePatient.EmergencyContactPhone}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all no-print"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{t('emergency.call_now')}</span>
                </a>
              )}
            </div>
          </div>

          {/* QR Code Bar */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 print:border-slate-300 flex items-center justify-between text-xs text-slate-500 print:text-slate-600">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-slate-600 print:text-black" />
              <span className="text-[10px] sm:text-[11px] font-medium">{t('emergency.qr_scan_notice')}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-slate-200 font-mono text-slate-700 print:text-black">
              ID: {activePatient.PatientID}
            </span>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5 shrink-0 no-print">
          <button
            onClick={handleSaveAndSharePDF}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-danger-600 hover:bg-danger-700 text-white font-extrabold text-xs transition-all shadow-md shadow-danger-600/25 active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            <span>حفظ ومشاركة PDF</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
}
