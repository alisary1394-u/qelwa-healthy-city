/**
 * بذرة اللجان (حسب المحاور)، فريق العمل، المبادرات، والمهام للاختبار على النظام المحلي.
 * تُستدعى من localBackend بعد بذر المحاور والمعايير.
 */

const DEFAULT_MEMBER_PASSWORD = '123456';

/**
 * اللجنة الرئيسية أولاً ثم اللجان الفرعية المرتبطة بالمحاور (معايير المدينة الصحية)
 */
export const COMMITTEES_SEED = [
  { name: 'اللجنة الرئيسية', description: 'اللجنة الرئيسية التي تنبثق منها جميع لجان المدينة الصحية' },
  { name: 'لجنة الحوكمة والشراكات', description: 'الحوكمة الرشيدة والشراكات من أجل الصحة والتنمية' },
  { name: 'لجنة المشاركة المجتمعية', description: 'مشاركة المجتمع في صنع القرار وتمكين المواطنين' },
  { name: 'لجنة البيئة والاستدامة', description: 'البيئة الحضرية المستدامة والصحة البيئية' },
  { name: 'لجنة الصحة والرعاية الصحية', description: 'الخدمات الصحية والوقاية والرعاية' },
  { name: 'لجنة النقل والتنقل الآمن', description: 'النقل المستدام والتنقل الآمن' },
  { name: 'لجنة الإسكان والخدمات الأساسية', description: 'الإسكان اللائق والبنية التحتية والخدمات' },
  { name: 'لجنة التعليم والثقافة', description: 'التعليم والصحة الثقافية والمعرفية' },
  { name: 'لجنة الاقتصاد والتشغيل', description: 'الفرص الاقتصادية والعمل اللائق' },
  { name: 'لجنة السلامة والعدالة الاجتماعية', description: 'الأمان والعدالة والاندماج الاجتماعي' },
];

/**
 * إنشاء اللجان من البذرة وربطها بالمحاور (حسب الترتيب).
 * يضيف أي لجنة غير موجودة بالاسم حتى تظهر البيانات حتى لو كانت هناك لجن قديمة.
 * @param {Object} ctx - { getStore, entities } — getStore قد يعيد Promise (Supabase) أو مصفوفة (محلي)
 * @returns {Promise<Array>} مصفوفة اللجان بعد البذر
 */
export async function seedCommittees(ctx) {
  const { getStore, entities } = ctx;
  let committees = await Promise.resolve(getStore('Committee'));
  committees = committees || [];
  const existingNames = new Set(committees.map((c) => c.name));
  let added = 0;
  for (const c of COMMITTEES_SEED) {
    if (!existingNames.has(c.name)) {
      await Promise.resolve(entities.Committee.create({ name: c.name, description: c.description }));
      existingNames.add(c.name);
      added++;
    }
  }
  if (added > 0 && typeof console !== 'undefined') console.log('[seed] تم إضافة', added, 'لجنة');
  return Promise.resolve(getStore('Committee')).then((r) => r || []);
}

/**
 * إنشاء أعضاء الفريق: لكل لجنة رئيس، منسق، مشرف، عضو، متطوع؛ بالإضافة إلى منسق المدينة والميزانية.
 * @param {Object} ctx - { getStore, entities }
 * @returns {Promise<Array>} مصفوفة أعضاء الفريق بعد البذر
 */
export async function seedTeamMembers(ctx) {
  const { getStore, entities } = ctx;
  const members = (await Promise.resolve(getStore('TeamMember'))) || [];
  const committees = (await Promise.resolve(getStore('Committee'))) || [];
  if (committees.length === 0) return members;

  const toCreate = [];
  let nextNationalId = 1;
  const used = members.map((m) => m.national_id);
  while (used.includes(String(nextNationalId))) nextNationalId += 1;

  const baseDate = new Date().toISOString().split('T')[0];

  const hasRoleInCommittee = (role, committeeId) => members.some((m) => m.role === role && m.committee_id === committeeId);
  const hasRoleInCommitteeAfterAdd = (role, committeeId, added) =>
    hasRoleInCommittee(role, committeeId) || added.some((m) => m.role === role && m.committee_id === committeeId);

  if (!members.some((m) => m.role === 'coordinator')) {
    toCreate.push({
      full_name: 'منسق المدينة الصحية',
      national_id: String(nextNationalId++),
      password: DEFAULT_MEMBER_PASSWORD,
      email: 'coordinator@local',
      role: 'coordinator',
      committee_id: committees[0]?.id,
      committee_name: committees[0]?.name,
      department: 'لوحة التحكم',
      status: 'active',
      join_date: baseDate,
    });
  }

  committees.forEach((c, i) => {
    const idx = i + 1;
    if (!hasRoleInCommitteeAfterAdd('committee_head', c.id, toCreate)) {
      toCreate.push({
        full_name: `رئيس ${c.name}`,
        national_id: String(nextNationalId++),
        password: DEFAULT_MEMBER_PASSWORD,
        email: `head${idx}@local`,
        role: 'committee_head',
        committee_id: c.id,
        committee_name: c.name,
        department: c.name,
        status: 'active',
        join_date: baseDate,
      });
    }
    if (!hasRoleInCommitteeAfterAdd('committee_coordinator', c.id, toCreate)) {
      toCreate.push({
        full_name: `منسق ${c.name}`,
        national_id: String(nextNationalId++),
        password: DEFAULT_MEMBER_PASSWORD,
        email: `coord${idx}@local`,
        role: 'committee_coordinator',
        committee_id: c.id,
        committee_name: c.name,
        department: c.name,
        status: 'active',
        join_date: baseDate,
      });
    }
    if (!hasRoleInCommitteeAfterAdd('committee_supervisor', c.id, toCreate)) {
      toCreate.push({
        full_name: `مشرف ${c.name}`,
        national_id: String(nextNationalId++),
        password: DEFAULT_MEMBER_PASSWORD,
        email: `superv${idx}@local`,
        role: 'committee_supervisor',
        committee_id: c.id,
        committee_name: c.name,
        department: c.name,
        status: 'active',
        join_date: baseDate,
      });
    }
    if (!hasRoleInCommitteeAfterAdd('member', c.id, toCreate)) {
      toCreate.push({
        full_name: `عضو ${c.name}`,
        national_id: String(nextNationalId++),
        password: DEFAULT_MEMBER_PASSWORD,
        email: `member${idx}@local`,
        role: 'member',
        committee_id: c.id,
        committee_name: c.name,
        department: c.name,
        status: 'active',
        join_date: baseDate,
      });
    }
    if (!hasRoleInCommitteeAfterAdd('volunteer', c.id, toCreate)) {
      toCreate.push({
        full_name: `متطوع ${c.name}`,
        national_id: String(nextNationalId++),
        password: DEFAULT_MEMBER_PASSWORD,
        email: `vol${idx}@local`,
        role: 'volunteer',
        committee_id: c.id,
        committee_name: c.name,
        department: c.name,
        status: 'active',
        join_date: baseDate,
      });
    }
  });

  if (!members.some((m) => m.role === 'budget_manager')) {
    toCreate.push({
      full_name: 'مدير الميزانية',
      national_id: String(nextNationalId++),
      password: DEFAULT_MEMBER_PASSWORD,
      email: 'budget@local',
      role: 'budget_manager',
      committee_id: '',
      committee_name: '',
      department: 'الميزانية',
      status: 'active',
      join_date: baseDate,
    });
  }
  if (!members.some((m) => m.role === 'accountant')) {
    toCreate.push({
      full_name: 'المحاسب',
      national_id: String(nextNationalId++),
      password: DEFAULT_MEMBER_PASSWORD,
      email: 'accountant@local',
      role: 'accountant',
      committee_id: '',
      committee_name: '',
      department: 'الميزانية',
      status: 'active',
      join_date: baseDate,
    });
  }
  if (!members.some((m) => m.role === 'financial_officer')) {
    toCreate.push({
      full_name: 'الموظف المالي',
      national_id: String(nextNationalId++),
      password: DEFAULT_MEMBER_PASSWORD,
      email: 'financial@local',
      role: 'financial_officer',
      committee_id: '',
      committee_name: '',
      department: 'الميزانية',
      status: 'active',
      join_date: baseDate,
    });
  }

  for (const data of toCreate) await Promise.resolve(entities.TeamMember.create(data));
  if (toCreate.length > 0 && typeof console !== 'undefined') console.log('[seed] تم إضافة', toCreate.length, 'عضو فريق');
  return Promise.resolve(getStore('TeamMember')).then((r) => r || []);
}

/**
 * إنشاء مبادرات نموذجية مرتبطة باللجان والمحاور.
 */
export async function seedInitiatives(ctx) {
  const { getStore, entities } = ctx;
  const initiatives = (await Promise.resolve(getStore('Initiative'))) || [];
  const committees = (await Promise.resolve(getStore('Committee'))) || [];
  const axes = (await Promise.resolve(getStore('Axis'))) || [];
  if (committees.length === 0 || axes.length === 0) return initiatives;
  if (initiatives.length > 0) return initiatives;

  const list = [
    { title: 'تعزيز المشاركة المجتمعية في التخطيط الصحي', code: 'INI001', status: 'approved', priority: 'high' },
    { title: 'تحسين بيئة المساحات الخضراء والنظافة', code: 'INI002', status: 'in_progress', priority: 'urgent' },
    { title: 'برنامج التوعية بالصحة والرعاية الأولية', code: 'INI003', status: 'planning', priority: 'medium' },
    { title: 'مبادرة النقل الآمن للمدارس', code: 'INI004', status: 'approved', priority: 'high' },
    { title: 'دعم الإسكان والخدمات الأساسية للأسر', code: 'INI005', status: 'in_progress', priority: 'medium' },
    { title: 'دعم التعليم والصحة المدرسية', code: 'INI006', status: 'in_progress', priority: 'high' },
    { title: 'برنامج التشغيل والاقتصاد المحلي', code: 'INI007', status: 'planning', priority: 'medium' },
    { title: 'السلامة والعدالة الاجتماعية', code: 'INI008', status: 'approved', priority: 'high' },
    { title: 'الحوكمة والشراكات المؤسسية', code: 'INI009', status: 'in_progress', priority: 'urgent' },
  ];

  const baseDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (let idx = 0; idx < list.length; idx++) {
    const item = list[idx];
    const axis = axes[idx % axes.length];
    const committee = committees[idx % committees.length];
    const progress = item.status === 'in_progress' ? 25 + idx * 5 : item.status === 'approved' ? 15 : 0;
    await Promise.resolve(entities.Initiative.create({
      code: item.code,
      title: item.title,
      description: `مبادرة مرتبطة بمحور "${axis?.name}" ولجنة "${committee?.name}" لتحقيق معايير المدينة الصحية.`,
      objectives: 'تحقيق أهداف المدينة الصحية وفق المعايير العالمية.',
      committee_id: committee?.id,
      committee_name: committee?.name,
      axis_id: axis?.id,
      axis_name: axis?.name,
      status: item.status,
      priority: item.priority,
      impact_level: idx % 3 === 0 ? 'very_high' : 'high',
      progress_percentage: Math.min(progress, 85),
      budget: 40000 + idx * 15000,
      expected_beneficiaries: 300 + idx * 80,
      start_date: baseDate,
      end_date: endDate,
    }));
  }
  if (typeof console !== 'undefined') console.log('[seed] تم إنشاء', list.length, 'مبادرة');
  return Promise.resolve(getStore('Initiative')).then((r) => r || []);
}

/**
 * إنشاء مهام نموذجية معينة لأعضاء الفريق.
 */
export async function seedTasks(ctx) {
  const { getStore, entities } = ctx;
  const tasks = (await Promise.resolve(getStore('Task'))) || [];
  const members = (await Promise.resolve(getStore('TeamMember'))) || [];
  if (members.length === 0) return tasks;
  if (tasks.length > 0) return tasks;

  const assignees = members.filter((m) => ['coordinator', 'committee_head', 'committee_coordinator', 'committee_supervisor', 'member'].includes(m.role));
  if (assignees.length === 0) return tasks;

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

  for (let i = 0; i < taskList.length; i++) {
    const t = taskList[i];
    const due = new Date(baseDate);
    due.setDate(due.getDate() + t.daysFromNow);
    const assigned = assignees[i % assignees.length];
    await Promise.resolve(entities.Task.create({
      title: t.title,
      description: `مهمة تجريبية للاختبار - معينة لـ ${assigned?.full_name}.`,
      status: t.status,
      priority: t.priority,
      assigned_to: assigned?.id,
      assigned_to_name: assigned?.full_name,
      due_date: formatDate(due),
      created_date: formatDate(baseDate),
    }));
  }
  if (typeof console !== 'undefined') console.log('[seed] تم إنشاء', taskList.length, 'مهمة');
  return Promise.resolve(getStore('Task')).then((r) => r || []);
}

/**
 * إنشاء ميزانيات وتخصيصات ومعاملات مالية نموذجية.
 */
export async function seedBudgetsAndTransactions(ctx) {
  const { getStore, entities } = ctx;
  const budgets = (await Promise.resolve(getStore('Budget'))) || [];
  const committees = (await Promise.resolve(getStore('Committee'))) || [];
  const axes = (await Promise.resolve(getStore('Axis'))) || [];
  if (committees.length === 0 || axes.length === 0) return;
  if (budgets.length >= 1) return;

  const year = new Date().getFullYear();
  const start1 = `${year - 1}-01-01`;
  const end1 = `${year - 1}-12-31`;
  const start2 = `${year}-01-01`;
  const end2 = `${year}-12-31`;

  const b1 = await Promise.resolve(entities.Budget.create({
    name: `ميزانية مدينة قلوة الصحية ${year - 1}`,
    fiscal_year: String(year - 1),
    start_date: start1,
    end_date: end1,
    total_budget: 500000,
    description: 'ميزانية السنة المالية السابقة - للاختبار.',
    notes: '',
    allocated_budget: 0,
    spent_amount: 0,
    remaining_budget: 500000,
    status: 'closed',
  }));

  const b2 = await Promise.resolve(entities.Budget.create({
    name: `ميزانية مدينة قلوة الصحية ${year}`,
    fiscal_year: String(year),
    start_date: start2,
    end_date: end2,
    total_budget: 800000,
    description: 'ميزانية السنة الحالية - نشطة.',
    notes: '',
    allocated_budget: 0,
    spent_amount: 0,
    remaining_budget: 800000,
    status: 'active',
  }));

  const b3 = await Promise.resolve(entities.Budget.create({
    name: `ميزانية مقترحة ${year + 1}`,
    fiscal_year: String(year + 1),
    start_date: `${year + 1}-01-01`,
    end_date: `${year + 1}-12-31`,
    total_budget: 900000,
    description: 'مسودة ميزانية السنة القادمة.',
    notes: '',
    allocated_budget: 0,
    spent_amount: 0,
    remaining_budget: 900000,
    status: 'draft',
  }));

  for (let i = 0; i < Math.min(6, committees.length); i++) {
    const c = committees[i];
    const axis = axes[i % axes.length];
    const amount = 50000 + i * 20000;
    entities.BudgetAllocation.create({
      budget_id: b2.id,
      budget_name: b2.name,
      committee_id: c.id,
      committee_name: c.name,
      axis_id: axis?.id,
      axis_name: axis?.name,
      category: `أنشطة ${c.name}`,
      allocated_amount: amount,
      spent_amount: Math.floor(amount * 0.2),
      remaining_amount: amount - Math.floor(amount * 0.2),
      percentage_spent: 20,
      status: 'active',
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const txNumber = (n) => `T${String(Date.now()).slice(-8)}${n}`;
  const comm = committees[0];
  const ax = axes[0];
  await Promise.resolve(entities.Transaction.create({
    transaction_number: txNumber(1),
    type: 'income',
    category: 'دعم حكومي',
    amount: 100000,
    description: 'دعم حكومي للمدينة الصحية',
    date: today,
    committee_id: comm?.id,
    committee_name: comm?.name,
    axis_id: ax?.id,
    axis_name: ax?.name,
    payment_method: 'تحويل بنكي',
    receipt_number: 'R001',
    beneficiary: 'مدينة قلوة الصحية',
    notes: '',
    status: 'paid',
  }));
  await Promise.resolve(entities.Transaction.create({
    transaction_number: txNumber(2),
    type: 'expense',
    category: 'برامج توعية',
    amount: 15000,
    description: 'ورشة المشاركة المجتمعية',
    date: today,
    committee_id: comm?.id,
    committee_name: comm?.name,
    axis_id: ax?.id,
    axis_name: ax?.name,
    payment_method: 'تحويل بنكي',
    receipt_number: 'E001',
    beneficiary: 'جهة منفذة',
    notes: '',
    status: 'approved',
  }));
  await Promise.resolve(entities.Transaction.create({
    transaction_number: txNumber(3),
    type: 'expense',
    category: 'مستلزمات طبية',
    amount: 8000,
    description: 'مستلزمات الرعاية الأولية',
    date: today,
    committee_id: committees[2]?.id,
    committee_name: committees[2]?.name,
    axis_id: axes[2]?.id,
    axis_name: axes[2]?.name,
    payment_method: 'نقدي',
    receipt_number: 'E002',
    beneficiary: 'مورد',
    notes: '',
    status: 'pending',
  }));

  if (typeof console !== 'undefined') console.log('[seed] تم إنشاء 3 ميزانيات، تخصيصات، و 3 معاملات مالية');
}

/**
 * تشغيل كل البذور: لجان، فريق، مبادرات، مهام، ميزانيات ومعاملات.
 * @param {Object} ctx - { getStore, entities } — getStore قد يعيد Promise (Supabase) أو مصفوفة (محلي)
 */
export async function seedCommitteesTeamInitiativesTasks(ctx) {
  if (typeof console !== 'undefined') console.log('[seed] بدء بذر اللجان والفريق والمبادرات والمهام والميزانيات...');
  await seedCommittees(ctx);
  await seedTeamMembers(ctx);
  await seedInitiatives(ctx);
  await seedTasks(ctx);
  await seedBudgetsAndTransactions(ctx);
  if (typeof console !== 'undefined') console.log('[seed] انتهى البذر.');
}
