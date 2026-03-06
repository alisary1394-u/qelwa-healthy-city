/**
 * AI Auto-Translation Service
 * Uses MyMemory (free, no API key) with intelligent caching.
 * Translates dynamic user-entered data (names, descriptions, etc.)
 */

const CACHE_KEY = 'auto_translations_cache';
const MAX_CACHE_SIZE = 2000; // max entries
const BATCH_DELAY = 80; // ms debounce for batching

// ─── Built-in dictionary for known values ────────────────────
// These translations are guaranteed and don't depend on external API.
const BUILTIN_TRANSLATIONS = {
  'ar>en': {
    // Default district names
    'حي الشفاء': 'Al-Shifa Neighborhood',
    'حي الخالدية': 'Al-Khalidiyah Neighborhood',
    'حي الصفاء': 'Al-Safa Neighborhood',
    'حي النسيم': 'Al-Naseem Neighborhood',
    'حي العزيزية': 'Al-Aziziyah Neighborhood',
    'حي الشروق': 'Al-Shorouk Neighborhood',
    // Common role titles
    'متطوع اللجنة الرئيسية': 'Main Committee Volunteer',
    'متطوع لجنة الحوكمة والشراكات': 'Governance & Partnerships Committee Volunteer',
    'متطوع لجنة المشاركة المجتمعية': 'Community Participation Committee Volunteer',
    'متطوع لجنة البنية التحتية': 'Infrastructure Committee Volunteer',
    'متطوع لجنة الصحة': 'Health Committee Volunteer',
    'متطوع لجنة التعليم': 'Education Committee Volunteer',
    'متطوع لجنة البيئة': 'Environment Committee Volunteer',
    // Member role-title names (used as full_name in team members)
    'رئيس اللجنة الرئيسية': 'Main Committee Head',
    'منسق اللجنة الرئيسية': 'Main Committee Coordinator',
    'مشرف اللجنة الرئيسية': 'Main Committee Supervisor',
    'عضو اللجنة الرئيسية': 'Main Committee Member',
    'رئيس لجنة الحوكمة': 'Governance Committee Head',
    'رئيس لجنة الحوكمة والش': 'Governance Committee Head',
    'رئيس لجنة الحوكمة والشراكات': 'Governance & Partnerships Committee Head',
    'منسق لجنة الحوكمة': 'Governance Committee Coordinator',
    'منسق لجنة الحوكمة والشر': 'Governance Committee Coordinator',
    'منسق لجنة الحوكمة والشراكات': 'Governance & Partnerships Committee Coordinator',
    'مشرف لجنة الحوكمة': 'Governance Committee Supervisor',
    'مشرف لجنة الحوكمة والشر': 'Governance Committee Supervisor',
    'مشرف لجنة الحوكمة والشراكات': 'Governance & Partnerships Committee Supervisor',
    'رئيس لجنة المشاركة المجت': 'Community Participation Committee Head',
    'رئيس لجنة المشاركة المجتمعية': 'Community Participation Committee Head',
    'منسق لجنة المشاركة المجت': 'Community Participation Committee Coordinator',
    'منسق لجنة المشاركة المجتمعية': 'Community Participation Committee Coordinator',
    'مشرف لجنة المشاركة المجت': 'Community Participation Committee Supervisor',
    'مشرف لجنة المشاركة المجتمعية': 'Community Participation Committee Supervisor',
    'رئيس لجنة البنية التحتية': 'Infrastructure Committee Head',
    'منسق لجنة البنية التحتية': 'Infrastructure Committee Coordinator',
    'مشرف لجنة البنية التحتية': 'Infrastructure Committee Supervisor',
    'رئيس لجنة الصحة': 'Health Committee Head',
    'منسق لجنة الصحة': 'Health Committee Coordinator',
    'مشرف لجنة الصحة': 'Health Committee Supervisor',
    'رئيس لجنة التعليم': 'Education Committee Head',
    'منسق لجنة التعليم': 'Education Committee Coordinator',
    'مشرف لجنة التعليم': 'Education Committee Supervisor',
    'رئيس لجنة البيئة': 'Environment Committee Head',
    'منسق لجنة البيئة': 'Environment Committee Coordinator',
    'مشرف لجنة البيئة': 'Environment Committee Supervisor',
    'رئيس اللجنة': 'Committee Head',
    'منسق اللجنة': 'Committee Coordinator',
    'مشرف اللجنة': 'Committee Supervisor',
    'عضو اللجنة': 'Committee Member',
    // Common labels
    'أخرى': 'Other',
    'غير محدد': 'Unspecified',
    // Axis names
    'تنظيم المجتمع والتوعية': 'Community Organization & Awareness',
    'تنظيم المجتمع والتعبئة': 'Community Organization & Mobilization',
    'الشراكات والتعاون': 'Partnerships & Cooperation',
    'المعلومات المجتمعية': 'Community Information',
    'المياه والبيئة والغذاء': 'Water, Environment & Food',
    'التنمية الصحية': 'Health Development',
    'الطوارئ والاستجابة': 'Emergency & Response',
    'التعليم ومحو الأمية': 'Education & Literacy',
    'المهارات والتدريب': 'Skills & Training',
    'القروض الصغيرة': 'Microloans',
    // Common committee names
    'اللجنة الرئيسية': 'Main Committee',
    'لجنة الحوكمة والشراكات': 'Governance & Partnerships Committee',
    'لجنة المشاركة المجتمعية': 'Community Participation Committee',
    'لجنة البنية التحتية': 'Infrastructure Committee',
    'لجنة الصحة': 'Health Committee',
    'لجنة التعليم': 'Education Committee',
    'لجنة البيئة': 'Environment Committee',
    'لجنة الرياضة والنشاط البدني': 'Sports & Physical Activity Committee',
    'لجنة البيئة الصحية': 'Healthy Environment Committee',
    'لجنة التغذية الصحية': 'Healthy Nutrition Committee',
    'لجنة التوعية والتثقيف الصحي': 'Health Awareness & Education Committee',
    'لجنة الصحة العامة': 'Public Health Committee',
    // Common category/tag labels
    'مشاركة مجتمعية': 'Community Participation',
    'بيئة خضراء': 'Green Environment',
    'صحة ورعاية': 'Health & Care',
    'الحوكمة والشراكات': 'Governance & Partnerships',
    'المشاركة المجتمعية': 'Community Participation',
    'البيئة والاستدامة': 'Environment & Sustainability',
    // Initiative / category names
    'نقل آمن': 'Safe Transportation',
    'إسكان وخدمات': 'Housing & Services',
    'تعليم وثقافة': 'Education & Culture',
    'اقتصاد وتشغيل': 'Economy & Employment',
    'سلامة وعدالة': 'Safety & Justice',
    'حوكمة وشراكات': 'Governance & Partnerships',
    'حملة التطعيم الموسمي': 'Seasonal Vaccination Campaign',
    // Common role/title names
    'المشرف': 'Supervisor',
    'المدينة الصحية': 'Healthy City',
    // Common locations
    'مدينة قلوة': 'Qelwa City',
    'محافظة قلوة': 'Qelwa Governorate',
    // ─── Common UI labels ─────────────────────────────────
    'إلغاء': 'Cancel',
    'حفظ': 'Save',
    'حفظ التعديلات': 'Save Changes',
    'حفظ التغييرات': 'Save Changes',
    'إضافة': 'Add',
    'تعديل': 'Edit',
    'حذف': 'Delete',
    'معاينة': 'Preview',
    'رفع': 'Upload',
    'بحث': 'Search',
    'تصفية': 'Filter',
    'نعم': 'Yes',
    'لا': 'No',
    'خطأ': 'Error',
    'نشط': 'Active',
    'غير نشط': 'Inactive',
    'الوصف': 'Description',
    'ملاحظات': 'Notes',
    'الحالة': 'Status',
    'التصنيف': 'Category',
    'الأولوية': 'Priority',
    // ─── Roles (standalone labels) ─────────────────────────
    'المشرف العام (المحافظ)': 'General Supervisor (Governor)',
    'منسق المدينة الصحية': 'Healthy City Coordinator',
    'رئيس لجنة': 'Committee Head',
    'منسق لجنة': 'Committee Coordinator',
    'مشرف لجنة': 'Committee Supervisor',
    'عضو لجنة': 'Committee Member',
    'عضو': 'Member',
    'متطوع': 'Volunteer',
    'مدير الميزانية': 'Budget Manager',
    'محاسب': 'Accountant',
    'موظف مالي': 'Financial Officer',
    'المشرف العام': 'General Supervisor',
    'منسق': 'Coordinator',
    'مشرف': 'Supervisor',
    'مدير ميزانية': 'Budget Manager',
    'مسؤول مالي': 'Financial Officer',
    // ─── Member Form labels ──────────────────────────────
    'تعديل بيانات العضو': 'Edit Member Data',
    'إضافة عضو جديد': 'Add New Member',
    'الاسم الكامل': 'Full Name',
    'رقم الهوية': 'National ID',
    'الدور': 'Role',
    'رقم الجوال': 'Phone Number',
    'البريد الإلكتروني': 'Email',
    'كلمة المرور (للدخول للنظام)': 'Password (for system login)',
    'اللجنة': 'Committee',
    'القسم/الجهة': 'Department/Organization',
    'المشرف المباشر': 'Direct Supervisor',
    'تاريخ الانضمام': 'Join Date',
    'المؤهل': 'Qualification',
    'ابتدائي': 'Primary',
    'متوسط': 'Intermediate',
    'ثانوي': 'Secondary',
    'دبلوم': 'Diploma',
    'بكالوريوس': 'Bachelor',
    'ماجستير': 'Master',
    'دكتوراه': 'Doctorate',
    'التخصص': 'Specialization',
    'نبذة عن العضو': 'About the Member',
    'إضافة العضو': 'Add Member',
    'بدون لجنة': 'Without Committee',
    'بدون مشرف': 'Without Supervisor',
    'رقم الهوية يجب أن يتكون من 10 أرقام': 'National ID must be 10 digits',
    'رقم الجوال يجب أن يتكون من 10 أرقام': 'Phone must be 10 digits',
    'رقم الجوال يجب أن يبدأ بـ 05': 'Phone must start with 05',
    'لا تُرسل كلمة مرور جديدة إن تركت الحقل فارغاً.': 'Leave empty to keep current password.',
    'يستخدم رقم الهوية وكلمة المرور لتسجيل الدخول': 'National ID and password are used for login',
    // ─── Task Form labels ──────────────────────────────────
    'تعديل المهمة': 'Edit Task',
    'إضافة مهمة جديدة': 'Add New Task',
    'عنوان المهمة': 'Task Title',
    'المكلف بالمهمة': 'Assigned To',
    'المبادرة المرتبطة': 'Related Initiative',
    'بدون مبادرة': 'Without Initiative',
    'المعيار المرتبط (للإثبات)': 'Related Standard (for evidence)',
    'بدون معيار': 'Without Standard',
    'نوع المستند': 'Document Type',
    'بدون نوع': 'Without Type',
    'تاريخ الاستحقاق': 'Due Date',
    'تاريخ ووقت التذكير': 'Reminder Date & Time',
    'إضافة المهمة': 'Add Task',
    'لا توجد نتائج': 'No results',
    'منخفضة': 'Low',
    'متوسطة': 'Medium',
    'عالية': 'High',
    'عاجلة': 'Urgent',
    'عمل ميداني': 'Field Work',
    'اجتماع': 'Meeting',
    'تقرير': 'Report',
    'مسح': 'Survey',
    'تدريب': 'Training',
    'سيتم إرسال تذكير بالبريد الإلكتروني للمكلف في هذا التاريخ': 'A reminder email will be sent to the assignee on this date',
    // ─── KPI labels ─────────────────────────────────────────
    'محقق': 'Achieved',
    'على المسار': 'On Track',
    'معرض للخطر': 'At Risk',
    'متأخر': 'Behind',
    'مؤشرات الأداء (KPIs)': 'Performance Indicators (KPIs)',
    'مؤشر جديد': 'New Indicator',
    'لا توجد مؤشرات أداء بعد': 'No KPIs yet',
    'التقدم': 'Progress',
    'مرفقات المؤشر': 'Indicator Attachments',
    'رفع مرفق': 'Upload Attachment',
    'لا توجد مرفقات': 'No attachments',
    'تعديل مؤشر الأداء': 'Edit KPI',
    'مؤشر أداء جديد': 'New KPI',
    'اسم المؤشر': 'Indicator Name',
    'القيمة المستهدفة': 'Target Value',
    'القيمة الحالية': 'Current Value',
    'وحدة القياس': 'Measurement Unit',
    'تكرار القياس': 'Measurement Frequency',
    'يومي': 'Daily',
    'أسبوعي': 'Weekly',
    'شهري': 'Monthly',
    'ربع سنوي': 'Quarterly',
    'سنوي': 'Annual',
    'حفظ المؤشر': 'Save Indicator',
    'عنوان المرفق (اختياري)': 'Attachment Title (optional)',
    'وصف (اختياري)': 'Description (optional)',
    'اختر ملفات (يمكن أكثر من ملف)': 'Select files (multiple allowed)',
    'مرفق': 'Attachment',
    'اعتماد': 'Approve',
    'رفض': 'Reject',
    // ─── Permissions page labels ────────────────────────────
    'غير مصرح لك بالوصول إلى لوحة الصلاحيات.': 'You are not authorized to access the permissions panel.',
    'هذه الصفحة متاحة للمشرف العام ومنسق المدينة الصحية فقط.': 'This page is available to the General Supervisor and Healthy City Coordinator only.',
    'لوحة إدارة الصلاحيات': 'Permissions Management Panel',
    'التحكم الكامل بمصفوفة صلاحيات المناصب': 'Full control of role permissions matrix',
    'ملخص الصلاحيات': 'Permissions Summary',
    'مُفعّلة': 'Enabled',
    'معطّلة': 'Disabled',
    'إجمالي': 'Total',
    'جاري تحميل الصلاحيات المخصصة...': 'Loading custom permissions...',
    'لديك تغييرات غير محفوظة': 'You have unsaved changes',
    'احفظ التغييرات لتطبيقها على النظام': 'Save changes to apply them',
    'إعادة تعيين الكل': 'Reset All',
    'جاري الحفظ...': 'Saving...',
    'اختر المنصب لتعديل صلاحياته': 'Select role to edit permissions',
    'لا توجد صلاحيات تطابق البحث': 'No permissions match the search',
    'تم الحفظ بنجاح': 'Saved Successfully',
    'تم حفظ تغييرات الصلاحيات. يُرجى إعادة تحميل الصفحة لتطبيق التغييرات.': 'Permission changes saved. Please reload to apply.',
    'خطأ في الحفظ': 'Save Error',
    'حدث خطأ أثناء حفظ الصلاحيات. يرجى المحاولة مرة أخرى.': 'Error saving permissions. Please try again.',
    'تمت إعادة التعيين': 'Reset Complete',
    'تم إعادة تعيين جميع الصلاحيات إلى القيم الافتراضية.': 'All permissions reset to default values.',
    'حدث خطأ أثناء إعادة التعيين.': 'Error during reset.',
    'بحث في الصلاحيات...': 'Search permissions...',
    // ─── Notification labels ─────────────────────────────────
    'الإشعارات': 'Notifications',
    'إشعار غير مقروء': 'unread notification',
    'لا توجد إشعارات': 'No notifications',
    // ─── Error / 404 page labels ─────────────────────────────
    'حدث خطأ في التطبيق': 'Application Error',
    'إعادة تحميل الصفحة': 'Reload Page',
    'الصفحة غير موجودة': 'Page Not Found',
    'غير موجودة في التطبيق.': 'not found in the application.',
    'ملاحظة للمشرف': 'Note for Supervisor',
    'قد تكون هذه الصفحة غير منفذة بعد. اطلب تنفيذها من المساعد.': 'This page may not be implemented yet.',
    'العودة للرئيسية': 'Back to Home',
    // ─── WHO Report labels ───────────────────────────────────
    'لم يبدأ': 'Not Started',
    'قيد التنفيذ': 'In Progress',
    'مكتمل': 'Completed',
    'معتمد': 'Approved',
    'تقرير تحقيق معايير المدن الصحية': 'Healthy Cities Standards Achievement Report',
    'الملخص التنفيذي': 'Executive Summary',
    'نسبة الإنجاز الإجمالية': 'Overall Completion Rate',
    'معيار مكتمل': 'Completed Standard',
    'التفاصيل حسب المحاور': 'Details by Axes',
    'معيار': 'Standard',
    'المعايير': 'Standards',
    'المحور': 'Axis',
    'المحاور': 'Axes',
    'نسبة الإنجاز': 'Completion Rate',
    'الشواهد': 'Evidence',
    'التوصيات': 'Recommendations',
    // ─── Standards page labels ───────────────────────────────
    'مستوى الإنجاز': 'Achievement Level',
    'نقاط الأداء': 'Performance Points',
    'مؤشرات الأداء المحسنة': 'Enhanced KPIs',
    'مؤشر': 'Indicator',
    'المستندات المطلوبة': 'Required Documents',
    'مستند': 'Document',
    'الهدف:': 'Target:',
    'الوحدة:': 'Unit:',
    'الوزن:': 'Weight:',
    'عام': 'General',
    'مؤشرات أخرى': 'Other indicators',
    'مستندات أخرى': 'Other documents',
    // ─── Enhanced standards labels ───────────────────────────
    'شعار المدينة': 'City Logo',
    'وفقاً لمعايير المدن الصحية (مرجع المعايير) — 9 محاور و 80 معياراً': 'According to Healthy Cities Standards — 9 Axes & 80 Standards',
    'غير معنون': 'Untitled',
    'غير مطابق للمتطلبات': 'Does not meet requirements',
    'تحقق': 'Verification',
    'مستفيد': 'Beneficiary',
    'ملف(ات) محدد': 'file(s) selected',
    'فشل حذف المؤشر.': 'Failed to delete indicator.',
    'فشل تعديل قيمة المؤشر.': 'Failed to update indicator value.',
    'فشل رفع المرفقات.': 'Failed to upload attachments.',
    'فشل حفظ المؤشر.': 'Failed to save indicator.',
  },
};

function builtinLookup(text, from, to) {
  const key = `${from}>${to}`;
  return BUILTIN_TRANSLATIONS[key]?.[text] || null;
}

// ─── Cache helpers ───────────────────────────────────────────
function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch { return {}; }
}

function saveCache(cache) {
  try {
    // Trim if too large
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      const trimmed = {};
      keys.slice(-MAX_CACHE_SIZE).forEach(k => { trimmed[k] = cache[k]; });
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch { /* quota exceeded – ignore */ }
}

function cacheKey(text, from, to) {
  return `${from}>${to}:${text}`;
}

// ─── Language detection ──────────────────────────────────────
const AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const EN_RE = /[a-zA-Z]/;

export function detectLanguage(text) {
  if (!text) return 'unknown';
  const arCount = (text.match(new RegExp(AR_RE.source, 'g')) || []).length;
  const enCount = (text.match(new RegExp(EN_RE.source, 'g')) || []).length;
  if (arCount > enCount) return 'ar';
  if (enCount > arCount) return 'en';
  return arCount > 0 ? 'ar' : 'unknown';
}

// ─── Translation API ─────────────────────────────────────────
async function callTranslationAPI(text, from, to) {
  // MyMemory – free, 5 000 chars/day without key, 50 000 with email
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      let translated = data.responseData.translatedText;
      // MyMemory sometimes returns ALL-CAPS for short strings; fix
      if (translated === translated.toUpperCase() && translated.length < 60) {
        translated = translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
      }
      return translated;
    }
    return null;
  } catch (err) {
    console.warn('[AutoTranslate] API error:', err.message);
    return null;
  }
}

// ─── Request queue (batching + dedup) ────────────────────────
let pendingQueue = new Map(); // text -> { from, to, resolvers[] }
let batchTimer = null;

function processBatch() {
  const batch = new Map(pendingQueue);
  pendingQueue.clear();
  batchTimer = null;
  
  const cache = loadCache();
  
  batch.forEach(async ({ text, from, to, resolvers }) => {
    const key = cacheKey(text, from, to);
    // Double-check cache
    if (cache[key]) {
      resolvers.forEach(r => r(cache[key]));
      return;
    }
    
    const result = await callTranslationAPI(text, from, to);
    if (result) {
      cache[key] = result;
      saveCache(cache);
      resolvers.forEach(r => r(result));
    } else {
      resolvers.forEach(r => r(text)); // fallback = original
    }
  });
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Translate a single text string.
 * Returns cached result immediately if available, otherwise fetches.
 * @param {string} text - The text to translate
 * @param {string} targetLang - Target language ('ar' or 'en')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return text;
  
  const sourceLang = detectLanguage(text);
  
  // Already in target language or undetermined
  if (sourceLang === targetLang || sourceLang === 'unknown') return text;
  
  const from = sourceLang;
  const to = targetLang;
  
  // Check built-in dictionary first
  const builtin = builtinLookup(text, from, to);
  if (builtin) return builtin;
  
  // Check cache
  const cache = loadCache();
  const key = cacheKey(text, from, to);
  if (cache[key]) return cache[key];
  
  // Queue for batch processing
  return new Promise((resolve) => {
    const queueKey = `${from}>${to}:${text}`;
    if (pendingQueue.has(queueKey)) {
      pendingQueue.get(queueKey).resolvers.push(resolve);
    } else {
      pendingQueue.set(queueKey, { text, from, to, resolvers: [resolve] });
    }
    
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(processBatch, BATCH_DELAY);
  });
}

/**
 * Synchronous cache lookup – returns cached translation or original.
 * Use this when you need instant results (no loading state).
 * @param {string} text
 * @param {string} targetLang
 * @returns {string}
 */
export function translateTextSync(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  const sourceLang = detectLanguage(text);
  if (sourceLang === targetLang || sourceLang === 'unknown') return text;
  
  // Check built-in dictionary first
  const builtin = builtinLookup(text, sourceLang, targetLang);
  if (builtin) return builtin;
  
  const cache = loadCache();
  const key = cacheKey(text, sourceLang, targetLang);
  return cache[key] || text;
}

/**
 * Pre-translate an array of texts (e.g. when data loads).
 * Useful for batch-translating lists of names/descriptions.
 * @param {string[]} texts
 * @param {string} targetLang
 * @returns {Promise<Map<string, string>>} Map of original → translated
 */
export async function translateBatch(texts, targetLang) {
  const results = new Map();
  const toTranslate = [];
  const cache = loadCache();
  
  for (const text of texts) {
    if (!text || typeof text !== 'string') { results.set(text, text); continue; }
    const sourceLang = detectLanguage(text);
    if (sourceLang === targetLang || sourceLang === 'unknown') {
      results.set(text, text);
      continue;
    }
    // Check built-in dictionary first
    const builtin = builtinLookup(text, sourceLang, targetLang);
    if (builtin) {
      results.set(text, builtin);
      continue;
    }
    const key = cacheKey(text, sourceLang, targetLang);
    if (cache[key]) {
      results.set(text, cache[key]);
    } else {
      toTranslate.push({ text, from: sourceLang, to: targetLang });
    }
  }
  
  // Translate uncached in parallel (limited concurrency)
  const CONCURRENCY = 3;
  for (let i = 0; i < toTranslate.length; i += CONCURRENCY) {
    const chunk = toTranslate.slice(i, i + CONCURRENCY);
    const translated = await Promise.all(
      chunk.map(async ({ text, from, to }) => {
        const result = await callTranslationAPI(text, from, to);
        return { text, from, to, result };
      })
    );
    translated.forEach(({ text, from, to, result }) => {
      if (result) {
        cache[cacheKey(text, from, to)] = result;
        results.set(text, result);
      } else {
        results.set(text, text);
      }
    });
  }
  
  saveCache(cache);
  return results;
}

/**
 * Clear translation cache.
 */
export function clearTranslationCache() {
  localStorage.removeItem(CACHE_KEY);
}
