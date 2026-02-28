/**
 * خلفية محلية بالكامل: تخزين البيانات في localStorage دون الحاجة لاتصال إنترنت أو سيرفر خارجي.
 * تفعّل بوضع VITE_USE_LOCAL_BACKEND=true في .env.local
 */

import { AXES_SEED, buildStandardsSeed, AXIS_COUNTS, getAxisOrderFromStandardIndex } from '@/api/seedAxesAndStandards';
import { STANDARDS_CSV, getStandardCodeFromIndex } from '@/api/standardsFromCsv';
import { seedCommitteesTeamInitiativesTasks } from '@/api/seedCommitteesTeamInitiativesTasks';

const DB_PREFIX = 'local_db_';
const AUTH_KEY = 'local_current_user';

function getId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

function getStore(entityName) {
  if (typeof localStorage === 'undefined') return [];
  const key = DB_PREFIX + entityName;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStore(entityName, arr) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DB_PREFIX + entityName, JSON.stringify(arr));
  } catch (e) {
    console.warn('localBackend setStore failed', e);
  }
}

function uploadFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('file is required'));
    if (typeof FileReader === 'undefined') return reject(new Error('FileReader is not available'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function createEntityHandler(entityName) {
  return {
    list(orderBy) {
      const arr = getStore(entityName);
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
    },
    filter(query, orderBy, limit) {
      let arr = getStore(entityName);
      if (query && typeof query === 'object') {
        arr = arr.filter((item) => {
          return Object.entries(query).every(([k, v]) => item[k] === v);
        });
      }
      if (orderBy && typeof orderBy === 'string') {
        const [field, dir] = orderBy.startsWith('-') ? [orderBy.slice(1), -1] : [orderBy, 1];
        arr = [...arr].sort((a, b) => {
          const va = a[field];
          const vb = b[field];
          const cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true });
          return dir * (cmp || 0);
        });
      }
      if (typeof limit === 'number') arr = arr.slice(0, limit);
      return arr;
    },
    get(id) {
      const arr = getStore(entityName);
      return arr.find((x) => x.id === id) ?? null;
    },
    create(data) {
      const arr = getStore(entityName);
      const id = data.id || getId();
      const record = { ...data, id };
      arr.push(record);
      setStore(entityName, arr);
      return record;
    },
    update(id, data) {
      const arr = getStore(entityName);
      const i = arr.findIndex((x) => x.id === id);
      if (i === -1) return null;
      arr[i] = { ...arr[i], ...data, id };
      setStore(entityName, arr);
      return arr[i];
    },
    delete(id) {
      const arr = getStore(entityName).filter((x) => x.id !== id);
      setStore(entityName, arr);
    },
  };
}

const ENTITY_NAMES = [
  'TeamMember', 'Settings', 'Committee', 'Task', 'Notification', 'Axis', 'Standard',
  'Evidence', 'KpiEvidence', 'Initiative', 'InitiativeKPI', 'Budget', 'BudgetAllocation', 'Transaction',
  'FileUpload', 'FamilySurvey', 'UserPreferences', 'VerificationCode',
];

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
      Object.defineProperty(err, 'status', { value: 401, writable: true, configurable: true });
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
  /** للتسجيل المحلي بعد التحقق من الرمز */
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
      const members = getStore('TeamMember');
      if (members.length > 0) {
        return { success: false, message: 'يوجد أعضاء مسجلون بالفعل. استخدم تسجيل الدخول.' };
      }
      const { full_name, national_id, email, password } = data || {};
      if (!full_name || !national_id || !email || !password) {
        return { success: false, message: 'جميع الحقول مطلوبة.' };
      }
      entities.TeamMember.create({
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
      const old = getStore('VerificationCode').filter((c) => c.email !== email);
      old.forEach((c) => entities.VerificationCode.delete(c.id));
      entities.VerificationCode.create({
        email,
        code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        verified: false,
      });
      if (typeof console !== 'undefined') console.log('[محلي] رمز التحقق لـ', email, ':', code);
      return { success: true, message: 'تم إعداد رمز التحقق.', code };
    }
    if (name === 'verifyCode') {
      const { email, code } = data || {};
      const list = getStore('VerificationCode').filter((c) => c.email === email && c.code === String(code) && !c.verified);
      if (list.length === 0) return { success: false, message: 'رمز التحقق غير صحيح.' };
      const rec = list[0];
      if (new Date(rec.expires_at) < new Date()) return { success: false, message: 'رمز التحقق منتهي الصلاحية.' };
      entities.VerificationCode.update(rec.id, { verified: true });
      return { success: true, message: 'تم التحقق بنجاح.' };
    }
    return { success: false, message: 'دالة غير معرّفة محلياً.' };
  },
};

const SEEDED_KEY = 'local_seeded_governor';

const DEFAULT_NATIONAL_ID = '1';
const DEFAULT_PASSWORD = '123456';

function buildUserFromMember(member) {
  if (!member) return null;
  return {
    email: member.email || (member.role === 'governor' ? 'admin@qeelwah.com' : `member-${member.national_id}@local`),
    full_name: member.full_name || 'المشرف',
    user_role: member.role === 'governor' ? 'admin' : 'user',
    national_id: member.national_id,
  };
}

/** إنشاء مشرف افتراضي عند الحاجة (بدون دخول تلقائي — الدخول عبر صفحة تسجيل الدخول فقط) */
export function seedDefaultGovernorIfNeeded() {
  if (typeof localStorage === 'undefined') return null;
  const members = getStore('TeamMember');
  const existing = getCurrentUser();
  if (existing) return existing;

  if (members.length === 0) {
    entities.TeamMember.create({
      full_name: 'المشرف',
      national_id: DEFAULT_NATIONAL_ID,
      password: DEFAULT_PASSWORD,
      email: 'admin@qeelwah.com',
      role: 'governor',
      status: 'active',
    });
    localStorage.setItem(SEEDED_KEY, '1');
    return null;
  }
  return null;
}

export function getDefaultLocalCredentials() {
  return { national_id: DEFAULT_NATIONAL_ID, password: DEFAULT_PASSWORD };
}

/** بناء نص الأدلة المطلوبة من قائمة المستندات (من ملف المعايير CSV) */
function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  if (list.length === 0) return 'أدلة ومستندات تدعم تحقيق المعيار';
  return 'أدلة مطلوبة: ' + list.join('، ');
}

/**
 * مزامنة المعايير من المرجع (standardsFromCsv): تحديث الموجودة وإضافة الناقصة.
 * المصدر الوحيد: مرجع-معايير-المحاور-للمقارنة — 9 محاور، 80 معياراً.
 */
export function syncStandardsKpisFromPdf() {
  if (typeof localStorage === 'undefined') return;
  let axesList = getStore('Axis');
  const numAxes = AXES_SEED.length;
  if (axesList.length < numAxes) {
    for (let idx = axesList.length; idx < numAxes; idx++) {
      entities.Axis.create({ ...AXES_SEED[idx], order: idx + 1 });
      axesList = getStore('Axis');
    }
  }
  axesList = getStore('Axis');
  const standards = getStore('Standard');
  const existingCodes = new Set(standards.map((s) => (s.code || '').trim().replace(/\s+/g, '')));
  let updated = 0;
  standards.forEach((standard) => {
    const code = (standard.code || '').trim().replace(/\s+/g, '');
    if (!code) return;
    const idx = getStandardIndexFromCodeInBackend(code);
    if (idx < 0 || idx >= STANDARDS_CSV.length) return;
    const item = STANDARDS_CSV[idx];
    const axisOrder = getAxisOrderFromStandardIndex(idx);
    const axisName = AXES_SEED[axisOrder - 1]?.name ?? standard.axis_name;
    const axisRecord = axesList.find((a) => Number(a.order) === axisOrder);
    const axisId = axisRecord?.id ?? standard.axis_id;
    const documents = item.documents ?? [];
    const kpisList = Array.isArray(item.kpis) ? [...item.kpis] : [{ name: 'مؤشر التحقق', target: 'أدلة متوفرة (+)', unit: 'تحقق', description: item.title ?? '' }];
    entities.Standard.update(standard.id, {
      title: item.title ?? standard.title,
      description: item.title ?? standard.description,
      required_evidence: buildRequiredEvidence(documents),
      required_documents: JSON.stringify(documents),
      kpis: JSON.stringify(kpisList),
      axis_name: axisName,
      axis_id: axisId,
    });
    updated += 1;
  });
  let created = 0;
  for (let standardIndex = 0; standardIndex < STANDARDS_CSV.length; standardIndex++) {
    const code = getStandardCodeFromIndex(standardIndex);
    if (!code || existingCodes.has(code.trim().replace(/\s+/g, ''))) continue;
    const item = STANDARDS_CSV[standardIndex];
    const axisOrder = getAxisOrderFromStandardIndex(standardIndex);
    const axisRecord = axesList.find((a) => Number(a.order) === axisOrder);
    if (!axisRecord) continue;
    const documents = item?.documents ?? ['أدلة ومستندات تدعم تحقيق المعيار'];
    const kpisList = Array.isArray(item?.kpis) ? [...item.kpis] : [{ name: 'مؤشر التحقق', target: 'أدلة متوفرة (+)', unit: 'تحقق', description: item?.title ?? '' }];
    entities.Standard.create({
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
    existingCodes.add(code.trim().replace(/\s+/g, ''));
    created += 1;
  }
  if (updated > 0 || created > 0) console.log('[localBackend] مزامنة المعايير من المرجع:', updated, 'تحديث،', created, 'إضافة');
}

function getStandardIndexFromCodeInBackend(code) {
  const match = String(code || '').trim().replace(/\s+/g, '').match(/م(\d+)-(\d+)/);
  if (!match) return -1;
  const axisNum = parseInt(match[1], 10);
  const i = parseInt(match[2], 10);
  if (axisNum < 1 || axisNum > AXIS_COUNTS.length || i < 1) return -1;
  const before = AXIS_COUNTS.slice(0, axisNum - 1).reduce((a, b) => a + b, 0);
  return Math.min(STANDARDS_CSV.length - 1, before + (i - 1));
}

/** إعادة المحاور الـ 9 و 80 معياراً إن كانت قائمة المحاور فارغة، ثم مزامنة المؤشرات من المرجع */
export function seedAxesAndStandardsIfNeeded() {
  if (typeof localStorage === 'undefined') return;
  const axesList = getStore('Axis');
  if (axesList.length === 0) {
    const createdAxes = [];
    AXES_SEED.forEach((a) => {
      const rec = entities.Axis.create({ ...a, order: a.order });
      createdAxes.push(rec);
    });
    const standardsSeed = buildStandardsSeed(createdAxes);
    standardsSeed.forEach((s) => entities.Standard.create(s));
  }
  syncStandardsKpisFromPdf();
}

/** حذف جميع المحاور والمعايير ثم إعادة بنائها من مرجع المعايير (9 محاور، 80 معياراً) */
export function clearAxesAndStandardsAndReseed() {
  if (typeof localStorage === 'undefined') return;
  const standards = getStore('Standard');
  standards.forEach((s) => entities.Standard.delete(s.id));
  const axes = getStore('Axis');
  axes.forEach((a) => entities.Axis.delete(a.id));
  seedAxesAndStandardsIfNeeded();
}

/** بذر اللجان (حسب المحاور)، فريق العمل، المبادرات، والمهام للاختبار */
export async function seedCommitteesTeamInitiativesTasksIfNeeded() {
  if (typeof localStorage === 'undefined') return;
  if (typeof console !== 'undefined') console.log('[localBackend] تشغيل بذرة اللجان والفريق والمبادرات والمهام والميزانيات...');
  await seedCommitteesTeamInitiativesTasks({ getStore: (n) => Promise.resolve(getStore(n)), entities });
}

/**
 * مسح البيانات المحلية (ما عدا أعضاء الفريق) وإعادة تحميل الصفحة حتى تُنفَّذ البذرة من جديد.
 * لا نمسح TeamMember أبداً حتى لا تُستبدل بيانات الأعضاء التي عدّلها المستخدم (بريد، اسم، إلخ).
 */
export function clearLocalDataAndReseed() {
  if (typeof localStorage === 'undefined') return;
  const skipTeamMember = 'TeamMember';
  ENTITY_NAMES.forEach((name) => {
    if (name === skipTeamMember) return;
    try {
      localStorage.removeItem(DB_PREFIX + name);
    } catch (_) {}
  });
  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SEEDED_KEY);
  } catch (_) {}
  if (typeof console !== 'undefined') console.log('[localBackend] تم مسح البيانات. إعادة تحميل الصفحة...');
  if (typeof window !== 'undefined') window.location.reload();
}

/** واجهة تحاكي العميل (api) للاستخدام في التطبيق */
export const localBackend = {
  entities,
  auth,
  functions,
  asServiceRole: { entities, functions },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const file_url = await uploadFileToDataUrl(file);
        return { file_url };
      },
    },
  },
  seedDefaultGovernorIfNeeded,
  seedAxesAndStandardsIfNeeded,
  clearAxesAndStandardsAndReseed,
  seedCommitteesTeamInitiativesTasksIfNeeded,
  clearLocalDataAndReseed,
  getDefaultLocalCredentials,
};
