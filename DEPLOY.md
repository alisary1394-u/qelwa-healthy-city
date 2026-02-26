# نشر التطبيق: سيرفر، App Store، Android

## 1. التشغيل على قاعدة بيانات محلية (سيرفرك)

### تشغيل السيرفر + الواجهة معاً

- **الطريقة الأولى (مستقلة):**
  1. تثبيت اعتماديات السيرفر:
     ```bash
     cd server && npm install && cd ..
     ```
  2. تشغيل السيرفر (قاعدة SQLite في `server/data/qelwa.db`):
     ```bash
     npm run server
     ```
  3. في `.env.local` ضع:
     ```
     VITE_API_URL=http://localhost:8080
     ```
  4. تشغيل الواجهة:
     ```bash
     npm run dev
     ```
  5. افتح المتصفح على عنوان تطبيق Vite (مثلاً `http://localhost:5173`). التطبيق يتصل بالسيرفر تلقائياً.

- **الطريقة الثانية (عرض الإنتاج):**
  1. بناء الواجهة:
     ```bash
     npm run build
     ```
  2. تشغيل السيرفر (سيقدّم ملفات `dist` + API):
     ```bash
     npm run server
     ```
  3. افتح المتصفح على `http://localhost:8080`.

### بذر البيانات

- من الواجهة: زر **«تحميل/تحديث بيانات التجربة»** أو **«مسح البيانات وإعادة تحميل»** (حسب الصفحة).
- أو استدعاء API:
  ```bash
  curl -X POST http://localhost:8080/api/seed
  ```
- مسح ثم بذر من جديد:
  ```bash
  curl -X POST "http://localhost:8080/api/seed?clear=1"
  ```

---

## 2. النشر على سيرفر (VPS / استضافة Node)

### Railway (مختصر)

- **استمرارية البيانات (مهم جداً):** عند كل نشر (تحديث) تُشغّل Railway حاوية جديدة. **بدون تخزين دائم تُحذف كل البيانات.** يجب إضافة **Volume** وربطه بالمسار **`/data`** — انظر الخطوات أدناه.
- **يفضّل استخدام الـ Dockerfile:** إذا وُجد ملف `Dockerfile` في جذر المشروع، تستخدم Railway البناء عبر Docker تلقائياً (لا حاجة لضبط Build/Start في الإعدادات). هذا يعطي بيئة ثابتة ويدعم المكتبات الأصلية مثل `better-sqlite3`.

**كيف تربط Volume بالمسار `/data` (حتى لا تُحذف البيانات عند التحديث):**
1. افتح مشروعك في [Railway](https://railway.app) وادخل إلى **المشروع** الذي فيه خدمة المدينة الصحية.
2. **إنشاء Volume:** استخدم **Command Palette** بالضغط على `Ctrl+K` (أو `Cmd+K` في Mac) واكتب **"volume"** أو **"Add Volume"**، أو انقر بزر الماوس الأيمن على لوحة المشروع (Canvas) واختر إضافة Volume.
3. عند الإنشاء سيُطلب منك **اختيار الخدمة** — اختر خدمة التطبيق (مثلاً `qelwa-healthy-city` أو اسم الخدمة التي تشغّل السيرفر).
4. **ضبط مسار الربط (Mount Path):** في إعدادات الـ Volume ضع المسار **`/data`** بالضبط (بدون `/app` لأن التطبيق يستخدم المسار المطلق `/data`).
5. احفظ التغييرات. بعد ذلك كل ما يُكتب في `/data` (قاعدة البيانات `qelwa.db` والنسخ الاحتياطية في `/data/backups`) سيبقى بين عمليات النشر. قد تحتاج إلى **إعادة النشر (Redeploy)** مرة واحدة بعد ربط الـ Volume.
- **بعد ربط Volume:** قد تظهر حالة "CRASHED" لثوانٍ وتصل رسالة تحذير بالبريد أثناء النشر — هذا غالباً فترة انتقال (إيقاف الحاوية القديمة ثم تشغيل الجديدة). للتخفيف أضف في Variables: `RAILWAY_HEALTHCHECK_TIMEOUT_SEC=120`. التفاصيل في `docs/DATA_LOSS_ON_UPDATE_ANALYSIS.md` (قسم "CRASHED أثناء النشر مع Volume").
- راجع `docs/DATA_LOSS_ON_UPDATE_ANALYSIS.md` لتفاصيل أكثر.

1. اربط المشروع من GitHub واختر الفرع (مثلاً `main` أو `master`).
2. إن لم تستخدم Dockerfile، في **Settings** للخدمة:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start` (أو `node server/index.js`)
   - **Root Directory:** اتركه فارغاً.
3. في **Settings → Networking** (إن وُجد):
   - **Health Check Path:** `/api/health` — حتى تعتبر المنصة أن التطبيق يعمل.
4. **التحقق بالبريد الإلكتروني (رمز التحقق):** أضف في Railway → الخدمة → **Variables** حسب نوع بريدك:
   - **بريد GoDaddy مع Microsoft 365 (Office 365) — موصى به:**
     - `SMTP_HOST` = `smtp.office365.com`
     - `SMTP_PORT` = `587`
     - `SMTP_SECURE` = لا تضبطه أو ضع `false` (التشفير STARTTLS يُفعّل تلقائياً على 587)
     - `SMTP_USER` = عنوان بريدك الكامل (مثل `admin@qeelwah.com`)
     - `SMTP_PASS` = كلمة مرور البريد الإلكتروني في GoDaddy
     - تأكد أن **مصادقة SMTP (SMTP Authentication)** مفعّلة في إعدادات البريد.
   - **بريد GoDaddy الأصلي (smtpout.secureserver.net):**
     - `SMTP_HOST` = `smtpout.secureserver.net`
     - `SMTP_PORT` = `587` (يفضّل على 465 من Railway)
     - `SMTP_SECURE` = `false` أو احذفه
     - `SMTP_USER` = `admin@qeelwah.com`
     - `SMTP_PASS` = كلمة مرور البريد
   - **أو Gmail:** `SMTP_HOST`=smtp.gmail.com، `SMTP_PORT`=587، `SMTP_USER`=بريدك، `SMTP_PASS`=كلمة مرور التطبيق.
   - **إذا استمر "Connection timeout" (Railway يحجب SMTP):** استخدم **Resend** بدل SMTP (يعمل عبر HTTPS ولا يُحجب):
     - سجّل في [resend.com](https://resend.com) وأنشئ API Key من لوحة التحكم.
     - أضف الدومين (مثل qeelwah.com) في Resend → Domains وتحقق من سجلات DNS كما يطلب الموقع.
     - في Railway → Variables أضف فقط: `RESEND_API_KEY` = مفتاحك (يبدأ بـ `re_`). يمكنك حذف أو ترك متغيرات SMTP — عند وجود RESEND_API_KEY يُستخدم Resend.
     - المرسل الافتراضي: `admin@qeelwah.com` (يجب أن يكون البريد من دومين مُتحقق في Resend).
   بعد إضافتها أعد النشر. إن لم تُضبط، ستظهر رسالة "إعداد البريد الإلكتروني مطلوب" عند طلب رمز التحقق.
   - **إذا ظهرت "فشل إرسال البريد" أو خطأ SMTP:**
     - **Connection timeout:** كثيراً ما يحجب Railway منافذ SMTP. استخدم **Resend** (أعلاه) أو تأكد من استخدام المنفذ 587.
     - **GoDaddy:** تأكد من تفعيل **SMTP Authentication** في إعدادات البريد. استخدم البريد الكامل كـ `SMTP_USER` وكلمة مرور البريد نفسها في `SMTP_PASS`.
     - من Railway → Deployments → View Logs ابحث عن `[SMTP]` أو `[Resend]` لرؤية رسالة الخطأ الفعلية.
     - **لرؤية سبب الفشل:** افتح في المتصفح: `https://www.qeelwah.com/api/email-check` (يعيد النص الفعلي للخطأ وطريقة الإرسال: resend أو smtp).
6. **الدومين الرسمي (اختياري):** لظهور العنوان فقط كـ qeelwah.com (بدون www)، أضف في Variables: `VITE_CANONICAL_URL=https://qeelwah.com` ثم أعد البناء والنشر. سيُوجّه تلقائياً من رابط Railway ومن www.qeelwah.com إلى https://qeelwah.com.
7. **دوال الخلفية (Backend Functions):** التحقق بالبريد (sendVerificationCode, verifyCode) وتسجيل المشرف (createFirstGovernor) تعمل عندما تتصل الواجهة بسيرفر التطبيق. على Railway هذا تلقائي (نفس النطاق). لضمان التفعيل أضف في Variables: `VITE_USE_BACKEND_FUNCTIONS=true` — أو لا تضبط `VITE_API_URL`.
8. **ربط الواجهة بالسيرفر:** الواجهة تتصل تلقائياً بنفس النطاق (مثلاً `https://qeelwah.com` أو `https://xxx.railway.app`). **لا تضبط** `VITE_API_URL` في Railway إلا إذا كانت الواجهة تُعرض من نطاق مختلف عن السيرفر. إضافة البريد الإلكتروني (التحقق) لا تغيّر هذا الربط — كل الطلبات تبقى إلى نفس السيرفر.
9. بعد النشر، افتح رابط **الخدمة** (مثل `https://xxx.up.railway.app`) وليس رابط لوحة التحكم.
10. إن ظهرت "Application failed to respond":
   - **تجربة خادم بسيط:** في Railway → الخدمة → **Settings** → **Deploy** (أو **Build & Deploy**) → **Start Command** غيّره إلى: `node server/railway-minimal.cjs` ثم **Redeploy**. إن فتح الرابط وظهرت كلمة "OK" فالمشكلة من التطبيق الرئيسي وليس من المنصة. بعدها أرجع **Start Command** إلى `npm start` أو اتركه فارغاً لاستخدام أوامر الـ Dockerfile.
   - من **Deployments** → آخر نشر → **View Logs**: ابحث عن `[Qelwa] Container CMD starting` أو `[Qelwa] Process starting` أو `سيرفر المدينة الصحية يعمل على المنفذ`. إن ظهر بعدها `Uncaught exception:` أو خطأ أحمر فانسخه للمساعدة في التشخيص. إن لم يظهر أي من ذلك فالبناء أو بدء الحاوية قد يكون فاشلاً.
   - تأكد أن آخر تعديلات الكود (بما فيها `Dockerfile` و`server/index.js`) مرفوعة إلى GitHub.
11. **التحديثات لا تظهر على Railway بعد الـ push:**
   - **الفرع (Branch):** في Railway → مشروعك → الخدمة → **Settings** → **Build & Deploy** (أو **Source**) تحقق من **Branch**. يجب أن يكون نفس الفرع الذي ترفع إليه (غالباً `main` أو `master`). إذا كنت ترفع إلى `main` وRailway يراقب `master` (أو العكس) فلن يحدث نشر.
   - **ربط المستودع:** من **Settings** → **Source** تأكد أن الخدمة مرتبطة بالمستودع الصحيح على GitHub (نفس المستودع الذي تنفّذ منه `git push`).
   - **الرفع ناجح:** في الطرفية نفّذ `git status` ثم `git push`. تأكد أن الـ push ينجح ولا يظهر "failed" أو "rejected". إذا رفعت إلى فرع آخر (مثلاً `dev`) فلن يبني Railway إلا إذا كان مراقباً لهذا الفرع.
   - **نشر يدوي:** من Railway → الخدمة → **Deployments** → زر **Deploy** أو **Redeploy** لنشر آخر commit من الفرع المربوط.
   - **سجلات البناء:** من **Deployments** → آخر نشر → **View Logs** تحقق إن كان البناء فشل (Build Failed). إن فشل البناء فلن تظهر "تحديث" ناجح.

---

1. ارفع مجلد المشروع إلى السيرفر (أو استخدم Git).
2. على السيرفر:
   ```bash
   npm install
   cd server && npm install && cd ..
   npm run build
   ```
3. شغّل السيرفر (يفضّل باستخدام process manager مثل pm2):
   ```bash
   PORT=8080 node server/index.js
   ```
   أو مع pm2:
   ```bash
   pm2 start server/index.js --name qelwa --env PORT=8080
   ```
4. اضبط الـ reverse proxy (Nginx أو غيره) ليربط النطاق مع المنفذ 8080.
5. في الواجهة (أو عند البناء) اجعل `VITE_API_URL` يشير إلى عنوان السيرفر، مثلاً:
   ```
   VITE_API_URL=https://your-domain.com
   ```
   ثم أعد البناء:
   ```bash
   npm run build
   ```
   وارفع محتويات `dist` إن كنت تخدمها من خادم ويب آخر، أو اترك السيرفر يخدمها كما في الخطوة 3.

---

## 3. تطبيق iOS (App Store)

1. تثبيت الاعتماديات وإعداد Capacitor:
   ```bash
   npm install
   npx cap add ios
   ```
2. في `.env.production` أو عند البناء ضع عنوان السيرفر:
   ```
   VITE_API_URL=https://your-domain.com
   ```
3. بناء الواجهة ومزامنة المشروع:
   ```bash
   npm run build
   npx cap sync ios
   ```
4. فتح Xcode وتوقيع التطبيق ورفعه:
   ```bash
   npx cap open ios
   ```
   - في Xcode: اختر فريق التوقيع (Signing & Capabilities).
   - من قائمة Product: Archive ثم Distribute App لرفع التطبيق إلى App Store Connect.
5. من [App Store Connect](https://appstoreconnect.apple.com) أضف التطبيق وأكمل البيانات واختر البناء المرفوع ثم أرسل للمراجعة.

---

## 4. تطبيق Android (Play Store)

1. تثبيت الاعتماديات وإعداد Capacitor:
   ```bash
   npm install
   npx cap add android
   ```
2. تأكد أن `VITE_API_URL` يشير إلى السيرفر (نفس الخطوة 2 في iOS).
3. بناء ومزامنة:
   ```bash
   npm run build
   npx cap sync android
   ```
4. فتح Android Studio وبناء الحزمة:
   ```bash
   npx cap open android
   ```
   - من Build: Generate Signed Bundle / APK واختر keystore أو أنشئ واحداً.
   - بعد البناء، ارفع الـ AAB (Android App Bundle) إلى [Google Play Console](https://play.google.com/console).
5. في Play Console أنشئ التطبيق وأضف التفاصيل واختر البناء وارسله للمراجعة.

---

## ملخص أوضاع التشغيل

| الوضع              | الاستخدام                          |
|--------------------|-------------------------------------|
| `VITE_USE_LOCAL_BACKEND=true` | تخزين في المتصفح (localStorage)     |
| `VITE_API_URL=http://...`     | سيرفر التطبيق (قاعدة SQLite محلية) |
| `VITE_USE_SUPABASE_BACKEND=true` + مفاتيح Supabase | قاعدة بيانات Supabase (سحابية) |

عند النشر على السيرفر أو المتاجر، استخدم **قاعدة محلية على السيرفر** عبر `VITE_API_URL` أو Supabase حسب ما تناسبك.
