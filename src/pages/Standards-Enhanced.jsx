/**
 * تحديث صفحة المعايير لاستخدام المؤشرات المحسنة
 * إضافة المؤشرات المتقدمة والعرض المحسّن
 */

import React, { useState, useCallback, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AXES_SEED, AXIS_SHORT_NAMES, AXIS_COUNTS, getAxisOrderFromStandardIndex } from '@/api/seedAxesAndStandards';
import { STANDARDS_CSV, AXIS_KPIS_CSV as AXIS_KPIS, OVERALL_CLASSIFICATION_KPI, getStandardCodeFromIndex, sortAndDeduplicateStandardsByCode, normalizeStandardCode } from '@/api/standardsFromCsv';

// استيراد المؤشرات المحسنة
import { buildAdvancedKpisForStandard, buildRequiredDocumentsForStandard, buildVerificationMethodsForStandard } from '@/api/enhancedKpis';
import { ENHANCED_AXIS_KPIS, calculateAxisScore, generateAxisPerformanceReport } from '@/api/enhancedAxisKpis';
import { generateVerificationReport, verifyDocumentCompleteness } from '@/api/verificationGuide';
import { buildIntegratedStandardsData, generateIntegratedPerformanceReport } from '@/api/integratedKpis';

import { createAxesSelectFunction } from '@/lib/axesSort';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Target, Upload, FileText, Image, Check, X, Eye, Loader2, Trash2, Edit3, BarChart3, ChevronDown, ChevronUp, TrendingUp, Users, Award, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

function parseJsonArray(str, fallback = []) {
  if (!str) return fallback;
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const statusConfig = {
  not_started: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  approved: { label: 'معتمد', color: 'bg-purple-100 text-purple-700' }
};

/** إجمالي المعايير حسب مرجع المعايير (9 محاور، 80 معياراً) */
const REFERENCE_TOTAL_STANDARDS = STANDARDS_CSV.length;

function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  return list.length === 0 ? 'أدلة ومستندات تدعم تحقيق المعيار' : 'أدلة مطلوبة: ' + list.join('، ');
}

// ===== مكونات المؤشرات المحسنة =====

function KpiIndicator({ kpi, value, showProgress = true }) {
  const getScore = () => {
    if (!value || value === 'غير متوفر') return 0;
    
    if (kpi.unit === '%') {
      const target = parseFloat(kpi.target.replace('%', ''));
      const actual = parseFloat(value.replace('%', ''));
      return Math.min((actual / target) * 100, 100);
    }
    
    if (kpi.scale) {
      const targetIndex = kpi.scale.indexOf(kpi.target);
      const actualIndex = kpi.scale.indexOf(value);
      if (actualIndex >= targetIndex) return 100;
      return (actualIndex / targetIndex) * 100;
    }
    
    if (kpi.unit === 'شخص' || kpi.unit === 'جهة' || kpi.unit === 'مشروع') {
      const target = parseFloat(kpi.target);
      const actual = parseFloat(value);
      return Math.min((actual / target) * 100, 100);
    }
    
    return value === kpi.target ? 100 : 50;
  };

  const score = getScore();
  const getStatusColor = () => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (score >= 90) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-blue-600" />;
    if (score >= 50) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <X className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{kpi.name}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {kpi.category}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">القيمة:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {value || 'غير متوفر'}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">الهدف:</span>
          <span className="font-medium">{kpi.target}</span>
        </div>
        
        {showProgress && (
          <div>
            <Progress value={score} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>الإنجاز: {Math.round(score)}%</span>
              <span>الوزن: {Math.round(kpi.weight * 100)}%</span>
            </div>
          </div>
        )}
        
        {kpi.description && (
          <p className="text-xs text-gray-500 mt-2">{kpi.description}</p>
        )}
      </div>
    </div>
  );
}

function StandardKpisCard({ standard, kpis, values = {} }) {
  const enhancedKpis = kpis.length > 0 ? kpis : buildAdvancedKpisForStandard(standard.title, standard.global_num, standard.axis_order);
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" />
          مؤشرات الأداء المحسنة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enhancedKpis.map((kpi, index) => (
            <KpiIndicator
              key={index}
              kpi={kpi}
              value={values[kpi.name]}
              showProgress={true}
            />
          ))}
        </div>
        
        {enhancedKpis.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد مؤشرات أداء محددة لهذا المعيار</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AxisPerformanceCard({ axis, standards }) {
  const axisKpis = ENHANCED_AXIS_KPIS.find(k => k.axis_order === axis.order)?.kpis || [];
  
  // حساب النتيجة الإجمالية للمحور
  const calculateAxisScore = () => {
    if (standards.length === 0) return 0;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    standards.forEach(standard => {
      const kpis = parseJsonArray(standard.kpis);
      kpis.forEach(kpi => {
        if (typeof kpi === 'object' && kpi.weight) {
          const score = Math.random() * 100; // مؤقتاً - سيتم استبداله بالحساب الحقيقي
          totalScore += score * kpi.weight;
          totalWeight += kpi.weight;
        }
      });
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  };
  
  const score = calculateAxisScore();
  const completedStandards = standards.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const progress = standards.length > 0 ? (completedStandards / standards.length) * 100 : 0;
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{axis.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{axis.description}</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {standards.length} معيار
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">مستوى الإنجاز</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">نقاط الأداء</span>
              <span className={`font-medium ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {Math.round(score)}/100
              </span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{completedStandards} مكتمل</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{standards.length - completedStandards} متبقي</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VerificationStatusCard({ standard, documents = [] }) {
  const verificationReport = generateVerificationReport(standard.code, documents, []);
  const documentStatus = verifyDocumentCompleteness(standard.code, documents);
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5" />
          حالة التحقق والمستندات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">اكتمال المستندات</span>
            <Badge variant={documentStatus.completeness >= 80 ? 'default' : 'secondary'}>
              {documentStatus.completeness}%
            </Badge>
          </div>
          
          <Progress value={documentStatus.completeness} className="h-2" />
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {documentStatus.status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : documentStatus.status === 'partial' ? (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              ) : (
                <X className="w-4 h-4 text-red-600" />
              )}
              <span>
                {documentStatus.completed} من {documentStatus.total} مستند مكتمل
              </span>
            </div>
            
            {documentStatus.missing.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">المستندات المفقودة:</p>
                <ul className="list-disc list-inside space-y-1">
                  {documentStatus.missing.slice(0, 3).map((doc, index) => (
                    <li key={index} className="text-xs">{doc.name}</li>
                  ))}
                  {documentStatus.missing.length > 3 && (
                    <li className="text-xs">و {documentStatus.missing.length - 3} مستندات أخرى...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Standards() {
  const [activeAxis, setActiveAxis] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [axisFormOpen, setAxisFormOpen] = useState(false);
  const [standardFormOpen, setStandardFormOpen] = useState(false);
  const [evidenceFormOpen, setEvidenceFormOpen] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [editStandard, setEditStandard] = useState(null);
  const [editDocuments, setEditDocuments] = useState([]);
  const [editKpis, setEditKpis] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showKpis, setShowKpis] = useState({});
  const [showVerification, setShowVerification] = useState({});
  
  const [axisForm, setAxisForm] = useState({ name: '', description: '', order: 0 });
  const [standardForm, setStandardForm] = useState({ code: '', title: '', description: '', axis_id: '', required_evidence: '' });
  const [evidenceForm, setEvidenceForm] = useState({ title: '', description: '', file: null });

  const queryClient = useQueryClient();
  const { canManage } = usePermissions();
  const currentUser = api.auth.user();
  const currentMember = api.auth.member();

  // Queries
  const { data: axes = [], isLoading: loadingAxes } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list()
  });

  const { data: standards = [], isLoading: loadingStandards } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => api.entities.Evidence.list()
  });

  // Mutations
  const createAxisMutation = useMutation({
    mutationFn: (data) => api.entities.Axis.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['axes'] })
  });

  const createStandardMutation = useMutation({
    mutationFn: (data) => api.entities.Standard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards'] });
      queryClient.invalidateQueries({ queryKey: ['axes'] });
    }
  });

  const updateStandardMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Standard.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['standards'] })
  });

  const createEvidenceMutation = useMutation({
    mutationFn: (data) => api.entities.Evidence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['standards'] });
    }
  });

  const updateEvidenceMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Evidence.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  const deleteEvidenceMutation = useMutation({
    mutationFn: (id) => api.entities.Evidence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['standards'] });
    }
  });

  // Computed values
  const filteredStandards = useCallback(() => {
    let list = standards;
    
    if (activeAxis !== 'all') {
      list = list.filter(s => s.axis_id === activeAxis);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.title?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.code?.toLowerCase().includes(query)
      );
    }
    
    // تصفية المعايير لضمان ظهورها في المحور الصحيح فقط
    list = list.filter(standard => {
      const match = standard.code?.match(/^م(\d+)-(\d+)$/);
      if (!match) return true;
      
      const [, axisNum] = match;
      const axisOrder = parseInt(axisNum);
      
      const activeAxisOrder = activeAxis === 'all' 
        ? null 
        : axes.find(a => a.id === activeAxis)?.order;
      
      return activeAxisOrder === null || axisOrder === activeAxisOrder;
    });
    
    // ترتيب المعايير حسب الرقم داخل المحور
    if (list.length > 0) {
      list = list.sort((a, b) => {
        const extractNumbers = (code) => {
          const match = code?.match(/^م(\d+)-(\d+)$/);
          return match ? [parseInt(match[1]), parseInt(match[2])] : [0, 0];
        };
        
        const [axisA, numA] = extractNumbers(a.code);
        const [axisB, numB] = extractNumbers(b.code);
        
        if (axisA !== axisB) return axisA - axisB;
        return numA - numB;
      });
    }
    
    return sortAndDeduplicateStandardsByCode(list);
  }, [standards, activeAxis, searchQuery, axes]);

  const getAxisProgress = (axisId) => {
    const axis = axes.find(a => a.id === axisId);
    const order = axis?.order ?? 0;
    const expectedCount = (order >= 1 && order <= AXIS_COUNTS.length) ? AXIS_COUNTS[order - 1] : 1;
    const completed = standards.filter(s => s.axis_id === axisId && (s.status === 'completed' || s.status === 'approved')).length;
    return expectedCount > 0 ? Math.round((completed / expectedCount) * 100) : 0;
  };

  const handleSaveAxis = async (e) => {
    e.preventDefault();
    await createAxisMutation.mutateAsync(axisForm);
    setAxisFormOpen(false);
    setAxisForm({ name: '', description: '', order: axes.length + 1 });
  };

  const handleSaveStandard = async (e) => {
    e.preventDefault();
    const axis = axes.find(a => a.id === standardForm.axis_id);
    await createStandardMutation.mutateAsync({
      ...standardForm,
      axis_name: axis?.name || '',
      status: 'not_started'
    });
    setStandardFormOpen(false);
    setStandardForm({ code: '', title: '', description: '', axis_id: '', required_evidence: '' });
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceForm.file || !selectedStandard) return;

    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file: evidenceForm.file });
    
    const fileType = evidenceForm.file.type.startsWith('image/') ? 'image' : 'document';
    
    await createEvidenceMutation.mutateAsync({
      title: evidenceForm.title,
      description: evidenceForm.description,
      file_url,
      file_type: fileType,
      standard_id: selectedStandard.id,
      standard_code: selectedStandard.code,
      axis_id: selectedStandard.axis_id,
      uploaded_by_name: currentUser?.full_name || currentMember?.full_name,
      status: 'pending'
    });

    if (selectedStandard.status === 'not_started') {
      await updateStandardMutation.mutateAsync({
        id: selectedStandard.id,
        data: { status: 'in_progress' }
      });
    }

    setUploading(false);
    setEvidenceFormOpen(false);
    setEvidenceForm({ title: '', description: '', file: null });
  };

  const handleApproveEvidence = async (evidenceItem) => {
    await updateEvidenceMutation.mutateAsync({
      id: evidenceItem.id,
      data: {
        status: 'approved',
        approved_by: currentUser?.full_name,
        approved_at: new Date().toISOString()
      }
    });
  };

  const handleRejectEvidence = async (evidenceItem, reason) => {
    await updateEvidenceMutation.mutateAsync({
      id: evidenceItem.id,
      data: { status: 'rejected', rejection_reason: reason }
    });
  };

  const getStandardEvidence = (standardId) => evidence.filter(e => e.standard_id === standardId);

  const activeAxisEntity = activeAxis !== 'all' ? axes.find(a => a.id === activeAxis) : null;
  const pageTitle = activeAxisEntity
    ? ((activeAxisEntity.order >= 1 && activeAxisEntity.order <= AXIS_SHORT_NAMES.length)
        ? AXIS_SHORT_NAMES[activeAxisEntity.order - 1]
        : activeAxisEntity.name)
    : 'جميع المحاور';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">المعايير والمؤشرات</h1>
          <p className="text-gray-600 mt-1">{pageTitle}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في المعايير..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-64"
            />
          </div>
          {canManage && (
            <Button onClick={() => setStandardFormOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              معيار جديد
            </Button>
          )}
        </div>
      </div>

      {/* Axis Tabs */}
      <div>
        <div className="flex gap-2 pb-2">
          <Button
            variant={activeAxis === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveAxis('all')}
            className="whitespace-nowrap"
          >
            جميع المحاور ({REFERENCE_TOTAL_STANDARDS})
          </Button>
          {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(axis => {
            const order = axis.order ?? 0;
            const tabLabel = (order >= 1 && order <= AXIS_SHORT_NAMES.length) ? AXIS_SHORT_NAMES[order - 1] : axis.name;
            const count = (order >= 1 && order <= AXIS_COUNTS.length) ? AXIS_COUNTS[order - 1] : 0;
            return (
              <Button
                key={axis.id}
                variant={activeAxis === axis.id ? 'default' : 'outline'}
                onClick={() => setActiveAxis(axis.id)}
                className="whitespace-nowrap"
              >
                {tabLabel} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Enhanced Axis Progress Cards */}
      {activeAxis === 'all' && axes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(axis => {
            const axisStandards = standards.filter(s => s.axis_id === axis.id);
            return (
              <AxisPerformanceCard
                key={axis.id}
                axis={axis}
                standards={axisStandards}
              />
            );
          })}
        </div>
      )}

      {/* Standards List */}
      {loadingStandards ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        </div>
      ) : filteredStandards.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد معايير</p>
            {canManage && (
              <Button variant="outline" className="mt-4" onClick={() => setStandardFormOpen(true)}>
                إضافة معيار جديد
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredStandards.map(standard => {
            const standardEvidence = getStandardEvidence(standard.id);
            const approvedEvidence = standardEvidence.filter(e => e.status === 'approved').length;
            const enhancedKpis = buildAdvancedKpisForStandard(standard.title, standard.global_num, standard.axis_order);
            const requiredDocuments = buildRequiredDocumentsForStandard(standard.title, standard.axis_order);
            
            return (
              <Card key={standard.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="font-mono">{standard.code}</Badge>
                        <Badge className={statusConfig[standard.status]?.color}>
                          {statusConfig[standard.status]?.label}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-xl mb-2">{standard.title}</h3>
                      {standard.description && (
                        <p className="text-gray-600 mb-4">{standard.description}</p>
                      )}
                      
                      {/* Enhanced KPIs Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            مؤشرات الأداء المحسنة
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowKpis(prev => ({ ...prev, [standard.id]: !prev[standard.id] }))}
                          >
                            {showKpis[standard.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        {showKpis[standard.id] && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {enhancedKpis.slice(0, 4).map((kpi, index) => (
                              <KpiIndicator
                                key={index}
                                kpi={kpi}
                                value={'غير متوفر'} // سيتم استبداله بالقيم الفعلية
                                showProgress={true}
                              />
                            ))}
                          </div>
                        )}
                        
                        {!showKpis[standard.id] && (
                          <div className="flex flex-wrap gap-2">
                            {enhancedKpis.slice(0, 3).map((kpi, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {kpi.name}: {kpi.target}
                              </Badge>
                            ))}
                            {enhancedKpis.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{enhancedKpis.length - 3} مؤشرات أخرى
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Required Documents Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            المستندات المطلوبة
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowVerification(prev => ({ ...prev, [standard.id]: !prev[standard.id] }))}
                          >
                            {showVerification[standard.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        {showVerification[standard.id] ? (
                          <div className="space-y-2 mb-4">
                            {requiredDocuments.slice(0, 5).map((doc, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                <FileText className="w-4 h-4" />
                                <span>{doc.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.type}
                                </Badge>
                              </div>
                            ))}
                            {requiredDocuments.length > 5 && (
                              <p className="text-sm text-gray-500">
                                و {requiredDocuments.length - 5} مستندات أخرى...
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {requiredDocuments.slice(0, 3).map((doc, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {doc.name}
                              </Badge>
                            ))}
                            {requiredDocuments.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{requiredDocuments.length - 3} مستندات
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500 border-t pt-4">
                        <span>المحور: {standard.axis_name}</span>
                        <span>الأدلة: {approvedEvidence}/{standardEvidence.length}</span>
                        <span>المؤشرات: {enhancedKpis.length}</span>
                        <span>المستندات: {requiredDocuments.length}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap lg:flex-col">
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditStandard(standard);
                            setEditDocuments(parseJsonArray(standard.required_documents));
                            setEditKpis(parseJsonArray(standard.kpis).map(k => typeof k === 'object' ? { name: k.name ?? '', target: k.target ?? '', unit: k.unit ?? '' } : { name: String(k), target: '', unit: '' }));
                          }}
                        >
                          <Edit3 className="w-4 h-4 ml-2" />
                          تعديل
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStandard(standard);
                          setEvidenceFormOpen(true);
                        }}
                      >
                        <Upload className="w-4 h-4 ml-2" />
                        رفع دليل
                      </Button>
                    </div>
                  </div>
                  
                  {/* Evidence List */}
                  {standardEvidence.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3">الأدلة المرفوعة</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {standardEvidence.map(evidence => (
                          <Card key={evidence.id} className="relative">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-sm">{evidence.title}</h5>
                                <Badge variant={evidence.status === 'approved' ? 'default' : evidence.status === 'rejected' ? 'destructive' : 'secondary'}>
                                  {evidence.status === 'approved' ? 'معتمد' : evidence.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                </Badge>
                              </div>
                              
                              {evidence.description && (
                                <p className="text-sm text-gray-600 mb-2">{evidence.description}</p>
                              )}
                              
                              {evidence.file_type === 'image' ? (
                                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                  <Image className="w-8 h-8 text-gray-400" />
                                </div>
                              ) : (
                                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                              
                              <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                                <span>بواسطة: {evidence.uploaded_by_name}</span>
                                <span>{new Date(evidence.created_at).toLocaleDateString('ar-SA')}</span>
                              </div>
                              
                              {canManage && evidence.status === 'pending' && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApproveEvidence(evidence)}
                                  >
                                    <Check className="w-3 h-3 ml-1" />
                                    اعتماد
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectEvidence(evidence, 'غير مطابق للمتطلبات')}
                                  >
                                    <X className="w-3 h-3 ml-1" />
                                    رفض
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {/* Axis Form Dialog */}
      <Dialog open={axisFormOpen} onOpenChange={setAxisFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة محور جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAxis} className="space-y-4">
            <div>
              <Label htmlFor="axis-name">اسم المحور</Label>
              <Input
                id="axis-name"
                value={axisForm.name}
                onChange={(e) => setAxisForm({ ...axisForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="axis-description">وصف المحور</Label>
              <Textarea
                id="axis-description"
                value={axisForm.description}
                onChange={(e) => setAxisForm({ ...axisForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="axis-order">الترتيب</Label>
              <Input
                id="axis-order"
                type="number"
                value={axisForm.order}
                onChange={(e) => setAxisForm({ ...axisForm, order: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAxisFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">
                إضافة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standard Form Dialog */}
      <Dialog open={standardFormOpen} onOpenChange={setStandardFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة معيار جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStandard} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="standard-code">رمز المعيار</Label>
                <Input
                  id="standard-code"
                  value={standardForm.code}
                  onChange={(e) => setStandardForm({ ...standardForm, code: e.target.value })}
                  placeholder="م1-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="standard-axis">المحور</Label>
                <Select value={standardForm.axis_id} onValueChange={(value) => setStandardForm({ ...standardForm, axis_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحور" />
                  </SelectTrigger>
                  <SelectContent>
                    {axes.map(axis => (
                      <SelectItem key={axis.id} value={axis.id}>
                        {axis.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="standard-title">عنوان المعيار</Label>
              <Input
                id="standard-title"
                value={standardForm.title}
                onChange={(e) => setStandardForm({ ...standardForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="standard-description">وصف المعيار</Label>
              <Textarea
                id="standard-description"
                value={standardForm.description}
                onChange={(e) => setStandardForm({ ...standardForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="standard-evidence">الأدلة المطلوبة</Label>
              <Textarea
                id="standard-evidence"
                value={standardForm.required_evidence}
                onChange={(e) => setStandardForm({ ...standardForm, required_evidence: e.target.value })}
                rows={2}
                placeholder="صف الأدلة والمستندات المطلوبة لتحقيق هذا المعيار"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStandardFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">
                إضافة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Dialog */}
      <Dialog open={evidenceFormOpen} onOpenChange={setEvidenceFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفع دليل للمعيار: {selectedStandard?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadEvidence} className="space-y-4">
            <div>
              <Label htmlFor="evidence-title">عنوان الدليل</Label>
              <Input
                id="evidence-title"
                value={evidenceForm.title}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="evidence-description">وصف الدليل</Label>
              <Textarea
                id="evidence-description"
                value={evidenceForm.description}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="evidence-file">الملف</Label>
              <Input
                id="evidence-file"
                type="file"
                onChange={(e) => setEvidenceForm({ ...evidenceForm, file: e.target.files[0] })}
                required
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEvidenceFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    رفع
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
