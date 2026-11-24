import React from 'react';
import { Student } from '../../types';
import { Avatar } from '../common/Avatar';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteStudentModalProps {
  student: Student;
  isArabic: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({ student, isArabic, onCancel, onConfirm }) => {
  const name = isArabic ? student.fullNameAr || student.fullName : student.fullName;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-red-500/40 bg-slate-900 p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-950 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {isArabic ? 'حذف الطالب نهائياً؟' : 'Delete this student permanently?'}
          </h3>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
          <Avatar src={student.avatarUrl} name={name} gender={student.gender} className="w-12 h-12 rounded-xl" />
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">{name}</div>
            <div className="text-[11px] text-slate-400 truncate" dir="ltr">{student.email}</div>
            <div className="text-[10px] font-mono text-slate-500">{student.studentId}</div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isArabic
            ? 'هيتحذف حساب الطالب وكل خطط مذاكرته وبياناته. العملية دي مش ممكن التراجع عنها، وهتتسجل في سجل التدقيق.'
            : 'The student account, all study plans and data will be removed. This cannot be undone and is recorded in the audit log.'}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-3 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isArabic ? 'نعم، احذف' : 'Yes, delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
