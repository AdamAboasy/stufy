/**
 * المصادقة الحقيقية على Firebase Auth
 * =====================================
 * - كلمة السر مش موجودة في الكود نهائياً (بتتخزن مشفّرة في Firebase).
 * - الأدوار بتتقرأ من مستند الموظف `staff/{uid}`: SUPER_ADMIN / STUDENT_ADMIN / STUDENT.
 * - أول مرة: لو مفيش أي أدمن، بنعمل واحد من نفس شاشة الدخول (Setup)، وبنقفل
 *   «نافذة التهيئة» بكتابة مستند `appMeta/bootstrap` — بعدها قواعد الأمان
 *   بترفض أي محاولة إنشاء أدمن جديد من المتصفح.
 * - الطلبة كمان عندهم حساب Firebase Auth حقيقي (إيميل + كلمة سر).
 *
 * All authentication is real Firebase Auth. Roles live in `staff/{uid}`.
 * Passwords never exist in the client bundle.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  limit,
  query
} from 'firebase/firestore';
import { auth, db, COLLECTIONS } from './firebase';
import { UserRole } from '../types';

export interface AppSession {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  /** معرّف طالب لو الدور طالب/أدمن طالب */
  studentId?: string;
}

const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'STUDENT_ADMIN'];

export const isAdminRole = (role?: UserRole | null): boolean =>
  !!role && ADMIN_ROLES.includes(role);

/** رسائل الأخطاء ثنائية اللغة (بتظهر للمستخدم زي ما هي) */
export const mapAuthError = (code: string, isArabic: boolean): string => {
  const ar: Record<string, string> = {
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد.',
    'auth/email-already-in-use': 'هذا البريد مسجّل بالفعل، جرّب تسجيل الدخول.',
    'auth/weak-password': 'كلمة المرور ضعيفة (٦ أحرف على الأقل).',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
    'auth/too-many-requests': 'محاولات كثيرة — جرّب بعد شوية.',
    'auth/network-request-failed': 'مشكلة في الشبكة.',
    'auth/operation-not-allowed':
      'تسجيل الدخول بالإيميل/الباسورد غير مُفعّل في Firebase Auth (فعّله من Console → Authentication → Sign-in method).',
    'auth/admin-restricted-operation': 'العملية مقفولة من إعدادات Firebase.',
    'auth/requires-recent-login': 'سجّل الخروج والدخول تاني لإتمام العملية.',
    'permission-denied':
      'القواعد منعت العملية (permission-denied). راجع قواعد Firestore في Console.'
  };
  const en: Record<string, string> = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong password.',
    'auth/user-not-found': 'No account found for this email.',
    'auth/email-already-in-use': 'This email is already registered — try signing in.',
    'auth/weak-password': 'Password is too weak (6+ characters).',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts — try again shortly.',
    'auth/network-request-failed': 'Network error.',
    'auth/operation-not-allowed':
      'Email/password sign-in is disabled in Firebase Auth (enable it in Console → Authentication → Sign-in method).',
    'auth/requires-recent-login': 'Sign out and in again to finish this action.',
    'permission-denied': 'Blocked by security rules (permission-denied). Check your Firestore rules.'
  };
  const table = isArabic ? ar : en;
  return table[code] || code;
};

const errCode = (error: unknown) => (error as { code?: string })?.code || String(error);

/* ------------------------------------------------------------------ */
/*  Staff roles                                                       */
/* ------------------------------------------------------------------ */

export const getStaffRole = async (
  uid: string
): Promise<{ role: UserRole; studentId?: string } | null> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.staff, uid));
    if (!snap.exists()) return null;
    const data = snap.data() as { role?: UserRole; studentId?: string };
    if (!data.role) return null;
    return { role: data.role, studentId: data.studentId };
  } catch {
    return null;
  }
};

const saveStaffRole = async (
  uid: string,
  email: string,
  role: UserRole,
  studentId?: string
): Promise<void> => {
  await setDoc(
    doc(db, COLLECTIONS.staff, uid),
    {
      uid,
      email: email.toLowerCase(),
      role,
      studentId: studentId || null,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

export const setStaffRole = async (
  uid: string,
  email: string,
  role: UserRole,
  studentId?: string
): Promise<boolean> => {
  try {
    await saveStaffRole(uid, email, role, studentId);
    return true;
  } catch {
    return false;
  }
};

/**
 * هل تم إنهاء تهيئة أول أدمن؟
 * بنقرأ مستند `appMeta/bootstrap` (قراءة عامة مسموحة) بدل قراءة قائمة الموظفين
 * عشان إيميلات الإدارة تفضل خاصة.
 */
export const superAdminExists = async (): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.meta, 'bootstrap'));
    return snap.exists();
  } catch {
    return true; // الأأمن: نفترض إن فيه أدمن
  }
};

const closeBootstrapWindow = async (): Promise<void> => {
  await setDoc(
    doc(db, COLLECTIONS.meta, 'bootstrap'),
    { initialized: true, initializedAt: serverTimestamp() },
    { merge: true }
  ).catch(() => undefined);
};

/* ------------------------------------------------------------------ */
/*  Session                                                           */
/* ------------------------------------------------------------------ */

const resolveSession = async (user: FirebaseUser): Promise<AppSession> => {
  const staff = await getStaffRole(user.uid);
  const email = (user.email || '').toLowerCase();
  return {
    uid: user.uid,
    email,
    // مفيش دور مسجّل ⇒ أقل صلاحية ممكنة (طالب)، مش أدمن
    role: staff?.role || 'STUDENT',
    displayName: user.displayName || undefined,
    studentId: staff?.studentId
  };
};

export const watchSession = (
  onSession: (session: AppSession | null) => void
): (() => void) =>
  onAuthStateChanged(auth, async user => {
    if (!user) {
      onSession(null);
      return;
    }
    try {
      onSession(await resolveSession(user));
    } catch {
      onSession({ uid: user.uid, email: (user.email || '').toLowerCase(), role: 'STUDENT' });
    }
  });

export const getCurrentAuthUser = (): FirebaseUser | null => auth.currentUser;

/* ------------------------------------------------------------------ */
/*  Admin                                                             */
/* ------------------------------------------------------------------ */

export const adminSignIn = async (
  email: string,
  password: string,
  isArabic: boolean
): Promise<{ ok: boolean; session?: AppSession; error?: string }> => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const session = await resolveSession(credential.user);

    if (!isAdminRole(session.role)) {
      await fbSignOut(auth);
      return {
        ok: false,
        error: isArabic
          ? 'هذا الحساب لا يملك صلاحية دخول لوحة الإدارة.'
          : 'This account has no admin access.'
      };
    }
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: mapAuthError(errCode(error), isArabic) };
  }
};

/** إنشاء أول حساب للسوبر أدمن (مسموح مرة واحدة قبل إقفال نافذة التهيئة) */
export const createFirstSuperAdmin = async (
  email: string,
  password: string,
  displayName: string,
  isArabic: boolean
): Promise<{ ok: boolean; session?: AppSession; error?: string }> => {
  if (await superAdminExists()) {
    return {
      ok: false,
      error: isArabic
        ? 'يوجد حساب إدارة بالفعل. سجّل الدخول بحسابك، وأي حساب جديد يضيفه السوبر أدمن.'
        : 'An admin account already exists. Sign in instead; new admins are created by the Super Admin.'
    };
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    if (displayName) await updateProfile(credential.user, { displayName }).catch(() => undefined);
    // 1) الدور الأول (القواعد بتسمح بها في نافذة التهيئة فقط)
    await saveStaffRole(credential.user.uid, credential.user.email || email, 'SUPER_ADMIN');
    // 2) إقفال النافذة — بعد كده مفيش حد يقدر يعمل أدمن من المتصفح
    await closeBootstrapWindow();
    const session = await resolveSession(credential.user);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: mapAuthError(errCode(error), isArabic) };
  }
};

/**
 * إنشاء حساب إدارة إضافي — بيتم من داخل جلسة السوبر أدمن.
 * ملاحظة: إنشاء الحساب بيعمل sign-in للمستخدم الجديد، فبعدها لازم الأدمن
 * يعمل دخول تاني (التطبيق بيعرض تنبيه بذلك).
 */
export const createAdminAccount = async (
  email: string,
  password: string,
  role: UserRole,
  isArabic: boolean
): Promise<{ ok: boolean; uid?: string; error?: string }> => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    await saveStaffRole(credential.user.uid, credential.user.email || email, role);
    return { ok: true, uid: credential.user.uid };
  } catch (error) {
    return { ok: false, error: mapAuthError(errCode(error), isArabic) };
  }
};

export const adminSignOut = async (): Promise<void> => {
  try {
    await fbSignOut(auth);
  } catch {
    /* ignore */
  }
};

export const sendAdminPasswordReset = async (
  email: string,
  isArabic: boolean
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapAuthError(errCode(error), isArabic) };
  }
};

/* ------------------------------------------------------------------ */
/*  Students (نفس Firebase Auth — أدوار أقل)                          */
/* ------------------------------------------------------------------ */

/**
 * بيضمن وجود حساب Auth للطالب:
 * - لو الحساب موجود بالفعل (تسجيل سابق ناقص) بيسجّل الدخول بيه.
 * - لو جديد بينشئه.
 */
export const studentEnsureAccount = async (
  email: string,
  password: string,
  isArabic: boolean
): Promise<{ ok: boolean; uid?: string; error?: string }> => {
  const clean = email.trim().toLowerCase();
  const isTaken = (code: string) =>
    code === 'auth/email-already-in-use' || code === 'permission-denied';

  try {
    const credential = await createUserWithEmailAndPassword(auth, clean, password);
    return { ok: true, uid: credential.user.uid };
  } catch (error) {
    if (isTaken(errCode(error))) {
      try {
        const credential = await signInWithEmailAndPassword(auth, clean, password);
        return { ok: true, uid: credential.user.uid };
      } catch (signInError) {
        const signInCode = errCode(signInError);
        return {
          ok: false,
          error:
            signInCode === 'auth/invalid-credential' || signInCode === 'auth/wrong-password'
              ? isArabic
                ? '❌ البريد الإلكتروني ده مسجّل بالفعل. سجّل الدخول بنفس البريد وكلمة المرور من صفحة الدخول.'
                : '❌ This email is already registered. Sign in with the same email and password from the login page.'
              : mapAuthError(signInCode, isArabic)
        };
      }
    }
    return { ok: false, error: mapAuthError(errCode(error), isArabic) };
  }
};

/** ربط حساب Auth بمستند الطالب (الدور STUDENT + معرّف الطالب) */
export const linkStudentAccount = async (
  uid: string,
  email: string,
  studentId: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    await saveStaffRole(uid, email, 'STUDENT', studentId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errCode(error) };
  }
};

/** رفع الطالب لأدمن طالب أو إلغاء الصلاحية (بيتطلب جلسة سوبر أدمن) */
export const setStudentAdminRole = async (
  email: string,
  studentId: string,
  promote: boolean
): Promise<boolean> => {
  try {
    // نلاقي uid من مستندات staff بالبريد
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.staff), limit(200))
    );
    const target = snapshot.docs.find(
      d => String((d.data() as { email?: string }).email || '').toLowerCase() === email.toLowerCase()
    );
    if (!target) return false;
    await saveStaffRole(
      target.id,
      email,
      promote ? 'STUDENT_ADMIN' : 'STUDENT',
      studentId
    );
    return true;
  } catch {
    return false;
  }
};

/** دخول الطالب الحقيقي (إيميل + كلمة سر) */
export const studentSignIn = async (
  email: string,
  password: string,
  isArabic: boolean
): Promise<{ ok: boolean; session?: AppSession; error?: string }> => {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    const session = await resolveSession(credential.user);
    return { ok: true, session };
  } catch (error) {
    return { ok: false, error: mapAuthError(errCode(error), isArabic) };
  }
};
