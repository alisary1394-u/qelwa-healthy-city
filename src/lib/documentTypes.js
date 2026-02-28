/**
 * أنواع المستندات المطلوبة حسب دليل المستندات docs/required-documents-guide.md
 * للاستخدام في المهام والمبادرات والمعايير
 */
export const DOCUMENT_TYPES = [
  { value: 'plan', label: 'خطة', code: 'PLAN' },
  { value: 'progress', label: 'تقرير تقدم', code: 'PROGRESS' },
  { value: 'checklist', label: 'قائمة تحقق', code: 'CHECKLIST' },
  { value: 'mom', label: 'محضر اجتماع', code: 'MOM' },
  { value: 'risk', label: 'سجل مخاطر', code: 'RISK' },
  { value: 'evidence', label: 'دليل إثبات', code: 'EVIDENCE' },
  { value: 'audit', label: 'تقرير مراجعة', code: 'AUDIT' },
  { value: 'capa', label: 'إجراءات تصحيحية/وقائية', code: 'CAPA' },
  { value: 'other', label: 'أخرى', code: 'OTHER' },
];

export const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label])
);
