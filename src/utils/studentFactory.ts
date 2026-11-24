import { EDUCATION_STAGES, Gender, Student, SubscriptionPlan } from '../types';

/** Empty academic data for a brand-new student (no pre-made tasks, subjects or plans). */
export const emptyAcademicData = (): Pick<
  Student,
  'uploadedPdfs' | 'studyPlans' | 'subjects' | 'dailyTasks' | 'revisionPlanner' | 'performanceReport' | 'bookPlans'
> => ({
  uploadedPdfs: [],
  studyPlans: [],
  subjects: [],
  dailyTasks: [],
  bookPlans: [],
  revisionPlanner: {
    targetExamDate: '—',
    daysRemaining: 0,
    rounds: [],
    weakPoints: [],
    nextMockExam: '—'
  },
  performanceReport: {
    overallScore: 0,
    studyStreakDays: 0,
    totalHoursStudied: 0,
    quizAccuracyPercent: 0,
    averageDailyMinutes: 0,
    subjectMastery: [],
    weeklyActivity: []
  }
});

export const stageLabel = (stageValue: string | undefined, isArabic: boolean): string => {
  const stage = EDUCATION_STAGES.find(s => s.value === stageValue);
  return stage ? (isArabic ? stage.ar : stage.en) : '';
};

export interface NewStudentInput {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
  educationStage: string;
  plan: SubscriptionPlan;
  durationMonths: number;
  activationCode: string;
}

export const createStudent = (input: NewStudentInput): Student => {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + input.durationMonths);
  const expiryIso = expiry.toISOString();
  const stage = EDUCATION_STAGES.find(s => s.value === input.educationStage);

  return {
    id: `s-${Date.now()}`,
    studentId: `STU-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName: input.fullName,
    fullNameAr: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    guardianPhoneNumber: '',
    nationalId: '',
    avatarUrl: '',
    gender: input.gender,
    educationStage: input.educationStage,
    academicYear: stage?.en || '',
    academicYearAr: stage?.ar || '',
    status: 'Active',
    subscriptionPlan: input.plan,
    registrationDate: nowIso,
    subscriptionExpiryDate: expiryIso,
    lastActivity: nowIso,
    overallProgress: 0,
    notes: `Registered via activation code ${input.activationCode}`,
    isAdmin: false,
    registeredDevices: [
      {
        id: `dev-${Date.now()}`,
        deviceName: typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent)
          ? 'Mobile browser'
          : 'Web browser',
        deviceType: typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        os: typeof navigator !== 'undefined' ? navigator.platform || 'Unknown' : 'Unknown',
        browser: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Unknown',
        ipAddress: '—',
        deviceFingerprint: `FP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        lastActive: nowIso,
        isCurrent: true
      }
    ],
    activationHistory: [
      {
        id: `act-${Date.now()}`,
        code: input.activationCode,
        plan: input.plan,
        durationMonths: input.durationMonths,
        activatedAt: nowIso,
        expiresAt: expiryIso,
        status: 'Active',
        paymentReference: `VOUCHER-${Math.floor(100000 + Math.random() * 900000)}`,
        paymentMethod: 'Activation Code'
      }
    ],
    ...emptyAcademicData()
  };
};
