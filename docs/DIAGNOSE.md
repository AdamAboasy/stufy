# 🩺 لو حاجة مش شغالة — ابدأ من هنا

افتح في المتصفح: **`/docs/diagnostics/health-check.html`** (على نفس دومين التطبيق).
الصفحة بتفحص كل حاجة لوحدها وبتقولك السبب بالظبط + الخطوة.

| فحص | معنى النتيجة |
| --- | --- |
| **Firestore** | ❌ مش متعملة → Console → Firestore Database → Create database (Production mode) |
| **Email/Password** | ❌ `OPERATION_NOT_ALLOWED` → Authentication → Sign-in method → Email/Password → Enable |
| **Authorized domain** | ❌ الدومين مش مسموح → Authentication → Settings → Authorized domains → Add domain |
| **Storage** | ⚠️ مش مفعّل → مش مشكلة، الكتب بتتخزن على Firestore تلقائياً |
| **التطبيق** | لازم ✔ |

**انسخ التقرير** بالزرار وابعته، وده أسرع طريق للتشخيص.

---

## هل ننقل على قاعدة بيانات تانية (Azure Cosmos DB / Supabase)؟

القرار لازم يبقى مبني على سبب واضح، لأن النقل بيكلّف:

| البند | التكلفة |
| --- | --- |
| طبقة البيانات | إعادة كتابة كل الاستعلامات والكتابة اللحظية (Firestore realtime) |
| المصادقة | Firebase Auth مالوش بديل مباشر — محتاج مزوّد هوية جديد أو Azure AD B2C |
| القواعد/الأمان | بديل Firestore Rules = سياسات على السيرفر + Edge Functions |
| التخزين | نقل ملفات الكتب وإعادة كتابة الشات (chunking) |
| الاختبار | مسار كامل: تسجيل → كود → خطة → حذف |

**الخلاصة:** لو المشكلة واحدة من دول (قاعدة مش متعملة / Email-Password مقفول / الدومين مش مسموح / قواعد مش منشورة) → الحل **إعداد في Console مش نقل قاعدة بيانات**.

نقل على Cosmos DB يبقى منطقي بس لو: عندك Azure جاهز، وعايز SQL/MongoDB queries، ومستعد لمزوّد مصادقة منفصل.
