/**
 * مؤشرات الأداء المحسنة على مستوى المحاور
 * إعادة بناء شاملة لمؤشرات المحاور بناءً على أفضل الممارسات
 */

// ===== مؤشرات الأداء المتقدمة لكل محور =====

/**
 * مؤشرات المحور 1: تنظيم المجتمع وتعبئته
 */
const AXIS_1_KPIS = [
  {
    name: 'مؤشر التمكين المجتمعي',
    target: '80%+',
    unit: '%',
    description: 'نسبة المجموعات المجتمعية الفعالة',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'تقييم أداء المجموعات',
    data_source: 'سجلات اللجان',
    calculation: '(عدد المجموعات الفعالة ÷ العدد الإجمالي) × 100'
  },
  {
    name: 'مؤشر جودة التدريب',
    target: 'جيد جداً',
    unit: 'مستوى',
    description: 'جودة برامج التدريب المقدمة',
    category: 'نوعي',
    weight: 0.20,
    verification_method: 'تقييم المشاركين',
    data_source: 'استبيانات ما بعد التدريب',
    scale: ['ضعيف', 'متوسط', 'جيد', 'جيد جداً', 'ممتاز']
  },
  {
    name: 'مؤشر الاستدامة التنظيمية',
    target: 'مستدام',
    unit: 'درجة',
    description: 'قدرة الهياكل التنظيمية على الاستمرار',
    category: 'نوعي',
    weight: 0.20,
    verification_method: 'تحليل الهياكل',
    data_source: 'الوثائق التنظيمية'
  },
  {
    name: 'مؤشر المشاركة في اتخاذ القرار',
    target: '70%+',
    unit: '%',
    description: 'مشاركة المجتمع في قرارات البرنامج',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'محاضر الاجتماعات',
    data_source: 'سجلات المشاركة'
  },
  {
    name: 'مؤشر التغطية الجغرافية',
    target: '90%+',
    unit: '%',
    description: 'تغطية الأنشطة لجميع مناطق المدينة',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'خرائط التغطية',
    data_source: 'خرائط الأنشطة'
  },
  {
    name: 'مؤشر الرضا المجتمعي',
    target: '75%+',
    unit: '%',
    description: 'رضا المجتمع عن الأنشطة المقدمة',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'استبيانات الرضا',
    data_source: 'نتائج الاستبيانات'
  }
];

/**
 * مؤشرات المحور 2: التعاون والشراكة
 */
const AXIS_2_KPIS = [
  {
    name: 'مؤشر فعالية الشراكات',
    target: 'فعالة جداً',
    unit: 'مستوى',
    description: 'جودة وفعالية الشراكات القائمة',
    category: 'نوعي',
    weight: 0.30,
    verification_method: 'تقييم الشركاء',
    data_source: 'تقارير الشراكة',
    scale: ['ضعيفة', 'متوسطة', 'فعالة', 'فعالة جداً', 'ممتازة']
  },
  {
    name: 'مؤشر عدد الشركاء النشطين',
    target: '8+ جهة',
    unit: 'جهة',
    description: 'عدد الشركاء الفاعلين في البرنامج',
    category: 'كمي',
    weight: 0.20,
    verification_method: 'سجل الشركاء',
    data_source: 'قوائم الشركاء'
  },
  {
    name: 'مؤشر التنسيق المؤسسي',
    target: 'منسجم',
    unit: 'درجة',
    description: 'جودة التنسيق بين المؤسسات',
    category: 'نوعي',
    weight: 0.20,
    verification_method: 'تحليل آليات التنسيق',
    data_source: 'محاضر التنسيق'
  },
  {
    name: 'مؤشر مشاركة الموارد',
    target: '60%+',
    unit: '%',
    description: 'نسبة الموارد المشتركة بين الشركاء',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'تحليل الميزانيات',
    data_source: 'كشوف الموارد'
  },
  {
    name: 'مؤشر الاستجابة السياسية',
    target: 'سريعة',
    unit: 'وقت',
    description: 'سرعة الاستجابة للقضايا السياسية',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'تتبع الزمن',
    data_source: 'سجل القضايا'
  }
];

/**
 * مؤشرات المحور 3: مركز المعلومات
 */
const AXIS_3_KPIS = [
  {
    name: 'مؤشر جودة المعلومات',
    target: '95%+',
    unit: '%',
    description: 'دقة وموثوقية المعلومات المتوفرة',
    category: 'كمي',
    weight: 0.30,
    verification_method: 'فحص العينات',
    data_source: 'قاعدة البيانات'
  },
  {
    name: 'مؤشر الوصول للمعلومات',
    target: '80%+',
    unit: '%',
    description: 'سهولة وصول المجتمع للمعلومات',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'استبيانات الوصول',
    data_source: 'إحصائيات الوصول'
  },
  {
    name: 'مؤشر تحديث البيانات',
    target: 'شهري',
    unit: 'تكرار',
    description: 'انتظام تحديث قاعدة البيانات',
    category: 'كمي',
    weight: 0.20,
    verification_method: 'مراجعة السجلات',
    data_source: 'سجل التحديثات'
  },
  {
    name: 'مؤشر استخدام التكنولوجيا',
    target: 'متقدم',
    unit: 'مستوى',
    description: 'مستوى استخدام التكنولوجيا في نشر المعلومات',
    category: 'نوعي',
    weight: 0.15,
    verification_method: 'تقييم الأنظمة',
    data_source: 'تقارير تقنية المعلومات'
  },
  {
    name: 'مؤشر الرضا عن الخدمة',
    target: '85%+',
    unit: '%',
    description: 'رضا المستخدمين عن خدمة المعلومات',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'استبيانات الرضا',
    data_source: 'نتائج الاستبيانات'
  }
];

/**
 * مؤشرات المحور 4: المياه والصرف الصحي والغذاء والهواء
 */
const AXIS_4_KPIS = [
  {
    name: 'مؤشر جودة المياه',
    target: '100%',
    unit: '%',
    description: 'تغطية مياه الشرب الآمنة',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'تحاليل مختبرية',
    data_source: 'نتائج تحاليل المياه'
  },
  {
    name: 'مؤشر معالجة النفايات',
    target: '85%+',
    unit: '%',
    description: 'تغطية خدمة جمع ومعالجة النفايات',
    category: 'كمي',
    weight: 0.20,
    verification_method: 'فحص ميداني',
    data_source: 'سجل الخدمة'
  },
  {
    name: 'مؤشر سلامة الغذاء',
    target: '90%+',
    unit: '%',
    description: 'مراقبة سلامة الغذاء في الأسواق',
    category: 'كمي',
    weight: 0.20,
    verification_method: 'تفتيش دوري',
    data_source: 'تقارير الرقابة'
  },
  {
    name: 'مؤشر جودة الهواء',
    target: 'مقبول',
    unit: 'مستوى',
    description: 'مستوى جودة الهواء في المدينة',
    category: 'نوعي',
    weight: 0.15,
    verification_method: 'قياسات منتظمة',
    data_source: 'تقارير الرصد'
  },
  {
    name: 'مؤشر الوعي البيئي',
    target: '75%+',
    unit: '%',
    description: 'وعي المجتمع بالقضايا البيئية',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'استبيانات الوعي',
    data_source: 'نتائج الاستبيانات'
  },
  {
    name: 'مؤشر المساحات الخضراء',
    target: '15%+',
    unit: '%',
    description: 'نسبة المساحات الخضراء في المدينة',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'قياسات جغرافية',
    data_source: 'خرائط المدينة'
  }
];

/**
 * مؤشرات المحور 5: التنمية الصحية
 */
const AXIS_5_KPIS = [
  {
    name: 'مؤشر التغطية الصحية',
    target: '90%+',
    unit: '%',
    description: 'تغطية الخدمات الصحية الأساسية',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'سجلات المرافق',
    data_source: 'إحصائيات التغطية'
  },
  {
    name: 'مؤشر التطعيم',
    target: '95%+',
    unit: '%',
    description: 'تغطية التطعيم للأطفال',
    category: 'كمي',
    weight: 0.20,
    verification_method: 'سجلات التطعيم',
    data_source: 'بطاقات التحصين'
  },
  {
    name: 'مؤشر صحة الأم والطفل',
    target: '85%+',
    unit: '%',
    description: 'تغطية رعاية الأم والطفل',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'سجلات الرعاية',
    data_source: 'سجلات الأمومة'
  },
  {
    name: 'مؤشر الأمراض المزمنة',
    target: '100%',
    unit: '%',
    description: 'تسجيل ومتابعة الأمراض المزمنة',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'سجلات الحالات',
    data_source: 'سجل الأمراض المزمنة'
  },
  {
    name: 'مؤشر جودة الخدمات',
    target: 'جيد جداً',
    unit: 'مستوى',
    description: 'جودة الرعاية الصحية المقدمة',
    category: 'نوعي',
    weight: 0.15,
    verification_method: 'تقييم المستخدمين',
    data_source: 'استبيانات الرضا'
  },
  {
    name: 'مؤشر الاستجابة للطوارئ',
    target: 'أقل من 30 دقيقة',
    unit: 'وقت',
    description: 'وقت الاستجابة للحالات الطارئة',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'تتبع الزمن',
    data_source: 'سجل الاستجابة'
  },
  {
    name: 'مؤشر توفر الأدوية',
    target: '95%+',
    unit: '%',
    description: 'توفر الأدوية الأساسية',
    category: 'كمي',
    weight: 0.05,
    verification_method: 'جرد المخزون',
    data_source: 'سجل الصيدلية'
  }
];

/**
 * مؤشرات المحور 6: الاستعداد للطوارئ
 */
const AXIS_6_KPIS = [
  {
    name: 'مؤشر جاهزية الطوارئ',
    target: 'جاهز جداً',
    unit: 'مستوى',
    description: 'مستوى الاستعداد للطوارئ',
    category: 'نوعي',
    weight: 0.30,
    verification_method: 'تقييم شامل',
    data_source: 'تقرير التقييم'
  },
  {
    name: 'مؤشر التدريب على الطوارئ',
    target: '100 شخص',
    unit: 'شخص',
    description: 'عدد الأشخاص المدربين على الاستجابة',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'سجلات التدريب',
    data_source: 'قوائم المتدربين'
  },
  {
    name: 'مؤشر خطة الطوارئ',
    target: 'محدثة',
    unit: 'حالة',
    description: 'حداثة خطة الاستجابة للطوارئ',
    category: 'نوعي',
    weight: 0.20,
    verification_method: 'مراجعة الخطة',
    data_source: 'وثيقة الخطة'
  },
  {
    name: 'مؤشر تحديد المجموعات المستضعفة',
    target: '100%',
    unit: '%',
    description: 'تسجيل المجموعات المستضعفة',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'مراجعة السجلات',
    data_source: 'خرائط المستضعفين'
  },
  {
    name: 'مؤشر التنسيق للطوارئ',
    target: 'فعال',
    unit: 'مستوى',
    description: 'جودة التنسيق مع الجهات المعنية',
    category: 'نوعي',
    weight: 0.10,
    verification_method: 'محاضر التنسيق',
    data_source: 'سجل التنسيق'
  }
];

/**
 * مؤشرات المحور 7: التعليم
 */
const AXIS_7_KPIS = [
  {
    name: 'مؤشر الالتحاق بالمدارس',
    target: '100%',
    unit: '%',
    description: 'معدل الالتحاق بالتعليم الأساسي',
    category: 'كمي',
    weight: 0.30,
    verification_method: 'سجلات المدارس',
    data_source: 'إحصائيات التعليم'
  },
  {
    name: 'مؤثير التسرب المدرسي',
    target: 'أقل من 2%',
    unit: '%',
    description: 'معدل التسرب من التعليم',
    category: 'كمي',
    weight: 0.20,
    verification_method: 'تحليل الإحصائيات',
    data_source: 'سجلات التسرب'
  },
  {
    name: 'مؤشر جودة التعليم',
    target: 'جيد',
    unit: 'مستوى',
    description: 'مستوى جودة التعليم المقدم',
    category: 'نوعي',
    weight: 0.20,
    verification_method: 'تقييم أداء',
    data_source: 'تقارير التقييم'
  },
  {
    name: 'مؤشر محو الأمية',
    target: '70%+',
    unit: '%',
    description: 'معدل محو الأمية للكبار',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'اختبارات القرائية',
    data_source: 'نتائج الاختبارات'
  },
  {
    name: 'مؤشر مشاركة أولياء الأمور',
    target: '80%+',
    unit: '%',
    description: 'مشاركة أولياء الأمور في التعليم',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'سجل الحضور',
    data_source: 'محاضر الاجتماعات'
  }
];

/**
 * مؤشرات المحور 8: المهارات والتدريب
 */
const AXIS_8_KPIS = [
  {
    name: 'مؤشر التدريب المهني',
    target: '300 شخص',
    unit: 'شخص',
    description: 'عدد المتدربين سنوياً',
    category: 'كمي',
    weight: 0.30,
    verification_method: 'سجلات التدريب',
    data_source: 'قوائم المتدربين'
  },
  {
    name: 'مؤشر التوظيف بعد التدريب',
    target: '60%+',
    unit: '%',
    description: 'نسبة التوظيف بعد إتمام التدريب',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'متابعة الخريجين',
    data_source: 'سجل التوظيف'
  },
  {
    name: 'مؤشر استدامة المراكز',
    target: 'ذاتي التمويل',
    unit: 'حالة',
    description: 'استدامة مراكز التدريب',
    category: 'نوعي',
    weight: 0.20,
    verification_method: 'تحليل مالي',
    data_source: 'تقارير مالية'
  },
  {
    name: 'مؤشر جودة التدريب',
    target: 'جيد جداً',
    unit: 'مستوى',
    description: 'جودة برامج التدريب المقدمة',
    category: 'نوعي',
    weight: 0.15,
    verification_method: 'تقييم المتدربين',
    data_source: 'استبيانات التقييم'
  },
  {
    name: 'مؤشر الابتكار',
    target: '20 مشروع',
    unit: 'مشروع',
    description: 'عدد المشاريع المبتكرة المدعومة',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'سجل المشاريع',
    data_source: 'سجل الابتكار'
  }
];

/**
 * مؤشرات المحور 9: القروض الصغيرة
 */
const AXIS_9_KPIS = [
  {
    name: 'مؤشر التغطية المالية',
    target: '200 شخص',
    unit: 'شخص',
    description: 'عدد المستفيدين من القروض',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'سجل المستفيدين',
    data_source: 'ملفات القروض'
  },
  {
    name: 'مؤشر سداد القروض',
    target: '85%+',
    unit: '%',
    description: 'معدل سداد القروض في الوقت المحدد',
    category: 'كمي',
    weight: 0.25,
    verification_method: 'تحليل السداد',
    data_source: 'سجل السداد'
  },
  {
    name: 'مؤشر استدامة الصندوق',
    target: 'مستدام',
    unit: 'حالة',
    description: 'استدامة الصندوق الدائري',
    category: 'نوعي',
    weight: 0.20,
    verification_method: 'تحليل مالي',
    data_source: 'تقارير مالية'
  },
  {
    name: 'مؤشر التمكين الاقتصادي',
    target: '70%+',
    unit: '%',
    description: 'نسبة تحسين الدخل للمستفيدين',
    category: 'كمي',
    weight: 0.15,
    verification_method: 'متابعة الدخل',
    data_source: 'تقارير التمكين'
  },
  {
    name: 'مؤشر التنمية الاجتماعية',
    target: '10%',
    unit: '%',
    description: 'نسبة الأرباح المخصصة للتنمية',
    category: 'كمي',
    weight: 0.10,
    verification_method: 'مراجعة الحسابات',
    data_source: 'كشوف الحسابات'
  },
  {
    name: 'مؤشر رضا المستفيدين',
    target: '80%+',
    unit: '%',
    description: 'رضا المستفيدين عن الخدمة',
    category: 'كمي',
    weight: 0.05,
    verification_method: 'استبيانات الرضا',
    data_source: 'نتائج الاستبيانات'
  }
];

// ===== تجميع مؤشرات جميع المحاور =====

export const ENHANCED_AXIS_KPIS = [
  { axis_order: 1, axis_name: 'تنظيم المجتمع وتعبئته من أجل الصحة والتنمية', kpis: AXIS_1_KPIS },
  { axis_order: 2, axis_name: 'التعاون، والشراكة والدعوى بين القطاعات', kpis: AXIS_2_KPIS },
  { axis_order: 3, axis_name: 'مركز المعلومات المجتمعي', kpis: AXIS_3_KPIS },
  { axis_order: 4, axis_name: 'المياه والصرف الصحي وسلامة الغذاء وتلوث الهواء', kpis: AXIS_4_KPIS },
  { axis_order: 5, axis_name: 'التنمية الصحية', kpis: AXIS_5_KPIS },
  { axis_order: 6, axis_name: 'الاستعداد للطوارئ والاستجابة لها', kpis: AXIS_6_KPIS },
  { axis_order: 7, axis_name: 'التعليم ومحو الأمية', kpis: AXIS_7_KPIS },
  { axis_order: 8, axis_name: 'تنمية المهارات، والتدريب المهني وبناء القدرات', kpis: AXIS_8_KPIS },
  { axis_order: 9, axis_name: 'أنشطة القروض الصغيرة', kpis: AXIS_9_KPIS }
];

// ===== وظائف الحساب والتحليل =====

/**
 * حساب النتيجة الإجمالية للمحور
 */
export function calculateAxisScore(axisKpis, actualValues) {
  let totalScore = 0;
  let totalWeight = 0;

  axisKpis.forEach(kpi => {
    const actualValue = actualValues[kpi.name];
    if (actualValue !== undefined) {
      const score = calculateKpiScore(kpi, actualValue);
      totalScore += score * kpi.weight;
      totalWeight += kpi.weight;
    }
  });

  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
}

/**
 * حساب نتيجة المؤشر الفردي
 */
function calculateKpiScore(kpi, actualValue) {
  if (kpi.unit === '%') {
    const target = parseFloat(kpi.target.replace('%', ''));
    const actual = parseFloat(actualValue.replace('%', ''));
    return Math.min(actual / target, 1);
  }
  
  if (kpi.scale) {
    const targetIndex = kpi.scale.indexOf(kpi.target);
    const actualIndex = kpi.scale.indexOf(actualValue);
    return actualIndex >= targetIndex ? 1 : actualIndex / targetIndex;
  }
  
  if (kpi.unit === 'شخص' || kpi.unit === 'جهة' || kpi.unit === 'مشروع') {
    const target = parseFloat(kpi.target);
    const actual = parseFloat(actualValue);
    return Math.min(actual / target, 1);
  }
  
  // للمؤشرات النوعية الأخرى
  return actualValue === kpi.target ? 1 : 0.5;
}

/**
 * توليد تقرير أداء المحور
 */
export function generateAxisPerformanceReport(axisOrder, axisKpis, actualValues) {
  const score = calculateAxisScore(axisKpis, actualValues);
  const status = getPerformanceStatus(score);
  
  return {
    axis_order: axisOrder,
    overall_score: Math.round(score),
    status: status,
    kpi_details: axisKpis.map(kpi => ({
      name: kpi.name,
      target: kpi.target,
      actual: actualValues[kpi.name] || 'غير متوفر',
      score: calculateKpiScore(kpi, actualValues[kpi.name]) * 100,
      weight: kpi.weight * 100,
      category: kpi.category
    })),
    recommendations: generateRecommendations(axisOrder, score, axisKpis, actualValues),
    last_updated: new Date().toISOString()
  };
}

/**
 * تحديد حالة الأداء
 */
function getPerformanceStatus(score) {
  if (score >= 90) return 'ممتاز';
  if (score >= 80) return 'جيد جداً';
  if (score >= 70) return 'جيد';
  if (score >= 60) return 'متوسط';
  return 'ضعيف';
}

/**
 * توليد التوصيات بناءً على الأداء
 */
function generateRecommendations(axisOrder, score, kpis, actualValues) {
  const recommendations = [];
  
  if (score < 70) {
    recommendations.push('حاجة إلى تحسين شامل في أداء المحور');
  }
  
  kpis.forEach(kpi => {
    const actualValue = actualValues[kpi.name];
    if (actualValue !== undefined) {
      const kpiScore = calculateKpiScore(kpi, actualValue);
      if (kpiScore < 0.7) {
        recommendations.push(`تحسين مؤشر ${kpi.name} - القيمة الحالية: ${actualValue}, المستهدف: ${kpi.target}`);
      }
    }
  });
  
  return recommendations;
}

export default {
  ENHANCED_AXIS_KPIS,
  calculateAxisScore,
  generateAxisPerformanceReport
};
