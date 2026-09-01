import React, { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { 
  Home, Stethoscope, Pill, FileText, MoreHorizontal, 
  User, Activity, Mic, Calendar, Settings, X, ShieldAlert, Users 
} from 'lucide-react';

export function BottomNav({ 
  activeTab, 
  setActiveTab, 
  onOpenEmergency, 
  onOpenVoiceModal,
  onOpenFamilyManagement 
}) {
  const { lang, t } = useI18n();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 5 Main Tabs for Mobile Bottom Navigation
  const mainTabs = [
    { id: 'dashboard', label: t('nav.home'), icon: Home },
    { id: 'visits', label: t('nav.visits'), icon: Stethoscope },
    { id: 'medications', label: t('nav.medications'), icon: Pill },
    { id: 'documents', label: t('nav.documents'), icon: FileText },
  ];

  // Secondary items in "More" Drawer
  const moreItems = [
    { id: 'profile', label: t('nav.profile'), icon: User, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/60' },
    { id: 'vitals', label: t('nav.vitals'), icon: Activity, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/60' },
    { id: 'symptoms', label: t('nav.symptoms'), icon: Mic, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/60' },
    { id: 'appointments', label: t('nav.appointments'), icon: Calendar, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/60' },
    { id: 'family', label: lang === 'ar' ? 'العائلة' : 'Family', icon: Users, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/60', isAction: true },
    { id: 'settings', label: t('nav.settings'), icon: Settings, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
  ];

  const handleSelectTab = (item) => {
    if (item.isAction && item.id === 'family') {
      setShowMoreMenu(false);
      if (onOpenFamilyManagement) onOpenFamilyManagement();
      return;
    }
    setActiveTab(item.id || item);
    setShowMoreMenu(false);
  };

  const isMoreActive = ['profile', 'vitals', 'symptoms', 'appointments', 'settings'].includes(activeTab);

  return (
    <>
      {/* More Menu Bottom Sheet / Drawer */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden animate-fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="fixed bottom-16 inset-x-3 max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {t('nav.more')}
              </span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => {
                const Icon = item.icon;
                const isItemActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item)}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all ${
                      isItemActive 
                        ? 'bg-primary-50 dark:bg-primary-950/80 border-2 border-primary-500 shadow-sm'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions from Bottom Drawer */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenEmergency();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-danger-500 text-white text-xs font-extrabold shadow-md shadow-danger-500/20 active:scale-95"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{t('emergency.sos_btn')}</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onOpenVoiceModal();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-600 text-white text-xs font-extrabold shadow-md shadow-purple-600/20 active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>{t('symptoms.record_btn')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 glass-nav border-t border-slate-200/80 dark:border-slate-800 md:hidden pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center h-full relative transition-all ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400 font-extrabold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute top-1 w-8 h-1 rounded-full bg-primary-500 animate-fade-in" />
                )}
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-primary-600 dark:text-primary-400' : ''}`} />
                <span className="text-[10px] mt-1 truncate max-w-[56px]">
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More Drawer Trigger */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center h-full relative transition-all ${
              isMoreActive || showMoreMenu
                ? 'text-primary-600 dark:text-primary-400 font-extrabold'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            {isMoreActive && (
              <span className="absolute top-1 w-8 h-1 rounded-full bg-primary-500 animate-fade-in" />
            )}
            <MoreHorizontal className={`w-5 h-5 transition-transform ${isMoreActive ? 'scale-110 text-primary-600 dark:text-primary-400' : ''}`} />
            <span className="text-[10px] mt-1 truncate">
              {t('nav.more')}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
