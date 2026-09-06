import React, { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert, Lock, RefreshCw, Wifi, WifiOff, Plus, Moon, Sun, HeartPulse, ChevronDown,
  Menu, UserCog, LogOut
} from 'lucide-react';

export function Header({
  onOpenEmergency,
  onOpenAddPatient,
  onOpenFamilyManagement,
  onToggleMobileDrawer
}) {
  const { lang, t, toggleLang } = useI18n();
  const { patients, activePatient, activePatientId, switchPatient } = usePatient();
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();
  const { lock, user, logout } = useAuth();

  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sejel_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sejel_theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-[999] glass-nav border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 h-16">

          {/* مجموعة اليسار: الهامبرغر + الشعار */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleMobileDrawer}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="القائمة الجانبية"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
              <img
                src="/icons/icon-192.png"
                alt="شعار سجل"
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-tr from-primary-600 to-primary-400 rounded-lg text-white">
                <HeartPulse className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
            </div>
            <span className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900 dark:text-white hidden sm:inline-block">
              {t('app.name')}
            </span>
          </div>

          {/* مجموعة المنتصف: اسم المريض - مساحة أصغر على الموبايل عشان تسيب فاصل واضح مع الأيقونات */}
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="relative min-w-0">
              <button
                onClick={() => setShowPatientMenu(!showPatientMenu)}
                className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all text-xs sm:text-sm font-medium max-w-[96px] sm:max-w-[220px]"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                  {activePatient ? activePatient.Name.charAt(0) : 'P'}
                </div>
                <span className="truncate text-slate-800 dark:text-white font-bold text-xs sm:text-sm">
                  {activePatient ? activePatient.Name : t('family.switch_patient')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              </button>

              {/* القائمة دلوقتي مثبتة بالنسبة للشاشة (fixed) مش معلقة على الزرار - عشان متطلعش بره الشاشة أبداً */}
              {showPatientMenu && (
                <div
                  className="fixed top-[4.5rem] inset-x-3 sm:inset-x-auto sm:left-auto sm:right-6 sm:w-72 mx-auto rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 p-2.5 z-[1000] animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  {user && (
                    <div className="p-2.5 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700 flex items-center gap-2.5">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-9 h-9 rounded-full object-cover shrink-0 border border-primary-500" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary-500 text-white font-black text-sm flex items-center justify-center shrink-0">
                          {user.displayName ? user.displayName.charAt(0) : 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {user.displayName || 'Google User'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-300 font-mono truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>{t('family.switch_patient')}</span>
                    <span className="text-[10px] font-mono">{patients.length} أفراد</span>
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto mt-1">
                    {patients.map(p => (
                      <button
                        key={p.PatientID}
                        onClick={() => {
                          switchPatient(p.PatientID);
                          setShowPatientMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors text-right rtl:text-right ltr:text-left ${p.PatientID === activePatientId
                          ? 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-extrabold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium'
                          }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {p.Name.charAt(0)}
                          </div>
                          <span className="truncate">{p.Name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono font-bold">
                          {p.BloodType || 'O+'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPatientMenu(false);
                        onOpenFamilyManagement();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
                    >
                      <UserCog className="w-4 h-4 text-primary-500" />
                      <span>إدارة العائلة</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPatientMenu(false);
                        onOpenAddPatient();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('family.add_member')}</span>
                    </button>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowPatientMenu(false);
                        await logout();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* مجموعة اليمين: مزامنة، طوارئ، وضع ليلي، قفل - وبعدين اللغة على الشاشات الكبيرة بس */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={() => triggerSync()} className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="مزامنة">
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </button>
            <button onClick={onOpenEmergency} className="p-2 rounded-xl bg-danger-500 hover:bg-danger-600 text-white" title="طوارئ">
              <ShieldAlert className="w-4 h-4" />
            </button>
            <button onClick={toggleDarkMode} className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={lock} className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="قفل">
              <Lock className="w-4 h-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              <button onClick={toggleLang} className="px-2 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                {lang === 'ar' ? 'EN' : 'ع'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}