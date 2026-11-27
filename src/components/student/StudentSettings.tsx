import React, { useRef, useState } from 'react';
import {
  Gender,
  Student,
  AcademicPath,
  LanguageTrack,
  EducationSystem,
  GeneralStream,
  BacTrack
} from '../../types';
import { ACADEMIC_STAGES } from '../../data/academicStages';
import {
  User,
  Camera,
  Save,
  Phone,
  GraduationCap,
  BookOpen,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  X
} from 'lucide-react';

interface StudentSettingsProps {
  student: Student;
  isArabic: boolean;
  onSave: (updated: Student) => void;
  onBack?: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
];

/* ---------- خيارات المسار الدراسي ---------- */
interface ChoiceOption {
  v: string;
  ar: string;
  en: string;
}

const LANG_TRACKS: ChoiceOption[] = [
  { v: 'languages', ar: 'لغات', en: 'Languages' },
  { v: 'arabic', ar: 'عربي', en: 'Arabic' }
];

const SYSTEMS_BASE: ChoiceOption[] = [
  { v: 'general', ar: 'عام', en: 'General' },
  { v: 'azhar', ar: 'أزهر', en: 'Al-Azhar' }
];

const BACCALAUREATE_OPTION: ChoiceOption = {
  v: 'baccalaureate',
  ar: 'بكالوريا',
  en: 'Baccalaureate'
};

/** شعبة العام حسب السنة (تانية: أدبي/علمي — تالتة: علوم/رياضة/أدبي) */
const STREAMS_BY_STAGE: Record<string, ChoiceOption[]> = {
  'sec-2': [
    { v: 'literary', ar: 'أدبي', en: 'Literary' },
    { v: 'science', ar: 'علمي', en: 'Science' }
  ],
  'sec-3': [
    { v: 'science', ar: 'علم علوم', en: 'Science' },
    { v: 'science-math', ar: 'علم رياضة', en: 'Math' },
    { v: 'literary', ar: 'أدبي', en: 'Literary' }
  ]
};

const BAC_TRACKS: ChoiceOption[] = [
  { v: 'medicine-life', ar: 'طب وعلوم حياة', en: 'Medicine & Life Sciences' },
  { v: 'engineering-computer', ar: 'هندسة وعلوم حاسب', en: 'Engineering & Computer' },
  { v: 'business', ar: 'أعمال', en: 'Business' },
  { v: 'literature', ar: 'آداب', en: 'Literature' }
];

/** مادة التخصص داخل كل مسار */
const BAC_SPECS: Record<string, ChoiceOption[]> = {
  'medicine-life': [
    { v: 'math', ar: 'رياضة', en: 'Math' },
    { v: 'physics', ar: 'فيزياء', en: 'Physics' }
  ],
  'engineering-computer': [
    { v: 'chemistry', ar: 'كيمياء', en: 'Chemistry' },
    { v: 'programming', ar: 'برمجة', en: 'Programming' }
  ],
  business: [
    { v: 'business-admin', ar: 'إدارة أعمال', en: 'Business Admin' },
    { v: 'accounting', ar: 'محاسبة', en: 'Accounting' }
  ],
  literature: [
    { v: 'second-language', ar: 'لغة تانية', en: 'Second Language' },
    { v: 'psychology', ar: 'علم نفس', en: 'Psychology' }
  ]
};

const SECOND_LANGUAGES: ChoiceOption[] = [
  { v: 'french', ar: 'فرنسي', en: 'French' },
  { v: 'german', ar: 'ألماني', en: 'German' },
  { v: 'italian', ar: 'إيطالي', en: 'Italian' },
  { v: 'spanish', ar: 'إسباني', en: 'Spanish' },
  { v: 'chinese', ar: 'صيني', en: 'Chinese' },
  { v: 'english', ar: 'إنجليزي', en: 'English' }
];

const ChoiceGrid: React.FC<{
  options: ChoiceOption[];
  value?: string;
  onChange: (v: string) => void;
  isArabic: boolean;
  cols?: string;
}> = ({ options, value, onChange, isArabic, cols = 'grid-cols-2' }) => (
  <div className={`grid gap-2 ${cols}`}>
    {options.map(o => (
      <button
        key={o.v}
        type="button"
        onClick={() => onChange(o.v)}
        className={`py-3 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
          value === o.v
            ? 'bg-brand-blue/20 text-brand-blue-electric border-brand-blue/50'
            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
        }`}
      >
        {isArabic ? o.ar : o.en}
      </button>
    ))}
  </div>
);

/** مسودة المسار — بتتسأل وتتظبط من الصفحة */
type PathDraft = Partial<AcademicPath>;

export const StudentSettings: React.FC<StudentSettingsProps> = ({
  student,
  isArabic,
  onSave,
  onBack
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState(student.fullNameAr || student.fullName);
  const [email, setEmail] = useState(student.email);
  const [phoneNumber, setPhoneNumber] = useState(student.phoneNumber);
  const [gender, setGender] = useState<Gender>(student.gender || 'male');
  const [stageId, setStageId] = useState(
    student.curriculumStageId ||
      ACADEMIC_STAGES.find(s => s.labelAr === student.academicYearAr || s.labelEn === student.academicYear)?.id ||
      'sec-3'
  );
  const [avatarUrl, setAvatarUrl] = useState(student.avatarUrl);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- المسار الدراسي (أسئلة الصفحة) ---------- */
  const inSecondary = stageId === 'sec-2' || stageId === 'sec-3';
  const [path, setPath] = useState<PathDraft>(() => {
    const p = student.academicPath;
    const draft: PathDraft = p
      ? {
          languageTrack: p.languageTrack,
          system: p.system,
          generalStream: p.generalStream,
          bacTrack: p.bacTrack,
          bacSpecialization: p.bacSpecialization,
          secondLanguage: p.secondLanguage
        }
      : {};
    // تنظيف أولي: قيم مش صالحة للمرحلة الحالية
    const sec = stageId === 'sec-2' || stageId === 'sec-3';
    if (!sec && draft.system === 'baccalaureate') {
      draft.system = 'general';
      delete draft.bacTrack;
      delete draft.bacSpecialization;
      delete draft.secondLanguage;
    }
    const streams = STREAMS_BY_STAGE[stageId] || [];
    if (draft.generalStream && !streams.some(o => o.v === draft.generalStream)) {
      delete draft.generalStream;
    }
    if (draft.system && draft.system !== 'general') delete draft.generalStream;
    return draft;
  });

  /** تحديث جزئي مع إلغاء الإجابات اللي بقت مش صالحة */
  const patchPath = (patch: PathDraft) => {
    setPath(prev => {
      const next: PathDraft = { ...prev, ...patch };
      if ('system' in patch) {
        if (next.system !== 'general') delete next.generalStream;
        if (next.system !== 'baccalaureate') {
          delete next.bacTrack;
          delete next.bacSpecialization;
          delete next.secondLanguage;
        }
      }
      if ('bacTrack' in patch) {
        delete next.bacSpecialization;
        delete next.secondLanguage;
      }
      if ('bacSpecialization' in patch && patch.bacSpecialization !== 'second-language') {
        delete next.secondLanguage;
      }
      return next;
    });
  };

  /** تغيير السنة — بيطهر الإجابات اللي مش متاحة في السنة الجديدة */
  const handleStageChange = (nextStageId: string) => {
    setStageId(nextStageId);
    setPath(prev => {
      const next: PathDraft = { ...prev };
      const sec = nextStageId === 'sec-2' || nextStageId === 'sec-3';
      if (!sec && next.system === 'baccalaureate') {
        next.system = 'general';
        delete next.bacTrack;
        delete next.bacSpecialization;
        delete next.secondLanguage;
      }
      const streams = STREAMS_BY_STAGE[nextStageId] || [];
      if (next.generalStream && !streams.some(o => o.v === next.generalStream)) {
        delete next.generalStream;
      }
      if (next.system !== 'general') delete next.generalStream;
      if (next.system !== 'baccalaureate') {
        delete next.bacTrack;
        delete next.bacSpecialization;
        delete next.secondLanguage;
      }
      return next;
    });
  };

  const handleImageFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(isArabic ? 'اختار صورة بصيغة JPG أو PNG.' : 'Please choose a JPG or PNG image.');
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setError(isArabic ? 'حجم الصورة كبير (الحد 2.5 ميجابايت).' : 'Image too large (2.5MB max).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError(isArabic ? 'الاسم لا يمكن أن يكون فارغاً.' : 'Name cannot be empty.');
      return;
    }
    if (!email.includes('@')) {
      setError(isArabic ? 'البريد الإلكتروني غير صحيح.' : 'Please enter a valid email.');
      return;
    }

    /* أسئلة المسار الدراسي — إلزامي قبل الحفظ */
    if (!path.languageTrack) {
      setError(isArabic ? 'اختار لغتك: لغات ولا عربي.' : 'Choose your language track: Languages or Arabic.');
      return;
    }
    if (!path.system) {
      setError(isArabic ? 'اختار النظام الدراسي: عام أو أزهر.' : 'Choose the system: General or Al-Azhar.');
      return;
    }
    if (path.system === 'general' && inSecondary && !path.generalStream) {
      setError(
        isArabic
          ? stageId === 'sec-2'
            ? 'اختار شعبتك في العام: أدبي أو علمي.'
            : 'اختار شعبتك في العام: علم علوم أو علم رياضة أو أدبي.'
          : 'Choose your general stream.'
      );
      return;
    }
    if (path.system === 'baccalaureate' && inSecondary) {
      if (!path.bacTrack) {
        setError(
          isArabic
            ? 'اختار مسار البكالوريا: طب وعلوم حياة، هندسة وعلوم حاسب، أعمال أو آداب.'
            : 'Choose your Baccalaureate track.'
        );
        return;
      }
      if (!path.bacSpecialization) {
        setError(isArabic ? 'اختار مادة التخصص داخل المسار.' : 'Choose your specialization subject.');
        return;
      }
      if (path.bacSpecialization === 'second-language' && !path.secondLanguage) {
        setError(
          isArabic
            ? 'اختار اللغة التانية: فرنسي، ألماني، إيطالي، إسباني، صيني أو إنجليزي.'
            : 'Choose your second language.'
        );
        return;
      }
    }

    const academicPath: AcademicPath = {
      languageTrack: path.languageTrack,
      system: path.system
    };
    if (path.system === 'general' && inSecondary && path.generalStream) {
      academicPath.generalStream = path.generalStream;
    }
    if (path.system === 'baccalaureate' && inSecondary && path.bacTrack) {
      academicPath.bacTrack = path.bacTrack;
      if (path.bacSpecialization) academicPath.bacSpecialization = path.bacSpecialization;
      if (path.bacSpecialization === 'second-language' && path.secondLanguage) {
        academicPath.secondLanguage = path.secondLanguage;
      }
    }

    const stage = ACADEMIC_STAGES.find(s => s.id === stageId);

    const updated: Student = {
      ...student,
      fullNameAr: fullName.trim(),
      fullName: student.fullName === student.fullNameAr ? fullName.trim() : student.fullName,
      email: email.trim(),
      phoneNumber: phoneNumber.trim(),
      gender,
      avatarUrl,
      academicYear: stage?.labelEn || student.academicYear,
      academicYearAr: stage?.labelAr || student.academicYearAr,
      // تغيير السنة بيلغي الجدول المبني على السنة القديمة (لازم إعادة توزيع)
      curriculumStageId: stageId,
      generatedPlan: student.curriculumStageId === stageId ? student.generatedPlan : null,
      studyProfile: student.curriculumStageId === stageId ? student.studyProfile : null,
      academicPath,
      lastActivity: new Date().toISOString()
    };

    onSave(updated);
    setSaved(true);
    setError(null);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-3xl border border-slate-800 p-5 sm:p-7 space-y-6">

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{isArabic ? 'إعدادات حسابي' : 'My Account Settings'}</h2>
            <p className="text-[11px] text-slate-400">
              {isArabic ? 'غيّر اسمك أو صورتك أو رقم تليفونك في أي وقت' : 'Update your name, photo or phone number anytime'}
            </p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div className="relative">
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-24 h-24 rounded-3xl object-cover border-2 border-brand-blue/40"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -left-2 rtl:-left-auto rtl:-right-2 p-2 rounded-xl bg-brand-blue text-white shadow-lg active:scale-95"
              title={isArabic ? 'تغيير الصورة' : 'Change photo'}
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 w-full space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              {isArabic ? 'ارفع صورة من جهازك' : 'Upload a photo'}
            </button>

            <div className="flex items-center gap-1.5 justify-center">
              {AVATAR_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarUrl(p)}
                  className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                    avatarUrl === p ? 'border-brand-blue-electric scale-105' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={p} alt={`avatar-${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isArabic ? 'تم حفظ بياناتك بنجاح!' : 'Your details were saved successfully!'}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isArabic ? 'الاسم بالكامل' : 'Full name'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-sm pl-10 rtl:pl-4 rtl:pr-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-sm pl-10 rtl:pl-4 rtl:pr-10"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'رقم التليفون' : 'Phone number'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-sm pl-10 rtl:pl-4 rtl:pr-10 font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isArabic ? 'الجنس' : 'Gender'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'male', ar: 'ذكر', en: 'Male' },
                { v: 'female', ar: 'أنثى', en: 'Female' }
              ] as { v: Gender; ar: string; en: string }[]).map(g => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setGender(g.v)}
                  className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                    gender === g.v
                      ? 'bg-brand-blue/20 text-brand-blue-electric border-brand-blue/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {isArabic ? g.ar : g.en}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {isArabic ? 'المرحلة الدراسية' : 'Academic stage'}
            </label>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-500 absolute top-3.5 left-3.5 rtl:left-auto rtl:right-3.5 pointer-events-none" />
              <select
                value={stageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full appearance-none px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm pl-10 rtl:pl-4 rtl:pr-10"
              >
                {ACADEMIC_STAGES.map(s => (
                  <option key={s.id} value={s.id}>
                    {isArabic ? s.labelAr : s.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ===== المسار الدراسي: لغات/عربي • النظام • الشعبة/المسار ===== */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand-blue/15 text-brand-blue-electric border border-brand-blue/25">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isArabic ? 'المسار الدراسي' : 'Academic path'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {isArabic
                    ? 'أسئلة بتظبط المنهج والمواد على مسارك — اختار وإنت مطمّن'
                    : 'Questions that tailor your curriculum to your track'}
                </p>
              </div>
            </div>

            {/* هل أنت لغات ولا عربي؟ */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'هل أنت لغات ولا عربي؟' : 'Languages or Arabic?'}
              </label>
              <ChoiceGrid
                options={LANG_TRACKS}
                value={path.languageTrack}
                onChange={v => patchPath({ languageTrack: v as LanguageTrack })}
                isArabic={isArabic}
              />
            </div>

            {/* النظام: عام/أزهر — وبيزيد بكالوريا في تانية وتالتة ثانوي */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isArabic ? 'النظام الدراسي' : 'Education system'}
              </label>
              <ChoiceGrid
                options={inSecondary ? [...SYSTEMS_BASE, BACCALAUREATE_OPTION] : SYSTEMS_BASE}
                value={path.system}
                onChange={v => patchPath({ system: v as EducationSystem })}
                isArabic={isArabic}
                cols={inSecondary ? 'grid-cols-3' : 'grid-cols-2'}
              />
            </div>

            {/* تانية/تالتة ثانوي + عام → الشعبة */}
            {path.system === 'general' && inSecondary && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isArabic ? 'الشعبة (عام)' : 'Stream (General)'}
                </label>
                <ChoiceGrid
                  options={STREAMS_BY_STAGE[stageId] || []}
                  value={path.generalStream}
                  onChange={v => patchPath({ generalStream: v as GeneralStream })}
                  isArabic={isArabic}
                  cols={stageId === 'sec-3' ? 'grid-cols-3' : 'grid-cols-2'}
                />
              </div>
            )}

            {/* تانية/تالتة ثانوي + بكالوريا → المسار */}
            {path.system === 'baccalaureate' && inSecondary && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isArabic ? 'مسار البكالوريا' : 'Baccalaureate track'}
                </label>
                <ChoiceGrid
                  options={BAC_TRACKS}
                  value={path.bacTrack}
                  onChange={v => patchPath({ bacTrack: v as BacTrack })}
                  isArabic={isArabic}
                />
              </div>
            )}

            {/* مادة التخصص داخل المسار */}
            {path.system === 'baccalaureate' && inSecondary && path.bacTrack && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isArabic ? 'مادة التخصص' : 'Specialization subject'}
                </label>
                <ChoiceGrid
                  options={BAC_SPECS[path.bacTrack] || []}
                  value={path.bacSpecialization}
                  onChange={v => patchPath({ bacSpecialization: v })}
                  isArabic={isArabic}
                />
              </div>
            )}

            {/* لو التخصص = لغة تانية → يختار اللغات (6 لغات) */}
            {path.bacSpecialization === 'second-language' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isArabic ? 'اللغة التانية' : 'Second language'}
                </label>
                <ChoiceGrid
                  options={SECOND_LANGUAGES}
                  value={path.secondLanguage}
                  onChange={v => patchPath({ secondLanguage: v })}
                  isArabic={isArabic}
                  cols="grid-cols-2 sm:grid-cols-3"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="sm:flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
            )}
            <button
              type="submit"
              className="sm:flex-[2] py-3.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-sm font-bold flex items-center justify-center gap-2 shadow-glow-blue/30"
            >
              <Save className="w-4 h-4" />
              {isArabic ? 'حفظ التعديلات' : 'Save changes'}
            </button>
          </div>
        </form>

      </div>

      {/* Account meta */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-4 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex justify-between">
          <span>{isArabic ? 'كود الطالب' : 'Student ID'}</span>
          <span className="font-mono text-slate-300">{student.studentId}</span>
        </div>
        <div className="flex justify-between">
          <span>{isArabic ? 'الباقة' : 'Plan'}</span>
          <span className="font-bold text-brand-blue-electric">{student.subscriptionPlan}</span>
        </div>
        <div className="flex justify-between">
          <span>{isArabic ? 'تاريخ الانتهاء' : 'Expires'}</span>
          <span className="font-mono text-slate-300">
            {student.subscriptionExpiryDate ? new Date(student.subscriptionExpiryDate).toLocaleDateString() : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
