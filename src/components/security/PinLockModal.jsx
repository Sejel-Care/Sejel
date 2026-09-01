import React, { useState, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { usePatient } from '../../context/PatientContext';
import { Lock, Unlock, KeyRound, Delete, Fingerprint, ShieldCheck, AlertCircle } from 'lucide-react';

export function PinLockModal() {
  const { t } = useI18n();
  const { isLocked, unlock, pinCode } = useAuth();
  const { activePatient } = usePatient();

  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showBirthYearHint, setShowBirthYearHint] = useState(false);

  useEffect(() => {
    if (isLocked) {
      setPin('');
      setIsError(false);
      setErrorMessage('');
    }
  }, [isLocked]);

  if (!isLocked) return null;

  const handleDigit = (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setIsError(false);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleClear = () => {
    setPin('');
    setIsError(false);
  };

  const verifyPin = (candidatePin) => {
    const birthYear = activePatient && activePatient.BirthDate ? activePatient.BirthDate.substring(0, 4) : '1990';
    const res = unlock(candidatePin, birthYear);
    
    if (!res.success) {
      setIsError(true);
      setErrorMessage(t('security.wrong_pin'));
      setTimeout(() => {
        setPin('');
      }, 400);
    }
  };

  const handleBiometricUnlock = () => {
    // محاكاة فتح القفل بالبصمة الحيوية
    const birthYear = activePatient && activePatient.BirthDate ? activePatient.BirthDate.substring(0, 4) : '1990';
    unlock(pinCode || birthYear, birthYear);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
        
        {/* Lock Icon Header */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
          {t('app.name')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          {t('security.enter_pin')}
        </p>

        {/* PIN Indicators (4 Dots) */}
        <div className={`flex justify-center items-center gap-4 mb-6 ${isError ? 'animate-bounce' : ''}`}>
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-primary-500 scale-125 shadow-md shadow-primary-500/40'
                  : 'bg-slate-200 dark:bg-slate-700'
              } ${isError ? 'bg-danger-500 ring-2 ring-danger-300' : ''}`}
            />
          ))}
        </div>

        {/* Error Notification */}
        {isError && (
          <div className="flex items-center justify-center gap-1 text-danger-500 text-xs font-semibold mb-4 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMessage || t('security.wrong_pin')}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto mb-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(String(num))}
              className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-white font-bold text-xl transition-all shadow-sm flex items-center justify-center"
            >
              {num}
            </button>
          ))}

          {/* Biometric Button */}
          <button
            onClick={handleBiometricUnlock}
            title="بصمة الإصبع / الوجه"
            className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-primary-500 active:scale-95 transition-all flex items-center justify-center"
          >
            <Fingerprint className="w-6 h-6" />
          </button>

          {/* 0 Button */}
          <button
            onClick={() => handleDigit('0')}
            className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-white font-bold text-xl transition-all shadow-sm flex items-center justify-center"
          >
            0
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            title="حذف"
            className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-400 transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Forgot PIN / Birth Year Fallback */}
        <div className="pt-2">
          <button
            onClick={() => {
              const birthYear = activePatient && activePatient.BirthDate ? activePatient.BirthDate.substring(0, 4) : '1990';
              setPin(birthYear);
              verifyPin(birthYear);
            }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-semibold"
          >
            {t('security.forgot_pin')}
          </button>
        </div>

      </div>
    </div>
  );
}
