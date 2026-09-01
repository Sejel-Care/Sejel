import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { db, updateRecord, deleteRecord } from '../db/indexedDB';
import { formatDate } from '../utils/dateUtils';
import { 
  Pill, Plus, CheckCircle2, Circle, Clock, 
  Calendar, AlertCircle, Bell, Sparkles, Edit3, Trash2 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function Medications({ onOpenAddModal, onEditMedication }) {
  const { lang, t } = useI18n();
  const { activePatientId, dataVersion } = usePatient();

  const [medications, setMedications] = useState([]);
  const todayStr = new Date().toISOString().split('T')[0];

  const loadMedications = async () => {
    if (!activePatientId) return;
    const list = await db.medications.where('PatientID').equals(activePatientId).toArray();
    setMedications(list || []);
  };

  useEffect(() => {
    loadMedications();
    const handleDataChanged = () => loadMedications();
    window.addEventListener('sejel:data-changed', handleDataChanged);
    return () => window.removeEventListener('sejel:data-changed', handleDataChanged);
  }, [activePatientId, dataVersion]);

  const handleToggleTaken = async (med) => {
    const isTaken = med.LastTakenDate && med.LastTakenDate.startsWith(todayStr);
    const newLastTaken = isTaken ? '' : new Date().toISOString();
    
    await updateRecord('medications', med.MedicationID, { LastTakenDate: newLastTaken });
    
    if (!isTaken) {
      try {
        confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
      } catch {}
    }
    loadMedications();
  };

  const handleDelete = async (med) => {
    const confirmMsg = lang === 'ar' 
      ? `هل أنت متأكد من حذف دواء "${med.Name}"؟` 
      : `Are you sure you want to delete "${med.Name}"?`;

    if (window.confirm(confirmMsg)) {
      await deleteRecord('medications', med.MedicationID);
      loadMedications();
    }
  };

  const takenCount = medications.filter(m => m.LastTakenDate && m.LastTakenDate.startsWith(todayStr)).length;
  const adherenceRate = medications.length > 0 ? Math.round((takenCount / medications.length) * 100) : 0;

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('medications.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            جدول الجرعات اليومية ومتابعة الالتزام العلاجي
          </p>
        </div>

        <button
          onClick={() => onOpenAddModal('medication')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('medications.add_med')}</span>
        </button>
      </div>

      {/* Adherence Progress Bar */}
      {medications.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>{t('medications.adherence_rate')}: {adherenceRate}%</span>
            </div>
            <span className="text-slate-500">{takenCount} من {medications.length} أدوية مكتملة اليوم</span>
          </div>

          <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${adherenceRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Medications Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {medications.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <Pill className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {lang === 'ar' 
                ? 'لا توجد أدوية حالياً. أضف دواءك الأول.' 
                : 'No medications yet. Click + to add your first medication.'}
            </p>
            <button
              onClick={() => onOpenAddModal('medication')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('medications.add_med')}</span>
            </button>
          </div>
        ) : (
          medications.map(med => {
            const isTaken = med.LastTakenDate && med.LastTakenDate.startsWith(todayStr);
            return (
              <div
                key={med.MedicationID}
                className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${
                  isTaken
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60 shadow-sm'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isTaken ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                    }`}>
                      <Pill className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {med.Name}
                      </h3>
                      <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {med.Dosage}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditMedication(med)}
                      className="p-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(med)}
                      className="p-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>التكرار: <strong>{med.Frequency}</strong></span>
                  </div>
                  {med.Instructions && (
                    <p className="text-[11px] text-slate-500">
                      الإرشادات: {med.Instructions}
                    </p>
                  )}
                  {med.StartDate && (
                    <p className="text-[10px] font-mono text-slate-400">
                      الفترة: {formatDate(med.StartDate, lang)} {med.EndDate ? `إلى ${formatDate(med.EndDate, lang)}` : ''}
                    </p>
                  )}
                </div>

                {/* Take Dose Button */}
                <button
                  onClick={() => handleToggleTaken(med)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
                    isTaken
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-emerald-500 hover:text-white text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isTaken ? t('medications.taken_today') : t('medications.take_dose')}</span>
                </button>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
