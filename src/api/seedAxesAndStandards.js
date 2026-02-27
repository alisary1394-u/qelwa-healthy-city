/**
 * بذرة المحاور والمعايير — مرجع: docs/مرجع-معايير-المحاور-للمقارنة.md
 * 9 محوراً، 80 معياراً، مع مؤشرات أداء من standardsFromCsv.js.
 */

import {
  AXES_CSV,
  AXIS_COUNTS_CSV,
  AXIS_SHORT_NAMES_CSV,
  STANDARDS_CSV,
  getAxisOrderFromStandardIndexCsv,
} from './standardsFromCsv.js';

/** المحاور الـ 9 حسب المرجع (مصدر البذرة) */
export const AXES_SEED = AXES_CSV;

/** أسماء مختصرة للمحاور للعرض في التبويبات (9 محوراً) */
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
 * إنشاء مصفوفة الـ 80 معياراً من بيانات CSV، موزعة على المحاور الـ 9.
 * يستخدم axis.order الصحيح لضمان الترميز الصحيح
 */
export function buildStandardsSeed(axesWithIds) {
  const standards = [];
  let standardIndex = 0;
  
  // فرز المحاور بناءً على order لضمان الترميز الصحيح
  const sortedAxes = [...axesWithIds].sort((a, b) => {
    const orderA = Number(a.order) || 0;
    const orderB = Number(b.order) || 0;
    return orderA - orderB;
  });
  
  sortedAxes.forEach((axis) => {
    const axisOrder = Number(axis.order) || 1;
    const count = AXIS_COUNTS_CSV[axisOrder - 1] ?? 8;
    for (let i = 1; i <= count; i++) {
      const item = STANDARDS_CSV[standardIndex];
      const code = `م${axisOrder}-${i}`;
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
