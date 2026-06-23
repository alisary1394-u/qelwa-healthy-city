/**
 * citiesApi.js — واجهة برمجية لإدارة المدن الصحية
 * تستخدم نفس الخلفية المُهيأة في apiClient.js (Supabase / Server / Local)
 */

import { api } from '@/api/apiClient';
import { appParams } from '@/lib/app-params';
import { createClient } from '@supabase/supabase-js';

let ensureLegacyCityPromise = null;

function normalizeCityName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

async function attachLegacyDataToCity(cityId, legacySetting, members) {
  try {
    if (legacySetting?.id && !legacySetting?.city_id && api?.entities?.Settings?.update) {
      await api.entities.Settings.update(legacySetting.id, { city_id: cityId });
    }
  } catch {
    // best-effort
  }

  try {
    if (!api?.entities?.TeamMember?.update || !Array.isArray(members)) return;
    const legacyMembers = members.filter((m) => !m?.city_id);
    if (legacyMembers.length === 0) return;
    await Promise.allSettled(
      legacyMembers.map((m) => api.entities.TeamMember.update(m.id, { city_id: cityId }))
    );
  } catch {
    // best-effort
  }
}

async function ensureLegacyCityRegistered() {
  if (!api?.entities?.City?.list) return;
  if (!ensureLegacyCityPromise) {
    ensureLegacyCityPromise = (async () => {
      const [citiesRaw, settingsRaw, membersRaw] = await Promise.all([
        api.entities.City.list('-created_at'),
        api?.entities?.Settings?.list?.() ?? [],
        api?.entities?.TeamMember?.list?.() ?? [],
      ]);

      const cities = Array.isArray(citiesRaw) ? citiesRaw : [];
      const settings = Array.isArray(settingsRaw) ? settingsRaw : [];
      const members = Array.isArray(membersRaw) ? membersRaw : [];

      const legacySetting = settings.find(
        (s) => s?.city_name && !s?.city_id && s?.scope !== 'ministry' && s?.is_ministry !== true
      ) || settings.find((s) => s?.city_name && !s?.city_id);

      if (!legacySetting?.city_name) return;

      const existing = cities.find(
        (c) => normalizeCityName(c?.name) === normalizeCityName(legacySetting.city_name)
      );

      if (existing?.id) {
        await attachLegacyDataToCity(existing.id, legacySetting, members);
        return;
      }

      const created = await api.entities.City.create({
        name: legacySetting.city_name,
        region: legacySetting.city_location || 'غير محدد',
        contact_email: legacySetting.contact_email || null,
        contact_phone: legacySetting.contact_phone || null,
        status: 'active',
        registered_at: new Date().toISOString(),
        settings: { migrated_from_legacy: true },
      });

      if (created?.id) {
        await attachLegacyDataToCity(created.id, legacySetting, members);
      }
    })().finally(() => {
      ensureLegacyCityPromise = null;
    });
  }

  await ensureLegacyCityPromise;
}

// =============================================
// Supabase helper — تعامل مباشر مع جدول cities
// =============================================
function getSupabaseClient() {
  if (!appParams.useSupabaseBackend) return null;
  try {
    return createClient(appParams.supabaseUrl, appParams.supabaseAnonKey);
  } catch {
    return null;
  }
}

// =============================================
// واجهة المدن
// =============================================

/**
 * جلب قائمة المدن (وزارة الصحة فقط)
 */
export async function listCities({ status } = {}) {
  // إذا كانت الخلفية Supabase
  if (api?.entities?.City) {
    await ensureLegacyCityRegistered();
    if (status) return await api.entities.City.filter({ status }, '-created_at');
    return await api.entities.City.list('-created_at');
  }

  // fallback: طلب مباشر لـ supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase.from('cities').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  // local mock
  const stored = JSON.parse(localStorage.getItem('mock_cities') || '[]');
  return status ? stored.filter(c => c.status === status) : stored;
}

/**
 * إنشاء مدينة جديدة (من لوحة الوزارة)
 */
export async function createCity(cityData) {
  const record = {
    ...cityData,
    status: cityData.status ?? 'active',
    registered_at: new Date().toISOString(),
  };

  if (api?.entities?.City) {
    const city = await api.entities.City.create(record);
    // تهيئة إعدادات المدينة مباشرة بعد التسجيل
    try {
      if (api?.entities?.Settings) {
        await api.entities.Settings.create({
          city_id: city.id,
          city_name: city.name,
          city_location: city.region || '',
          contact_email: city.contact_email || '',
          contact_phone: city.contact_phone || '',
        });
      }
    } catch {
      // لا نوقف إنشاء المدينة إذا فشلت تهيئة الإعدادات
    }
    return city;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from('cities').insert([record]).select().single();
    if (error) throw error;
    try {
      await supabase.from('settings').insert([{
        city_id: data.id,
        city_name: data.name,
        city_location: data.region || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
      }]);
    } catch {
      // best-effort
    }
    return data;
  }

  // local mock
  const stored = JSON.parse(localStorage.getItem('mock_cities') || '[]');
  const newCity = { id: crypto.randomUUID(), ...record, created_at: new Date().toISOString() };
  localStorage.setItem('mock_cities', JSON.stringify([...stored, newCity]));
  try {
    const settings = JSON.parse(localStorage.getItem('mock_city_settings') || '[]');
    settings.push({
      id: crypto.randomUUID(),
      city_id: newCity.id,
      city_name: newCity.name,
      city_location: newCity.region || '',
      contact_email: newCity.contact_email || '',
      contact_phone: newCity.contact_phone || '',
    });
    localStorage.setItem('mock_city_settings', JSON.stringify(settings));
  } catch {
    // best-effort
  }
  return newCity;
}

/**
 * تحديث بيانات مدينة
 */
export async function updateCity(cityId, updates) {
  if (api?.entities?.City) {
    return await api.entities.City.update(cityId, updates);
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('cities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', cityId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // local mock
  const stored = JSON.parse(localStorage.getItem('mock_cities') || '[]');
  const updated = stored.map(c => c.id === cityId ? { ...c, ...updates } : c);
  localStorage.setItem('mock_cities', JSON.stringify(updated));
  return updated.find(c => c.id === cityId);
}

/**
 * تعليق / تفعيل مدينة
 */
export async function setCityStatus(cityId, status) {
  return updateCity(cityId, { status });
}

/**
 * حذف مدينة (حذف ناعم — تغيير الحالة لـ deleted)
 */
export async function deleteCity(cityId) {
  return updateCity(cityId, { status: 'deleted' });
}

/**
 * جلب ملخص أداء مدينة (مؤشرات سريعة)
 */
export async function getCitySummary(cityId) {
  if (!cityId) return null;

  try {
    // نحاول جلب المعايير الخاصة بالمدينة
    let standards = [];
    if (api?.entities?.Standard) {
      standards = (await api.entities.Standard.list()) ?? [];
      standards = standards.filter(s => s.city_id === cityId);
    }

    const total = standards.length;
    const completed = standards.filter(s => s.status === 'completed' || s.completion_percentage >= 100).length;
    const inProgress = standards.filter(s => s.status === 'in_progress' || (s.completion_percentage > 0 && s.completion_percentage < 100)).length;

    return {
      cityId,
      totalStandards: total,
      completedStandards: completed,
      inProgressStandards: inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  } catch {
    return { cityId, totalStandards: 0, completedStandards: 0, inProgressStandards: 0, completionRate: 0 };
  }
}

/**
 * إنشاء حساب مدير المدينة بعد تسجيل المدينة
 */
export async function createCityAdmin({ cityId, email, fullName, password }) {
  try {
    if (api?.auth?.register) {
      const user = await api.auth.register({ email, password, fullName });
      // ربط المستخدم بالمدينة وتعيين دور governor
      if (api?.entities?.TeamMember) {
        await api.entities.TeamMember.create({
          user_id: user?.id,
          city_id: cityId,
          role: 'governor',
          full_name: fullName,
          email,
        });
      }
      return user;
    }
  } catch (err) {
    console.warn('[citiesApi] createCityAdmin:', err?.message);
  }
  return null;
}
