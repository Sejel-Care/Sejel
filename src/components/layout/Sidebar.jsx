import React from 'react';
import { useI18n } from '../../context/I18nContext';
import { usePatient } from '../../context/PatientContext';
import { useAuth } from '../../context/AuthContext';
import { Home, User, Stethoscope, Pill, Activity, Mic, Calendar, FileText, Settings, ShieldAlert, X, HeartPulse, LogOut } from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, onOpenEmergency, isMobileDrawerOpen, onCloseMobileDrawer, onOpenFamilyManagement }) {
  const { lang, t } = useI18n();
  const { activePatient } = usePatient();
  const { logout } = useAuth();

  const menuItems = [
    { icon: Home, label: t('nav.home'), tab: 'dashboard' },
    { icon: User, label: t('nav.profile'), tab: 'profile' },
    { icon: Stethoscope, label: t('nav.visits'), tab: 'visits' },
    { icon: Pill, label: t('nav.medications'), tab: 'medications' },
    { icon: Activity, label: t('nav.vitals'), tab: 'vitals' },
    { icon: Mic, label: t('nav.symptoms'), tab: 'symptoms' },
    { icon: Calendar, label: t('nav.appointments'), tab: 'appointments' },
    { icon: FileText, label: t('nav.documents'), tab: 'documents' },
    { icon: Settings, label: t('nav.settings'), tab: 'settings' },
  ];

  return (
    <div className={`fixed inset-0 z-[1000] lg:static lg:z-auto transition-all duration-300 ${isMobileDrawerOpen ? 'visible' : 'invisible lg:visible'}`}>
      <div onClick={onCloseMobileDrawer} className={`absolute inset-0 bg-black/50 lg:hidden ${isMobileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`} />

      {/* القائمة تبدأ من تحت الهامبرغر (top-16) وتمتد للأسفل */}
      <div className={`absolute left-0 top-16 h-[calc(100vh-4rem)] w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl flex flex-col transform transition-transform duration-300 ${isMobileDrawerOpen ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0'}`}>

        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-9 h-9 shrink-0">
              <img src="/icons/icon-192.png" alt="شعار سجل" className="w-full h-full object-contain rounded-xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-tr from-primary-600 to-primary-400 rounded-xl text-white">
                <HeartPulse className="w-5 h-5" />
              </div>
            </div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">{t('app.name')}</span>
          </div>
          <button onClick={onCloseMobileDrawer} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {activePatient && (
          <div className="p-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-black">{activePatient.Name.charAt(0)}</div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{activePatient.Name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">+{activePatient.BloodType || 'O+'}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => { setActiveTab(item.tab); onCloseMobileDrawer(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === item.tab ? 'bg-primary-500 text-white shadow-md' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <button onClick={onOpenEmergency} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-danger-500 hover:bg-danger-600 text-white text-sm font-bold">
            <ShieldAlert className="w-5 h-5" />
            {t('emergency.sos_btn')}
          </button>
          <button
            onClick={async () => { await logout(); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold"
          >
            <LogOut className="w-5 h-5" />
            {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}