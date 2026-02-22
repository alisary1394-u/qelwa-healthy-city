/**
 * بذرة البيانات للسيرفر (محاور، معايير، لجان، فريق، مبادرات، مهام، ميزانيات)
 */
import * as db from './db.js';

const PASS = '123456';
const COMMITTEES = [
  { name: 'اللجنة الرئيسية', description: 'اللجنة الرئيسية التي تنبثق منها جميع لجان المدينة الصحية' },
  { name: 'لجنة الحوكمة والشراكات', description: 'الحوكمة والشراكات' },
  { name: 'لجنة المشاركة المجتمعية', description: 'المشاركة المجتمعية' },
  { name: 'لجنة البيئة والاستدامة', description: 'البيئة والاستدامة' },
  { name: 'لجنة الصحة والرعاية الصحية', description: 'الصحة والرعاية' },
  { name: 'لجنة النقل والتنقل الآمن', description: 'النقل والتنقل' },
  { name: 'لجنة الإسكان والخدمات الأساسية', description: 'الإسكان والخدمات' },
  { name: 'لجنة التعليم والثقافة', description: 'التعليم والثقافة' },
  { name: 'لجنة الاقتصاد والتشغيل', description: 'الاقتصاد والتشغيل' },
  { name: 'لجنة السلامة والعدالة الاجتماعية', description: 'السلامة والعدالة' },
];
const AXES = [
  'الحوكمة والشراكات', 'المشاركة المجتمعية', 'البيئة والاستدامة', 'الصحة والرعاية',
  'النقل والتنقل', 'الإسكان والخدمات', 'التعليم والثقافة', 'الاقتصاد والتشغيل', 'السلامة والعدالة'
];
/** عدد المعايير لكل محور وفق دليل منظمة الصحة العالمية (المجموع 80) */
const AXIS_COUNTS = [9, 9, 9, 9, 9, 9, 9, 9, 8];

function id() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

export async function runSeed() {
  const baseDate = new Date().toISOString().split('T')[0];

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
  let nextId = 1;
  const used = membersNow.map((m) => m.national_id);
  while (used.includes(String(nextId))) nextId++;

  if (!membersNow.some((m) => m.role === 'coordinator')) {
    db.create('team_member', null, {
      full_name: 'منسق المدينة الصحية',
      national_id: String(nextId++),
      password: PASS,
      email: 'coordinator@local',
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
