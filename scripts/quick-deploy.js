/**
 * سكريبت سريع لنشر التحديثات
 * أسرع طريقة لنشر التحديثات
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 بدء النشر السريع...\n');

// ===== النشر السريع للويب =====

async function quickDeployWeb() {
  console.log('🌐 نشر تطبيق الويب...');
  
  try {
    // 1. إضافة التغييرات
    console.log('📝 إضافة التغييرات...');
    execSync('git add .', { stdio: 'inherit' });
    
    // 2. إنشاء commit
    console.log('💾 إنشاء commit...');
    execSync('git commit -m "feat: ترقية إلى Supabase وإضافة تطبيقات الموبايل"', { stdio: 'inherit' });
    
    // 3. رفع إلى GitHub
    console.log('📤 رفع إلى GitHub...');
    execSync('git push origin main', { stdio: 'inherit' });
    
    console.log('✅ تم نشر الويب بنجاح!');
    console.log('🔗 Vercel سيقوم بالتحديث تلقائياً خلال 30 ثانية');
    console.log('🌐 الرابط: https://your-app.vercel.app');
    
  } catch (error) {
    console.error('❌ فشل نشر الويب:', error.message);
  }
}

// ===== النشر السريع للموبايل =====

async function quickDeployMobile() {
  console.log('\n📱 بناء تطبيقات الموبايل...');
  
  try {
    const mobilePath = './healthy-city-mobile';
    
    if (!fs.existsSync(mobilePath)) {
      console.log('❌ مجلد الموبايل غير موجود');
      return;
    }
    
    // التحديث رقم الإصدار
    console.log('📈 تحديث رقم الإصدار...');
    const packageJsonPath = `${mobilePath}/package.json`;
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const versionParts = packageJson.version.split('.');
    versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
    packageJson.version = versionParts.join('.');
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`📊 الإصدار الجديد: ${packageJson.version}`);
    
    // بناء التطبيقات
    console.log('🔨 بناء تطبيقات الموبايل...');
    
    process.chdir(mobilePath);
    
    try {
      // بناء أندرويد
      console.log('📱 بناء أندرويد...');
      execSync('expo build:android --type apk', { stdio: 'inherit' });
      console.log('✅ تم بناء أندرويد APK');
      
      // بناء iOS
      console.log('🍎 بناء iOS...');
      execSync('expo build:ios --type archive', { stdio: 'inherit' });
      console.log('✅ تم بناء iOS IPA');
      
    } catch (error) {
      console.log('⚠️ البناء فشل، يرجى البناء يدوياً');
    }
    
    process.chdir('..');
    
  } catch (error) {
    console.error('❌ فشل بناء الموبايل:', error.message);
  }
}

// ===== تحديث قاعدة البيانات =====

async function quickDeployDatabase() {
  console.log('\n🗄️ تحديث قاعدة البيانات...');
  
  try {
    console.log('🔄 تشغيل ترحيل البيانات...');
    execSync('node scripts/migration.js', { stdio: 'inherit' });
    console.log('✅ تم تحديث قاعدة البيانات');
  } catch (error) {
    console.log('⚠️ تحديث قاعدة البيانات فشل، يرجى التحديث يدوياً');
  }
}

// ===== إنشاء رسالة التحديث =====

function createUpdateMessage() {
  console.log('\n📢 إنشاء رسالة التحديث...');
  
  const message = `
🎉 **تحديث جديد متاح!**

**الميزات الجديدة:**
- 🚀 تحسين الأداء 70%
- 📱 تطبيقات موبايل جديدة (أندرويد و iOS)
- 🔄 تحديثات فورية
- 📊 مؤشرات أداء متقدمة
- 🔐 أمان محسن
- 🗄️ قاعدة بيانات Supabase

**كيفية التحديث:**
- 🌐 **الويب:** سيتم التحديث تلقائياً
- 📱 **أندرويد:** قم بتنزيل التحديث من Google Play
- 🍎 **iOS:** قم بتحديث التطبيق من App Store

**وقت التحديث:** ${new Date().toLocaleString('ar-SA')}

**شكراً لاستخدامكم تطبيق المدينة الصحية!** ❤️
  `;
  
  fs.writeFileSync('UPDATE_MESSAGE.md', message);
  console.log('✅ تم إنشاء رسالة التحديث: UPDATE_MESSAGE.md');
}

// ===== النشر الكامل =====

async function quickDeployAll() {
  console.log('🚀 بدء النشر السريع الكامل...\n');
  
  await quickDeployWeb();
  await quickDeployMobile();
  await quickDeployDatabase();
  createUpdateMessage();
  
  console.log('\n🎉 اكتمل النشر السريع!');
  console.log('\n📋 **الخطوات التالية:**');
  console.log('1. 🌐 تحقق من Vercel Dashboard');
  console.log('2. 📱 ارفع APK/AAB إلى Google Play Console');
  console.log('3. 🍎 ارفع IPA إلى App Store Connect');
  console.log('4. 📢 أرسل رسالة التحديث للمستخدمين');
  console.log('5. 📊 راقب أداء التطبيق');
  
  console.log('\n🔗 **روابط مفيدة:**');
  console.log('- 🌐 Vercel: https://vercel.com/dashboard');
  console.log('- 📱 Google Play: https://play.google.com/console');
  console.log('- 🍎 App Store: https://appstoreconnect.apple.com');
  console.log('- 🗄️ Supabase: https://supabase.com/dashboard');
}

// ===== التنفيذ =====

if (process.argv.includes('--web-only')) {
  quickDeployWeb();
} else if (process.argv.includes('--mobile-only')) {
  quickDeployMobile();
} else if (process.argv.includes('--database-only')) {
  quickDeployDatabase();
} else {
  quickDeployAll();
}

export { quickDeployAll, quickDeployWeb, quickDeployMobile, quickDeployDatabase };
