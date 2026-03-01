import React, { useState, useCallback, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AXES_SEED, AXIS_SHORT_NAMES, AXIS_COUNTS, getAxisOrderFromStandardIndex } from '@/api/seedAxesAndStandards';
import { STANDARDS_CSV, AXIS_KPIS_CSV as AXIS_KPIS, OVERALL_CLASSIFICATION_KPI, getStandardCodeFromIndex, sortAndDeduplicateStandardsByCode, normalizeStandardCode } from '@/api/standardsFromCsv';
import { createAxesSelectFunction } from '@/lib/axesSort';
import { usePermissions } from '@/hooks/usePermissions';
import { createPageUrl } from '@/utils';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';

import StandardsEnhanced from './Standards-Enhanced';

import StandardKPIManager from '@/components/standards/StandardKPIManager';

// استيراد المؤشرات المحسنة (النسخة المبسطة)
import { 
  EnhancedKpiDisplay, 
  EnhancedDocumentsDisplay, 
  EnhancedAxisCard,
  enhanceStandardsDisplay,
  calculateAxisPerformance 
} from '@/components/EnhancedStandardsDisplay-Simple';

function parseJsonArray(str, fallback = []) {
  if (!str) return fallback;
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const INITIATIVE_PREFILL_STORAGE_KEY = 'initiative_prefill_from_standard';

function parseRelatedStandardIds(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (item == null) return [];
        if (typeof item === 'string' || typeof item === 'number') return [String(item)];
        if (typeof item === 'object') {
          return [
            item.id,
            item.standard_id,
            item.standard_code,
            item.code,
          ]
            .filter(Boolean)
            .map((v) => String(v));
        }
        return [];
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parseRelatedStandardIds(parsed);
    } catch {
      // not JSON, continue to CSV fallback
    }
    return text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => String(item));
  }
  return [];
}

function getInitiativeSuggestionFromStandard(standard, axisName) {
  const title = String(standard?.title || '').trim();
  const code = String(standard?.code || '').trim();
  const axisLabel = axisName || standard?.axis_name || 'المحور المرتبط';
  const impactful = /سلامة|جودة|طوارئ|حوكمة|وقاية|مخاطر/i.test(title);

  return {
    standard_id: standard?.id,
    standard_code: code,
    title: `مبادرة تحسين ${title || code || 'المعيار'}`,
    description: `برنامج تنفيذي لرفع مستوى الامتثال لمتطلبات ${code ? `المعيار ${code}` : 'المعيار'} ضمن ${axisLabel}.`,
    objectives: `1) إغلاق فجوات ${code || 'المعيار'}\n2) رفع جودة التنفيذ والالتزام\n3) توثيق الإنجاز بالأدلة المطلوبة`,
    priority: impactful ? 'high' : 'medium',
    impact_level: impactful ? 'high' : 'medium',
    estimated_budget: impactful ? 120000 : 70000,
    expected_beneficiaries: impactful ? 800 : 400,
    target_audience: 'المستفيدون من خدمات المدينة الصحية',
    notes: `مبادرة مقترحة تلقائياً بناءً على ${code ? `المعيار ${code}` : 'المعيار المحدد'}.`,
  };
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

function StandardsLegacy() {
  const [activeAxis, setActiveAxis] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLinkedSections, setExpandedLinkedSections] = useState({});
  const [axisFormOpen, setAxisFormOpen] = useState(false);
  const [standardFormOpen, setStandardFormOpen] = useState(false);
  const [evidenceFormOpen, setEvidenceFormOpen] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [axisForm, setAxisForm] = useState({ name: '', description: '', order: 1 });
  const [standardForm, setStandardForm] = useState({ code: '', title: '', description: '', axis_id: '', required_evidence: '' });
  const [evidenceForm, setEvidenceForm] = useState({ title: '', description: '', file: null });
  const [editStandardOpen, setEditStandardOpen] = useState(false);
  const [editStandard, setEditStandard] = useState(null);
  const [editDocuments, setEditDocuments] = useState([]);
  const [editKpis, setEditKpis] = useState([]);
  const [showResultTable, setShowResultTable] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: axes = [], isLoading: loadingAxes } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list('order'),
    select: (data) => {
      if (!Array.isArray(data)) return [];
      const sortedAxes = [...data].sort((a, b) => {
        const orderA = Number(a.order) || 0;
        const orderB = Number(b.order) || 0;
        if (orderA < 1 || orderA > 9) return 1;
        if (orderB < 1 || orderB > 9) return -1;
        return orderA - orderB;
      });
      return sortedAxes.filter(axis => {
        const order = Number(axis.order);
        return order >= 1 && order <= 9;
      });
    }
  });

  const { data: standards = [], isLoading: loadingStandards } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list('code')
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => api.entities.Evidence.list('-created_date')
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: initiatives = [] } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => api.entities.Initiative.list('-created_date')
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.entities.Budget.list('-created_date')
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => api.entities.BudgetAllocation.list()
  });

  const { permissions, isGovernor } = usePermissions();
  const canManageStandards = permissions.canManageStandards;

  const createAxisMutation = useMutation({
    mutationFn: (data) => api.entities.Axis.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['axes'] })
  });

  const createStandardMutation = useMutation({
    mutationFn: (data) => api.entities.Standard.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['standards'] })
  });

  const updateStandardMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Standard.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['standards'] })
  });

  const reseedAxesStandardsMutation = useMutation({
    mutationFn: async () => {
      if (typeof api.clearAxesAndStandardsAndReseed === 'function') {
        await Promise.resolve(api.clearAxesAndStandardsAndReseed());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['axes'] });
      queryClient.invalidateQueries({ queryKey: ['standards'] });
    }
  });

  const createEvidenceMutation = useMutation({
    mutationFn: (data) => api.entities.Evidence.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  const updateEvidenceMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Evidence.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  const deleteEvidenceMutation = useMutation({
    mutationFn: (id) => api.entities.Evidence.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  const currentMember = members.find(m => m.email === currentUser?.email);
  const canManage = canManageStandards;
  const canApprove = permissions.canApproveEvidence;
  const canDeleteAnyEvidence = Boolean(isGovernor);
  const isSectionExpanded = (standardId, section) => {
    const key = `${standardId}:${section}`;
    return expandedLinkedSections[key] === true;
  };
  const toggleSectionExpanded = (standardId, section) => {
    const key = `${standardId}:${section}`;
    setExpandedLinkedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const isPendingEvidenceStatus = (status) => {
    if (!status) return true;
    return typeof status === 'string' && status.startsWith('pending');
  };

  const resolveBudgetLinkForStandard = (standard) => {
    const activeBudget = budgets.find((b) => b.status === 'active') || budgets.find((b) => b.status === 'draft') || budgets[0];
    const matchedAllocation = allocations.find((allocation) => {
      if (!activeBudget || String(allocation.budget_id || '') !== String(activeBudget.id)) return false;
      const committeeMatch = standard?.committee_id && String(allocation.committee_id || '') === String(standard.committee_id);
      const axisMatch = standard?.axis_id && String(allocation.axis_id || '') === String(standard.axis_id);
      return committeeMatch || axisMatch;
    });

    const allocationCommitteeId = matchedAllocation?.committee_id;
    const allocationCommitteeName = allocationCommitteeId
      ? committees.find((committee) => String(committee.id) === String(allocationCommitteeId))?.name
      : '';

    return {
      budget_id: matchedAllocation?.budget_id || activeBudget?.id || null,
      budget_name: matchedAllocation?.budget_name || activeBudget?.name || null,
      budget_allocation_id: matchedAllocation?.id || null,
      budget_allocation_category: matchedAllocation?.category || null,
      committee_id: standard?.committee_id || allocationCommitteeId || '',
      committee_name: standard?.committee_name || allocationCommitteeName || '',
    };
  };

  const handleCreateSuggestedInitiativeForStandard = (standard) => {
    if (!standard?.id) return;
    const suggestion = getInitiativeSuggestionFromStandard(standard, standard.axis_name);
    const budgetLink = resolveBudgetLinkForStandard(standard);
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 90);

    const prefillPayload = {
      title: suggestion.title,
      description: suggestion.description,
      objectives: suggestion.objectives,
      priority: suggestion.priority,
      impact_level: suggestion.impact_level,
      budget: suggestion.estimated_budget,
      expected_beneficiaries: suggestion.expected_beneficiaries,
      target_audience: suggestion.target_audience,
      notes: suggestion.notes,
      axis_id: standard.axis_id || '',
      axis_name: standard.axis_name || '',
      standard_id: standard.id,
      standard_code: standard.code || '',
      standard_title: standard.title || '',
      related_standards: [String(standard.id)],
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      ...budgetLink,
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(INITIATIVE_PREFILL_STORAGE_KEY, JSON.stringify(prefillPayload));
        window.location.href = createPageUrl('Initiatives');
      }
    } catch (err) {
      if (typeof window !== 'undefined') window.alert(`تعذر فتح نموذج المبادرة المقترحة.\n${err?.message || err}`);
    }
  };

  if (!permissions.canSeeStandards) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة المعايير. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // فلترة ثم ترتيب حسب الترقيم المرجعي (م1-1 … م9-7) وإزالة التكرار — نفس المنطق لجميع المحاور بما فيها 4، 7، 8، 9
  const filteredStandards = (() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    const hasSearch = query.length > 0;
    const list = standards.filter(s => {
      const matchesSearch = !hasSearch ||
        (String(s?.title || '').toLowerCase().includes(query)) ||
        (String(s?.code || '').toLowerCase().includes(query)) ||
        (String(s?.description || '').toLowerCase().includes(query)) ||
        (String(s?.axis_name || '').toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // عند وجود بحث نصي، نبحث في كل المحاور
      if (hasSearch) return true;
      
      const matchesAxis = activeAxis === 'all' || s.axis_id === activeAxis;
      
      if (activeAxis !== 'all') {
        const activeAxisEntity = axes.find(a => a.id === activeAxis);
        const axisOrder = activeAxisEntity?.order ?? 0;
        
        const match = s.code?.match(/م(\d+)-(\d+)/);
        if (match) {
          const codeAxisOrder = parseInt(match[1]);
          const codeStandardNum = parseInt(match[2]);
          
          if (codeAxisOrder !== axisOrder) {
            return false;
          }
          
          if (axisOrder === 9 && codeStandardNum === 8) {
            return false;
          }
        }
      }
      
      return matchesAxis;
    });
    
    // فرز بسيط وفعال للمحاور الفردية
    if (activeAxis !== 'all') {
      return list.sort((a, b) => {
        // استخراج رقم المحور والمعيار من الرمز
        const extractNumbers = (code) => {
          const match = code?.match(/م(\d+)-(\d+)/);
          return match ? [parseInt(match[1]), parseInt(match[2])] : [0, 0];
        };
        
        const [axisA, numA] = extractNumbers(a.code);
        const [axisB, numB] = extractNumbers(b.code);
        
        // فرز حسب رقم المحور ثم رقم المعيار
        if (axisA !== axisB) return axisA - axisB;
        return numA - numB;
      });
    }
    
    return sortAndDeduplicateStandardsByCode(list);
  })();

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

    // Update standard status if not started
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

  const handleDeleteEvidence = async (evidenceItem) => {
    if (!canDeleteAnyEvidence) return;
    if (!evidenceItem?.id) return;
    const ok = await requireSecureDeleteConfirmation(`الدليل "${evidenceItem.title || 'غير معنون'}"`);
    if (!ok) return;
    await deleteEvidenceMutation.mutateAsync(evidenceItem.id);
  };

  const handlePreviewEvidence = useCallback((fileUrl) => {
    if (!fileUrl || typeof window === 'undefined') return;

    const normalizedUrl = String(fileUrl);
    if (normalizedUrl.startsWith('data:')) {
      try {
        const [meta, base64Payload] = normalizedUrl.split(',', 2);
        const mimeTypeMatch = meta.match(/^data:(.*?);base64$/i);
        const mimeType = mimeTypeMatch?.[1] || 'application/octet-stream';
        const binary = atob(base64Payload || '');
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      } catch {
        window.open(normalizedUrl, '_blank');
      }
      return;
    }

    const separator = normalizedUrl.includes('?') ? '&' : '?';
    const previewUrl = `${normalizedUrl}${separator}t=${Date.now()}`;

    const previewWindow = window.open(previewUrl, '_blank');
    if (previewWindow) {
      setTimeout(() => {
        try {
          previewWindow.location.replace(previewUrl);
        } catch {
          window.open(previewUrl, '_blank');
        }
      }, 400);
    }
  }, []);

  const getStandardEvidence = (standardId) => evidence.filter(e => e.standard_id === standardId);

  const activeAxisEntity = activeAxis !== 'all' ? axes.find(a => a.id === activeAxis) : null;
  const pageTitle = activeAxisEntity
    ? ((activeAxisEntity.order >= 1 && activeAxisEntity.order <= AXIS_SHORT_NAMES.length)
        ? AXIS_SHORT_NAMES[activeAxisEntity.order - 1]
        : activeAxisEntity.name)
    : 'المعايير الدولية والأدلة';

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{pageTitle}</h1>
          <p className="text-blue-100">{activeAxisEntity ? `${(activeAxisEntity.order >= 1 && activeAxisEntity.order <= AXIS_COUNTS.length) ? AXIS_COUNTS[activeAxisEntity.order - 1] : standards.filter(s => s.axis_id === activeAxis).length} معيار` : '80 معياراً (معايير المدن الصحية)'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* جدول النتيجة — مؤشرات الأداء لكل محور (من ملف Healthy_Cities_Criteria.csv) */}
        <Card className="mb-6 border-blue-100 bg-blue-50/50">
          <CardHeader
            className="cursor-pointer flex flex-row items-center justify-between"
            onClick={() => setShowResultTable(!showResultTable)}
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              جدول النتيجة — مؤشرات الأداء لكل محور (معايير المدن الصحية)
            </CardTitle>
            {showResultTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardHeader>
          {showResultTable && (
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-gray-600">
                حسب مرجع المعايير (مرجع-معايير-المحاور-للمقارنة): 9 محاور و 80 معياراً. كل معيار يُقيّم بأدلة متوفرة (+) أو أدلة غير متوفرة (-). للاعتراف بالمدينة كـ «مدينة صحية» يجب تحقيق 80% على الأقل من معايير كل محور ومن إجمالي المعايير.
              </p>
              <div className="rounded-lg border bg-white p-3">
                <h4 className="font-semibold mb-2">مؤشر التصنيف الإجمالي</h4>
                <p><span className="text-blue-600">{OVERALL_CLASSIFICATION_KPI.name}</span>: {OVERALL_CLASSIFICATION_KPI.target} ({OVERALL_CLASSIFICATION_KPI.unit})</p>
                <p className="text-xs text-gray-500 mt-1">{OVERALL_CLASSIFICATION_KPI.description}</p>
              </div>
              <Tabs defaultValue="axes" className="w-full">
                <TabsList>
                  <TabsTrigger value="axes">مؤشرات كل محور</TabsTrigger>
                </TabsList>
                <TabsContent value="axes" className="space-y-3 mt-3">
                  {AXIS_KPIS.map((axisKpi) => (
                    <div key={axisKpi.axis_order} className="rounded-lg border bg-white p-3">
                      <h4 className="font-semibold text-base mb-2">المحور {axisKpi.axis_order}: {axisKpi.axis_name}</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {axisKpi.kpis.map((k, i) => (
                          <li key={i}>
                            <span className="font-medium">{k.name}</span>
                            {' — الهدف: '}
                            <span className="text-green-700">{k.target}</span>
                            {k.unit && k.unit !== '-' && ` (${k.unit})`}
                            {k.description && <span className="text-gray-500 block mr-4 mt-0.5">{k.description}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          )}
        </Card>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {canManage && (
            <>
              <Button onClick={() => setAxisFormOpen(true)} variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                إضافة محور
              </Button>
              <Button onClick={() => setStandardFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-2" />
                إضافة معيار
              </Button>
            </>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="بحث في المعايير (العنوان، الرمز، الوصف)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              dir="rtl"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Axes Tabs */}
        <div className="mb-6 overflow-x-auto">
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
              /** عدد المعايير من مرجع المعايير لكل محور (1–9)، وليس من البيانات الحالية */
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
                <EnhancedAxisCard
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
          <div className="space-y-4">
            {filteredStandards.map(standard => {
              const standardEvidence = getStandardEvidence(standard.id);
              const approvedEvidence = standardEvidence.filter(e => e.status === 'approved').length;
              const suggestedInitiative = getInitiativeSuggestionFromStandard(standard, standard.axis_name);
              const relatedInitiatives = (Array.isArray(initiatives) ? initiatives : []).filter((initiative) => {
                const relatedIds = parseRelatedStandardIds(initiative?.related_standards);
                const hasLinkedId = relatedIds.includes(String(standard.id));
                const byStandardIdField = String(initiative?.standard_id || '') === String(standard.id);
                const byStandardCodeField = String(initiative?.standard_code || '').trim() === String(standard.code || '').trim();
                return hasLinkedId || byStandardIdField || byStandardCodeField;
              });

              const relatedCommittees = [];
              const relatedCommitteeKeys = new Set();
              relatedInitiatives.forEach((initiative) => {
                const committeeId = initiative?.committee_id ? String(initiative.committee_id) : '';
                const committeeNameFromList = committeeId
                  ? committees.find((committee) => String(committee.id) === committeeId)?.name
                  : '';
                const committeeName = initiative?.committee_name || committeeNameFromList;
                const key = committeeId || String(committeeName || '').trim();
                if (!key || relatedCommitteeKeys.has(key)) return;
                relatedCommitteeKeys.add(key);
                relatedCommittees.push({ id: committeeId || key, name: committeeName || 'لجنة غير مسماة' });
              });

              const relatedBudgets = [];
              const relatedBudgetKeys = new Set();
              relatedInitiatives.forEach((initiative) => {
                const allocationId = initiative?.budget_allocation_id ? String(initiative.budget_allocation_id) : '';
                const allocation = allocationId
                  ? allocations.find((item) => String(item?.id || '') === allocationId)
                  : null;
                const budgetId = initiative?.budget_id ? String(initiative.budget_id) : (allocation?.budget_id ? String(allocation.budget_id) : '');
                const budgetNameFromList = budgetId
                  ? budgets.find((budget) => String(budget.id) === budgetId)?.name
                  : '';
                const budgetName = initiative?.budget_name || budgetNameFromList || allocation?.budget_name;
                const budgetKey = budgetId || allocationId || String(budgetName || '').trim();
                if (!budgetKey) return;

                const amount = Number(initiative?.budget || 0);
                const existingIndex = relatedBudgets.findIndex((b) => b.key === budgetKey);
                if (existingIndex >= 0) {
                  relatedBudgets[existingIndex].amount += Number.isFinite(amount) ? amount : 0;
                  relatedBudgets[existingIndex].initiativesCount += 1;
                  return;
                }

                if (relatedBudgetKeys.has(budgetKey)) return;
                relatedBudgetKeys.add(budgetKey);
                relatedBudgets.push({
                  key: budgetKey,
                  name: budgetName || 'ميزانية مرتبطة',
                  amount: Number.isFinite(amount) ? amount : 0,
                  initiativesCount: 1,
                });
              });

              const totalRelatedBudget = relatedBudgets.reduce((sum, budget) => sum + (Number(budget.amount) || 0), 0);
              const committeesExpanded = isSectionExpanded(standard.id, 'committees');
              const initiativesExpanded = isSectionExpanded(standard.id, 'initiatives');
              const budgetsExpanded = isSectionExpanded(standard.id, 'budgets');
              const visibleCommittees = committeesExpanded ? relatedCommittees : relatedCommittees.slice(0, 3);
              const visibleInitiatives = initiativesExpanded ? relatedInitiatives : relatedInitiatives.slice(0, 2);
              const visibleBudgets = budgetsExpanded ? relatedBudgets : relatedBudgets.slice(0, 2);

              return (
                <Card key={standard.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="font-mono">{standard.code}</Badge>
                          <Badge className={statusConfig[standard.status]?.color}>
                            {statusConfig[standard.status]?.label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{standard.title}</h3>
                        {standard.description && (
                          <p className="text-sm text-gray-600 mt-1">{standard.description}</p>
                        )}
                        {standard.required_evidence && (
                          <p className="text-sm text-blue-600 mt-2">
                            <FileText className="w-4 h-4 inline ml-1" />
                            الأدلة المطلوبة: {standard.required_evidence}
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500 mb-1">اللجان المرتبطة</p>
                            <p className="text-sm font-semibold mb-2">{relatedCommittees.length} لجنة</p>
                            <div className="flex flex-wrap gap-1">
                              {visibleCommittees.length > 0 ? visibleCommittees.map((committee) => (
                                <Badge key={committee.id} variant="outline" className="text-[11px]">
                                  {committee.name}
                                </Badge>
                              )) : (
                                <span className="text-xs text-gray-400">لا توجد لجان مرتبطة</span>
                              )}
                            </div>
                            {relatedCommittees.length > 3 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 px-2 text-xs"
                                onClick={() => toggleSectionExpanded(standard.id, 'committees')}
                              >
                                {committeesExpanded ? 'إخفاء' : `عرض الكل (${relatedCommittees.length})`}
                              </Button>
                            )}
                          </div>

                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500 mb-1">المبادرات المرتبطة</p>
                            <p className="text-sm font-semibold mb-2">{relatedInitiatives.length} مبادرة</p>
                            <div className="space-y-1">
                              {visibleInitiatives.length > 0 ? visibleInitiatives.map((initiative) => (
                                <p key={initiative.id} className="text-xs text-gray-700 truncate" title={initiative.title}>
                                  • {initiative.title}
                                </p>
                              )) : (
                                <span className="text-xs text-gray-400">لا توجد مبادرات مرتبطة</span>
                              )}
                            </div>
                            {relatedInitiatives.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 px-2 text-xs"
                                onClick={() => toggleSectionExpanded(standard.id, 'initiatives')}
                              >
                                {initiativesExpanded ? 'إخفاء' : `عرض الكل (${relatedInitiatives.length})`}
                              </Button>
                            )}
                          </div>

                          <div className="rounded-lg border bg-gray-50 p-3">
                            <p className="text-xs text-gray-500 mb-1">الميزانيات المرتبطة</p>
                            <p className="text-sm font-semibold mb-1">{relatedBudgets.length} ميزانية</p>
                            <p className="text-xs text-green-700 font-medium mb-2">
                              الإجمالي: {totalRelatedBudget.toLocaleString()} ريال
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {visibleBudgets.length > 0 ? visibleBudgets.map((budget) => (
                                <Badge key={budget.key} variant="outline" className="text-[11px]">
                                  {budget.name}
                                </Badge>
                              )) : (
                                <span className="text-xs text-gray-400">لا توجد ميزانيات مرتبطة</span>
                              )}
                            </div>
                            {relatedBudgets.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 px-2 text-xs"
                                onClick={() => toggleSectionExpanded(standard.id, 'budgets')}
                              >
                                {budgetsExpanded ? 'إخفاء' : `عرض الكل (${relatedBudgets.length})`}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border bg-purple-50 p-3 mt-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs text-purple-700">مبادرة مقترحة لهذا المعيار</p>
                              <p className="text-sm font-semibold text-purple-900">{suggestedInitiative.title}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={relatedInitiatives.length > 0}
                              onClick={() => handleCreateSuggestedInitiativeForStandard(standard)}
                            >
                              {relatedInitiatives.length > 0 ? 'موجودة' : 'فتح النموذج'}
                            </Button>
                          </div>
                          <p className="text-xs text-purple-700 mb-2">{suggestedInitiative.description}</p>
                          {relatedInitiatives.length > 0 && (
                            <p className="text-[11px] text-green-700">تم إنشاء مبادرة مرتبطة بهذا المعيار مسبقًا.</p>
                          )}
                        </div>
                        
                        <StandardKPIManager standard={standard} evidence={evidence} />

                        <EnhancedDocumentsDisplay
                          standard={enhanceStandardsDisplay(
                            standard,
                            parseJsonArray(standard.kpis),
                            parseJsonArray(standard.required_documents)
                          )}
                          currentDocuments={enhanceStandardsDisplay(
                            standard,
                            parseJsonArray(standard.kpis),
                            parseJsonArray(standard.required_documents)
                          ).enhancedDocuments}
                        />
                        
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span>المحور: {standard.axis_name}</span>
                          <span>الأدلة: {approvedEvidence}/{standardEvidence.length}</span>
                          <span>المؤشرات: {parseJsonArray(standard.kpis).length}</span>
                          <span>المستندات: {parseJsonArray(standard.required_documents).length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Evidence List */}
                    <div className="mt-4 pt-4 border-t">
                      <Collapsible className="w-full">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="w-full text-right group">
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-600" />
                                <p className="text-sm font-medium">الأدلة المرفوعة</p>
                                <Badge variant="secondary" className="text-xs">{standardEvidence.length}</Badge>
                              </div>
                              <ChevronDown className="w-5 h-5 text-gray-500 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          {standardEvidence.length === 0 ? (
                            <div className="mt-3 text-sm text-gray-500">لا توجد أدلة مرفوعة</div>
                          ) : (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {standardEvidence.map(ev => (
                                <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  {ev.file_type === 'image' ? (
                                    <Image className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-green-600" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{ev.title}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge className={
                                        ev.status === 'approved' ? 'bg-green-100 text-green-700' :
                                        ev.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                      }>
                                        {ev.status === 'approved' ? 'معتمد' : ev.status === 'rejected' ? 'مرفوض' : 'بانتظار'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-blue-700"
                                      title="معاينة"
                                      onClick={() => handlePreviewEvidence(ev.file_url)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {canApprove && isPendingEvidenceStatus(ev.status) && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-green-700"
                                          onClick={() => handleApproveEvidence(ev)}
                                        >
                                          يعتمد
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-700"
                                          onClick={() => handleRejectEvidence(ev, 'غير مطابق')}
                                        >
                                          رفض
                                        </Button>
                                      </>
                                    )}

                                    {canDeleteAnyEvidence && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-700"
                                        onClick={() => handleDeleteEvidence(ev)}
                                      >
                                        حذف
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Axis Form */}
      <Dialog open={axisFormOpen} onOpenChange={setAxisFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة محور جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveAxis} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اسم المحور *</Label>
              <Input value={axisForm.name} onChange={(e) => setAxisForm({ ...axisForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={axisForm.description} onChange={(e) => setAxisForm({ ...axisForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input type="number" value={axisForm.order} onChange={(e) => setAxisForm({ ...axisForm, order: parseInt(e.target.value) })} />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setAxisFormOpen(false)}>إلغاء</Button>
              <Button type="submit" className="bg-blue-600">حفظ</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standard Form */}
      <Dialog open={standardFormOpen} onOpenChange={setStandardFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة معيار جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveStandard} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رمز المعيار *</Label>
                <Input value={standardForm.code} onChange={(e) => setStandardForm({ ...standardForm, code: e.target.value })} placeholder="مثال: S01" required />
              </div>
              <div className="space-y-2">
                <Label>المحور *</Label>
                <Select value={standardForm.axis_id} onValueChange={(v) => setStandardForm({ ...standardForm, axis_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المحور" /></SelectTrigger>
                  <SelectContent>
                    {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(a => {
                      const label = (a.order >= 1 && a.order <= AXIS_SHORT_NAMES.length) ? AXIS_SHORT_NAMES[a.order - 1] : a.name;
                      return <SelectItem key={a.id} value={a.id}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>عنوان المعيار *</Label>
              <Input value={standardForm.title} onChange={(e) => setStandardForm({ ...standardForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={standardForm.description} onChange={(e) => setStandardForm({ ...standardForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الأدلة المطلوبة</Label>
              <Textarea value={standardForm.required_evidence} onChange={(e) => setStandardForm({ ...standardForm, required_evidence: e.target.value })} placeholder="مثال: صور، تقارير، وثائق رسمية" />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setStandardFormOpen(false)}>إلغاء</Button>
              <Button type="submit" className="bg-blue-600">حفظ</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Standard - المستندات المطلوبة ومؤشرات KPI */}
      <Dialog open={editStandardOpen} onOpenChange={setEditStandardOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المستندات المطلوبة ومؤشرات الأداء — {editStandard?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label className="font-medium">المستندات المطلوبة</Label>
              <ul className="mt-2 space-y-2">
                {editDocuments.map((doc, i) => (
                  <li key={i} className="flex gap-2">
                    <Input
                      value={typeof doc === 'string' ? doc : doc?.name ?? ''}
                      onChange={(e) => {
                        const next = [...editDocuments];
                        next[i] = e.target.value;
                        setEditDocuments(next);
                      }}
                      placeholder="اسم المستند"
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setEditDocuments(editDocuments.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEditDocuments([...editDocuments, ''])}>
                <Plus className="w-4 h-4 ml-2" /> إضافة مستند
              </Button>
            </div>
            <div>
              <Label className="font-medium">مؤشرات الأداء (KPI)</Label>
              <div className="mt-2 space-y-3">
                {editKpis.map((kpi, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Input value={kpi.name} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], name: e.target.value }; setEditKpis(n); }} placeholder="اسم المؤشر" className="flex-1 min-w-[120px]" />
                    <Input value={kpi.target} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], target: e.target.value }; setEditKpis(n); }} placeholder="الهدف" className="w-24" />
                    <Input value={kpi.unit} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], unit: e.target.value }; setEditKpis(n); }} placeholder="الوحدة" className="w-20" />
                    <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setEditKpis(editKpis.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEditKpis([...editKpis, { name: '', target: '', unit: '' }])}>
                <Plus className="w-4 h-4 ml-2" /> إضافة مؤشر
              </Button>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setEditStandardOpen(false)}>إلغاء</Button>
              <Button
                className="bg-blue-600"
                onClick={async () => {
                  if (!editStandard?.id) return;
                  await updateStandardMutation.mutateAsync({
                    id: editStandard.id,
                    data: {
                      required_documents: JSON.stringify(editDocuments.filter(Boolean).map(d => typeof d === 'string' ? d : d?.name ?? '').filter(Boolean)),
                      kpis: JSON.stringify(editKpis.filter(k => k?.name).map(k => ({ name: k.name, target: k.target || '', unit: k.unit || '' }))),
                    },
                  });
                  setEditStandardOpen(false);
                  setEditStandard(null);
                }}
              >
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Form */}
      <Dialog open={evidenceFormOpen} onOpenChange={setEvidenceFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع دليل للمعيار {selectedStandard?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadEvidence} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان الدليل *</Label>
              <Input value={evidenceForm.title} onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={evidenceForm.description} onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الملف *</Label>
              <Input type="file" onChange={(e) => setEvidenceForm({ ...evidenceForm, file: e.target.files[0] })} accept="image/*,.pdf,.doc,.docx" required />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setEvidenceFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={uploading} className="bg-blue-600">
                {uploading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                رفع الدليل
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// يمكن التبديل: StandardsLegacy أو StandardsEnhanced
export default StandardsLegacy;