import React, { useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { formatDate } from '../utils/dateUtils';
import { 
  User, Calendar, Heart, Shield, Activity, 
  Phone, Mail, Lock, Edit3, Save, CheckCircle2, Scissors, AlertTriangle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function Profile({ onOpenEmergency }) {
  const { lang, t } = useI18n();
  const { activePatient, updateActivePatient } = usePatient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!activePatient) return null;

  const handleStartEdit = () => {
    setFormData({ ...activePatient });
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateActivePatient(formData);
    setIsEditing(false);
    setSaveSuccess(true);
    try {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    } catch {}
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // حساب العمر
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('profile.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            البيانات الصحية الشخصية، فصيلة الدم، ومعلومات الطوارئ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs shadow-md shadow-primary-600/20 transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تعديل البيانات' : t('profile.edit_profile')}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
            >
              {t('common.cancel')}
            </button>
          )}

          <button
            onClick={onOpenEmergency}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-danger-500 hover:bg-danger-600 text-white font-bold text-xs shadow-md shadow-danger-500/20 transition-all"
          >
            <Shield className="w-4 h-4" />
            <span>{t('emergency.title')}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>تم حفظ وتحديث الملف الطبي بنجاح!</span>
        </div>
      )}

      {/* Profile Details Card / Form */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm">
        
        {!isEditing ? (
          <div className="space-y-6">
            
            {/* Hero Profile Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-700 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-primary-500/20 shrink-0">
                {activePatient.Name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {activePatient.Name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {activePatient.Gender === 'Male' ? t('profile.male') : t('profile.female')} • {calculateAge(activePatient.BirthDate)} {t('profile.years')} (الميلاد: {formatDate(activePatient.BirthDate, lang)})
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <span className="px-3 py-1 rounded-xl bg-danger-100 dark:bg-danger-950 text-danger-700 dark:text-danger-300 font-bold text-xs">
                    فصيلة الدم: {activePatient.BloodType || 'O+'}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-mono font-bold text-xs">
                    ID: {activePatient.PatientID}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="block text-[11px] font-bold text-slate-400 mb-0.5">{t('profile.height')}</span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">{activePatient.Height || '-'} cm</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="block text-[11px] font-bold text-slate-400 mb-0.5">{t('profile.weight')}</span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">{activePatient.Weight || '-'} kg</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="block text-[11px] font-bold text-slate-400 mb-0.5">{t('emergency.contact_name')}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">{activePatient.EmergencyContactName || '-'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="block text-[11px] font-bold text-slate-400 mb-0.5">{t('emergency.contact_phone')}</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white truncate block">{activePatient.EmergencyContactPhone || '-'}</span>
              </div>
            </div>

            {/* Critical Conditions & Allergies */}
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
                <div className="flex items-center gap-2 text-danger-700 dark:text-danger-400 font-extrabold text-xs mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('emergency.allergies')}</span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {activePatient.Allergies || t('emergency.no_critical_allergies')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-primary-600 font-bold text-xs mb-1">
                    <Activity className="w-4 h-4" />
                    <span>{t('emergency.chronic_diseases')}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activePatient.ChronicDiseases || t('emergency.no_chronic_diseases')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-1">
                    <Scissors className="w-4 h-4" />
                    <span>{t('emergency.surgeries')}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {activePatient.Surgeries || 'لا توجد عمليات جراحية سابقة'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Form for Editing Profile */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.name')}
                </label>
                <input
                  type="text"
                  required
                  value={formData.Name || ''}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.birth_date')}
                </label>
                <input
                  type="date"
                  required
                  value={formData.BirthDate ? formData.BirthDate.split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, BirthDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.gender')}
                </label>
                <select
                  value={formData.Gender || 'Male'}
                  onChange={(e) => setFormData({ ...formData, Gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="Male">{t('profile.male')}</option>
                  <option value="Female">{t('profile.female')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('emergency.blood_type')}
                </label>
                <select
                  value={formData.BloodType || 'O+'}
                  onChange={(e) => setFormData({ ...formData, BloodType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-primary-600 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.weight')} (kg)
                </label>
                <input
                  type="number"
                  value={formData.Weight || ''}
                  onChange={(e) => setFormData({ ...formData, Weight: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('emergency.allergies')}
              </label>
              <input
                type="text"
                value={formData.Allergies || ''}
                onChange={(e) => setFormData({ ...formData, Allergies: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-danger-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('emergency.chronic_diseases')}
                </label>
                <input
                  type="text"
                  value={formData.ChronicDiseases || ''}
                  onChange={(e) => setFormData({ ...formData, ChronicDiseases: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('emergency.surgeries')}
                </label>
                <input
                  type="text"
                  value={formData.Surgeries || ''}
                  onChange={(e) => setFormData({ ...formData, Surgeries: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('emergency.contact_name')}
                </label>
                <input
                  type="text"
                  value={formData.EmergencyContactName || ''}
                  onChange={(e) => setFormData({ ...formData, EmergencyContactName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('emergency.contact_phone')}
                </label>
                <input
                  type="tel"
                  value={formData.EmergencyContactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, EmergencyContactPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
              >
                {t('common.cancel')}
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs shadow-md shadow-primary-600/30 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{t('common.save')}</span>
              </button>
            </div>
          </form>
        )}

      </div>

    </div>
  );
}
