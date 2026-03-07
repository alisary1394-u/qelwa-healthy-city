import React from 'react';
import { useTranslation } from 'react-i18next';
import T from '@/components/T';
import { translateTextSync, localizeStandardCode } from '@/utils/translationService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, Target } from "lucide-react";
import { AXIS_COUNTS_CSV, STANDARDS_CSV, sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';

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
  const { i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const tt = (text) => rtl ? text : (translateTextSync(text) || text);

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
      <Badge className={`${config.color} text-white shrink-0 whitespace-nowrap text-sm font-medium px-4 py-2 min-h-[2.25rem] rounded-lg inline-flex items-center gap-1.5`} dir={rtl ? 'rtl' : 'ltr'}>
        <Icon className="w-4 h-4 shrink-0 rtl:order-2" />
        <span><T>{config.label}</T></span>
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
    <div dir={rtl ? 'rtl' : 'ltr'} className="report-font bg-card p-8 space-y-8 text-right font-sans antialiased" id="who-report">
      {/* Report Header */}
      <div className="text-center border-b-4 border-blue-600 pb-6">
        <div className="flex justify-center mb-4">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt={tt('شعار المدينة')} className="w-20 h-20 object-cover" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          <T>تقرير تحقيق معايير المدن الصحية</T>
        </h1>
        <h2 className="text-xl text-foreground mb-1">
          {settings?.city_name || tt('المدينة الصحية')}
        </h2>
        <p className="text-muted-foreground">{settings?.city_location || ''}</p>
        <p className="text-sm text-muted-foreground mt-4">
          <T>إعداد التقرير</T>: {new Date().toLocaleDateString(rtl ? 'ar-SA' : 'en-US')}
        </p>
        <p className="text-sm text-muted-foreground">
          <T>وفقاً لمعايير المدن الصحية (مرجع المعايير) — 9 محاور و 80 معياراً</T>
        </p>
      </div>

      {/* Executive Summary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground border-r-4 border-blue-600 pr-3">
          <T>الملخص التنفيذي</T>
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-blue-600">{overallCompletion}%</p>
              <p className="text-sm text-muted-foreground mt-2"><T>نسبة الإنجاز الإجمالية</T></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-green-600">{completedStandards}</p>
              <p className="text-sm text-muted-foreground mt-2"><T>المعايير المكتملة</T></p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-foreground">{totalStandards}</p>
              <p className="text-sm text-muted-foreground mt-2"><T>إجمالي المعايير</T></p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Progress by Axis */}
      <div className="space-y-4 text-right">
        <h2 className="text-2xl font-bold text-foreground border-r-4 border-green-600 pr-3">
          <T>التقدم حسب المحاور</T>
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
                <div className="w-full bg-muted rounded-full h-3 mb-2">
                  <div 
                    className="gradient-primary h-3 rounded-full transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {completedCount} <T>من</T> {expectedCount} <T>معيار مكتمل</T>
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
            <h2 className="text-2xl font-bold text-foreground border-r-4 border-blue-600 pr-3">
              {axis.name}
            </h2>
            {axis.description && (
              <p className="text-foreground bg-blue-50 p-4 rounded-lg">{axis.description}</p>
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
                            <Badge variant="outline" className="text-sm shrink-0 whitespace-nowrap">{localizeStandardCode(standard.code)}</Badge>
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
                          <p className="text-sm font-semibold text-foreground"><T>الوصف</T>:</p>
                          <p className="text-sm text-muted-foreground">{standard.description}</p>
                        </div>
                      )}
                      
                      {standard.required_evidence && (
                        <div>
                          <p className="text-sm font-semibold text-foreground"><T>الأدلة المطلوبة</T>:</p>
                          <p className="text-sm text-muted-foreground">{standard.required_evidence}</p>
                        </div>
                      )}
                      {parseJsonArray(standard.kpis).length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1 justify-end">
                            <Target className="w-4 h-4" />
                            <T>مؤشرات الأداء</T>:
                          </p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5 mt-1">
                            {parseJsonArray(standard.kpis).map((k, i) => (
                              <li key={i}>
                                <span className="font-medium">{k.name}</span>
                                {k.target && ` — ${tt('الهدف')}: ${k.target}`}
                                {k.unit && k.unit !== '-' && ` (${k.unit})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {standard.assigned_to && (
                        <div>
                          <p className="text-sm font-semibold text-foreground"><T>المسؤول</T>:</p>
                          <p className="text-sm text-muted-foreground">{standard.assigned_to}</p>
                        </div>
                      )}
                      
                      {standardEvidence.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1 justify-end">
                            <FileText className="w-4 h-4" />
                            <T>الأدلة المرفقة</T> ({standardEvidence.length}):
                          </p>
                          <div className="space-y-1">
                            {standardEvidence.map(ev => (
                              <div key={ev.id} className="text-xs bg-muted/50 p-2 rounded flex items-center justify-between text-right" dir="rtl">
                                <span>{ev.title}</span>
                                <Badge className={
                                  ev.status === 'approved' ? 'bg-green-600' :
                                  ev.status === 'rejected' ? 'bg-destructive' :
                                  'bg-gray-500'
                                }>
                                  {ev.status === 'approved' ? <T>معتمد</T> : 
                                   ev.status === 'rejected' ? <T>مرفوض</T> : <T>قيد المراجعة</T>}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {standard.notes && (
                        <div>
                          <p className="text-sm font-semibold text-foreground"><T>ملاحظات</T>:</p>
                          <p className="text-sm text-muted-foreground italic">{standard.notes}</p>
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

      {/* Recommendations */}
      <div className="space-y-4 break-inside-avoid">
        <h2 className="text-2xl font-bold text-foreground border-r-4 border-green-600 pr-3">
          <T>التوصيات والخطوات القادمة</T>
        </h2>
        <div className="bg-green-50 border-r-4 border-green-600 p-6 space-y-3">
          {dedupedStandards.filter(s => s.status !== 'completed' && s.status !== 'approved').length > 0 && (
            <div>
              <p className="font-semibold text-foreground mb-2"><T>المعايير التي تحتاج إلى إكمال</T>:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                {dedupedStandards
                  .filter(s => s.status !== 'completed' && s.status !== 'approved')
                  .slice(0, 5)
                  .map(s => (
                    <li key={s.id}>{localizeStandardCode(s.code)} - {s.title} ({s.completion_percentage || 0}%)</li>
                  ))}
              </ul>
            </div>
          )}
          
          <div>
            <p className="font-semibold text-foreground mb-2"><T>التوصيات العامة</T>:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
              <li><T>مراجعة المعايير غير المكتملة وتحديد الموارد اللازمة</T></li>
              <li><T>تعزيز التوثيق وجمع الأدلة للمعايير قيد التنفيذ</T></li>
              <li><T>تحديث خطة العمل بناءً على التقدم الحالي</T></li>
              <li><T>التنسيق مع جميع اللجان لضمان استكمال المتطلبات</T></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-border pt-6 text-center text-muted-foreground">
        <p className="text-sm">
          <T>هذا التقرير معد وفقاً لمعايير المدن الصحية (مرجع المعايير) — 9 محاور و 80 معياراً</T>
        </p>
        <p className="text-sm mt-2">
          <T>للمزيد من المعلومات</T>: {settings?.city_name || tt('المدينة الصحية')}
        </p>
      </div>
    </div>
  );
}