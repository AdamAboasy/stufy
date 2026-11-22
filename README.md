# إدارة المذاكرة — Study Management

تطبيق لتنظيم المذاكرة: ضيف موادك، اختار ميعاد الامتحان وأيام الراحة، وخد جدول يومي بالصفحات المطلوبة بالظبط.

- **التقنية:** Next.js (App Router) + TypeScript + Firebase (Authentication و Firestore) من المتصفح مباشرة.
- **مفيش سيرفر منفصل ولا `firebase-admin`**، فبيشتغل على Vercel من غير مشاكل.
- **اللغات:** عربي (RTL) وإنجليزي، ووضع فاتح/داكن.
- **الخطة:** كل صفحة بتتغطى مرة واحدة بالظبط، وأيام الراحة بتتحترم، ومفيش جدول بيتغير من نفسه (الاستبدال بيحصل بتأكيد منك، والمهام المكتملة ما بتتمسحش).

## الصفحات

| الصفحة | الوظيفة |
|---|---|
| `/` | الصفحة الرئيسية |
| `/login` و `/register` | تسجيل الدخول وإنشاء حساب (بريد + كلمة مرور) |
| `/dashboard` | تقدمك، مهام النهاردة، المتأخر، والجاي |
| `/subjects` | إضافة المواد (الاسم، عدد الصفحات، ميعاد الامتحان، اللون) |
| `/plan` | توليد الخطة ومعاينتها وحفظها |
| `/tasks` | كل المهام مع فلاتر، وتعليم المهمة كمكتملة |
| `/settings` | اللغة، المظهر، الاسم، تسجيل الخروج |

## الإعداد

### 1) Firebase (مرة واحدة)

1. من [Firebase console](https://console.firebase.google.com) افتح مشروعك (`study-managment-45332`).
2. **Build ← Authentication ← Sign-in method** وفعّل **Email/Password**.
3. **Build ← Firestore Database** واعمل قاعدة بيانات لو مش موجودة.
4. **Firestore ← Rules**: الصق محتوى [`firebase/firestore.rules`](firebase/firestore.rules) واضغط Publish.
   (كل طالب بيقرا ويكتب بياناته هو بس.)
5. **Project settings ← Your apps**: أضف تطبيق **Web** وانسخ القيم (`apiKey`, `appId`, `messagingSenderId`).
6. **Authentication ← Settings ← Authorized domains**: أضف دومين Vercel بتاعك (مثلاً `stufy-rho.vercel.app`).

### 2) متغيرات البيئة

انسخ `.env.example` إلى `.env.local` للتشغيل المحلي، وضيف نفس المتغيرات في **Vercel ← Settings ← Environment Variables**:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

دي مفاتيح عامة مش أسرار، والحماية الحقيقية من قواعد Firestore. بعد إضافتها اعمل **Redeploy**. من غيرها التطبيق بيفتح ويعرض رسالة بتقولك إيه اللي ناقص بدل ما يقع.

## التشغيل المحلي

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # اختبارات منطق الجدول
npm run build
```

## هيكل المشروع

```
src/app/            الصفحات (App Router)
  (app)/            الصفحات المحمية: dashboard, subjects, plan, tasks, settings
src/components/     مكونات مشتركة
src/lib/planner.ts  منطق توليد الجدول (دالة نقية + اختبارات)
src/lib/data.ts     قراءة/كتابة Firestore
src/lib/firebase.ts إعداد Firebase (بيشتغل من المتصفح فقط)
src/lib/i18n.tsx    الترجمة عربي/إنجليزي
firebase/           قواعد Firestore
public/             اللوجو
```
