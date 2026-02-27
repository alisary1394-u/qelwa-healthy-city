/**
 * دالة مساعدة لفرز المحاور بالترتيب الصحيح دائماً
 * تحل مشكلة الترتيب الخاطئ في قاعدة البيانات
 */

/**
 * فرز المحاور بالترتيب الصحيح 1-9
 * @param {Array} axes - مصفوفة المحاور من قاعدة البيانات
 * @returns {Array} - المحاور مرتبة بشكل صحيح
 */
export function sortAxesCorrectly(axes) {
  if (!Array.isArray(axes)) return [];
  
  // فرز المحاور دائماً بالترتيب الصحيح 1-9
  const sortedAxes = [...axes].sort((a, b) => {
    const orderA = Number(a.order) || 0;
    const orderB = Number(b.order) || 0;
    
    // إذا كان الترتيب خارج النطاق 1-9، ضعه في النهاية
    if (orderA < 1 || orderA > 9) return 1;
    if (orderB < 1 || orderB > 9) return -1;
    
    return orderA - orderB;
  });
  
  // التأكد من أن المحاور التسعة الأولى مرتبة بشكل صحيح
  const validAxes = sortedAxes.filter(axis => {
    const order = Number(axis.order);
    return order >= 1 && order <= 9;
  });
  
  return validAxes;
}

/**
 * إنشاء دالة select للاستخدام مع useQuery
 * @returns {Function} - دالة select لفرز المحاور
 */
export function createAxesSelectFunction() {
  return (data) => sortAxesCorrectly(data);
}
