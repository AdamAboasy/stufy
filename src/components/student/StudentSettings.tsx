import React, { useRef, useState } from 'react';
import { Gender, Student } from '../../types';
import { ACADEMIC_STAGES } from '../../data/academicStages';
import {
  User,
  Camera,
  Save,
  Phone,
  GraduationCap,
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
    ACADEMIC_STAGES.find(s => s.labelAr === student.academicYearAr || s.labelEn === student.academicYear)?.id || 'sec-3'
  );
  const [avatarUrl, setAvatarUrl] = useState(student.avatarUrl);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                onChange={(e) => setStageId(e.target.value)}
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
