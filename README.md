# إدارة المذاكرة — Smart Study Planner

تطبيق لتنظيم المذاكرة باستخدام Firebase: ملفات تعليمية خاصة، وحدات مذاكرة قائمة على الدروس، تخطيط قابل للتعديل، وواجهة عربية RTL / إنجليزية LTR مع الوضعين الفاتح والداكن.

- **التقنية:** Next.js App Router + TypeScript + Firebase Authentication وFirestore وStorage، مع Firebase Cloud Functions للإجراءات الموثوقة ومعالجة الملفات.
- **الصلاحيات:** الدور الإداري يُقرأ من Firebase Authentication custom claims فقط؛ بيانات الدور في Firestore للعرض وليست مصدر صلاحية. لا يوجد تسجيل عام للمشرفين.
- **البيانات القديمة:** تظل سجلات المهام والصفحات القديمة محفوظة للتوافق؛ الشاشات الرئيسية الجديدة تعرض الدروس كمقياس أساسي.
- **حدود المعالجة الحالية:** تحليل النص متاح لملفات PDF النصية عند إعداد مفتاح Gemini. ملفات PDF الممسوحة أو قليلة النص تُحوّل إلى «تحتاج مراجعة» لعدم وجود OCR مهيأ. ملفات DOC/DOCX والصور تُحفظ بشكل خاص لكن استخراج الدروس الآلي لها غير مفعّل بعد.

## الصفحات

| الصفحة | الوظيفة |
|---|---|
| `/` | الصفحة الرئيسية |
| `/login` و`/register` | تسجيل الدخول والتسجيل مع بيانات المستوى الدراسي |
| `/dashboard` | إحصاءات الدروس والتقدم والمهام اليومية |
| `/subjects` | المواد وتقدم الدروس |
| `/plan` | معاينة وتعديل خطة الدروس وحفظها |
| `/tasks` | قائمة الدروس وفلاتر الحالة |
| `/library` | رفع الملفات الخاصة، المعاينة، حالة المعالجة وإدارة الدروس المستخرجة |
| `/settings` | اللغة والمظهر والاسم والبيانات الدراسية |
| `/admin` | دليل الطلاب وإدارة الأدوار، للمشرف الموثق فقط |

## إعداد Firebase

1. فعّل **Email/Password** في Firebase Authentication، وأنشئ Firestore وStorage.
2. أضف تطبيق Web في إعدادات Firebase واضبط متغيرات `.env.local` وفق `.env.example`.
3. راجع `firebase/firestore.rules` و`firebase/storage.rules` قبل نشر القواعد. قواعد Firestore تقصر بيانات المستخدم على مالكها، وتحمي حقول الدور والمعالجة؛ قواعد Storage تفرض الملكية ونوع الملف والحجم (25 MiB).
4. ثبّت Firebase CLI وسجّل الدخول ثم اختر المشروع الصحيح، وبعد مراجعة التغييرات انشر القواعد والوظائف عند اعتماد النشر:

   ```bash
   firebase use study-managment-45332
   firebase deploy --only firestore:rules,storage,functions
   ```

   **هذا الأمر للنشر المقصود فقط؛ لم يجرِ نشر أي مورد Firebase ضمن هذا التعديل.**

### تحليل PDF النصي باستخدام Gemini (اختياري)

تحتاج وظيفة تحليل الدروس إلى مفتاح Gemini محفوظ كسرّ Firebase Functions، لا كمتغير عام في الواجهة. عند تهيئته، يُرسل نص PDF المستخرج إلى Google Gemini للتحليل. لأن الوظيفة تربط هذا السر وقت التشغيل، يجب إنشاء السر قبل نشر Functions:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
```

يمكن ضبط `GEMINI_MODEL` كمتغير بيئة للوظائف؛ الافتراضي `gemini-2.5-flash`. إذا لم يكن المفتاح متاحًا، تحفظ الوظيفة حالة الملف «تحتاج مراجعة» ولا تدّعي اكتمال التحليل. لا يوجد OCR حاليًا، كما أن الاستخراج الآلي لـDOC/DOCX والصور غير مفعّل.

### إعداد أول Super Admin

لا توجد صفحة تسجيل عامة للمشرف. بعد إنشاء حساب موثوق، شغّل أداة bootstrap محليًا في بيئة لها Google Application Default Credentials مخوّلة للمشروع. يمكن ترقية المشرف إما بـUID مباشرًا أو بالبريد الإلكتروني:

```bash
export SUPER_ADMIN_EMAIL="adam.sherif.aboasy@gmail.com"
npm run bootstrap-admin --prefix functions
```

أو باستخدام UID مباشر:

```bash
export SUPER_ADMIN_UID="<existing-firebase-auth-uid>"
npm run bootstrap-admin --prefix functions
```

الأداة تبحث عن الحساب حسب البريد (عند استخدام `SUPER_ADMIN_EMAIL`) أو تستخدم الـUID مباشرة، ثم تضيف custom claim وتحدّث ملف Firestore. يجب على المستخدم تحديث Firebase ID token لتظهر الصلاحية. احتفظ بالبريد واعتماد Google في بيئة موثوقة، ولا تضع بيانات الاعتماد في المتصفح أو المستودع.

## التشغيل والاختبارات

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm install --prefix functions
npm run build --prefix functions
npm test --prefix functions
```

## بنية المشروع

```text
src/app/                  صفحات Next.js، بما فيها لوحة الطالب والمكتبة والإدارة
src/components/           مكونات الواجهة المشتركة
src/lib/auth.tsx          Firebase Auth وحالة الدور المستمدة من claims
src/lib/permissions.ts    مصفوفة صلاحيات قابلة للتوسعة
src/lib/data.ts           عمليات واشتراكات Firestore
src/lib/lesson-planner.ts جدولة الدروس واختباراتها
firebase/firestore.rules  قواعد Firestore
firebase/storage.rules    قواعد تخزين خاصة
functions/src/            صلاحيات موثوقة ومعالجة الملفات
functions/scripts/        أداة إعداد المشرف الأول، ليست endpoint عامة
public/manus-routes.json  بيان مسارات التطبيق
```
