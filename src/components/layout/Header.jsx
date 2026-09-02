import React, { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, ShieldAlert, Lock, RefreshCw, Globe, 
  Wifi, WifiOff, Plus, Moon, Sun, HeartPulse, ChevronDown, 
  Menu, UserCog, Settings as SettingsIcon, LogOut 
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
    <header className="sticky top-0 z-30 glass-nav border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 w-full overflow-hidden">
        <div className="flex items-center justify-between h-16 gap-1.5 sm:gap-2 max-w-full">
          
          {/* Mobile Hamburger & Logo */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0 shrink">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={onToggleMobileDrawer}
              className="md:hidden p-1.5 rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="القائمة الجانبية"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20 shrink-0">
              <HeartPulse className="w-4 h-4 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900 dark:text-white truncate">
                  {t('app.name')}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 shrink-0 hidden xs:inline-block">
                  PWA
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                {t('app.tagline')}
              </p>
            </div>
          </div>

          {/* Center / Family Patient Selector Dropdown */}
          <div className="relative shrink min-w-0">
            <button
              onClick={() => setShowPatientMenu(!showPatientMenu)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all text-xs sm:text-sm font-medium max-w-[130px] xs:max-w-[180px] sm:max-w-[220px]"
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-primary-400 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                  {activePatient ? activePatient.Name.charAt(0) : 'P'}
                </div>
              )}
              <span className="truncate text-slate-800 dark:text-white font-bold text-xs sm:text-sm">
                {activePatient ? activePatient.Name : t('family.switch_patient')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            </button>

            {/* Patient Dropdown Menu */}
            {showPatientMenu && (
              <div 
                className="absolute top-full mt-2 w-72 max-w-[90vw] rounded-3xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 p-2.5 z-50 animate-fade-in ltr:left-0 rtl:right-0 overflow-hidden"
                onClick={() => setShowPatientMenu(false)}
              >
                {/* Logged in Google User Info */}
                {user && (
                  <div className="p-2.5 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700 flex items-center gap-2.5 overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-9 h-9 rounded-full object-cover shrink-0 border border-primary-500" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary-500 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {user.displayName ? user.displayName.charAt(0) : 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
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
                      onClick={() => switchPatient(p.PatientID)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors text-right rtl:text-right ltr:text-left ${
                        p.PatientID === activePatientId
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

                {/* Management and Add Actions inside Dropdown */}
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

                  {/* Sign Out Button */}
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

          {/* Right Action Icons & Badges */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            
            {/* Sync Status Badge / Button */}
            <button
              onClick={() => triggerSync()}
              title={isOnline ? (isSyncing ? t('common.loading') : t('settings.sync_now')) : t('app.offline_badge')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                !isOnline
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400'
                  : pendingCount > 0
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden lg:inline">
                {!isOnline ? t('app.offline_badge') : isSyncing ? t('common.loading') : pendingCount > 0 ? `${pendingCount} معلق` : t('app.online_badge')}
              </span>
            </button>

            {/* Emergency SOS Button */}
            <button
              onClick={onOpenEmergency}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-danger-500 hover:bg-danger-600 text-white text-xs font-bold shadow-md shadow-danger-500/25 transition-all emergency-pulse"
              title="بطاقة الطوارئ الطبية الفورية"
            >
              <ShieldAlert className="w-4 h-4" />
              <span className="hidden sm:inline">{t('emergency.sos_btn')}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? t('settings.light') : t('settings.dark')}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Dynamic Language Toggle Button */}
            <button
              onClick={toggleLang}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              title={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
            >
              {lang === 'ar' ? 'English' : 'عربي'}
            </button>

            {/* PIN Lock Trigger */}
            <button
              onClick={lock}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t('security.lock_now')}
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
