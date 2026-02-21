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
     VITE_API_URL=http://localhost:3001
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
  3. افتح المتصفح على `http://localhost:3001`.

### بذر البيانات

- من الواجهة: زر **«تحميل/تحديث بيانات التجربة»** أو **«مسح البيانات وإعادة تحميل»** (حسب الصفحة).
- أو استدعاء API:
  ```bash
  curl -X POST http://localhost:3001/api/seed
  ```
- مسح ثم بذر من جديد:
  ```bash
  curl -X POST "http://localhost:3001/api/seed?clear=1"
  ```

---

## 2. النشر على سيرفر (VPS / استضافة Node)

### Railway (مختصر)

1. اربط المشروع من GitHub واختر الفرع (مثلاً `main` أو `master`).
2. في **Settings** للخدمة:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start` (أو `node server/index.js`)
   - **Root Directory:** اتركه فارغاً.
3. في **Settings → Networking** (إن وُجد):
   - **Health Check Path:** `/api/health` — حتى تعتبر المنصة أن التطبيق يعمل.
4. بعد النشر، افتح رابط **الخدمة** (مثل `https://xxx.up.railway.app`) وليس رابط لوحة التحكم.
5. إن ظهرت "Application failed to respond":
   - تأكد أن آخر تعديلات الكود مرفوعة إلى GitHub (بما فيها ملف `railway.json` وإصلاحات `server/db.js` و`server/index.js`).
   - من **Deployments** → آخر نشر → **View Logs**: انسخ السجلات بالكامل. إن ظهرت `سيرفر المدينة الصحية يعمل على المنفذ ...` فالسيرفر بدأ؛ إن ظهر قبلها `Uncaught exception:` أو خطأ أحمر، فالمشكلة من ذلك الخطأ (مثلاً فشل تحميل `better-sqlite3` على بيئة Railway).
   - إن لم يظهر أي سطر بعد البناء: تحقق من **Build Command** أنّه `npm install && npm run build` وأن **Start Command** هو `npm start`. يمكن ضبط ذلك من لوحة Railway أو عبر ملف `railway.json` في جذر المشروع.

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
   PORT=3001 node server/index.js
   ```
   أو مع pm2:
   ```bash
   pm2 start server/index.js --name qelwa --env PORT=3001
   ```
4. اضبط الـ reverse proxy (Nginx أو غيره) ليربط النطاق مع المنفذ 3001.
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
