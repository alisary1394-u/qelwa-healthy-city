import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AXIS_SHORT_NAMES, AXIS_COUNTS } from '@/api/seedAxesAndStandards';
import { STANDARDS_CSV, sortAndDeduplicateStandardsByCode, getShortTitleByCode } from '@/api/standardsFromCsv';
import { usePermissions } from '@/hooks/usePermissions';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Target, FileText, Image, Eye, Loader2, Trash2, ChevronDown, ChevronUp, Clock, BookOpen, Lightbulb, DollarSign, Users, CheckCircle, Edit, Pencil } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';
import T from "@/components/T";


import StandardKPIManager from '@/components/standards/StandardKPIManager';

// استيراد المؤشرات المحسنة (النسخة المبسطة)
import { 
  EnhancedDocumentsDisplay, 
  EnhancedAxisCard,
  enhanceStandardsDisplay 
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
  const axisLabel = axisName || standard?.axis_name || '';
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
  not_started: { label: 'standards.standardStatusNotStarted', color: 'bg-muted text-foreground', headerColor: 'bg-white/20 text-white' },
  in_progress: { label: 'standards.standardStatusInProgress', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300', headerColor: 'bg-white/25 text-white' },
  completed: { label: 'standards.standardStatusCompleted', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300', headerColor: 'bg-white/25 text-white' },
  approved: { label: 'standards.standardStatusApproved', color: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary', headerColor: 'bg-white/25 text-white' }
};

const axisGradients = [
  'from-[#0c2d48] to-[#1a4971]',   // 1 - أزرق داكن رسمي
  'from-[#14532d] to-[#1a6b3c]',   // 2 - أخضر زمردي داكن
  'from-[#4a1942] to-[#6b2560]',   // 3 - بنفسجي ملكي
  'from-[#1a3c4a] to-[#2a5f6f]',   // 4 - أزرق فولاذي
  'from-[#3d1f00] to-[#5c3a1a]',   // 5 - بني برونزي
  'from-[#1a3333] to-[#2a5252]',   // 6 - أخضر مائي داكن
  'from-[#2d1b4e] to-[#422a6b]',   // 7 - نيلي داكن
  'from-[#334155] to-[#475569]',   // 8 - رمادي إردوازي
  'from-[#4a1525] to-[#6b2038]',   // 9 - عنابي داكن
];

/** إجمالي المعايير حسب مرجع المعايير (9 محاور، 80 معياراً) */
const REFERENCE_TOTAL_STANDARDS = STANDARDS_CSV.length;

function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  return list.length === 0 ? 'أدلة ومستندات تدعم تحقيق المعيار' : 'أدلة مطلوبة: ' + list.join('، ');
}

function StandardsLegacy() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeAxis, setActiveAxis] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingFilter, setPendingFilter] = useState(searchParams.get('filter') === 'pending');
  const [expandedLinkedSections, setExpandedLinkedSections] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
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

  // --- Axis edit/delete ---
  const [editAxisOpen, setEditAxisOpen] = useState(false);
  const [editAxisData, setEditAxisData] = useState(null);

  // --- Standard basic info edit ---
  const [editStandardInfoOpen, setEditStandardInfoOpen] = useState(false);
  const [editStandardInfo, setEditStandardInfo] = useState(null);

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
  const canManageInitiatives = permissions.canManageInitiatives === true;

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

  const updateAxisMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Axis.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['axes'] })
  });

  const deleteAxisMutation = useMutation({
    mutationFn: (id) => api.entities.Axis.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['axes'] })
  });

  const deleteStandardMutation = useMutation({
    mutationFn: (id) => api.entities.Standard.delete(id),
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
  const memberCommitteeId = String(currentMember?.committee_id || '');
  const memberDisplayName = String(currentUser?.full_name || currentMember?.full_name || '').trim();

  const scopedStandards = useMemo(() => {
    if (canManageStandards || isGovernor) return standards;
    if (!currentMember) return [];

    return standards.filter((standard) => {
      const standardId = String(standard?.id || '');
      const standardCode = String(standard?.code || '');
      const standardCommitteeId = String(standard?.committee_id || '');

      const matchesCommittee =
        memberCommitteeId && standardCommitteeId && standardCommitteeId === memberCommitteeId;

      const hasRelevantEvidence = evidence.some((item) => {
        if (String(item?.standard_id || '') !== standardId) return false;
        const evidenceCommitteeId = String(item?.committee_id || '');
        const evidenceUploader = String(item?.uploaded_by_name || '').trim();
        return (
          (memberCommitteeId && evidenceCommitteeId && evidenceCommitteeId === memberCommitteeId) ||
          (memberDisplayName && evidenceUploader && evidenceUploader === memberDisplayName)
        );
      });

      const hasRelatedInitiative = initiatives.some((initiative) => {
        const initiativeCommitteeId = String(initiative?.committee_id || '');
        if (memberCommitteeId && initiativeCommitteeId && initiativeCommitteeId !== memberCommitteeId) return false;

        const initiativeStandardId = String(initiative?.standard_id || '');
        const initiativeStandardCode = String(initiative?.standard_code || '');
        const relatedIds = parseRelatedStandardIds(initiative?.related_standards).map((v) => String(v));

        return (
          (standardId && initiativeStandardId && initiativeStandardId === standardId) ||
          (standardCode && initiativeStandardCode && initiativeStandardCode === standardCode) ||
          (standardId && relatedIds.includes(standardId)) ||
          (standardCode && relatedIds.includes(standardCode))
        );
      });

      return matchesCommittee || hasRelevantEvidence || hasRelatedInitiative;
    });
  }, [canManageStandards, isGovernor, standards, currentMember, memberCommitteeId, memberDisplayName, evidence, initiatives]);
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
    if (!canManageInitiatives) return;
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

  // فلترة ثم ترتيب حسب الترقيم المرجعي (م1-1 … م9-7) وإزالة التكرار — نفس المنطق لجميع المحاور بما فيها 4، 7، 8، 9
  const filteredStandards = (() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    const hasSearch = query.length > 0;
    let list = scopedStandards.filter(s => {
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

    // فلترة الأدلة بانتظار المراجعة
    if (pendingFilter) {
      const standardsWithPending = new Set(
        evidence.filter(e => isPendingEvidenceStatus(e.status)).map(e => e.standard_id)
      );
      list = list.filter(s => standardsWithPending.has(s.id));
    }
    
    return sortAndDeduplicateStandardsByCode(list);
  })();

  const getAxisProgress = (axisId) => {
    const axis = axes.find(a => a.id === axisId);
    const order = axis?.order ?? 0;
    const expectedCount = (order >= 1 && order <= AXIS_COUNTS.length) ? AXIS_COUNTS[order - 1] : 1;
    const completed = scopedStandards.filter(s => s.axis_id === axisId && (s.status === 'completed' || s.status === 'approved')).length;
    return expectedCount > 0 ? Math.round((completed / expectedCount) * 100) : 0;
  };

  const handleSaveAxis = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    await createAxisMutation.mutateAsync(axisForm);
    setAxisFormOpen(false);
    setAxisForm({ name: '', description: '', order: axes.length + 1 });
  };

  const handleUpdateAxis = async (e) => {
    e.preventDefault();
    if (!canManage || !editAxisData?.id) return;
    // حماية: لا يُسمح بتغيير رقم ترتيب المحور (ثابت حسب المرجع)
    await updateAxisMutation.mutateAsync({
      id: editAxisData.id,
      data: { name: editAxisData.name, description: editAxisData.description }
    });
    // update axis_name in related standards
    const relatedStds = standards.filter(s => s.axis_id === editAxisData.id && s.axis_name !== editAxisData.name);
    for (const s of relatedStds) {
      await updateStandardMutation.mutateAsync({ id: s.id, data: { axis_name: editAxisData.name } });
    }
    setEditAxisOpen(false);
    setEditAxisData(null);
  };

  const handleDeleteAxis = async (axis) => {
    if (!canManage) return;
    const ok = await requireSecureDeleteConfirmation(`${t('standards.axis')} "${axis.name}"`);
    if (!ok) return;
    await deleteAxisMutation.mutateAsync(axis.id);
    if (activeAxis === axis.id) setActiveAxis('all');
  };

  const handleUpdateStandardInfo = async (e) => {
    e.preventDefault();
    if (!canManage || !editStandardInfo?.id) return;
    const axis = axes.find(a => a.id === editStandardInfo.axis_id);
    await updateStandardMutation.mutateAsync({
      id: editStandardInfo.id,
      data: {
        code: editStandardInfo.code,
        title: editStandardInfo.title,
        description: editStandardInfo.description,
        status: editStandardInfo.status,
        axis_id: editStandardInfo.axis_id,
        axis_name: axis?.name || editStandardInfo.axis_name || '',
        required_evidence: editStandardInfo.required_evidence,
      }
    });
    setEditStandardInfoOpen(false);
    setEditStandardInfo(null);
  };

  const handleDeleteStandard = async (standard) => {
    if (!canManage) return;
    const ok = await requireSecureDeleteConfirmation(`${t('standards.standard')} "${standard.code} - ${standard.title}"`);
    if (!ok) return;
    await deleteStandardMutation.mutateAsync(standard.id);
  };

  const handleSaveStandard = async (e) => {
    e.preventDefault();
    if (!canManage) return;
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
    if (!canManage) return;
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
    if (!canApprove) return;
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
    if (!canApprove) return;
    await updateEvidenceMutation.mutateAsync({
      id: evidenceItem.id,
      data: { status: 'rejected', rejection_reason: reason }
    });
  };

  const handleDeleteEvidence = async (evidenceItem) => {
    if (!canDeleteAnyEvidence) return;
    if (!evidenceItem?.id) return;
    const ok = await requireSecureDeleteConfirmation(`${t('standards.evidence')} "${evidenceItem.title || ''}"`);
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
    : t('standards.title');

  if (!permissions.canSeeStandards) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold">{t('standards.noAccess')} {t('standards.noAccessNote')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Target className="w-8 h-8" />
            {pageTitle}
          </h1>
          <p className="text-white/70">{activeAxisEntity ? t('standards.standardsCount', { count: (activeAxisEntity.order >= 1 && activeAxisEntity.order <= AXIS_COUNTS.length) ? AXIS_COUNTS[activeAxisEntity.order - 1] : scopedStandards.filter(s => s.axis_id === activeAxis).length }) : t('standards.healthyCityStandards')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {canManage && (
            <>
              <Button onClick={() => setAxisFormOpen(true)} variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                {t('standards.addAxis')}
              </Button>
              <Button onClick={() => setStandardFormOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 ml-2" />
                {t('standards.addStandard')}
              </Button>
            </>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('standards.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              dir={rtl ? 'rtl' : 'ltr'}
              autoComplete="off"
            />
          </div>
          <Button
            variant={pendingFilter ? 'default' : 'outline'}
            className={pendingFilter ? 'bg-amber-700 hover:bg-amber-800 text-white' : 'border-amber-400 text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-600'}
            onClick={() => {
              const next = !pendingFilter;
              setPendingFilter(next);
              if (next) {
                setSearchParams({ filter: 'pending' });
              } else {
                setSearchParams({});
              }
            }}
          >
            <Clock className="w-4 h-4 ml-1" />
            {t('standards.pendingReview')}
          </Button>
        </div>

        {/* Axes Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            <Button
              variant={activeAxis === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveAxis('all')}
              className="whitespace-nowrap"
            >
              {t('standards.allAxes')} ({REFERENCE_TOTAL_STANDARDS})
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
              const axisStandards = scopedStandards.filter(s => s.axis_id === axis.id);
              return (
                <div key={axis.id} className="relative group/axiscard">
                  <EnhancedAxisCard
                    axis={axis}
                    standards={axisStandards}
                    onSelect={setActiveAxis}
                  />
                  {canManage && (
                    <div className="absolute top-2 left-2 hidden group-hover/axiscard:flex gap-1 z-10">
                      <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow-md" onClick={(e) => { e.stopPropagation(); setEditAxisData({ id: axis.id, name: axis.name, description: axis.description || '', order: axis.order ?? 0 }); setEditAxisOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full shadow-md" onClick={(e) => { e.stopPropagation(); handleDeleteAxis(axis); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Standards List */}
        {loadingStandards ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : filteredStandards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('standards.noStandards')}</p>
              {canManage && (
                <Button variant="outline" className="mt-4" onClick={() => setStandardFormOpen(true)}>
                  {t('standards.addNewStandard')}
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
                relatedCommittees.push({ id: committeeId || key, name: committeeName || t('standards.unnamedCommittee') });
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
                  name: budgetName || t('standards.linkedBudget'),
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

              const axisEntity = axes.find(a => a.id === standard.axis_id);
              const axisOrder = axisEntity?.order ?? 0;
              const gradientClass = axisOrder >= 1 && axisOrder <= axisGradients.length ? axisGradients[axisOrder - 1] : 'from-gray-400 to-gray-500';

              return (
                <Card key={standard.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md">
                  {/* Header gradient bar - clickable to expand/collapse */}
                  <div
                    className={`bg-gradient-to-l ${gradientClass} p-4 cursor-pointer`}
                    onClick={() => setExpandedCards(prev => ({ ...prev, [standard.id]: !prev[standard.id] }))}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center font-mono text-xs font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">{standard.code}</span>
                          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[standard.status]?.headerColor || 'bg-white/20 text-white'}`}>
                            {t(statusConfig[standard.status]?.label)}
                          </span>
                        </div>
                        <h3 className="text-white font-bold text-base leading-tight"><T>{getShortTitleByCode(standard.code) || standard.title}</T></h3>
                        {standard.axis_name && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Target className="w-3.5 h-3.5 text-white/80 shrink-0" />
                            <span className="text-white/90 text-xs truncate"><T>{standard.axis_name}</T></span>
                          </div>
                        )}
                        {/* Stats badges */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            <FileText className="w-3 h-3" />{approvedEvidence}/{standardEvidence.length} {t('standards.evidenceCount')}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            <Lightbulb className="w-3 h-3" />{relatedInitiatives.length} {t('standards.initiativesCount')}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            <Users className="w-3 h-3" />{relatedCommittees.length} {t('standards.committeesCount')}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            <DollarSign className="w-3 h-3" />{relatedBudgets.length} {t('standards.budgetsCount')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                      {canManage && (
                        <div className="flex gap-1 bg-white/10 rounded-lg p-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20" title={t('common.delete')} onClick={() => handleDeleteStandard(standard)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20" title={t('standards.editRequiredDocs')} onClick={() => {
                            setEditStandard(standard);
                            setEditDocuments(parseJsonArray(standard.required_documents));
                            setEditKpis(parseJsonArray(standard.kpis));
                            setEditStandardOpen(true);
                          }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20" title={t('standards.editStandardData')} onClick={() => {
                            setEditStandardInfo({
                              id: standard.id,
                              code: standard.code || '',
                              title: standard.title || '',
                              description: standard.description || '',
                              status: standard.status || 'not_started',
                              axis_id: standard.axis_id || '',
                              axis_name: standard.axis_name || '',
                              required_evidence: standard.required_evidence || '',
                            });
                            setEditStandardInfoOpen(true);
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {expandedCards[standard.id] ? <ChevronUp className="w-5 h-5 text-white/70" /> : <ChevronDown className="w-5 h-5 text-white/70" />}
                      </div>
                    </div>
                  </div>

                  {expandedCards[standard.id] && (
                  <CardContent className="p-4">
                    <div className="flex-1">
                        {/* نص المعيار الكامل */}
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed"><T>{standard.title}</T></p>
                        {standard.required_evidence && (
                          <p className="text-xs text-primary mb-3 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            {standard.required_evidence}
                          </p>
                        )}



                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                          <div className="rounded-lg border bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground mb-1">{t('standards.relatedCommittees')}</p>
                            <p className="text-sm font-semibold mb-2">{relatedCommittees.length} {t('standards.committee')}</p>
                            <div className="flex flex-wrap gap-1">
                              {visibleCommittees.length > 0 ? visibleCommittees.map((committee) => (
                                <Badge key={committee.id} variant="outline" className="text-[11px]">
                                  <T>{committee.name}</T>
                                </Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">{t('standards.noRelatedCommittees')}</span>
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
                                {committeesExpanded ? t('standards.hide') : t('standards.showAll', { count: relatedCommittees.length })}
                              </Button>
                            )}
                          </div>

                          <div className="rounded-lg border bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground mb-1">{t('standards.relatedInitiatives')}</p>
                            <p className="text-sm font-semibold mb-2">{relatedInitiatives.length} {t('standards.initiative')}</p>
                            <div className="space-y-1">
                              {visibleInitiatives.length > 0 ? visibleInitiatives.map((initiative) => (
                                <p key={initiative.id} className="text-xs text-foreground truncate" title={initiative.title}>
                                  • <T>{initiative.title}</T>
                                </p>
                              )) : (
                                <span className="text-xs text-muted-foreground">{t('standards.noRelatedInitiatives')}</span>
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
                                {initiativesExpanded ? t('standards.hide') : t('standards.showAll', { count: relatedInitiatives.length })}
                              </Button>
                            )}
                          </div>

                          <div className="rounded-lg border bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground mb-1">{t('standards.relatedBudgets')}</p>
                            <p className="text-sm font-semibold mb-1">{relatedBudgets.length} {t('standards.budgetItem')}</p>
                            <p className="text-xs text-success font-medium mb-2">
                              {t('standards.totalBudget')} {totalRelatedBudget.toLocaleString()} ريال
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {visibleBudgets.length > 0 ? visibleBudgets.map((budget) => (
                                <Badge key={budget.key} variant="outline" className="text-[11px]">
                                  {budget.name}
                                </Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">{t('standards.noRelatedBudgets')}</span>
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
                                {budgetsExpanded ? t('standards.hide') : t('standards.showAll', { count: relatedBudgets.length })}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border bg-purple-50 p-3 mt-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs text-purple-700">{t('standards.suggestedInitiative')}</p>
                              <p className="text-sm font-semibold text-purple-900">{suggestedInitiative.title}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              disabled={!canManageInitiatives || relatedInitiatives.length > 0}
                              onClick={() => handleCreateSuggestedInitiativeForStandard(standard)}
                            >
                              {!canManageInitiatives ? t('standards.unauthorized') : (relatedInitiatives.length > 0 ? t('standards.alreadyExists') : t('standards.openForm'))}
                            </Button>
                          </div>
                          <p className="text-xs text-secondary mb-2">{suggestedInitiative.description}</p>
                          {relatedInitiatives.length > 0 && (
                            <p className="text-[11px] text-success">{t('standards.initiativeAlreadyCreated')}</p>
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
                        
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><BookOpen className="w-3 h-3" /> {t('standards.kpiIndicators')} {parseJsonArray(standard.kpis).length}</span>
                          <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3" /> {t('standards.requiredDocs')} {parseJsonArray(standard.required_documents).length}</span>
                        </div>
                      </div>

                    {/* Evidence List */}
                    <div className="mt-4 pt-4 border-t">
                      <Collapsible className="w-full">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="w-full text-right group">
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 p-4 hover:bg-muted transition-colors">
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                <p className="text-sm font-medium">{t('standards.uploadedEvidence')}</p>
                                <Badge variant="secondary" className="text-xs">{standardEvidence.length}</Badge>
                              </div>
                              <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          {standardEvidence.length === 0 ? (
                            <div className="mt-3 text-sm text-muted-foreground">{t('standards.noUploadedEvidence')}</div>
                          ) : (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {standardEvidence.map(ev => (
                                <div key={ev.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                  {ev.file_type === 'image' ? (
                                    <Image className="w-5 h-5 text-primary" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-secondary" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{ev.title}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge className={
                                        ev.status === 'approved' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' :
                                        ev.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                      }>
                                        {ev.status === 'approved' ? t('standards.approved') : ev.status === 'rejected' ? t('standards.rejected') : t('standards.pending')}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-primary"
                                      title={t('standards.preview')}
                                      onClick={() => handlePreviewEvidence(ev.file_url)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    {canApprove && isPendingEvidenceStatus(ev.status) && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-success"
                                          onClick={() => handleApproveEvidence(ev)}
                                        >
                                          {t('standards.approve')}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-700"
                                          onClick={() => handleRejectEvidence(ev, t('standards.nonCompliant'))}
                                        >
                                          {t('standards.reject')}
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
                                        {t('standards.deleteEvidence')}
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
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Axis Form */}
      <Dialog open={axisFormOpen} onOpenChange={setAxisFormOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{t('standards.addNewAxis')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveAxis} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('standards.axisName')}</Label>
              <Input value={axisForm.name} onChange={(e) => setAxisForm({ ...axisForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('standards.axisDescription')}</Label>
              <Textarea value={axisForm.description} onChange={(e) => setAxisForm({ ...axisForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('standards.axisOrder')}</Label>
              <Input type="number" value={axisForm.order} onChange={(e) => setAxisForm({ ...axisForm, order: parseInt(e.target.value) })} />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setAxisFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-primary">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standard Form */}
      <Dialog open={standardFormOpen} onOpenChange={setStandardFormOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{t('standards.addNewStandardForm')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveStandard} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('standards.standardCode')}</Label>
                <Input value={standardForm.code} onChange={(e) => setStandardForm({ ...standardForm, code: e.target.value })} placeholder="S01" required />
              </div>
              <div className="space-y-2">
                <Label>{t('standards.selectAxis')}</Label>
                <Select value={standardForm.axis_id} onValueChange={(v) => setStandardForm({ ...standardForm, axis_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t('standards.chooseAxis')} /></SelectTrigger>
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
              <Label>{t('standards.standardTitle')}</Label>
              <Input value={standardForm.title} onChange={(e) => setStandardForm({ ...standardForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea value={standardForm.description} onChange={(e) => setStandardForm({ ...standardForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('standards.requiredEvidence')}</Label>
              <Textarea value={standardForm.required_evidence} onChange={(e) => setStandardForm({ ...standardForm, required_evidence: e.target.value })} />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setStandardFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="bg-primary">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Standard - المستندات المطلوبة ومؤشرات KPI */}
      <Dialog open={editStandardOpen} onOpenChange={setEditStandardOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('standards.editStandardCode', { code: editStandard?.code })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label className="font-medium">{t('standards.requiredDocuments')}</Label>
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
                      placeholder={t('standards.docName')}
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setEditDocuments(editDocuments.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEditDocuments([...editDocuments, ''])}>
                <Plus className="w-4 h-4 ml-2" /> {t('standards.addDocument')}
              </Button>
            </div>
            <div>
              <Label className="font-medium">{t('standards.kpiTitle')}</Label>
              <div className="mt-2 space-y-3">
                {editKpis.map((kpi, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Input value={kpi.name} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], name: e.target.value }; setEditKpis(n); }} placeholder={t('standards.kpiName')} className="flex-1 min-w-[120px]" />
                    <Input value={kpi.target} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], target: e.target.value }; setEditKpis(n); }} placeholder={t('standards.kpiTarget')} className="w-24" />
                    <Input value={kpi.unit} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], unit: e.target.value }; setEditKpis(n); }} placeholder={t('standards.kpiUnit')} className="w-20" />
                    <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setEditKpis(editKpis.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEditKpis([...editKpis, { name: '', target: '', unit: '' }])}>
                <Plus className="w-4 h-4 ml-2" /> {t('standards.addKPI')}
              </Button>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setEditStandardOpen(false)}>{t('common.cancel')}</Button>
              <Button
                className="bg-primary"
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
                {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Axis Dialog */}
      <Dialog open={editAxisOpen} onOpenChange={setEditAxisOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{t('standards.editAxis')}</DialogTitle></DialogHeader>
          {editAxisData && (
            <form onSubmit={handleUpdateAxis} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t('standards.axisName')}</Label>
                <Input value={editAxisData.name} onChange={(e) => setEditAxisData({ ...editAxisData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('standards.axisDescription')}</Label>
                <Textarea value={editAxisData.description} onChange={(e) => setEditAxisData({ ...editAxisData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('standards.axisOrderFixed')}</Label>
                <Input type="number" value={editAxisData.order} disabled className="bg-muted cursor-not-allowed opacity-70" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setEditAxisOpen(false)}>{t('common.cancel')}</Button>
                <Button type="submit" className="bg-primary">{t('common.saveChanges')}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Standard Info Dialog */}
      <Dialog open={editStandardInfoOpen} onOpenChange={setEditStandardInfoOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-2xl">
          <DialogHeader><DialogTitle>{t('standards.editStandardData')} — {editStandardInfo?.code}</DialogTitle></DialogHeader>
          {editStandardInfo && (
            <form onSubmit={handleUpdateStandardInfo} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('standards.standardCode')}</Label>
                  <Input value={editStandardInfo.code} onChange={(e) => setEditStandardInfo({ ...editStandardInfo, code: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('standards.axis')}</Label>
                  <Select value={editStandardInfo.axis_id} onValueChange={(v) => setEditStandardInfo({ ...editStandardInfo, axis_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t('standards.chooseAxis')} /></SelectTrigger>
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
                <Label>{t('standards.standardTitle')}</Label>
                <Input value={editStandardInfo.title} onChange={(e) => setEditStandardInfo({ ...editStandardInfo, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('common.description')}</Label>
                <Textarea value={editStandardInfo.description} onChange={(e) => setEditStandardInfo({ ...editStandardInfo, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.status')}</Label>
                  <Select value={editStandardInfo.status} onValueChange={(v) => setEditStandardInfo({ ...editStandardInfo, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">{t('standards.standardStatusNotStarted')}</SelectItem>
                      <SelectItem value="in_progress">{t('standards.standardStatusInProgress')}</SelectItem>
                      <SelectItem value="completed">{t('standards.standardStatusCompleted')}</SelectItem>
                      <SelectItem value="approved">{t('standards.standardStatusApproved')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('standards.requiredEvidence')}</Label>
                  <Input value={editStandardInfo.required_evidence} onChange={(e) => setEditStandardInfo({ ...editStandardInfo, required_evidence: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setEditStandardInfoOpen(false)}>{t('common.cancel')}</Button>
                <Button type="submit" className="bg-primary">{t('common.saveChanges')}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Form */}
      <Dialog open={evidenceFormOpen} onOpenChange={setEvidenceFormOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('standards.uploadEvidenceTitle')} {selectedStandard?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadEvidence} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>{t('standards.evidenceTitle')}</Label>
              <Input value={evidenceForm.title} onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Textarea value={evidenceForm.description} onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('standards.evidenceFile')}</Label>
              <Input type="file" onChange={(e) => setEvidenceForm({ ...evidenceForm, file: e.target.files[0] })} accept="image/*,.pdf,.doc,.docx" required />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setEvidenceFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={uploading} className="bg-primary">
                {uploading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {t('standards.uploadEvidence')}
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