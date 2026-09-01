import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { 
  Home, User, FileText, Stethoscope, Pill, 
  Activity, Mic, Calendar, Settings, ShieldAlert, HeartPulse, X, Users 
} from 'lucide-react';

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  onOpenEmergency, 
  isMobileDrawerOpen, 
  onCloseMobileDrawer,
  onOpenFamilyManagement
}) {
  const { lang, t } = useI18n();
  const { activePatient } = usePatient();

  const navItems = [
    { id: 'dashboard', label: t('nav.home'), icon: Home },
    { id: 'profile', label: t('nav.profile'), icon: User },
    { id: 'visits', label: t('nav.visits'), icon: Stethoscope },
    { id: 'medications', label: t('nav.medications'), icon: Pill },
    { id: 'vitals', label: t('nav.vitals'), icon: Activity },
    { id: 'symptoms', label: t('nav.symptoms'), icon: Mic },
    { id: 'appointments', label: t('nav.appointments'), icon: Calendar },
    { id: 'documents', label: t('nav.documents'), icon: FileText },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full p-4">
      
      {/* Mobile Drawer Header with Close Button */}
      <div className="md:hidden flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black text-sm">
            س
          </div>
          <span className="font-extrabold text-base text-slate-900 dark:text-white">
            {t('app.name')}
          </span>
        </div>
        <button
          onClick={onCloseMobileDrawer}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Patient Mini Card */}
      {activePatient && (
        <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/60 dark:from-slate-800 dark:to-slate-800/80 border border-primary-100 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                {activePatient.Name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {activePatient.Name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                  {activePatient.Gender === 'Male' ? t('profile.male') : t('profile.female')} • {activePatient.BloodType || 'O+'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (onCloseMobileDrawer) onCloseMobileDrawer();
                onOpenFamilyManagement();
              }}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 hover:bg-primary-50 shadow-xs shrink-0"
              title="إدارة العائلة"
            >
              <Users className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all text-right rtl:text-right ltr:text-left ${
                isActive
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Emergency SOS Quick Button */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800">
        <button
          onClick={() => {
            if (onCloseMobileDrawer) onCloseMobileDrawer();
            onOpenEmergency();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-danger-500 hover:bg-danger-600 text-white font-extrabold text-xs shadow-lg shadow-danger-500/25 transition-all emergency-pulse active:scale-95"
        >
          <ShieldAlert className="w-5 h-5" />
          <span>{t('emergency.title')}</span>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r ltr:border-r rtl:border-l border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0 h-[calc(100vh-4rem)] sticky top-16 no-print">
        {sidebarContent}
      </aside>

      {/* 2. Mobile Slide-in Drawer with Backdrop */}
      {isMobileDrawerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in no-print"
          onClick={onCloseMobileDrawer}
        >
          <div 
            className="fixed top-0 bottom-0 rtl:right-0 ltr:left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 animate-slide-up flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
