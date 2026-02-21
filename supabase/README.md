# قاعدة بيانات Supabase (PostgreSQL)

للاستخدام مع التطبيق:
1. أنشئ مشروعاً في [Supabase](https://supabase.com).
2. من **Project Settings** > **API** انسخ:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. نفّذ الجداول: من لوحة Supabase اذهب إلى **SQL Editor** والصق محتوى `migrations/001_initial.sql` ثم نفّذ.
4. في `.env.local` ضع:
   ```
   VITE_USE_SUPABASE_BACKEND=true
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
5. أعد تشغيل التطبيق (`npm run dev`).

لتشغيل البذرة (لجان، فريق، مبادرات، مهام، ميزانيات): من الصفحة الرئيسية اضغط **تحميل/تحديث بيانات التجربة** ثم أعد تحميل الصفحة، أو سجّل الدخول برقم **1** وكلمة المرور **123456** بعد تشغيل البذرة تلقائياً.
