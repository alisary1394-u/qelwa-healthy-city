/**
 * سكريبت لإضافة بيانات تجريبية شاملة للنظام
 * يتضمن: لجان، أعضاء فريق، مبادرات مرتبطة بكل لجنة
 */

import { createClient } from '@base44/sdk';

// ⚠️ تنبيه: يجب تعديل هذه القيم حسب إعدادات تطبيقك
// يمكنك العثور على هذه القيم في ملف vite.config.js أو في لوحة Base44
const api = createClient({
  appId: 'qelwa-healthy-city-alisary1394-u',
  baseUrl: 'https://base44.app',
});

// بيانات اللجان
const committees = [
  {
    name: 'لجنة الصحة العامة',
    description: 'مسؤولة عن تعزيز الصحة العامة والوقاية من الأمراض',
    head_name: 'د. أحمد السالم',
    members_count: 8,
    status: 'active'
  },
  {
    name: 'لجنة البيئة الصحية',
    description: 'تهتم بالبيئة الصحية والنظافة العامة',
    head_name: 'م. فاطمة الزهراني',
    members_count: 6,
    status: 'active'
  },
  {
    name: 'لجنة التوعية والتثقيف الصحي',
    description: 'نشر الوعي الصحي وتثقيف المجتمع',
    head_name: 'أ. محمد القحطاني',
    members_count: 7,
    status: 'active'
  },
  {
    name: 'لجنة الرياضة والنشاط البدني',
    description: 'تعزيز النشاط البدني والرياضة في المجتمع',
    head_name: 'أ. سارة العتيبي',
    members_count: 5,
    status: 'active'
  },
  {
    name: 'لجنة التغذية الصحية',
    description: 'تعزيز الأنماط الغذائية الصحية',
    head_name: 'د. نورة الشهري',
    members_count: 6,
    status: 'active'
  }
];

// أعضاء الفريق لكل لجنة
const teamMembersByCommittee = {
  'لجنة الصحة العامة': [
    { full_name: 'د. أحمد السالم', role: 'committee_head', email: 'ahmed.salem@qelwa.sa', phone: '0501234567', national_id: '1234567890' },
    { full_name: 'د. خالد المطيري', role: 'committee_coordinator', email: 'khaled.mutairi@qelwa.sa', phone: '0501234568', national_id: '1234567891' },
    { full_name: 'أ. ريم الدوسري', role: 'committee_supervisor', email: 'reem.dosari@qelwa.sa', phone: '0501234569', national_id: '1234567892' },
    { full_name: 'أ. عبدالله الغامدي', role: 'committee_member', email: 'abdullah.ghamdi@qelwa.sa', phone: '0501234570', national_id: '1234567893' },
    { full_name: 'أ. منى الحربي', role: 'committee_member', email: 'mona.harbi@qelwa.sa', phone: '0501234571', national_id: '1234567894' },
    { full_name: 'أ. سعد العمري', role: 'committee_member', email: 'saad.omari@qelwa.sa', phone: '0501234572', national_id: '1234567895' },
    { full_name: 'أ. هند الشمري', role: 'committee_member', email: 'hind.shamri@qelwa.sa', phone: '0501234573', national_id: '1234567896' },
    { full_name: 'أ. فهد الزهراني', role: 'committee_member', email: 'fahad.zahrani@qelwa.sa', phone: '0501234574', national_id: '1234567897' }
  ],
  'لجنة البيئة الصحية': [
    { full_name: 'م. فاطمة الزهراني', role: 'committee_head', email: 'fatima.zahrani@qelwa.sa', phone: '0502234567', national_id: '2234567890' },
    { full_name: 'م. ياسر القرني', role: 'committee_coordinator', email: 'yasser.qarni@qelwa.sa', phone: '0502234568', national_id: '2234567891' },
    { full_name: 'أ. لطيفة العنزي', role: 'committee_supervisor', email: 'latifa.anzi@qelwa.sa', phone: '0502234569', national_id: '2234567892' },
    { full_name: 'أ. بدر الشهراني', role: 'committee_member', email: 'badr.shahrani@qelwa.sa', phone: '0502234570', national_id: '2234567893' },
    { full_name: 'أ. نوف السبيعي', role: 'committee_member', email: 'nouf.subaie@qelwa.sa', phone: '0502234571', national_id: '2234567894' },
    { full_name: 'أ. طارق الأحمدي', role: 'committee_member', email: 'tariq.ahmadi@qelwa.sa', phone: '0502234572', national_id: '2234567895' }
  ],
  'لجنة التوعية والتثقيف الصحي': [
    { full_name: 'أ. محمد القحطاني', role: 'committee_head', email: 'mohammed.qahtani@qelwa.sa', phone: '0503234567', national_id: '3234567890' },
    { full_name: 'أ. عائشة الجهني', role: 'committee_coordinator', email: 'aisha.juhani@qelwa.sa', phone: '0503234568', national_id: '3234567891' },
    { full_name: 'أ. عمر البلوي', role: 'committee_supervisor', email: 'omar.balawi@qelwa.sa', phone: '0503234569', national_id: '3234567892' },
    { full_name: 'أ. جواهر الحارثي', role: 'committee_member', email: 'jawaher.harthi@qelwa.sa', phone: '0503234570', national_id: '3234567893' },
    { full_name: 'أ. ماجد العتيبي', role: 'committee_member', email: 'majed.otaibi@qelwa.sa', phone: '0503234571', national_id: '3234567894' },
    { full_name: 'أ. شيخة المالكي', role: 'committee_member', email: 'shaikha.malki@qelwa.sa', phone: '0503234572', national_id: '3234567895' },
    { full_name: 'أ. راشد الدوسري', role: 'committee_member', email: 'rashed.dosari@qelwa.sa', phone: '0503234573', national_id: '3234567896' }
  ],
  'لجنة الرياضة والنشاط البدني': [
    { full_name: 'أ. سارة العتيبي', role: 'committee_head', email: 'sarah.otaibi@qelwa.sa', phone: '0504234567', national_id: '4234567890' },
    { full_name: 'أ. فيصل الشمري', role: 'committee_coordinator', email: 'faisal.shamri@qelwa.sa', phone: '0504234568', national_id: '4234567891' },
    { full_name: 'أ. أمل السهلي', role: 'committee_supervisor', email: 'amal.sahli@qelwa.sa', phone: '0504234569', national_id: '4234567892' },
    { full_name: 'أ. تركي الغامدي', role: 'committee_member', email: 'turki.ghamdi@qelwa.sa', phone: '0504234570', national_id: '4234567893' },
    { full_name: 'أ. ريما القرشي', role: 'committee_member', email: 'rima.qurashi@qelwa.sa', phone: '0504234571', national_id: '4234567894' }
  ],
  'لجنة التغذية الصحية': [
    { full_name: 'د. نورة الشهري', role: 'committee_head', email: 'noura.shehri@qelwa.sa', phone: '0505234567', national_id: '5234567890' },
    { full_name: 'د. سلطان العمري', role: 'committee_coordinator', email: 'sultan.omari@qelwa.sa', phone: '0505234568', national_id: '5234567891' },
    { full_name: 'أ. وفاء الحربي', role: 'committee_supervisor', email: 'wafa.harbi@qelwa.sa', phone: '0505234569', national_id: '5234567892' },
    { full_name: 'أ. إبراهيم الزهراني', role: 'committee_member', email: 'ibrahim.zahrani@qelwa.sa', phone: '0505234570', national_id: '5234567893' },
    { full_name: 'أ. مها القحطاني', role: 'committee_member', email: 'maha.qahtani@qelwa.sa', phone: '0505234571', national_id: '5234567894' },
    { full_name: 'أ. عبدالرحمن السبيعي', role: 'committee_member', email: 'abdulrahman.subaie@qelwa.sa', phone: '0505234572', national_id: '5234567895' }
  ]
};

// مبادرات لكل لجنة
const initiativesByCommittee = {
  'لجنة الصحة العامة': [
    {
      title: 'حملة التطعيم الموسمي',
      description: 'حملة شاملة لتطعيم المواطنين ضد الإنفلونزا الموسمية',
      objectives: 'تطعيم 80% من السكان المستهدفين خلال موسم الشتاء',
      status: 'in_progress',
      priority: 'high',
      expected_beneficiaries: 5000,
      budget: 150000,
      start_date: '2024-10-01',
      end_date: '2025-03-31'
    },
    {
      title: 'برنامج الفحص الدوري للأمراض المزمنة',
      description: 'فحص دوري مجاني للكشف المبكر عن السكري وضغط الدم',
      objectives: 'فحص 3000 مواطن سنوياً والكشف المبكر عن الأمراض المزمنة',
      status: 'approved',
      priority: 'high',
      expected_beneficiaries: 3000,
      budget: 200000,
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    },
    {
      title: 'مبادرة الصحة النفسية',
      description: 'برنامج دعم الصحة النفسية والاستشارات المجانية',
      objectives: 'تقديم استشارات نفسية لـ 500 مستفيد',
      status: 'planning',
      priority: 'medium',
      expected_beneficiaries: 500,
      budget: 100000,
      start_date: '2025-01-01',
      end_date: '2025-06-30'
    }
  ],
  'لجنة البيئة الصحية': [
    {
      title: 'مشروع تحسين جودة الهواء',
      description: 'مراقبة وتحسين جودة الهواء في الأماكن العامة',
      objectives: 'تركيب 20 محطة لمراقبة جودة الهواء',
      status: 'in_progress',
      priority: 'high',
      expected_beneficiaries: 10000,
      budget: 500000,
      start_date: '2024-06-01',
      end_date: '2025-05-31'
    },
    {
      title: 'حملة النظافة الشاملة',
      description: 'حملة تنظيف شاملة للأحياء والشوارع',
      objectives: 'تنظيف 50 حي سكني خلال 6 أشهر',
      status: 'approved',
      priority: 'medium',
      expected_beneficiaries: 15000,
      budget: 300000,
      start_date: '2024-09-01',
      end_date: '2025-02-28'
    }
  ],
  'لجنة التوعية والتثقيف الصحي': [
    {
      title: 'برنامج التوعية بأضرار التدخين',
      description: 'حملة توعوية شاملة عن أضرار التدخين وطرق الإقلاع عنه',
      objectives: 'الوصول إلى 10000 مستفيد عبر ورش العمل والمحاضرات',
      status: 'in_progress',
      priority: 'high',
      expected_beneficiaries: 10000,
      budget: 180000,
      start_date: '2024-08-01',
      end_date: '2025-07-31'
    },
    {
      title: 'مبادرة الصحة المدرسية',
      description: 'برنامج توعوي صحي للطلاب في المدارس',
      objectives: 'تنفيذ برامج توعية في 30 مدرسة',
      status: 'approved',
      priority: 'high',
      expected_beneficiaries: 8000,
      budget: 250000,
      start_date: '2024-09-01',
      end_date: '2025-06-30'
    },
    {
      title: 'حملة التوعية بالأمراض المعدية',
      description: 'نشر الوعي حول طرق الوقاية من الأمراض المعدية',
      objectives: 'إقامة 20 ورشة توعوية في الأحياء',
      status: 'planning',
      priority: 'medium',
      expected_beneficiaries: 5000,
      budget: 120000,
      start_date: '2025-02-01',
      end_date: '2025-08-31'
    }
  ],
  'لجنة الرياضة والنشاط البدني': [
    {
      title: 'مسابقة المشي اليومي',
      description: 'تحدي مجتمعي للمشي 10000 خطوة يومياً',
      objectives: 'مشاركة 2000 شخص في التحدي لمدة 3 أشهر',
      status: 'in_progress',
      priority: 'medium',
      expected_beneficiaries: 2000,
      budget: 80000,
      start_date: '2024-10-01',
      end_date: '2024-12-31'
    },
    {
      title: 'إنشاء مسارات رياضية',
      description: 'إنشاء مسارات مشي وجري في الحدائق العامة',
      objectives: 'إنشاء 10 مسارات رياضية بطول إجمالي 15 كم',
      status: 'approved',
      priority: 'high',
      expected_beneficiaries: 20000,
      budget: 600000,
      start_date: '2024-11-01',
      end_date: '2025-10-31'
    },
    {
      title: 'برنامج الرياضة للجميع',
      description: 'فعاليات رياضية أسبوعية مجانية لجميع الأعمار',
      objectives: 'تنظيم 50 فعالية رياضية خلال العام',
      status: 'in_progress',
      priority: 'medium',
      expected_beneficiaries: 5000,
      budget: 150000,
      start_date: '2024-07-01',
      end_date: '2025-06-30'
    }
  ],
  'لجنة التغذية الصحية': [
    {
      title: 'برنامج التغذية المدرسية الصحية',
      description: 'تحسين جودة الوجبات المدرسية وتعزيز الخيارات الصحية',
      objectives: 'تطبيق معايير التغذية الصحية في 25 مدرسة',
      status: 'in_progress',
      priority: 'high',
      expected_beneficiaries: 6000,
      budget: 400000,
      start_date: '2024-09-01',
      end_date: '2025-06-30'
    },
    {
      title: 'حملة الحد من السمنة',
      description: 'برنامج شامل للتوعية بمخاطر السمنة وطرق الوقاية',
      objectives: 'الوصول إلى 5000 مستفيد عبر الاستشارات والورش',
      status: 'approved',
      priority: 'high',
      expected_beneficiaries: 5000,
      budget: 220000,
      start_date: '2024-10-01',
      end_date: '2025-09-30'
    },
    {
      title: 'مبادرة الطبخ الصحي',
      description: 'ورش عملية لتعليم طرق الطبخ الصحي',
      objectives: 'تنظيم 30 ورشة طبخ صحي',
      status: 'planning',
      priority: 'medium',
      expected_beneficiaries: 1000,
      budget: 90000,
      start_date: '2025-03-01',
      end_date: '2025-12-31'
    }
  ]
};

async function seedData() {
  console.log('🌱 بدء إضافة البيانات التجريبية...\n');

  try {
    // 1. إضافة اللجان
    console.log('📋 إضافة اللجان...');
    const createdCommittees = {};
    
    for (const committee of committees) {
      try {
        const created = await api.entities.Committee.create(committee);
        createdCommittees[committee.name] = created;
        console.log(`   ✓ تمت إضافة: ${committee.name}`);
      } catch (error) {
        console.log(`   ✗ خطأ في إضافة ${committee.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ تمت إضافة ${Object.keys(createdCommittees).length} لجنة\n`);

    // 2. إضافة أعضاء الفريق
    console.log('👥 إضافة أعضاء الفريق...');
    const createdMembers = {};
    let totalMembers = 0;

    for (const [committeeName, members] of Object.entries(teamMembersByCommittee)) {
      const committee = createdCommittees[committeeName];
      if (!committee) {
        console.log(`   ⚠ تخطي أعضاء ${committeeName} - اللجنة غير موجودة`);
        continue;
      }

      createdMembers[committeeName] = [];
      
      for (const member of members) {
        try {
          const created = await api.entities.TeamMember.create({
            ...member,
            committee_id: committee.id,
            committee_name: committeeName
          });
          createdMembers[committeeName].push(created);
          totalMembers++;
          console.log(`   ✓ ${member.full_name} - ${committeeName}`);
        } catch (error) {
          console.log(`   ✗ خطأ في إضافة ${member.full_name}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ تمت إضافة ${totalMembers} عضو فريق\n`);

    // 3. إضافة المبادرات
    console.log('💡 إضافة المبادرات...');
    let totalInitiatives = 0;

    for (const [committeeName, initiatives] of Object.entries(initiativesByCommittee)) {
      const committee = createdCommittees[committeeName];
      const members = createdMembers[committeeName];
      
      if (!committee || !members || members.length === 0) {
        console.log(`   ⚠ تخطي مبادرات ${committeeName} - اللجنة أو الأعضاء غير موجودين`);
        continue;
      }

      for (const initiative of initiatives) {
        try {
          // اختيار قائد المبادرة (رئيس اللجنة أو المنسق)
          const leader = members.find(m => m.role === 'committee_head') || members[0];
          
          // اختيار فريق المبادرة (3-5 أعضاء)
          const teamSize = Math.min(Math.floor(Math.random() * 3) + 3, members.length);
          const teamMembers = members.slice(0, teamSize).map(m => m.id);

          const created = await api.entities.Initiative.create({
            ...initiative,
            committee_id: committee.id,
            committee_name: committeeName,
            leader_id: leader.id,
            leader_name: leader.full_name,
            team_members: teamMembers,
            code: `INI${Date.now().toString().slice(-6)}`
          });
          
          totalInitiatives++;
          console.log(`   ✓ ${initiative.title} - ${committeeName}`);
          
          // تأخير بسيط لتجنب تضارب الأكواد
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          console.log(`   ✗ خطأ في إضافة ${initiative.title}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ تمت إضافة ${totalInitiatives} مبادرة\n`);

    // ملخص
    console.log('📊 ملخص البيانات المضافة:');
    console.log(`   • اللجان: ${Object.keys(createdCommittees).length}`);
    console.log(`   • أعضاء الفريق: ${totalMembers}`);
    console.log(`   • المبادرات: ${totalInitiatives}`);
    console.log('\n✨ تمت إضافة جميع البيانات التجريبية بنجاح!\n');

  } catch (error) {
    console.error('❌ خطأ عام:', error);
  }
}

// تشغيل السكريبت
seedData();
