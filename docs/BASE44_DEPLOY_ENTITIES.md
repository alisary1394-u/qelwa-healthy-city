# تفعيل الكيانات (قاعدة البيانات) في Base44

تم إنشاء تعريفات جميع الكيانات في مجلد `base44/entities/` بصيغة JSON Schema. لتفعيلها على مشروعك في Base44 اتبع الخطوات التالية.

## المتطلبات

- حساب على [Base44.com](https://Base44.com)
- تثبيت Base44 CLI (إن لم يكن مثبتاً):

```bash
npm install -g base44
```

أو استخدمه عبر npx:

```bash
npx base44 entities push
```

## الخطوة 1: ربط المشروع بتطبيق Base44

من جذر المشروع:

```bash
base44 link
```

ستُطلب منك تسجيل الدخول واختيار التطبيق (أو إنشاء تطبيق جديد). بعد الربط يُنشأ ملف `base44/.app.jsonc` يحتوي معرف التطبيق (لا ترفعه إلى Git).

## الخطوة 2: رفع الكيانات إلى Base44

```bash
base44 entities push
```

أو من مجلد base44:

```bash
cd base44
base44 entities push
```

سيتم مزامنة جميع الملفات في `base44/entities/*.json` مع قاعدة بيانات تطبيقك في Base44. كل كيان سيُنشأ أو يُحدَّث حسب التعريف المحلي.

## الكيانات المضمنة (17 كياناً)

| الملف | الكيان |
|-------|--------|
| TeamMember.json | أعضاء الفريق |
| Settings.json | إعدادات المدينة |
| Committee.json | اللجان |
| Task.json | المهام |
| Notification.json | الإشعارات |
| Axis.json | المحاور |
| Standard.json | المعايير |
| Evidence.json | الأدلة |
| Initiative.json | المبادرات |
| InitiativeKPI.json | مؤشرات أداء المبادرات |
| Budget.json | الميزانيات |
| BudgetAllocation.json | تخصيصات الميزانية |
| Transaction.json | المعاملات المالية |
| FileUpload.json | الملفات المرفوعة |
| FamilySurvey.json | استبيان الأسرة |
| UserPreferences.json | تفضيلات المستخدم |
| VerificationCode.json | رموز التحقق (للدوال فقط) |

## تعديل التعريفات لاحقاً

1. عدّل الملف المناسب في `base44/entities/`.
2. شغّل مرة أخرى: `base44 entities push`.
3. التعريف على السيرفر سيُحدَّث تلقائياً (البيانات الموجودة لا تُحذف).

## ملاحظات

- **الصلاحيات (RLS):** جميع الكيانات مضبوطة حالياً على `create, read, update, delete: true`. يمكنك لاحقاً تشديد الصلاحيات من لوحة Base44 أو بتعديل حقل `rls` في كل ملف.
- **الدوال (Functions):** دوال مثل `sendVerificationCode` و`verifyCode` و`checkTaskReminders` موجودة في مجلد `functions/` في جذر المشروع. تأكد من نشرها من لوحة Base44 أو عبر CLI إن كان مشروعك يستخدم ذلك.
- **التكامل:** رفع الملفات (Core.UploadFile) وإرسال البريد (Core.SendEmail) يعتمدان على تكاملات Base44. فعّلها من لوحة التحكم إذا لزم الأمر.

بعد تنفيذ `base44 link` ثم `base44 entities push` تصبح قاعدة البيانات مفعّلة وجاهزة لاستخدام التطبيق.
