import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { 
  HeartPulse, ShieldCheck, Cloud, HardDrive, 
  Lock, CheckCircle2, AlertCircle, Loader2, Sparkles, Globe 
} from 'lucide-react';

export function LoginScreen() {
  const { signInWithGoogle, authLoading, authError } = useAuth();
  const { lang, toggleLang, t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden transition-colors selection:bg-primary-500 selection:text-white">
      
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/15 dark:bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/15 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Language Switcher */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
              {t('app.name')}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 ml-2 rtl:mr-2">
              Cloud + Drive
            </span>
          </div>
        </div>

        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
        </button>
      </header>

      {/* Main Center Card */}
      <main className="w-full max-w-md mx-auto px-4 py-8 z-10 flex-1 flex flex-col justify-center">
        <div className="p-7 sm:p-9 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-900/5 space-y-6 text-center animate-fade-in">
          
          {/* Logo & Headline */}
          <div className="space-y-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-primary-600 via-primary-500 to-cyan-400 text-white flex items-center justify-center shadow-xl shadow-primary-500/30">
              <HeartPulse className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight pt-2">
              {lang === 'ar' ? 'مرحباً بك في سِجِل' : 'Welcome to Sejel'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
              {lang === 'ar' 
                ? 'سجلك الطبي والشخصي الذكي مع تخزين مباشر لملفاتك وتفريرك في Google Drive الخاص بك'
                : 'Smart personal health record with direct file storage in your own Google Drive'}
            </p>
          </div>

          {/* Value Highlights */}
          <div className="grid grid-cols-1 gap-2.5 text-right rtl:text-right ltr:text-left text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'ar' ? 'تخزين على حسابك الخاص' : 'Stored in Your Personal Drive'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Sejel/{'{uid}'}/Documents & Audio
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'ar' ? 'خصوصية وعزل تام' : 'Isolated App Privacy'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {lang === 'ar' ? 'وصول فقط لملفات التطبيق بدون المساس بملفاتك الأخرى' : 'Access only to files created by Sejel'}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message if any */}
          {authError && (
            <div className="p-3.5 rounded-2xl bg-danger-50 dark:bg-danger-950/60 border border-danger-200 dark:border-danger-900/60 text-danger-700 dark:text-danger-300 text-xs font-bold flex items-center gap-2 animate-fade-in text-right rtl:text-right ltr:text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-danger-500" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="pt-2">
            <button
              onClick={signInWithGoogle}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-extrabold text-sm border border-slate-300 dark:border-slate-700 shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  <span>{lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  {/* Google 'G' Official Colored SVG Logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{lang === 'ar' ? 'تسجيل الدخول باستخدام Google' : 'Sign in with Google'}</span>
                </>
              )}
            </button>
          </div>

          {/* Privacy Note */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
            {lang === 'ar'
              ? 'بالتسجيل، سيتم إنشاء مجلد آمن في Google Drive خاصتك لحفظ ملفاتك وتقاريرك الطبية.'
              : 'By signing in, a secure folder will be created in your Google Drive for your medical files.'}
          </p>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-slate-400 dark:text-slate-600 z-10">
        <p>© 2026 {t('app.name')} - {t('app.tagline')}</p>
      </footer>

    </div>
  );
}
