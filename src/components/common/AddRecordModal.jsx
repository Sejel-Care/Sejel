import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { addRecord, updateRecord } from '../../db/indexedDB';
import { syncEngine } from '../../db/syncEngine';
import { toStorageDate } from '../../utils/dateUtils';
import { 
  X, Save, Stethoscope, Pill, Activity, Calendar, 
  UploadCloud, UserPlus, HeartPulse, Check, Plus, AlertCircle, Edit3,
  Loader2, CheckCircle2, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function AddRecordModal({ 
  isOpen, 
  onClose, 
  recordType = 'visit', 
  initialData = null, 
  onSaved 
}) {
  const { lang, t } = useI18n();
  const { activePatient, activePatientId, createPatient, updateActivePatient, refreshPatients } = usePatient();
  const { user } = useAuth();

  const isEditMode = !!initialData;
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [formData, setFormData] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setSelectedFile(null);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const nowTimeStr = new Date().toTimeString().slice(0, 5);

      if (initialData) {
        // Mode: EDIT - Pre-fill data
        setFormData({ ...initialData });
      } else {
        // Mode: CREATE - Default values
        if (recordType === 'visit') {
          setFormData({
            Date: todayStr,
            DoctorName: '',
            Specialty: 'باطنة عامة',
            Clinic: '',
            Diagnosis: '',
            Notes: '',
            NextAppointmentDate: '',
            Attachments: '[]'
          });
        } else if (recordType === 'medication') {
          setFormData({
            Name: '',
            Dosage: '',
            Frequency: 'مرة واحدة يومياً',
            StartDate: todayStr,
            EndDate: '',
            Instructions: '',
            ReminderEnabled: true
          });
        } else if (recordType === 'vital') {
          setFormData({
            Type: 'BloodPressure',
            Value: '120/80',
            Unit: 'mmHg',
            Date: new Date().toISOString(),
            Notes: ''
          });
        } else if (recordType === 'appointment') {
          setFormData({
            Title: '',
            DoctorName: '',
            Date: todayStr,
            Time: nowTimeStr,
            Location: '',
            Notes: '',
            syncCalendar: true
          });
        } else if (recordType === 'document') {
          setFormData({
            Category: 'Prescription',
            FileName: '',
            VisitID: ''
          });
        } else if (recordType === 'patient') {
          setFormData({
            Name: '',
            BirthDate: '2000-01-01',
            Gender: 'Male',
            BloodType: 'O+',
            Height: 170,
            Weight: 70,
            Allergies: '',
            ChronicDiseases: '',
            Surgeries: '',
            EmergencyContactName: '',
            EmergencyContactPhone: '',
            GuardianEmail: '',
            PIN: '2000'
          });
        }
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, recordType, initialData, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVitalTypeChange = (type) => {
    const units = {
      BloodPressure: 'mmHg',
      Sugar: 'mg/dL',
      Pulse: 'bpm',
      Temperature: '°C',
      Weight: 'kg',
      Oxygen: '%'
    };
    const defaultValues = {
      BloodPressure: '120/80',
      Sugar: '95',
      Pulse: '72',
      Temperature: '37.0',
      Weight: '75',
      Oxygen: '98'
    };
    setFormData(prev => ({
      ...prev,
      Type: type,
      Unit: units[type] || '',
      Value: defaultValues[type] || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      if (recordType === 'patient') {
        setStatusMessage(lang === 'ar' ? 'جاري حفظ بيانات المريض...' : 'Saving patient profile...');
        if (isEditMode) {
          await updateRecord('patients', initialData.PatientID, formData);
          await refreshPatients();
        } else {
          await createPatient(formData);
        }
      } else if (recordType === 'document') {
        if (isEditMode) {
          setStatusMessage(lang === 'ar' ? 'جاري تحديث بيانات المستند...' : 'Updating document info...');
          await updateRecord('files', initialData.FileID, formData);
        } else {
          if (!selectedFile) {
            alert(lang === 'ar' ? 'يرجى اختيار ملف أولاً' : 'Please select a file first');
            setLoading(false);
            return;
          }
          setStatusMessage(lang === 'ar' ? 'جاري رفع الملف إلى Google Drive وحفظ السجل...' : 'Uploading file to Google Drive & saving record...');
          await syncEngine.uploadFileToDrive({
            file: selectedFile,
            uid: user?.uid || 'General',
            patientId: activePatientId || 'P_01',
            patientName: activePatient?.Name || activePatient?.name || activePatient?.fullName || '',
            category: formData.Category,
            visitId: formData.VisitID
          });
        }
      } else {
        const tableMap = {
          visit: { table: 'visits', pk: 'VisitID' },
          medication: { table: 'medications', pk: 'MedicationID' },
          vital: { table: 'vitals', pk: 'VitalID' },
          appointment: { table: 'appointments', pk: 'AppointmentID' }
        };
        const { table, pk } = tableMap[recordType];
        setStatusMessage(lang === 'ar' ? 'جاري حفظ السجل...' : 'Saving record...');

        if (isEditMode) {
          await updateRecord(table, initialData[pk], formData);
        } else {
          await addRecord(table, {
            ...formData,
            uid: user?.uid || 'General',
            PatientID: activePatientId || 'P_01'
          });
        }
      }

      setSaveSuccess(true);
      setStatusMessage(lang === 'ar' ? 'تم الحفظ والرفع بنجاح ✓' : 'Successfully saved & uploaded ✓');

      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      } catch {}

      setTimeout(() => {
        if (onSaved) onSaved();
        onClose();
      }, 350);
    } catch (err) {
      console.error('Error saving record:', err);
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
      setLoading(false);
      setSaveSuccess(false);
      setStatusMessage('');
    }
  };

  const getHeaderInfo = () => {
    const actionPrefix = isEditMode ? (lang === 'ar' ? 'تعديل ' : 'Edit ') : (lang === 'ar' ? 'إضافة ' : 'Add ');
    switch (recordType) {
      case 'visit':
        return { title: `${actionPrefix}${t('visits.title')}`, icon: Stethoscope, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/80' };
      case 'medication':
        return { title: `${actionPrefix}${t('medications.title')}`, icon: Pill, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/80' };
      case 'vital':
        return { title: `${actionPrefix}${t('vitals.title')}`, icon: Activity, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/80' };
      case 'appointment':
        return { title: `${actionPrefix}${t('appointments.title')}`, icon: Calendar, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/80' };
      case 'document':
        return { title: `${actionPrefix}${t('documents.title')}`, icon: UploadCloud, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/80' };
      case 'patient':
        return { title: isEditMode ? (lang === 'ar' ? 'تعديل بيانات المريض' : 'Edit Profile') : t('family.add_member'), icon: UserPlus, color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/80' };
      default:
        return { title: 'إضافة سجل', icon: Plus, color: 'text-slate-500 bg-slate-50' };
    }
  };

  const header = getHeaderInfo();
  const Icon = header.icon;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col cursor-default"
      >
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${header.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {header.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            
            {/* Status / Loading Banner */}
            {(loading || saveSuccess) && statusMessage && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                saveSuccess
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-primary-50 dark:bg-primary-950/70 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300'
              }`}>
                {saveSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </div>
            )}
            
            {/* VISIT FORM */}
            {recordType === 'visit' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('visits.date')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.Date ? formData.Date.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('Date', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('visits.doctor_name')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="د. فلان الفلاني"
                      value={formData.DoctorName || ''}
                      onChange={(e) => handleInputChange('DoctorName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('visits.specialty')}
                    </label>
                    <input
                      type="text"
                      placeholder="باطنة، قلب، أطفال، عيون..."
                      value={formData.Specialty || ''}
                      onChange={(e) => handleInputChange('Specialty', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('visits.clinic')}
                    </label>
                    <input
                      type="text"
                      placeholder="اسم المستشفى أو المركز"
                      value={formData.Clinic || ''}
                      onChange={(e) => handleInputChange('Clinic', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('visits.diagnosis')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="التشخيص الطبي للحالة"
                    value={formData.Diagnosis || ''}
                    onChange={(e) => handleInputChange('Diagnosis', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('visits.notes')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="التوصيات والجرعات والإرشادات..."
                    value={formData.Notes || ''}
                    onChange={(e) => handleInputChange('Notes', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('visits.next_appointment')}
                  </label>
                  <input
                    type="date"
                    value={formData.NextAppointmentDate ? formData.NextAppointmentDate.split('T')[0] : ''}
                    onChange={(e) => handleInputChange('NextAppointmentDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* MEDICATION FORM */}
            {recordType === 'medication' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('medications.med_name')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="اسم الدواء (مثال: Concor)"
                      value={formData.Name || ''}
                      onChange={(e) => handleInputChange('Name', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('medications.dosage')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 5mg, حبة واحدة"
                      value={formData.Dosage || ''}
                      onChange={(e) => handleInputChange('Dosage', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('medications.frequency')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مرة صباحاً، كل 8 ساعات، عند اللزوم"
                    value={formData.Frequency || ''}
                    onChange={(e) => handleInputChange('Frequency', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('medications.start_date')}
                    </label>
                    <input
                      type="date"
                      value={formData.StartDate ? formData.StartDate.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('StartDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('medications.end_date')}
                    </label>
                    <input
                      type="date"
                      value={formData.EndDate ? formData.EndDate.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('EndDate', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('medications.instructions')}
                  </label>
                  <input
                    type="text"
                    placeholder="يؤخذ بعد الأكل مع كوب ماء..."
                    value={formData.Instructions || ''}
                    onChange={(e) => handleInputChange('Instructions', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remEnabled"
                    checked={formData.ReminderEnabled || false}
                    onChange={(e) => handleInputChange('ReminderEnabled', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="remEnabled" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    {t('medications.reminders')}
                  </label>
                </div>
              </>
            )}

            {/* VITALS FORM */}
            {recordType === 'vital' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('vitals.type')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['BloodPressure', 'Sugar', 'Pulse', 'Temperature', 'Weight', 'Oxygen'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleVitalTypeChange(type)}
                        className={`p-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
                          formData.Type === type
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t(`vitals.types.${type}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('vitals.value')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="120/80, 95..."
                      value={formData.Value || ''}
                      onChange={(e) => handleInputChange('Value', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base font-mono font-black focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('vitals.unit')}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formData.Unit || ''}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('vitals.notes')}
                  </label>
                  <input
                    type="text"
                    placeholder="صائم، بعد مجهود، في الراحة..."
                    value={formData.Notes || ''}
                    onChange={(e) => handleInputChange('Notes', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* APPOINTMENT FORM */}
            {recordType === 'appointment' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('appointments.title_field')} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مراجعة دورية، فحص أشعة، موعد أسنان..."
                    value={formData.Title || ''}
                    onChange={(e) => handleInputChange('Title', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('appointments.doctor')}
                    </label>
                    <input
                      type="text"
                      placeholder="اسم الطبيب"
                      value={formData.DoctorName || ''}
                      onChange={(e) => handleInputChange('DoctorName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('appointments.location')}
                    </label>
                    <input
                      type="text"
                      placeholder="العيادة أو المستشفى"
                      value={formData.Location || ''}
                      onChange={(e) => handleInputChange('Location', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('appointments.date')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.Date ? formData.Date.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('Date', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('appointments.time')} *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.Time || ''}
                      onChange={(e) => handleInputChange('Time', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('appointments.notes')}
                  </label>
                  <input
                    type="text"
                    placeholder="تعليمات الصيام أو الفحوصات المطلوبة"
                    value={formData.Notes || ''}
                    onChange={(e) => handleInputChange('Notes', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="syncCal"
                    checked={formData.syncCalendar || false}
                    onChange={(e) => handleInputChange('syncCalendar', e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="syncCal" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    {t('appointments.sync_calendar')}
                  </label>
                </div>
              </>
            )}

            {/* DOCUMENT UPLOAD / EDIT FORM */}
            {recordType === 'document' && (
              <>
                {!isEditMode && (
                  <div>
                    <input
                      type="file"
                      id="docFile"
                      disabled={loading}
                      accept="image/*,application/pdf,audio/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSelectedFile(file);
                          if (!formData.FileName) {
                            handleInputChange('FileName', file.name);
                          }
                        }
                      }}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {selectedFile.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                                {loading ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'جاهز للرفع إلى Google Drive' : 'Ready to upload')}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!loading && (
                          <label 
                            htmlFor="docFile" 
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                          >
                            {lang === 'ar' ? 'تغيير' : 'Change'}
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                        <label htmlFor="docFile" className="cursor-pointer block">
                          <UploadCloud className="w-10 h-10 mx-auto text-primary-500 mb-2" />
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {t('documents.drag_drop')}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            PDF, JPG, PNG, WEBM
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('documents.file_name')} *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={formData.FileName || ''}
                    onChange={(e) => handleInputChange('FileName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('documents.category')}
                  </label>
                  <select
                    disabled={loading}
                    value={formData.Category || 'Prescription'}
                    onChange={(e) => handleInputChange('Category', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-60"
                  >
                    <option value="Prescription">{t('documents.categories.Prescription')}</option>
                    <option value="Lab">{t('documents.categories.Lab')}</option>
                    <option value="Radiology">{t('documents.categories.Radiology')}</option>
                    <option value="Report">{t('documents.categories.Report')}</option>
                    <option value="Vaccination">{t('documents.categories.Vaccination')}</option>
                    <option value="Other">{t('documents.categories.Other')}</option>
                  </select>
                </div>
              </>
            )}

            {/* NEW / EDIT PATIENT (FAMILY MEMBER) */}
            {recordType === 'patient' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('profile.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="الاسم الكامل"
                      value={formData.Name || ''}
                      onChange={(e) => handleInputChange('Name', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('profile.birth_date')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.BirthDate ? formData.BirthDate.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('BirthDate', e.target.value)}
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
                      onChange={(e) => handleInputChange('Gender', e.target.value)}
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
                      onChange={(e) => handleInputChange('BloodType', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-primary-600 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رمز PIN
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="1990"
                      value={formData.PIN || '1990'}
                      onChange={(e) => handleInputChange('PIN', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-center font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('emergency.allergies')}
                  </label>
                  <input
                    type="text"
                    placeholder="بنسلين، أطعمة، لقاح..."
                    value={formData.Allergies || ''}
                    onChange={(e) => handleInputChange('Allergies', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-danger-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('emergency.contact_name')}
                    </label>
                    <input
                      type="text"
                      placeholder="اسم جهة الطوارئ"
                      value={formData.EmergencyContactName || ''}
                      onChange={(e) => handleInputChange('EmergencyContactName', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('emergency.contact_phone')}
                    </label>
                    <input
                      type="tel"
                      placeholder="+966500000000"
                      value={formData.EmergencyContactPhone || ''}
                      onChange={(e) => handleInputChange('EmergencyContactPhone', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              {t('common.cancel')}
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-extrabold shadow-md shadow-primary-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'ar' ? 'جاري الحفظ والرفع...' : 'Saving & Uploading...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditMode ? (lang === 'ar' ? 'حفظ التعديلات' : 'Update') : t('common.save')}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
