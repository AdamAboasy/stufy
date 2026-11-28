import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** زر «ثبّت التطبيق» — بيظهر بس لما المتصفح يسمح بالتثبيت فعلاً */
export const InstallPrompt: React.FC<{ isArabic: boolean }> = ({ isArabic }) => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred || hidden) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 inset-x-4 md:inset-x-auto md:end-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur">
      <Download className="w-5 h-5 text-brand-blue-electric shrink-0" />
      <span className="text-xs font-semibold text-slate-200">
        {isArabic ? 'ثبّت التطبيق على جهازك' : 'Install the app on your device'}
      </span>
      <button
        onClick={install}
        className="rounded-xl bg-brand-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-blue-dark"
      >
        {isArabic ? 'تثبيت' : 'Install'}
      </button>
      <button
        onClick={() => setHidden(true)}
        aria-label={isArabic ? 'إغلاق' : 'Dismiss'}
        className="rounded-lg p-1 text-slate-400 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
