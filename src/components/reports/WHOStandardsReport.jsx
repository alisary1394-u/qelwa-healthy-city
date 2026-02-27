import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, FileText, Target } from "lucide-react";
import { AXIS_KPIS_CSV, AXIS_COUNTS_CSV, STANDARDS_CSV, sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';

const REFERENCE_TOTAL_STANDARDS = STANDARDS_CSV.length;

function parseJsonArray(str, fallback = []) {
  if (!str) return fallback;
  try {
    const v = typeof str === 'string' ? JSON.parse(str) : str;
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export default function WHOStandardsReport({ standards, axes, evidence, settings }) {
  const getStatusBadge = (status) => {
    const statusConfig = {
      not_started: { label: 'لم يبدأ', color: 'bg-gray-500', icon: Clock },
      in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-500', icon: Clock },
      completed: { label: 'مكتمل', color: 'bg-green-600', icon: CheckCircle },
      approved: { label: 'معتمد', color: 'bg-green-700', icon: CheckCircle }
    };
    const config = statusConfig[status] || statusConfig.not_started;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white shrink-0 whitespace-nowrap text-sm font-medium px-4 py-2 min-h-[2.25rem] rounded-lg inline-flex items-center gap-1.5`} dir="rtl">
        <Icon className="w-4 h-4 shrink-0 rtl:order-2" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getExpectedCountForAxis = (axisOrder) => {
    if (axisOrder >= 1 && axisOrder <= AXIS_COUNTS_CSV.length) return AXIS_COUNTS_CSV[axisOrder - 1];
    return 1;
  };

  const getAxisStandardsSortedAndDeduped = (axisId, axisOrder) => {
    const list = standards.filter(s => s.axis_id === axisId);
    return sortAndDeduplicateStandardsByCode(list);
  };

  const calculateAxisCompletion = (axisId, axisOrder) => {
    const axisStandards = standards.filter(s => s.axis_id === axisId);
    const expectedCount = getExpectedCountForAxis(axisOrder);
    if (expectedCount <= 0) return 0;
    const completed = axisStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
    return Math.round((completed / expectedCount) * 100);
  };

  const dedupedStandards = sortAndDeduplicateStandardsByCode(standards);
  const overallCompletion = REFERENCE_TOTAL_STANDARDS > 0 && dedupedStandards.length > 0
    ? Math.round(dedupedStandards.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / dedupedStandards.length)
    : 0;

  const completedStandards = standards.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const totalStandards = REFERENCE_TOTAL_STANDARDS;

  return (
    <div dir="rtl" className="report-font bg-white p-8 space-y-8 text-right font-sans antialiased" id="who-report">
      {/* Report Header */}
      <div className="text-center border-b-4 border-blue-600 pb-6">
        <div className="flex justify-center mb-4">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="شعار المدينة" className="w-20 h-20 object-cover" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          تقرير تحقيق معايير المدن الصحية
        </h1>
        <h2 className="text-xl text-gray-700 mb-1">
          {settings?.city_name || 'المدينة الصحية'}
        </h2>
        <p className="text-gray-600">{settings?.city_location || ''}</p>
        <p className="text-sm text-gray-500 mt-4">
          إعداد التقرير: {new Date().toLocaleDateString('ar-SA')}
        </p>
        <p className="text-sm text-gray-500">
          وفقاً لمعايير المدن الصحية (مرجع المعايير) — 9 محاور و 80 معياراً
        </p>
      </div>

      {/* Executive Summary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 border-r-4 border-blue-600 pr-3">
          الملخص التنفيذي
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-blue-600">{overallCompletion}%</p>
              <p className="text-sm text-gray-600 mt-2">نسبة الإنجاز الإجمالية</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-green-600">{completedStandards}</p>
              <p className="text-sm text-gray-600 mt-2">المعايير المكتملة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-gray-700">{totalStandards}</p>
              <p className="text-sm text-gray-600 mt-2">إجمالي المعايير</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress by Axis */}
      <div className="space-y-4 text-right">
        <h2 className="text-2xl font-bold text-gray-900 border-r-4 border-green-600 pr-3">
          التقدم حسب المحاور
        </h2>
        <div className="space-y-3">
          {axes.map(axis => {
            const order = axis.order ?? 0;
            const completion = calculateAxisCompletion(axis.id, order);
            const axisStandards = standards.filter(s => s.axis_id === axis.id);
            const expectedCount = getExpectedCountForAxis(order);
            const completedCount = axisStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
            return (
              <div key={axis.id} className="border rounded-lg p-4 text-right">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{axis.name}</h3>
                  <span className="text-2xl font-bold text-blue-600">{completion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gradient-to-l from-blue-600 to-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {completedCount} من {expectedCount} معيار مكتمل
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Standards by Axis — ترتيب وإزالة تكرار حسب الرمز (م1-1 … م9-7) لجميع المحاور بما فيها 4، 7، 8، 9 */}
      {axes.map(axis => {
        const order = axis.order ?? 0;
        const axisStandards = getAxisStandardsSortedAndDeduped(axis.id, order);
        if (axisStandards.length === 0) return null;

        return (
          <div key={axis.id} className="space-y-4 break-inside-avoid">
            <h2 className="text-2xl font-bold text-gray-900 border-r-4 border-blue-600 pr-3">
              {axis.name}
            </h2>
            {axis.description && (
              <p className="text-gray-700 bg-blue-50 p-4 rounded-lg">{axis.description}</p>
            )}
            
            <div className="space-y-4">
              {axisStandards.map(standard => {
                const standardEvidence = evidence.filter(e => e.standard_id === standard.id);
                return (
                  <Card key={standard.id} className="break-inside-avoid text-right overflow-visible">
                    <CardHeader className="overflow-visible">
                      <div className="flex items-start justify-between gap-4 overflow-visible">
                        <div className="flex-1 min-w-0 text-right overflow-visible">
                          <div className="flex flex-wrap items-center gap-2 mb-2 justify-end overflow-visible">
                            <Badge variant="outline" className="text-sm shrink-0 whitespace-nowrap">{standard.code}</Badge>
                            {getStatusBadge(standard.status)}
                          </div>
                          <CardTitle className="report-standard-title text-lg text-right leading-snug">{standard.title}</CardTitle>
                        </div>
                        <div className="shrink-0">
                          <p className="text-3xl font-bold text-blue-600">{standard.completion_percentage || 0}%</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-right">
                      {standard.description && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">الوصف:</p>
                          <p className="text-sm text-gray-600">{standard.description}</p>
                        </div>
                      )}
                      
                      {standard.required_evidence && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">الأدلة المطلوبة:</p>
                          <p className="text-sm text-gray-600">{standard.required_evidence}</p>
                        </div>
                      )}
                      {parseJsonArray(standard.kpis).length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1 justify-end">
                            <Target className="w-4 h-4" />
                            مؤشرات الأداء:
                          </p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5 mt-1">
                            {parseJsonArray(standard.kpis).map((k, i) => (
                              <li key={i}>
                                <span className="font-medium">{k.name}</span>
                                {k.target && ` — الهدف: ${k.target}`}
                                {k.unit && k.unit !== '-' && ` (${k.unit})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {standard.assigned_to && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">المسؤول:</p>
                          <p className="text-sm text-gray-600">{standard.assigned_to}</p>
                        </div>
                      )}
                      
                      {standardEvidence.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1 justify-end">
                            <FileText className="w-4 h-4" />
                            الأدلة المرفقة ({standardEvidence.length}):
                          </p>
                          <div className="space-y-1">
                            {standardEvidence.map(ev => (
                              <div key={ev.id} className="text-xs bg-gray-50 p-2 rounded flex items-center justify-between text-right" dir="rtl">
                                <span>{ev.title}</span>
                                <Badge className={
                                  ev.status === 'approved' ? 'bg-green-600' :
                                  ev.status === 'rejected' ? 'bg-red-600' :
                                  'bg-gray-500'
                                }>
                                  {ev.status === 'approved' ? 'معتمد' : 
                                   ev.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {standard.notes && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700">ملاحظات:</p>
                          <p className="text-sm text-gray-600 italic">{standard.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* مؤشرات الأداء لكل محور */}
      {AXIS_KPIS_CSV && AXIS_KPIS_CSV.length > 0 && (
        <div className="space-y-4 break-inside-avoid">
          <h2 className="text-2xl font-bold text-gray-900 border-r-4 border-blue-600 pr-3 flex items-center gap-2">
            <Target className="w-6 h-6" />
            مؤشرات الأداء لكل محور
          </h2>
          <div className="space-y-3">
            {AXIS_KPIS_CSV.map(axisKpi => (
              <Card key={axisKpi.axis_order} className="break-inside-avoid">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    المحور {axisKpi.axis_order}: {axisKpi.axis_name}
                    <span className="text-sm font-normal text-gray-500 mr-2">({axisKpi.axis_standards_count} معيار)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    {axisKpi.kpis.map((k, i) => (
                      <li key={i}>
                        <span className="font-medium">{k.name}</span>
                        {k.target && ` — الهدف: ${k.target}`}
                        {k.unit && k.unit !== '-' && ` (${k.unit})`}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-4 break-inside-avoid">
        <h2 className="text-2xl font-bold text-gray-900 border-r-4 border-green-600 pr-3">
          التوصيات والخطوات القادمة
        </h2>
        <div className="bg-green-50 border-r-4 border-green-600 p-6 space-y-3">
          {dedupedStandards.filter(s => s.status !== 'completed' && s.status !== 'approved').length > 0 && (
            <div>
              <p className="font-semibold text-gray-900 mb-2">المعايير التي تحتاج إلى إكمال:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                {dedupedStandards
                  .filter(s => s.status !== 'completed' && s.status !== 'approved')
                  .slice(0, 5)
                  .map(s => (
                    <li key={s.id}>{s.code} - {s.title} ({s.completion_percentage || 0}%)</li>
                  ))}
              </ul>
            </div>
          )}
          
          <div>
            <p className="font-semibold text-gray-900 mb-2">التوصيات العامة:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>مراجعة المعايير غير المكتملة وتحديد الموارد اللازمة</li>
              <li>تعزيز التوثيق وجمع الأدلة للمعايير قيد التنفيذ</li>
              <li>تحديث خطة العمل بناءً على التقدم الحالي</li>
              <li>التنسيق مع جميع اللجان لضمان استكمال المتطلبات</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-6 text-center text-gray-600">
        <p className="text-sm">
          هذا التقرير معد وفقاً لمعايير المدن الصحية (مرجع المعايير) — 9 محاور و 80 معياراً
        </p>
        <p className="text-sm mt-2">
          للمزيد من المعلومات: {settings?.city_name || 'المدينة الصحية'}
        </p>
      </div>
    </div>
  );
}