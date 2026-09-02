import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { addRecord, updateRecord } from '../../db/indexedDB';
import { driveService, getPlayableAudioUrl, getDriveDirectViewUrl } from '../../services/driveService';
import { symptomService } from '../../services/symptomService';
import { 
  Mic, MicOff, Square, Play, Pause, Save, 
  X, Activity, Clock, FileText, CheckCircle2, AlertCircle, Loader2, ExternalLink 
} from 'lucide-react';
import confetti from 'canvas-confetti';

// دالة الكشف عن صيغة الصوت المدعومة في المتصفح الحالي (iOS Safari & Android Chrome)
function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  const candidates = isIOS
    ? [
        'audio/mp4',
        'audio/aac',
        'audio/m4a',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/wav'
      ]
    : [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg',
        'audio/wav'
      ];

  for (const mime of candidates) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    } catch {}
  }
  return '';
}

export function VoiceRecorderModal({ isOpen, onClose, initialData = null, onSaved }) {
  const { lang, t } = useI18n();
  const { activePatient, activePatientId } = usePatient();
  const { user } = useAuth();

  const isEditMode = !!initialData;
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [severity, setSeverity] = useState(5);
  const [duration, setDuration] = useState('ساعتان');
  const [notes, setNotes] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioPlaybackFailed, setAudioPlaybackFailed] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recordError, setRecordError] = useState('');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTranscript(initialData.Description || '');
        setSeverity(initialData.Severity || 5);
        setDuration(initialData.Duration || (lang === 'ar' ? 'ساعتان' : '2 hours'));
        setNotes(initialData.Notes || '');
        setAudioUrl(initialData.AudioFileURL || initialData.audioUrl || '');
        audioBlobRef.current = null;
      } else {
        setTranscript('');
        setSeverity(5);
        setDuration(lang === 'ar' ? 'ساعتان' : '2 hours');
        setNotes('');
        setAudioUrl('');
        audioBlobRef.current = null;
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      setIsSaving(false);
      setRecordError('');

      // Check Speech Recognition support across standard and vendor prefixes
      const SpeechRecognition = 
        window.SpeechRecognition || 
        window.webkitSpeechRecognition || 
        window.mozSpeechRecognition || 
        window.msSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';

          recognition.onresult = (event) => {
            let currentText = '';
            for (let i = 0; i < event.results.length; i++) {
              currentText += event.results[i][0].transcript + ' ';
            }
            if (currentText.trim()) {
              setTranscript(currentText.trim());
            }
          };

          recognition.onerror = (event) => {
            console.warn('[VoiceRecorder] SpeechRecognition error:', event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              setSpeechSupported(false);
            }
          };

          recognitionRef.current = recognition;
          setSpeechSupported(true);
        } catch (initErr) {
          console.warn('[VoiceRecorder] SpeechRecognition init failed:', initErr);
          setSpeechSupported(false);
        }
      } else {
        setSpeechSupported(false);
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cleanupRecording();
    };
  }, [isOpen, lang, initialData]);

  // عداد مدة التسجيل
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording]);

  const cleanupRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch {}
      streamRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  if (!isOpen) return null;

  const startRecording = async () => {
    setRecordError('');
    audioChunksRef.current = [];
    audioBlobRef.current = null;
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(lang === 'ar' ? 'المتصفح الحالي لا يدعم تسجيل الصوت' : 'Audio recording is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const supportedMime = getSupportedAudioMimeType();
      const options = supportedMime ? { mimeType: supportedMime } : {};
      
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (mimeErr) {
        console.warn('[VoiceRecorder] Fallback to default MediaRecorder options:', mimeErr);
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || supportedMime || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        audioBlobRef.current = audioBlob;
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250); // Timeslice 250ms for chunk collection
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Start Speech Recognition if supported
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (recErr) {
          console.warn('[VoiceRecorder] SpeechRecognition start note:', recErr);
        }
      }
    } catch (err) {
      console.error('[VoiceRecorder] Error starting audio recording:', err);
      setIsRecording(false);
      let msg = lang === 'ar' ? 'تعذر الوصول إلى الميكروفون' : 'Microphone access denied';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = lang === 'ar' ? 'يرجى السماح بصلاحية الميكروفون في المتصفح لبدء التسجيل' : 'Please allow microphone access in your browser settings';
      }
      setRecordError(msg);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSaveSymptom = async () => {
    const hasText = !!(transcript.trim() || notes.trim());
    const hasAudio = !!(audioBlobRef.current || audioUrl);

    // إذا لم يكن هناك نص ولا تسجيل صوتي، نطلب أحدهما من المستخدم
    if (!hasText && !hasAudio) {
      alert(lang === 'ar' ? 'يرجى تسجيل الصوت أو كتابة وصف العرض الطبي أولاً' : 'Please record audio or provide a symptom description');
      return;
    }

    // إذا كان هناك تسجيل صوتي ولكن لم يتعرف المتصفح على الصوت كنص، نعتمد وصفاً تلقائياً ذكياً
    const finalDescription = transcript.trim() || notes.trim() || (
      lang === 'ar'
        ? `تسجيل صوتي للأعراض (${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})`
        : `Voice Symptom Recording (${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})`
    );

    setIsSaving(true);

    try {
      let finalAudioUrl = audioUrl || '';

      // رفع وحفظ التسجيل الصوتي إلى Google Drive الخاص بالمريض المحدد
      if (audioBlobRef.current) {
        try {
          const uploadRes = await driveService.uploadAudio({
            audioBlob: audioBlobRef.current,
            uid: user?.uid || 'General',
            patientId: activePatientId || 'P_01',
            patientName: activePatient?.Name || activePatient?.name || ''
          });

          if (uploadRes) {
            finalAudioUrl = uploadRes.downloadUrl || uploadRes.directUrl || uploadRes.driveUrl || '';
          }
        } catch (uploadErr) {
          console.error('[VoiceRecorder] Audio upload to Google Drive failed:', uploadErr);
          alert(lang === 'ar' ? `فشل رفع الصوت إلى Google Drive: ${uploadErr.message}` : `Audio Drive upload failed: ${uploadErr.message}`);
          setIsSaving(false);
          return;
        }
      }

      const symptomData = {
        uid: user?.uid || 'General',
        PatientID: activePatientId || 'P_01',
        Date: initialData?.Date || new Date().toISOString(),
        Description: finalDescription,
        Severity: Number(severity),
        AudioFileURL: finalAudioUrl,
        audioUrl: finalAudioUrl,
        Duration: duration,
        Notes: notes
      };

      if (isEditMode) {
        await updateRecord('symptoms', initialData.SymptomID, symptomData);
        try {
          await symptomService.updateSymptom(initialData.SymptomID, symptomData);
        } catch {}
      } else {
        const added = await addRecord('symptoms', symptomData);
        try {
          await symptomService.addSymptom(added);
        } catch {}
      }
      
      // إطلاق إشعار التحديث اللحظي لجميع شاشات التطبيق
      try {
        window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table: 'symptoms' } }));
      } catch {}

      try {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
      } catch {}

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving symptom:', err);
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getSeverityBadge = (val) => {
    if (val <= 3) return { text: t('symptoms.severity_levels.mild'), bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' };
    if (val <= 6) return { text: t('symptoms.severity_levels.moderate'), bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' };
    return { text: t('symptoms.severity_levels.severe'), bg: 'bg-danger-100 text-danger-800 dark:bg-danger-950/80 dark:text-danger-300' };
  };

  const sevBadge = getSeverityBadge(severity);

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
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {isEditMode ? (lang === 'ar' ? 'تعديل العرض الطبي' : 'Edit Symptom') : t('symptoms.title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('symptoms.voice_instruction')}
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Error Banner */}
          {recordError && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{recordError}</span>
            </div>
          )}

          {/* Voice Record Interaction Area */}
          <div className="text-center p-5 rounded-3xl bg-gradient-to-b from-slate-50 to-purple-50/30 dark:from-slate-800/50 dark:to-purple-950/20 border border-purple-100 dark:border-purple-900/30">
            
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center text-white transition-all shadow-xl active:scale-95 cursor-pointer ${
                isRecording
                  ? 'bg-danger-500 hover:bg-danger-600 shadow-danger-500/40 emergency-pulse ring-4 ring-danger-300 dark:ring-danger-900'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
              }`}
            >
              {isRecording ? (
                <Square className="w-7 h-7 fill-current" />
              ) : (
                <Mic className="w-7 h-7 sm:w-8 sm:h-8" />
              )}
            </button>

            <div className="mt-3 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                {isRecording && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                )}
                <p className={`text-xs font-black ${isRecording ? 'text-danger-600 dark:text-danger-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {isRecording ? (lang === 'ar' ? 'جاري التسجيل الصوتي...' : 'Recording audio...') : t('symptoms.start_recording')}
                </p>
              </div>

              {isRecording && (
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700">
                  {formatSeconds(recordingSeconds)}
                </span>
              )}
            </div>

            {/* Waveform Animation */}
            {isRecording && (
              <div className="flex items-center justify-center gap-1 mt-3 h-6">
                {[4, 8, 16, 24, 12, 28, 20, 14, 26, 8, 4].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-purple-500 rounded-full animate-waveform"
                    style={{ animationDelay: `${i * 0.1}s`, height: `${h}px` }}
                  />
                ))}
              </div>
            )}

            {/* Audio Playback */}
            {audioUrl && !isRecording && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-900">
                  <audio 
                    src={getPlayableAudioUrl(audioUrl)} 
                    controls 
                    preload="metadata"
                    onError={() => setAudioPlaybackFailed(true)}
                    onPlay={() => setAudioPlaybackFailed(false)}
                    className="h-8 max-w-full flex-1" 
                  />
                  {(getDriveDirectViewUrl(audioUrl) || audioUrl) && (
                    <a
                      href={getDriveDirectViewUrl(audioUrl) || audioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-colors shrink-0 shadow-sm"
                      title="فتح التسجيل الصوتي في نافذة جديدة"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'فتح في تبويب جديد' : 'Open in New Tab'}</span>
                    </a>
                  )}
                </div>

                {audioPlaybackFailed && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-[11px] font-bold flex items-center justify-between gap-2">
                    <span>تعذر تشغيل الصوت داخل المتصفح مباشرة.</span>
                    <a
                      href={getDriveDirectViewUrl(audioUrl) || audioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      اضغط للتشغيل الخارجي ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Speech-to-text notice for Safari/Firefox */}
            {!speechSupported && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                {lang === 'ar' 
                  ? '💡 التسجيل الصوتي يعمل بنجاح، ويمكنك كتابة وصف العرض أدناه.' 
                  : '💡 Audio recording is active; you can also type the description below.'}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('symptoms.description')} *
            </label>
            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder={lang === 'ar' ? 'صف العرض الطبي أو تحدث عبر الميكروفون أعلاه...' : 'Describe symptom or use mic above...'}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Severity Slider */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('symptoms.severity')}
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevBadge.bg}`}>
                  {sevBadge.text}
                </span>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {severity} / 10
                </span>
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          {/* Duration & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('symptoms.duration')}
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="مثال: ساعتان، 3 أيام"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات إضافية
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: بعد تناول وجبة دسمة"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          
          <button
            type="button"
            onClick={handleSaveSymptom}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ والرفع...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditMode ? (lang === 'ar' ? 'حفظ التعديل' : 'Update') : t('common.save')}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
