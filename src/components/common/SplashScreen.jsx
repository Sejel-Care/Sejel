import React, { useState, useEffect } from 'react';
import { HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';

export function SplashScreen({ onFinish, minDuration = 2200 }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade-out slightly before finishing
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, minDuration - 400);

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, minDuration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [minDuration, onFinish]);

  const handleFastSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onFinish) onFinish();
    }, 200);
  };

  return (
    <div
      onClick={handleFastSkip}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white select-none transition-all duration-500 cursor-pointer overflow-hidden ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top spacer */}
      <div className="w-full flex justify-end pt-safe">
        <span className="text-[11px] font-bold text-slate-400 bg-slate-800/60 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/50">
          تخطي الشاشة ⇥
        </span>
      </div>

      {/* Center Hero / Logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-sm px-4">
        
        {/* Animated App Icon Shield */}
        <div className="relative group">
          {/* Glowing Ring */}
          <div className="absolute -inset-2 bg-gradient-to-r from-primary-500 via-cyan-400 to-emerald-500 rounded-[32px] blur-lg opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
          
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] bg-gradient-to-tr from-primary-600 via-primary-500 to-cyan-500 p-0.5 shadow-2xl flex items-center justify-center">
            <div className="w-full h-full rounded-[26px] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white relative overflow-hidden">
              
              {/* Inner cross & heartbeat icon */}
              <div className="relative flex items-center justify-center">
                <HeartPulse className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] animate-bounce" />
              </div>

              {/* Heart dot accent */}
              <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            </div>
          </div>
        </div>

        {/* Brand Names & Titles */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-primary-200 bg-clip-text text-transparent">
              سِجِل
            </h1>
            <span className="text-xs font-black tracking-widest px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-300 border border-primary-500/30">
              PRO
            </span>
          </div>

          <p className="text-xs font-extrabold tracking-widest text-primary-400 font-mono uppercase">
            SEJEL HEALTH
          </p>

          <p className="text-sm font-medium text-slate-300 max-w-xs leading-relaxed pt-1">
            سجلك الطبي الشخصي والعائلي الذكي
          </p>
        </div>

        {/* Animated ECG Heartbeat Waveform Line */}
        <div className="w-48 h-8 flex items-center justify-center opacity-80">
          <svg viewBox="0 0 200 40" className="w-full h-full text-cyan-400 stroke-current fill-none stroke-2">
            <path
              d="M 0 20 L 50 20 L 65 5 L 80 35 L 95 10 L 110 28 L 125 20 L 200 20"
              strokeDasharray="200"
              strokeDashoffset="0"
              className="animate-pulse"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

      </div>

      {/* Footer Info / Loading State */}
      <div className="flex flex-col items-center gap-2 pb-safe text-center">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>جاري تهيئة الملف الطبي الذكي...</span>
        </div>
        
        <p className="text-[10px] text-slate-500 font-mono">
          إصدار PWA المستقل • مشفر وآمن بالكامل
        </p>
      </div>

    </div>
  );
}

export default SplashScreen;
