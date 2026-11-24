import React, { useRef, useState } from 'react';
import { EDUCATION_STAGES, Gender, Student } from '../../types';
import { Logo } from '../brand/Logo';
import { Avatar } from '../common/Avatar';
import { fileToAvatarDataUrl } from '../../utils/media';
import { isValidPhone, normalizePhone } from '../../utils/validators';
import { AlertCircle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Save, Trash2, User } from 'lucide-react';

export interface SettingsChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface StudentSettingsPageProps {
  student: Student;
  isArabic: boolean;
  onBack: () => void;
  onSave: (updated: Student, changes: SettingsChange[]) => void;
  onToggleLanguage?: () => void;
}

export const StudentSettingsPage: React.FC<StudentSettingsPageProps> = ({
  student,
  isArabic,
  onBack,
  onSave,
  onToggleLanguage
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(isArabic ? student.fullNameAr || student.fullName : student.fullName);
  const [phone, setPhone] = useState(student.phoneNumber);
  const [stage, setStage] = useState(student.educationStage || '');
  const [gender, setGender] = useState<Gender | ''>(student.gender || '');
  const [avatar, setAvatar] = useState(student.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handlePhoto = async (file: File | null) => {
    setError(null);
    setSaved(false);
    if (!file) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(
        code === 'IMAGE_TOO_LARGE'
          ? isArabic ? 'الصورة كبيرة جداً (الحد الأقصى 8 ميجا).' : 'Image is too large (max 8 MB).'
          : isArabic ? 'اختر صورة صالحة (JPG أو PNG).' : 'Please choose a valid image (JPG or PNG).'
      );
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2) {
      setError(isArabic ? 'اكتب اسمك بالكامل.' : 'Please enter your full name.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError(isArabic ? 'رقم التليفون غير صحيح.' : 'Invalid phone number.');
      return;
    }
    if (!stage) {
      setError(isArabic ? 'اختر مرحلتك الدراسية.' : 'Please choose your education stage.');
      return;
    }
    if (!gender) {
      setError(isArabic ? 'اختر النوع.' : 'Please choose your gender.');
      return;
    }

    const stageOption = EDUCATION_STAGES.find(s => s.value === stage);
    const cleanPhone = normalizePhone(phone);
    const changes: SettingsChange[] = [];
    const push = (field: string, oldValue: string, newValue: string) => {
      if (oldValue !== newValue) changes.push({ field, oldValue: oldValue || '—', newValue: newValue || '—' });
    };

    push('fullName', student.fullName, cleanName);
    push('phoneNumber', student.phoneNumber, cleanPhone);
    push('educationStage', student.educationStage || '', stage);
    push('gender', student.gender || '', gender);
    if (student.avatarUrl !== avatar) {
      changes.push({
        field: 'avatarUrl',
        oldValue: student.avatarUrl ? 'photo' : 'none',
        newValue: avatar ? 'photo updated' : 'removed'
      });
    }

    if (changes.length === 0) {
      setSaved(true);
      return;
    }

    onSave(
      {
        ...student,
        fullName: cleanName,
        fullNameAr: cleanName,
        phoneNumber: cleanPhone,
        educationStage: stage,
        academicYear: stageOption?.en || student.academicYear,
        academicYearAr: stageOption?.ar || student.academicYearAr,
        gender,
        avatarUrl: avatar
      },
      changes
    );
    setSaved(true);
  };

  const BackIcon = isArabic ? ArrowRight : ArrowLeft;
  const inputClass =
    'w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-sm';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <Logo variant="student-dash" size="md" isArabic={isArabic} />
          <div className="flex items-center gap-2">
            {onToggleLanguage && (
              <button
                type="button"
                onClick={onToggleLanguage}
                className="h-10 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                {isArabic ? 'EN' : 'عربي'}
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            >
              <BackIcon className="w-4 h-4" />
              <span>{isArabic ? 'رجوع' : 'Back'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full p-3 sm:p-6 flex-1">
        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-5 sm:p-8 border border-slate-800 space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <User className="w-6 h-6 text-brand-blue-electric" />
              <span>{isArabic ? 'إعدادات الحساب' : 'Account settings'}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isArabic ? 'غيّر اسمك أو صورتك أو بياناتك الدراسية.' : 'Change your name, photo or study details.'}
            </p>
          </div>

          {/* Photo */}
          <div className="flex items-center gap-4">
            <Avatar src={avatar} name={name || student.fullName} gender={gender || undefined} className="w-24 h-24 rounded-3xl border-2 border-brand-blue/40" />
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-11 px-4 inline-flex items-center gap-2 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-dark text-white transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>{isArabic ? 'رفع صورة' : 'Upload photo'}</span>
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => { setAvatar(''); setSaved(false); }}
                  className="h-11 px-4 inline-flex items-center gap-2 rounded-xl text-xs font-bold bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-500/30 ms-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isArabic ? 'حذف' : 'Remove'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'الاسم بالكامل' : 'Full name'}</label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'رقم التليفون' : 'Phone number'}</label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
                className={inputClass}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
              <input type="email" value={student.email} disabled className={`${inputClass} opacity-60`} dir="ltr" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'المرحلة الدراسية' : 'Education stage'}</label>
              <select value={stage} onChange={(e) => { setStage(e.target.value); setSaved(false); }} className={inputClass}>
                <option value="">{isArabic ? '— اختر —' : '— Choose —'}</option>
                {EDUCATION_STAGES.map(s => (
                  <option key={s.value} value={s.value}>{isArabic ? s.ar : s.en}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'النوع' : 'Gender'}</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['male', isArabic ? 'ذكر' : 'Male'],
                  ['female', isArabic ? 'أنثى' : 'Female']
                ] as Array<[Gender, string]>).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => { setGender(value); setSaved(false); }}
                    className={`py-3 rounded-xl text-sm font-bold border transition-colors ${
                      gender === value
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-brand-blue/60'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {saved && !error && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isArabic ? 'تم حفظ التغييرات.' : 'Changes saved.'}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-brand-blue to-brand-purple text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isArabic ? 'حفظ التغييرات' : 'Save changes'}</span>
          </button>
        </form>
      </main>
    </div>
  );
};
