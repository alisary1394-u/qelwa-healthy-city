/**
 * Capacitor Plugin لحماية الشاشة من التصوير
 * يستخدم FLAG_SECURE على Android لمنع لقطات الشاشة بالكامل
 * 
 * التثبيت:
 *   npm install capacitor-plugin-screen-protector
 *   أو
 *   npm install @niceprod/capacitor-screen-protector
 *   npx cap sync
 * 
 * الاستخدام:
 *   import { enableScreenProtection } from './screen-protection-plugin';
 *   enableScreenProtection(); // لكل المستخدمين عدا المشرف العام
 */

/**
 * تفعيل حماية الشاشة إذا كان التطبيق يعمل داخل Capacitor
 * على Android: يمنع لقطات الشاشة بالكامل (شاشة سوداء)
 * على iOS: لا يوجد حل مباشر، لكن نغطي المحتوى عند الكشف
 */
export async function enableScreenProtection() {
  // فحص هل نعمل داخل Capacitor
  if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) {
    console.log('[ScreenProtection] Not running in Capacitor, using web fallback');
    return false;
  }

  try {
    const { Plugins } = window.Capacitor;

    // محاولة 1: capacitor-plugin-screen-protector
    if (Plugins.ScreenProtector) {
      await Plugins.ScreenProtector.enable();
      console.log('[ScreenProtection] Enabled via ScreenProtector plugin');
      return true;
    }

    // محاولة 2: @niceprod/capacitor-screen-protector  
    if (Plugins.ScreenProtection) {
      await Plugins.ScreenProtection.enable();
      console.log('[ScreenProtection] Enabled via ScreenProtection plugin');
      return true;
    }

    // محاولة 3: privacy-screen
    if (Plugins.PrivacyScreen) {
      await Plugins.PrivacyScreen.enable();
      console.log('[ScreenProtection] Enabled via PrivacyScreen plugin');
      return true;
    }

    console.warn('[ScreenProtection] No compatible plugin found. Install one of:');
    console.warn('  npm install capacitor-plugin-screen-protector');
    console.warn('  npm install @niceprod/capacitor-screen-protector');
    console.warn('  npm install @capacitor-community/privacy-screen');
    return false;

  } catch (error) {
    console.error('[ScreenProtection] Failed to enable:', error);
    return false;
  }
}

/**
 * تعطيل حماية الشاشة (للمشرف العام فقط)
 */
export async function disableScreenProtection() {
  if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { Plugins } = window.Capacitor;

    if (Plugins.ScreenProtector) {
      await Plugins.ScreenProtector.disable();
    } else if (Plugins.ScreenProtection) {
      await Plugins.ScreenProtection.disable();
    } else if (Plugins.PrivacyScreen) {
      await Plugins.PrivacyScreen.disable();
    }

    console.log('[ScreenProtection] Disabled for governor');
  } catch (error) {
    console.error('[ScreenProtection] Failed to disable:', error);
  }
}

/**
 * دليل إعداد الحماية الأصلية:
 * 
 * === Android (يمنع لقطات الشاشة بالكامل) ===
 * 
 * 1. تثبيت Plugin:
 *    npm install @capacitor-community/privacy-screen
 *    npx cap sync android
 * 
 * 2. أو يدوياً في MainActivity.java:
 *    import android.view.WindowManager;
 *    
 *    @Override
 *    protected void onCreate(Bundle savedInstanceState) {
 *      super.onCreate(savedInstanceState);
 *      getWindow().setFlags(
 *        WindowManager.LayoutParams.FLAG_SECURE,
 *        WindowManager.LayoutParams.FLAG_SECURE
 *      );
 *    }
 * 
 * === iOS (لا يمنع بالكامل، لكن يكشف ويغطي) ===
 * 
 * 1. تثبيت Plugin:
 *    npm install @capacitor-community/privacy-screen
 *    npx cap sync ios
 * 
 * 2. Plugin يضيف تلقائياً:
 *    - UITextField field trick لمنع التقاط المحتوى
 *    - إشعار UIApplicationUserDidTakeScreenshotNotification
 *    - UIScreen.capturedDidChangeNotification لكشف تسجيل الشاشة
 */
