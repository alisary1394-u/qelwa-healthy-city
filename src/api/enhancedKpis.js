/**
 * مؤشرات الأداء المحسنة للمدن الصحية
 * إعادة بناء شاملة للمؤشرات بناءً على أفضل الممارسات الدولية
 * لكل معيار: مؤشرات كمية، نوعية، وطرق تحقق دقيقة
 */

// ===== أنواع المؤشرات القياسية =====

/** مؤشر التحقق الأساسي (موحد) */
const VERIFICATION_KPI = {
  name: 'مؤشر التحقق',
  target: 'أدلة متوفرة (+)',
  unit: 'تحقق',
  description: 'توفر الأدلة الكاملة لتحقيق المعيار',
  category: 'نوعي',
  verification_method: 'مراجعة الوثائق والمستندات الداعمة'
};

/** مؤشر النسبة المئوية للتغطية */
const COVERAGE_KPI = (target, description) => ({
  name: 'مؤشر التغطية',
  target: target,
  unit: '%',
  description: description,
  category: 'كمي',
  verification_method: 'حساب النسبة من السجلات والإحصاءات'
});

/** مؤشر الجودة والأداء */
const QUALITY_KPI = (target, description) => ({
  name: 'مؤشر الجودة',
  target: target,
  unit: 'مستوى',
  description: description,
  category: 'نوعي',
  verification_method: 'تقييم الأداء والممارسات'
});

/** مؤشر الاستدامة */
const SUSTAINABILITY_KPI = (target, description) => ({
  name: 'مؤشر الاستدامة',
  target: target,
  unit: 'درجة',
  description: description,
  category: 'نوعي',
  verification_method: 'تقييم استمرارية الأنشطة'
});

/** مؤشر المشاركة المجتمعية */
const PARTICIPATION_KPI = (target, description) => ({
  name: 'مؤشر المشاركة',
  target: target,
  unit: 'مشارك',
  description: description,
  category: 'كمي',
  verification_method: 'سجل المشاركين وقوائم الحضور'
});

/** مؤشر الوقت والتوقيت */
const TIMELINESS_KPI = (target, description) => ({
  name: 'مؤشر التوقيت',
  target: target,
  unit: 'وقت',
  description: description,
  category: 'كمي',
  verification_method: 'مراجعة الجداول الزمنية والتواريخ'
});

// ===== وظائف بناء المؤشرات المتخصصة =====

/**
 * بناء مؤشرات أداء متخصصة لكل معيار حسب طبيعته
 */
function buildAdvancedKpisForStandard(title, globalNum, axisOrder) {
  const baseKpis = [{ ...VERIFICATION_KPI, description: title }];
  
  // المحور 1: تنظيم المجتمع وتعبئته
  if (axisOrder === 1) {
    if (title.includes('تدريب')) {
      baseKpis.push(
        PARTICIPATION_KPI('15+ شخص', 'عدد الأشخاص المدربين'),
        QUALITY_KPI('جيد', 'جودة محتوى التدريب')
      );
    }
    if (title.includes('لجنة')) {
      baseKpis.push(
        TIMELINESS_KPI('شهري', 'انتظام اجتماعات اللجنة'),
        PARTICIPATION_KPI('80%+', 'نسبة الحضور في الاجتماعات')
      );
    }
  }
  
  // المحور 2: التعاون والشراكة
  if (axisOrder === 2) {
    baseKpis.push(
      PARTICIPATION_KPI('5+ جهة', 'عدد الشركاء الفاعلين'),
      QUALITY_KPI('فعال', 'جودة الشراكات والتعاون')
    );
  }
  
  // المحور 3: مركز المعلومات
  if (axisOrder === 3) {
    if (title.includes('معلومات')) {
      baseKpis.push(
        COVERAGE_KPI('90%+', 'نسبة الوصول للمعلومات'),
        QUALITY_KPI('محدث', 'جودة ودقة المعلومات')
      );
    }
    if (title.includes('ملف المدينة')) {
      baseKpis.push(
        TIMELINESS_KPI('ربع سنوي', 'تحديث ملف المدينة'),
        SUSTAINABILITY_KPI('مستدام', 'استمرارية استخدام الملف')
      );
    }
  }
  
  // المحور 4: المياه والصرف الصحي والغذاء والهواء
  if (axisOrder === 4) {
    if (title.includes('مياه')) {
      baseKpis.push(
        COVERAGE_KPI('100%', 'تغطية مياه الشرب الآمنة'),
        QUALITY_KPI('آمن', 'جودة المياه حسب المعايير')
      );
    }
    if (title.includes('نفايات')) {
      baseKpis.push(
        COVERAGE_KPI('80%+', 'تغطية خدمة جمع النفايات'),
        SUSTAINABILITY_KPI('مستدام', 'استمرارية نظام النفايات')
      );
    }
    if (title.includes('غذاء')) {
      baseKpis.push(
        COVERAGE_KPI('90%+', 'تغطية أسواق الغذاء الصحي'),
        QUALITY_KPI('مراقب', 'جودة مراقبة سلامة الغذاء')
      );
    }
    if (title.includes('هواء')) {
      baseKpis.push(
        TIMELINESS_KPI('يومي', 'رصد جودة الهواء'),
        QUALITY_KPI('مقبول', 'مستوى تلوث الهواء')
      );
    }
  }
  
  // المحور 5: التنمية الصحية
  if (axisOrder === 5) {
    if (title.includes('تطعيم') || title.includes('تحصين')) {
      baseKpis.push(
        COVERAGE_KPI('95%+', 'تغطية التطعيم'),
        QUALITY_KPI('شامل', 'شمولية البرنامج التطعيمي')
      );
    }
    if (title.includes('رعاية') && title.includes('حوامل')) {
      baseKpis.push(
        COVERAGE_KPI('90%+', 'تغطية رعاية الأمهات'),
        QUALITY_KPI('متابَع', 'جودة المتابعة الصحية')
      );
    }
    if (title.includes('أدوية') || title.includes('لقاحات')) {
      baseKpis.push(
        COVERAGE_KPI('100%', 'توفر الأدوية الأساسية'),
        QUALITY_KPI('جيد', 'جودة تخزين وتوزيع الأدوية')
      );
    }
    if (title.includes('مرض مزمن') || title.includes('مرضى')) {
      baseKpis.push(
        PARTICIPATION_KPI('100%', 'تسجيل الحالات المزمنة'),
        QUALITY_KPI('متابَع', 'جودة المتابعة العلاجية')
      );
    }
  }
  
  // المحور 6: الطوارئ
  if (axisOrder === 6) {
    baseKpis.push(
      TIMELINESS_KPI('سنوي', 'تحديث خطط الطوارئ'),
      PARTICIPATION_KPI('50+ شخص', 'عدد المدربين على الاستجابة'),
      QUALITY_KPI('جاهز', 'جودة الاستعداد للطوارئ')
    );
  }
  
  // المحور 7: التعليم
  if (axisOrder === 7) {
    if (title.includes('التحاق') || title.includes('مدارس')) {
      baseKpis.push(
        COVERAGE_KPI('100%', 'معدل الالتحاق بالمدارس'),
        QUALITY_KPI('مستمر', 'استمرارية التعليم بدون تسرب')
      );
    }
    if (title.includes('جودة')) {
      baseKpis.push(
        QUALITY_KPI('ممتاز', 'مستوى جودة التعليم'),
        PARTICIPATION_KPI('80%+', 'مشاركة أولياء الأمور')
      );
    }
    if (title.includes('محو أمية')) {
      baseKpis.push(
        PARTICIPATION_KPI('100+ شخص', 'عدد المتطوعين'),
        COVERAGE_KPI('70%+', 'معدل محو الأمية')
      );
    }
  }
  
  // المحور 8: المهارات والتدريب
  if (axisOrder === 8) {
    baseKpis.push(
      PARTICIPATION_KPI('200+ شخص', 'عدد المتدربين سنوياً'),
      COVERAGE_KPI('60%+', 'نسبة التوظيف بعد التدريب'),
      SUSTAINABILITY_KPI('ذاتي', 'استدامة مراكز التدريب')
    );
  }
  
  // المحور 9: القروض الصغيرة
  if (axisOrder === 9) {
    baseKpis.push(
      PARTICIPATION_KPI('100+ شخص', 'عدد المستفيدين من القروض'),
      COVERAGE_KPI('85%+', 'معدل سداد القروض'),
      SUSTAINABILITY_KPI('مستدام', 'استدامة الصندوق الدائري')
    );
  }
  
  return baseKpis;
}

/**
 * بناء قائمة المستندات المطلوبة لكل معيار
 */
function buildRequiredDocumentsForStandard(title, axisOrder) {
  const baseDocuments = ['خطة عمل المعيار', 'تقارير المتابعة', 'سجل الانجازات'];
  
  // مستندات خاصة بالمحور 1
  if (axisOrder === 1) {
    if (title.includes('تدريب')) {
      baseDocuments.push('محاضر التدريب', 'قوائم الحضور', 'مواد التدريب', 'تقييم ما بعد التدريب');
    }
    if (title.includes('لجنة')) {
      baseDocuments.push('قرار تشكيل اللجنة', 'محاضر الاجتماعات', 'خطة عمل اللجنة', 'تقارير الأداء');
    }
  }
  
  // مستندات خاصة بالمحور 2
  if (axisOrder === 2) {
    baseDocuments.push('اتفاقيات الشراكة', 'محاضر الاجتماعات المشتركة', 'خطط العمل المشتركة', 'تقارير التنسيق');
  }
  
  // مستندات خاصة بالمحور 3
  if (axisOrder === 3) {
    if (title.includes('معلومات')) {
      baseDocuments.push('سجل البيانات', 'تقارير المعلومات', 'دليل المستخدم', 'إحصائيات الوصول');
    }
    if (title.includes('ملف المدينة')) {
      baseDocuments.push('ملف المدينة المحدث', 'خرائط المدينة', 'إحصائيات ديموغرافية', 'خطط التنمية');
    }
  }
  
  // مستندات خاصة بالمحور 4
  if (axisOrder === 4) {
    if (title.includes('مياه')) {
      baseDocuments.push('تحاليل مياه', 'خرائط الشبكة', 'سجل الاستهلاك', 'تقارير الجودة');
    }
    if (title.includes('نفايات')) {
      baseDocuments.push('خطة إدارة النفايات', 'سجل الجمع', 'تقارير التدوير', 'صور الأماكن');
    }
    if (title.includes('غذاء')) {
      baseDocuments.push('تراخيص المحلات', 'تقارير الفحص', 'سجل المراقبة', 'برامج التوعية');
    }
    if (title.includes('هواء')) {
      baseDocuments.push('تقارير الرصد', 'خرائط التلوث', 'سجل القياسات', 'خطط التحسين');
    }
  }
  
  // مستندات خاصة بالمحور 5
  if (axisOrder === 5) {
    if (title.includes('تطعيم') || title.includes('تحصين')) {
      baseDocuments.push('سجلات التطعيم', 'بطاقات التحصين', 'إحصائيات التغطية', 'تقارير الحملات');
    }
    if (title.includes('رعاية')) {
      baseDocuments.push('سجلات الرعاية', 'بطاقات الأمومة', 'تقارير المتابعة', 'برامج التوعية');
    }
    if (title.includes('أدوية')) {
      baseDocuments.push('سجل المخزون', 'قوائم الأدوية', 'سجل التوزيع', 'تقارير النقص');
    }
    if (title.includes('مرض مزمن')) {
      baseDocuments.push('سجل الحالات', 'خرائط المرضى', 'خطط المتابعة', 'تقارير العلاج');
    }
  }
  
  // مستندات خاصة بالمحور 6
  if (axisOrder === 6) {
    baseDocuments.push('خطة الطوارئ', 'خرائط المخاطر', 'قوائم التجهيزات', 'سجل التدريبات', 'محاضر التنسيق');
  }
  
  // مستندات خاصة بالمحور 7
  if (axisOrder === 7) {
    if (title.includes('مدارس')) {
      baseDocuments.push('سجلات التسجيل', 'إحصائيات التسرب', 'تقارير الأداء', 'محاطر الاجتماعات');
    }
    if (title.includes('محو أمية')) {
      baseDocuments.push('سجل المتعلمين', 'مواد التعليم', 'تقارير التقدم', 'شهادات الإتمام');
    }
  }
  
  // مستندات خاصة بالمحور 8
  if (axisOrder === 8) {
    baseDocuments.push('سجل المتدربين', 'مناهج التدريب', 'شهادات الخبرة', 'تقارير التوظيف', 'قوائم المبدعين');
  }
  
  // مستندات خاصة بالمحور 9
  if (axisOrder === 9) {
    baseDocuments.push('سجل المستفيدين', 'ملفات القروض', 'سجل السداد', 'كشوف الحسابات', 'تقارير الصندوق');
  }
  
  return baseDocuments;
}

/**
 * بناء طرق التحقق المتقدمة
 */
function buildVerificationMethodsForStandard(title, axisOrder) {
  const baseMethods = [
    'مراجعة الوثائق الرسمية',
    'مقابلة المسؤولين',
    'زيارة ميدانية للمواقع',
    'مراجعة سجلات الأداء'
  ];
  
  // طرق تحقق خاصة بكل محور
  if (axisOrder === 1) {
    baseMethods.push('مقابلة الممثلين المجتمعيين', 'مراقبة جلسات العمل');
  }
  if (axisOrder === 2) {
    baseMethods.push('مراجعة اتفاقيات الشراكة', 'مقابلة الشركاء');
  }
  if (axisOrder === 3) {
    baseMethods.push('اختبار نظام المعلومات', 'مراجعة البيانات والإحصائيات');
  }
  if (axisOrder === 4) {
    baseMethods.push('فحص مختبري للعينات', 'قياسات ميدانية');
  }
  if (axisOrder === 5) {
    baseMethods.push('مراجعة السجلات الطبية', 'مقابلة المستفيدين');
  }
  if (axisOrder === 6) {
    baseMethods.push('محاكاة سيناريو الطوارئ', 'فحص التجهيزات');
  }
  if (axisOrder === 7) {
    baseMethods.push('مراجعة سجلات المدارس', 'مقابلة الطلاب وأولياء الأمور');
  }
  if (axisOrder === 8) {
    baseMethods.push('تقييم مهارات المتدربين', 'متابعة الخريجين');
  }
  if (axisOrder === 9) {
    baseMethods.push('مراجعة السجلات المالية', 'مقابلة المستفيدين من القروض');
  }
  
  return baseMethods;
}

// ===== التصدير =====

export {
  VERIFICATION_KPI,
  COVERAGE_KPI,
  QUALITY_KPI,
  SUSTAINABILITY_KPI,
  PARTICIPATION_KPI,
  TIMELINESS_KPI,
  buildAdvancedKpisForStandard,
  buildRequiredDocumentsForStandard,
  buildVerificationMethodsForStandard
};
