/**
 * تكامل المؤشرات المحسنة مع النظام الحالي
 * ملف التكامل الرئيسي لربط جميع التحسينات
 */

import { buildEnhancedStandards } from './enhancedStandards.js';
import { ENHANCED_AXIS_KPIS, calculateAxisScore, generateAxisPerformanceReport } from './enhancedAxisKpis.js';
import { generateVerificationReport, verifyDocumentCompleteness } from './verificationGuide.js';

/**
 * بناء بيانات المعايير المحسنة مع التكامل
 */
export function buildIntegratedStandardsData() {
  const enhancedStandards = buildEnhancedStandards();
  
  return enhancedStandards.map(standard => ({
    ...standard,
    
    // إضافة حقول إضافية للتكامل
    legacy_code: standard.code,
    legacy_title: standard.title,
    
    // بيانات الأداء
    performance_data: {
      current_score: 0,
      target_score: 80,
      last_assessment: null,
      next_assessment: calculateNextAssessmentDate(),
      trend: 'stable',
      priority_level: calculatePriorityLevel(standard.axis_order),
      risk_level: calculateRiskLevel(standard),
      
      // البيانات التاريخية
      historical_scores: [],
      assessment_frequency: getAssessmentFrequency(standard.axis_order),
      
      // مؤشرات الأداء المحددة
      kpi_values: {},
      kpi_targets: extractKpiTargets(standard.kpis),
      
      // التحقق والمستندات
      verification_status: 'pending',
      document_completeness: 0,
      last_verification: null,
      
      // الموارد والميزانية
      allocated_budget: 0,
      spent_budget: 0,
      required_resources: standard.required_resources,
      available_resources: {},
      
      // الجدولة والمسؤوليات
      implementation_start: null,
      implementation_end: null,
      assigned_teams: [],
      milestones: [],
      
      // المخاطر والتحديات
      risks: standard.challenges,
      mitigation_strategies: [],
      contingency_plans: []
    },
    
    // بيانات التكامل مع النظام القديم
    integration_data: {
      original_standard_id: null,
      migration_status: 'pending',
      data_quality_score: 0,
      last_sync: null,
      sync_errors: [],
      
      // التوافق مع الأنظمة الأخرى
      compatible_systems: ['localBackend', 'supabaseBackend'],
      api_endpoints: [],
      data_mappings: {}
    }
  }));
}

/**
 * حساب تاريخ التقييم التالي
 */
function calculateNextAssessmentDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 3, 1); // بعد 3 أشهر
}

/**
 * حساب مستوى الأولوية
 */
function calculatePriorityLevel(axisOrder) {
  if (axisOrder <= 2) return 'critical';
  if (axisOrder <= 5) return 'high';
  if (axisOrder <= 7) return 'medium';
  return 'low';
}

/**
 * حساب مستوى المخاطرة
 */
function calculateRiskLevel(standard) {
  let riskScore = 0;
  
  // المخاطر بناءً على المحور
  if (standard.axis_order === 5) riskScore += 3; // الصحة عالية المخاطر
  if (standard.axis_order === 4) riskScore += 2; // البيئة متوسطة المخاطر
  if (standard.axis_order === 6) riskScore += 2; // الطوارئ متوسطة المخاطر
  
  // المخاطر بناءً على الموارد المطلوبة
  const resourceCount = Object.keys(standard.required_resources).length;
  if (resourceCount > 4) riskScore += 2;
  if (resourceCount > 6) riskScore += 1;
  
  // المخاطر بناءً على التحديات
  const challengeCount = standard.challenges.length;
  if (challengeCount > 3) riskScore += 1;
  if (challengeCount > 5) riskScore += 1;
  
  if (riskScore >= 7) return 'high';
  if (riskScore >= 4) return 'medium';
  return 'low';
}

/**
 * الحصول على تكرار التقييم
 */
function getAssessmentFrequency(axisOrder) {
  if (axisOrder <= 3) return 'monthly';
  if (axisOrder <= 6) return 'quarterly';
  return 'semi-annual';
}

/**
 * استخراج أهداف المؤشرات
 */
function extractKpiTargets(kpis) {
  const targets = {};
  kpis.forEach(kpi => {
    targets[kpi.name] = kpi.target;
  });
  return targets;
}

/**
 * توليد تقرير أداء متكامل
 */
export function generateIntegratedPerformanceReport(standardCode, standardsData, actualValues) {
  const standard = standardsData.find(s => s.code === standardCode);
  if (!standard) return null;
  
  const axisKpis = ENHANCED_AXIS_KPIS.find(axis => axis.axis_order === standard.axis_order)?.kpis || [];
  
  // حساب أداء المعيار
  const standardScore = calculateAxisScore(standard.kpis, actualValues);
  
  // حساب أداء المحور
  const axisReport = generateAxisPerformanceReport(standard.axis_order, axisKpis, actualValues);
  
  // تقرير التحقق
  const verificationReport = generateVerificationReport(standardCode, [], []);
  
  return {
    standard_code: standardCode,
    standard_title: standard.title,
    axis_order: standard.axis_order,
    axis_name: standard.axis_name,
    
    // الأداء
    performance: {
      standard_score: Math.round(standardScore),
      axis_score: axisReport.overall_score,
      axis_status: axisReport.status,
      trend: calculateTrend(standard.performance_data.historical_scores),
      rank_in_axis: calculateRankInAxis(standardCode, standardsData),
      
      // المؤشرات
      kpi_performance: standard.kpis.map(kpi => ({
        name: kpi.name,
        target: kpi.target,
        actual: actualValues[kpi.name] || 'غير متوفر',
        score: calculateKpiScore(kpi, actualValues[kpi.name]),
        category: kpi.category,
        weight: kpi.weight
      })),
      
      // الأهداف والإنجازات
      achievements: extractAchievements(standard, actualValues),
      gaps: identifyGaps(standard, actualValues),
      recommendations: generateStandardRecommendations(standard, actualValues)
    },
    
    // التحقق والمستندات
    verification: verificationReport || {
      status: 'not_available',
      completeness: 0,
      recommendations: ['إعداد خطة التحقق والمستندات']
    },
    
    // الموارد
    resources: {
      required: standard.required_resources,
      available: standard.performance_data.available_resources,
      budget_utilization: {
        allocated: standard.performance_data.allocated_budget,
        spent: standard.performance_data.spent_budget,
        utilization_rate: calculateBudgetUtilization(standard)
      },
      staffing: {
        required: countRequiredStaff(standard),
        available: countAvailableStaff(standard),
        gap: calculateStaffingGap(standard)
      }
    },
    
    // الجدولة
    schedule: {
      implementation_start: standard.performance_data.implementation_start,
      implementation_end: standard.performance_data.implementation_end,
      milestones: standard.performance_data.milestones,
      next_assessment: standard.performance_data.next_assessment,
      critical_path: identifyCriticalPath(standard)
    },
    
    // المخاطر
    risks: {
      identified: standard.performance_data.risks,
      mitigation_strategies: standard.performance_data.mitigation_strategies,
      contingency_plans: standard.performance_data.contingency_plans,
      risk_matrix: generateRiskMatrix(standard)
    },
    
    // التكامل
    integration: {
      migration_status: standard.integration_data.migration_status,
      data_quality: standard.integration_data.data_quality_score,
      sync_status: checkSyncStatus(standard),
      compatibility: standard.integration_data.compatible_systems
    },
    
    // التاريخ
    generated_at: new Date().toISOString(),
    generated_by: 'enhanced_kpis_system',
    version: '1.0'
  };
}

/**
 * حساب الاتجاه (Trend)
 */
function calculateTrend(historicalScores) {
  if (historicalScores.length < 2) return 'stable';
  
  const recent = historicalScores.slice(-3);
  const average = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previous = historicalScores.slice(-6, -3);
  const previousAverage = previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : average;
  
  if (average > previousAverage + 5) return 'improving';
  if (average < previousAverage - 5) return 'declining';
  return 'stable';
}

/**
 * حساب ترتيب المعيار في المحور
 */
function calculateRankInAxis(standardCode, standardsData) {
  const axisOrder = parseInt(standardCode.split('-')[0].replace('م', ''));
  const axisStandards = standardsData.filter(s => s.axis_order === axisOrder);
  
  axisStandards.sort((a, b) => b.performance_data.current_score - a.performance_data.current_score);
  
  return axisStandards.findIndex(s => s.code === standardCode) + 1;
}

/**
 * حساب نتيجة المؤشر الفردي
 */
function calculateKpiScore(kpi, actualValue) {
  if (!actualValue || actualValue === 'غير متوفر') return 0;
  
  if (kpi.unit === '%') {
    const target = parseFloat(kpi.target.replace('%', ''));
    const actual = parseFloat(actualValue.replace('%', ''));
    return Math.min((actual / target) * 100, 100);
  }
  
  if (kpi.scale) {
    const targetIndex = kpi.scale.indexOf(kpi.target);
    const actualIndex = kpi.scale.indexOf(actualValue);
    if (actualIndex >= targetIndex) return 100;
    return (actualIndex / targetIndex) * 100;
  }
  
  if (kpi.unit === 'شخص' || kpi.unit === 'جهة' || kpi.unit === 'مشروع') {
    const target = parseFloat(kpi.target);
    const actual = parseFloat(actualValue);
    return Math.min((actual / target) * 100, 100);
  }
  
  // للمؤشرات النوعية
  return actualValue === kpi.target ? 100 : 50;
}

/**
 * استخراج الإنجازات
 */
function extractAchievements(standard, actualValues) {
  const achievements = [];
  
  standard.kpis.forEach(kpi => {
    const actual = actualValues[kpi.name];
    if (actual && calculateKpiScore(kpi, actual) >= 80) {
      achievements.push({
        kpi: kpi.name,
        achievement: `تحقيق هدف ${kpi.name}: ${actual} (المستهدف: ${kpi.target})`,
        score: calculateKpiScore(kpi, actual)
      });
    }
  });
  
  return achievements;
}

/**
 * تحديد الفجوات
 */
function identifyGaps(standard, actualValues) {
  const gaps = [];
  
  standard.kpis.forEach(kpi => {
    const actual = actualValues[kpi.name];
    if (!actual || calculateKpiScore(kpi, actual) < 70) {
      gaps.push({
        kpi: kpi.name,
        gap: `فجوة في ${kpi.name}: ${actual || 'غير متوفر'} (المستهدف: ${kpi.target})`,
        severity: calculateKpiScore(kpi, actual) < 50 ? 'critical' : 'moderate',
        score: calculateKpiScore(kpi, actual)
      });
    }
  });
  
  return gaps;
}

/**
 * توليد توصيات المعيار
 */
function generateStandardRecommendations(standard, actualValues) {
  const recommendations = [];
  const gaps = identifyGaps(standard, actualValues);
  
  gaps.forEach(gap => {
    if (gap.severity === 'critical') {
      recommendations.push(`إجراء فوري لسد فجوة ${gap.kpi}`);
    } else {
      recommendations.push(`تحسين أداء ${gap.kpi}`);
    }
  });
  
  // توصيات إضافية بناءً على الموارد
  if (Object.keys(standard.required_resources).length > 4) {
    recommendations.push('إعادة تقييم الموارد المطلوبة وتحسين تخصيصها');
  }
  
  // توصيات بناءً على المخاطر
  if (standard.challenges.length > 3) {
    recommendations.push('تطوير استراتيجيات مواجهة للتحديات المتعددة');
  }
  
  return recommendations;
}

/**
 * حساب استغلال الميزانية
 */
function calculateBudgetUtilization(standard) {
  const allocated = standard.performance_data.allocated_budget || 0;
  const spent = standard.performance_data.spent_budget || 0;
  
  return allocated > 0 ? (spent / allocated) * 100 : 0;
}

/**
 * حساب عدد الموظفين المطلوبين
 */
function countRequiredStaff(standard) {
  return standard.required_resources.human?.length || 0;
}

/**
 * حساب عدد الموظفين المتاحين
 */
function countAvailableStaff(standard) {
  return Object.keys(standard.performance_data.available_resources).length || 0;
}

/**
 * حساب فجوة الموظفين
 */
function calculateStaffingGap(standard) {
  const required = countRequiredStaff(standard);
  const available = countAvailableStaff(standard);
  return Math.max(0, required - available);
}

/**
 * تحديد المسار الحرج
 */
function identifyCriticalPath(standard) {
  return standard.performance_data.milestones.filter(m => m.critical === true);
}

/**
 * توليد مصفوفة المخاطر
 */
function generateRiskMatrix(standard) {
  return standard.performance_data.risks.map(risk => ({
    risk: risk,
    probability: assessRiskProbability(risk),
    impact: assessRiskImpact(risk),
    severity: calculateRiskSeverity(risk),
    mitigation: standard.performance_data.mitigation_strategies.find(m => m.risk === risk)
  }));
}

/**
 * تقييم احتمالية المخاطرة
 */
function assessRiskProbability(risk) {
  // منطق تقييم احتمالية المخاطرة
  const highProbabilityRisks = ['نقص الموارد', 'مقاومة التغيير'];
  return highProbabilityRisks.includes(risk) ? 'high' : 'medium';
}

/**
 * تقييم تأثير المخاطرة
 */
function assessRiskImpact(risk) {
  // منطق تقييم تأثير المخاطرة
  const highImpactRisks = ['نقص الموارد', 'صعوبة التنسيق'];
  return highImpactRisks.includes(risk) ? 'high' : 'medium';
}

/**
 * حساب شدة المخاطرة
 */
function calculateRiskSeverity(risk) {
  const probability = assessRiskProbability(risk);
  const impact = assessRiskImpact(risk);
  
  if (probability === 'high' && impact === 'high') return 'critical';
  if (probability === 'high' || impact === 'high') return 'high';
  return 'medium';
}

/**
 * فحص حالة المزامنة
 */
function checkSyncStatus(standard) {
  return standard.integration_data.last_sync ? 
    new Date() - new Date(standard.integration_data.last_sync) < 86400000 : // 24 ساعة
    'out_of_sync';
}

// ===== التصدير =====

export {
  buildIntegratedStandardsData,
  generateIntegratedPerformanceReport,
  calculateAxisScore,
  generateAxisPerformanceReport,
  generateVerificationReport,
  verifyDocumentCompleteness
};

export default {
  buildIntegratedStandardsData,
  generateIntegratedPerformanceReport,
  ENHANCED_AXIS_KPIS
};
