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

const DEFAULT_REQUIRED_DOCUMENTS_BY_AXIS = {
  1: ['قرار تشكيل فريق المحور', 'مصفوفة الأدوار والمسؤوليات', 'خطة الحوكمة والمتابعة', 'محاضر الاجتماعات الدورية', 'تقرير الالتزام بالقرارات', 'سجل المخاطر الإدارية'],
  2: ['الخطة التشغيلية للمحور', 'الخطة الزمنية للتنفيذ', 'السياسات والإجراءات المعتمدة', 'نموذج متابعة التنفيذ', 'تقرير الانحرافات والإجراءات التصحيحية', 'سجل اعتماد التحديثات'],
  3: ['خطة التفتيش البيئي', 'تقارير جودة البيئة (هواء/مياه/نظافة)', 'سجل الحملات الميدانية', 'تقارير معالجة الملاحظات', 'صور قبل/بعد التحسينات', 'تقرير مؤشرات الصحة البيئية'],
  4: ['خطة التوعية الصحية', 'المواد التوعوية المعتمدة', 'جدول الأنشطة والفعاليات', 'تقارير الحضور والاستفادة', 'استبيان قياس الأثر', 'تقرير التغطية الإعلامية'],
  5: ['خطة إشراك المجتمع', 'سجل الشراكات المجتمعية', 'محاضر اللقاءات المجتمعية', 'تقرير مبادرات التطوع', 'سجل المقترحات والشكاوى', 'تقرير الاستجابة المجتمعية'],
  6: ['خطة تحسين الخدمة', 'خرائط تدفق الخدمة', 'تقارير الأداء التشغيلي', 'تقرير زمن الانتظار', 'سجل رضا المستفيدين', 'خطة التحسين المستمر'],
  7: ['سجل المخاطر التفصيلي', 'خطة الطوارئ والاستجابة', 'تقارير اختبارات الجاهزية', 'سجل الحوادث والإبلاغ', 'تقرير تحليل السبب الجذري', 'خطة الإجراءات الوقائية'],
  8: ['سياسة حوكمة البيانات', 'قاموس البيانات وتعريف المؤشرات', 'تقارير جودة البيانات', 'دليل التكامل بين الأنظمة', 'تقارير لوحات المتابعة', 'خطة حماية البيانات والنسخ الاحتياطي'],
  9: ['خطة الاستدامة', 'مؤشرات قياس الأثر طويل المدى', 'تقرير مراجعة الأداء السنوي', 'خطة التحسين السنوية', 'تقرير الدروس المستفادة', 'خطة نقل المعرفة للفريق'],
};

export function getDefaultRequiredDocumentsForAxis(axisOrder) {
  const key = Number(axisOrder) || 0;
  const docs = DEFAULT_REQUIRED_DOCUMENTS_BY_AXIS[key];
  return Array.isArray(docs) && docs.length > 0 ? [...docs] : ['أدلة ومستندات تدعم تحقيق المعيار'];
}

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
      const documents = getDefaultRequiredDocumentsForAxis(axisOrder);
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
