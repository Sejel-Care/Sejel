import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { 
  X, ExternalLink, Download, FileText, Image as ImageIcon, 
  Loader2, AlertCircle, RefreshCw, Eye 
} from 'lucide-react';

/**
 * ==============================================================================
 * سِجِل (Sejel) - نافذة معاينة المستندات وملفات PDF والصور الطبية
 * DocumentPreviewModal.jsx - Cross-Browser PDF & Document Viewer with Smart Fallbacks
 * ==============================================================================
 */

export function DocumentPreviewModal({ isOpen, onClose, file }) {
  const { lang, t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && file) {
      setIsLoading(true);
      setHasError(false);

      // Auto fallback if iframe loading takes more than 4 seconds
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  // استخراج ID الملف من Google Drive إذا وُجد
  const extractDriveId = (url = '') => {
    if (!url) return null;
    const matchView = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const matchLh3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchView) return matchView[1];
    if (matchId) return matchId[1];
    if (matchLh3) return matchLh3[1];
    return null;
  };

  const driveId = file.DriveFileID || extractDriveId(file.DriveURL) || extractDriveId(file.DownloadURL) || extractDriveId(file.FileUrl);

  // تحديد رابط المعاينة الأمثل
  // لتجنب 403 Forbidden نستخدم دائماً رابط المعاينة الرسمي: https://drive.google.com/file/d/{fileId}/preview
  let previewUrl = '';
  if (driveId) {
    previewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
  } else if (file.PreviewURL) {
    previewUrl = file.PreviewURL;
  } else if (file.localBlobUrl) {
    previewUrl = file.localBlobUrl;
  } else if (file.DownloadURL) {
    previewUrl = file.DownloadURL;
  } else if (file.FileUrl) {
    previewUrl = file.FileUrl;
  } else if (file.DriveURL) {
    previewUrl = file.DriveURL;
  }

  // رابط التنزيل المباشر أو الفتح الخارجي
  const downloadUrl = file.DownloadURL || (driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : previewUrl);
  const directOpenUrl = file.DriveURL || (driveId ? `https://drive.google.com/file/d/${driveId}/view` : previewUrl);
  const imageDisplayUrl = driveId ? `https://lh3.googleusercontent.com/d/${driveId}` : (file.localBlobUrl || previewUrl);

  const isImage = file.FileType === 'Image' || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.FileName || '');
  const isPdf = file.FileType === 'PDF' || (file.FileName || '').toLowerCase().endsWith('.pdf');

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col cursor-default"
      >
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 shrink-0">
              {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {file.FileName}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold">
                  {file.Category || 'Other'}
                </span>
                <span className="font-mono">{file.FileType || (isPdf ? 'PDF' : 'Document')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Open in new tab */}
            {directOpenUrl && (
              <a
                href={directOpenUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                title="فتح في نافذة جديدة"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'نافذة جديدة' : 'New Tab'}</span>
              </a>
            )}

            {/* Download */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={file.FileName}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-xs transition-all"
                title="تنزيل الملف"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'تنزيل' : 'Download'}</span>
              </a>
            )}

            {/* Clear Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title={lang === 'ar' ? 'إغلاق المعاينة' : 'Close Preview'}
            >
              <X className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إغلاق' : 'Close'}</span>
            </button>
          </div>
        </div>

        {/* Preview Viewport */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center p-2 sm:p-4">
          
          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs gap-3">
              <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {lang === 'ar' ? 'جاري تجهيز وتحميل المعاينة...' : 'Loading document preview...'}
              </p>
            </div>
          )}

          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={imageDisplayUrl}
                alt={file.FileName}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-md"
              />
            </div>
          ) : (
            <div className="w-full h-full relative rounded-2xl overflow-hidden bg-white shadow-inner">
              <iframe
                src={previewUrl}
                title={file.FileName}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                className="w-full h-full border-0 rounded-2xl"
                allow="autoplay"
              />
            </div>
          )}

          {/* Error / Fallback Card if preview is blocked */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تعذر تضمين المعاينة مباشرة في المتصفح' : 'Direct embedded preview unavailable'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ar'
                    ? 'يمكنك فتح الملف مباشرة أو تنزيله على جهازك للاطلاع عليه فوراً.'
                    : 'You can open this document directly in a new window or download it.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={directOpenUrl || downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-md shadow-cyan-600/20"
                >
                  <Eye className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'فتح المستند مباشرة' : 'Open Document'}</span>
                </a>

                <a
                  href={downloadUrl}
                  download={file.FileName}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تنزيل' : 'Download'}</span>
                </a>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {lang === 'ar' ? 'انقر خارج النافذة أو زر الإغلاق للعودة' : 'Click outside or close button to return'}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق المعاينة' : 'Close Preview'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default DocumentPreviewModal;
