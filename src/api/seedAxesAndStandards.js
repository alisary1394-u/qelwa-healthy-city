/**
 * بذرة المحاور والمعايير من ملف Healthy_Cities_Criteria.csv (معايير المدن الصحية).
 * 13 محوراً، 86 معياراً، مع مؤشرات أداء من standardsFromCsv.js.
 */

import {
  AXES_CSV,
  AXIS_COUNTS_CSV,
  AXIS_SHORT_NAMES_CSV,
  STANDARDS_CSV,
  getAxisOrderFromStandardIndexCsv,
} from './standardsFromCsv.js';

/** المحاور الـ 12 حسب CSV (مصدر البذرة) */
export const AXES_SEED = AXES_CSV;

/** أسماء مختصرة للمحاور للعرض في التبويبات (13 محوراً) */
export const AXIS_SHORT_NAMES = AXIS_SHORT_NAMES_CSV;

/** عدد المعايير لكل محور (للاستخدام في المزامنة والحسابات) */
export const AXIS_COUNTS = AXIS_COUNTS_CSV;

/** استنتاج رقم المحور من فهرس المعيار — حسب هيكل CSV */
export { getAxisOrderFromStandardIndexCsv as getAxisOrderFromStandardIndex };

function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  if (list.length === 0) return 'أدلة ومستندات تدعم تحقيق المعيار';
  return 'أدلة مطلوبة: ' + list.join('، ');
}

/**
 * إنشاء مصفوفة الـ 86 معياراً من بيانات CSV، موزعة على المحاور الـ 13.
 */
export function buildStandardsSeed(axesWithIds) {
  const standards = [];
  let standardIndex = 0;
  axesWithIds.forEach((axis, idx) => {
    const axisNum = idx + 1;
    const count = AXIS_COUNTS_CSV[idx] ?? 8;
    for (let i = 1; i <= count; i++) {
      const item = STANDARDS_CSV[standardIndex];
      const code = `م${axisNum}-${i}`;
      const title = item?.title ?? `معيار ${axis.name} ${code}`;
      const description = title;
      const kpis = item?.kpis ?? [{ name: 'مؤشر التحقق', target: 'أدلة متوفرة (+)', unit: 'تحقق', description: title }];
      const documents = item?.documents ?? ['أدلة ومستندات تدعم تحقيق المعيار'];
      standards.push({
        code,
        title,
        description,
        axis_id: axis.id,
        axis_name: axis.name,
        required_evidence: buildRequiredEvidence(documents),
        required_documents: JSON.stringify(Array.isArray(documents) ? documents : [documents]),
        kpis: JSON.stringify(kpis),
        status: 'not_started',
      });
      standardIndex += 1;
    }
  });
  return standards;
}

export { AXES_SEED as default };
