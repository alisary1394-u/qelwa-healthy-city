/**
 * بذرة المحاور التسعة و 80 معياراً (معايير المدينة الصحية - دليل منظمة الصحة العالمية، الملحق الثاني).
 * نصوص المعايير والمستندات المطلوبة ومؤشرات الأداء من ملف standardsFromPdf.js المستخرج من PDF الدليل.
 * أسماء المحاور يمكن تحديثها حسب ملف المعايير.pdf الرسمي عند توفره.
 */

import { STANDARDS_80, AXIS_COUNTS } from './standardsFromPdf.js';

/**
 * المحاور التسعة حسب الملحق الثاني من دليل منظمة الصحة العالمية (معايير المدن الصحية).
 * الأسماء مأخوذة من ملف "معايير المدن الصحية.pdf" – دليل موجز لتنفيذ برنامج المدينة الصحية.
 */
export const AXES_SEED = [
  { name: 'بناء الشراكات من أجل التنمية المحلية', description: 'بناء الشراكات من أجل التنمية المحلية (معايير 1–9)', order: 1 },
  { name: 'مركز المعلومات والمشاركة المجتمعية', description: 'مركز المعلومات والمشاركة المجتمعية (معايير 10–18)', order: 2 },
  { name: 'البيئة والاستدامة', description: 'البيئة والاستدامة (معايير 19–27)', order: 3 },
  { name: 'الصحة والرعاية الصحية', description: 'الصحة والرعاية الصحية (معايير 28–36)', order: 4 },
  { name: 'الصحة والرعاية والوقاية', description: 'الصحة والرعاية والوقاية والبرامج (معايير 37–45)', order: 5 },
  { name: 'السلامة والأمان والعدالة الاجتماعية', description: 'السلامة والأمان والعدالة والطفولة والتعليم والعمل (معايير 46–54)', order: 6 },
  { name: 'الطوارئ والتعليم والثقافة', description: 'الطوارئ والاستعداد لها والتعليم والثقافة (معايير 55–63)', order: 7 },
  { name: 'التدريب والمهارات', description: 'التدريب والمهارات (معايير 64–72)', order: 8 },
  { name: 'الاقتصاد والإقراض', description: 'الاقتصاد والإقراض (معايير 73–80)', order: 9 },
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
 * إنشاء مصفوفة الـ 80 معياراً من دليل المدن الصحية (PDF)، موزعة على المحاور التسعة.
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
