import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { db, deleteRecord } from '../db/indexedDB';
import { formatDate } from '../utils/dateUtils';
import { 
  Stethoscope, Calendar, MapPin, User, Plus, Search, 
  FileText, Clock, ChevronRight, Filter, Edit3, Trash2, MoreVertical, X 
} from 'lucide-react';

export function Visits({ onOpenAddModal, onEditVisit }) {
  const { lang, t } = useI18n();
  const { activePatientId, dataVersion } = usePatient();

  const [visits, setVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);

  const loadVisits = async () => {
    if (!activePatientId) return;
    const list = await db.visits.where('PatientID').equals(activePatientId).reverse().sortBy('Date');
    setVisits(list || []);
  };

  useEffect(() => {
    loadVisits();
    const handleDataChanged = () => loadVisits();
    window.addEventListener('sejel:data-changed', handleDataChanged);
    return () => window.removeEventListener('sejel:data-changed', handleDataChanged);
  }, [activePatientId, dataVersion]);

  const handleDelete = async (visit) => {
    const confirmMsg = lang === 'ar' 
      ? 'هل أنت متأكد من حذف هذه الزيارة الطبية؟' 
      : 'Are you sure you want to delete this visit?';

    if (window.confirm(confirmMsg)) {
      await deleteRecord('visits', visit.VisitID);
      setActiveMenuId(null);
      loadVisits();
    }
  };

  const filteredVisits = visits.filter(v => 
    (v.DoctorName && v.DoctorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.Diagnosis && v.Diagnosis.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.Specialty && v.Specialty.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.Clinic && v.Clinic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('visits.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            سجل الاستشارات الطبية، التشخيص، وتوصيات الأطباء
          </p>
        </div>

        <button
          onClick={() => onOpenAddModal('visit')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('visits.add_visit')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 rtl:right-3.5 ltr:left-3.5 text-slate-400" />
        <input
          type="text"
          placeholder={t('common.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rtl:pr-10 ltr:pl-10 py-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-xs"
        />
      </div>

      {/* Visits List */}
      <div className="space-y-3">
        {filteredVisits.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center">
              <Stethoscope className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {lang === 'ar' 
                ? 'لا توجد زيارات مسجلة بعد. اضغط على + لإضافة أول زيارة.' 
                : 'No visits recorded yet. Click + to add your first visit.'}
            </p>
            <button
              onClick={() => onOpenAddModal('visit')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('visits.add_visit')}</span>
            </button>
          </div>
        ) : (
          filteredVisits.map(visit => (
            <div
              key={visit.VisitID}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:border-teal-300 dark:hover:border-teal-700/60 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {visit.DoctorName}
                      </h3>
                      {visit.Specialty && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 shrink-0">
                          {visit.Specialty}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      {visit.Clinic && `${visit.Clinic} • `}{formatDate(visit.Date, lang)}
                    </p>
                  </div>
                </div>

                {/* Edit / Delete Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onEditVisit(visit)}
                    className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(visit)}
                    className="p-2 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Diagnosis Box */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="block text-[11px] font-bold text-teal-700 dark:text-teal-400 mb-0.5">
                  التشخيص الطبي:
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {visit.Diagnosis}
                </p>
              </div>

              {/* Notes & Recommendations */}
              {visit.Notes && (
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <strong className="text-slate-800 dark:text-slate-200">التوصيات:</strong> {visit.Notes}
                </p>
              )}

              {/* Next Appointment Date */}
              {visit.NextAppointmentDate && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-bold">
                  <Clock className="w-4 h-4" />
                  <span>المراجعة القادمة: {formatDate(visit.NextAppointmentDate, lang)}</span>
                </div>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
}
