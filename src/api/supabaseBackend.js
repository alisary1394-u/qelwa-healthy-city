/**
 * خلفية Supabase (PostgreSQL): تخزين البيانات في قاعدة بيانات حقيقية.
 * تفعّل بوضع VITE_USE_SUPABASE_BACKEND=true و VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { appParams } from '@/lib/app-params';
import { AXES_SEED, buildStandardsSeed, AXIS_COUNTS, getAxisOrderFromStandardIndex } from '@/api/seedAxesAndStandards';
import { STANDARDS_CSV, getStandardCodeFromIndex } from '@/api/standardsFromCsv';
import { COMMITTEES_SEED, seedCommitteesTeamInitiativesTasks } from '@/api/seedCommitteesTeamInitiativesTasks';

const AUTH_KEY = 'local_current_user';
const SEEDED_KEY = 'local_seeded_governor';
const DEFAULT_NATIONAL_ID = '1';
const DEFAULT_PASSWORD = '123456';

function entityToTable(entityName) {
  return entityName
    .replace(/([A-Z])/g, (_, c) => '_' + c.toLowerCase())
    .replace(/^_/, '');
}

function rowToRecord(row) {
  if (!row) return null;
  return { id: row.id, ...(row.body || {}) };
}

function getId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

function sortBy(arr, orderBy) {
  if (!orderBy || typeof orderBy !== 'string') return [...arr];
  const [field, dir] = orderBy.startsWith('-') ? [orderBy.slice(1), -1] : [orderBy, 1];
  return [...arr].sort((a, b) => {
    const va = a[field];
    const vb = b[field];
    if (va == null && vb == null) return 0;
    if (va == null) return dir;
    if (vb == null) return -dir;
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return dir * (cmp || 0);
  });
}

const ENTITY_NAMES = [
  'TeamMember', 'Settings', 'Committee', 'Task', 'Notification', 'Axis', 'Standard',
  'Evidence', 'Initiative', 'InitiativeKPI', 'Budget', 'BudgetAllocation', 'Transaction',
  'FileUpload', 'FamilySurvey', 'UserPreferences', 'VerificationCode',
];

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  const url = appParams.supabaseUrl;
  const key = appParams.supabaseAnonKey;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY مطلوبان');
  supabase = createClient(url, key);
  return supabase;
}

function createEntityHandler(entityName) {
  const table = entityToTable(entityName);
  return {
    async list(orderBy) {
      const sb = getSupabase();
      const { data, error } = await sb.from(table).select('id, body');
      if (error) throw error;
      const arr = (data || []).map(rowToRecord);
      return sortBy(arr, orderBy);
    },
    async filter(query, orderBy, limit) {
      const sb = getSupabase();
      const { data, error } = await sb.from(table).select('id, body');
      if (error) throw error;
      let arr = (data || []).map(rowToRecord);
      if (query && typeof query === 'object') {
        arr = arr.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v));
      }
      arr = sortBy(arr, orderBy);
      if (typeof limit === 'number') arr = arr.slice(0, limit);
      return arr;
    },
    async get(id) {
      const sb = getSupabase();
      const { data, error } = await sb.from(table).select('id, body').eq('id', id).single();
      if (error || !data) return null;
      return rowToRecord(data);
    },
    async create(data) {
      const sb = getSupabase();
      const id = data.id || getId();
      const body = { ...data };
      delete body.id;
      const { data: inserted, error } = await sb.from(table).insert({ id, body }).select('id, body').single();
      if (error) throw error;
      return rowToRecord(inserted);
    },
    async update(id, data) {
      const sb = getSupabase();
      const { data: existing, error: eError } = await sb.from(table).select('id, body').eq('id', id).single();
      if (eError || !existing) return null;
      const body = { ...(existing.body || {}), ...data };
      delete body.id;
      const { data: updated, error } = await sb.from(table).update({ body }).eq('id', id).select('id, body').single();
      if (error) throw error;
      return rowToRecord(updated);
    },
    async delete(id) {
      const sb = getSupabase();
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

const entities = {};
ENTITY_NAMES.forEach((name) => {
  entities[name] = createEntityHandler(name);
});

function getCurrentUser() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (typeof localStorage === 'undefined') return;
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_KEY);
}

const auth = {
  async me() {
    const user = getCurrentUser();
    if (!user) {
      const err = new Error('غير مسجل الدخول');
      err.status = 401;
      throw err;
    }
    return user;
  },
  isAuthenticated() {
    return !!getCurrentUser();
  },
  logout(redirectUrl) {
    setCurrentUser(null);
    if (redirectUrl && typeof window !== 'undefined') window.location.href = redirectUrl;
  },
  redirectToLogin(url) {
    if (typeof window !== 'undefined') window.location.href = url || window.location.pathname || '/';
  },
  setUser(user) {
    setCurrentUser(user);
  },
};

const functions = {
  async sendVerificationCode(data) {
    return this.invoke('sendVerificationCode', data);
  },
  async verifyCode(data) {
    return this.invoke('verifyCode', data);
  },
  async invoke(name, data) {
    if (name === 'createFirstGovernor') {
      const members = await entities.TeamMember.list();
      if (members.length > 0) {
        return { success: false, message: 'يوجد أعضاء مسجلون بالفعل. استخدم تسجيل الدخول.' };
      }
      const { full_name, national_id, email, password } = data || {};
      if (!full_name || !national_id || !email || !password) {
        return { success: false, message: 'جميع الحقول مطلوبة.' };
      }
      await entities.TeamMember.create({
        full_name: String(full_name).trim(),
        national_id: String(national_id).trim(),
        email: String(email).trim().toLowerCase(),
        password: String(password),
        role: 'governor',
        status: 'active',
      });
      return { success: true, message: 'تم تسجيلك كمشرف عام. يمكنك الآن تسجيل الدخول.' };
    }
    if (name === 'sendVerificationCode') {
      const email = data?.email;
      if (!email) return { success: false, message: 'البريد مطلوب.' };
      const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4 أرقام
      const list = await entities.VerificationCode.filter({ email });
      for (const c of list) await entities.VerificationCode.delete(c.id);
      await entities.VerificationCode.create({
        email,
        code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        verified: false,
      });
      if (typeof console !== 'undefined') console.log('[Supabase] رمز التحقق لـ', email, ':', code);
      return { success: true, message: 'تم إعداد رمز التحقق.', code };
    }
    if (name === 'verifyCode') {
      const { email, code } = data || {};
      const list = await entities.VerificationCode.filter({ email });
      const rec = list.find((c) => c.code === String(code) && !c.verified);
      if (!rec) return { success: false, message: 'رمز التحقق غير صحيح.' };
      if (new Date(rec.expires_at) < new Date()) return { success: false, message: 'رمز التحقق منتهي الصلاحية.' };
      await entities.VerificationCode.update(rec.id, { verified: true });
      return { success: true, message: 'تم التحقق بنجاح.' };
    }
    return { success: false, message: 'دالة غير معرّفة.' };
  },
};

function buildUserFromMember(member) {
  if (!member) return null;
  return {
    email: member.email || (member.role === 'governor' ? 'admin@qeelwah.com' : `member-${member.national_id}@local`),
    full_name: member.full_name || 'المشرف',
    user_role: member.role === 'governor' ? 'admin' : 'user',
    national_id: member.national_id,
  };
}

export async function seedDefaultGovernorIfNeeded() {
  if (typeof localStorage === 'undefined') return null;
  const existing = getCurrentUser();
  if (existing) return existing;

  const members = await entities.TeamMember.list();
  if (members.length === 0) {
    const defaultGovernor = await entities.TeamMember.create({
      full_name: 'المشرف',
      national_id: DEFAULT_NATIONAL_ID,
      password: DEFAULT_PASSWORD,
      email: 'admin@qeelwah.com',
      role: 'governor',
      status: 'active',
    });
    const user = buildUserFromMember(defaultGovernor);
    setCurrentUser(user);
    try { localStorage.setItem(SEEDED_KEY, '1'); } catch (_) {}
    return user;
  }

  const defaultMember = members.find((m) => m.national_id === DEFAULT_NATIONAL_ID || m.role === 'governor');
  if (defaultMember) {
    const user = buildUserFromMember(defaultMember);
    setCurrentUser(user);
    return user;
  }
  return null;
}

export function getDefaultLocalCredentials() {
  return { national_id: DEFAULT_NATIONAL_ID, password: DEFAULT_PASSWORD };
}

function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  if (list.length === 0) return 'أدلة ومستندات تدعم تحقيق المعيار';
  return 'أدلة مطلوبة: ' + list.join('، ');
}

/** مزامنة المعايير من CSV: تحديث الموجودة وإضافة الناقصة (مثل م4-10، م4-11) — 13 محوراً، 86 معياراً */
async function syncStandardsKpisFromPdf() {
  let axesList = await entities.Axis.list('order');
  const numAxes = AXES_SEED.length;
  if (axesList.length < numAxes) {
    for (let idx = axesList.length; idx < numAxes; idx++) {
      await entities.Axis.create({ ...AXES_SEED[idx], order: idx + 1 });
    }
    axesList = await entities.Axis.list('order');
  }
  /** تصحيح رموز قديمة: م1-8/م1-9 → م2-1/م2-2؛ م2-8/م2-9 → م3-1/م3-2 (المحور 2 له 7 معايير فقط) */
  const CODE_CORRECTIONS = { 'م1-8': 'م2-1', 'م1-9': 'م2-2', 'م2-8': 'م3-1', 'م2-9': 'م3-2' };
  /** حذف سجلات مرقمة برموز خاطئة (مكررة) حتى لا يظهر م2-1 أو م2-2 مرتين */
  const CODES_TO_DELETE_AS_DUPLICATES = ['م1-8', 'م1-9', 'م2-8', 'م2-9'];
  let standards = await entities.Standard.list();
  for (const standard of standards) {
    const raw = (standard.code || '').trim().replace(/\s+/g, '');
    if (CODES_TO_DELETE_AS_DUPLICATES.includes(raw)) await entities.Standard.delete(standard.id);
  }
  standards = await entities.Standard.list();
  let updated = 0;
  for (const standard of standards) {
    let code = (standard.code || '').trim().replace(/\s+/g, '');
    const correctedCode = CODE_CORRECTIONS[code] || code;
    if (correctedCode !== code) code = correctedCode;
    if (!code) continue;
    const match = code.match(/م(\d+)-(\d+)/);
    if (!match) continue;
    const axisNum = parseInt(match[1], 10);
    const i = parseInt(match[2], 10);
    if (axisNum < 1 || axisNum > numAxes || i < 1) continue;
    const before = AXIS_COUNTS.slice(0, Math.min(axisNum - 1, AXIS_COUNTS.length)).reduce((a, b) => a + b, 0);
    const standardIndex = Math.min(STANDARDS_CSV.length - 1, before + (i - 1));
    const item = STANDARDS_CSV[standardIndex];
    if (!item) continue;
    const axisOrder = getAxisOrderFromStandardIndex(standardIndex);
    const axisName = AXES_SEED[axisOrder - 1]?.name ?? standard.axis_name;
    const axisRecord = axesList.find((a) => Number(a.order) === axisOrder);
    const axisId = axisRecord?.id ?? standard.axis_id;
    const documents = item.documents ?? [];
    const required_documents = JSON.stringify(documents);
    const required_evidence = buildRequiredEvidence(documents);
    const kpisList = Array.isArray(item.kpis) ? [...item.kpis] : [{ name: 'مؤشر التحقق', target: 'أدلة متوفرة (+)', unit: 'تحقق', description: item.title ?? '' }];
    const kpis = JSON.stringify(kpisList);
    const payload = {
      title: item.title ?? standard.title,
      description: item.title ?? standard.description,
      required_evidence,
      required_documents,
      kpis,
      axis_name: axisName,
      axis_id: axisId,
    };
    if (correctedCode !== (standard.code || '').trim().replace(/\s+/g, '')) payload.code = correctedCode;
    await entities.Standard.update(standard.id, payload);
    updated++;
  }
  const existingCodes = new Set(standards.map((s) => CODE_CORRECTIONS[(s.code || '').trim().replace(/\s+/g, '')] || s.code));
  let created = 0;
  for (let standardIndex = 0; standardIndex < STANDARDS_CSV.length; standardIndex++) {
    const code = getStandardCodeFromIndex(standardIndex);
    if (!code || existingCodes.has(code)) continue;
    const item = STANDARDS_CSV[standardIndex];
    const axisOrder = getAxisOrderFromStandardIndex(standardIndex);
    const axisRecord = axesList.find((a) => Number(a.order) === axisOrder);
    if (!axisRecord) continue;
    const documents = item?.documents ?? ['أدلة ومستندات تدعم تحقيق المعيار'];
    const kpisList = Array.isArray(item?.kpis) ? [...item.kpis] : [{ name: 'مؤشر التحقق', target: 'أدلة متوفرة (+)', unit: 'تحقق', description: item?.title ?? '' }];
    await entities.Standard.create({
      code,
      title: item?.title ?? `معيار ${axisRecord.name} ${code}`,
      description: item?.title ?? '',
      axis_id: axisRecord.id,
      axis_name: axisRecord.name,
      required_evidence: buildRequiredEvidence(documents),
      required_documents: JSON.stringify(documents),
      kpis: JSON.stringify(kpisList),
      status: 'not_started',
    });
    existingCodes.add(code);
    created++;
  }
  if (updated > 0 && typeof console !== 'undefined') console.log('[Supabase] تم تحديث المعايير (عنوان، وصف، أدلة، مؤشرات، محور)', updated, 'معياراً من ملف CSV');
  if (created > 0 && typeof console !== 'undefined') console.log('[Supabase] تمت إضافة المعايير الناقصة', created, 'معياراً');
}

export async function seedAxesAndStandardsIfNeeded() {
  const axesList = await entities.Axis.list();
  if (axesList.length === 0) {
    for (let idx = 0; idx < AXES_SEED.length; idx++) {
      await entities.Axis.create({ ...AXES_SEED[idx], order: idx + 1 });
    }
    const createdAxes = await entities.Axis.list('order');
    const standardsSeed = buildStandardsSeed(createdAxes);
    for (const s of standardsSeed) await entities.Standard.create(s);
  }
  await syncStandardsKpisFromPdf();
}

export async function seedCommitteesTeamInitiativesTasksIfNeeded() {
  if (typeof console !== 'undefined') console.log('[Supabase] تشغيل بذرة اللجان والفريق والمبادرات والمهام والميزانيات...');
  const getStore = async (entityName) => {
    const table = entityToTable(entityName);
    const sb = getSupabase();
    const { data } = await sb.from(table).select('id, body');
    return (data || []).map(rowToRecord);
  };
  await seedCommitteesTeamInitiativesTasks({ getStore, entities });
}

export async function clearLocalDataAndReseed() {
  const sb = getSupabase();
  // لا نمسح أعضاء الفريق أبداً — حماية لبيانات الأعضاء التي عدّلها المستخدم
  const tablesToClear = ENTITY_NAMES.filter((n) => n !== 'TeamMember').map(entityToTable);
  for (const table of tablesToClear) {
    try {
      await sb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[Supabase] حذف', table, e?.message);
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(SEEDED_KEY);
    }
  } catch (_) {}
  if (typeof console !== 'undefined') console.log('[Supabase] تم مسح البيانات. إعادة تحميل الصفحة...');
  if (typeof window !== 'undefined') window.location.reload();
}

export const supabaseBackend = {
  entities,
  auth,
  functions,
  asServiceRole: { entities, functions },
  seedDefaultGovernorIfNeeded,
  seedAxesAndStandardsIfNeeded,
  seedCommitteesTeamInitiativesTasksIfNeeded,
  clearLocalDataAndReseed,
  getDefaultLocalCredentials,
};
