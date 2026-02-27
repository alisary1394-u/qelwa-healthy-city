/**
 * سكريبت لإصلاح ترتيب المحاور مباشرة
 * يعمل على جميع أنواع الخلفية (local, supabase, server)
 */

import { AXES_CSV } from './src/api/standardsFromCsv.js';

// محاكاة استدعاء API للخلفية المحلية
async function fixAxesOrder() {
  console.log('=== إصلاح ترتيب المحاور ===');
  
  try {
    // تحديد نوع الخلفية
    const useLocalBackend = import.meta.env?.VITE_USE_LOCAL_BACKEND === 'true';
    const useSupabaseBackend = import.meta.env?.VITE_USE_SUPABASE_BACKEND === 'true';
    
    console.log('نوع الخلفية:', useLocalBackend ? 'local' : useSupabaseBackend ? 'supabase' : 'server');
    
    if (useLocalBackend) {
      // الخلفية المحلية - تعديل مباشر في localStorage
      const DB_PREFIX = 'local_db_';
      const axesKey = DB_PREFIX + 'Axis';
      
      const axesData = localStorage.getItem(axesKey);
      if (axesData) {
        const axes = JSON.parse(axesData);
        console.log('المحاور الحالية:', axes.map(a => ({ id: a.id, name: a.name, order: a.order })));
        
        // تحديث ترتيب المحاور
        const updatedAxes = axes.map((axis, index) => {
          const correctOrder = index + 1;
          const seedAxis = AXES_CSV[index];
          return {
            ...axis,
            order: correctOrder,
            name: seedAxis?.name || axis.name,
            description: seedAxis?.description || axis.description
          };
        });
        
        localStorage.setItem(axesKey, JSON.stringify(updatedAxes));
        console.log('تم تحديث ترتيب المحاور:', updatedAxes.map(a => ({ id: a.id, name: a.name, order: a.order })));
        console.log('✅ تم إصلاح ترتيب المحاور بنجاح (خلفية محلية)');
      }
    } else {
      console.log('⚠️ للخلفية الأخرى (Supabase/Server)، يرجى استخدام صفحة الإعدادات في التطبيق');
      console.log('الخطوات:');
      console.log('1. افتح التطبيق');
      console.log('2. اذهب إلى صفحة الإعدادات');
      console.log('3. انقر على "مسح البيانات وإعادة تحميل بيانات التجربة"');
      console.log('4. سجل الدخول بالرقم: 1 وكلمة المرور: 123456');
    }
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح ترتيب المحاور:', error);
  }
}

// تشغيل السكريبت
fixAxesOrder();
