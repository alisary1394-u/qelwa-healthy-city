/**
 * بذرة المحاور التسعة و 80 معياراً (معايير المدينة الصحية - دليل منظمة الصحة العالمية، الملحق الثاني)
 * نصوص المعايير والمستندات المطلوبة ومؤشرات الأداء من ملف standardsFromPdf.js المستخرج من PDF الدليل.
 */

import { STANDARDS_80, AXIS_COUNTS } from './standardsFromPdf.js';

export const AXES_SEED = [
  { name: 'الحوكمة والشراكات', description: 'الحوكمة الرشيدة والشراكات من أجل الصحة والتنمية', order: 1 },
  { name: 'المشاركة المجتمعية وتمكين المواطنين', description: 'مشاركة المجتمع في صنع القرار وتمكين المواطنين', order: 2 },
  { name: 'البيئة والاستدامة', description: 'البيئة الحضرية المستدامة والصحة البيئية', order: 3 },
  { name: 'الصحة والرعاية الصحية', description: 'الخدمات الصحية والوقاية والرعاية', order: 4 },
  { name: 'النقل والتنقل الآمن', description: 'النقل المستدام والتنقل الآمن', order: 5 },
  { name: 'الإسكان والخدمات الأساسية', description: 'الإسكان اللائق والبنية التحتية والخدمات', order: 6 },
  { name: 'التعليم والثقافة', description: 'التعليم والصحة الثقافية والمعرفية', order: 7 },
  { name: 'الاقتصاد والتشغيل', description: 'الفرص الاقتصادية والعمل اللائق', order: 8 },
  { name: 'السلامة والعدالة الاجتماعية', description: 'الأمان والعدالة والاندماج الاجتماعي', order: 9 },
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
 * إنشاء مصفوفة الـ 80 معياراً من دليل المدن الصحية (PDF)، موزعة على المحاور التسعة.
 * كل معيار يأخذ: العنوان، الوصف، المستندات المطلوبة، مؤشرات الأداء (مع مؤشر التحقق من الدليل أولاً).
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
      standards.push({
        code,
        title: item?.title ?? `معيار ${axis.name} ${code}`,
        description,
        axis_id: axis.id,
        axis_name: axis.name,
        required_evidence: 'أدلة ومستندات تدعم تحقيق المعيار',
        required_documents: JSON.stringify(item?.documents ?? ['وثائق تدعم تحقيق المعيار']),
        kpis: JSON.stringify(kpis),
        status: 'not_started',
      });
      standardIndex += 1;
    }
  });
  return standards;
}

export { AXES_SEED as default };
