import React, { useMemo, useState } from 'react';
import { GeneratedPlan, Student, StudyProfile } from '../../types';
import { ACADEMIC_STAGES } from '../../data/academicStages';
import { getStageCurriculum, totalLessons } from '../../data/curriculum';
import {
  buildCurriculumPlan,
  checkCurriculumFeasibility,
  availableStudyHours
} from '../../lib/curriculumPlanner';
import {
  GraduationCap,
  Clock,
  CalendarDays,
  Repeat,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Coffee,
  BookOpen,
  ListChecks,
  NotebookPen
} from 'lucide-react';

interface StudySetupWizardProps {
  student: Student;
  isArabic: boolean;
  /** حذف الخطة وإعادة الإعداد من الأول */
  onRestart?: () => void;
  onFinish: (profile: StudyProfile, plan: GeneratedPlan) => void;
}

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};

const defaultExamDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};

/**
 * إعداد الطالب لأول مرة
 * ============================================================
 * ١) يختار سنته الدراسية  →  المنهج بيتحمّل جاهز (مش بيرفع كتاب).
 * ٢) يوصف يومه: بيذاكر كام ساعة، أيام الراحة، الامتحان، وطريقته.
 * ٣) البرنامج يوزّع أبواب المنهج على الأيام ويطلع الجدول الكامل.
 *
 * First-run setup: pick the academic year (curriculum is pre-seeded), describe
 * the day, then the app distributes the curriculum chapters over the calendar.
 */
export const StudySetupWizard: React.FC<StudySetupWizardProps> = ({
  student,
  isArabic,
  onRestart,
  onFinish
}) => {
  const guessedStage =
    student.curriculumStageId ||
    ACADEMIC_STAGES.find(
      s => s.labelAr === student.academicYearAr || s.labelEn === student.academicYear
    )?.id ||
    '';

  const [step, setStep] = useState<1 | 2 | 3>(guessedStage ? 2 : 1);
  const [stageId, setStageId] = useState(guessedStage);
  const [dailyHours, setDailyHours] = useState(2);
  const [daysOff, setDaysOff] = useState<number[]>([5]);
  const [examDate, setExamDate] = useState(defaultExamDate());
  const [revisionRounds, setRevisionRounds] = useState(1);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [routineNotes, setRoutineNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const curriculum = useMemo(() => getStageCurriculum(stageId), [stageId]);
  const selectedSubjects = useMemo(
    () => (subjectIds.length > 0 ? subjectIds : curriculum?.subjects.map(s => s.id) || []),
    [subjectIds, curriculum]
  );

  const feasibility = useMemo(() => {
    if (!curriculum || !examDate) return null;
    return checkCurriculumFeasibility(curriculum, selectedSubjects, examDate, dailyHours, daysOff);
  }, [curriculum, selectedSubjects, examDate, dailyHours, daysOff]);

  const toggleDayOff = (day: number) =>
    setDaysOff(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));

  const toggleSubject = (id: string) =>
    setSubjectIds(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));

  const canBuild =
    !!curriculum &&
    !!examDate &&
    new Date(`${examDate}T00:00:00`).getTime() > Date.now() &&
    selectedSubjects.length > 0;

  const handleBuild = () => {
    if (!curriculum) {
      setError(isArabic ? 'اختار سنتك الدراسية الأول.' : 'Pick your academic year first.');
      return;
    }
    if (!examDate || new Date(`${examDate}T00:00:00`).getTime() <= Date.now()) {
      setError(isArabic ? 'اختار تاريخ امتحان في المستقبل.' : 'Pick a future exam date.');
      return;
    }
    if (selectedSubjects.length === 0) {
      setError(isArabic ? 'اختار مادة واحدة على الأقل.' : 'Pick at least one subject.');
      return;
    }

    const plan = buildCurriculumPlan({
      curriculum,
      subjectIds: selectedSubjects,
      examDate,
      dailyHours,
      daysOff,
      revisionRounds,
      startDate: todayIso()
    });

    const profile: StudyProfile = {
      stageId: curriculum.stageId,
      academicYear: curriculum.labelEn,
      academicYearAr: curriculum.labelAr,
      dailyHours,
      daysOff,
      revisionRounds,
      examDate,
      subjectIds: selectedSubjects,
      routineNotes: routineNotes.trim(),
      updatedAt: new Date().toISOString()
    };

    onFinish(profile, plan);
  };

  const steps = [
    { n: 1, ar: 'سنتك', en: 'Your year', icon: GraduationCap },
    { n: 2, ar: 'يومك', en: 'Your day', icon: Clock },
    { n: 3, ar: 'التأكيد', en: 'Confirm', icon: Sparkles }
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[96vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3.5 space-y-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white text-sm sm:text-base truncate">
                  {isArabic ? 'خلّينا نظبط برنامجك' : "Let's set up your schedule"}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {isArabic
                    ? 'سنتك + وقتك في اليوم = جدول كامل موزّع على المنهج'
                    : 'Your year + your daily time = a full curriculum-based schedule'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {steps.map(s => {
                const Icon = s.icon;
                const active = step === s.n;
                const done = step > s.n;
                return (
                  <div
                    key={s.n}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-bold border ${
                      active
                        ? 'bg-brand-blue/15 text-brand-blue-electric border-brand-blue/40'
                        : done
                        ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    {isArabic ? s.ar : s.en}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">

            {/* ---------- STEP 1: year ---------- */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-brand-blue-electric" />
                    {isArabic ? 'إنت في سنة كام؟' : 'Which year are you in?'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {isArabic
                      ? 'المنهج محفوظ عندنا لكل سنة — بمجرد ما تختار، البرنامج يوزّع أبواب المنهج على أيامك.'
                      : 'The curriculum for every year is already stored — pick yours and we distribute its chapters across your days.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ACADEMIC_STAGES.map(stage => {
                    const stageCurriculum = getStageCurriculum(stage.id);
                    const selected = stageId === stage.id;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setStageId(stage.id)}
                        className={`p-3 rounded-2xl border text-start transition-colors ${
                          selected
                            ? 'bg-brand-blue/15 border-brand-blue/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-200'}`}>
                            {isArabic ? stage.labelAr : stage.labelEn}
                          </span>
                          {selected && <CheckCircle2 className="w-4 h-4 text-brand-blue-electric shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {stageCurriculum
                            ? `${stageCurriculum.subjects.length} ${isArabic ? 'مواد' : 'subjects'} • ${totalLessons(stageCurriculum)} ${
                                isArabic ? 'باب/درس' : 'topics'
                              }`
                            : isArabic
                            ? 'المنهج لسه بيتجهّز'
                            : 'Curriculum coming soon'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {onRestart ? (
                    <button onClick={onRestart} className="text-[11px] text-slate-400 hover:text-white font-bold">
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => setStep(2)}
                    disabled={!curriculum}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-40 text-white text-xs font-bold"
                  >
                    {isArabic ? 'التالي' : 'Next'}
                    {isArabic ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ---------- STEP 2: the day ---------- */}
            {step === 2 && curriculum && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-blue-electric" />
                    {isArabic ? 'يومك بيشبه إيه؟' : 'What does your day look like?'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {isArabic
                      ? 'قولنا بتذاكر قد إيه في اليوم وإمتى بترتاح — والبرنامج يبني الجدول على كده.'
                      : 'Tell us how long you study each day and when you rest — the schedule is built around it.'}
                  </p>
                </div>

                {/* daily hours */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">
                      {isArabic ? 'ساعات المذاكرة في اليوم' : 'Study hours per day'}
                    </span>
                    <span className="text-xs font-black text-brand-blue-electric font-mono">
                      {dailyHours} {isArabic ? 'ساعة' : 'h'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={dailyHours}
                    onChange={e => setDailyHours(Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.5h</span>
                    <span>10h</span>
                  </div>
                </div>

                {/* days off */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                    {isArabic ? 'أيام الراحة' : 'Days off'}
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES_AR.map((_, day) => {
                      const off = daysOff.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDayOff(day)}
                          className={`py-2 rounded-lg text-[10px] font-bold border transition-colors ${
                            off
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {isArabic ? DAY_NAMES_AR[day].slice(0, 3) : DAY_NAMES_EN[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* exam date + rounds */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                      {isArabic ? 'يوم الامتحان' : 'Exam date'}
                    </span>
                    <input
                      type="date"
                      value={examDate}
                      min={todayIso()}
                      onChange={e => setExamDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                      {isArabic ? 'جولات المراجعة' : 'Revision rounds'}
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {[0, 1, 2, 3].map(n => (
                        <button
                          key={n}
                          onClick={() => setRevisionRounds(n)}
                          className={`py-2 rounded-lg text-[11px] font-bold border ${
                            revisionRounds === n
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {n === 0 ? (isArabic ? 'بدون' : 'None') : n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* subjects */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-blue-electric" />
                    {isArabic ? 'المواد اللي هتذاكرها' : 'Subjects to study'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {curriculum.subjects.map(subject => {
                      const selected = selectedSubjects.includes(subject.id);
                      return (
                        <button
                          key={subject.id}
                          onClick={() => toggleSubject(subject.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${
                            selected
                              ? 'bg-brand-blue/20 text-brand-blue-electric border-brand-blue/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {isArabic ? subject.nameAr : subject.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* routine notes */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <NotebookPen className="w-3.5 h-3.5 text-slate-400" />
                    {isArabic ? 'احكي لنا عن يومك (اختياري)' : 'Describe your day (optional)'}
                  </span>
                  <textarea
                    value={routineNotes}
                    onChange={e => setRoutineNotes(e.target.value)}
                    rows={3}
                    placeholder={
                      isArabic
                        ? 'مثال: بذاكر بعد المدرسة من ٦ لـ ٩، وباخد بريك كل ساعة، وبحب أبدأ بالرياضيات.'
                        : 'e.g. I study after school 6–9pm, take a break every hour, and prefer starting with math.'
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-[11px] leading-relaxed resize-none"
                  />
                </div>

                {feasibility && (
                  <div
                    className={`p-3 rounded-2xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                      feasibility.isImpossible
                        ? 'bg-red-950/40 border-red-500/40 text-red-200'
                        : feasibility.isTight
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">
                        {isArabic ? feasibility.messageAr : feasibility.messageEn}
                      </div>
                      <div className="text-[10px] opacity-80 mt-1 font-mono">
                        {feasibility.days} {isArabic ? 'يوم' : 'days'} •{' '}
                        {availableStudyHours(examDate, dailyHours, daysOff)}{' '}
                        {isArabic ? 'ساعة متاحة' : 'hours available'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
                  >
                    {isArabic ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {isArabic ? 'السنة' : 'Year'}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canBuild}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-40 text-white text-xs font-bold"
                  >
                    {isArabic ? 'التالي' : 'Next'}
                    {isArabic ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ---------- STEP 3: confirm ---------- */}
            {step === 3 && curriculum && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-emerald-400" />
                    {isArabic ? 'مراجعة سريعة قبل بناء الجدول' : 'Quick check before we build it'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { labelAr: 'السنة', labelEn: 'Year', value: isArabic ? curriculum.labelAr : curriculum.labelEn },
                    { labelAr: 'ساعات/يوم', labelEn: 'Hours/day', value: `${dailyHours}` },
                    {
                      labelAr: 'المواد',
                      labelEn: 'Subjects',
                      value: `${selectedSubjects.length}/${curriculum.subjects.length}`
                    },
                    { labelAr: 'المراجعات', labelEn: 'Revisions', value: `${revisionRounds}` }
                  ].map(item => (
                    <div key={item.labelEn} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400">{isArabic ? item.labelAr : item.labelEn}</div>
                      <div className="text-xs font-bold text-white mt-0.5 truncate">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-200">
                    {isArabic ? 'المنهج اللي هيتوزّع' : 'The curriculum being distributed'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {curriculum.subjects
                      .filter(s => selectedSubjects.includes(s.id))
                      .map(subject => (
                        <span
                          key={subject.id}
                          className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300"
                        >
                          {isArabic ? subject.nameAr : subject.name} ·{' '}
                          {subject.chapters.reduce((sum, c) => sum + c.lessons, 0)}
                        </span>
                      ))}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
                    {isArabic
                      ? 'التوزيع بيتم على أبواب/دروس المنهج — مش على عدد صفحات.'
                      : 'Distribution is over curriculum chapters/lessons — never page counts.'}
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-[11px] font-bold">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
                  >
                    {isArabic ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {isArabic ? 'رجوع' : 'Back'}
                  </button>
                  <button
                    onClick={handleBuild}
                    className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple text-white text-xs font-black shadow-glow-combo"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isArabic ? 'ابنِ جدولي كامل' : 'Build my full schedule'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
