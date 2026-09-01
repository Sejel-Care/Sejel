import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { deleteRecord } from '../../db/indexedDB';
import { formatDate } from '../../utils/dateUtils';
import { 
  Users, UserPlus, Edit3, Trash2, X, Check, 
  HeartPulse, Shield, AlertTriangle, ArrowRight 
} from 'lucide-react';

export function FamilyManagementModal({ isOpen, onClose, onAddMember, onEditMember }) {
  const { lang, t } = useI18n();
  const { patients, activePatientId, switchPatient, refreshPatients } = usePatient();

  if (!isOpen) return null;

  const handleDeletePatient = async (patient) => {
    if (patients.length <= 1) {
      alert(lang === 'ar' ? 'لا يمكن حذف المريض الوحيد في الحساب.' : 'Cannot delete the only patient in the account.');
      return;
    }

    const confirmMsg = lang === 'ar' 
      ? `هل أنت متأكد من حذف ملف المريض "${patient.Name}" نهائياً؟` 
      : `Are you sure you want to delete profile "${patient.Name}"?`;

    if (window.confirm(confirmMsg)) {
      await deleteRecord('patients', patient.PatientID);
      await refreshPatients();
      if (activePatientId === patient.PatientID) {
        const remaining = patients.filter(p => p.PatientID !== patient.PatientID);
        if (remaining.length > 0) {
          switchPatient(remaining[0].PatientID);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full sm:max-w-xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {lang === 'ar' ? 'إدارة أفراد العائلة' : 'Family Members Management'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'إضافة وتعديل وحذف الملفات الطبية للأسرة' : 'Manage, edit and add family health profiles'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Members List */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
          {patients.map(patient => {
            const isActive = patient.PatientID === activePatientId;
            return (
              <div
                key={patient.PatientID}
                className={`p-4 rounded-2xl border transition-all ${
                  isActive
                    ? 'bg-primary-50/70 dark:bg-primary-950/40 border-primary-300 dark:border-primary-800 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                      {patient.Name ? patient.Name.charAt(0) : 'P'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {patient.Name}
                        </h4>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500 text-white shrink-0">
                            {lang === 'ar' ? 'الملف الحالي' : 'Active'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        {patient.Gender === 'Male' ? t('profile.male') : t('profile.female')} • فصيلة الدم: <strong className="text-primary-600">{patient.BloodType || 'O+'}</strong> • الميلاد: {formatDate(patient.BirthDate, lang)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => {
                          switchPatient(patient.PatientID);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-primary-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                        title="تبديل إلى هذا الملف"
                      >
                        {lang === 'ar' ? 'اختيار' : 'Select'}
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        onClose();
                        onEditMember(patient);
                      }}
                      className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeletePatient(patient)}
                      className="p-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {patient.Allergies && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-danger-600 dark:text-danger-400 font-bold">
                    ⚠️ الحساسية: {patient.Allergies}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with Add Member Button */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              onAddMember();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md shadow-primary-600/25 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('family.add_member')}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            {t('common.close')}
          </button>
        </div>

      </div>
    </div>
  );
}
