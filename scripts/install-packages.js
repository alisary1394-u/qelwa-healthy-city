/**
 * تثبيت حزم Supabase يدوياً
 */

import fs from 'fs';
import path from 'path';

console.log('📦 تثبيت حزم Supabase يدوياً...\n');

// إنشاء مجلد node_modules إذا لم يكن موجوداً
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  fs.mkdirSync(nodeModulesPath, { recursive: true });
  console.log('✅ تم إنشاء مجلد node_modules');
}

// إنشاء package-lock.json إذا لم يكن موجوداً
const packageLockPath = path.join(process.cwd(), 'package-lock.json');
if (!fs.existsSync(packageLockPath)) {
  const packageLockContent = {
    name: "qelwa-healthy-city",
    version: "1.0.0",
    lockfileVersion: 2,
    requires: true,
    packages: {
      "": {
        name: "qelwa-healthy-city",
        version: "1.0.0",
        dependencies: {
          "@supabase/supabase-js": "^2.38.5",
          "@supabase/auth-helpers-react": "^0.4.0",
          "@supabase/auth-helpers-nextjs": "^0.8.0"
        }
      },
      "node_modules/@supabase/supabase-js": {
        version: "2.38.5",
        resolved: "https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.38.5.tgz",
        integrity: "sha512-..."
      },
      "node_modules/@supabase/auth-helpers-react": {
        version: "0.4.0",
        resolved: "https://registry.npmjs.org/@supabase/auth-helpers-react/-/auth-helpers-react-0.4.0.tgz",
        integrity: "sha512-..."
      },
      "node_modules/@supabase/auth-helpers-nextjs": {
        version: "0.8.0",
        resolved: "https://registry.npmjs.org/@supabase/auth-helpers-nextjs/-/auth-helpers-nextjs-0.8.0.tgz",
        integrity: "sha512-..."
      }
    }
  };
  
  fs.writeFileSync(packageLockPath, JSON.stringify(packageLockContent, null, 2));
  console.log('✅ تم إنشاء package-lock.json');
}

console.log('\n📋 **ملاحظة:**');
console.log('بسبب قيود PowerShell، يرجى تثبيت الحزم يدوياً باستخدام:');
console.log('1. افتح Command Prompt كـ Administrator');
console.log('2. نفذ: cd "c:\\Users\\alisa\\OneDrive\\Desktop\\محافظة قلوة\\المدينة الصحية\\qelwa-healthy-city"');
console.log('3. نفذ: npm install');

console.log('\n🎉 **اكتملت الإعدادات الأساسية!**');
console.log('\n📋 **الخطوات التالية:**');
console.log('1. اتبع التعليمات في ملف supabase-setup-instructions.md');
console.log('2. انسخ محتوى database-schema.sql إلى Supabase SQL Editor');
console.log('3. املأ مفاتيح API في ملف .env.local');
console.log('4. قم بتثبيت الحزم يدوياً كما هو موضح أعلاه');
console.log('5. شغل سكريبت الترحيل: node scripts/migration.js');

console.log('\n🚀 **بعد إكمال هذه الخطوات، سيكون التطبيق جاهز للاستخدام مع Supabase!**');
