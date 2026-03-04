/**
 * بذرة البيانات للسيرفر (محاور، معايير، لجان، فريق، مبادرات، مهام، ميزانيات).
 * لا نعدّل أعضاء الفريق الموجودين أبداً — نضيف فقط مناصب ناقصة (مثل منسق إن لم يوجد).
 */
import * as db from './db.js';

const PASS = '123456';
const DEFAULT_COORDINATOR_EMAIL = (process.env.DEFAULT_COORDINATOR_EMAIL || 'coordinator@local').trim().toLowerCase();
const DEFAULT_COORDINATOR_PASSWORD = process.env.DEFAULT_COORDINATOR_PASSWORD || PASS;
const DEFAULT_COORDINATOR_PHONE = process.env.DEFAULT_COORDINATOR_PHONE || '0500000001';
/** اللجان حسب ملف المعايير Healthy_Cities_Criteria.csv – 12 محوراً */
const COMMITTEES = [
  { name: 'اللجنة الرئيسية', description: 'اللجنة الرئيسية التي تنبثق منها جميع لجان المدينة الصحية' },
  { name: 'لجنة تنظيم المدينة الصحية', description: 'تنظيم المدينة الصحية (معايير 1–8)' },
  { name: 'لجنة تعبئة المجتمع', description: 'تعبئة المجتمع (معايير 9–16)' },
  { name: 'لجنة التعاون بين القطاعات', description: 'التعاون بين القطاعات (معايير 17–24)' },
  { name: 'لجنة القروض الصغيرة', description: 'القروض الصغيرة (معايير 25–29)' },
  { name: 'لجنة التعليم ومحو الأمية', description: 'التعليم ومحو الأمية (معايير 30–34)' },
  { name: 'لجنة التنمية الصحية', description: 'التنمية الصحية (معايير 35–44)' },
  { name: 'لجنة المياه والصرف الصحي والبيئة', description: 'المياه والصرف الصحي والبيئة (معايير 45–52)' },
  { name: 'لجنة الغذاء والبيئة', description: 'الغذاء والبيئة (معايير 53–56)' },
  { name: 'لجنة سلامة الأغذية', description: 'سلامة الأغذية (معايير 57–60)' },
  { name: 'لجنة تخطيط الطوارئ', description: 'تخطيط الطوارئ (معايير 61–66)' },
  { name: 'لجنة السلامة العامة', description: 'السلامة العامة (معايير 67–72)' },
  { name: 'لجنة الرصد والتقييم', description: 'الرصد والتقييم (معايير 73–80)' },
];
/** المحاور الـ 9 حسب معايير WHO (أسماء مختصرة) */
const AXES = [
  'الشراكات والتعاون',
  'تنظيم المجتمع والتعبئة',
  'المعلومات المجتمعية',
  'المياه والبيئة والغذاء',
  'التنمية الصحية',
  'الطوارئ والاستجابة',
  'التعليم ومحو الأمية',
  'المهارات والتدريب',
  'القروض الصغيرة',
];
/** عدد المعايير لكل محور (9 محاور — 7+7+5+11+26+6+5+6+7=80) */
const AXIS_COUNTS = [7, 7, 5, 11, 26, 6, 5, 6, 7];

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

  const axes = db.list('axis').sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  if (db.list('standard').length === 0 && axes.length > 0) {
    axes.forEach((axis) => {
      const axisOrder = Number(axis.order) || 1;
      const count = AXIS_COUNTS[axisOrder - 1] ?? 9;
      for (let i = 1; i <= count; i++) {
        const code = `م${axisOrder}-${i}`;
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

  // إزالة المعايير المكررة — الإبقاء على أفضل نسخة لكل رمز
  const allStandards = db.list('standard');
  const codeMap = {};
  for (const s of allStandards) {
    const code = (s.code || '').trim().replace(/\s+/g, '');
    if (!code) continue;
    if (!codeMap[code]) codeMap[code] = [];
    codeMap[code].push(s);
  }
  let removedDuplicates = 0;
  for (const code of Object.keys(codeMap)) {
    const items = codeMap[code];
    if (items.length <= 1) continue;
    items.sort((a, b) => {
      const aReal = a.title && !a.title.startsWith('معيار ') ? 1 : 0;
      const bReal = b.title && !b.title.startsWith('معيار ') ? 1 : 0;
      if (bReal !== aReal) return bReal - aReal;
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });
    for (let i = 1; i < items.length; i++) {
      try { db.remove('standard', items[i].id); removedDuplicates++; } catch {}
    }
  }
  if (removedDuplicates > 0) console.log(`[seed] إزالة ${removedDuplicates} معيار مكرر`);

  const committees = db.list('committee');
  if (committees.length === 0) {
    // إنشاء اللجنة الرئيسية أولاً
    const mainCommittee = db.create('committee', null, {
      name: 'اللجنة الرئيسية',
      description: 'اللجنة الرئيسية لبرنامج مدينة قلوة الصحية — تشرف على جميع اللجان وتنسق العمل بينها',
      level: 'main',
      type: 'main',
      parent_committee_id: null,
      parent_committee_name: null,
      status: 'active',
      order: 0
    });
    // إنشاء اللجان الرئيسية تابعة للجنة الرئيسية
    COMMITTEES.forEach((c) => db.create('committee', null, {
      name: c.name,
      description: c.description,
      level: 'primary',
      type: 'primary',
      parent_committee_id: mainCommittee.id,
      parent_committee_name: 'اللجنة الرئيسية',
      status: 'active'
    }));
  } else {
    // التأكد من وجود اللجنة الرئيسية وربط اللجان بها
    let mainCommittee = committees.find(c => c.level === 'main' || c.type === 'main' || c.name === 'اللجنة الرئيسية');
    if (!mainCommittee) {
      mainCommittee = db.create('committee', null, {
        name: 'اللجنة الرئيسية',
        description: 'اللجنة الرئيسية لبرنامج مدينة قلوة الصحية',
        level: 'main',
        type: 'main',
        parent_committee_id: null,
        parent_committee_name: null,
        status: 'active',
        order: 0
      });
      console.log('[seed] تم إنشاء اللجنة الرئيسية');
    }
    // ربط اللجان التي ليس لها أم باللجنة الرئيسية
    for (const c of committees) {
      if (c.id === mainCommittee.id) continue;
      if (!c.parent_committee_id && c.level !== 'main' && c.type !== 'main') {
        try {
          db.update('committee', c.id, {
            ...c,
            parent_committee_id: mainCommittee.id,
            parent_committee_name: 'اللجنة الرئيسية',
            level: c.level || 'primary',
            type: c.type || 'primary'
          });
        } catch (e) { /* تجاهل */ }
      }
    }
  }

  // إضافة لجان تجريبية إضافية إذا كان مطلوباً
  if (shouldSeedSampleTeam && committees.length < 10) {
    const sampleCommittees = [
      { name: 'لجنة الصحة العامة', description: 'مسؤولة عن تعزيز الصحة العامة والوقاية من الأمراض' },
      { name: 'لجنة البيئة الصحية', description: 'تهتم بالبيئة الصحية والنظافة العامة' },
      { name: 'لجنة التوعية والتثقيف الصحي', description: 'نشر الوعي الصحي وتثقيف المجتمع' },
      { name: 'لجنة الرياضة والنشاط البدني', description: 'تعزيز النشاط البدني والرياضة في المجتمع' },
      { name: 'لجنة التغذية الصحية', description: 'تعزيز الأنماط الغذائية الصحية' }
    ];
    sampleCommittees.forEach((c) => {
      if (!committees.some((existing) => existing.name === c.name)) {
        db.create('committee', null, { name: c.name, description: c.description });
      }
    });
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

    // إضافة أعضاء تجريبيين إذا كان مطلوباً
    if (shouldSeedSampleTeam && membersAfter.length < 10) {
      const sampleMembers = [
        { full_name: 'د. أحمد السالم', role: 'committee_head', email: 'ahmed.salem@qelwa.sa', phone: '0501234567', national_id: '1234567890', committee_name: 'لجنة الصحة العامة' },
        { full_name: 'د. خالد المطيري', role: 'committee_coordinator', email: 'khaled.mutairi@qelwa.sa', phone: '0501234568', national_id: '1234567891', committee_name: 'لجنة الصحة العامة' },
        { full_name: 'أ. ريم الدوسري', role: 'committee_member', email: 'reem.dosari@qelwa.sa', phone: '0501234569', national_id: '1234567892', committee_name: 'لجنة الصحة العامة' },
        { full_name: 'م. فاطمة الزهراني', role: 'committee_head', email: 'fatima.zahrani@qelwa.sa', phone: '0502234567', national_id: '2234567890', committee_name: 'لجنة البيئة الصحية' },
        { full_name: 'م. ياسر القرني', role: 'committee_coordinator', email: 'yasser.qarni@qelwa.sa', phone: '0502234568', national_id: '2234567891', committee_name: 'لجنة البيئة الصحية' },
        { full_name: 'أ. لطيفة العنزي', role: 'committee_supervisor', email: 'latifa.anzi@qelwa.sa', phone: '0502234569', national_id: '2234567892', committee_name: 'لجنة البيئة الصحية' },
        { full_name: 'د. نورة الشهري', role: 'committee_head', email: 'noura.shehri@qelwa.sa', phone: '0505234567', national_id: '5234567890', committee_name: 'لجنة التغذية الصحية' },
        { full_name: 'د. سلطان العمري', role: 'committee_coordinator', email: 'sultan.omari@qelwa.sa', phone: '0505234568', national_id: '5234567891', committee_name: 'لجنة التغذية الصحية' }
      ];
      sampleMembers.forEach((m) => {
        if (!membersAfter.some((existing) => existing.national_id === m.national_id)) {
          const committee = committeesNow.find((c) => c.name === m.committee_name);
          db.create('team_member', null, {
            ...m,
            password: PASS,
            committee_id: committee?.id,
            status: 'active',
            join_date: baseDate,
          });
        }
      });
    }
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
