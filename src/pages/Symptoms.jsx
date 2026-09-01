import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { db, deleteRecord } from '../db/indexedDB';
import { formatDateTime } from '../utils/dateUtils';
import { getPlayableAudioUrl, getDriveDirectViewUrl } from '../services/driveService';
import { 
  Mic, Play, Plus, Clock, AlertTriangle, 
  Activity, Sparkles, Edit3, Trash2, ExternalLink 
} from 'lucide-react';

export function Symptoms({ onOpenVoiceModal, onEditSymptom }) {
  const { lang, t } = useI18n();
  const { activePatientId, dataVersion } = usePatient();

  const [symptoms, setSymptoms] = useState([]);

  const loadSymptoms = async () => {
    if (!activePatientId) return;
    const list = await db.symptoms.where('PatientID').equals(activePatientId).reverse().sortBy('Date');
    setSymptoms(list || []);
  };

  useEffect(() => {
    loadSymptoms();
    const handleDataChanged = () => loadSymptoms();
    window.addEventListener('sejel:data-changed', handleDataChanged);
    return () => window.removeEventListener('sejel:data-changed', handleDataChanged);
  }, [activePatientId, dataVersion]);

  const handleDelete = async (sym) => {
    const confirmMsg = lang === 'ar' 
      ? 'هل أنت متأكد من حذف هذا العرض الصحي والتسجيل المرتبط به؟' 
      : 'Are you sure you want to delete this symptom record?';

    if (window.confirm(confirmMsg)) {
      await deleteRecord('symptoms', sym.SymptomID);
      loadSymptoms();
    }
  };

  const getSeverityBadge = (val) => {
    if (val <= 3) return { text: t('symptoms.severity_levels.mild'), bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' };
    if (val <= 6) return { text: t('symptoms.severity_levels.moderate'), bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' };
    return { text: t('symptoms.severity_levels.severe'), bg: 'bg-danger-100 text-danger-800 dark:bg-danger-950/80 dark:text-danger-300' };
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('symptoms.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            سجل الأعراض اليومية والملاحظات الصحية مع التسجيلات الصوتية
          </p>
        </div>

        <button
          onClick={onOpenVoiceModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-purple-600/20 transition-all active:scale-95 shrink-0"
        >
          <Mic className="w-4 h-4" />
          <span>{t('symptoms.record_btn')}</span>
        </button>
      </div>

      {/* Symptoms List */}
      <div className="space-y-3.5">
        {symptoms.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
              <Mic className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {lang === 'ar' 
                ? 'لا توجد أعراض مسجلة بعد. اضغط على الميكروفون لبدء التسجيل الصوتي.' 
                : 'No symptoms recorded yet. Click mic to start voice recording.'}
            </p>
            <button
              onClick={onOpenVoiceModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-sm"
            >
              <Mic className="w-4 h-4" />
              <span>{t('symptoms.record_btn')}</span>
            </button>
          </div>
        ) : (
          symptoms.map(sym => {
            const sevBadge = getSeverityBadge(sym.Severity);
            const rawAudio = sym.AudioFileURL || sym.audioUrl || '';
            const audioSrc = getPlayableAudioUrl(rawAudio);
            const driveDirectUrl = getDriveDirectViewUrl(rawAudio);

            return (
              <div
                key={sym.SymptomID}
                className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3 hover:border-purple-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevBadge.bg}`}>
                          {sevBadge.text} ({sym.Severity}/10)
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDateTime(sym.Date, lang)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 leading-relaxed">
                        {sym.Description}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditSymptom(sym)}
                      className="p-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sym)}
                      className="p-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:red-400 hover:bg-red-100 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Additional notes & duration */}
                {(sym.Duration || sym.Notes) && (
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
                    {sym.Duration && <span>المدة: <strong>{sym.Duration}</strong></span>}
                    {sym.Notes && <span>ملاحظات: {sym.Notes}</span>}
                  </div>
                )}

                {/* Audio playback with direct Drive fallback */}
                {rawAudio && (
                  <div className="pt-2">
                    <div className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/40 max-w-md">
                      <audio 
                        src={audioSrc} 
                        controls 
                        preload="metadata"
                        className="h-8 w-full flex-1" 
                      />
                      {driveDirectUrl && driveDirectUrl.startsWith('http') && (
                        <a
                          href={driveDirectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-200/80 hover:bg-purple-300 dark:bg-purple-900/80 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-bold transition-all shrink-0"
                          title="استماع وفتح عبر Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Google Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

export default Symptoms;
