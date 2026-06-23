/**
 * اختيار إعدادات المدينة الفعّالة حسب المستخدم الحالي.
 * الهدف: منع ظهور مدينة مختلفة (مثل قلوة) لمستخدم مدينة أخرى.
 */
export function pickCurrentCitySetting(settings, currentUser) {
  const list = Array.isArray(settings) ? settings : [];
  const role = currentUser?.role || currentUser?.user_role;
  const cityId = currentUser?.city_id ?? null;

  const hasBranding = (s) => !!(s && (s.city_name || s.logo_text || s.districts || s.city_location));

  // لوحة الوزارة: لا نعرض إعداد مدينة بعينها إلا إذا كان إعداد وزارة عام.
  if (role === 'ministry_admin') {
    return list.find((s) => !s?.city_id && hasBranding(s) && (s?.scope === 'ministry' || s?.is_ministry === true)) || {};
  }

  // مستخدم مدينة: نعرض فقط إعدادات نفس المدينة.
  if (cityId) {
    return (
      list.find((s) => String(s?.city_id || '') === String(cityId) && hasBranding(s)) ||
      list.find((s) => String(s?.city_id || '') === String(cityId)) ||
      {}
    );
  }

  // توافق رجعي: في الأنظمة القديمة (مدينة واحدة) قد لا يوجد city_id.
  return list.find((s) => !s?.city_id && hasBranding(s)) || list.find((s) => hasBranding(s)) || {};
}
