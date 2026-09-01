import React, { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import { usePatient } from '../context/PatientContext';
import { db, deleteRecord } from '../db/indexedDB';
import { formatDate } from '../utils/dateUtils';
import { DocumentPreviewModal } from '../components/common/DocumentPreviewModal';
import { 
  FileText, UploadCloud, Plus, ExternalLink, Download, 
  Trash2, Filter, Image, FileCode, CheckCircle2, Edit3, Eye 
} from 'lucide-react';

export function Documents({ onOpenAddModal, onEditDocument }) {
  const { lang, t } = useI18n();
  const { activePatientId, dataVersion } = usePatient();

  const [files, setFiles] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewFile, setPreviewFile] = useState(null);

  const loadFiles = async () => {
    if (!activePatientId) return;
    const list = await db.files.where('PatientID').equals(activePatientId).reverse().sortBy('UploadedAt');
    setFiles(list || []);
  };

  useEffect(() => {
    loadFiles();
    const handleDataChanged = () => loadFiles();
    window.addEventListener('sejel:data-changed', handleDataChanged);
    return () => window.removeEventListener('sejel:data-changed', handleDataChanged);
  }, [activePatientId, dataVersion]);

  const handleDelete = async (file) => {
    const confirmMsg = lang === 'ar' 
      ? `هل أنت متأكد من حذف مستند "${file.FileName}"؟` 
      : `Are you sure you want to delete "${file.FileName}"?`;

    if (window.confirm(confirmMsg)) {
      await deleteRecord('files', file.FileID);
      loadFiles();
    }
  };

  const categories = [
    { id: 'All', label: lang === 'ar' ? 'الكل' : 'All' },
    { id: 'Prescription', label: t('documents.categories.Prescription') },
    { id: 'Lab', label: t('documents.categories.Lab') },
    { id: 'Radiology', label: t('documents.categories.Radiology') },
    { id: 'Report', label: t('documents.categories.Report') },
    { id: 'Vaccination', label: t('documents.categories.Vaccination') },
    { id: 'Other', label: t('documents.categories.Other') },
  ];

  const filteredFiles = selectedCategory === 'All'
    ? files
    : files.filter(f => f.Category === selectedCategory);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-16 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('documents.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            أرشيف الروشتات والتحاليل والأشعة الطبية المرفوعة على Google Drive
          </p>
        </div>

        <button
          onClick={() => onOpenAddModal('document')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-cyan-600/20 transition-all active:scale-95 shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{t('documents.upload_btn')}</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredFiles.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {lang === 'ar' 
                ? 'لا توجد مستندات مرفوعة. ارفع روشتتك الأولى.' 
                : 'No documents uploaded yet. Click + to upload your first document.'}
            </p>
            <button
              onClick={() => onOpenAddModal('document')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t('documents.upload_btn')}</span>
            </button>
          </div>
        ) : (
          filteredFiles.map(file => (
            <div
              key={file.FileID}
              className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm hover:border-cyan-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div 
                  onClick={() => setPreviewFile(file)}
                  className="flex items-center gap-2.5 truncate cursor-pointer flex-1"
                >
                  <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {file.FileType || 'PDF'}
                  </div>
                  <div className="truncate">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate hover:text-cyan-600 transition-colors">
                      {file.FileName}
                    </h3>
                    <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
                      {t(`documents.categories.${file.Category}`) || file.Category}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-1.5 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400 hover:bg-cyan-100 transition-colors"
                    title="معاينة"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEditDocument(file)}
                    className="p-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-1.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-mono text-[10px]">
                  {formatDate(file.UploadedAt, lang)}
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'معاينة المستند' : 'Preview Document'}</span>
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Document & PDF Preview Modal */}
      {previewFile && (
        <DocumentPreviewModal
          isOpen={!!previewFile}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

    </div>
  );
}
