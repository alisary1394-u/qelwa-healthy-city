/**
 * سكربت إضافة بيانات تجريبية مخصصة للنظام
 * يتضمن: 5 لجان، 32 عضو فريق، 14 مبادرة
 */

const API_BASE_URL = process.env.SEED_API_URL || 'http://localhost:8080';

let authToken = null;

async function login() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: '1', password: '123456' }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      authToken = data.token;
      console.log('✅ تم تسجيل الدخول بنجاح');
      return true;
    } else {
      console.log('❌ فشل تسجيل الدخول:', data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ خطأ في تسجيل الدخول:', error.message);
    return false;
  }
}

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return data;
}

// بيانات اللجان المخصصة
const committees = [
  { name: 'لجنة الصحة العامة', description: 'مسؤولة عن تعزيز الصحة العامة والوقاية من الأمراض' },
  { name: 'لجنة البيئة الصحية', description: 'تهتم بالبيئة الصحية والنظافة العامة' },
  { name: 'لجنة التوعية والتثقيف الصحي', description: 'نشر الوعي الصحي وتثقيف المجتمع' },
  { name: 'لجنة الرياضة والنشاط البدني', description: 'تعزيز النشاط البدني والرياضة في المجتمع' },
  { name: 'لجنة التغذية الصحية', description: 'تعزيز الأنماط الغذائية الصحية' }
];

// أعضاء الفريق لكل لجنة
const teamMembersByCommittee = {
  'لجنة الصحة العامة': [
    { full_name: 'د. أحمد السالم', role: 'committee_head', email: 'ahmed.salem@qelwa.sa', phone: '0501234567', national_id: '1234567890', password: '123456', status: 'active' },
    { full_name: 'د. خالد المطيري', role: 'committee_coordinator', email: 'khaled.mutairi@qelwa.sa', phone: '0501234568', national_id: '1234567891', password: '123456', status: 'active' },
    { full_name: 'أ. ريم الدوسري', role: 'committee_supervisor', email: 'reem.dosari@qelwa.sa', phone: '0501234569', national_id: '1234567892', password: '123456', status: 'active' },
    { full_name: 'أ. عبدالله الغامدي', role: 'committee_member', email: 'abdullah.ghamdi@qelwa.sa', phone: '0501234570', national_id: '1234567893', password: '123456', status: 'active' },
    { full_name: 'أ. منى الحربي', role: 'committee_member', email: 'mona.harbi@qelwa.sa', phone: '0501234571', national_id: '1234567894', password: '123456', status: 'active' },
    { full_name: 'أ. سعد العمري', role: 'committee_member', email: 'saad.omari@qelwa.sa', phone: '0501234572', national_id: '1234567895', password: '123456', status: 'active' },
    { full_name: 'أ. هند الشمري', role: 'committee_member', email: 'hind.shamri@qelwa.sa', phone: '0501234573', national_id: '1234567896', password: '123456', status: 'active' },
    { full_name: 'أ. فهد الزهراني', role: 'committee_member', email: 'fahad.zahrani@qelwa.sa', phone: '0501234574', national_id: '1234567897', password: '123456', status: 'active' }
  ],
  'لجنة البيئة الصحية': [
    { full_name: 'م. فاطمة الزهراني', role: 'committee_head', email: 'fatima.zahrani@qelwa.sa', phone: '0502234567', national_id: '2234567890', password: '123456', status: 'active' },
    { full_name: 'م. ياسر القرني', role: 'committee_coordinator', email: 'yasser.qarni@qelwa.sa', phone: '0502234568', national_id: '2234567891', password: '123456', status: 'active' },
    { full_name: 'أ. لطيفة العنزي', role: 'committee_supervisor', email: 'latifa.anzi@qelwa.sa', phone: '0502234569', national_id: '2234567892', password: '123456', status: 'active' },
    { full_name: 'أ. بدر الشهراني', role: 'committee_member', email: 'badr.shahrani@qelwa.sa', phone: '0502234570', national_id: '2234567893', password: '123456', status: 'active' },
    { full_name: 'أ. نوف السبيعي', role: 'committee_member', email: 'nouf.subaie@qelwa.sa', phone: '0502234571', national_id: '2234567894', password: '123456', status: 'active' },
    { full_name: 'أ. طارق الأحمدي', role: 'committee_member', email: 'tariq.ahmadi@qelwa.sa', phone: '0502234572', national_id: '2234567895', password: '123456', status: 'active' }
  ],
  'لجنة التوعية والتثقيف الصحي': [
    { full_name: 'أ. محمد القحطاني', role: 'committee_head', email: 'mohammed.qahtani@qelwa.sa', phone: '0503234567', national_id: '3234567890', password: '123456', status: 'active' },
    { full_name: 'أ. عائشة الجهني', role: 'committee_coordinator', email: 'aisha.juhani@qelwa.sa', phone: '0503234568', national_id: '3234567891', password: '123456', status: 'active' },
    { full_name: 'أ. عمر البلوي', role: 'committee_supervisor', email: 'omar.balawi@qelwa.sa', phone: '0503234569', national_id: '3234567892', password: '123456', status: 'active' },
    { full_name: 'أ. جواهر الحارثي', role: 'committee_member', email: 'jawaher.harthi@qelwa.sa', phone: '0503234570', national_id: '3234567893', password: '123456', status: 'active' },
    { full_name: 'أ. ماجد العتيبي', role: 'committee_member', email: 'majed.otaibi@qelwa.sa', phone: '0503234571', national_id: '3234567894', password: '123456', status: 'active' },
    { full_name: 'أ. شيخة المالكي', role: 'committee_member', email: 'shaikha.malki@qelwa.sa', phone: '0503234572', national_id: '3234567895', password: '123456', status: 'active' },
    { full_name: 'أ. راشد الدوسري', role: 'committee_member', email: 'rashed.dosari@qelwa.sa', phone: '0503234573', national_id: '3234567896', password: '123456', status: 'active' }
  ],
  'لجنة الرياضة والنشاط البدني': [
    { full_name: 'أ. سارة العتيبي', role: 'committee_head', email: 'sarah.otaibi@qelwa.sa', phone: '0504234567', national_id: '4234567890', password: '123456', status: 'active' },
    { full_name: 'أ. فيصل الشمري', role: 'committee_coordinator', email: 'faisal.shamri@qelwa.sa', phone: '0504234568', national_id: '4234567891', password: '123456', status: 'active' },
    { full_name: 'أ. أمل السهلي', role: 'committee_supervisor', email: 'amal.sahli@qelwa.sa', phone: '0504234569', national_id: '4234567892', password: '123456', status: 'active' },
    { full_name: 'أ. تركي الغامدي', role: 'committee_member', email: 'turki.ghamdi@qelwa.sa', phone: '0504234570', national_id: '4234567893', password: '123456', status: 'active' },
    { full_name: 'أ. ريما القرشي', role: 'committee_member', email: 'rima.qurashi@qelwa.sa', phone: '0504234571', national_id: '4234567894', password: '123456', status: 'active' }
  ],
  'لجنة التغذية الصحية': [
    { full_name: 'د. نورة الشهري', role: 'committee_head', email: 'noura.shehri@qelwa.sa', phone: '0505234567', national_id: '5234567890', password: '123456', status: 'active' },
    { full_name: 'د. سلطان العمري', role: 'committee_coordinator', email: 'sultan.omari@qelwa.sa', phone: '0505234568', national_id: '5234567891', password: '123456', status: 'active' },
    { full_name: 'أ. وفاء الحربي', role: 'committee_supervisor', email: 'wafa.harbi@qelwa.sa', phone: '0505234569', national_id: '5234567892', password: '123456', status: 'active' },
    { full_name: 'أ. إبراهيم الزهراني', role: 'committee_member', email: 'ibrahim.zahrani@qelwa.sa', phone: '0505234570', national_id: '5234567893', password: '123456', status: 'active' },
    { full_name: 'أ. مها القحطاني', role: 'committee_member', email: 'maha.qahtani@qelwa.sa', phone: '0505234571', national_id: '5234567894', password: '123456', status: 'active' },
    { full_name: 'أ. عبدالرحمن السبيعي', role: 'committee_member', email: 'abdulrahman.subaie@qelwa.sa', phone: '0505234572', national_id: '5234567895', password: '123456', status: 'active' }
  ]
};

// مبادرات لكل لجنة
const initiativesByCommittee = {
  'لجنة الصحة العامة': [
    { title: 'حملة التطعيم الموسمي', description: 'حملة شاملة لتطعيم المواطنين ضد الإنفلونزا الموسمية', objectives: 'تطعيم 80% من السكان المستهدفين', status: 'in_progress', priority: 'high', expected_beneficiaries: 5000, budget: 150000, start_date: '2024-10-01', end_date: '2025-03-31' },
    { title: 'برنامج الفحص الدوري للأمراض المزمنة', description: 'فحص دوري مجاني للكشف المبكر', objectives: 'فحص 3000 مواطن سنوياً', status: 'approved', priority: 'high', expected_beneficiaries: 3000, budget: 200000, start_date: '2024-01-01', end_date: '2024-12-31' },
    { title: 'مبادرة الصحة النفسية', description: 'برنامج دعم الصحة النفسية', objectives: 'تقديم استشارات لـ 500 مستفيد', status: 'planning', priority: 'medium', expected_beneficiaries: 500, budget: 100000, start_date: '2025-01-01', end_date: '2025-06-30' }
  ],
  'لجنة البيئة الصحية': [
    { title: 'مشروع تحسين جودة الهواء', description: 'مراقبة وتحسين جودة الهواء', objectives: 'تركيب 20 محطة مراقبة', status: 'in_progress', priority: 'high', expected_beneficiaries: 10000, budget: 500000, start_date: '2024-06-01', end_date: '2025-05-31' },
    { title: 'حملة النظافة الشاملة', description: 'حملة تنظيف شاملة', objectives: 'تنظيف 50 حي سكني', status: 'approved', priority: 'medium', expected_beneficiaries: 15000, budget: 300000, start_date: '2024-09-01', end_date: '2025-02-28' }
  ],
  'لجنة التوعية والتثقيف الصحي': [
    { title: 'برنامج التوعية بأضرار التدخين', description: 'حملة توعوية شاملة', objectives: 'الوصول إلى 10000 مستفيد', status: 'in_progress', priority: 'high', expected_beneficiaries: 10000, budget: 180000, start_date: '2024-08-01', end_date: '2025-07-31' },
    { title: 'مبادرة الصحة المدرسية', description: 'برنامج توعوي للطلاب', objectives: 'تنفيذ برامج في 30 مدرسة', status: 'approved', priority: 'high', expected_beneficiaries: 8000, budget: 250000, start_date: '2024-09-01', end_date: '2025-06-30' },
    { title: 'حملة التوعية بالأمراض المعدية', description: 'نشر الوعي حول الوقاية', objectives: 'إقامة 20 ورشة توعوية', status: 'planning', priority: 'medium', expected_beneficiaries: 5000, budget: 120000, start_date: '2025-02-01', end_date: '2025-08-31' }
  ],
  'لجنة الرياضة والنشاط البدني': [
    { title: 'مسابقة المشي اليومي', description: 'تحدي مجتمعي للمشي', objectives: 'مشاركة 2000 شخص', status: 'in_progress', priority: 'medium', expected_beneficiaries: 2000, budget: 80000, start_date: '2024-10-01', end_date: '2024-12-31' },
    { title: 'إنشاء مسارات رياضية', description: 'إنشاء مسارات مشي وجري', objectives: 'إنشاء 10 مسارات بطول 15 كم', status: 'approved', priority: 'high', expected_beneficiaries: 20000, budget: 600000, start_date: '2024-11-01', end_date: '2025-10-31' },
    { title: 'برنامج الرياضة للجميع', description: 'فعاليات رياضية أسبوعية', objectives: 'تنظيم 50 فعالية', status: 'in_progress', priority: 'medium', expected_beneficiaries: 5000, budget: 150000, start_date: '2024-07-01', end_date: '2025-06-30' }
  ],
  'لجنة التغذية الصحية': [
    { title: 'برنامج التغذية المدرسية الصحية', description: 'تحسين جودة الوجبات المدرسية', objectives: 'تطبيق معايير في 25 مدرسة', status: 'in_progress', priority: 'high', expected_beneficiaries: 6000, budget: 400000, start_date: '2024-09-01', end_date: '2025-06-30' },
    { title: 'حملة الحد من السمنة', description: 'برنامج شامل للتوعية', objectives: 'الوصول إلى 5000 مستفيد', status: 'approved', priority: 'high', expected_beneficiaries: 5000, budget: 220000, start_date: '2024-10-01', end_date: '2025-09-30' },
    { title: 'مبادرة الطبخ الصحي', description: 'ورش عملية لتعليم الطبخ الصحي', objectives: 'تنظيم 30 ورشة', status: 'planning', priority: 'medium', expected_beneficiaries: 1000, budget: 90000, start_date: '2025-03-01', end_date: '2025-12-31' }
  ]
};

async function seedData() {
  console.log('🌱 بدء إضافة البيانات التجريبية المخصصة...');
  console.log(`🔗 API: ${API_BASE_URL}\n`);

  // تسجيل الدخول أولاً
  if (!await login()) {
    console.log('❌ لا يمكن المتابعة بدون تسجيل دخول');
    return;
  }
  console.log('');

  try {
    const existingCommittees = await api('GET', '/api/entities/Committee');
    const existingMembers = await api('GET', '/api/entities/TeamMember');
    const existingInitiatives = await api('GET', '/api/entities/Initiative');

    const committeeByName = new Map((existingCommittees || []).map((c) => [c.name, c]));
    const memberByNationalId = new Map((existingMembers || []).map((m) => [String(m.national_id || ''), m]));
    const initiativeKeySet = new Set((existingInitiatives || []).map((i) => `${i.committee_name || ''}::${i.title || ''}`));

    // 1. إضافة اللجان
    console.log('📋 إضافة اللجان...');
    const resolvedCommittees = {};
    let addedCommittees = 0;
    for (const committee of committees) {
      if (committeeByName.has(committee.name)) {
        resolvedCommittees[committee.name] = committeeByName.get(committee.name);
        console.log(`   ↺ موجودة مسبقاً: ${committee.name}`);
        continue;
      }
      try {
        const created = await api('POST', '/api/entities/Committee', committee);
        resolvedCommittees[committee.name] = created;
        committeeByName.set(committee.name, created);
        addedCommittees++;
        console.log(`   ✓ ${committee.name}`);
      } catch (error) {
        console.log(`   ✗ ${committee.name}: ${error.message}`);
      }
    }
    console.log(`\n✅ تمت إضافة ${addedCommittees} لجنة جديدة (الإجمالي المتاح: ${Object.keys(resolvedCommittees).length})\n`);

    // 2. إضافة أعضاء الفريق
    console.log('👥 إضافة أعضاء الفريق...');
    const createdMembers = {};
    let totalMembers = 0;
    let skippedExistingMembers = 0;
    const baseDate = new Date().toISOString().split('T')[0];

    for (const [committeeName, members] of Object.entries(teamMembersByCommittee)) {
      const committee = resolvedCommittees[committeeName] || committeeByName.get(committeeName);
      if (!committee) {
        console.log(`   ⚠ تخطي أعضاء ${committeeName}`);
        continue;
      }
      createdMembers[committeeName] = [];
      for (const member of members) {
        const nationalId = String(member.national_id || '');
        if (nationalId && memberByNationalId.has(nationalId)) {
          createdMembers[committeeName].push(memberByNationalId.get(nationalId));
          skippedExistingMembers++;
          continue;
        }
        try {
          const created = await api('POST', '/api/entities/TeamMember', {
            ...member,
            committee_id: committee.id,
            committee_name: committeeName,
            join_date: baseDate
          });
          createdMembers[committeeName].push(created);
          if (nationalId) memberByNationalId.set(nationalId, created);
          totalMembers++;
          console.log(`   ✓ ${member.full_name}`);
        } catch (error) {
          console.log(`   ✗ ${member.full_name}: ${error.message}`);
        }
      }
    }
    console.log(`\n✅ تمت إضافة ${totalMembers} عضو فريق جديد (الموجود مسبقاً: ${skippedExistingMembers})\n`);

    // 3. إضافة المبادرات
    console.log('💡 إضافة المبادرات...');
    let totalInitiatives = 0;
    let skippedExistingInitiatives = 0;
    for (const [committeeName, initiatives] of Object.entries(initiativesByCommittee)) {
      const committee = resolvedCommittees[committeeName] || committeeByName.get(committeeName);
      const members = createdMembers[committeeName];
      if (!committee || !members || members.length === 0) {
        console.log(`   ⚠ تخطي مبادرات ${committeeName}`);
        continue;
      }
      for (const initiative of initiatives) {
        const initiativeKey = `${committeeName}::${initiative.title}`;
        if (initiativeKeySet.has(initiativeKey)) {
          skippedExistingInitiatives++;
          continue;
        }
        try {
          const leader = members.find(m => m.role === 'committee_head') || members[0];
          const teamSize = Math.min(Math.floor(Math.random() * 3) + 3, members.length);
          const teamMembers = members.slice(0, teamSize).map(m => m.id);
          const created = await api('POST', '/api/entities/Initiative', {
            ...initiative,
            committee_id: committee.id,
            committee_name: committeeName,
            leader_id: leader.id,
            leader_name: leader.full_name,
            team_members: teamMembers,
            code: `INI${Date.now().toString().slice(-6)}`
          });
          initiativeKeySet.add(initiativeKey);
          totalInitiatives++;
          console.log(`   ✓ ${initiative.title}`);
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          console.log(`   ✗ ${initiative.title}: ${error.message}`);
        }
      }
    }
    console.log(`\n✅ تمت إضافة ${totalInitiatives} مبادرة جديدة (الموجود مسبقاً: ${skippedExistingInitiatives})\n`);

    // 4. مزامنة الميزانيات
    console.log('💰 مزامنة الميزانيات...');
    const budgets = await api('GET', '/api/entities/Budget');
    const nowYear = new Date().getFullYear();
    let activeBudget = (budgets || []).find((b) => String(b.fiscal_year) === String(nowYear));
    if (!activeBudget) {
      activeBudget = await api('POST', '/api/entities/Budget', {
        name: `ميزانية ${nowYear}`,
        fiscal_year: String(nowYear),
        start_date: `${nowYear}-01-01`,
        end_date: `${nowYear}-12-31`,
        total_budget: 2000000,
        allocated_budget: 0,
        spent_amount: 0,
        remaining_budget: 2000000,
        description: 'ميزانية سنوية تشغيلية',
        notes: 'تم إنشاؤها عبر سكربت التحديث الكامل',
        status: 'active',
      });
      console.log(`   ✓ تم إنشاء ${activeBudget.name}`);
    } else {
      console.log(`   ↺ موجودة مسبقاً: ${activeBudget.name}`);
    }

    const initiativesAll = await api('GET', '/api/entities/Initiative');
    const initiativeByKey = new Map((initiativesAll || []).map((i) => [`${i.committee_name || ''}::${i.title || ''}`, i]));
    const allocations = await api('GET', '/api/entities/BudgetAllocation');
    const allocationKeySet = new Set((allocations || []).map((a) => `${a.budget_id || ''}::${a.initiative_id || ''}`));

    let addedAllocations = 0;
    for (const [committeeName, initiatives] of Object.entries(initiativesByCommittee)) {
      for (const initiative of initiatives) {
        const initiativeEntity = initiativeByKey.get(`${committeeName}::${initiative.title}`);
        if (!initiativeEntity?.id) continue;
        const allocKey = `${activeBudget.id}::${initiativeEntity.id}`;
        if (allocationKeySet.has(allocKey)) continue;

        const amount = Number(initiative.budget) || 0;
        if (amount <= 0) continue;

        await api('POST', '/api/entities/BudgetAllocation', {
          budget_id: activeBudget.id,
          budget_name: activeBudget.name,
          committee_id: initiativeEntity.committee_id || '',
          committee_name: committeeName,
          axis_id: initiativeEntity.axis_id || '',
          axis_name: initiativeEntity.axis_name || '',
          standard_id: initiativeEntity.standard_id || '',
          standard_code: initiativeEntity.standard_code || '',
          initiative_id: initiativeEntity.id,
          initiative_title: initiativeEntity.title,
          category: 'مبادرات',
          allocated_amount: amount,
          spent_amount: 0,
          remaining_amount: amount,
          percentage_spent: 0,
          status: 'active',
          notes: `تخصيص تلقائي للمبادرة: ${initiativeEntity.title}`,
        });
        allocationKeySet.add(allocKey);
        addedAllocations++;
      }
    }
    console.log(`\n✅ تمت إضافة ${addedAllocations} تخصيص ميزانية\n`);

    // 5. مزامنة المعاملات المالية
    console.log('💳 مزامنة المعاملات المالية...');
    const allocationsAfter = await api('GET', '/api/entities/BudgetAllocation');
    const transactions = await api('GET', '/api/entities/Transaction');
    const existingTransactionKeys = new Set(
      (transactions || []).map((t) => `${t.initiative_id || ''}::${t.type || ''}::${t.description || ''}`)
    );

    let addedTransactions = 0;
    let paidTotal = 0;
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];

    for (const allocation of (allocationsAfter || [])) {
      if (!allocation?.initiative_id || Number(allocation.allocated_amount) <= 0) continue;

      const allocatedAmount = Number(allocation.allocated_amount) || 0;
      const paidAmount = Math.round(allocatedAmount * 0.2);
      const pendingAmount = Math.round(allocatedAmount * 0.1);

      const paidDesc = `صرف تشغيلي - ${allocation.initiative_title || 'مبادرة'}`;
      const pendingDesc = `دفعة معلقة - ${allocation.initiative_title || 'مبادرة'}`;

      const paidKey = `${allocation.initiative_id}::expense::${paidDesc}`;
      if (!existingTransactionKeys.has(paidKey) && paidAmount > 0) {
        await api('POST', '/api/entities/Transaction', {
          transaction_number: `TXP-${Date.now().toString().slice(-6)}-${addedTransactions + 1}`,
          type: 'expense',
          category: 'تشغيل المبادرات',
          amount: paidAmount,
          description: paidDesc,
          date: fmt(new Date(today.getTime() - (7 * 86400000))),
          committee_id: allocation.committee_id || '',
          committee_name: allocation.committee_name || '',
          axis_id: allocation.axis_id || '',
          axis_name: allocation.axis_name || '',
          standard_id: allocation.standard_id || '',
          standard_code: allocation.standard_code || '',
          initiative_id: allocation.initiative_id,
          initiative_title: allocation.initiative_title || '',
          payment_method: 'تحويل بنكي',
          receipt_number: `RCPT-${Date.now().toString().slice(-5)}-${addedTransactions + 1}`,
          beneficiary: allocation.committee_name || 'اللجنة',
          notes: 'معاملة مولدة تلقائياً ضمن التحديث الكامل',
          attachment_url: '',
          status: 'paid',
          approved_by: 'المشرف',
          approval_date: fmt(new Date(today.getTime() - (6 * 86400000))),
        });
        existingTransactionKeys.add(paidKey);
        addedTransactions++;
        paidTotal += paidAmount;
      }

      const pendingKey = `${allocation.initiative_id}::expense::${pendingDesc}`;
      if (!existingTransactionKeys.has(pendingKey) && pendingAmount > 0) {
        await api('POST', '/api/entities/Transaction', {
          transaction_number: `TXN-${Date.now().toString().slice(-6)}-${addedTransactions + 1}`,
          type: 'expense',
          category: 'دفعات مجدولة',
          amount: pendingAmount,
          description: pendingDesc,
          date: fmt(new Date(today.getTime() - (2 * 86400000))),
          committee_id: allocation.committee_id || '',
          committee_name: allocation.committee_name || '',
          axis_id: allocation.axis_id || '',
          axis_name: allocation.axis_name || '',
          standard_id: allocation.standard_id || '',
          standard_code: allocation.standard_code || '',
          initiative_id: allocation.initiative_id,
          initiative_title: allocation.initiative_title || '',
          payment_method: 'نقدي',
          receipt_number: `PND-${Date.now().toString().slice(-5)}-${addedTransactions + 1}`,
          beneficiary: allocation.committee_name || 'اللجنة',
          notes: 'دفعة قيد الاعتماد',
          attachment_url: '',
          status: 'pending',
        });
        existingTransactionKeys.add(pendingKey);
        addedTransactions++;
      }
    }
    console.log(`\n✅ تمت إضافة ${addedTransactions} معاملة مالية\n`);

    // 6. تحديث ملخص الميزانية النشطة
    const totalAllocated = (allocationsAfter || [])
      .filter((a) => String(a.budget_id || '') === String(activeBudget.id))
      .reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);

    const transactionsAfter = await api('GET', '/api/entities/Transaction');
    const totalSpentPaid = (transactionsAfter || [])
      .filter((t) => t.status === 'paid' && t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const budgetTotal = Number(activeBudget.total_budget) || 0;
    await api('PATCH', `/api/entities/Budget/${activeBudget.id}`, {
      allocated_budget: totalAllocated,
      spent_amount: totalSpentPaid,
      remaining_budget: Math.max(0, budgetTotal - totalSpentPaid),
      status: 'active',
    });
    console.log(`   ✓ تم تحديث ملخص ${activeBudget.name}`);

    console.log('📊 ملخص البيانات المضافة:');
    console.log(`   • اللجان المتاحة: ${Object.keys(resolvedCommittees).length}`);
    console.log(`   • أعضاء الفريق: ${totalMembers}`);
    console.log(`   • المبادرات: ${totalInitiatives}`);
    console.log(`   • تخصيصات الميزانية الجديدة: ${addedAllocations}`);
    console.log(`   • المعاملات المالية الجديدة: ${addedTransactions}`);
    console.log('\n✨ تمت الإضافة بنجاح! حدّث الصفحة (Ctrl+F5).\n');
  } catch (error) {
    console.error('\n❌ خطأ:', error?.message || error);
    console.error('تأكد من تشغيل السيرفر المحلي (npm run server).');
    process.exitCode = 1;
  }
}

seedData();
