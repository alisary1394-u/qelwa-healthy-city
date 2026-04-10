/**
 * سكربت توليد فرص تطوعية ذكي
 * يبني الفرص من: المعايير + اللجان + المبادرات + المهام
 * ويسند داخل كل فرصة أعضاء اللجنة: رئيس + مشرفين + متطوعين
 */

const API_BASE_URL = process.env.SEED_API_URL || process.env.API_URL || 'https://www.qeelwah.com';
const ALLOW_REMOTE_SEED = String(process.env.ALLOW_REMOTE_SEED || '').toLowerCase() === 'true';
const LOGIN_NATIONAL_ID = process.env.SEED_NATIONAL_ID || '1';
const LOGIN_PASSWORD = process.env.SEED_PASSWORD || '123456';
const CREATED_BY = process.env.SEED_CREATED_BY || 'مولد فرص التطوع';

let authToken = null;

function isLocalApi(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(url || '').replace(/\/$/, ''));
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function chooseTypeFromText(text = '') {
  const t = String(text);
  if (/توعية|تثقيف|تدخين|تغذية|صحة/i.test(t)) return 'awareness';
  if (/ميداني|مسح|حصر|زيارة/i.test(t)) return 'field_survey';
  if (/تدريب|ورشة|تمكين/i.test(t)) return 'training';
  if (/فعالية|مجتمعية|حملة/i.test(t)) return 'community_event';
  if (/لجنة|اجتماع|تنسيق|حوكمة|شراكة/i.test(t)) return 'committee_work';
  return 'initiative_support';
}

function chooseStatusFromSource(...statuses) {
  const s = statuses.filter(Boolean);
  if (s.some((v) => v === 'completed' || v === 'closed')) return 'closed';
  if (s.some((v) => v === 'in_progress')) return 'in_progress';
  if (s.some((v) => v === 'planning' || v === 'draft' || v === 'pending')) return 'draft';
  return 'open';
}

function cleanText(value, fallback = '') {
  const v = String(value || '').trim();
  return v || fallback;
}

async function login() {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ national_id: LOGIN_NATIONAL_ID, password: LOGIN_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.error || `فشل تسجيل الدخول (${res.status})`);
  }
  authToken = data.token;
  return data.user;
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `${res.status} ${res.statusText}`);
  }
  return data;
}

function roleLabel(role) {
  const map = {
    committee_head: 'رئيس لجنة',
    committee_supervisor: 'مشرف لجنة',
    committee_coordinator: 'مشرف لجنة',
    volunteer: 'متطوع',
  };
  return map[role] || 'عضو';
}

function buildAssignedVolunteers({ committeeMembers, maxVolunteers = 10 }) {
  const heads = committeeMembers.filter((m) => m.role === 'committee_head');
  const supervisors = committeeMembers.filter((m) => m.role === 'committee_supervisor' || m.role === 'committee_coordinator');
  const volunteers = committeeMembers.filter((m) => m.role === 'volunteer');

  const chosen = [];
  if (heads[0]) chosen.push(heads[0]);
  chosen.push(...supervisors.slice(0, 2));

  const remaining = Math.max(0, maxVolunteers - chosen.length);
  if (remaining > 0) {
    chosen.push(...volunteers.slice(0, remaining));
  }

  const date = todayISO();
  return chosen
    .filter(Boolean)
    .map((m) => ({
      volunteer_id: m.id || m.email || m.national_id,
      volunteer_name: m.full_name,
      volunteer_phone: m.phone || '',
      status: m.role === 'volunteer' ? 'approved' : 'completed',
      applied_date: date,
      approved_date: date,
      hours_worked: m.role === 'volunteer' ? 0 : 2,
      notes: `الدور: ${roleLabel(m.role)}`,
    }));
}

function buildBaseOpportunity({
  title,
  description,
  committee,
  initiative,
  axis,
  requiredSkills,
  type,
  status,
  minVolunteers,
  maxVolunteers,
  startDate,
  endDate,
  notes,
  volunteers,
}) {
  return {
    title: cleanText(title, 'فرصة تطوعية'),
    description: cleanText(description, 'فرصة تطوعية داعمة لبرامج المدينة الصحية.'),
    type: type || 'initiative_support',
    committee_id: committee?.id || '',
    committee_name: committee?.name || initiative?.committee_name || '',
    initiative_id: initiative?.id || '',
    initiative_name: initiative?.title || '',
    axis_id: axis?.id || initiative?.axis_id || '',
    axis_name: axis?.name || initiative?.axis_name || '',
    required_skills: cleanText(requiredSkills, 'العمل الجماعي، التنظيم، التواصل'),
    min_volunteers: minVolunteers,
    max_volunteers: maxVolunteers,
    start_date: startDate,
    end_date: endDate,
    location: 'مدينة قلوة',
    status,
    volunteers,
    priority: status === 'in_progress' ? 'high' : 'medium',
    notes,
    created_by: CREATED_BY,
    created_by_name: CREATED_BY,
  };
}

function indexById(items) {
  return new Map(items.map((x) => [String(x.id), x]));
}

async function main() {
  console.log('🔄 بدء توليد فرص التطوع المتقدمة...');
  console.log(`🔗 API: ${API_BASE_URL}`);

  if (!isLocalApi(API_BASE_URL) && !ALLOW_REMOTE_SEED) {
    console.log('⛔ تم إيقاف العملية لحماية البيئة البعيدة.');
    console.log('شغّل بهذا الشكل للبيئة البعيدة: ALLOW_REMOTE_SEED=true');
    process.exitCode = 1;
    return;
  }

  const user = await login();
  console.log(`✅ تسجيل الدخول كمستخدم: ${user?.full_name || user?.email || 'unknown'}`);

  const [committees, initiatives, standards, tasks, members, axes, existingOpps] = await Promise.all([
    api('GET', '/api/entities/Committee'),
    api('GET', '/api/entities/Initiative'),
    api('GET', '/api/entities/Standard'),
    api('GET', '/api/entities/Task'),
    api('GET', '/api/entities/TeamMember'),
    api('GET', '/api/entities/Axis?orderBy=order'),
    api('GET', '/api/entities/VolunteerOpportunity'),
  ]);

  console.log(`📋 اللجان: ${committees.length}`);
  console.log(`💡 المبادرات: ${initiatives.length}`);
  console.log(`📏 المعايير: ${standards.length}`);
  console.log(`✅ المهام: ${tasks.length}`);
  console.log(`👥 الأعضاء: ${members.length}`);
  console.log(`🤝 فرص موجودة مسبقاً: ${existingOpps.length}`);

  const committeeById = indexById(committees);
  const axisById = indexById(axes);
  const memberById = indexById(members);
  const existingByTitle = new Map(existingOpps.map((o) => [String(o.title || '').trim(), o]));

  const membersByCommittee = new Map();
  for (const m of members) {
    const key = String(m.committee_id || '');
    if (!key) continue;
    if (!membersByCommittee.has(key)) membersByCommittee.set(key, []);
    membersByCommittee.get(key).push(m);
  }

  const opportunities = [];

  // 1) فرص من المبادرات
  for (const initiative of initiatives) {
    const committee = committeeById.get(String(initiative.committee_id || ''));
    if (!committee) continue;
    const committeeMembers = membersByCommittee.get(String(committee.id)) || [];
    const maxVolunteers = Math.min(20, Math.max(6, committeeMembers.filter((m) => m.role === 'volunteer').length + 3));
    const minVolunteers = Math.max(2, Math.min(6, maxVolunteers - 2));

    opportunities.push(buildBaseOpportunity({
      title: `فرصة تطوعية - ${initiative.title}`,
      description: `دعم مبادرة "${initiative.title}" المرتبطة ببرنامج المدينة الصحية وتنفيذ أنشطتها ميدانياً ومجتمعياً.`,
      committee,
      initiative,
      axis: axisById.get(String(initiative.axis_id || '')),
      requiredSkills: 'العمل الجماعي، الالتزام، التواصل، إدارة الوقت',
      type: chooseTypeFromText(`${initiative.title} ${initiative.description || ''}`),
      status: chooseStatusFromSource(initiative.status),
      minVolunteers,
      maxVolunteers,
      startDate: initiative.start_date || addDaysISO(5),
      endDate: initiative.end_date || addDaysISO(60),
      notes: `المصدر: مبادرة | initiative_id=${initiative.id}`,
      volunteers: buildAssignedVolunteers({ committeeMembers, maxVolunteers }),
    }));
  }

  // 2) فرص من المهام (المرتبطة بالمبادرات أو باللجان)
  for (const task of tasks) {
    const taskStatus = task.status || 'pending';
    if (taskStatus === 'completed') continue;

    let initiative = null;
    if (task.initiative_id) {
      initiative = initiatives.find((i) => String(i.id) === String(task.initiative_id)) || null;
    }

    let committee = null;
    if (initiative?.committee_id) {
      committee = committeeById.get(String(initiative.committee_id)) || null;
    }
    if (!committee && task.assigned_to) {
      const assignee = memberById.get(String(task.assigned_to));
      if (assignee?.committee_id) committee = committeeById.get(String(assignee.committee_id)) || null;
    }
    if (!committee && task.committee_id) {
      committee = committeeById.get(String(task.committee_id)) || null;
    }
    if (!committee) continue;

    const committeeMembers = membersByCommittee.get(String(committee.id)) || [];
    const maxVolunteers = Math.min(12, Math.max(4, committeeMembers.filter((m) => m.role === 'volunteer').length + 2));
    const minVolunteers = Math.max(1, Math.min(4, maxVolunteers - 1));

    opportunities.push(buildBaseOpportunity({
      title: `فرصة تنفيذ مهمة - ${task.title}`,
      description: cleanText(task.description, `فرصة تطوعية للمساهمة في تنفيذ المهمة: ${task.title}`),
      committee,
      initiative,
      axis: initiative?.axis_id ? axisById.get(String(initiative.axis_id)) : null,
      requiredSkills: 'التنفيذ الميداني، المتابعة، الالتزام بالوقت',
      type: chooseTypeFromText(`${task.title} ${task.description || ''}`),
      status: chooseStatusFromSource(task.status, initiative?.status),
      minVolunteers,
      maxVolunteers,
      startDate: addDaysISO(1),
      endDate: task.due_date || addDaysISO(30),
      notes: `المصدر: مهمة | task_id=${task.id}${initiative?.id ? ` | initiative_id=${initiative.id}` : ''}`,
      volunteers: buildAssignedVolunteers({ committeeMembers, maxVolunteers }),
    }));
  }

  // 3) فرص من المعايير (غير المكتملة/غير المعتمدة) عبر ربطها باللجنة الأقرب من المحور
  const initiativesByAxis = new Map();
  for (const init of initiatives) {
    const key = String(init.axis_id || '');
    if (!key) continue;
    if (!initiativesByAxis.has(key)) initiativesByAxis.set(key, []);
    initiativesByAxis.get(key).push(init);
  }

  for (const standard of standards) {
    if (standard.status === 'completed' || standard.status === 'approved') continue;
    const axisId = String(standard.axis_id || '');
    if (!axisId) continue;

    const relatedInitiatives = initiativesByAxis.get(axisId) || [];
    const anchorInitiative = relatedInitiatives[0] || null;
    const committee = anchorInitiative?.committee_id ? committeeById.get(String(anchorInitiative.committee_id)) : null;
    if (!committee) continue;

    const committeeMembers = membersByCommittee.get(String(committee.id)) || [];
    const maxVolunteers = Math.min(10, Math.max(4, committeeMembers.filter((m) => m.role === 'volunteer').length + 1));
    const minVolunteers = Math.max(2, Math.min(4, maxVolunteers - 1));

    opportunities.push(buildBaseOpportunity({
      title: `فرصة دعم معيار ${standard.code || ''} - ${standard.title || ''}`.trim(),
      description: cleanText(standard.description, `فرصة تطوعية لدعم تحقيق متطلبات المعيار ${standard.code || ''}.`),
      committee,
      initiative: anchorInitiative,
      axis: axisById.get(axisId),
      requiredSkills: 'جمع الأدلة، المتابعة، التوثيق، العمل الجماعي',
      type: 'committee_work',
      status: chooseStatusFromSource(standard.status, anchorInitiative?.status),
      minVolunteers,
      maxVolunteers,
      startDate: addDaysISO(3),
      endDate: addDaysISO(45),
      notes: `المصدر: معيار | standard_code=${standard.code || ''}`,
      volunteers: buildAssignedVolunteers({ committeeMembers, maxVolunteers }),
    }));
  }

  // 4) فرصة تشغيلية لكل لجنة (ثابتة)
  for (const committee of committees) {
    const committeeMembers = membersByCommittee.get(String(committee.id)) || [];
    const maxVolunteers = Math.min(10, Math.max(5, committeeMembers.filter((m) => m.role === 'volunteer').length + 2));
    opportunities.push(buildBaseOpportunity({
      title: `دعم أعمال ${committee.name}`,
      description: `فرصة تشغيلية مستمرة لمساندة أعمال ${committee.name} وتنفيذ خططها الشهرية.`,
      committee,
      initiative: null,
      axis: null,
      requiredSkills: 'التنسيق، إعداد التقارير، المتابعة الميدانية',
      type: 'committee_work',
      status: 'open',
      minVolunteers: 2,
      maxVolunteers,
      startDate: todayISO(),
      endDate: addDaysISO(180),
      notes: 'المصدر: لجنة',
      volunteers: buildAssignedVolunteers({ committeeMembers, maxVolunteers }),
    }));
  }

  // تنظيف التكرار بالعناوين فقط
  const uniqueByTitle = new Map();
  for (const opp of opportunities) {
    const key = String(opp.title || '').trim();
    if (!key) continue;
    if (!uniqueByTitle.has(key)) uniqueByTitle.set(key, opp);
  }
  const finalOpportunities = [...uniqueByTitle.values()];

  console.log(`\n🧩 إجمالي فرص مرشحة (بعد إزالة التكرار): ${finalOpportunities.length}`);

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const opp of finalOpportunities) {
    try {
      const existing = existingByTitle.get(opp.title);
      if (existing) {
        const payload = { ...existing, ...opp };
        delete payload.id;
        await api('PATCH', `/api/entities/VolunteerOpportunity/${existing.id}`, payload);
        updated++;
        console.log(`  ♻️ تحديث: ${opp.title}`);
      } else {
        await api('POST', '/api/entities/VolunteerOpportunity', opp);
        created++;
        console.log(`  ✅ إنشاء: ${opp.title}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ❌ فشل: ${opp.title} -> ${err.message}`);
    }
  }

  console.log('\n📊 ملخص التوليد:');
  console.log(`   ✅ تم الإنشاء: ${created}`);
  console.log(`   ♻️ تم التحديث: ${updated}`);
  console.log(`   ❌ فشل: ${failed}`);
}

main().catch((err) => {
  console.error('💥 خطأ غير متوقع:', err?.message || err);
  process.exitCode = 1;
});
