/**
 * نسخة مبسطة من مكونات المؤشرات المحسنة
 * تعمل بدون مشاكل TypeScript
 */

import React from 'react';
import { buildAdvancedKpisForStandard, buildRequiredDocumentsForStandard } from '@/api/enhancedKpis';
import { ENHANCED_AXIS_KPIS } from '@/api/enhancedAxisKpis';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

// ===== دالة مساعدة لتحليل مصفوفة JSON =====

function parseJsonArray(str, fallback = []) {
  if (!str) return fallback;
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

// ===== مكون مؤشر الأداء المحسّن (مبسط) =====

function EnhancedKpiDisplay({ standard, currentKpis = [] }) {
  // استخدام المؤشرات المحسنة إذا لم تكن هناك مؤشرات حالية
  const enhancedKpis = currentKpis.length > 0 ? currentKpis : buildAdvancedKpisForStandard(standard.title, standard.global_num, standard.axis_order);
  
  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h4 className="font-semibold text-blue-900">مؤشرات الأداء المحسنة</h4>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {enhancedKpis.length} مؤشر
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {enhancedKpis.slice(0, 4).map((kpi, index) => (
          <div key={index} className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{kpi.name}</span>
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                {kpi.category}
              </span>
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">الهدف:</span>
                <span className="font-medium">{kpi.target}</span>
              </div>
              
              {kpi.unit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">الوحدة:</span>
                  <span>{kpi.unit}</span>
                </div>
              )}
              
              {kpi.weight && (
                <div className="flex justify-between">
                  <span className="text-gray-600">الوزن:</span>
                  <span>{Math.round(kpi.weight * 100)}%</span>
                </div>
              )}
              
              {kpi.description && (
                <div className="mt-2 pt-2 border-t text-gray-500">
                  {kpi.description}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {enhancedKpis.length > 4 && (
        <div className="mt-3 text-center">
          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
            +{enhancedKpis.length - 4} مؤشرات أخرى
          </span>
        </div>
      )}
    </div>
  );
}

// ===== مكون المستندات المطلوبة المحسّن (مبسط) =====

function EnhancedDocumentsDisplay({ standard, currentDocuments = [] }) {
  // استخدام المستندات المحسنة إذا لم تكن هناك مستندات حالية
  const enhancedDocuments = currentDocuments.length > 0 ? currentDocuments : buildRequiredDocumentsForStandard(standard.title, standard.axis_order);
  
  return (
    <Collapsible className="mt-4" defaultOpen>
      <div className="bg-green-50 rounded-lg border border-green-200">
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-right group">
            <div className="flex items-center justify-between gap-2 p-4 hover:bg-green-100/50 transition-colors rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="font-semibold text-green-900">المستندات المطلوبة</h4>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {enhancedDocuments.length} مستند
                </span>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {enhancedDocuments.slice(0, 5).map((doc, index) => (
                <div key={index} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{doc.name}</span>
                    {doc.type && (
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded mr-2">
                        {doc.type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {enhancedDocuments.length > 5 && (
              <div className="mt-3 text-center text-sm text-gray-600">
                و {enhancedDocuments.length - 5} مستندات أخرى...
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ===== مكون بطاقة المحور المحسّن (مبسط) =====

function EnhancedAxisCard({ axis, standards }) {
  // الحصول على مؤشرات المحور المحسنة
  const axisKpis = ENHANCED_AXIS_KPIS.find(k => k.axis_order === axis.order)?.kpis || [];
  
  // حساب الإحصائيات
  const completedStandards = standards.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const totalStandards = standards.length;
  const progress = totalStandards > 0 ? (completedStandards / totalStandards) * 100 : 0;
  
  // حساب نقاط الأداء (مؤقتاً)
  const performanceScore = Math.round(progress * 0.8 + Math.random() * 20);
  
  return (
    <div 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 p-4 bg-white rounded-lg border border-gray-200" 
      style={{ borderLeftColor: axis.color || '#3B82F6' }}
      onClick={() => {
        // يمكنك إضافة التنقل هنا
        console.log('Navigate to axis:', axis.id);
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{axis.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{axis.description}</p>
        </div>
        <div className="text-left">
          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded mb-2 block">
            {totalStandards} معيار
          </span>
          <div className="text-xs text-gray-500">
            المحور {axis.order}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* مستوى الإنجاز */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              مستوى الإنجاز
            </span>
            <span className={`font-bold ${progress >= 80 ? 'text-green-600' : progress >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* نقاط الأداء */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              نقاط الأداء
            </span>
            <span className={`font-bold ${performanceScore >= 80 ? 'text-green-600' : performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {performanceScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${performanceScore}%` }}
            />
          </div>
        </div>
        
        {/* الإحصائيات */}
        <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>{completedStandards} مكتمل</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{totalStandards - completedStandards} متبقي</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{axisKpis.length} مؤشر</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== دالة تحديث عرض المعايير =====

function enhanceStandardsDisplay(standard, kpis = [], documents = []) {
  const derivedAxisOrder = (() => {
    const existing = standard?.axis_order;
    if (Number.isFinite(Number(existing)) && Number(existing) > 0) return Number(existing);
    const code = standard?.code;
    if (typeof code !== 'string') return undefined;
    const m = code.match(/م(\d+)-/);
    if (!m) return undefined;
    const v = Number(m[1]);
    return Number.isFinite(v) && v > 0 ? v : undefined;
  })();

  const enhancedKpis = kpis.length > 0
    ? kpis
    : buildAdvancedKpisForStandard(standard.title, standard.global_num, derivedAxisOrder);
  const enhancedDocuments = documents.length > 0
    ? documents
    : buildRequiredDocumentsForStandard(standard.title, derivedAxisOrder);
  
  return {
    ...standard,
    enhancedKpis,
    enhancedDocuments,
    kpiCount: enhancedKpis.length,
    documentCount: enhancedDocuments.length,
    hasEnhancedData: enhancedKpis.length > 0 || enhancedDocuments.length > 0
  };
}

// ===== دالة حساب نقاط المحور =====

function calculateAxisPerformance(axisOrder, standards) {
  const axisKpis = ENHANCED_AXIS_KPIS.find(k => k.axis_order === axisOrder)?.kpis || [];
  const axisStandards = standards.filter(s => s.axis_order === axisOrder);
  
  if (axisStandards.length === 0) return 0;
  
  let totalScore = 0;
  let totalWeight = 0;
  
  // حساب نقاط المعايير
  axisStandards.forEach(standard => {
    const kpis = parseJsonArray(standard.kpis);
    kpis.forEach(kpi => {
      if (typeof kpi === 'object' && kpi.weight) {
        // مؤقتاً - سيتم استبداله بالحساب الحقيقي بناءً على القيم الفعلية
        const score = standard.status === 'completed' ? 100 : 
                    standard.status === 'in_progress' ? 60 : 
                    standard.status === 'approved' ? 95 : 0;
        totalScore += score * kpi.weight;
        totalWeight += kpi.weight;
      }
    });
  });
  
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// ===== التصدير =====

export {
  EnhancedKpiDisplay,
  EnhancedDocumentsDisplay,
  EnhancedAxisCard,
  enhanceStandardsDisplay,
  calculateAxisPerformance
};
