/**
 * تثبيت البيانات الحالية كبيانات إنتاج دائمة داخل قاعدة البيانات.
 *
 * الاستخدام:
 *  SOURCE_API_URL=https://www.qeelwah.com TARGET_API_URL=http://localhost:8080 node scripts/persist-current-data.js
 *
 * ملاحظات:
 * - يقوم بقراءة البيانات من المصدر ثم Upsert إلى الهدف (إدراج/تحديث بدون حذف).
 * - يضيف مؤشرات في Settings أن البيانات إنتاجية وليست تجريبية.
 */

const SOURCE_API_URL = String(process.env.SOURCE_API_URL || 'https://www.qeelwah.com').replace(/\/$/, '');
const TARGET_API_URL = String(process.env.TARGET_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const SOURCE_NATIONAL_ID = String(process.env.SOURCE_NATIONAL_ID || '1');
const SOURCE_PASSWORD = String(process.env.SOURCE_PASSWORD || '123456');
const TARGET_NATIONAL_ID = String(process.env.TARGET_NATIONAL_ID || '1');
const TARGET_PASSWORD = String(process.env.TARGET_PASSWORD || '123456');

const ENTITY_ORDER = [
  'Axis',
  'Standard',
  'Committee',
  'TeamMember',
  'Initiative',
  'Task',
  'Budget',
  'BudgetAllocation',
  'Transaction',
  'Settings',
  'Evidence',
  'InitiativeKPI',
  'FamilySurvey',
  'FileUpload',
  'UserPreferences',
];

function nowIso() {
  return new Date().toISOString();
}

async function login(apiBaseUrl, nationalId, password) {
  const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ national_id: nationalId, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(`Login failed for ${apiBaseUrl}: ${data.error || res.statusText}`);
  }
  return data.token;
}

async function api(apiBaseUrl, token, method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return data;
}

function sanitizePayload(record) {
  const payload = { ...(record || {}) };
  delete payload.created_at;
  delete payload.updated_at;
  delete payload.__v;
  return payload;
}

async function upsertEntity(sourceToken, targetToken, entityName) {
  let sourceList = [];
  let targetList = [];
  try {
    sourceList = await api(SOURCE_API_URL, sourceToken, 'GET', `/api/entities/${entityName}`);
    targetList = await api(TARGET_API_URL, targetToken, 'GET', `/api/entities/${entityName}`);
  } catch (error) {
    const msg = String(error?.message || '');
    if (msg.includes('كيان غير معروف') || msg.toLowerCase().includes('unknown')) {
      return {
        sourceCount: 0,
        targetBeforeCount: 0,
        created: 0,
        updated: 0,
        failed: 0,
        skipped: true,
      };
    }
    throw error;
  }
  const targetMap = new Map((targetList || []).map((item) => [item.id, item]));

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const row of sourceList || []) {
    const payload = sanitizePayload(row);
    const id = payload.id;
    if (!id) continue;

    try {
      if (targetMap.has(id)) {
        await api(TARGET_API_URL, targetToken, 'PATCH', `/api/entities/${entityName}/${id}`, payload);
        updated++;
      } else {
        await api(TARGET_API_URL, targetToken, 'POST', `/api/entities/${entityName}`, payload);
        created++;
      }
    } catch (error) {
      failed++;
      console.log(`   ✗ ${entityName} (${id}): ${error.message}`);
    }
  }

  return {
    sourceCount: (sourceList || []).length,
    targetBeforeCount: (targetList || []).length,
    created,
    updated,
    failed,
    skipped: false,
  };
}

async function upsertProductionFlags(targetToken) {
  const fixedSettings = [
    {
      id: 'settings_data_mode',
      key: 'data_mode',
      value: 'production',
      label: 'وضع البيانات',
      description: 'تم تثبيت البيانات كبيانات إنتاج دائمة',
      updated_at: nowIso(),
    },
    {
      id: 'settings_data_seed_type',
      key: 'data_seed_type',
      value: 'permanent',
      label: 'نوع البيانات',
      description: 'البيانات الحالية ليست تجريبية',
      updated_at: nowIso(),
    },
    {
      id: 'settings_data_locked_at',
      key: 'data_locked_at',
      value: nowIso(),
      label: 'تاريخ التثبيت',
      description: 'آخر تاريخ تثبيت لبيانات الإنتاج',
      updated_at: nowIso(),
    },
  ];

  const existing = await api(TARGET_API_URL, targetToken, 'GET', '/api/entities/Settings');
  const byId = new Map((existing || []).map((item) => [item.id, item]));

  for (const setting of fixedSettings) {
    if (byId.has(setting.id)) {
      await api(TARGET_API_URL, targetToken, 'PATCH', `/api/entities/Settings/${setting.id}`, setting);
    } else {
      await api(TARGET_API_URL, targetToken, 'POST', '/api/entities/Settings', setting);
    }
  }
}

async function main() {
  console.log('📌 بدء تثبيت البيانات الحالية كبيانات دائمة...');
  console.log(`🔎 المصدر: ${SOURCE_API_URL}`);
  console.log(`🗄️  الهدف: ${TARGET_API_URL}\n`);

  const sourceToken = await login(SOURCE_API_URL, SOURCE_NATIONAL_ID, SOURCE_PASSWORD);
  const targetToken = await login(TARGET_API_URL, TARGET_NATIONAL_ID, TARGET_PASSWORD);

  const report = {};
  for (const entity of ENTITY_ORDER) {
    console.log(`↻ معالجة ${entity}...`);
    const result = await upsertEntity(sourceToken, targetToken, entity);
    report[entity] = result;
    if (result.skipped) {
      console.log('   ↺ تم التخطي: الكيان غير مدعوم في واجهة الـ API الحالية');
    } else {
      console.log(
        `   ✓ source=${result.sourceCount}, target_before=${result.targetBeforeCount}, created=${result.created}, updated=${result.updated}, failed=${result.failed}`
      );
    }
  }

  await upsertProductionFlags(targetToken);

  console.log('\n✅ تم تثبيت البيانات بنجاح مع تعيينها كبيانات إنتاج دائمة في Settings.');
  console.log('📊 ملخص سريع:');
  Object.entries(report).forEach(([entity, r]) => {
    if (r.skipped) {
      console.log(` - ${entity}: skipped`);
      return;
    }
    console.log(` - ${entity}: source=${r.sourceCount}, created=${r.created}, updated=${r.updated}, failed=${r.failed}`);
  });
}

main().catch((error) => {
  console.error('\n❌ فشل تثبيت البيانات:', error.message);
  process.exitCode = 1;
});
