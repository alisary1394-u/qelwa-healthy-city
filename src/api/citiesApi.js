/**
 * citiesApi.js — واجهة برمجية لإدارة المدن الصحية
 * تستخدم نفس الخلفية المُهيأة في apiClient.js (Supabase / Server / Local)
 */

import { api } from '@/api/apiClient';
import { appParams } from '@/lib/app-params';
import { getAllHostCityTemplates } from '@/lib/city-hosts';
import { createClient } from '@supabase/supabase-js';

let ensureLegacyCityPromise = null;

function normalizeCityName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toLegacyCityId(name) {
  const slug = normalizeCityName(name).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return `legacy-${slug || 'city'}`;
}

function toVirtualCityId(key) {
  return `virtual-${String(key || 'city').trim().toLowerCase()}`;
}

function isLegacyDerivedCity(cityOrId) {
  if (!cityOrId) return false;
  if (typeof cityOrId === 'object') {
    return cityOrId?.is_legacy_derived === true || String(cityOrId?.id || '').startsWith('legacy-');
  }
  return String(cityOrId).startsWith('legacy-');
}

function isVirtualCity(cityOrId) {
  if (!cityOrId) return false;
  if (typeof cityOrId === 'object') {
    return cityOrId?.is_virtual_city === true || String(cityOrId?.id || '').startsWith('virtual-');
  }
  return String(cityOrId).startsWith('virtual-');
}

function matchesCity(cityId, row, includeLegacyNull = false) {
  if (!row) return false;
  if (includeLegacyNull && row?.city_id == null) return true;
  return String(row?.city_id || '') === String(cityId);
}

async function findLegacyCitySetting(cityOrId) {
  const targetName = typeof cityOrId === 'object' ? cityOrId?.name : null;
  const settingsRaw = await api?.entities?.Settings?.list?.();
  const settings = Array.isArray(settingsRaw) ? settingsRaw : [];

  if (typeof cityOrId === 'object' && cityOrId?.id && !isLegacyDerivedCity(cityOrId)) {
    return settings.find((s) => String(s?.city_id || '') === String(cityOrId.id)) || null;
  }

  if (targetName) {
    return settings.find(
      (s) => !s?.city_id && normalizeCityName(s?.city_name) === normalizeCityName(targetName)
    ) || null;
  }

  return null;
}

async function listLegacyDerivedCities() {
  try {
    const settingsRaw = await api?.entities?.Settings?.list?.();
    const settings = Array.isArray(settingsRaw) ? settingsRaw : [];

    const legacySettings = settings.filter(
      (s) => s?.city_name && !s?.city_id && s?.scope !== 'ministry' && s?.is_ministry !== true
    );

    if (legacySettings.length === 0) return [];

    const dedup = new Map();
    for (const setting of legacySettings) {
      const normalized = normalizeCityName(setting.city_name);
      if (!normalized) continue;
      if (!dedup.has(normalized)) {
        dedup.set(normalized, {
          id: toLegacyCityId(setting.city_name),
          name: setting.city_name,
          region: setting.city_location || 'غير محدد',
          contact_email: setting.contact_email || null,
          contact_phone: setting.contact_phone || null,
          status: 'active',
          registered_at: setting.created_at || setting.updated_at || new Date().toISOString(),
          is_legacy_derived: true,
        });
      }
    }

    return [...dedup.values()];
  } catch {
    return [];
  }
}

function mergeConfiguredHostCities(cities) {
  const list = Array.isArray(cities) ? [...cities] : [];
  const configured = getAllHostCityTemplates();

  for (const template of configured) {
    const exists = list.some((city) => normalizeCityName(city?.name) === normalizeCityName(template.cityName));
    if (!exists) {
      list.push({
        id: toVirtualCityId(template.key),
        name: template.cityName,
        region: template.region || 'غير محدد',
        contact_email: null,
        contact_phone: null,
        status: 'active',
        registered_at: null,
        logo_text: template.logoText || '',
        is_virtual_city: true,
        hostnames: template.hostnames,
      });
    }
  }

  return list;
}

async function ensureConcreteCity(city) {
  if (!city || (!isVirtualCity(city) && !isLegacyDerivedCity(city))) return city;

  const existingCities = await listCities();
  const existing = existingCities.find((item) => normalizeCityName(item?.name) === normalizeCityName(city?.name) && !isVirtualCity(item));
  if (existing) return existing;

  return await createCity({
    name: city.name,
    region: city.region || '',
    contact_email: city.contact_email || '',
    contact_phone: city.contact_phone || '',
    status: city.status || 'active',
  });
}

async function createLegacyCityFromSettings(cityData) {
  if (!api?.entities?.Settings?.create) {
    throw new Error('تعذر تسجيل المدينة: كيان المدن غير متاح حالياً');
  }

  const existingSettingsRaw = await api?.entities?.Settings?.list?.();
  const existingSettings = Array.isArray(existingSettingsRaw) ? existingSettingsRaw : [];

  const normalizedName = normalizeCityName(cityData?.name);
  const duplicate = existingSettings.find(
    (s) => !s?.city_id && normalizeCityName(s?.city_name) === normalizedName
  );
  if (duplicate) {
    throw new Error('هذه المدينة مسجلة مسبقاً');
  }

  const now = new Date().toISOString();
  await api.entities.Settings.create({
    city_name: cityData.name,
    city_location: cityData.region || '',
    contact_email: cityData.contact_email || '',
    contact_phone: cityData.contact_phone || '',
    status: cityData.status || 'active',
    registered_at: now,
    legacy_city_registration: true,
  });

  return {
    id: toLegacyCityId(cityData.name),
    name: cityData.name,
    region: cityData.region || '',
    contact_email: cityData.contact_email || null,
    contact_phone: cityData.contact_phone || null,
    status: cityData.status || 'active',
    registered_at: now,
    is_legacy_derived: true,
  };
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
  // المسار الأساسي عبر الكيان City (إذا كان متاحًا)
  if (api?.entities?.City) {
    try {
      await ensureLegacyCityRegistered();
      if (status) {
        const byStatus = await api.entities.City.filter({ status }, '-created_at');
        if (Array.isArray(byStatus)) return mergeConfiguredHostCities(byStatus);
      } else {
        const allCities = await api.entities.City.list('-created_at');
        if (Array.isArray(allCities) && allCities.length > 0) return mergeConfiguredHostCities(allCities);
      }
    } catch {
      // نتابع إلى مسارات fallback
    }
  }

  // fallback: طلب مباشر لـ supabase (جدول cities)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('cities').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) return mergeConfiguredHostCities(data);
    } catch {
      // نتابع إلى fallback التالي
    }
  }

  // fallback: اشتقاق المدن من الإعدادات القديمة (قبل تفعيل city_id)
  const legacyDerivedCities = await listLegacyDerivedCities();
  if (legacyDerivedCities.length > 0) {
    const merged = mergeConfiguredHostCities(legacyDerivedCities);
    return status ? merged.filter((c) => c.status === status) : merged;
  }

  // local mock
  const stored = JSON.parse(localStorage.getItem('mock_cities') || '[]');
  const merged = mergeConfiguredHostCities(stored);
  return status ? merged.filter(c => c.status === status) : merged;
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
    try {
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
    } catch (err) {
      const msg = String(err?.message || '').toLowerCase();
      const isUnknownEntity =
        msg.includes('unknown entity') ||
        msg.includes('كيان غير معروف') ||
        msg.includes('entity');

      // fallback للأنظمة التي لا تحتوي كيان City بعد
      if (isUnknownEntity && api?.entities?.Settings?.create) {
        return await createLegacyCityFromSettings(record);
      }
      throw err;
    }
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

  // fallback إضافي: في حال عدم وجود City ولكن توجد Settings
  if (api?.entities?.Settings?.create) {
    return await createLegacyCityFromSettings(record);
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
  const cityRef = typeof cityId === 'object' ? cityId : { id: cityId };
  if (isVirtualCity(cityRef)) {
    const concreteCity = await ensureConcreteCity(cityRef);
    return updateCity(concreteCity, updates);
  }
  const resolvedCityId = cityRef?.id;

  if (isLegacyDerivedCity(cityRef)) {
    const legacySetting = await findLegacyCitySetting(cityRef);
    if (!legacySetting?.id || !api?.entities?.Settings?.update) {
      throw new Error('تعذر تعديل بيانات المدينة الحالية');
    }
    await api.entities.Settings.update(legacySetting.id, {
      city_name: updates.name ?? updates.city_name ?? legacySetting.city_name,
      city_location: updates.region ?? updates.city_location ?? legacySetting.city_location,
      contact_email: updates.contact_email ?? legacySetting.contact_email,
      contact_phone: updates.contact_phone ?? legacySetting.contact_phone,
      status: updates.status ?? legacySetting.status ?? 'active',
      updated_at: new Date().toISOString(),
    });
    return {
      ...cityRef,
      name: updates.name ?? updates.city_name ?? cityRef.name,
      region: updates.region ?? updates.city_location ?? cityRef.region,
      contact_email: updates.contact_email ?? cityRef.contact_email ?? null,
      contact_phone: updates.contact_phone ?? cityRef.contact_phone ?? null,
      status: updates.status ?? cityRef.status ?? 'active',
      is_legacy_derived: true,
    };
  }

  if (api?.entities?.City) {
    const updatedCity = await api.entities.City.update(resolvedCityId, updates);
    try {
      const settingsRaw = await api?.entities?.Settings?.list?.();
      const settings = Array.isArray(settingsRaw) ? settingsRaw : [];
      const citySetting = settings.find((s) => String(s?.city_id || '') === String(resolvedCityId));
      if (citySetting?.id && api?.entities?.Settings?.update) {
        await api.entities.Settings.update(citySetting.id, {
          city_name: updates.name ?? citySetting.city_name,
          city_location: updates.region ?? citySetting.city_location,
          contact_email: updates.contact_email ?? citySetting.contact_email,
          contact_phone: updates.contact_phone ?? citySetting.contact_phone,
        });
      }
    } catch {
      // best-effort
    }
    return updatedCity;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('cities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', resolvedCityId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // local mock
  const stored = JSON.parse(localStorage.getItem('mock_cities') || '[]');
  const updated = stored.map(c => c.id === resolvedCityId ? { ...c, ...updates } : c);
  localStorage.setItem('mock_cities', JSON.stringify(updated));
  return updated.find(c => c.id === resolvedCityId);
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
export async function getCitySummary(cityOrId) {
  const cityId = typeof cityOrId === 'object' ? cityOrId?.id : cityOrId;
  const legacyDerived = isLegacyDerivedCity(cityOrId);
  const virtualCity = isVirtualCity(cityOrId);

  if (!cityId) return null;

  if (virtualCity) {
    return {
      cityId,
      totalStandards: 0,
      completedStandards: 0,
      inProgressStandards: 0,
      completionRate: 0,
      teamMembersCount: 0,
      initiativesCount: 0,
      surveysCount: 0,
      committeesCount: 0,
      tasksCount: 0,
      evidencesCount: 0,
      budgetsCount: 0,
      totalBudget: 0,
      allocatedBudget: 0,
      spentBudget: 0,
      governor: null,
      coordinator: null,
    };
  }

  try {
    const [
      standardsRaw,
      teamRaw,
      initiativesRaw,
      surveysRaw,
      budgetsRaw,
      allocationsRaw,
      transactionsRaw,
      committeesRaw,
      tasksRaw,
      evidenceRaw,
    ] = await Promise.all([
      api?.entities?.Standard?.list?.() ?? [],
      api?.entities?.TeamMember?.list?.() ?? [],
      api?.entities?.Initiative?.list?.() ?? [],
      api?.entities?.FamilySurvey?.list?.() ?? [],
      api?.entities?.Budget?.list?.() ?? [],
      api?.entities?.BudgetAllocation?.list?.() ?? [],
      api?.entities?.Transaction?.list?.() ?? [],
      api?.entities?.Committee?.list?.() ?? [],
      api?.entities?.Task?.list?.() ?? [],
      api?.entities?.Evidence?.list?.() ?? [],
    ]);

    const byCity = (rows) => {
      const list = Array.isArray(rows) ? rows : [];
      if (legacyDerived) return list.filter((r) => matchesCity(cityId, r, true));
      return list.filter((r) => matchesCity(cityId, r, false));
    };

    const standards = byCity(standardsRaw);
    const teamMembers = byCity(teamRaw);
    const initiatives = byCity(initiativesRaw);
    const surveys = byCity(surveysRaw);
    const budgets = byCity(budgetsRaw);
    const allocations = byCity(allocationsRaw);
    const transactions = byCity(transactionsRaw);
    const committees = byCity(committeesRaw);
    const tasks = byCity(tasksRaw);
    const evidences = byCity(evidenceRaw);
    const governor = teamMembers.find((m) => m?.role === 'governor') || null;
    const coordinator = teamMembers.find((m) => m?.role === 'coordinator') || null;

    const total = standards.length;
    const completed = standards.filter((s) => s.status === 'completed' || toNumber(s.completion_percentage) >= 100).length;
    const inProgress = standards.filter((s) => s.status === 'in_progress' || (toNumber(s.completion_percentage) > 0 && toNumber(s.completion_percentage) < 100)).length;

    const totalBudget = budgets.reduce((sum, b) => sum + toNumber(b.total_budget ?? b.budget ?? b.amount), 0);
    const allocatedBudget = allocations.reduce((sum, a) => sum + toNumber(a.allocated_amount ?? a.amount), 0);
    const spentBudget =
      allocations.reduce((sum, a) => sum + toNumber(a.spent_amount), 0) +
      transactions.reduce((sum, t) => sum + toNumber(t.amount), 0);

    return {
      cityId,
      totalStandards: total,
      completedStandards: completed,
      inProgressStandards: inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      teamMembersCount: teamMembers.length,
      initiativesCount: initiatives.length,
      surveysCount: surveys.length,
      committeesCount: committees.length,
      tasksCount: tasks.length,
      evidencesCount: evidences.length,
      budgetsCount: budgets.length,
      totalBudget,
      allocatedBudget,
      spentBudget,
      governor,
      coordinator,
    };
  } catch {
    return {
      cityId,
      totalStandards: 0,
      completedStandards: 0,
      inProgressStandards: 0,
      completionRate: 0,
      teamMembersCount: 0,
      initiativesCount: 0,
      surveysCount: 0,
      committeesCount: 0,
      tasksCount: 0,
      evidencesCount: 0,
      budgetsCount: 0,
      totalBudget: 0,
      allocatedBudget: 0,
      spentBudget: 0,
      governor: null,
      coordinator: null,
    };
  }
}

export async function saveCityLeadership(city, payload) {
  if (!city?.id || !payload?.role) {
    throw new Error('بيانات الدور أو المدينة غير مكتملة');
  }

  const targetCity = await ensureConcreteCity(city);

  if (!api?.entities?.TeamMember) {
    throw new Error('إدارة أعضاء الفريق غير متاحة حالياً');
  }

  const role = payload.role;
  if (!['governor', 'coordinator'].includes(role)) {
    throw new Error('الدور غير مدعوم');
  }

  const membersRaw = await api.entities.TeamMember.list();
  const members = Array.isArray(membersRaw) ? membersRaw : [];
  const existing = members.find((member) => member.role === role && matchesCity(targetCity.id, member, isLegacyDerivedCity(targetCity)));

  const nextData = {
    ...(existing || {}),
    full_name: String(payload.full_name || '').trim(),
    national_id: String(payload.national_id || '').trim(),
    email: String(payload.email || '').trim(),
    phone: String(payload.phone || '').trim(),
    role,
    city_id: targetCity.id,
    department: payload.department || targetCity.name,
    status: payload.status || 'active',
    join_date: payload.join_date || existing?.join_date || new Date().toISOString().split('T')[0],
  };

  if (!nextData.full_name || !nextData.national_id || !nextData.email) {
    throw new Error('الاسم ورقم الهوية والبريد الإلكتروني مطلوبة');
  }

  if (payload.password) {
    nextData.password = String(payload.password);
  } else if (!existing?.id) {
    throw new Error('كلمة المرور مطلوبة عند إنشاء الحساب');
  } else {
    delete nextData.password;
  }

  delete nextData.id;

  if (existing?.id) {
    return await api.entities.TeamMember.update(existing.id, nextData);
  }

  return await api.entities.TeamMember.create(nextData);
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
