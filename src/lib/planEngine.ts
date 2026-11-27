/**
 * أدوات مشتركة للخطة (تقدّم + تنسيق التواريخ)
 * ============================================================
 * محرك بناء الخطة بقى في `curriculumPlanner.ts` (توزيع على أبواب المنهج)،
 * والملف ده بيفضل فيه الأدوات اللي بتُستخدم في الواجهة بس.
 *
 * Shared plan helpers: progress + date formatting. Plan generation itself
 * lives in `curriculumPlanner.ts` (curriculum-chapter distribution).
 */
import { GeneratedPlan } from '../types';

export const planProgressPercent = (plan?: GeneratedPlan | null): number => {
  if (!plan || plan.sessions.length === 0) return 0;
  const done = plan.sessions.filter(s => s.isCompleted).length;
  return Math.round((done / plan.sessions.length) * 100);
};

export const formatDateAr = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
};
