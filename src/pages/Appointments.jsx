import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { db, deleteRecord } from '../db/indexedDB';
import { formatDate } from '../utils/dateUtils';
import { 
  Calendar, Clock, MapPin, User, Plus, 
  Sparkles, CheckCircle2, AlertCircle, Edit3, Trash2 
} from 'lucide-react';

export function Appointments({ onOpenAddModal, onEditAppointment }) {
  const { lang, t } = useI18n();
  const { activePatientId, dataVersion } = usePatient();

  const [appointments, setAppointments] = useState([]);

  const loadAppointments = async () => {
    if (!activePatientId) return;
    const list = await db.appointments.where('PatientID').equals(activePatientId).reverse().sortBy('Date');
    setAppointments(list || []);
  };

  useEffect(() => {
    loadAppointments();
    const handleDataChanged = () => loadAppointments();
    window.addEventListener('sejel:data-changed', handleDataChanged);
    return () => window.removeEventListener('sejel:data-changed', handleDataChanged);
  }, [activePatientId, dataVersion]);

  const handleDelete = async (appt) => {
    const confirmMsg = lang === 'ar' 
      ? `هل أنت متأكد من حذف موعد "${appt.Title}"؟` 
      : `Are you sure you want to delete "${appt.Title}"?`;

    if (window.confirm(confirmMsg)) {
      await deleteRecord('appointments', appt.AppointmentID);
      loadAppointments();
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('appointments.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            جدول المواعيد والاستشارات الطبية والتكامل مع Google Calendar
          </p>
        </div>

        <button
          onClick={() => onOpenAddModal('appointment')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('appointments.add_appt')}</span>
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <Calendar className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {lang === 'ar' 
                ? 'لا توجد مواعيد مجدولة. اضغط لحجز موعدك القادم.' 
                : 'No appointments scheduled yet. Click + to book your next appointment.'}
            </p>
            <button
              onClick={() => onOpenAddModal('appointment')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('appointments.add_appt')}</span>
            </button>
          </div>
        ) : (
          appointments.map(appt => (
            <div
              key={appt.AppointmentID}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center font-bold shrink-0">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">
                    {appt.Date ? new Date(appt.Date).toLocaleDateString('ar-SA', { month: 'short' }) : 'موعد'}
                  </span>
                  <span className="text-sm font-black font-mono text-amber-800 dark:text-amber-200">
                    {appt.Date ? new Date(appt.Date).getDate() : '-'}
                  </span>
                </div>

                <div className="min-w-0 space-y-1">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {appt.Title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                    {appt.DoctorName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{appt.DoctorName}</span>
                      </span>
                    )}
                    {appt.Location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{appt.Location}</span>
                      </span>
                    )}
                  </div>
                  {appt.Notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {appt.Notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Details & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <span className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-mono font-bold text-xs">
                  {formatDate(appt.Date, lang)} {appt.Time}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditAppointment(appt)}
                    className="p-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(appt)}
                    className="p-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
