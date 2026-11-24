import React, { useState } from 'react';
import { GeneratedActivationCode, SubscriptionPlan, Student } from '../../types';
import { 
  KeyRound, 
  Plus, 
  Copy, 
  Check, 
  Share2, 
  Search, 
  Filter, 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Smartphone, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ActivationCodeGeneratorProps {
  codes: GeneratedActivationCode[];
  students: Student[];
  isArabic: boolean;
  onGenerateCode: (newCode: GeneratedActivationCode) => void;
  onRevokeCode: (codeId: string) => void;
}

export const ActivationCodeGenerator: React.FC<ActivationCodeGeneratorProps> = ({
  codes,
  students,
  isArabic,
  onGenerateCode,
  onRevokeCode
}) => {
  // Form State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('Pro');
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [maxDevices, setMaxDevices] = useState<number>(2);
  const [assignedStudentId, setAssignedStudentId] = useState<string>('');
  const [customPrefix, setCustomPrefix] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Generated Result Modal
  const [latestCode, setLatestCode] = useState<GeneratedActivationCode | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');

  // Handle Generate
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();

    const planPrefix = selectedPlan === 'Elite VIP' ? 'ELITE' : selectedPlan.toUpperCase().replace(/\s+/g, '');
    const prefix = customPrefix.trim() ? customPrefix.trim().toUpperCase() : `SSP-${planPrefix}`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    const codeString = `${prefix}-${year}-${randomSuffix}`;

    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + Number(durationMonths));

    const targetStudent = students.find(s => s.id === assignedStudentId);

    const newCode: GeneratedActivationCode = {
      id: `code-${Date.now()}`,
      code: codeString,
      plan: selectedPlan,
      durationMonths: Number(durationMonths),
      maxDevices: Number(maxDevices),
      status: 'Active',
      createdAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      assignedStudentId: targetStudent?.studentId,
      assignedStudentName: targetStudent ? (isArabic ? targetStudent.fullNameAr : targetStudent.fullName) : undefined,
      notes: notes.trim() || undefined,
      createdByName: 'Adam Sherif (Super Admin)',
    };

    onGenerateCode(newCode);
    setLatestCode(newCode);
    setShowGenerateModal(false);

    // Reset Form
    setCustomPrefix('');
    setNotes('');
    setAssignedStudentId('');
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const shareViaWhatsApp = (codeObj: GeneratedActivationCode) => {
    const studentName = codeObj.assignedStudentName ? ` للطالب (${codeObj.assignedStudentName})` : '';
    const message = isArabic
      ? `🎉 أهلاً بك في Smart Study Planner (مخطط الدراسة الذكي)!\n\nكود تفعيل باقة (${codeObj.plan})${studentName}:\n🔑 *${codeObj.code}*\n\n⏱️ الصلاحية: ${codeObj.durationMonths} شهر\n📱 الأجهزة المسموحة: ${codeObj.maxDevices}\n\nلتفعيل حسابك مباشرة تفضل بزيارة صفحة التفعيل:\nhttps://study-psi-ashen.vercel.app`
      : `🎉 Welcome to Smart Study Planner!\n\nYour activation code for (${codeObj.plan})${studentName}:\n🔑 *${codeObj.code}*\n\n⏱️ Duration: ${codeObj.durationMonths} months\n📱 Devices: ${codeObj.maxDevices}\n\nActivate your account directly at:\nhttps://study-psi-ashen.vercel.app`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Filtered Codes
  const filteredCodes = codes.filter(code => {
    const matchesSearch = !searchTerm || 
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (code.assignedStudentName && code.assignedStudentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (code.notes && code.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || code.status === statusFilter;
    const matchesPlan = planFilter === 'ALL' || code.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Counters
  const activeCount = codes.filter(c => c.status === 'Active').length;
  const redeemedCount = codes.filter(c => c.status === 'Redeemed').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Generation Button */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30 shadow-glow-blue/20">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{isArabic ? 'إنشاء وإدارة أكواد التفعيل' : 'Activation Code Generator & Vouchers'}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-blue/20 text-brand-blue-light border border-brand-blue/40">
                Super Admin Exclusive
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isArabic 
                ? 'توليد أكواد التفعيل المخصصة للطلاب للاشتراكات الشهرية والسنوية ومشاركتها عبر واتساب فوراً.'
                : 'Generate tailored student activation codes for monthly & annual plans and distribute via WhatsApp.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-brand-blue to-brand-purple hover:from-brand-blue-dark hover:to-brand-purple-dark transition-all duration-300 shadow-glow-combo active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isArabic ? '+ إنشاء كود تفعيل جديد' : '+ Generate New Code'}</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'إجمالي الأكواد' : 'Total Codes'}</div>
          <div className="text-2xl font-black text-white mt-1">{codes.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'أكواد جاهزة وغير مستخدمة' : 'Available Active'}</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'أكواد تم تفعيلها' : 'Redeemed'}</div>
          <div className="text-2xl font-black text-brand-blue-light mt-1">{redeemedCount}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center">
          <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'أكواد ملغاة' : 'Revoked'}</div>
          <div className="text-2xl font-black text-red-400 mt-1">{codes.filter(c => c.status === 'Revoked').length}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3 rtl:right-3 rtl:left-auto" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isArabic ? 'بحث بالرمز، اسم الطالب، الملاحظات...' : 'Search code, student, notes...'}
            className="w-full pr-9 pl-4 rtl:pr-9 rtl:pl-4 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
          >
            <option value="ALL">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="Active">{isArabic ? 'نشط وغير مستخدم' : 'Active (Available)'}</option>
            <option value="Redeemed">{isArabic ? 'تم تفعيله' : 'Redeemed'}</option>
            <option value="Revoked">{isArabic ? 'ملغي' : 'Revoked'}</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
          >
            <option value="ALL">{isArabic ? 'جميع الباقات' : 'All Plans'}</option>
            <option value="Free">Free Trial</option>
            <option value="Basic">Basic</option>
            <option value="Pro">Pro</option>
            <option value="Elite VIP">Elite VIP</option>
          </select>
        </div>
      </div>

      {/* Codes Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-4 px-4">{isArabic ? 'رمز التفعيل (Code)' : 'Activation Code'}</th>
                <th className="py-4 px-4">{isArabic ? 'الباقة والمدة' : 'Plan & Duration'}</th>
                <th className="py-4 px-4">{isArabic ? 'الحد الأقصى للأجهزة' : 'Max Devices'}</th>
                <th className="py-4 px-4">{isArabic ? 'الطالب المستهدف / المفعل' : 'Assigned Student'}</th>
                <th className="py-4 px-4">{isArabic ? 'تاريخ الإنشاء والانتهاء' : 'Dates'}</th>
                <th className="py-4 px-4">{isArabic ? 'الحالة' : 'Status'}</th>
                <th className="py-4 px-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    {isArabic ? 'لا توجد أكواد تفعيل مطابقة للبحث.' : 'No activation codes found.'}
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => {
                  const isRedeemed = code.status === 'Redeemed';
                  const isRevoked = code.status === 'Revoked';

                  return (
                    <tr key={code.id} className="hover:bg-slate-900/50 transition-colors">
                      
                      {/* Code String */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-brand-blue-electric tracking-wider bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            {code.code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(code.code, code.id)}
                            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                            title="Copy code"
                          >
                            {copiedCodeId === code.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {code.notes && (
                          <div className="text-[10px] text-slate-400 mt-1 truncate max-w-xs">{code.notes}</div>
                        )}
                      </td>

                      {/* Plan & Duration */}
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          code.plan === 'Elite VIP' ? 'bg-purple-950 text-purple-300 border border-purple-500/40' :
                          code.plan === 'Pro' ? 'bg-blue-950 text-brand-blue-electric border border-brand-blue/40' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {code.plan}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {code.durationMonths} {isArabic ? 'أشهر' : 'months'}
                        </div>
                      </td>

                      {/* Max Devices */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Smartphone className="w-3.5 h-3.5 text-brand-blue-light" />
                          <span>{code.maxDevices} {isArabic ? 'أجهزة' : 'devices'}</span>
                        </div>
                      </td>

                      {/* Student */}
                      <td className="py-4 px-4">
                        {code.assignedStudentName ? (
                          <div>
                            <div className="font-bold text-white text-xs">{code.assignedStudentName}</div>
                            {code.assignedStudentId && (
                              <div className="text-[10px] font-mono text-slate-500">{code.assignedStudentId}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs italic">{isArabic ? 'غير مخصص (عام)' : 'Unassigned / Voucher'}</span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-4 px-4 text-[11px] text-slate-400">
                        <div>{new Date(code.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">{isArabic ? 'ينتهي: ' : 'Exp: '}{new Date(code.expiresAt).toLocaleDateString()}</div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          code.status === 'Active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                          code.status === 'Redeemed' ? 'bg-sky-950 text-sky-300 border border-sky-500/30' :
                          'bg-red-950 text-red-400 border border-red-500/30'
                        }`}>
                          {code.status === 'Active' ? (isArabic ? 'متاح' : 'Active') :
                           code.status === 'Redeemed' ? (isArabic ? 'مفعل' : 'Redeemed') :
                           (isArabic ? 'ملغي' : 'Revoked')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => shareViaWhatsApp(code)}
                            className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 transition-colors"
                            title={isArabic ? 'مشاركة عبر واتساب' : 'Share on WhatsApp'}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {!isRevoked && !isRedeemed && (
                            <button
                              onClick={() => onRevokeCode(code.id)}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
                              title={isArabic ? 'إلغاء تفعيل الكود' : 'Revoke Code'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE CODE FORM MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-blue/20 text-brand-blue-electric">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">
                  {isArabic ? 'توليد كود تفعيل جديد' : 'Generate New Activation Code'}
                </h3>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-semibold text-slate-300 mb-1">{isArabic ? 'باقة الاشتراك' : 'Subscription Tier'}</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as SubscriptionPlan)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="Free">Free Trial</option>
                  <option value="Basic">Basic Plan</option>
                  <option value="Pro">Pro Plan (موصى به)</option>
                  <option value="Elite VIP">Elite VIP</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{isArabic ? 'مدة الصلاحية' : 'Duration'}</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value={1}>1 {isArabic ? 'شهر' : 'Month'}</option>
                    <option value={3}>3 {isArabic ? 'أشهر' : 'Months'}</option>
                    <option value={6}>6 {isArabic ? 'أشهر' : 'Months'}</option>
                    <option value={10}>10 {isArabic ? 'أشهر (سنة دراسية)' : 'Months (Full Year)'}</option>
                    <option value={12}>12 {isArabic ? 'شهر (سنة كاملة)' : 'Months (1 Year)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">{isArabic ? 'الحد الأقصى للأجهزة' : 'Max Devices'}</label>
                  <select
                    value={maxDevices}
                    onChange={(e) => setMaxDevices(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value={1}>1 {isArabic ? 'جهاز واحد' : 'Device'}</option>
                    <option value={2}>2 {isArabic ? 'جهازان' : 'Devices'}</option>
                    <option value={3}>3 {isArabic ? 'أجهزة (الحد الأقصى)' : 'Devices (Max)'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {isArabic ? 'تخصيص لطالب محدد (اختياري)' : 'Assign to Specific Student (Optional)'}
                </label>
                <select
                  value={assignedStudentId}
                  onChange={(e) => setAssignedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="">{isArabic ? '-- بدون تخصيص (كود عام / قسيمة) --' : '-- Generic / Voucher Code --'}</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {isArabic ? s.fullNameAr : s.fullName} ({s.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {isArabic ? 'بادئة الكود المخصصة (اختياري)' : 'Custom Prefix (Optional)'}
                </label>
                <input
                  type="text"
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value)}
                  placeholder="e.g. SSP-PRO-VIP"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {isArabic ? 'ملاحظات / مرجع الدفع' : 'Payment Reference / Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isArabic ? 'مثال: فودافون كاش رقم الإيصال 99410' : 'e.g. Vodafone Cash Ref #99410'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-blue hover:bg-brand-blue-dark text-white shadow-glow-blue flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isArabic ? 'توليد الكود الآن' : 'Generate Code Now'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RESULT MODAL UPON GENERATION */}
      {latestCode && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border-2 border-emerald-500/50 shadow-2xl space-y-4 bg-slate-900 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-glow-whatsapp animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                {isArabic ? 'تم إنشاء كود التفعيل بنجاح!' : 'Activation Code Created!'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isArabic ? 'يمكنك نسخه ومشاركته مباشرة مع الطالب عبر واتساب.' : 'Ready to be dispatched to the student via WhatsApp.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-mono text-base font-black text-brand-blue-electric tracking-widest select-all">
                {latestCode.code}
              </div>
              <div className="text-xs text-slate-400">
                {latestCode.plan} • {latestCode.durationMonths} {isArabic ? 'أشهر' : 'months'} • {latestCode.maxDevices} {isArabic ? 'أجهزة' : 'devices'}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => copyToClipboard(latestCode.code, 'latest')}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedCodeId === 'latest' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCodeId === 'latest' ? (isArabic ? 'تم النسخ!' : 'Copied!') : (isArabic ? 'نسخ الكود' : 'Copy Code')}</span>
              </button>

              <button
                onClick={() => shareViaWhatsApp(latestCode)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-brand-whatsapp hover:bg-brand-whatsapp-hover text-white flex items-center justify-center gap-1.5 transition-colors shadow-glow-whatsapp"
              >
                <Share2 className="w-4 h-4" />
                <span>{isArabic ? 'إرسال عبر واتساب' : 'WhatsApp Share'}</span>
              </button>
            </div>

            <button
              onClick={() => setLatestCode(null)}
              className="w-full py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
