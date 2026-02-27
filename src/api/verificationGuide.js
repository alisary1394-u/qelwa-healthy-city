/**
 * الدليل الشامل لطرق التحقق والمستندات المطلوبة
 * إرشادات تفصيلية لكل معيار ومحور
 */

// ===== أنواع المستندات القياسية =====

const DOCUMENT_TYPES = {
  PLANNING: 'التخطيط',
  TRAINING: 'التدريب',
  MONITORING: 'الرصد والمتابعة',
  FINANCIAL: 'مالي',
  TECHNICAL: 'فني',
  LEGAL: 'قانوني',
  COMMUNITY: 'مجتمعي',
  HEALTH: 'صحي',
  EDUCATION: 'تعليم',
  ENVIRONMENT: 'بيئي',
  EMERGENCY: 'طوارئ'
};

// ===== طرق التحقق القياسية =====

const VERIFICATION_METHODS = {
  DOCUMENT_REVIEW: 'مراجعة الوثائق',
  INTERVIEW: 'مقابلة',
  SITE_VISIT: 'زيارة ميدانية',
  OBSERVATION: 'ملاحظة مباشرة',
  SURVEY: 'استبيان',
  LAB_TEST: 'فحص مختبري',
  MEASUREMENT: 'قياس',
  SIMULATION: 'محاكاة',
  DATA_ANALYSIS: 'تحليل البيانات',
  FOCUS_GROUP: 'مجموعة تركيز'
};

// ===== دليل المستندات المطلوبة لكل محور =====

/**
 * المحور 1: تنظيم المجتمع وتعبئته
 */
const AXIS_1_DOCUMENTS_GUIDE = {
  'م1-1': {
    title: 'تدريب المجموعات على التقييم والتخطيط',
    required_documents: [
      {
        name: 'خطة التدريب',
        type: DOCUMENT_TYPES.PLANNING,
        description: 'خطة مفصلة لبرنامج التدريب',
        frequency: 'سنوي',
        responsible: 'منسق البرنامج',
        format: 'PDF',
        retention: '5 سنوات'
      },
      {
        name: 'مواد التدريب',
        type: DOCUMENT_TYPES.TRAINING,
        description: 'جميع المواد المستخدمة في التدريب',
        frequency: 'حسب الحاجة',
        responsible: 'مدربون',
        format: 'PDF/Word/PowerPoint',
        retention: '3 سنوات'
      },
      {
        name: 'قوائم الحضور',
        type: DOCUMENT_TYPES.COMMUNITY,
        description: 'سجل حضور جميع المشاركين',
        frequency: 'لكل جلسة',
        responsible: 'منسق التدريب',
        format: 'Excel/Word',
        retention: '3 سنوات'
      },
      {
        name: 'تقييم ما بعد التدريب',
        type: DOCUMENT_TYPES.MONITORING,
        description: 'استبيانات تقييم فعالية التدريب',
        frequency: 'بعد كل دورة',
        responsible: 'منسق التقييم',
        format: 'Excel/PDF',
        retention: '3 سنوات'
      },
      {
        name: 'شهادات المشاركة',
        type: DOCUMENT_TYPES.TRAINING,
        description: 'شهادات إثبات المشاركة في التدريب',
        frequency: 'بعد كل دورة',
        responsible: 'منسق البرنامج',
        format: 'PDF',
        retention: 'دائم'
      }
    ],
    verification_methods: [
      {
        method: VERIFICATION_METHODS.DOCUMENT_REVIEW,
        description: 'مراجعة جميع وثائق التدريب',
        frequency: 'ربع سنوي',
        responsible: 'لجنة الرقابة'
      },
      {
        method: VERIFICATION_METHODS.INTERVIEW,
        description: 'مقابلة عينة من المشاركين',
        sample_size: '20% من المشاركين',
        responsible: 'فريق التقييم'
      },
      {
        method: VERIFICATION_METHODS.OBSERVATION,
        description: 'ملاحظة جلسة تدريب حية',
        frequency: 'سنوي',
        responsible: 'مشرف التدريب'
      }
    ]
  },
  
  'م1-2': {
    title: 'لجنة تنسيق أعمال المدينة الصحية',
    required_documents: [
      {
        name: 'قرار تشكيل اللجنة',
        type: DOCUMENT_TYPES.LEGAL,
        description: 'الوثيقة الرسمية لتشكيل اللجنة',
        frequency: 'مرة واحدة',
        responsible: 'السلطة المحلية',
        format: 'PDF',
        retention: 'دائم'
      },
      {
        name: 'نظام داخلي للجنة',
        type: DOCUMENT_TYPES.LEGAL,
        description: 'القواعد والإجراءات الداخلية',
        frequency: 'حسب الحاجة',
        responsible: 'رئيس اللجنة',
        format: 'PDF',
        retention: 'دائم'
      },
      {
        name: 'محاضر الاجتماعات',
        type: DOCUMENT_TYPES.COMMUNITY,
        description: 'سجل جميع اجتماعات اللجنة',
        frequency: 'شهري',
        responsible: 'سكرتير اللجنة',
        format: 'Word/PDF',
        retention: '5 سنوات'
      },
      {
        name: 'خطة عمل اللجنة',
        type: DOCUMENT_TYPES.PLANNING,
        description: 'خطة العمل السنوية للجنة',
        frequency: 'سنوي',
        responsible: 'رئيس اللجنة',
        format: 'PDF',
        retention: '3 سنوات'
      },
      {
        name: 'تقارير الأداء',
        type: DOCUMENT_TYPES.MONITORING,
        description: 'تقارير ربع سنوية عن أداء اللجنة',
        frequency: 'ربع سنوي',
        responsible: 'منسق اللجنة',
        format: 'PDF',
        retention: '3 سنوات'
      }
    ],
    verification_methods: [
      {
        method: VERIFICATION_METHODS.DOCUMENT_REVIEW,
        description: 'مراجعة جميع وثائق اللجنة',
        frequency: 'ربع سنوي',
        responsible: 'لجنة الرقابة'
      },
      {
        method: VERIFICATION_METHODS.INTERVIEW,
        description: 'مقابلة أعضاء اللجنة',
        sample_size: 'جميع الأعضاء',
        responsible: 'فريق التقييم'
      },
      {
        method: VERIFICATION_METHODS.OBSERVATION,
        description: 'حضور اجتماع اللجنة',
        frequency: 'سنوي',
        responsible: 'مراقب خارجي'
      }
    ]
  }
};

/**
 * المحور 4: المياه والصرف الصحي والغذاء والهواء
 */
const AXIS_4_DOCUMENTS_GUIDE = {
  'م4-1': {
    title: 'موقع نظيف ومساحات خضراء',
    required_documents: [
      {
        name: 'تقييم بيئي للموقع',
        type: DOCUMENT_TYPES.ENVIRONMENT,
        description: 'تقرير تقييم الحالة البيئية',
        frequency: 'سنوي',
        responsible: 'خبير بيئي',
        format: 'PDF',
        retention: '5 سنوات'
      },
      {
        name: 'خرائط المساحات الخضراء',
        type: DOCUMENT_TYPES.TECHNICAL,
        description: 'خرائط تفصيلية للمساحات الخضراء',
        frequency: 'سنتوي',
        responsible: 'مهندس تخطيط',
        format: 'CAD/PDF',
        retention: '5 سنوات'
      },
      {
        name: 'صور الموقع',
        type: DOCUMENT_TYPES.TECHNICAL,
        description: 'صور حديثة للموقع من زوايا مختلفة',
        frequency: 'ربع سنوي',
        responsible: 'فريق التوثيق',
        format: 'JPEG/PDF',
        retention: '3 سنوات'
      },
      {
        name: 'سجل الصيانة',
        type: DOCUMENT_TYPES.MONITORING,
        description: 'سجل صيانة المساحات الخضراء',
        frequency: 'شهري',
        responsible: 'مسؤول الصيانة',
        format: 'Excel',
        retention: '3 سنوات'
      }
    ],
    verification_methods: [
      {
        method: VERIFICATION_METHODS.SITE_VISIT,
        description: 'زيارة ميدانية للموقع',
        frequency: 'ربع سنوي',
        responsible: 'فريق التقييم'
      },
      {
        method: VERIFICATION_METHODS.MEASUREMENT,
        description: 'قياس المساحات الخضراء',
        tools: 'GPS، أدوات القياس',
        responsible: 'فني مساحة'
      },
      {
        method: VERIFICATION_METHODS.PHOTOGRAPHIC_EVIDENCE,
        description: 'توثيق صوري للموقع',
        frequency: 'ربع سنوي',
        responsible: 'فريق التوثيق'
      }
    ]
  },
  
  'م4-4': {
    title: 'مياه شرب آمنة وصرف صحي',
    required_documents: [
      {
        name: 'تحاليل مياه',
        type: DOCUMENT_TYPES.HEALTH,
        description: 'نتائج تحاليل مياه الشرب',
        frequency: 'شهري',
        responsible: 'مختبر معتمد',
        format: 'PDF',
        retention: '3 سنوات'
      },
      {
        name: 'خرائط شبكة المياه',
        type: DOCUMENT_TYPES.TECHNICAL,
        description: 'خرائط تفصيلية لشبكة المياه',
        frequency: 'سنتوي',
        responsible: 'مهندس مياه',
        format: 'CAD/PDF',
        retention: '5 سنوات'
      },
      {
        name: 'سجل استهلاك المياه',
        type: DOCUMENT_TYPES.MONITORING,
        description: 'سجل استهلاك المياه لكل منطقة',
        frequency: 'شهري',
        responsible: 'مسؤول المياه',
        format: 'Excel',
        retention: '3 سنوات'
      },
      {
        name: 'تقارير جودة المياه',
        type: DOCUMENT_TYPES.HEALTH,
        description: 'تقارير ربع سنوية عن جودة المياه',
        frequency: 'ربع سنوي',
        responsible: 'إدارة المياه',
        format: 'PDF',
        retention: '3 سنوات'
      }
    ],
    verification_methods: [
      {
        method: VERIFICATION_METHODS.LAB_TEST,
        description: 'أخذ عينات مياه للتحليل',
        frequency: 'شهري',
        responsible: 'فني مختبر'
      },
      {
        method: VERIFICATION_METHODS.SITE_VISIT,
        description: 'زيارة محطات معالجة المياه',
        frequency: 'شهري',
        responsible: 'مفتش صحة'
      },
      {
        method: VERIFICATION_METHODS.SURVEY,
        description: 'استبيان رضا المستخدمين',
        sample_size: '100 أسرة',
        responsible: 'فريق البحث'
      }
    ]
  }
};

/**
 * المحور 5: التنمية الصحية
 */
const AXIS_5_DOCUMENTS_GUIDE = {
  'م5-10': {
    title: 'رعاية الأمهات قبل الولادة',
    required_documents: [
      {
        name: 'سجلات رعاية الأمهات',
        type: DOCUMENT_TYPES.HEALTH,
        description: 'سجل متابعة الحوامل',
        frequency: 'مستمر',
        responsible: 'مراكز الرعاية الصحية',
        format: 'سجل ورقي/إلكتروني',
        retention: '25 سنة'
      },
      {
        name: 'بطاقات الأمومة',
        type: DOCUMENT_TYPES.HEALTH,
        description: 'بطاقات متابعة الحوامل',
        frequency: 'مستمر',
        responsible: 'مراكز الرعاية الصحية',
        format: 'بطاقة ورقية',
        retention: '25 سنة'
      },
      {
        name: 'تقارير التغطية',
        type: DOCUMENT_TYPES.MONITORING,
        description: 'تقارير شهرية عن تغطية الرعاية',
        frequency: 'شهري',
        responsible: 'مدير المركز',
        format: 'Excel/PDF',
        retention: '5 سنوات'
      },
      {
        name: 'مواد التوعية',
        type: DOCUMENT_TYPES.COMMUNITY,
        description: 'مواد توعية للأمهات',
        frequency: 'حسب الحاجة',
        responsible: 'مسؤول التوعية',
        format: 'PDF/Word',
        retention: '3 سنوات'
      }
    ],
    verification_methods: [
      {
        method: VERIFICATION_METHODS.DOCUMENT_REVIEW,
        description: 'مراجعة سجلات الرعاية',
        frequency: 'شهري',
        responsible: 'مشرف صحي'
      },
      {
        method: VERIFICATION_METHODS.INTERVIEW,
        description: 'مقابلة عينة من الأمهات',
        sample_size: '30 أم',
        responsible: 'فريق التقييم'
      },
      {
        method: VERIFICATION_METHODS.DATA_ANALYSIS,
        description: 'تحليل بيانات التغطية',
        frequency: 'شهري',
        responsible: 'محلل بيانات'
      }
    ]
  }
};

// ===== دليل موحد لجميع المحاور =====

export const COMPREHENSIVE_DOCUMENTS_GUIDE = {
  axis_1: AXIS_1_DOCUMENTS_GUIDE,
  axis_4: AXIS_4_DOCUMENTS_GUIDE,
  axis_5: AXIS_5_DOCUMENTS_GUIDE
};

// ===== وظائف مساعدة =====

/**
 * الحصول على دليل المستندات لمعيار محدد
 */
export function getDocumentsGuide(standardCode) {
  const axisOrder = parseInt(standardCode.split('-')[0].replace('م', ''));
  const guides = {
    1: AXIS_1_DOCUMENTS_GUIDE,
    4: AXIS_4_DOCUMENTS_GUIDE,
    5: AXIS_5_DOCUMENTS_GUIDE
  };
  
  return guides[axisOrder]?.[standardCode] || null;
}

/**
 * التحقق من اكتمال المستندات المطلوبة
 */
export function verifyDocumentCompleteness(standardCode, availableDocuments) {
  const guide = getDocumentsGuide(standardCode);
  if (!guide) return { status: 'no_guide', completeness: 0 };
  
  const requiredDocs = guide.required_documents;
  const available = availableDocuments || [];
  
  let completed = 0;
  const missing = [];
  
  requiredDocs.forEach(doc => {
    const isAvailable = available.some(avail => 
      avail.name === doc.name || avail.type === doc.type
    );
    
    if (isAvailable) {
      completed++;
    } else {
      missing.push(doc);
    }
  });
  
  const completeness = (completed / requiredDocs.length) * 100;
  
  return {
    status: completeness >= 80 ? 'complete' : completeness >= 50 ? 'partial' : 'incomplete',
    completeness: Math.round(completeness),
    completed: completed,
    total: requiredDocs.length,
    missing: missing
  };
}

/**
 * توليد قائمة مهام التحقق
 */
export function generateVerificationTasks(standardCode) {
  const guide = getDocumentsGuide(standardCode);
  if (!guide) return [];
  
  return guide.verification_methods.map(method => ({
    standard_code: standardCode,
    method: method.method,
    description: method.description,
    frequency: method.frequency,
    responsible: method.responsible,
    sample_size: method.sample_size,
    tools: method.tools,
    status: 'pending',
    last_completed: null,
    next_due: calculateNextDue(method.frequency)
  }));
}

/**
 * حساب تاريخ الاستحقاق التالي
 */
function calculateNextDue(frequency) {
  const now = new Date();
  
  switch (frequency) {
    case 'شهري':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    case 'ربع سنوي':
      return new Date(now.getFullYear(), now.getMonth() + 3, 1);
    case 'سنتوي':
      return new Date(now.getFullYear() + 1, now.getMonth(), 1);
    case 'مستمر':
      return null;
    default:
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}

/**
 * توليد تقرير التحقق الشامل
 */
export function generateVerificationReport(standardCode, availableDocuments, completedTasks) {
  const guide = getDocumentsGuide(standardCode);
  if (!guide) return null;
  
  const documentStatus = verifyDocumentCompleteness(standardCode, availableDocuments);
  const tasks = generateVerificationTasks(standardCode);
  
  const completedTasksCount = completedTasks?.length || 0;
  const totalTasks = tasks.length;
  const taskCompletion = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;
  
  return {
    standard_code: standardCode,
    standard_title: guide.title,
    document_status: documentStatus,
    task_completion: Math.round(taskCompletion),
    overall_status: calculateOverallStatus(documentStatus.completeness, taskCompletion),
    recommendations: generateRecommendations(documentStatus, taskCompletion),
    last_updated: new Date().toISOString()
  };
}

/**
 * حساب الحالة الإجمالية
 */
function calculateOverallStatus(docCompleteness, taskCompletion) {
  const overall = (docCompleteness + taskCompletion) / 2;
  
  if (overall >= 90) return 'ممتاز';
  if (overall >= 80) return 'جيد جداً';
  if (overall >= 70) return 'جيد';
  if (overall >= 60) return 'متوسط';
  return 'ضعيف';
}

/**
 * توليد التوصيات
 */
function generateRecommendations(docStatus, taskCompletion) {
  const recommendations = [];
  
  if (docStatus.completeness < 80) {
    recommendations.push('إكمال المستندات المفقودة');
    docStatus.missing.forEach(doc => {
      recommendations.push(`توفير ${doc.name} - ${doc.description}`);
    });
  }
  
  if (taskCompletion < 80) {
    recommendations.push('إكمال مهام التحقق المعلقة');
  }
  
  if (docStatus.completeness >= 80 && taskCompletion >= 80) {
    recommendations.push('الحفاظ على المستوى الحالي من الالتزام');
  }
  
  return recommendations;
}

export default {
  COMPREHENSIVE_DOCUMENTS_GUIDE,
  getDocumentsGuide,
  verifyDocumentCompleteness,
  generateVerificationTasks,
  generateVerificationReport
};
