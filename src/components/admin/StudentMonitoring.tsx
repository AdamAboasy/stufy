import React, { useState, useMemo } from 'react';
import { Student, SubscriptionPlan, AccountStatus } from '../../types';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  Edit3, 
  Key, 
  ChevronLeft, 
  ChevronRight, 
  Smartphone, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  GraduationCap, 
  BookOpen, 
  Sparkles,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

interface StudentMonitoringProps {
  students: Student[];
  isArabic: boolean;
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onLaunchSupportMode: (student: Student) => void;
  onResetPassword: (student: Student) => void;
}

export const StudentMonitoring: React.FC<StudentMonitoringProps> = ({
  students,
  isArabic,
  onSelectStudent,
  onEditStudent,
  onLaunchSupportMode,
  onResetPassword
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'regDate' | 'name' | 'progress' | 'expiry' | 'activity'>('regDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Filter & Sort Logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Search by name, email, phone number, or student ID
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        student.fullName.toLowerCase().includes(query) ||
        student.fullNameAr.includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.phoneNumber.includes(query) ||
        student.studentId.toLowerCase().includes(query) ||
        student.nationalId.includes(query);

      // Filter by subscription plan
      const matchesPlan = planFilter === 'ALL' || student.subscriptionPlan === planFilter;

      // Filter by account status
      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;

      // Filter by expiry date
      let matchesExpiry = true;
      if (expiryFilter !== 'ALL') {
        const now = new Date().getTime();
        const expiry = new Date(student.subscriptionExpiryDate).getTime();
        const diffDays = (expiry - now) / (1000 * 3600 * 24);

        if (expiryFilter === 'EXPIRED') {
          matchesExpiry = diffDays < 0;
        } else if (expiryFilter === 'EXPIRING_7') {
          matchesExpiry = diffDays >= 0 && diffDays <= 7;
        } else if (expiryFilter === 'EXPIRING_30') {
          matchesExpiry = diffDays >= 0 && diffDays <= 30;
        } else if (expiryFilter === 'ACTIVE_LONG') {
          matchesExpiry = diffDays > 30;
        }
      }

      return matchesSearch && matchesPlan && matchesStatus && matchesExpiry;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'regDate') {
        comparison = new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
      } else if (sortBy === 'name') {
        comparison = a.fullName.localeCompare(b.fullName);
      } else if (sortBy === 'progress') {
        comparison = a.overallProgress - b.overallProgress;
      } else if (sortBy === 'expiry') {
        comparison = new Date(a.subscriptionExpiryDate).getTime() - new Date(b.subscriptionExpiryDate).getTime();
      } else if (sortBy === 'activity') {
        comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [students, searchTerm, planFilter, statusFilter, expiryFilter, sortBy, sortOrder]);

  // Pagination calculation
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Overall KPI metrics
  const activeCount = students.filter(s => s.status === 'Active').length;
  const expiring7Count = students.filter(s => {
    const diff = (new Date(s.subscriptionExpiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const avgProgress = Math.round(students.reduce((acc, s) => acc + s.overallProgress, 0) / (students.length || 1));

  const resetAllFilters = () => {
    setSearchTerm('');
    setPlanFilter('ALL');
    setStatusFilter('ALL');
    setExpiryFilter('ALL');
    setSortBy('regDate');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const getStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case 'Active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">{isArabic ? 'نشط' : 'Active'}</span>;
      case 'Suspended':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-500/30">{isArabic ? 'معلّق' : 'Suspended'}</span>;
      case 'Expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-400 border border-amber-500/30">{isArabic ? 'منتهي' : 'Expired'}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'Elite VIP':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-950 text-purple-300 border border-purple-500/40">👑 Elite VIP</span>;
      case 'Pro':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-950 text-brand-blue-electric border border-brand-blue/40">⚡ Pro</span>;
      case 'Basic':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-sky-300 border border-slate-700">Basic</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Free Trial</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'إجمالي الطلاب المسجلين' : 'Total Registered Students'}</div>
            <div className="text-2xl font-black text-white mt-1">{students.length}</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">{isArabic ? 'جميع المراحل الثانوية' : 'All Academic Stages'}</div>
          </div>
          <div className="p-3 rounded-2xl bg-brand-blue/20 text-brand-blue-electric border border-brand-blue/30 shadow-glow-blue/20">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'المشتركون النشطون' : 'Active Subscriptions'}</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{Math.round((activeCount / students.length) * 100)}% {isArabic ? 'نسبة النشاط' : 'Active Ratio'}</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'ينتهي خلال 7 أيام' : 'Expiring Within 7 Days'}</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{expiring7Count}</div>
            <div className="text-[11px] text-amber-300 mt-0.5">{isArabic ? 'يتطلب إشعار تجديد' : 'Renewal Needed'}</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-950 text-amber-400 border border-amber-500/30">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-semibold">{isArabic ? 'متوسط التقدم الدراسي' : 'Avg Study Progress'}</div>
            <div className="text-2xl font-black bg-gradient-to-r from-brand-blue-electric to-brand-purple-light bg-clip-text text-transparent mt-1">
              {avgProgress}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isArabic ? 'معدل إكمال المهام' : 'Curriculum Completion'}</div>
          </div>
          <div className="p-3 rounded-2xl bg-purple-950 text-brand-purple-light border border-purple-500/30 shadow-glow-purple/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search, Multi-Filter, and Sorting Controls Card */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800 space-y-4">
        
        {/* Row 1: Search & Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-3.5 right-3.5 rtl:right-3.5 rtl:left-auto" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isArabic ? 'بحث بالاسم، الإيميل، رقم الهاتف، أو كود الطالب...' : 'Search student name, email, phone, or ID...'}
              className="w-full pr-10 pl-4 rtl:pr-10 rtl:pl-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric focus:ring-2 focus:ring-brand-blue-electric/20 text-white text-xs placeholder-slate-500 transition-all"
            />
          </div>

          {/* Subscription Plan Filter */}
          <div>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-xs"
            >
              <option value="ALL">{isArabic ? 'جميع الباقات (All Plans)' : 'All Subscription Plans'}</option>
              <option value="Elite VIP">👑 Elite VIP</option>
              <option value="Pro">⚡ Pro</option>
              <option value="Basic">Basic</option>
              <option value="Free">Free Trial</option>
            </select>
          </div>

          {/* Account Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-xs"
            >
              <option value="ALL">{isArabic ? 'جميع الحالات (All Status)' : 'All Account Statuses'}</option>
              <option value="Active">{isArabic ? 'نشط (Active)' : 'Active'}</option>
              <option value="Suspended">{isArabic ? 'معلّق (Suspended)' : 'Suspended'}</option>
              <option value="Expired">{isArabic ? 'منتهي (Expired)' : 'Expired'}</option>
              <option value="Pending">{isArabic ? 'قيد الانتظار (Pending)' : 'Pending'}</option>
            </select>
          </div>

          {/* Expiry Date Filter */}
          <div>
            <select
              value={expiryFilter}
              onChange={(e) => {
                setExpiryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 focus:border-brand-blue-electric text-white text-xs"
            >
              <option value="ALL">{isArabic ? 'كل تواريخ الانتهاء' : 'All Expiry Dates'}</option>
              <option value="EXPIRING_7">{isArabic ? 'ينتهي خلال 7 أيام' : 'Expiring in 7 Days'}</option>
              <option value="EXPIRING_30">{isArabic ? 'ينتهي خلال 30 يوم' : 'Expiring in 30 Days'}</option>
              <option value="EXPIRED">{isArabic ? 'منتهي الصلاحية' : 'Expired Subscriptions'}</option>
              <option value="ACTIVE_LONG">{isArabic ? 'ساري أكثر من شهر' : 'Active > 30 Days'}</option>
            </select>
          </div>

        </div>

        {/* Row 2: Sorting, Page Size, and Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold">{isArabic ? 'ترتيب حسب:' : 'Sort By:'}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium"
            >
              <option value="regDate">{isArabic ? 'تاريخ التسجيل' : 'Registration Date'}</option>
              <option value="name">{isArabic ? 'اسم الطالب' : 'Student Name'}</option>
              <option value="progress">{isArabic ? 'نسبة التقدم الدراسي' : 'Study Progress'}</option>
              <option value="expiry">{isArabic ? 'تاريخ انتهاء الاشتراك' : 'Expiry Date'}</option>
              <option value="activity">{isArabic ? 'آخر ظهور ونشاط' : 'Last Activity'}</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'asc' ? (isArabic ? 'تصاعدي' : 'Asc') : (isArabic ? 'تنازلي' : 'Desc')}</span>
            </button>

            {(searchTerm || planFilter !== 'ALL' || statusFilter !== 'ALL' || expiryFilter !== 'ALL') && (
              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-950/50 hover:bg-red-900/50 text-red-300 border border-red-500/30 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isArabic ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">{isArabic ? 'عدد العناصر بالصفحة:' : 'Page size:'}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main Student Records Interactive Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
            
            {/* Table Header with all required columns */}
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-4 px-4">{isArabic ? 'الطالب وبيانات الهوية' : 'Student & ID'}</th>
                <th className="py-4 px-4">{isArabic ? 'الاتصال والبريد' : 'Contact Info'}</th>
                <th className="py-4 px-4">{isArabic ? 'الباقة وتاريخ الانتهاء' : 'Plan & Expiry'}</th>
                <th className="py-4 px-4">{isArabic ? 'الأجهزة المسجلة' : 'Devices'}</th>
                <th className="py-4 px-4">{isArabic ? 'الملفات والخطط' : 'PDFs & Plans'}</th>
                <th className="py-4 px-4">{isArabic ? 'التقدم الدراسي' : 'Study Progress'}</th>
                <th className="py-4 px-4">{isArabic ? 'آخر نشاط' : 'Last Activity'}</th>
                <th className="py-4 px-4 text-center">{isArabic ? 'الإجراءات الإدارية' : 'Actions'}</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/70">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                    {isArabic ? 'لم يتم العثور على أي طلاب مطابقين لمعايير البحث الحالية.' : 'No students match your query criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const expiryDateObj = new Date(student.subscriptionExpiryDate);
                  const isExpiringSoon = (expiryDateObj.getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 7;

                  return (
                    <tr 
                      key={student.id}
                      className="hover:bg-slate-900/50 transition-colors group cursor-pointer"
                      onClick={() => onSelectStudent(student)}
                    >
                      {/* Full Name, Avatar, Student ID */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatarUrl}
                            alt={student.fullName}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0 group-hover:border-brand-blue transition-colors"
                          />
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-brand-blue-electric transition-colors">
                              {isArabic ? student.fullNameAr : student.fullName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {student.studentId}
                              </span>
                              {getStatusBadge(student.status)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info (Email, Phone) */}
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="text-slate-300 font-medium truncate max-w-[180px]" title={student.email}>
                          {student.email}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] mt-0.5" dir="ltr">
                          {student.phoneNumber}
                        </div>
                      </td>

                      {/* Subscription Plan & Expiry Date */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          {getPlanBadge(student.subscriptionPlan)}
                        </div>
                        <div className={`text-[11px] font-mono ${isExpiringSoon ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                          {expiryDateObj.toLocaleDateString()}
                          {isExpiringSoon && <span className="ml-1 text-[10px] text-amber-300">⚠️</span>}
                        </div>
                      </td>

                      {/* Registered Devices */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-brand-blue-light shrink-0" />
                          <span className="font-bold text-white">
                            {student.registeredDevices.length}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {isArabic ? 'أجهزة' : 'devices'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px] mt-0.5">
                          {student.registeredDevices[0]?.deviceName || 'None'}
                        </div>
                      </td>

                      {/* Number of Uploaded PDFs & Study Plans */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <FileText className="w-3.5 h-3.5 text-red-400" />
                          <span className="font-semibold">{student.uploadedPdfs.length} {isArabic ? 'كتب PDF' : 'PDFs'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                          <BookOpen className="w-3.5 h-3.5 text-brand-blue-light" />
                          <span>{student.studyPlans.length} {isArabic ? 'خطط مذاكرة' : 'Plans'}</span>
                        </div>
                      </td>

                      {/* Overall Study Progress Bar */}
                      <td className="py-4 px-4 min-w-[130px]">
                        <div className="flex items-center justify-between mb-1 text-[11px]">
                          <span className="text-slate-400">{isArabic ? 'الإنجاز' : 'Progress'}</span>
                          <span className="font-bold text-brand-blue-light">{student.overallProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-brand-blue to-brand-purple h-full rounded-full transition-all duration-500" 
                            style={{ width: `${student.overallProgress}%` }}
                          />
                        </div>
                      </td>

                      {/* Last Activity */}
                      <td className="py-4 px-4 text-slate-400 text-[11px]">
                        <div className="font-medium text-slate-300">
                          {new Date(student.lastActivity).toLocaleDateString()}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {new Date(student.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Admin Quick Action Buttons */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          
                          {/* Inspect / Support Mode */}
                          <button
                            onClick={() => onLaunchSupportMode(student)}
                            title={isArabic ? 'معاينة تجربة الطالب (Support Mode)' : 'Inspect Student Experience (Support Mode)'}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Student */}
                          <button
                            onClick={() => onEditStudent(student)}
                            title={isArabic ? 'تعديل بيانات الطالب' : 'Edit Student'}
                            className="p-1.5 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue-electric border border-brand-blue/30 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Password Reset Workflow */}
                          <button
                            onClick={() => onResetPassword(student)}
                            title={isArabic ? 'إعادة ضبط كلمة المرور' : 'Password Reset'}
                            className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Full Profile */}
                          <button
                            onClick={() => onSelectStudent(student)}
                            className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                          >
                            {isArabic ? 'الملف' : 'Profile'}
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-400">
            {isArabic
              ? `عرض ${paginatedStudents.length} من أصل ${totalStudents} طالب (إجمالي المسجلين: ${students.length})`
              : `Showing ${paginatedStudents.length} of ${totalStudents} students (Total: ${students.length})`}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 transition-colors"
              title="Previous Page"
            >
              <ChevronRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl font-bold transition-colors ${
                    currentPage === pageNum
                      ? 'bg-brand-blue text-white shadow-glow-blue/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 transition-colors"
              title="Next Page"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
