/**
 * بذرة البيانات للسيرفر (محاور، معايير، لجان، فريق، مبادرات، مهام، ميزانيات).
 * لا نعدّل أعضاء الفريق الموجودين أبداً — نضيف فقط مناصب ناقصة (مثل منسق إن لم يوجد).
 */
import * as db from './db.js';

const PASS = '123456';
const DEFAULT_COORDINATOR_EMAIL = (process.env.DEFAULT_COORDINATOR_EMAIL || 'coordinator@local').trim().toLowerCase();
const DEFAULT_COORDINATOR_PASSWORD = process.env.DEFAULT_COORDINATOR_PASSWORD || PASS;
const DEFAULT_COORDINATOR_PHONE = process.env.DEFAULT_COORDINATOR_PHONE || '0500000001';
/** اللجان حسب الملحق الثاني من دليل معايير المدن الصحية (منظمة الصحة العالمية) – 8 محاور */
const COMMITTEES = [
  { name: 'اللجنة الرئيسية', description: 'اللجنة الرئيسية التي تنبثق منها جميع لجان المدينة الصحية' },
  { name: 'لجنة تنظيم المجتمع وتعبئته من أجل الصحة والتنمية', description: 'تنظيم المجتمع وتعبئته من أجل الصحة والتنمية (معايير 1–10)' },
  { name: 'لجنة مركز المعلومات والمشاركة المجتمعية', description: 'مركز المعلومات والمشاركة المجتمعية (معايير 11–19)' },
  { name: 'لجنة البيئة والاستدامة', description: 'البيئة والاستدامة (معايير 20–30)' },
  { name: 'لجنة الصحة والرعاية الصحية', description: 'الصحة والرعاية الصحية (معايير 31–56)' },
  { name: 'لجنة الطوارئ والاستعداد لها', description: 'الطوارئ والاستعداد لها (معايير 57–62)' },
  { name: 'لجنة التعليم والثقافة', description: 'التعليم والثقافة (معايير 63–67)' },
  { name: 'لجنة التدريب والمهارات', description: 'التدريب والمهارات (معايير 68–73)' },
  { name: 'لجنة الاقتصاد والإقراض', description: 'الاقتصاد والإقراض (معايير 74–80)' },
];
/** المحاور الثمانية حسب الملحق الثاني – معايير المدن الصحية (10+9+11+26+6+5+6+7=80) */
const AXES = [
  'تنظيم المجتمع وتعبئته من أجل الصحة والتنمية',
  'مركز المعلومات والمشاركة المجتمعية',
  'البيئة والاستدامة',
  'الصحة والرعاية الصحية',
  'الطوارئ والاستعداد لها',
  'التعليم والثقافة',
  'التدريب والمهارات',
  'الاقتصاد والإقراض',
];
/** عدد المعايير لكل محور وفق الملحق الثاني (10+9+11+26+6+5+6+7=80) */
const AXIS_COUNTS = [10, 9, 11, 26, 6, 5, 6, 7];

function id() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

export async function runSeed(options = {}) {
  const baseDate = new Date().toISOString().split('T')[0];
  // افتراضيًا لا نضيف أعضاء فريق تجريبيين (مثل coordinator@local) على السيرفر الحقيقي.
  // لتفعيل هذا السلوك التجريبي صراحةً: SEED_SAMPLE_TEAM=true
  const forceSampleTeam = options?.forceSampleTeam === true;
  const shouldSeedSampleTeam = forceSampleTeam || String(process.env.SEED_SAMPLE_TEAM || '').toLowerCase() === 'true';

  if (db.list('team_member').length === 0) {
    db.create('team_member', null, {
      full_name: 'المشرف',
      national_id: '1',
      password: PASS,
      email: 'admin@qeelwah.com',
      role: 'governor',
      status: 'active',
      join_date: baseDate,
    });
  }

  if (db.list('axis').length === 0) {
    AXES.forEach((name, i) => {
      db.create('axis', null, { name, description: name, order: i + 1 });
    });
  }

  const axes = db.list('axis');
  if (db.list('standard').length === 0 && axes.length > 0) {
    axes.forEach((axis, idx) => {
      const count = AXIS_COUNTS[idx] ?? 9;
      for (let i = 1; i <= count; i++) {
        const code = `م${idx + 1}-${i}`;
        db.create('standard', null, {
          code,
          title: `معيار ${axis.name} ${code}`,
          description: `معيار من دليل منظمة الصحة العالمية للمدينة الصحية — المحور: ${axis.name}.`,
          axis_id: axis.id,
          axis_name: axis.name,
          required_evidence: 'أدلة ومستندات تدعم تحقيق المعيار',
          required_documents: '[]',
          kpis: '[]',
          status: 'not_started',
        });
      }
    });
  }

  const committees = db.list('committee');
  if (committees.length === 0) {
    COMMITTEES.forEach((c) => db.create('committee', null, { name: c.name, description: c.description }));
  }

  const committeesNow = db.list('committee');
  const membersNow = db.list('team_member');
  if (shouldSeedSampleTeam) {
    let nextId = 1;
    const used = membersNow.map((m) => m.national_id);
    while (used.includes(String(nextId))) nextId++;

    // إضافة منسق افتراضي فقط عند عدم وجود أي منسق — لا نعدّل ولا نستبدل أي عضو موجود أبداً
    if (!membersNow.some((m) => m.role === 'coordinator')) {
      db.create('team_member', null, {
        full_name: 'منسق المدينة الصحية',
        national_id: String(nextId++),
        password: DEFAULT_COORDINATOR_PASSWORD,
        email: DEFAULT_COORDINATOR_EMAIL,
        phone: DEFAULT_COORDINATOR_PHONE,
        role: 'coordinator',
        committee_id: committeesNow[0]?.id,
        committee_name: committeesNow[0]?.name,
        department: 'لوحة التحكم',
        status: 'active',
        join_date: baseDate,
      });
    }

    const membersAfter = db.list('team_member');
    committeesNow.forEach((c, i) => {
      const roles = ['committee_head', 'committee_coordinator', 'committee_supervisor', 'member', 'volunteer'];
      const labels = { committee_head: 'رئيس', committee_coordinator: 'منسق', committee_supervisor: 'مشرف', member: 'عضو', volunteer: 'متطوع' };
      roles.forEach((role) => {
        if (!membersAfter.some((m) => m.role === role && m.committee_id === c.id)) {
          db.create('team_member', null, {
            full_name: `${labels[role]} ${c.name}`,
            national_id: String(nextId++),
            password: PASS,
            email: `${role}${i}@local`,
            role,
            committee_id: c.id,
            committee_name: c.name,
            department: c.name,
            status: 'active',
            join_date: baseDate,
          });
        }
      });
    });

    if (!membersNow.some((m) => m.role === 'budget_manager')) {
      db.create('team_member', null, {
        full_name: 'مدير الميزانية',
        national_id: String(nextId++),
        password: PASS,
        email: 'budget@local',
        role: 'budget_manager',
        department: 'الميزانية',
        status: 'active',
        join_date: baseDate,
      });
    }
    if (!membersNow.some((m) => m.role === 'accountant')) {
      db.create('team_member', null, {
        full_name: 'المحاسب',
        national_id: String(nextId++),
        password: PASS,
        email: 'accountant@local',
        role: 'accountant',
        department: 'الميزانية',
        status: 'active',
        join_date: baseDate,
      });
    }
    if (!membersNow.some((m) => m.role === 'financial_officer')) {
      db.create('team_member', null, {
        full_name: 'الموظف المالي',
        national_id: String(nextId++),
        password: PASS,
        email: 'financial@local',
        role: 'financial_officer',
        department: 'الميزانية',
        status: 'active',
        join_date: baseDate,
      });
    }
  }

  if (db.list('initiative').length === 0 && committeesNow.length > 0 && axes.length > 0) {
    const titles = ['مشاركة مجتمعية', 'بيئة خضراء', 'صحة ورعاية', 'نقل آمن', 'إسكان وخدمات', 'تعليم وثقافة', 'اقتصاد وتشغيل', 'سلامة وعدالة', 'حوكمة وشراكات'];
    titles.forEach((title, idx) => {
      const committee = committeesNow[idx % committeesNow.length];
      const axis = axes[idx % axes.length];
      db.create('initiative', null, {
        code: 'INI' + String(idx + 1).padStart(3, '0'),
        title: title,
        description: `مبادرة ${title}`,
        committee_id: committee?.id,
        committee_name: committee?.name,
        axis_id: axis?.id,
        axis_name: axis?.name,
        status: 'in_progress',
        priority: 'high',
        progress_percentage: 20,
        start_date: baseDate,
        end_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      });
    });
  }

  if (db.list('budget').length === 0) {
    const y = new Date().getFullYear();
    db.create('budget', null, {
      name: `ميزانية ${y - 1}`,
      fiscal_year: String(y - 1),
      total_budget: 500000,
      status: 'closed',
      remaining_budget: 500000,
    });
    db.create('budget', null, {
      name: `ميزانية ${y}`,
      fiscal_year: String(y),
      total_budget: 800000,
      status: 'active',
      remaining_budget: 800000,
    });
  }

  // مهام نموذجية (نفس قائمة المهام في seedCommitteesTeamInitiativesTasks)
  const tasksNow = db.list('task');
  const membersForTasks = db.list('team_member').filter((m) =>
    ['coordinator', 'committee_head', 'committee_coordinator', 'committee_supervisor', 'member'].includes(m.role)
  );
  if (tasksNow.length === 0 && membersForTasks.length > 0) {
    const baseDate = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const taskList = [
      { title: 'إعداد تقرير الربع الأول للمحور الأول', priority: 'high', status: 'in_progress', daysFromNow: 7 },
      { title: 'مراجعة مستندات معيار م1-2', priority: 'medium', status: 'pending', daysFromNow: 14 },
      { title: 'تنظيم ورشة المشاركة المجتمعية', priority: 'urgent', status: 'pending', daysFromNow: 5 },
      { title: 'متابعة مؤشرات مبادرة البيئة', priority: 'medium', status: 'in_progress', daysFromNow: 10 },
      { title: 'جمع أدلة معيار م3-1 (النظافة والمساحات الخضراء)', priority: 'high', status: 'pending', daysFromNow: 21 },
      { title: 'تحديث خطة اللجنة للشهر القادم', priority: 'low', status: 'pending', daysFromNow: 30 },
      { title: 'اجتماع تنسيق اللجان الفرعية', priority: 'high', status: 'pending', daysFromNow: 3 },
      { title: 'إعداد عرض تقديمي لاجتماع المحافظ', priority: 'urgent', status: 'in_progress', daysFromNow: 4 },
      { title: 'مسح ميداني للمعايير الصحية', priority: 'medium', status: 'pending', daysFromNow: 14 },
      { title: 'مراجعة الميزانية التقديرية للجنة', priority: 'high', status: 'pending', daysFromNow: 21 },
      { title: 'تقرير مؤشرات الأداء الشهرية', priority: 'medium', status: 'pending', daysFromNow: 10 },
      { title: 'متابعة تنفيذ مبادرة النقل الآمن', priority: 'high', status: 'in_progress', daysFromNow: 7 },
      { title: 'تحضير ورشة التوعية بالصحة المدرسية', priority: 'medium', status: 'pending', daysFromNow: 18 },
      { title: 'جمع تواقيع الشركاء على اتفاقيات التعاون', priority: 'low', status: 'pending', daysFromNow: 45 },
    ];
    taskList.forEach((t, i) => {
      const due = new Date(baseDate);
      due.setDate(due.getDate() + t.daysFromNow);
      const assigned = membersForTasks[i % membersForTasks.length];
      db.create('task', null, {
        title: t.title,
        description: `مهمة تجريبية - معينة لـ ${assigned?.full_name || 'الفريق'}.`,
        status: t.status,
        priority: t.priority,
        assigned_to: assigned?.id,
        assigned_to_name: assigned?.full_name,
        due_date: formatDate(due),
        created_date: formatDate(baseDate),
      });
    });
  }

  return { ok: true };
}
