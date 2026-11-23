import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  UserCheck, 
  User, 
  ArrowRight, 
  Lock, 
  FileCheck2, 
  ShieldAlert 
} from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditLog[];
  isArabic: boolean;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, isArabic }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'ADMIN' | 'STUDENT'>('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSource = sourceFilter === 'ALL' || log.actionSource === sourceFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      log.studentName.toLowerCase().includes(term) ||
      log.targetStudentId.toLowerCase().includes(term) ||
      log.adminId.toLowerCase().includes(term) ||
      log.changedField.toLowerCase().includes(term) ||
      log.reason.toLowerCase().includes(term);

    return matchesSource && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-950/80 text-brand-purple-light border border-purple-500/40 shadow-glow-purple/20">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">
                {isArabic ? 'سجل التدقيق الأمني غير القابل للتعديل' : 'Immutable Security Audit Trail'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {isArabic ? 'سجل مشفر غير قابل للمسح' : 'Tamper-Proof & Append-Only'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isArabic 
                ? 'توثيق رسمي لكافة الإجراءات الإدارية وتعديلات بيانات الطلاب مع فصل واضح بين أفعال المسؤول وأفعال الطالب.'
                : 'Comprehensive audit logging of all administrative actions and student self-actions with strict attribution.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <span className="text-xs font-bold text-slate-400">{isArabic ? 'إجمالي السجلات:' : 'Total Events:'}</span>
          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 font-mono text-sm font-bold text-brand-blue-light">
            {logs.length}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute top-3 right-3 rtl:right-3 rtl:left-auto" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isArabic ? 'بحث باسم الطالب، المعرف، الحقل...' : 'Search student, ID, field...'}
            className="w-full pr-9 pl-4 rtl:pr-9 rtl:pl-4 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-brand-blue-electric text-white text-xs"
          />
        </div>

        {/* Source Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSourceFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              sourceFilter === 'ALL'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            {isArabic ? 'الكل' : 'All Events'}
          </button>
          <button
            onClick={() => setSourceFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
              sourceFilter === 'ADMIN'
                ? 'bg-brand-purple text-white shadow-glow-purple/40'
                : 'bg-slate-950 text-purple-300 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isArabic ? 'إجراءات الإدارة فقط' : 'Admin Actions'}</span>
          </button>
          <button
            onClick={() => setSourceFilter('STUDENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
              sourceFilter === 'STUDENT'
                ? 'bg-brand-blue text-white shadow-glow-blue/40'
                : 'bg-slate-950 text-sky-300 hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{isArabic ? 'إجراءات الطالب فقط' : 'Student Actions'}</span>
          </button>
        </div>

      </div>

      {/* Logs Table / Cards */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            {isArabic ? 'لا توجد سجلات مطابقة لمعايير البحث.' : 'No audit records match the current filters.'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isAdmin = log.actionSource === 'ADMIN';
            return (
              <div
                key={log.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isAdmin 
                    ? 'bg-slate-900/90 border-purple-500/30 hover:border-purple-500/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* Left: Source Badge & Target Student */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isAdmin ? 'bg-purple-950 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-sky-300'
                    }`}>
                      {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isAdmin 
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/40' 
                            : 'bg-blue-950 text-sky-300 border border-sky-500/40'
                        }`}>
                          {isAdmin ? (isArabic ? 'إجراء مسؤول (ADMIN)' : 'ADMIN ACTION') : (isArabic ? 'إجراء طالب (STUDENT)' : 'STUDENT SELF-ACTION')}
                        </span>
                        
                        <span className="font-bold text-white text-sm">
                          {log.studentName}
                        </span>

                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {log.targetStudentId}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-300">
                          {isAdmin ? `${isArabic ? 'المسؤول: ' : 'Admin: '} ${log.adminName} (${log.adminId})` : `${isArabic ? 'المصدر: ' : 'Source: '} حساب الطالب الشخصي`}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-brand-blue-light font-bold">
                          {isArabic ? `الحقل المعدل: ` : `Field: `} [{log.changedField}]
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 self-end lg:self-center font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>

                </div>

                {/* Modification Values Diff Box */}
                <div className="mt-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-medium">{isArabic ? 'القيمة السابقة:' : 'Old Value:'}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-red-950/50 text-red-300 font-mono line-through border border-red-500/30">
                      {log.oldValue}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 rtl:rotate-180" />
                    <span className="text-slate-400 font-medium">{isArabic ? 'القيمة الجديدة:' : 'New Value:'}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                      {log.newValue}
                    </span>
                  </div>

                  {/* Reason Note */}
                  <div className="text-slate-300 text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 max-w-md">
                    <span className="font-bold text-amber-300/90">{isArabic ? 'السبب: ' : 'Reason: '}</span>
                    <span>{log.reason}</span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
