# 🚀 دليل رفع التحديثات للتطبيق

## 🌐 1. تطبيق الويب (Vercel - الأسرع)

### **الطريقة الأولى: Automatic Deployment (موصى به)**

```bash
# 1. رفع التحديثات إلى GitHub
git add .
git commit -m "تحديث: إضافة Supabase وتطبيقات الموبايل"
git push origin main

# 🎉 Vercel سيرفع التحديث تلقائياً خلال 30 ثانية!
```

### **الطريقة الثانية: Manual Deployment**

```bash
# 1. تثبيت Vercel CLI
npm i -g vercel

# 2. تسجيل الدخول
vercel login

# 3. رفع التحديث
vercel --prod

# 🎉 التطبيق محدث فوراً!
```

---

## 📱 2. تطبيق أندرويد (Google Play Store)

### **الخطوة 1: التحضير للبناء**

```bash
# انتقل إلى مجلد الموبايل
cd healthy-city-mobile

# تحديث الإصدار في package.json
# "version": "1.0.1"  # زيادة الرقم
```

### **الخطوة 2: بناء التطبيق**

```bash
# بناء APK للتطوير
npm run build:android --type apk

# أو بناء AAB للنشر (موصى به)
npm run build:android --type app-bundle
```

### **الخطوة 3: رفع إلى Google Play Console**

1. **افتح Google Play Console**
2. **اختر تطبيقك**
3. **اذهب إلى Release > Production**
4. **انقر "Create new release"**
5. **ارفع ملف AAB**
6. **املأ معلومات التحديث:**
   ```
   Release name: "تحديث Supabase وتحسين الأداء"
   Release notes: 
   • تحديث قاعدة البيانات إلى Supabase
   • تحسين الأداء 70%
   • إضافة تحديثات فورية
   • إصلاح المشاكل المعروفة
   ```
7. **انشر التحديث**

---

## 🍎 3. تطبيق iOS (App Store)

### **الخطوة 1: التحضير**

```bash
# انتقل إلى مجلد الموبايل
cd healthy-city-mobile

# تحديث الإصدار
# "version": "1.0.1"
```

### **الخطوة 2: بناء التطبيق**

```bash
# بناء IPA
npm run build:ios --type archive

# أو بناء للمحاكي
npm run build:ios --type simulator
```

### **الخطوة 3: رفع إلى App Store Connect**

1. **افتح Xcode**
2. **افتح مشروع Expo**
3. **اختر Product > Archive**
4. **انقر "Distribute App"**
5. **اختر "App Store Connect"**
6. **ارفع التطبيق**

### **الخطوة 4: النشر في App Store**

1. **افتح App Store Connect**
2. **اختر تطبيقك**
3. **اذهب إلى TestFlight > Builds**
4. **اختر البناء الجديد**
5. **أضف معلومات التحديث**
6. **أرسل للمراجعة**
7. **بعد الموافقة، انشر للعامة**

---

## ⚡ 4. رفع التحديثات السريعة (Over-the-Air)

### **لأندرويد - CodePush (موصى به)**

```bash
# تثبيت CodePush
npm install -g appcenter-cli

# تسجيل الدخول
appcenter login

# إعداد CodePush
appcenter apps create

# رفع التحديث
appcenter codepush release-react \
  -a your-organization/your-app \
  -d Production \
  --description "تحديث Supabase وتحسين الأداء"
```

### **لـ iOS - Expo Updates**

```bash
# في مشروع Expo
expo publish --release-channel production

# 🎉 المستخدمون سيحصلون على التحديث فوراً!
```

---

## 🔄 5. تحديث قاعدة البيانات Supabase

### **التحديثات البسيطة**

```bash
# 1. افتح Supabase Dashboard
# 2. اذهب إلى SQL Editor
# 3. انسخ والصق تحديثات SQL
# 4. انقر "Run"

# مثال: إضافة جدول جديد
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **التحديثات المعقدة**

```bash
# تشغيل سكريبت الترحيل
node scripts/migration.js --update

# 🎉 قاعدة البيانات محدثة!
```

---

## 📊 6. مراقبة التحديث

### **مراقبة النشر**

```bash
# لـ Vercel
vercel logs

# لـ Google Play
# تحقق Google Play Console

# لـ App Store
# تحقق App Store Analytics

# لـ Supabase
# تحقق Supabase Dashboard > Logs
```

### **إشعارات النجاح**

```bash
# إضافة إشعارات النشر
echo "🎉 تم نشر التحديث بنجاح!" | \
  curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🎉 تم نشر تحديث تطبيق المدينة الصحية!"}' \
  YOUR_SLACK_WEBHOOK_URL
```

---

## 🛠️ 7. أدوات الأتمتة

### **CI/CD مع GitHub Actions**

```yaml
# .github/workflows/deploy.yml
name: Deploy Updates

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

  deploy-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
```

---

## 📱 8. إشعارات المستخدمين

### **إشعارات Push**

```javascript
// إرسال إشعار بوجود تحديث
import * as Notifications from 'expo-notifications';

async function sendUpdateNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 تحديث جديد متاح!',
      body: 'تم تحسين الأداء وإضافة ميزات جديدة. قم بتحديث التطبيق الآن!',
      data: { type: 'update_available' },
    },
    trigger: null,
  });
}
```

### **رسائل في التطبيق**

```javascript
// عرض رسالة التحديث
const showUpdateMessage = () => {
  Alert.alert(
    '🎉 تحديث جديد!',
    'تم تحسين الأداء 70% وإضافة تحديثات فورية. هل تريد التحديث الآن؟',
    [
      { text: 'لاحقاً', style: 'cancel' },
      { text: 'تحديث الآن', onPress: () => handleUpdate() }
    ]
  );
};
```

---

## 🎯 9. أفضل الممارسات

### **قبل النشر**
- [ ] اختبار التحديث على جميع الأجهزة
- [ ] التحقق من التوافق مع الإصدارات القديمة
- [ ] نسخ احتياطي للبيانات
- [ ] مراجعة سجل التغييرات

### **بعد النشر**
- [ ] مراقبة الأخطاء
- [ ] جمع ردود فعل المستخدمين
- [ ] تحليل الأداء
- [ ] التخطيط للتحديث التالي

---

## 🚨 10. استرجاع التحديث (Rollback)

### **للويب**

```bash
# العودة للنسخة السابقة
vercel rollback [deployment-url]

# أو
git revert HEAD
git push origin main
```

### **للموبايل**

```bash
# لأندرويد
# قم برفع نسخة APK/AAB القديمة

# لـ iOS
# قم برفع نسخة IPA القديمة
```

---

## 📞 الدعم الفني

### **روابط مفيدة:**
- **Vercel:** https://vercel.com/docs
- **Google Play:** https://developer.android.com/studio/publish
- **App Store:** https://help.apple.com/app-store-connect/
- **Expo:** https://docs.expo.dev/
- **Supabase:** https://supabase.com/docs

### **دعم فني:**
- **Vercel:** support@vercel.com
- **Google Play:** googleplay-developer-support@google.com
- **App Store:** appstore@apple.com
- **Expo:** support@expo.dev

---

## 🎉 **الخلاصة**

### **أسرع طريقة:**
1. **الويب:** Git push → Vercel auto-deploy (30 ثانية)
2. **أندرويد:** Build → Upload to Play Console (5 دقائق)
3. **iOS:** Build → Upload to App Store (10 دقائق)

### **الأوتوماتيكية:**
- **CI/CD:** GitHub Actions
- **OTA Updates:** CodePush/Expo Updates
- **Notifications:** Push notifications

### **المراقبة:**
- **Logs:** Vercel logs, Supabase logs
- **Analytics:** Google Analytics, App Store Analytics
- **Errors:** Sentry, Crashlytics

**باستخدام هذه الأدوات، يمكنك رفع التحديثات في أقل من 5 دقائق!** 🚀
