import React from 'react';
import { ExternalLink, Landmark } from 'lucide-react';

/**
 * روابط رسمية لوزارة التربية والتعليم المصرية.
 * كل الروابط اتأكد منها من نتائج البحث/موقع الوزارة (مفيش رابط متخمّن).
 * بتفتح في تاب جديد — التطبيق مش بيسحب أي محتوى من مواقع الوزارة.
 */
export const MINISTRY_LINKS = [
  { id: 'moe', url: 'https://moe.gov.eg', ar: 'موقع وزارة التربية والتعليم', en: 'Ministry of Education website' },
  { id: 'platforms', url: 'https://moe.gov.eg/en', ar: 'المنصات التعليمية', en: 'Educational platforms' },
  { id: 'important', url: 'https://moe.gov.eg/en/importantLinks', ar: 'روابط مهمة (نتائج، تقديم، مواصفات الامتحانات)', en: 'Important links (results, applications, exam specs)' },
  { id: 'study', url: 'https://study.ekb.eg', ar: 'المكتبة الرقمية (study.ekb.eg)', en: 'Digital library (study.ekb.eg)' },
  { id: 'ekb', url: 'https://www.ekb.eg', ar: 'بنك المعرفة المصري', en: 'Egyptian Knowledge Bank' }
] as const;

export const MinistryLinks: React.FC<{ isArabic: boolean }> = ({ isArabic }) => (
  <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
    <div className="flex items-center gap-2 font-bold text-white text-sm">
      <Landmark className="w-4 h-4 text-brand-blue-electric" />
      <span>{isArabic ? 'روابط وزارة التربية والتعليم' : 'Ministry of Education links'}</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {MINISTRY_LINKS.map(link => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/70 border border-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:border-brand-blue/50 hover:text-white transition-colors"
        >
          <span>{isArabic ? link.ar : link.en}</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        </a>
      ))}
    </div>
  </div>
);
