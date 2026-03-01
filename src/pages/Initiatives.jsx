import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Search, Lightbulb, Users, Calendar, DollarSign, 
  Target, TrendingUp, Clock, CheckCircle, AlertCircle,
  Loader2, Eye, Edit, Play, Pause, X, Trash2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import KPIManager from "../components/initiatives/KPIManager";
import { sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';
import { usePermissions } from '@/hooks/usePermissions';
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';

const statusConfig = {
  planning: { label: 'تخطيط', color: 'bg-gray-600', icon: Clock },
  approved: { label: 'معتمدة', color: 'bg-blue-600', icon: CheckCircle },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-yellow-600', icon: Play },
  completed: { label: 'مكتملة', color: 'bg-green-600', icon: CheckCircle },
  on_hold: { label: 'متوقفة', color: 'bg-orange-600', icon: Pause },
  cancelled: { label: 'ملغاة', color: 'bg-red-600', icon: X }
};

const normalizeInitiativeStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (['approved', 'معتمد', 'معتمدة'].includes(normalized)) return 'approved';
  if (['planning', 'pending', 'waiting', 'تخطيط', 'انتظار', 'بانتظار'].includes(normalized)) return 'planning';
  if (['in_progress', 'in progress', 'قيد التنفيذ'].includes(normalized)) return 'in_progress';
  if (['completed', 'مكتمل', 'مكتملة'].includes(normalized)) return 'completed';
  if (['on_hold', 'on hold', 'معلق', 'متوقفة'].includes(normalized)) return 'on_hold';
  if (['cancelled', 'canceled', 'ملغي', 'ملغاة'].includes(normalized)) return 'cancelled';
  return normalized || 'planning';
};

const priorityConfig = {
  low: { label: 'منخفضة', color: 'bg-blue-100 text-blue-700' },
  medium: { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' }
};

const impactConfig = {
  low: 'تأثير محدود',
  medium: 'تأثير متوسط',
  high: 'تأثير كبير',
  very_high: 'تأثير كبير جداً'
};

const parseTeamMemberIds = (raw) => {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // fallback to comma separated format
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const INITIATIVE_PREFILL_STORAGE_KEY = 'initiative_prefill_from_standard';

const getDefaultInitiativeFormData = () => ({
  code: generateInitiativeCode(),
  title: '',
  description: '',
  objectives: '',
  committee_id: '',
  committee_name: '',
  axis_id: '',
  axis_name: '',
  standard_id: '',
  standard_code: '',
  related_standards: [],
  target_audience: '',
  expected_beneficiaries: 0,
  start_date: '',
  end_date: '',
  budget: 0,
  budget_id: '',
  budget_name: '',
  budget_allocation_id: '',
  budget_allocation_category: '',
  leader_id: '',
  leader_name: '',
  team_members: [],
  priority: 'medium',
  impact_level: 'medium',
  location: '',
  partners: '',
  notes: '',
});

const normalizeMatchingText = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenizeText = (value) => {
  return normalizeMatchingText(value)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
};

const suggestStandardForInitiative = (initiative, standards) => {
  const list = Array.isArray(standards) ? standards : [];
  if (list.length === 0) return null;

  const initiativeText = normalizeMatchingText([
    initiative?.title,
    initiative?.description,
    initiative?.objectives,
    initiative?.notes,
  ].filter(Boolean).join(' '));

  const initiativeTokens = new Set(tokenizeText(initiativeText));
  const filteredByAxis = initiative?.axis_id
    ? list.filter((standard) => String(standard?.axis_id || '') === String(initiative.axis_id))
    : [];
  const candidates = filteredByAxis.length > 0 ? filteredByAxis : list;

  let best = null;
  let bestScore = -1;

  for (const standard of candidates) {
    const standardTitle = normalizeMatchingText(standard?.title || '');
    const standardDesc = normalizeMatchingText(standard?.description || '');
    const standardCode = normalizeMatchingText(standard?.code || '');
    const standardTokens = new Set(tokenizeText(`${standardTitle} ${standardDesc} ${standardCode}`));

    let score = 0;

    if (standardCode && initiativeText.includes(standardCode)) score += 10;
    if (standardTitle && initiativeText.includes(standardTitle)) score += 8;

    let overlap = 0;
    standardTokens.forEach((token) => {
      if (initiativeTokens.has(token)) overlap += 1;
    });
    score += overlap * 1.5;

    if (initiative?.axis_id && String(standard?.axis_id || '') === String(initiative.axis_id)) score += 2;

    if (score > bestScore) {
      bestScore = score;
      best = standard;
    }
  }

  return bestScore >= 3 ? best : null;
};

const resolveStandardLinkFields = (initiativeLike, standardsById, standardsByCode) => {
  const relatedIds = parseRelatedStandardIds(initiativeLike?.related_standards)
    .map((id) => String(id))
    .filter((id) => standardsById.has(id));

  const uniqueRelatedIds = [...new Set(relatedIds)];
  const byStandardId = initiativeLike?.standard_id ? standardsById.get(String(initiativeLike.standard_id)) : null;
  const byStandardCode = initiativeLike?.standard_code
    ? standardsByCode.get(String(initiativeLike.standard_code || '').trim())
    : null;

  const primaryStandard = byStandardId || byStandardCode || (uniqueRelatedIds.length > 0 ? standardsById.get(uniqueRelatedIds[0]) : null);

  const normalizedRelated = primaryStandard ? [String(primaryStandard.id)] : [];

  return {
    standard_id: primaryStandard?.id || null,
    standard_code: primaryStandard?.code || null,
    related_standards: normalizedRelated,
  };
};

const generateInitiativeCode = () => `INI${Date.now().toString().slice(-6)}`;

const parseRelatedStandardIds = (raw) => {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // ignore and fallback below
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean).map(String);
  }
  return [];
};

const getInitiativeLinkedTeam = (initiative, members) => {
  const ids = parseTeamMemberIds(initiative?.team_members);
  const linked = ids
    .map((id) => members.find((m) => String(m.id) === String(id)))
    .filter(Boolean);

  if (linked.length > 0) return linked;

  if (initiative?.leader_id) {
    const leader = members.find((m) => String(m.id) === String(initiative.leader_id));
    if (leader) return [leader];
  }
  return [];
};

const pickSuggestedTeam = (initiative, members) => {
  const committeePool = members.filter((m) => String(m.committee_id || '') === String(initiative?.committee_id || ''));
  const source = committeePool.length > 0 ? committeePool : members;

  const scored = source.map((member) => {
    const role = String(member.role || '').toLowerCase();
    let score = 0;
    if (role.includes('رئيس') || role.includes('head')) score += 4;
    if (role.includes('منسق') || role.includes('coordinator')) score += 3;
    if (role.includes('مشرف') || role.includes('supervisor')) score += 2;
    if (member.email) score += 1;
    if (member.phone) score += 1;
    if (String(member.id) === String(initiative?.leader_id)) score += 5;
    return { member, score };
  });

  const top = scored.sort((a, b) => b.score - a.score).slice(0, 5).map((item) => item.member);
  return top;
};

const getInitiativeSuggestedDocuments = (initiative) => {
  const docs = [
    'خطة تنفيذ المبادرة',
    'تقرير تقدم دوري',
    'محضر اجتماع فريق المبادرة',
    'قائمة تحقق جودة التنفيذ',
    'سجل المخاطر والتحديات',
    'دليل إثبات الإنجاز',
  ];
  if ((initiative?.budget || 0) > 0) docs.push('تقرير صرف الميزانية والفواتير');
  if ((initiative?.expected_beneficiaries || 0) > 0) docs.push('كشف المستفيدين وقياس الرضا');
  return docs;
};

const getInitiativeSuggestedTasks = (initiative) => {
  const tasks = [
    'اعتماد خطة العمل التفصيلية وجدول التنفيذ',
    'توزيع الأدوار على فريق المبادرة',
    'اجتماع متابعة أسبوعي لتحديث التقدم',
    'رفع تقرير تقدم شهري للإدارة',
    'مراجعة المخاطر وإجراءات المعالجة',
  ];
  if ((initiative?.budget || 0) > 0) tasks.push('مراجعة المصروفات مقابل الميزانية المعتمدة');
  if ((initiative?.related_standards || []).length > 0) tasks.push('التحقق من توافق مخرجات المبادرة مع المعايير المرتبطة');
  return tasks;
};

const getInitiativeSuggestedKpis = (initiative, docs, tasks) => {
  const expectedBeneficiaries = Number(initiative?.expected_beneficiaries) || 0;
  const budget = Number(initiative?.budget) || 0;
  const durationDays = initiative?.start_date && initiative?.end_date
    ? Math.max(1, Math.round((new Date(initiative.end_date) - new Date(initiative.start_date)) / (1000 * 60 * 60 * 24)))
    : 90;

  return [
    {
      kpi_name: 'نسبة إنجاز الأعمال التشغيلية',
      description: 'قياس نسبة تنفيذ الأعمال المطلوب تنفيذها ضمن خطة المبادرة.',
      target_value: tasks.length,
      current_value: 0,
      unit: 'مهمة',
      measurement_frequency: 'أسبوعي',
    },
    {
      kpi_name: 'نسبة استكمال المستندات المطلوبة',
      description: 'قياس اكتمال الوثائق المرجعية والإثباتات المطلوبة للمبادرة.',
      target_value: docs.length,
      current_value: 0,
      unit: 'مستند',
      measurement_frequency: 'شهري',
    },
    {
      kpi_name: 'الالتزام بالجدول الزمني',
      description: 'عدد الأيام المنفذة ضمن الفترة الزمنية المخططة.',
      target_value: durationDays,
      current_value: 0,
      unit: 'يوم',
      measurement_frequency: 'شهري',
    },
    {
      kpi_name: 'تحقيق المستفيدين المستهدفين',
      description: 'عدد المستفيدين الفعليين مقارنة بالمستهدف.',
      target_value: expectedBeneficiaries > 0 ? expectedBeneficiaries : 100,
      current_value: 0,
      unit: 'مستفيد',
      measurement_frequency: 'شهري',
    },
    {
      kpi_name: 'نسبة الالتزام بالميزانية',
      description: 'قياس الصرف الفعلي ضمن الميزانية المعتمدة.',
      target_value: budget > 0 ? budget : 100,
      current_value: 0,
      unit: budget > 0 ? 'ريال' : '%',
      measurement_frequency: 'شهري',
    },
  ];
};

export default function Initiatives() {
  const { permissions } = usePermissions();
  const repairingStandardsRef = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [openedFromStandardLabel, setOpenedFromStandardLabel] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [deletingInitiative, setDeletingInitiative] = useState(false);
  const [applyingSuggestedKpis, setApplyingSuggestedKpis] = useState(false);
  const [applyingSuggestedTeam, setApplyingSuggestedTeam] = useState(false);
  const [autoAppliedInitiativeId, setAutoAppliedInitiativeId] = useState(null);
  const [autoLinkedTeamInitiativeId, setAutoLinkedTeamInitiativeId] = useState(null);
  const [teamMemberToAddId, setTeamMemberToAddId] = useState('');

  const [formData, setFormData] = useState(getDefaultInitiativeFormData());

  const [kpisList, setKpisList] = useState([]);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => api.entities.Initiative.list('-created_date')
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list('order')
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.entities.Budget.list('-created_date')
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => api.entities.BudgetAllocation.list()
  });

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const standardsById = useMemo(() => {
    const map = new Map();
    (standards || []).forEach((standard) => {
      if (!standard?.id) return;
      map.set(String(standard.id), standard);
    });
    return map;
  }, [standards]);

  const standardsByCode = useMemo(() => {
    const map = new Map();
    (standards || []).forEach((standard) => {
      const code = String(standard?.code || '').trim();
      if (!code) return;
      map.set(code, standard);
    });
    return map;
  }, [standards]);

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: selectedInitiativeKpis = [], isFetched: isSelectedInitiativeKpisFetched } = useQuery({
    queryKey: ['kpis', selectedInitiative?.id],
    queryFn: () => api.entities.InitiativeKPI.filter({ initiative_id: selectedInitiative.id }),
    enabled: !!selectedInitiative?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Initiative.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setViewOpen(false);
    }
  });

  if (!permissions.canSeeInitiatives) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة المبادرات. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: initiatives.length,
    planning: initiatives.filter(i => normalizeInitiativeStatus(i.status) === 'planning').length,
    approved: initiatives.filter(i => normalizeInitiativeStatus(i.status) === 'approved').length,
    inProgress: initiatives.filter(i => normalizeInitiativeStatus(i.status) === 'in_progress').length,
    completed: initiatives.filter(i => normalizeInitiativeStatus(i.status) === 'completed').length,
    totalBudget: initiatives.reduce((sum, i) => sum + (i.budget || 0), 0),
    totalBeneficiaries: initiatives.reduce((sum, i) => sum + (i.expected_beneficiaries || 0), 0)
  };

  const handleAddTeamMember = async () => {
    if (!selectedInitiative?.id || !teamMemberToAddId) return;
    try {
      const currentIds = parseTeamMemberIds(selectedInitiative.team_members);
      const mergedIds = [...new Set([...currentIds, teamMemberToAddId])];
      const selectedMember = members.find((m) => String(m.id) === String(teamMemberToAddId));

      const updateData = {
        team_members: mergedIds,
        ...(!selectedInitiative.leader_id && selectedMember
          ? { leader_id: selectedMember.id, leader_name: selectedMember.full_name }
          : {}),
      };

      await api.entities.Initiative.update(selectedInitiative.id, updateData);
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setSelectedInitiative((prev) => (prev ? { ...prev, ...updateData } : prev));
      setTeamMemberToAddId('');
    } catch (err) {
      if (typeof window !== 'undefined') window.alert(`تعذر إضافة العضو للفريق.\n${err?.message || err}`);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    if (!selectedInitiative?.id || !memberId) return;
    try {
      const currentIds = parseTeamMemberIds(selectedInitiative.team_members);
      const nextIds = currentIds.filter((id) => String(id) !== String(memberId));

      const updateData = {
        team_members: nextIds,
        ...(String(selectedInitiative.leader_id || '') === String(memberId)
          ? { leader_id: null, leader_name: null }
          : {}),
      };

      await api.entities.Initiative.update(selectedInitiative.id, updateData);
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setSelectedInitiative((prev) => (prev ? { ...prev, ...updateData } : prev));
    } catch (err) {
      if (typeof window !== 'undefined') window.alert(`تعذر حذف العضو من الفريق.\n${err?.message || err}`);
    }
  };

  const handleDeleteInitiative = async (initiative) => {
    if (!initiative?.id) return;
    const confirmed = await requireSecureDeleteConfirmation(`المبادرة "${initiative.title}"`);
    if (!confirmed) return;

    setDeletingInitiative(true);
    try {
      const linkedKpis = await api.entities.InitiativeKPI.filter({ initiative_id: initiative.id });
      for (const kpi of linkedKpis) {
        await api.entities.InitiativeKPI.delete(kpi.id);
      }

      await api.entities.Initiative.delete(initiative.id);
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['kpis', initiative.id] });

      if (String(selectedInitiative?.id || '') === String(initiative.id)) {
        setViewOpen(false);
        setSelectedInitiative(null);
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.alert(`تعذر حذف المبادرة.\n${err?.message || err}`);
      }
    } finally {
      setDeletingInitiative(false);
    }
  };

  const handleApplySuggestedKpis = async ({ silent = false } = {}) => {
    if (!selectedInitiative?.id) return;
    setApplyingSuggestedKpis(true);
    try {
      const existing = new Set((selectedInitiativeKpis || []).map((k) => String(k.kpi_name || '').trim()));
      const toCreate = selectedSuggestedKpis.filter((k) => !existing.has(String(k.kpi_name || '').trim()));

      if (toCreate.length === 0) {
        if (!silent && typeof window !== 'undefined') window.alert('تمت إضافة المؤشرات المقترحة مسبقاً.');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      for (const kpi of toCreate) {
        await api.entities.InitiativeKPI.create({
          ...kpi,
          initiative_id: selectedInitiative.id,
          initiative_title: selectedInitiative.title,
          status: 'behind',
          last_updated: today,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['kpis', selectedInitiative.id] });
      if (!silent && typeof window !== 'undefined') window.alert('تمت إضافة مؤشرات الأداء المقترحة للمبادرة.');
    } catch (err) {
      if (!silent && typeof window !== 'undefined') window.alert(`تعذر إضافة المؤشرات المقترحة.\n${err?.message || err}`);
    } finally {
      setApplyingSuggestedKpis(false);
    }
  };

  const handleLinkSuggestedTeam = async ({ silent = false } = {}) => {
    if (!selectedInitiative?.id || selectedSuggestedTeam.length === 0) return;
    setApplyingSuggestedTeam(true);
    try {
      const mergedIds = [
        ...new Set([
          ...parseTeamMemberIds(selectedInitiative.team_members),
          ...selectedSuggestedTeam.map((m) => m.id),
        ]),
      ];

      const updateData = {
        team_members: mergedIds,
      };

      if (!selectedInitiative.leader_id && selectedSuggestedTeam[0]) {
        updateData.leader_id = selectedSuggestedTeam[0].id;
        updateData.leader_name = selectedSuggestedTeam[0].full_name;
      }

      await api.entities.Initiative.update(selectedInitiative.id, updateData);
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setSelectedInitiative((prev) => (prev ? { ...prev, ...updateData } : prev));
      if (!silent && typeof window !== 'undefined') window.alert('تم ربط الفريق المقترح بالمبادرة.');
    } catch (err) {
      if (!silent && typeof window !== 'undefined') window.alert(`تعذر ربط الفريق المقترح.\n${err?.message || err}`);
    } finally {
      setApplyingSuggestedTeam(false);
    }
  };

  const filteredInitiatives = initiatives.filter(i => {
    const matchesSearch = !searchQuery ||
      i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code?.includes(searchQuery) ||
      i.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeStatus === 'all' || normalizeInitiativeStatus(i.status) === activeStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedInitiativeStatus = normalizeInitiativeStatus(selectedInitiative?.status);

  const selectedLinkedTeam = useMemo(
    () => getInitiativeLinkedTeam(selectedInitiative, members),
    [selectedInitiative, members]
  );

  const availableTeamMembersForAdd = useMemo(() => {
    if (!selectedInitiative) return [];
    const linkedIds = new Set(selectedLinkedTeam.map((member) => String(member.id)));
    return members.filter((member) => !linkedIds.has(String(member.id)));
  }, [selectedInitiative, selectedLinkedTeam, members]);

  const selectedSuggestedTeam = useMemo(() => {
    if (!selectedInitiative) return [];
    return pickSuggestedTeam(selectedInitiative, members).filter(
      (m) => !selectedLinkedTeam.some((linked) => String(linked.id) === String(m.id))
    );
  }, [selectedInitiative, members, selectedLinkedTeam]);

  const selectedSuggestedDocs = useMemo(
    () => getInitiativeSuggestedDocuments(selectedInitiative),
    [selectedInitiative]
  );

  const selectedSuggestedTasks = useMemo(
    () => getInitiativeSuggestedTasks(selectedInitiative),
    [selectedInitiative]
  );

  const selectedSuggestedKpis = useMemo(
    () => getInitiativeSuggestedKpis(selectedInitiative, selectedSuggestedDocs, selectedSuggestedTasks),
    [selectedInitiative, selectedSuggestedDocs, selectedSuggestedTasks]
  );

  const selectedLinkedStandardIds = useMemo(() => {
    if (!selectedInitiative) return [];
    return resolveStandardLinkFields(selectedInitiative, standardsById, standardsByCode).related_standards;
  }, [selectedInitiative, standardsById, standardsByCode]);

  useEffect(() => {
    if (!viewOpen || !selectedInitiative?.id) return;
    if (!isSelectedInitiativeKpisFetched) return;
    if (selectedInitiativeKpis.length > 0) return;
    if (selectedSuggestedKpis.length === 0) return;
    if (autoAppliedInitiativeId === selectedInitiative.id) return;

    setAutoAppliedInitiativeId(selectedInitiative.id);
    handleApplySuggestedKpis({ silent: true });
  }, [
    viewOpen,
    selectedInitiative?.id,
    isSelectedInitiativeKpisFetched,
    selectedInitiativeKpis,
    selectedSuggestedKpis,
    autoAppliedInitiativeId,
  ]);

  useEffect(() => {
    if (!viewOpen || !selectedInitiative?.id) return;
    if (selectedSuggestedTeam.length === 0) return;
    if (autoLinkedTeamInitiativeId === selectedInitiative.id) return;

    setAutoLinkedTeamInitiativeId(selectedInitiative.id);
    handleLinkSuggestedTeam({ silent: true });
  }, [
    viewOpen,
    selectedInitiative?.id,
    selectedSuggestedTeam,
    autoLinkedTeamInitiativeId,
  ]);

  useEffect(() => {
    if (!Array.isArray(initiatives) || initiatives.length === 0) return;
    if (standardsById.size === 0) return;
    if (repairingStandardsRef.current) return;

    let cancelled = false;
    repairingStandardsRef.current = true;

    (async () => {
      try {
        let repairedCount = 0;
        for (const initiative of initiatives) {
          if (cancelled || !initiative?.id) return;

          const normalized = resolveStandardLinkFields(initiative, standardsById, standardsByCode);
          const inferredStandard = !normalized.standard_id
            ? suggestStandardForInitiative(initiative, standards)
            : null;
          const finalNormalized = inferredStandard
            ? {
                ...normalized,
                standard_id: inferredStandard.id,
                standard_code: inferredStandard.code,
                related_standards: [String(inferredStandard.id)],
              }
            : normalized;
          const currentRelated = parseRelatedStandardIds(initiative.related_standards).map(String);
          const currentRelatedNormalized = [...new Set(currentRelated.filter((id) => standardsById.has(String(id))))];

          const sameStandardId = String(initiative.standard_id || '') === String(finalNormalized.standard_id || '');
          const sameStandardCode = String(initiative.standard_code || '').trim() === String(finalNormalized.standard_code || '').trim();
          const sameRelated = JSON.stringify(currentRelatedNormalized) === JSON.stringify(finalNormalized.related_standards);

          if (sameStandardId && sameStandardCode && sameRelated) continue;

          await api.entities.Initiative.update(initiative.id, finalNormalized);
          repairedCount += 1;
        }

        if (!cancelled && repairedCount > 0) {
          queryClient.invalidateQueries({ queryKey: ['initiatives'] });
        }
      } catch {
        // تجاهل أخطاء المزامنة التلقائية حتى لا تؤثر على تجربة المستخدم
      } finally {
        repairingStandardsRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      repairingStandardsRef.current = false;
    };
  }, [initiatives, standards, standardsById, standardsByCode, queryClient]);

  const resetForm = () => {
    setFormData(getDefaultInitiativeFormData());
    setKpisList([]);
    setOpenedFromStandardLabel('');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(INITIATIVE_PREFILL_STORAGE_KEY);
      if (!raw) return;

      localStorage.removeItem(INITIATIVE_PREFILL_STORAGE_KEY);
      const parsed = JSON.parse(raw);
      const defaults = getDefaultInitiativeFormData();
      const prefillRelated = parseRelatedStandardIds(parsed?.related_standards);

      setFormData({
        ...defaults,
        ...parsed,
        code: defaults.code,
        related_standards: prefillRelated,
        standard_id: parsed?.standard_id || (prefillRelated[0] || ''),
        standard_code: parsed?.standard_code || '',
        team_members: Array.isArray(parsed?.team_members) ? parsed.team_members : [],
      });
      const code = String(parsed?.standard_code || '').trim();
      const title = String(parsed?.standard_title || '').trim();
      const sourceLabel = code && title ? `${code} — ${title}` : (code || title || '');
      setOpenedFromStandardLabel(sourceLabel);
      setKpisList([]);
      setFormOpen(true);
    } catch {
      localStorage.removeItem(INITIATIVE_PREFILL_STORAGE_KEY);
    }
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createInitiativeWithAutomation(formData, kpisList);
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setFormOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (initiative, newStatus) => {
    await updateMutation.mutateAsync({
      id: initiative.id,
      data: { 
        status: newStatus,
        ...(newStatus === 'approved' && {
          approval_date: new Date().toISOString().split('T')[0],
          approved_by: currentUser?.full_name
        }),
        ...(newStatus === 'planning' && {
          approval_date: null,
          approved_by: null
        })
      }
    });
  };

  const toggleStandard = (standardId) => {
    const current = formData.related_standards || [];
    if (current.includes(standardId)) {
      const nextRelated = current.filter(s => s !== standardId);
      const primary = nextRelated.length > 0 ? standards.find((s) => String(s.id) === String(nextRelated[0])) : null;
      setFormData({
        ...formData,
        related_standards: nextRelated,
        standard_id: primary?.id || '',
        standard_code: primary?.code || '',
      });
    } else {
      const nextRelated = [...current, standardId];
      const primary = standards.find((s) => String(s.id) === String(nextRelated[0]));
      setFormData({
        ...formData,
        related_standards: nextRelated,
        standard_id: primary?.id || '',
        standard_code: primary?.code || '',
      });
    }
  };

  const axisStandards = formData.axis_id
    ? sortAndDeduplicateStandardsByCode(standards.filter(s => s.axis_id === formData.axis_id))
    : [];

  const resolveBudgetLink = (initiativeData) => {
    const activeBudget = budgets.find((b) => b.status === 'active') || budgets.find((b) => b.status === 'draft') || budgets[0];
    const matchedAllocation = allocations.find((allocation) => {
      if (!activeBudget || String(allocation.budget_id || '') !== String(activeBudget.id)) return false;
      const committeeMatch = initiativeData.committee_id && String(allocation.committee_id || '') === String(initiativeData.committee_id);
      const axisMatch = initiativeData.axis_id && String(allocation.axis_id || '') === String(initiativeData.axis_id);
      return committeeMatch || axisMatch;
    });

    return {
      budget_id: matchedAllocation?.budget_id || activeBudget?.id || null,
      budget_name: matchedAllocation?.budget_name || activeBudget?.name || null,
      budget_allocation_id: matchedAllocation?.id || null,
      budget_allocation_category: matchedAllocation?.category || null,
    };
  };

  const createInitiativeWithAutomation = async (initiativeInput, manualKpis = []) => {
    const initiativeCode = initiativeInput.code || `INI${Date.now().toString().slice(-6)}`;
    const suggestedTeam = pickSuggestedTeam(initiativeInput, members);
    const existingTeamIds = parseTeamMemberIds(initiativeInput.team_members);
    const mergedTeamIds = [...new Set([...existingTeamIds, ...suggestedTeam.map((m) => m.id)])];
    const leaderCandidate = initiativeInput.leader_id ? null : suggestedTeam[0];
    const budgetLink = resolveBudgetLink(initiativeInput);
    const standardLink = resolveStandardLinkFields(initiativeInput, standardsById, standardsByCode);
    const inferredStandard = !standardLink.standard_id
      ? suggestStandardForInitiative(initiativeInput, standards)
      : null;
    const finalStandardLink = inferredStandard
      ? {
          ...standardLink,
          standard_id: inferredStandard.id,
          standard_code: inferredStandard.code,
          related_standards: [String(inferredStandard.id)],
        }
      : standardLink;

    const newInitiative = await api.entities.Initiative.create({
      ...initiativeInput,
      code: initiativeCode,
      ...budgetLink,
      ...finalStandardLink,
      team_members: mergedTeamIds,
      ...(leaderCandidate && {
        leader_id: leaderCandidate.id,
        leader_name: leaderCandidate.full_name,
      }),
      status: 'planning',
      progress_percentage: 0,
      actual_cost: 0,
    });

    if (!newInitiative) return null;

    const suggestedDocs = getInitiativeSuggestedDocuments(initiativeInput);
    const suggestedTasks = getInitiativeSuggestedTasks(initiativeInput);
    const suggestedKpis = getInitiativeSuggestedKpis(initiativeInput, suggestedDocs, suggestedTasks);

    const allKpis = [...(Array.isArray(manualKpis) ? manualKpis : []), ...suggestedKpis];
    const seenNames = new Set();
    const dedupedKpis = allKpis.filter((kpi) => {
      const key = String(kpi?.kpi_name || '').trim();
      if (!key || seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    const today = new Date().toISOString().split('T')[0];
    for (const kpi of dedupedKpis) {
      const target = Number(kpi.target_value) || 0;
      const current = Number(kpi.current_value) || 0;
      const percentage = target > 0 ? (current / target) * 100 : 0;
      const status = percentage >= 100 ? 'achieved' :
                     percentage >= 75 ? 'on_track' :
                     percentage >= 50 ? 'at_risk' : 'behind';

      await api.entities.InitiativeKPI.create({
        ...kpi,
        target_value: target,
        current_value: current,
        initiative_id: newInitiative.id,
        initiative_title: initiativeInput.title,
        status,
        last_updated: today,
      });
    }

    return newInitiative;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-purple-700 via-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Lightbulb className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">إدارة المبادرات</h1>
              <p className="text-purple-100 text-sm mt-1">مبادرات المدينة الصحية — المرتبطة بالمحاور والمعايير الـ 80</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">إجمالي المبادرات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-2xl font-bold">{stats.planning}</p>
              <p className="text-sm text-gray-500">تحت التخطيط</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">قيد التنفيذ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-gray-500">مكتملة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.totalBeneficiaries}</p>
              <p className="text-sm text-gray-500">المستفيدون</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{(stats.totalBudget / 1000).toFixed(0)}K</p>
              <p className="text-sm text-gray-500">الميزانية</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="بحث بالعنوان أو الرمز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-5 h-5 ml-2" />
            مبادرة جديدة
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="planning">تخطيط ({stats.planning})</TabsTrigger>
            <TabsTrigger value="approved">معتمدة ({stats.approved})</TabsTrigger>
            <TabsTrigger value="in_progress">قيد التنفيذ ({stats.inProgress})</TabsTrigger>
            <TabsTrigger value="completed">مكتملة ({stats.completed})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Initiatives Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
          </div>
        ) : filteredInitiatives.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Lightbulb className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد مبادرات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInitiatives.map(initiative => {
              const initiativeStatus = normalizeInitiativeStatus(initiative.status);
              const StatusIcon = statusConfig[initiativeStatus]?.icon || Clock;
              const linkedTeam = getInitiativeLinkedTeam(initiative, members);
              const linkedTeamText = linkedTeam.length > 0
                ? linkedTeam.slice(0, 2).map((m) => m.full_name).join('، ') + (linkedTeam.length > 2 ? ` +${linkedTeam.length - 2}` : '')
                : 'غير مرتبط';
              return (
                <Card key={initiative.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">{initiative.code}</Badge>
                        <h3 className="font-bold text-lg mb-1">{initiative.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{initiative.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={statusConfig[initiativeStatus]?.color}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {statusConfig[initiativeStatus]?.label}
                        </Badge>
                        <Badge className={priorityConfig[initiative.priority]?.color}>
                          {priorityConfig[initiative.priority]?.label}
                        </Badge>
                      </div>

                      {initiative.progress_percentage !== undefined && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">التقدم</span>
                            <span className="font-semibold">{initiative.progress_percentage}%</span>
                          </div>
                          <Progress value={initiative.progress_percentage} className="h-2" />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>{initiative.axis_name || 'غير محدد'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{initiative.committee_name || 'غير محدد'}</span>
                        </div>
                        {initiative.budget > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{initiative.budget.toLocaleString()} ريال</span>
                          </div>
                        )}
                        {initiative.expected_beneficiaries > 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{initiative.expected_beneficiaries} مستفيد</span>
                          </div>
                        )}
                        <div className="col-span-2 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>فريق المبادرة: {linkedTeamText}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { setSelectedInitiative(initiative); setViewOpen(true); }}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        عرض
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={deletingInitiative}
                        onClick={() => handleDeleteInitiative(initiative)}
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        حذف
                      </Button>
                      {initiativeStatus === 'planning' && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleStatusChange(initiative, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          اعتماد
                        </Button>
                      )}
                      {initiativeStatus === 'approved' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleStatusChange(initiative, 'planning')}
                          >
                            <Clock className="w-4 h-4 ml-1" />
                            إعادة للانتظار
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                            onClick={() => handleStatusChange(initiative, 'in_progress')}
                          >
                            <Play className="w-4 h-4 ml-1" />
                            بدء
                          </Button>
                        </>
                      )}
                      {initiativeStatus === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleStatusChange(initiative, 'planning')}
                        >
                          <Clock className="w-4 h-4 ml-1" />
                          إعادة للانتظار
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Initiative Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">مبادرة جديدة</DialogTitle>
          </DialogHeader>
          {openedFromStandardLabel && (
            <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800">
              تم فتح هذا النموذج من بطاقة المعيار: <span className="font-semibold">{openedFromStandardLabel}</span>
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-purple-600">
                <Lightbulb className="w-5 h-5" />
                المعلومات الأساسية
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>رمز المبادرة</Label>
                  <Input value={formData.code} readOnly disabled placeholder="يتم توليده تلقائيًا" />
                </div>
                <div className="space-y-2">
                  <Label>الأولوية *</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>عنوان المبادرة *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>الوصف *</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>الأهداف</Label>
                  <Textarea value={formData.objectives} onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} rows={2} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
                <Target className="w-5 h-5" />
                الارتباط التنظيمي
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اللجنة *</Label>
                  <Select value={formData.committee_id} onValueChange={(v) => {
                    const committee = committees.find(c => c.id === v);
                    setFormData({ ...formData, committee_id: v, committee_name: committee?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر اللجنة" /></SelectTrigger>
                    <SelectContent>
                      {committees.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المحور</Label>
                  <Select value={formData.axis_id} onValueChange={(v) => {
                    const axis = axes.find(a => a.id === v);
                    setFormData({ ...formData, axis_id: v, axis_name: axis?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر المحور" /></SelectTrigger>
                    <SelectContent>
                      {axes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>المعايير المرتبطة</Label>
                  {formData.axis_id && axisStandards.length > 0 ? (
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                      {axisStandards.map(standard => (
                        <div key={standard.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.related_standards?.includes(standard.id)}
                            onChange={() => toggleStandard(standard.id)}
                            className="rounded"
                          />
                          <span className="text-sm">{standard.code} - {standard.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border rounded-lg p-3 text-xs text-gray-600 bg-gray-50">
                      {!formData.axis_id
                        ? 'اختر محورًا أولاً لعرض المعايير المرتبطة.'
                        : 'لا توجد معايير متاحة لهذا المحور حالياً.'}
                    </div>
                  )}

                </div>
                <div className="space-y-2">
                  <Label>قائد المبادرة</Label>
                  <Select value={formData.leader_id} onValueChange={(v) => {
                    const member = members.find(m => m.id === v);
                    setFormData({ ...formData, leader_id: v, leader_name: member?.full_name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر القائد" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>مستوى التأثير</Label>
                  <Select value={formData.impact_level} onValueChange={(v) => setFormData({ ...formData, impact_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(impactConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-green-600">
                <Calendar className="w-5 h-5" />
                الجدول الزمني والميزانية
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ البداية *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ النهاية *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>الميزانية المطلوبة (ريال)</Label>
                  <Input type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>عدد المستفيدين المتوقع</Label>
                  <Input type="number" value={formData.expected_beneficiaries} onChange={(e) => setFormData({ ...formData, expected_beneficiaries: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>الفئة المستهدفة</Label>
                  <Input value={formData.target_audience} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} placeholder="مثال: الأسر، الشباب، المرضى، إلخ" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع/النطاق الجغرافي</Label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>الشركاء</Label>
                  <Input value={formData.partners} onChange={(e) => setFormData({ ...formData, partners: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>مؤشرات الأداء الرئيسية (KPIs)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setKpisList([...kpisList, {
                          kpi_name: '',
                          description: '',
                          target_value: 0,
                          current_value: 0,
                          unit: '',
                          measurement_frequency: 'شهري'
                        }]);
                      }}
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة مؤشر
                    </Button>
                  </div>
                  
                  {kpisList.length === 0 ? (
                    <div className="text-center py-4 border rounded-lg bg-gray-50">
                      <Target className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">لم يتم إضافة مؤشرات أداء بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-3 max-h-64 overflow-y-auto">
                      {kpisList.map((kpi, index) => (
                        <Card key={index} className="bg-gray-50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-sm">مؤشر #{index + 1}</h4>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setKpisList(kpisList.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="col-span-2">
                                <Input
                                  placeholder="اسم المؤشر *"
                                  value={kpi.kpi_name}
                                  onChange={(e) => {
                                    const newList = [...kpisList];
                                    newList[index].kpi_name = e.target.value;
                                    setKpisList(newList);
                                  }}
                                  required
                                />
                              </div>
                              <Input
                                type="number"
                                placeholder="القيمة المستهدفة"
                                value={kpi.target_value}
                                onChange={(e) => {
                                  const newList = [...kpisList];
                                  newList[index].target_value = parseFloat(e.target.value) || 0;
                                  setKpisList(newList);
                                }}
                              />
                              <Input
                                placeholder="وحدة القياس"
                                value={kpi.unit}
                                onChange={(e) => {
                                  const newList = [...kpisList];
                                  newList[index].unit = e.target.value;
                                  setKpisList(newList);
                                }}
                              />
                              <Select
                                value={kpi.measurement_frequency}
                                onValueChange={(v) => {
                                  const newList = [...kpisList];
                                  newList[index].measurement_frequency = v;
                                  setKpisList(newList);
                                }}
                              >
                                <SelectTrigger className="col-span-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="يومي">يومي</SelectItem>
                                  <SelectItem value="أسبوعي">أسبوعي</SelectItem>
                                  <SelectItem value="شهري">شهري</SelectItem>
                                  <SelectItem value="ربع سنوي">ربع سنوي</SelectItem>
                                  <SelectItem value="سنوي">سنوي</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ المبادرة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Initiative Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المبادرة - {selectedInitiative?.code}</DialogTitle>
          </DialogHeader>
          {selectedInitiative && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{selectedInitiative.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{selectedInitiative.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusConfig[selectedInitiativeStatus]?.color}>
                        {statusConfig[selectedInitiativeStatus]?.label}
                      </Badge>
                      <Badge className={priorityConfig[selectedInitiative.priority]?.color}>
                        {priorityConfig[selectedInitiative.priority]?.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedInitiative.objectives && (
                    <div>
                      <h4 className="font-semibold mb-1">الأهداف:</h4>
                      <p className="text-sm text-gray-600">{selectedInitiative.objectives}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">اللجنة:</span>
                      <p className="font-semibold">{selectedInitiative.committee_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">المحور:</span>
                      <p className="font-semibold">{selectedInitiative.axis_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">الفترة:</span>
                      <p className="font-semibold">{selectedInitiative.start_date} - {selectedInitiative.end_date}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">القائد:</span>
                      <p className="font-semibold">{selectedInitiative.leader_name || 'غير محدد'}</p>
                    </div>
                    {selectedInitiative.budget > 0 && (
                      <div>
                        <span className="text-gray-500">الميزانية:</span>
                        <p className="font-semibold">{selectedInitiative.budget.toLocaleString()} ريال</p>
                      </div>
                    )}
                    {selectedInitiative.budget_allocation_id && (
                      <div>
                        <span className="text-gray-500">ربط المخصص المالي:</span>
                        <p className="font-semibold">{selectedInitiative.budget_name || 'ميزانية مرتبطة'} — {selectedInitiative.budget_allocation_category || 'بند مخصصات'}</p>
                      </div>
                    )}
                    {selectedInitiative.expected_beneficiaries > 0 && (
                      <div>
                        <span className="text-gray-500">المستفيدون المتوقعون:</span>
                        <p className="font-semibold">{selectedInitiative.expected_beneficiaries}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">المعايير المرتبطة:</h4>
                    {selectedLinkedStandardIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedLinkedStandardIds.map((sid) => {
                          const standard = standardsById.get(String(sid));
                          return standard ? (
                            <Badge key={sid} variant="outline">
                              {standard.code} - {standard.title?.slice(0, 50)}{(standard.title?.length || 0) > 50 ? '...' : ''}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">لا يوجد معيار مرتبط بهذه المبادرة حالياً.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">فريق المبادرة المرتبط:</h4>
                    {selectedLinkedTeam.length === 0 ? (
                      <p className="text-sm text-gray-500">لا يوجد فريق مرتبط حالياً.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedLinkedTeam.map((member) => (
                          <div key={member.id} className="inline-flex items-center gap-1 border rounded-full px-2 py-1 text-xs bg-white">
                            <span>{member.full_name} {member.role ? `(${member.role})` : ''}</span>
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRemoveTeamMember(member.id)}
                              title="حذف من الفريق"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <Select value={teamMemberToAddId} onValueChange={setTeamMemberToAddId}>
                        <SelectTrigger className="sm:w-[320px]">
                          <SelectValue placeholder="اختر عضوًا لإضافته لفريق المبادرة" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeamMembersForAdd.map((member) => (
                            <SelectItem key={member.id} value={String(member.id)}>
                              {member.full_name} {member.role ? `(${member.role})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTeamMember}
                        disabled={!teamMemberToAddId}
                      >
                        <Plus className="w-4 h-4 ml-1" />
                        إضافة عضو
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                    <h4 className="font-semibold text-blue-800 mb-2">فريق عمل مقترح للمبادرة</h4>
                    {selectedSuggestedTeam.length === 0 ? (
                      <p className="text-blue-700 text-xs">تم اعتماد الفريق المقترح الحالي أو لا توجد أسماء إضافية.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-1">
                        {selectedSuggestedTeam.map((member) => (
                          <Badge key={member.id} className="bg-white text-blue-700 border border-blue-200">
                            {member.full_name} {member.role ? `(${member.role})` : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-sm">
                    <h4 className="font-semibold text-indigo-800 mb-2">الأعمال المطلوبة من فريق المبادرة</h4>
                    <ul className="list-disc pr-5 space-y-1 text-indigo-700 text-xs">
                      {selectedSuggestedTasks.map((task, idx) => (
                        <li key={`task-${idx}`}>{task}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                    <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      المستندات المطلوبة (مرجع)
                    </h4>
                    <ul className="list-disc pr-5 space-y-1 text-amber-700 text-xs mb-2">
                      {selectedSuggestedDocs.map((doc, idx) => (
                        <li key={`doc-${idx}`}>{doc}</li>
                      ))}
                    </ul>
                    <p className="text-amber-600 text-xs">التسمية: <code className="bg-amber-100 px-1 rounded">A[محور]-M[معيار]-[نوع]-YYYY-MM-DD-v1.pdf</code></p>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={deletingInitiative}
                      onClick={() => handleDeleteInitiative(selectedInitiative)}
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      حذف المبادرة
                    </Button>
                    {selectedInitiativeStatus === 'planning' && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleStatusChange(selectedInitiative, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4 ml-1" />
                        اعتماد
                      </Button>
                    )}
                    {selectedInitiativeStatus === 'approved' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(selectedInitiative, 'planning')}
                        >
                          <Clock className="w-4 h-4 ml-1" />
                          إعادة للانتظار
                        </Button>
                        <Button
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700"
                          onClick={() => handleStatusChange(selectedInitiative, 'in_progress')}
                        >
                          <Play className="w-4 h-4 ml-1" />
                          بدء
                        </Button>
                      </>
                    )}
                    {selectedInitiativeStatus === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(selectedInitiative, 'planning')}
                      >
                        <Clock className="w-4 h-4 ml-1" />
                        إعادة للانتظار
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <KPIManager initiativeId={selectedInitiative.id} initiativeTitle={selectedInitiative.title} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}