/**
 * Firebase bootstrap (Firestore + Auth + Analytics — بدون Storage)
 * ----------------------------------------------------
 * الإعدادات بتُقرأ من متغيّرات البيئة (VITE_FIREBASE_*) مع fallback
 * على إعدادات المشروع الرسمية، فالتطبيق بيشتغل بدون أي خطوة إعداد.
 *
 * The config is read from VITE_FIREBASE_* env vars with a fallback to the
 * official project config, so the app works out of the box.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBTCE6LNQSjCm9-K31iR-SDguJI1ytDkK8',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'study-managment-45332.firebaseapp.com',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || 'https://study-managment-45332-default-rtdb.firebaseio.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'study-managment-45332',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '823484662664',
  appId: env.VITE_FIREBASE_APP_ID || '1:823484662664:web:424b2c3c15a0cc6a5bb03d',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-JZHNEJF9RG'
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Firestore with an IndexedDB persistent cache:
 * - يعرض البيانات المحفوظة فوراً عند إعادة التحميل (بدون انتظار الشبكة)
 * - يشتغل أوفلاين ويكمّل المزامنة لما الاتصال يرجع
 */
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalAutoDetectLongPolling: true,
      // Firestore بيرفض أي حقل قيمته undefined ويرجّع invalid-argument.
      // الخيار ده بيشيل الحقول الفاضية بدل ما العملية تفشل كلها.
      ignoreUndefinedProperties: true
    });
  } catch {
    // لو تمت التهيئة مسبقاً (HMR) أو فشل الـ IndexedDB
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    });
  }
})();

/** Firebase Auth — تسجيل دخول حقيقي (كلمة السر مش في الكود) */
export const auth: Auth = getAuth(app);

/** Analytics is optional (unsupported in some browsers / SSR previews). */
let analyticsInstance: Analytics | null = null;
export const initAnalytics = async (): Promise<Analytics | null> => {
  if (analyticsInstance) return analyticsInstance;
  try {
    if (await isSupported()) {
      analyticsInstance = getAnalytics(app);
    }
  } catch {
    /* ignore - analytics must never break the app */
  }
  return analyticsInstance;
};

/** Collection names used across the app */
export const COLLECTIONS = {
  students: 'students',
  auditLogs: 'auditLogs',
  activationCodes: 'activationCodes',
  /** بقايا قديمة من زمن رفع الملفات — بتتمسح في «حذف كل البيانات» بس */
  bookFiles: 'bookFiles',
  staff: 'staff',
  meta: 'appMeta'
} as const;
/*
 * ملاحظة: Firebase Storage **مش مستخدم خالص** (بفلوس وبدون Blaze).
 * مفيش أي import لـ firebase/storage في المشروع، و`storage.rules` بيقفل كل المسارات.
 */
