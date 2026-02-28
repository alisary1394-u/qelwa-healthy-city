/**
 * واجهة للاتصال بسيرفر التطبيق (قاعدة بيانات محلية على السيرفر)
 * تفعّل عند وجود VITE_API_URL في .env.local
 */

const AUTH_USER_KEY = 'api_auth_user';

function entityToTable(name) {
  return String(name || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

import { appParams } from '@/lib/app-params';

function getBaseUrl() {
  return appParams.apiUrl || '';
}

const allowServerReseed = import.meta.env.DEV || appParams.allowServerReseed === true;

async function api(method, path, body) {
  const base = getBaseUrl();
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(base + path, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status >= 400) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
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

const ENTITY_NAMES = [
  'TeamMember', 'Settings', 'Committee', 'Task', 'Notification', 'Axis', 'Standard',
  'Evidence', 'KpiEvidence', 'Initiative', 'InitiativeKPI', 'Budget', 'BudgetAllocation', 'Transaction',
  'FileUpload', 'FamilySurvey', 'UserPreferences', 'VerificationCode',
];

function createEntityHandler(entityName) {
  const table = entityToTable(entityName);
  const path = '/api/entities/' + entityName;
  return {
    async list(orderBy) {
      const q = orderBy ? `?orderBy=${encodeURIComponent(orderBy)}` : '';
      return api('GET', path + q);
    },
    async filter(query, orderBy, limit) {
      let list = await api('GET', path + (orderBy ? `?orderBy=${encodeURIComponent(orderBy)}` : ''));
      if (query && typeof query === 'object') {
        list = list.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v));
      }
      if (typeof limit === 'number') list = list.slice(0, limit);
      return list;
    },
    async get(id) {
      return api('GET', path + '/' + encodeURIComponent(id));
    },
    async create(data) {
      return api('POST', path, data);
    },
    async update(id, data) {
      return api('PATCH', path + '/' + encodeURIComponent(id), data);
    },
    async delete(id) {
      return api('DELETE', path + '/' + encodeURIComponent(id));
    },
  };
}

const entities = {};
ENTITY_NAMES.forEach((name) => {
  entities[name] = createEntityHandler(name);
});

function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const auth = {
  async me() {
    const user = getStoredUser();
    if (!user) {
      const err = new Error('غير مسجل الدخول');
      err.status = 401;
      throw err;
    }
    return user;
  },
  isAuthenticated() {
    return !!getStoredUser();
  },
  logout(redirectUrl) {
    localStorage.removeItem(AUTH_USER_KEY);
    if (redirectUrl && typeof window !== 'undefined') window.location.href = redirectUrl;
  },
  redirectToLogin(url) {
    if (typeof window !== 'undefined') window.location.href = url || window.location.pathname || '/';
  },
  setUser(user) {
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
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
    const base = getBaseUrl();
    if (name === 'sendVerificationCode') {
      const res = await api('POST', '/api/functions/sendVerificationCode', data);
      return res;
    }
    if (name === 'verifyCode') {
      const res = await api('POST', '/api/functions/verifyCode', data);
      return res;
    }
    if (name === 'createFirstGovernor') {
      const members = await entities.TeamMember.list();
      if (members.length > 0) return { success: false, message: 'يوجد أعضاء مسجلون بالفعل.' };
      const { full_name, national_id, email, password } = data || {};
      if (!full_name || !national_id || !email || !password) return { success: false, message: 'جميع الحقول مطلوبة.' };
      await entities.TeamMember.create({
        full_name: String(full_name).trim(),
        national_id: String(national_id).trim(),
        email: String(email).trim().toLowerCase(),
        password: String(password),
        role: 'governor',
        status: 'active',
      });
      return { success: true, message: 'تم التسجيل. يمكنك تسجيل الدخول.' };
    }
    return { success: false, message: 'دالة غير معرّفة.' };
  },
};

async function seedDefaultGovernorIfNeeded() {
  if (!allowServerReseed) return null;
  const members = await entities.TeamMember.list();
  if (members.length > 0) return getStoredUser();
  await api('POST', '/api/seed');
  const after = await entities.TeamMember.list();
  const governor = after.find((m) => m.role === 'governor' || m.national_id === '1');
  if (governor) {
    const user = { email: governor.email, full_name: governor.full_name, user_role: governor.role === 'governor' ? 'admin' : 'user' };
    // لا نفعّل دخولاً تلقائياً — الدخول فقط عبر صفحة تسجيل الدخول
    return user;
  }
  return null;
}

function getDefaultLocalCredentials() {
  return { national_id: '1', password: '123456' };
}

async function seedAxesAndStandardsIfNeeded() {
  if (!allowServerReseed) return;
  const axes = await entities.Axis.list();
  if (axes.length === 0) await api('POST', '/api/seed');
}

async function seedCommitteesTeamInitiativesTasksIfNeeded() {
  if (!allowServerReseed) return;
  const committees = await entities.Committee.list();
  if (committees.length === 0) await api('POST', '/api/seed');
}

async function clearLocalDataAndReseed() {
  if (!allowServerReseed) {
    if (typeof window !== 'undefined') {
      window.alert('إعادة البذر على السيرفر معطّلة افتراضياً لحماية البيانات. فعّل VITE_ALLOW_SERVER_RESEED=true فقط عند الحاجة.');
    }
    return;
  }
  try {
    await api('POST', '/api/seed?clear=1');
  } catch (_) {}
  localStorage.removeItem(AUTH_USER_KEY);
  if (typeof window !== 'undefined') window.location.reload();
}

const backups = {
  async list() {
    return api('GET', '/api/backups');
  },
  async restoreLatest() {
    return api('POST', '/api/backups/restore-latest');
  },
};

export const apiBackend = {
  entities,
  auth,
  functions,
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const file_url = await uploadFileToDataUrl(file);
        return { file_url };
      },
    },
  },
  backups,
  asServiceRole: { entities, functions },
  seedDefaultGovernorIfNeeded,
  seedAxesAndStandardsIfNeeded,
  seedCommitteesTeamInitiativesTasksIfNeeded,
  clearLocalDataAndReseed,
  getDefaultLocalCredentials,
};
