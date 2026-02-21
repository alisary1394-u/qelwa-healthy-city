# المدينة الصحية - محافظة قلوة  
# Qelwa Healthy City

نظام إدارة متكامل لتفعيل المدينة الصحية وفق معايير منظمة الصحة العالمية (محافظة قلوة).

An integrated management system for the Healthy City initiative – Qelwa Governorate.

---

## المحتويات / Features

- **لوحة التحكم** – Dashboard with progress and KPIs  
- **التقارير** – Reports  
- **المعايير** – WHO standards  
- **المبادرات** – Initiatives & KPIs  
- **المهام** – Tasks & reminders  
- **الميزانية** – Budget  
- **اللجان** – Committees  
- **الفريق** – Team management  
- **الملفات** – Files  
- **الاستبيان** – Family survey  

---

## التشغيل محلياً / Run locally

1. **تثبيت التبعيات / Install dependencies**
   ```bash
   npm install
   ```

2. **إعداد المتغيرات / Environment**
   - انسخ `.env.example` إلى `.env.local`
   - Copy `.env.example` to `.env.local`
   - Fill in your Base44 app ID and backend URL from [Base44.com](https://Base44.com)

3. **تشغيل التطبيق / Run**
   ```bash
   npm run dev
   ```

4. **بناء للإنتاج / Build**
   ```bash
   npm run build
   ```

---

## تفعيل قاعدة البيانات (Base44)

تعريفات الكيانات موجودة في `base44/entities/`. لرفعها إلى Base44:

1. **ربط المشروع:** `base44 link` (من جذر المشروع)
2. **رفع الكيانات:** `base44 entities push`

تفاصيل أكثر في [docs/BASE44_DEPLOY_ENTITIES.md](docs/BASE44_DEPLOY_ENTITIES.md).

---

## البنية / Stack

- **React 18** + **Vite 6**
- **Base44** (backend & auth)
- **TanStack Query** – data fetching
- **React Router** – routing
- **Tailwind CSS** + **Radix UI** – UI
- **RTL** – واجهة عربية من اليمين لليسار

---

## النشر / Publish

النشر يتم من [Base44.com](https://Base44.com) عبر زر Publish بعد ربط المستودع.

Publish from Base44 dashboard after connecting your Git repository.

---

**Docs:** [docs.base44.com](https://docs.base44.com/Integrations/Using-GitHub)  
**Support:** [app.base44.com/support](https://app.base44.com/support)
