import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { db, deleteRecord } from '../db/indexedDB';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import { 
  Activity, HeartPulse, TrendingUp, Plus, Clock, 
  Calendar, Filter, Sparkles, Edit3, Trash2 
} from 'lucide-react';

export function Vitals({ onOpenAddModal, onEditVital }) {
  const { lang, t } = useI18n();
  const { activePatientId, dataVersion } = usePatient();

  const [vitals, setVitals] = useState([]);
  const [selectedType, setSelectedType] = useState('All');

  const loadVitals = async () => {
    if (!activePatientId) return;
    const list = await db.vitals.where('PatientID').equals(activePatientId).reverse().sortBy('Date');
    setVitals(list || []);
  };

  useEffect(() => {
    loadVitals();
    const handleDataChanged = () => loadVitals();
    window.addEventListener('sejel:data-changed', handleDataChanged);
    return () => window.removeEventListener('sejel:data-changed', handleDataChanged);
  }, [activePatientId, dataVersion]);

  const handleDelete = async (vital) => {
    const confirmMsg = lang === 'ar' 
      ? 'هل أنت متأكد من حذف هذا القياس الحيوي؟' 
      : 'Are you sure you want to delete this vital reading?';

    if (window.confirm(confirmMsg)) {
      await deleteRecord('vitals', vital.VitalID);
      loadVitals();
    }
  };

  const vitalTypes = [
    { id: 'All', label: lang === 'ar' ? 'الكل' : 'All' },
    { id: 'BloodPressure', label: t('vitals.types.BloodPressure') },
    { id: 'Sugar', label: t('vitals.types.Sugar') },
    { id: 'Pulse', label: t('vitals.types.Pulse') },
    { id: 'Temperature', label: t('vitals.types.Temperature') },
    { id: 'Weight', label: t('vitals.types.Weight') },
    { id: 'Oxygen', label: t('vitals.types.Oxygen') },
  ];

  const filteredVitals = selectedType === 'All' 
    ? vitals 
    : vitals.filter(v => v.Type === selectedType);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BloodPressure': return HeartPulse;
      case 'Sugar': return Activity;
      case 'Pulse': return TrendingUp;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('vitals.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            متابعة المؤشرات الحيوية والضغط والسكر والوزن
          </p>
        </div>

        <button
          onClick={() => onOpenAddModal('vital')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'تسجيل قياس جديد' : t('vitals.log_new')}</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {vitalTypes.map(vt => (
          <button
            key={vt.id}
            onClick={() => setSelectedType(vt.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedType === vt.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {vt.label}
          </button>
        ))}
      </div>

      {/* Vitals Feed */}
      <div className="space-y-3">
        {filteredVitals.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
              <Activity className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {lang === 'ar' 
                ? 'لا توجد قياسات حيوية مسجلة بعد. اضغط لتسجيل أول قياس.' 
                : 'No vitals recorded yet. Click + to log your first vital.'}
            </p>
            <button
              onClick={() => onOpenAddModal('vital')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تسجيل قياس جديد' : t('vitals.log_new')}</span>
            </button>
          </div>
        ) : (
          filteredVitals.map(vital => {
            const Icon = getTypeIcon(vital.Type);
            return (
              <div
                key={vital.VitalID}
                className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {t(`vitals.types.${vital.Type}`) || vital.Type}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatDateTime(vital.Date, lang)}
                      </span>
                    </div>
                    {vital.Notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        {vital.Notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right rtl:text-right ltr:text-left">
                    <span className="text-base sm:text-lg font-black font-mono text-indigo-700 dark:text-indigo-300">
                      {vital.Value}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 mr-1">
                      {vital.Unit}
                    </span>
                  </div>

                  {/* Edit / Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditVital(vital)}
                      className="p-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vital)}
                      className="p-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
