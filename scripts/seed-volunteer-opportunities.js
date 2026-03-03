/**
 * سكربت إنشاء فرص تطوعية بناءً على المبادرات واللجان الموجودة
 */

const API_BASE = process.env.API_URL || 'https://www.qeelwah.com';

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function createOpportunity(data) {
  const res = await fetch(`${API_BASE}/api/entities/VolunteerOpportunity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create opportunity: ${res.status} - ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('🔄 جاري جلب البيانات...');
  
  const initiatives = await fetchJSON('/api/entities/Initiative');
  const committees = await fetchJSON('/api/entities/Committee');
  
  console.log(`📋 عدد المبادرات: ${initiatives.length}`);
  console.log(`🏢 عدد اللجان: ${committees.length}`);

  const today = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  // توليد فرص تطوعية لكل مبادرة
  const opportunities = [];

  for (const init of initiatives) {
    // تحديد النوع بناءً على عنوان المبادرة
    let type = 'initiative_support';
    let skills = 'العمل الجماعي، التنظيم';
    let location = 'مدينة قلوة';
    let minVol = 3;
    let maxVol = 15;

    const title = init.title || '';
    
    if (title.includes('مشاركة مجتمعية') || title.includes('المشاركة')) {
      type = 'community_event';
      skills = 'التواصل المجتمعي، التنظيم، العلاقات العامة';
      minVol = 5;
      maxVol = 20;
    } else if (title.includes('بيئة') || title.includes('نظافة') || title.includes('هواء')) {
      type = 'initiative_support';
      skills = 'الوعي البيئي، العمل الميداني، التنظيم';
      minVol = 5;
      maxVol = 25;
    } else if (title.includes('صحة') || title.includes('تطعيم') || title.includes('فحص') || title.includes('سمنة')) {
      type = 'awareness';
      skills = 'التوعية الصحية، المعرفة الطبية الأساسية';
      minVol = 3;
      maxVol = 15;
    } else if (title.includes('نقل') || title.includes('مسارات')) {
      type = 'initiative_support';
      skills = 'التخطيط، السلامة المرورية';
      minVol = 3;
      maxVol = 10;
    } else if (title.includes('إسكان') || title.includes('خدمات')) {
      type = 'initiative_support';
      skills = 'الخدمات المجتمعية، التنظيم';
      minVol = 4;
      maxVol = 12;
    } else if (title.includes('تعليم') || title.includes('ثقافة') || title.includes('مدرسية') || title.includes('توعية')) {
      type = 'awareness';
      skills = 'التعليم، التواصل، إعداد المحتوى التوعوي';
      minVol = 3;
      maxVol = 15;
    } else if (title.includes('اقتصاد') || title.includes('تشغيل')) {
      type = 'initiative_support';
      skills = 'ريادة الأعمال، التسويق، التنظيم';
      minVol = 3;
      maxVol = 10;
    } else if (title.includes('سلامة') || title.includes('عدالة')) {
      type = 'community_event';
      skills = 'الإسعافات الأولية، السلامة العامة';
      minVol = 4;
      maxVol = 15;
    } else if (title.includes('رياضة') || title.includes('مشي') || title.includes('رياضية')) {
      type = 'community_event';
      skills = 'اللياقة البدنية، التنظيم الرياضي';
      minVol = 5;
      maxVol = 20;
    } else if (title.includes('تغذية') || title.includes('طبخ')) {
      type = 'awareness';
      skills = 'التغذية الصحية، إعداد الوجبات، التوعية';
      minVol = 3;
      maxVol = 12;
    } else if (title.includes('تدخين')) {
      type = 'awareness';
      skills = 'التوعية الصحية، مهارات الإقناع';
      minVol = 4;
      maxVol = 15;
    } else if (title.includes('حوكمة') || title.includes('شراكات')) {
      type = 'committee_work';
      skills = 'التخطيط الاستراتيجي، التنسيق، إدارة الشراكات';
      minVol = 2;
      maxVol = 8;
    }

    // تحديد الوصف المناسب
    const descriptions = {
      'مشاركة مجتمعية': 'فرصة تطوعية للمساهمة في تعزيز المشاركة المجتمعية في برنامج المدينة الصحية من خلال تنظيم فعاليات مجتمعية وحملات توعوية',
      'بيئة خضراء': 'فرصة تطوعية للمشاركة في مبادرة بيئة خضراء لتحسين البيئة المحلية وزيادة المساحات الخضراء',
      'صحة ورعاية': 'فرصة تطوعية لدعم الرعاية الصحية المجتمعية والمساهمة في تعزيز الوعي الصحي',
      'نقل آمن': 'فرصة تطوعية للمساهمة في تحسين وسائل النقل وتعزيز السلامة المرورية في المدينة',
      'إسكان وخدمات': 'فرصة تطوعية لدعم مبادرات تحسين الإسكان والخدمات الأساسية للمجتمع',
      'تعليم وثقافة': 'فرصة تطوعية للمساهمة في الأنشطة التعليمية والثقافية لبرنامج المدينة الصحية',
      'اقتصاد وتشغيل': 'فرصة تطوعية لدعم التنمية الاقتصادية وتوفير فرص التشغيل في المجتمع',
      'سلامة وعدالة': 'فرصة تطوعية للمساهمة في تعزيز السلامة العامة والعدالة الاجتماعية',
      'حوكمة وشراكات': 'فرصة تطوعية للمشاركة في بناء الشراكات المجتمعية وتعزيز الحوكمة الرشيدة',
      'حملة التطعيم الموسمي': 'فرصة تطوعية للمساعدة في حملة التطعيم الموسمي بالتنسيق والتنظيم والتوعية',
      'برنامج الفحص الدوري للأمراض المزمنة': 'فرصة تطوعية لدعم برنامج الفحص الدوري من خلال تسجيل المراجعين وتنظيم مواعيد الفحوصات',
      'مبادرة الصحة النفسية': 'فرصة تطوعية للمساهمة في نشر الوعي بالصحة النفسية والمساعدة في تنظيم جلسات الدعم',
      'مشروع تحسين جودة الهواء': 'فرصة تطوعية للمشاركة في رصد جودة الهواء وزراعة الأشجار لتحسين البيئة',
      'حملة النظافة الشاملة': 'فرصة تطوعية للمشاركة في حملة النظافة العامة وتنظيف الأحياء والشوارع',
      'برنامج التوعية بأضرار التدخين': 'فرصة تطوعية للمشاركة في حملات التوعية بأضرار التدخين في المدارس والأماكن العامة',
      'مبادرة الصحة المدرسية': 'فرصة تطوعية لدعم الصحة المدرسية من خلال برامج فحص الطلاب والتوعية الصحية',
      'حملة التوعية بالأمراض المعدية': 'فرصة تطوعية لنشر الوعي بطرق الوقاية من الأمراض المعدية في المجتمع',
      'مسابقة المشي اليومي': 'فرصة تطوعية لتنظيم مسابقة المشي اليومي وتشجيع الرياضة المجتمعية',
      'إنشاء مسارات رياضية': 'فرصة تطوعية للمساعدة في تخطيط وإنشاء مسارات رياضية في أحياء المدينة',
      'برنامج الرياضة للجميع': 'فرصة تطوعية لتنظيم الأنشطة الرياضية المتنوعة لجميع فئات المجتمع',
      'برنامج التغذية المدرسية الصحية': 'فرصة تطوعية لتعزيز التغذية السليمة في المدارس وتقديم وجبات صحية',
      'حملة الحد من السمنة': 'فرصة تطوعية للمساهمة في التوعية بمخاطر السمنة وتنظيم فعاليات رياضية',
      'مبادرة الطبخ الصحي': 'فرصة تطوعية للمشاركة في ورش الطبخ الصحي وتعليم المجتمع أساليب التغذية السليمة',
    };

    const description = descriptions[title] || `فرصة تطوعية لدعم مبادرة "${title}" ضمن برنامج مدينة قلوة الصحية`;

    // حساب التواريخ
    const startDate = init.start_date || formatDate(addDays(today, 7));
    const endDate = init.end_date || formatDate(addDays(today, 90));

    // تحديد الحالة بناءً على حالة المبادرة
    let status = 'open';
    if (init.status === 'planning') status = 'draft';
    else if (init.status === 'completed') status = 'closed';
    else if (init.status === 'in_progress') status = 'open';
    else if (init.status === 'approved') status = 'open';

    opportunities.push({
      title: `تطوع: ${title}`,
      description,
      type,
      committee_id: init.committee_id || '',
      committee_name: init.committee_name || '',
      initiative_id: init.id,
      initiative_name: title,
      axis_id: init.axis_id || '',
      axis_name: init.axis_name || '',
      required_skills: skills,
      min_volunteers: minVol,
      max_volunteers: maxVol,
      start_date: startDate,
      end_date: endDate,
      location,
      status,
      volunteers: [],
      created_by: 'النظام',
    });
  }

  // إضافة فرص عامة للجان التي ليس لديها مبادرات مباشرة
  const committeeInitiativeIds = new Set(initiatives.map(i => i.committee_id).filter(Boolean));
  
  for (const comm of committees) {
    // إضافة فرصة عمل لجان لكل لجنة
    if (comm.name !== 'اللجنة الرئيسية') {
      opportunities.push({
        title: `دعم أعمال ${comm.name}`,
        description: `فرصة تطوعية للانضمام ودعم أعمال ${comm.name} في برنامج مدينة قلوة الصحية. يشمل العمل المشاركة في الاجتماعات وتنفيذ المهام والمساهمة في تحقيق أهداف اللجنة`,
        type: 'committee_work',
        committee_id: comm.id,
        committee_name: comm.name,
        initiative_id: '',
        initiative_name: '',
        axis_id: '',
        axis_name: '',
        required_skills: 'العمل الجماعي، التنظيم، الالتزام بالحضور',
        min_volunteers: 2,
        max_volunteers: 8,
        start_date: formatDate(today),
        end_date: formatDate(addDays(today, 180)),
        location: 'مدينة قلوة',
        status: 'open',
        volunteers: [],
        created_by: 'النظام',
      });
    }
  }

  console.log(`\n✅ سيتم إنشاء ${opportunities.length} فرصة تطوعية\n`);

  // إنشاء الفرص واحدة تلو الأخرى
  let success = 0;
  let failed = 0;

  for (const opp of opportunities) {
    try {
      const result = await createOpportunity(opp);
      success++;
      console.log(`  ✅ ${opp.title}`);
    } catch (err) {
      failed++;
      console.error(`  ❌ ${opp.title}: ${err.message}`);
    }
  }

  console.log(`\n📊 النتيجة: ${success} نجحت، ${failed} فشلت`);
}

main().catch(console.error);
