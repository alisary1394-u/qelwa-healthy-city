/**
 * بذرة المحاور الثمانية و 80 معياراً (معايير المدينة الصحية - دليل منظمة الصحة العالمية، الملحق الثاني).
 * نصوص المعايير والمستندات المطلوبة ومؤشرات الأداء من ملف standardsFromPdf.js المستخرج من PDF الدليل.
 * أسماء المحاور يمكن تحديثها حسب ملف المعايير.pdf الرسمي عند توفره.
 */

import { STANDARDS_80, AXIS_COUNTS } from './standardsFromPdf.js';

/**
 * المحاور الثمانية حسب الملحق الثاني من دليل معايير المدن الصحية (منظمة الصحة العالمية).
 * التوزيع: 1–10، 11–19، 20–30، 31–56، 57–62، 63–67، 68–73، 74–80.
 */
export const AXES_SEED = [
  { name: 'تنظيم المجتمع وتعبئته من أجل الصحة والتنمية', description: 'تنظيم المجتمع وتعبئته من أجل الصحة والتنمية (معايير 1–10)', order: 1 },
  { name: 'مركز المعلومات والمشاركة المجتمعية', description: 'مركز المعلومات والمشاركة المجتمعية (معايير 11–19)', order: 2 },
  { name: 'البيئة والاستدامة', description: 'البيئة والاستدامة (معايير 20–30)', order: 3 },
  { name: 'الصحة والرعاية الصحية', description: 'الصحة والرعاية الصحية (معايير 31–56)', order: 4 },
  { name: 'الطوارئ والاستعداد لها', description: 'الطوارئ والاستعداد لها (معايير 57–62)', order: 5 },
  { name: 'التعليم والثقافة', description: 'التعليم والثقافة (معايير 63–67)', order: 6 },
  { name: 'التدريب والمهارات', description: 'التدريب والمهارات (معايير 68–73)', order: 7 },
  { name: 'الاقتصاد والإقراض', description: 'الاقتصاد والإقراض (معايير 74–80)', order: 8 },
];

/** أسماء مختصرة للمحاور للعرض في التبويبات العلوية فقط (حسب الترتيب 1–8) */
export const AXIS_SHORT_NAMES = [
  'تنظيم المجتمع والتعبئة',
  'المعلومات والمشاركة',
  'البيئة والاستدامة',
  'الصحة والرعاية',
  'الطوارئ والاستعداد',
  'التعليم والثقافة',
  'التدريب والمهارات',
  'الاقتصاد والإقراض',
];

const VERIFICATION_KPI = { name: 'مؤشر التحقق (من الدليل)', target: 'أدلة متوفرة (+)', unit: 'تحقق' };

/**
 * ضمان أن مؤشر التحقق (من الدليل) هو أول مؤشر، مع استخدام وصف المعيار كنص المؤشر.
 */
function kpisWithVerificationFirst(kpisArray, description) {
  const list = Array.isArray(kpisArray) ? [...kpisArray] : [];
  const hasVerification = list.length > 0 && list[0].name === VERIFICATION_KPI.name;
  if (!hasVerification) {
    list.unshift({ ...VERIFICATION_KPI, description: description ?? '' });
  } else if (description && !list[0].description) {
    list[0] = { ...list[0], description };
  }
  return list;
}

/**
 * بناء نص "الأدلة المطلوبة" من قائمة المستندات (حسب دليل منظمة الصحة العالمية).
 */
function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  if (list.length === 0) return 'أدلة ومستندات تدعم تحقيق المعيار';
  return 'أدلة مطلوبة: ' + list.join('، ');
}

/**
 * إنشاء مصفوفة الـ 80 معياراً من دليل المدن الصحية (PDF)، موزعة على المحاور الثمانية.
 * كل معيار يأخذ: العنوان، الوصف، المستندات المطلوبة (كأدلة مطلوبة)، مؤشرات الأداء (مع مؤشر التحقق من الدليل أولاً).
 */
export function buildStandardsSeed(axesWithIds) {
  const standards = [];
  let standardIndex = 0;
  axesWithIds.forEach((axis, idx) => {
    const axisNum = idx + 1;
    const count = AXIS_COUNTS[idx] ?? 9;
    for (let i = 1; i <= count; i++) {
      const item = STANDARDS_80[standardIndex];
      const code = `م${axisNum}-${i}`;
      const description = item?.description ?? `وصف المعيار ${code} ضمن محور ${axis.name}.`;
      const kpis = kpisWithVerificationFirst(item?.kpis ?? [{ name: 'مؤشر تحقيق', target: '-', unit: '' }], description);
      const documents = item?.documents ?? [];
      standards.push({
        code,
        title: item?.title ?? `معيار ${axis.name} ${code}`,
        description,
        axis_id: axis.id,
        axis_name: axis.name,
        required_evidence: buildRequiredEvidence(documents),
        required_documents: JSON.stringify(documents.length ? documents : ['وثائق تدعم تحقيق المعيار']),
        kpis: JSON.stringify(kpis),
        status: 'not_started',
      });
      standardIndex += 1;
    }
  });
  return standards;
}

export { AXES_SEED as default };
