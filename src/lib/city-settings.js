import { getHostCityTemplate } from '@/lib/city-hosts';

/**
 * اختيار إعدادات المدينة الفعّالة حسب المستخدم الحالي.
 * الهدف: منع ظهور مدينة مختلفة (مثل قلوة) لمستخدم مدينة أخرى.
 */
export function pickCurrentCitySetting(settings, currentUser) {
  const list = Array.isArray(settings) ? settings : [];
  const role = currentUser?.role || currentUser?.user_role;
  const cityId = currentUser?.city_id ?? null;
  const hostCity = getHostCityTemplate();

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

  // زائر أو مستخدم غير مرتبط بمدينة: نعتمد السب دومين إن كان معروفاً.
  if (hostCity) {
    if (hostCity.isMinistry === true) {
      return (
        list.find((s) => !s?.city_id && hasBranding(s) && (s?.scope === 'ministry' || s?.is_ministry === true)) ||
        {
          city_name: 'وزارة الصحة',
          city_location: 'المملكة العربية السعودية',
          logo_text: 'و',
          districts: [],
          is_ministry: true,
          is_host_city_fallback: true,
        }
      );
    }
    return (
      list.find((s) => !s?.city_id && hasBranding(s) && String(s?.city_name || '').trim() === hostCity.cityName) ||
      {
        city_name: hostCity.cityName,
        city_location: hostCity.region,
        logo_text: hostCity.logoText,
        districts: [],
        is_host_city_fallback: true,
      }
    );
  }

  // توافق رجعي: في الأنظمة القديمة (مدينة واحدة) قد لا يوجد city_id.
  return list.find((s) => !s?.city_id && hasBranding(s)) || list.find((s) => hasBranding(s)) || {};
}
