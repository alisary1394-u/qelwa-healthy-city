/**
 * معايير المدن الصحية من ملف Healthy_Cities_Criteria.csv
 * 12 محوراً، 80 معياراً، مع مؤشرات أداء لكل معيار ولكل محور.
 */

/** توزيع المعايير على المحاور الـ 12 (8+8+8+5+5+10+8+4+4+6+6+8 = 80) */
export const AXIS_COUNTS_CSV = [8, 8, 8, 5, 5, 10, 8, 4, 4, 6, 6, 8];

/** المحاور الـ 12 حسب CSV */
export const AXES_CSV = [
  { name: 'تنظيم المدينة الصحية', description: 'تنظيم المدينة الصحية (معايير 1–8)', order: 1 },
  { name: 'تعبئة المجتمع', description: 'تعبئة المجتمع (معايير 9–16)', order: 2 },
  { name: 'التعاون بين القطاعات', description: 'التعاون بين القطاعات (معايير 17–24)', order: 3 },
  { name: 'القروض الصغيرة', description: 'القروض الصغيرة (معايير 25–29)', order: 4 },
  { name: 'التعليم ومحو الأمية', description: 'التعليم ومحو الأمية (معايير 30–34)', order: 5 },
  { name: 'التنمية الصحية', description: 'التنمية الصحية (معايير 35–44)', order: 6 },
  { name: 'المياه والصرف الصحي والبيئة', description: 'المياه والصرف الصحي والبيئة (معايير 45–52)', order: 7 },
  { name: 'الغذاء والبيئة', description: 'الغذاء والبيئة (معايير 53–56)', order: 8 },
  { name: 'سلامة الأغذية', description: 'سلامة الأغذية (معايير 57–60)', order: 9 },
  { name: 'تخطيط الطوارئ', description: 'تخطيط الطوارئ (معايير 61–66)', order: 10 },
  { name: 'السلامة العامة', description: 'السلامة العامة (معايير 67–72)', order: 11 },
  { name: 'الرصد والتقييم', description: 'الرصد والتقييم (معايير 73–80)', order: 12 },
];

/** أسماء مختصرة للمحاور للعرض في التبويبات */
export const AXIS_SHORT_NAMES_CSV = [
  'تنظيم المدينة الصحية',
  'تعبئة المجتمع',
  'التعاون بين القطاعات',
  'القروض الصغيرة',
  'التعليم ومحو الأمية',
  'التنمية الصحية',
  'المياه والبيئة',
  'الغذاء والبيئة',
  'سلامة الأغذية',
  'تخطيط الطوارئ',
  'السلامة العامة',
  'الرصد والتقييم',
];

const VERIFICATION_KPI = { name: 'مؤشر التحقق', target: 'أدلة متوفرة (+)', unit: 'تحقق' };

/**
 * بناء مؤشرات أداء لكل معيار: مؤشر التحقق + مؤشرات مستخرجة من نص المعيار عند الإمكان.
 */
function buildKpisForStandard(title, globalNum) {
  const kpis = [{ ...VERIFICATION_KPI, description: title }];
  if (/نسبة|تتجاوز|تصل لـ|100%|95%|90%/.test(title)) {
    kpis.push({ name: 'نسبة التحقق', target: 'حسب النص أعلاه', unit: '%', description: title });
  }
  if (/وجود|توفر|توفر نظام|وجود نظام/.test(title)) {
    kpis.push({ name: 'توفر/وجود', target: 'متحقق', unit: '-', description: 'توثيق التوفر أو الوجود' });
  }
  if (/دوري|سنوياً|ربع سنوية/.test(title)) {
    kpis.push({ name: 'الدورية', target: 'منتظم', unit: '-', description: 'انتظام التنفيذ حسب الفترة' });
  }
  return kpis;
}

/**
 * المعايير الـ 80 من CSV مع عنوان، وصف، مستندات مطلوبة، مؤشرات أداء.
 * الرمز: م{رقم المحور}-{رقم المعيار داخل المحور}.
 */
export const STANDARDS_CSV = [
  // المحور 1: تنظيم المدينة الصحية (1–8)
  { title: 'وجود مكتب للمدينة الصحية ومسؤول تنسيق يعمل بدوام كامل', axis_name: 'تنظيم المدينة الصحية', global_num: 1, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'وجود مكتب ومسؤول تنسيق بدوام كامل' }, { name: 'توفر المكتب', target: 'متحقق', unit: '-' }, { name: 'دوام التنسيق', target: 'كامل', unit: '-' }], documents: ['قرار التعيين', 'وصف المكتب'] },
  { title: 'وجود لجنة تنسيق للمدينة الصحية (أعضاء من قطاعات مختلفة)', axis_name: 'تنظيم المدينة الصحية', global_num: 2, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'لجنة تنسيق متعددة القطاعات' }, { name: 'عدد القطاعات الممثلة', target: '3+', unit: 'قطاع' }], documents: ['قرار التشكيل', 'قائمة الأعضاء'] },
  { title: 'عقد اجتماعات دورية للجنة التنسيق (مرة كل شهر على الأقل)', axis_name: 'تنظيم المدينة الصحية', global_num: 3, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'اجتماعات شهرية' }, { name: 'عدد الاجتماعات', target: '12+ سنوياً', unit: 'اجتماع' }], documents: ['محاضر الاجتماعات'] },
  { title: 'تخصيص ميزانية سنوية لتنفيذ أنشطة برنامج المدينة الصحية', axis_name: 'تنظيم المدينة الصحية', global_num: 4, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'ميزانية سنوية معتمدة' }, { name: 'قيمة الميزانية', target: 'معتمدة', unit: '-' }], documents: ['الميزانية المعتمدة'] },
  { title: 'وجود التزام سياسي معلن ودعم من السلطات المحلية (المحافظ/العمدة)', axis_name: 'تنظيم المدينة الصحية', global_num: 5, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'التزام سياسي ودعم محلي' }, { name: 'توثيق الدعم', target: 'متحقق', unit: '-' }], documents: ['خطابات/قرارات الدعم'] },
  { title: 'وجود خطة عمل سنوية معتمدة للمدينة الصحية', axis_name: 'تنظيم المدينة الصحية', global_num: 6, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'خطة عمل سنوية معتمدة' }, { name: 'نسبة تنفيذ الخطة', target: '80%+', unit: '%' }], documents: ['خطة العمل', 'تقارير المتابعة'] },
  { title: 'توفر نظام للتوثيق والتبليغ عن أنشطة البرنامج', axis_name: 'تنظيم المدينة الصحية', global_num: 7, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'نظام توثيق وتبليغ' }, { name: 'انتظام التبليغ', target: 'دوري', unit: '-' }], documents: ['دليل النظام', 'تقارير التبليغ'] },
  { title: 'إشراك القطاع الخاص في دعم مشاريع المدينة الصحية', axis_name: 'تنظيم المدينة الصحية', global_num: 8, axis_order: 1, kpis: [{ ...VERIFICATION_KPI, description: 'شراكات مع القطاع الخاص' }, { name: 'عدد الشراكات', target: '1+', unit: 'شراكة' }], documents: ['اتفاقيات الشراكة'] },
  // المحور 2: تعبئة المجتمع (9–16)
  { title: 'تشكيل لجان تنمية مجتمعية في الأحياء', axis_name: 'تعبئة المجتمع', global_num: 9, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'لجان تنمية في الأحياء' }, { name: 'عدد اللجان', target: 'حسب الأحياء', unit: 'لجنة' }], documents: ['قرارات التشكيل'] },
  { title: 'انتخاب/اختيار متطوعين صحيين ومجتمعيين لكل 50 عائلة', axis_name: 'تعبئة المجتمع', global_num: 10, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'متطوعون لكل 50 عائلة' }, { name: 'نسبة التغطية', target: '100%', unit: '%' }], documents: ['سجل المتطوعين'] },
  { title: 'تدريب المتطوعين على المسح الأساسي وتقييم الاحتياجات', axis_name: 'تعبئة المجتمع', global_num: 11, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'تدريب على المسح وتقييم الاحتياجات' }, { name: 'نسبة المدربين', target: '100%', unit: '%' }], documents: ['سجل التدريب'] },
  { title: 'إشراك المجتمع في تحديد الأولويات ووضع خطط العمل', axis_name: 'تعبئة المجتمع', global_num: 12, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'مشاركة في الأولويات والخطط' }, { name: 'نسبة المشاركة', target: '70%+', unit: '%' }], documents: ['محاضر المشاركة'] },
  { title: 'إجراء المسح الأساسي للعائلات وتحديث البيانات دورياً', axis_name: 'تعبئة المجتمع', global_num: 13, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'مسح أساسي وتحديث دوري' }, { name: 'نسبة التغطية بالمسح', target: '90%+', unit: '%' }], documents: ['تقرير المسح', 'سجل التحديث'] },
  { title: 'توفر مشاريع مجتمعية ممولة ذاتياً أو من خلال شراكات محلية', axis_name: 'تعبئة المجتمع', global_num: 14, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'مشاريع مجتمعية ممولة' }, { name: 'عدد المشاريع', target: '1+', unit: 'مشروع' }], documents: ['قائمة المشاريع'] },
  { title: 'إشراك الفئات المستضعفة في أنشطة تنمية المجتمع', axis_name: 'تعبئة المجتمع', global_num: 15, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'إشراك الفئات المستضعفة' }, { name: 'نسبة الإشراك', target: 'مقيس', unit: '%' }], documents: ['سجل المشاركة'] },
  { title: 'وجود قنوات اتصال فعالة بين المجتمع ولجنة التنسيق', axis_name: 'تعبئة المجتمع', global_num: 16, axis_order: 2, kpis: [{ ...VERIFICATION_KPI, description: 'قنوات اتصال فعالة' }, { name: 'عدد القنوات', target: '2+', unit: '-' }], documents: ['وصف القنوات'] },
  // المحور 3: التعاون بين القطاعات (17–24)
  { title: 'تنسيق البرامج الصحية مع قطاع التعليم (المدارس الصحية)', axis_name: 'التعاون بين القطاعات', global_num: 17, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'تنسيق مع التعليم' }, { name: 'نسبة المدارس المشمولة', target: '80%+', unit: '%' }], documents: ['اتفاقيات التنسيق'] },
  { title: 'التنسيق مع قطاع البلدية (الإصحاح البيئي والمياه)', axis_name: 'التعاون بين القطاعات', global_num: 18, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'تنسيق مع البلدية' }, { name: 'توثيق التنسيق', target: 'متحقق', unit: '-' }], documents: ['محاضر التنسيق'] },
  { title: 'التعاون مع قطاع الرياضة والشباب لتوفير مرافق رياضية', axis_name: 'التعاون بين القطاعات', global_num: 19, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'مرافق رياضية' }, { name: 'عدد المرافق/الاتفاقيات', target: '1+', unit: '-' }], documents: ['اتفاقيات التعاون'] },
  { title: 'العمل المشترك مع قطاع الأمن لتعزيز السلامة العامة', axis_name: 'التعاون بين القطاعات', global_num: 20, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'تعاون أمني للسلامة' }, { name: 'أنشطة مشتركة', target: 'دورية', unit: '-' }], documents: ['تقارير الأنشطة'] },
  { title: 'مشاركة قطاع الزراعة/التجارة في ضمان سلامة الغذاء', axis_name: 'التعاون بين القطاعات', global_num: 21, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'مشاركة في سلامة الغذاء' }, { name: 'نسبة الامتثال', target: '80%+', unit: '%' }], documents: ['تقارير الرصد'] },
  { title: 'تكامل الجهود مع الجمعيات الخيرية والمنظمات غير الحكومية', axis_name: 'التعاون بين القطاعات', global_num: 22, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'تكامل مع الجمعيات والمنظمات' }, { name: 'عدد الشراكات', target: '2+', unit: 'شراكة' }], documents: ['اتفاقيات التكامل'] },
  { title: 'توفير قاعدة بيانات مشتركة بين القطاعات المختلفة', axis_name: 'التعاون بين القطاعات', global_num: 23, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'قاعدة بيانات مشتركة' }, { name: 'تحديث دوري', target: 'نعم', unit: '-' }], documents: ['وصف القاعدة'] },
  { title: 'عقد ورش عمل مشتركة للقطاعات لمناقشة المحددات الاجتماعية للصحة', axis_name: 'التعاون بين القطاعات', global_num: 24, axis_order: 3, kpis: [{ ...VERIFICATION_KPI, description: 'ورش عمل مشتركة' }, { name: 'عدد الورش', target: '2+ سنوياً', unit: 'ورشة' }], documents: ['محاضر الورش'] },
  // المحور 4: القروض الصغيرة (25–29)
  { title: 'وجود نظام للقروض الصغيرة لدعم الأسر الفقيرة', axis_name: 'القروض الصغيرة', global_num: 25, axis_order: 4, kpis: [{ ...VERIFICATION_KPI, description: 'نظام قروض صغيرة' }, { name: 'عدد المستفيدين', target: '-', unit: 'أسرة' }], documents: ['نظام القروض'] },
  { title: 'استهداف النساء والشباب في مشاريع توليد الدخل', axis_name: 'القروض الصغيرة', global_num: 26, axis_order: 4, kpis: [{ ...VERIFICATION_KPI, description: 'استهداف نساء وشباب' }, { name: 'نسبة الاستهداف', target: '50%+', unit: '%' }], documents: ['سجل المستفيدين'] },
  { title: 'توفير تدريب مهني للمستفيدين من القروض', axis_name: 'القروض الصغيرة', global_num: 27, axis_order: 4, kpis: [{ ...VERIFICATION_KPI, description: 'تدريب مهني للمستفيدين' }, { name: 'نسبة المستفيدين المدربين', target: '80%+', unit: '%' }], documents: ['سجل التدريب'] },
  { title: 'نسبة استرداد القروض تتجاوز 90%', axis_name: 'القروض الصغيرة', global_num: 28, axis_order: 4, kpis: [{ ...VERIFICATION_KPI, description: 'استرداد القروض' }, { name: 'نسبة الاسترداد', target: '90%+', unit: '%' }], documents: ['تقارير السداد'] },
  { title: 'استخدام أرباح القروض في مشاريع تنموية مجتمعية', axis_name: 'القروض الصغيرة', global_num: 29, axis_order: 4, kpis: [{ ...VERIFICATION_KPI, description: 'أرباح للمشاريع المجتمعية' }, { name: 'نسبة الإعادة للتنمية', target: '5–10%', unit: '%' }], documents: ['سجل الاستخدام'] },
  // المحور 5: التعليم ومحو الأمية (30–34)
  { title: 'نسبة التحاق الأطفال بالتعليم الابتدائي (بنين وبنات) تصل لـ 100%', axis_name: 'التعليم ومحو الأمية', global_num: 30, axis_order: 5, kpis: [{ ...VERIFICATION_KPI, description: 'الالتحاق بالتعليم الابتدائي' }, { name: 'نسبة الالتحاق', target: '100%', unit: '%' }], documents: ['إحصائيات الالتحاق'] },
  { title: 'تنفيذ برامج لمحو أمية الكبار (خاصة النساء)', axis_name: 'التعليم ومحو الأمية', global_num: 31, axis_order: 5, kpis: [{ ...VERIFICATION_KPI, description: 'برامج محو أمية الكبار' }, { name: 'عدد المستفيدين', target: '-', unit: 'شخص' }], documents: ['تقارير البرامج'] },
  { title: 'توفر بيئة مدرسية صحية (مياه شرب آمنة وصرف صحي)', axis_name: 'التعليم ومحو الأمية', global_num: 32, axis_order: 5, kpis: [{ ...VERIFICATION_KPI, description: 'بيئة مدرسية صحية' }, { name: 'نسبة المدارس المطابقة', target: '90%+', unit: '%' }], documents: ['تقارير التقييم'] },
  { title: 'إدراج المفاهيم الصحية والبيئية في الأنشطة اللامنهجية', axis_name: 'التعليم ومحو الأمية', global_num: 33, axis_order: 5, kpis: [{ ...VERIFICATION_KPI, description: 'مفاهيم صحية وبيئية في الأنشطة' }, { name: 'عدد الأنشطة', target: '4+ سنوياً', unit: 'نشاط' }], documents: ['خطة الأنشطة'] },
  { title: 'متابعة المتسربين من التعليم وإعادتهم للمدارس', axis_name: 'التعليم ومحو الأمية', global_num: 34, axis_order: 5, kpis: [{ ...VERIFICATION_KPI, description: 'متابعة المتسربين وإعادتهم' }, { name: 'نسبة التسرب', target: 'صفر أو متناقص', unit: '%' }], documents: ['سجل المتابعة'] },
  // المحور 6: التنمية الصحية (35–44)
  { title: 'نسبة التغطية بالتحصينات الأساسية للأطفال تتجاوز 95%', axis_name: 'التنمية الصحية', global_num: 35, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'تغطية التحصينات' }, { name: 'نسبة التغطية', target: '95%+', unit: '%' }], documents: ['سجل التحصين'] },
  { title: 'توفر رعاية ما قبل الولادة لجميع الحوامل', axis_name: 'التنمية الصحية', global_num: 36, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'رعاية ما قبل الولادة' }, { name: 'نسبة الحوامل المستفيدات', target: '90%+', unit: '%' }], documents: ['سجل الرعاية'] },
  { title: 'وجود نظام لمتابعة نمو الأطفال وحالات سوء التغذية', axis_name: 'التنمية الصحية', global_num: 37, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'نظام متابعة النمو وسوء التغذية' }, { name: 'نسبة التغطية', target: '80%+', unit: '%' }], documents: ['تقارير المتابعة'] },
  { title: 'تشجيع الرضاعة الطبيعية الخالصة لمدة 6 أشهر', axis_name: 'التنمية الصحية', global_num: 38, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'الرضاعة الطبيعية 6 أشهر' }, { name: 'نسبة الامتثال', target: '60%+', unit: '%' }], documents: ['تقارير التوعية'] },
  { title: 'توفر خدمات تنظيم الأسرة والمشورة الصحية', axis_name: 'التنمية الصحية', global_num: 39, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'تنظيم أسرة ومشورة صحية' }, { name: 'توفر الخدمات', target: 'متحقق', unit: '-' }], documents: ['قائمة الخدمات'] },
  { title: 'مكافحة التدخين في الأماكن العامة والمرافق الحكومية', axis_name: 'التنمية الصحية', global_num: 40, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'مكافحة التدخين' }, { name: 'نسبة الامتثال', target: '90%+', unit: '%' }], documents: ['نظام الحظر', 'تقارير الرصد'] },
  { title: 'تنفيذ برامج للتوعية بالأمراض غير السارية (السكري، الضغط)', axis_name: 'التنمية الصحية', global_num: 41, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'توعية بالأمراض غير السارية' }, { name: 'عدد البرامج', target: '2+ سنوياً', unit: 'برنامج' }], documents: ['خطة البرامج'] },
  { title: 'توفر خدمات الصحة النفسية على مستوى المجتمع', axis_name: 'التنمية الصحية', global_num: 42, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'خدمات الصحة النفسية' }, { name: 'توفر الخدمة', target: 'متحقق', unit: '-' }], documents: ['وصف الخدمات'] },
  { title: 'مكافحة الأمراض المعدية وتفعيل نظام الترصد الوبائي', axis_name: 'التنمية الصحية', global_num: 43, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'ترصد وبائي ومكافحة معدية' }, { name: 'انتظام التبليغ', target: 'دوري', unit: '-' }], documents: ['تقارير الترصد'] },
  { title: 'دعم حقوق الأشخاص ذوي الإعاقة ودمجهم مجتمعياً', axis_name: 'التنمية الصحية', global_num: 44, axis_order: 6, kpis: [{ ...VERIFICATION_KPI, description: 'دعم ذوي الإعاقة والدمج' }, { name: 'نسبة المستفيدين', target: 'مقيس', unit: '%' }], documents: ['برامج الدعم'] },
  // المحور 7: المياه والصرف الصحي والبيئة (45–52)
  { title: 'وصول المياه الصالحة للشرب لجميع المنازل', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 45, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'مياه شرب لجميع المنازل' }, { name: 'نسبة التغطية', target: '90%+', unit: '%' }], documents: ['تقارير التغطية'] },
  { title: 'توفر نظام آمن للتخلص من الفضلات البشرية (صرف صحي)', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 46, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'صرف صحي آمن' }, { name: 'نسبة التغطية', target: '90%+', unit: '%' }], documents: ['خرائط الصرف'] },
  { title: 'وجود نظام دوري لجمع ومعالجة النفايات الصلبة', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 47, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'جمع ومعالجة النفايات' }, { name: 'نسبة المعالجة', target: '80%+', unit: '%' }], documents: ['تقارير المعالجة'] },
  { title: 'مكافحة الحشرات والقوارض في الأحياء السكنية', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 48, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'مكافحة حشرات وقوارض' }, { name: 'دورية الحملات', target: 'منتظم', unit: '-' }], documents: ['سجل الحملات'] },
  { title: 'زيادة المساحات الخضراء والحدائق العامة', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 49, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'مساحات خضراء وحدائق' }, { name: 'نسبة المساحات', target: 'ضمن المعايير', unit: '%' }], documents: ['خرائط المساحات'] },
  { title: 'مراقبة جودة الهواء وتقليل التلوث الصناعي', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 50, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'جودة الهواء وتقليل التلوث' }, { name: 'دورية الرصد', target: 'منتظم', unit: '-' }], documents: ['تقارير جودة الهواء'] },
  { title: 'حماية مصادر المياه من التلوث', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 51, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'حماية مصادر المياه' }, { name: 'توثيق الحماية', target: 'متحقق', unit: '-' }], documents: ['خطة الحماية'] },
  { title: 'نظافة الشوارع والأسواق العامة', axis_name: 'المياه والصرف الصحي والبيئة', global_num: 52, axis_order: 7, kpis: [{ ...VERIFICATION_KPI, description: 'نظافة الشوارع والأسواق' }, { name: 'مؤشر النظافة', target: 'مقبول+', unit: '-' }], documents: ['تقارير النظافة'] },
  // المحور 8: الغذاء والبيئة (53–56)
  { title: 'تطبيق معايير السلامة الصحية في المطاعم والمنشآت الغذائية', axis_name: 'الغذاء والبيئة', global_num: 53, axis_order: 8, kpis: [{ ...VERIFICATION_KPI, description: 'سلامة المطاعم والمنشآت' }, { name: 'نسبة الامتثال', target: '80%+', unit: '%' }], documents: ['تقارير التفتيش'] },
  { title: 'توفر أغذية صحية وبأسعار معقولة في الأسواق', axis_name: 'الغذاء والبيئة', global_num: 54, axis_order: 8, kpis: [{ ...VERIFICATION_KPI, description: 'أغذية صحية وأسعار معقولة' }, { name: 'توفر المنتجات', target: 'مقيس', unit: '-' }], documents: ['مسوحات الأسواق'] },
  { title: 'مراقبة متبقيات المبيدات في الخضروات والفواكه', axis_name: 'الغذاء والبيئة', global_num: 55, axis_order: 8, kpis: [{ ...VERIFICATION_KPI, description: 'مراقبة متبقيات المبيدات' }, { name: 'دورية الفحوص', target: 'دوري', unit: '-' }], documents: ['تقارير المختبر'] },
  { title: 'تنفيذ برامج توعوية حول العادات الغذائية الصحية', axis_name: 'الغذاء والبيئة', global_num: 56, axis_order: 8, kpis: [{ ...VERIFICATION_KPI, description: 'توعية بالعادات الغذائية' }, { name: 'عدد البرامج', target: '2+ سنوياً', unit: 'برنامج' }], documents: ['خطة التوعية'] },
  // المحور 9: سلامة الأغذية (57–60)
  { title: 'وجود نظام للتفتيش الدوري على المحلات التجارية والمسالخ', axis_name: 'سلامة الأغذية', global_num: 57, axis_order: 9, kpis: [{ ...VERIFICATION_KPI, description: 'تفتيش دوري على المحلات والمسالخ' }, { name: 'دورية التفتيش', target: 'منتظم', unit: '-' }], documents: ['سجل التفتيش'] },
  { title: 'تدريب متداولي الأغذية على أسس النظافة الشخصية', axis_name: 'سلامة الأغذية', global_num: 58, axis_order: 9, kpis: [{ ...VERIFICATION_KPI, description: 'تدريب متداولي الأغذية' }, { name: 'نسبة المدربين', target: '80%+', unit: '%' }], documents: ['سجل التدريب'] },
  { title: 'التخلص السليم من الأغذية المنتهية الصلاحية أو التالفة', axis_name: 'سلامة الأغذية', global_num: 59, axis_order: 9, kpis: [{ ...VERIFICATION_KPI, description: 'التخلص السليم من الأغذية التالفة' }, { name: 'توثيق الإجراء', target: 'متحقق', unit: '-' }], documents: ['بروتوكول التخلص'] },
  { title: 'إجراء فحوصات مخبرية دورية لعينات الغذاء', axis_name: 'سلامة الأغذية', global_num: 60, axis_order: 9, kpis: [{ ...VERIFICATION_KPI, description: 'فحوصات مخبرية دورية' }, { name: 'عدد العينات', target: 'دوري', unit: '-' }], documents: ['تقارير المختبر'] },
  // المحور 10: تخطيط الطوارئ (61–66)
  { title: 'وجود خطة محلية للاستعداد للطوارئ والكوارث', axis_name: 'تخطيط الطوارئ', global_num: 61, axis_order: 10, kpis: [{ ...VERIFICATION_KPI, description: 'خطة استعداد للطوارئ' }, { name: 'تحديث الخطة', target: 'سنوي', unit: '-' }], documents: ['خطة الطوارئ'] },
  { title: 'تدريب المتطوعين على الإسعافات الأولية والإنقاذ', axis_name: 'تخطيط الطوارئ', global_num: 62, axis_order: 10, kpis: [{ ...VERIFICATION_KPI, description: 'تدريب إسعافات أولية وإنقاذ' }, { name: 'نسبة المدربين', target: '100%', unit: '%' }], documents: ['سجل التدريب'] },
  { title: 'تحديد مناطق الإيواء والمجموعات الأكثر عرضة للخطر', axis_name: 'تخطيط الطوارئ', global_num: 63, axis_order: 10, kpis: [{ ...VERIFICATION_KPI, description: 'مناطق إيواء ومجموعات معرضة' }, { name: 'توثيق التحديد', target: 'محدث', unit: '-' }], documents: ['خرائط الإيواء'] },
  { title: 'توفر نظام للإنذار المبكر في حالات الكوارث الطبيعية', axis_name: 'تخطيط الطوارئ', global_num: 64, axis_order: 10, kpis: [{ ...VERIFICATION_KPI, description: 'نظام إنذار مبكر' }, { name: 'فعالية النظام', target: 'مختبر', unit: '-' }], documents: ['وصف النظام'] },
  { title: 'توفير مخزون احتياطي من الأدوية والمستلزمات الطبية للطوارئ', axis_name: 'تخطيط الطوارئ', global_num: 65, axis_order: 10, kpis: [{ ...VERIFICATION_KPI, description: 'مخزون طوارئ أدوية ومستلزمات' }, { name: 'حد أدنى للمخزون', target: 'معتمد', unit: '-' }], documents: ['سجل المخزون'] },
  { title: 'إجراء تمارين محاكاة دورية لخطط الطوارئ', axis_name: 'تخطيط الطوارئ', global_num: 66, axis_order: 10, kpis: [{ ...VERIFICATION_KPI, description: 'تمارين محاكاة دورية' }, { name: 'عدد التمارين', target: '2+ سنوياً', unit: 'تمرين' }], documents: ['تقارير التمارين'] },
  // المحور 11: السلامة العامة (67–72)
  { title: 'توفير إضاءة كافية في الشوارع والأماكن العامة', axis_name: 'السلامة العامة', global_num: 67, axis_order: 11, kpis: [{ ...VERIFICATION_KPI, description: 'إضاءة كافية' }, { name: 'نسبة التغطية', target: '90%+', unit: '%' }], documents: ['تقارير الصيانة'] },
  { title: 'صيانة الطرق وتوفير ممرات آمنة للمشاة', axis_name: 'السلامة العامة', global_num: 68, axis_order: 11, kpis: [{ ...VERIFICATION_KPI, description: 'طرق وممرات آمنة' }, { name: 'نسبة الصيانة', target: 'دوري', unit: '-' }], documents: ['سجل الصيانة'] },
  { title: 'تطبيق معايير السلامة المرورية للحد من الحوادث', axis_name: 'السلامة العامة', global_num: 69, axis_order: 11, kpis: [{ ...VERIFICATION_KPI, description: 'سلامة مرورية' }, { name: 'انخفاض الحوادث', target: '10%+', unit: '%' }], documents: ['تقارير الحوادث'] },
  { title: 'توفر مراكز للدفاع المدني والإطفاء وسهولة وصولها', axis_name: 'السلامة العامة', global_num: 70, axis_order: 11, kpis: [{ ...VERIFICATION_KPI, description: 'مراكز دفاع مدني وإطفاء' }, { name: 'وقت الوصول', target: 'ضمن المعايير', unit: '-' }], documents: ['خريطة المراكز'] },
  { title: 'خفض معدلات الجريمة والعنف من خلال التوعية الأمنية', axis_name: 'السلامة العامة', global_num: 71, axis_order: 11, kpis: [{ ...VERIFICATION_KPI, description: 'توعية أمنية لخفض الجريمة' }, { name: 'مؤشر الأمان', target: 'تحسن', unit: '-' }], documents: ['تقارير الأمان'] },
  { title: 'توفير بيئة آمنة للأطفال في الملاعب والحدائق', axis_name: 'السلامة العامة', global_num: 72, axis_order: 11, kpis: [{ ...VERIFICATION_KPI, description: 'بيئة آمنة للأطفال' }, { name: 'نسبة المواقع المطابقة', target: '90%+', unit: '%' }], documents: ['تقارير التقييم'] },
  // المحور 12: الرصد والتقييم (73–80)
  { title: 'وجود مؤشرات أداء واضحة لقياس تقدم البرنامج', axis_name: 'الرصد والتقييم', global_num: 73, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'مؤشرات أداء واضحة' }, { name: 'عدد المؤشرات', target: 'محدد', unit: '-' }], documents: ['قائمة المؤشرات'] },
  { title: 'إعداد تقارير دورية (ربع سنوية/سنوية) عن الإنجازات', axis_name: 'الرصد والتقييم', global_num: 74, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'تقارير دورية' }, { name: 'انتظام التقارير', target: 'ربع سنوي/سنوي', unit: '-' }], documents: ['التقارير'] },
  { title: 'إجراء تقييم ذاتي للمدينة باستخدام قائمة المعايير (80 معيار)', axis_name: 'الرصد والتقييم', global_num: 75, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'تقييم ذاتي بالمعايير الـ 80' }, { name: 'نسبة التحقق', target: 'مقيس', unit: '%' }], documents: ['تقرير التقييم'] },
  { title: 'توفر خرائط صحية للمدينة توضح توزيع الخدمات والفجوات', axis_name: 'الرصد والتقييم', global_num: 76, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'خرائط صحية' }, { name: 'تحديث الخرائط', target: 'دوري', unit: '-' }], documents: ['الخرائط'] },
  { title: 'مشاركة المجتمع في عملية رصد ومراقبة الخدمات', axis_name: 'الرصد والتقييم', global_num: 77, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'مشاركة المجتمع في الرصد' }, { name: 'نسبة المشاركة', target: '70%+', unit: '%' }], documents: ['سجل المشاركة'] },
  { title: 'استخدام نتائج التقييم في تعديل خطط العمل المستقبلية', axis_name: 'الرصد والتقييم', global_num: 78, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'استخدام التقييم في الخطط' }, { name: 'عدد التعديلات', target: 'سنوي', unit: '-' }], documents: ['محاضر التعديل'] },
  { title: 'تبادل الخبرات مع المدن الصحية الأخرى في الشبكة الوطنية', axis_name: 'الرصد والتقييم', global_num: 79, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'تبادل خبرات مع المدن الأخرى' }, { name: 'عدد الفعاليات', target: '2+ سنوياً', unit: 'فعالية' }], documents: ['سجل التبادل'] },
  { title: 'توثيق قصص النجاح والمبادرات المبتكرة ونشرها', axis_name: 'الرصد والتقييم', global_num: 80, axis_order: 12, kpis: [{ ...VERIFICATION_KPI, description: 'توثيق قصص النجاح والمبادرات' }, { name: 'عدد القصص/المبادرات', target: '2+ سنوياً', unit: '-' }], documents: ['المنشورات'] },
];

/** مؤشر توثيق النتيجة (موحد لجميع المحاور) */
const DOCUMENTATION_KPI = { name: 'توثيق النتيجة', target: 'تسجيل (+) أو (-) لكل معيار', unit: '-', description: 'أدلة متوفرة (+) أو أدلة غير متوفرة (-)' };

/** مؤشرات أداء على مستوى كل محور (لصفحة المعايير وجدول النتيجة والتقارير) — من ملف Healthy_Cities_Criteria.csv */
export const AXIS_KPIS_CSV = [
  { axis_order: 1, axis_name: 'تنظيم المدينة الصحية', axis_standards_count: 8, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 8' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '6 معايير على الأقل من 8', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: انتظام الاجتماعات والميزانية', target: 'اجتماعات شهرية وميزانية معتمدة', unit: '-' }] },
  { axis_order: 2, axis_name: 'تعبئة المجتمع', axis_standards_count: 8, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 8' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '6 معايير على الأقل من 8', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: تغطية المسح والمتطوعين', target: 'مسح 90%+ ومتطوعون لكل 50 عائلة', unit: '%' }] },
  { axis_order: 3, axis_name: 'التعاون بين القطاعات', axis_standards_count: 8, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 8' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '6 معايير على الأقل من 8', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: عدد الشراكات والورش المشتركة', target: 'شراكات 2+ وورش 2+ سنوياً', unit: '-' }] },
  { axis_order: 4, axis_name: 'القروض الصغيرة', axis_standards_count: 5, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 5' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '4 معايير على الأقل من 5', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: نسبة استرداد القروض', target: '90%+', unit: '%' }] },
  { axis_order: 5, axis_name: 'التعليم ومحو الأمية', axis_standards_count: 5, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 5' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '4 معايير على الأقل من 5', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: الالتحاق ومحو الأمية', target: 'الالتحاق 100% وتقليل التسرب', unit: '%' }] },
  { axis_order: 6, axis_name: 'التنمية الصحية', axis_standards_count: 10, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 10' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '8 معايير على الأقل من 10', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: التغطية بالتحصين والرعاية', target: 'تحصين 95%+ ورعاية حوامل 90%+', unit: '%' }] },
  { axis_order: 7, axis_name: 'المياه والصرف الصحي والبيئة', axis_standards_count: 8, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 8' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '6 معايير على الأقل من 8', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: تغطية المياه والنظافة', target: 'مياه 90%+ ونظافة مقبولة', unit: '%' }] },
  { axis_order: 8, axis_name: 'الغذاء والبيئة', axis_standards_count: 4, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 4' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '3 معايير على الأقل من 4', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: سلامة المنشآت الغذائية', target: 'امتثال 80%+', unit: '%' }] },
  { axis_order: 9, axis_name: 'سلامة الأغذية', axis_standards_count: 4, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 4' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '3 معايير على الأقل من 4', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: التفتيش والفحوص المخبرية', target: 'تفتيش وفحوص دورية', unit: '-' }] },
  { axis_order: 10, axis_name: 'تخطيط الطوارئ', axis_standards_count: 6, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 6' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '5 معايير على الأقل من 6', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: جاهزية الخطة والتمارين', target: 'خطة محدثة وتمارين 2+ سنوياً', unit: '-' }] },
  { axis_order: 11, axis_name: 'السلامة العامة', axis_standards_count: 6, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 6' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '5 معايير على الأقل من 6', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: الإضاءة والطرق والأمان', target: 'تغطية 90%+ وتحسن مؤشر الأمان', unit: '%' }] },
  { axis_order: 12, axis_name: 'الرصد والتقييم', axis_standards_count: 8, kpis: [{ name: 'نسبة المعايير المحققة في المحور (أدلة متوفرة)', target: '80% أو أكثر', unit: '%', description: 'عدد المعايير التي وُجدت لها أدلة ÷ 8' }, { ...DOCUMENTATION_KPI }, { name: 'عدد المعايير ذات الأدلة المتوفرة', target: '6 معايير على الأقل من 8', unit: 'معيار', description: 'حد التحقق: 80% من معايير المحور' }, { name: 'مؤشر أداء: تقارير دورية وتقييم ذاتي', target: 'تقارير ربع سنوية وتقييم سنوي', unit: '-' }] },
];

/** مؤشر التصنيف الإجمالي (للعرض في صفحة المعايير) */
export const OVERALL_CLASSIFICATION_KPI = {
  name: 'تصنيف المدينة الصحية',
  target: '80% من المعايير محققة على الأقل',
  unit: 'تحقق',
  description: 'يُحسب حسب نسبة المعايير التي وُجدت لها أدلة من إجمالي 80 معياراً.',
};

/**
 * استنتاج رقم المحور (1–12) من فهرس المعيار (0–79) حسب CSV.
 */
export function getAxisOrderFromStandardIndexCsv(index) {
  if (index < 0 || index >= 80) return 1;
  let sum = 0;
  for (let a = 0; a < AXIS_COUNTS_CSV.length; a++) {
    if (index < sum + AXIS_COUNTS_CSV[a]) return a + 1;
    sum += AXIS_COUNTS_CSV[a];
  }
  return 12;
}
