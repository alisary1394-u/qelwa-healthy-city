/**
 * تحديث المؤشرات في صفحة المعايير الحالية
 * إضافة المؤشرات المحسنة مع الحفاظ على التوافق
 */

import React from 'react';
import { buildAdvancedKpisForStandard, buildRequiredDocumentsForStandard } from '@/api/enhancedKpis';
import { ENHANCED_AXIS_KPIS } from '@/api/enhancedAxisKpis';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, FileText, Target, Award, Clock, CheckCircle2 } from "lucide-react";

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

// ===== مكون مؤشر الأداء المحسّن =====

function EnhancedKpiDisplay({ standard, currentKpis = [] }) {
  // استخدام المؤشرات المحسنة إذا لم تكن هناك مؤشرات حالية
  const enhancedKpis = currentKpis.length > 0 ? currentKpis : buildAdvancedKpisForStandard(standard.title, standard.global_num, standard.axis_order);
  
  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h4 className="font-semibold text-blue-900">مؤشرات الأداء المحسنة</h4>
        <Badge variant="secondary" className="text-xs">
          {enhancedKpis.length} مؤشر
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {enhancedKpis.slice(0, 4).map((kpi, index) => (
          <div key={index} className="bg-white p-3 rounded border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{kpi.name}</span>
              <Badge variant="outline" className="text-xs">
                {kpi.category}
              </Badge>
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
          <Badge variant="outline" className="text-xs">
            +{enhancedKpis.length - 4} مؤشرات أخرى
          </Badge>
        </div>
      )}
    </div>
  );
}

// ===== مكون المستندات المطلوبة المحسّن =====

function EnhancedDocumentsDisplay({ standard, currentDocuments = [] }) {
  // استخدام المستندات المحسنة إذا لم تكن هناك مستندات حالية
  const enhancedDocuments = currentDocuments.length > 0 ? currentDocuments : buildRequiredDocumentsForStandard(standard.title, standard.axis_order);
  
  return (
    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-green-600" />
        <h4 className="font-semibold text-green-900">المستندات المطلوبة</h4>
        <Badge variant="secondary" className="text-xs">
          {enhancedDocuments.length} مستند
        </Badge>
      </div>
      
      <div className="space-y-2">
        {enhancedDocuments.slice(0, 5).map((doc, index) => (
          <div key={index} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
            <FileText className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <span className="text-sm font-medium">{doc.name}</span>
              {doc.type && (
                <Badge variant="outline" className="text-xs mr-2">
                  {doc.type}
                </Badge>
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
  );
}

// ===== مكون بطاقة المحور المحسّن =====

function EnhancedAxisCard({ axis, standards }) {
  // الحصول على مؤشرات المحور المحسنة
  const axisKpis = ENHANCED_AXIS_KPIS.find(k => k.axis_order === axis.order)?.kpis || [];
  
  // حساب الإحصائيات
  const completedStandards = standards.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const totalStandards = standards.length;
  const progress = totalStandards > 0 ? (completedStandards / totalStandards) * 100 : 0;
  
  // حساب نقاط الأداء (مؤقتاً)
  const performanceScore = Math.round(progress * 0.8 + Math.random() * 20); // سيتم استبداله بالحساب الحقيقي
  
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4" 
          style={{ borderLeftColor: axis.color || '#3B82F6' }}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">{axis.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{axis.description}</p>
          </div>
          <div className="text-left">
            <Badge variant="outline" className="mb-2">
              {totalStandards} معيار
            </Badge>
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
                <Target className="w-4 h-4" />
                مستوى الإنجاز
              </span>
              <span className={`font-bold ${progress >= 80 ? 'text-green-600' : progress >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* نقاط الأداء */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium flex items-center gap-1">
                <Award className="w-4 h-4" />
                نقاط الأداء
              </span>
              <span className={`font-bold ${performanceScore >= 80 ? 'text-green-600' : performanceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {performanceScore}/100
              </span>
            </div>
            <Progress value={performanceScore} className="h-2" />
          </div>
          
          {/* الإحصائات */}
          <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>{completedStandards} مكتمل</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>{totalStandards - completedStandards} متبقي</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-purple-600" />
              <span>{axisKpis.length} مؤشر</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== دالة تحديث عرض المعايير =====

function enhanceStandardsDisplay(standard, kpis = [], documents = []) {
  const enhancedKpis = kpis.length > 0 ? kpis : buildAdvancedKpisForStandard(standard.title, standard.global_num, standard.axis_order);
  const enhancedDocuments = documents.length > 0 ? documents : buildRequiredDocumentsForStandard(standard.title, standard.axis_order);
  
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

// ===== استخدام في Standards.jsx =====

/*
في ملف Standards.jsx، أضف الاستيرادات التالية:

import { 
  EnhancedKpiDisplay, 
  EnhancedDocumentsDisplay, 
  EnhancedAxisCard,
  enhanceStandardsDisplay,
  calculateAxisPerformance 
} from './Standards-Enhanced';

واستبدل عرض المحاور بـ:

{activeAxis === 'all' && axes.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
    {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(axis => {
      const axisStandards = standards.filter(s => s.axis_id === axis.id);
      return (
        <EnhancedAxisCard
          key={axis.id}
          axis={axis}
          standards={axisStandards}
        />
      );
    })}
  </div>
)}

وأضف عرض المؤشرات والمستندات المحسنة لكل معيار:

{(() => {
  const enhancedStandard = enhanceStandardsDisplay(standard, parseJsonArray(standard.kpis), parseJsonArray(standard.required_documents));
  
  return (
    <>
      {enhancedStandard.hasEnhancedData && (
        <>
          <EnhancedKpiDisplay 
            standard={enhancedStandard} 
            currentKpis={enhancedStandard.enhancedKpis}
          />
          <EnhancedDocumentsDisplay 
            standard={enhancedStandard} 
            currentDocuments={enhancedStandard.enhancedDocuments}
          />
        </>
      )}
    </>
  );
})()}
*/
