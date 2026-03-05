import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
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
  Target, TrendingUp, Clock, CheckCircle,
  Loader2, Eye, Play, Pause, X, Trash2,
  UserCog, HandHelping, UserCheck, UserPlus
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import KPIManager from "../components/initiatives/KPIManager";
import { sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';
import { usePermissions } from '@/hooks/usePermissions';
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';
import T from "@/components/T";

const statusConfig = {
  planning: { label: 'initiatives.planning', color: 'bg-slate-600', icon: Clock, gradient: 'from-slate-600 to-slate-700' },
  approved: { label: 'initiatives.approvedStatus', color: 'bg-primary', icon: CheckCircle, gradient: 'from-[#1e3a5f] to-[#2d5a8e]' },
  in_progress: { label: 'initiatives.inProgressStatus', color: 'bg-amber-700', icon: Play, gradient: 'from-amber-700 to-amber-800' },
  completed: { label: 'initiatives.completedStatus', color: 'bg-teal-700', icon: CheckCircle, gradient: 'from-[#0f766e] to-[#14918a]' },
  on_hold: { label: 'initiatives.paused', color: 'bg-orange-700', icon: Pause, gradient: 'from-orange-700 to-orange-800' },
  cancelled: { label: 'initiatives.cancelledStatus', color: 'bg-destructive', icon: X, gradient: 'from-red-800 to-red-900' }
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
  low: { label: 'priorities.low', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' },
  medium: { label: 'priorities.medium', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  high: { label: 'priorities.high', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  urgent: { label: 'priorities.urgent', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }
};

const impactConfig = {
  low: 'initiatives.impactLow',
  medium: 'initiatives.impactMedium',
  high: 'initiatives.impactHigh',
  very_high: 'initiatives.impactVeryHigh'
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

const ROLE_LABELS_AR = {
  governor: 'rolesShort.governor',
  coordinator: 'rolesShort.coordinator',
  committee_head: 'rolesShort.committee_head',
  committee_coordinator: 'rolesShort.committee_coordinator',
  committee_supervisor: 'rolesShort.committee_supervisor',
  committee_member: 'rolesShort.committee_member',
  member: 'rolesShort.member',
  volunteer: 'rolesShort.volunteer',
  budget_manager: 'rolesShort.budget_manager',
  accountant: 'rolesShort.accountant',
  financial_officer: 'rolesShort.financial_officer',
};

const getRoleLabel = (role) => ROLE_LABELS_AR[role] || role || '';

const getTeamRoleStats = (teamMembers) => {
  return {
    coordinators: teamMembers.filter(m => m.role === 'coordinator' || m.role === 'committee_coordinator' || m.role === 'committee_head').length,
    members: teamMembers.filter(m => m.role === 'committee_member' || m.role === 'member').length,
    supervisors: teamMembers.filter(m => m.role === 'committee_supervisor').length,
    volunteers: teamMembers.filter(m => m.role === 'volunteer').length,
    total: teamMembers.length
  };
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
  const _t = i18n.t.bind(i18n);
  const docs = [
    _t('initiatives.suggestedDocsList.implementationPlan'),
    _t('initiatives.suggestedDocsList.progressReport'),
    _t('initiatives.suggestedDocsList.meetingMinutes'),
    _t('initiatives.suggestedDocsList.qualityChecklist'),
    _t('initiatives.suggestedDocsList.riskRegister'),
    _t('initiatives.suggestedDocsList.achievementProof'),
  ];
  if ((initiative?.budget || 0) > 0) docs.push(_t('initiatives.suggestedDocsList.budgetReport'));
  if ((initiative?.expected_beneficiaries || 0) > 0) docs.push(_t('initiatives.suggestedDocsList.beneficiaryReport'));
  return docs;
};

const getInitiativeSuggestedTasks = (initiative) => {
  const _t = i18n.t.bind(i18n);
  const tasks = [
    _t('initiatives.suggestedTasksList.approvePlan'),
    _t('initiatives.suggestedTasksList.assignRoles'),
    _t('initiatives.suggestedTasksList.weeklyMeeting'),
    _t('initiatives.suggestedTasksList.monthlyReport'),
    _t('initiatives.suggestedTasksList.riskReview'),
  ];
  if ((initiative?.budget || 0) > 0) tasks.push(_t('initiatives.suggestedTasksList.budgetReview'));
  if ((initiative?.related_standards || []).length > 0) tasks.push(_t('initiatives.suggestedTasksList.standardsAlignment'));
  return tasks;
};

const getInitiativeSuggestedKpis = (initiative, docs, tasks) => {
  const expectedBeneficiaries = Number(initiative?.expected_beneficiaries) || 0;
  const budget = Number(initiative?.budget) || 0;
  const durationDays = initiative?.start_date && initiative?.end_date
    ? Math.max(1, Math.round((new Date(initiative.end_date) - new Date(initiative.start_date)) / (1000 * 60 * 60 * 24)))
    : 90;

  const _t = i18n.t.bind(i18n);
  return [
    {
      kpi_name: _t('initiatives.kpiNames.operationalCompletion'),
      description: _t('initiatives.kpiDescs.operationalCompletion'),
      target_value: tasks.length,
      current_value: 0,
      unit: _t('initiatives.kpiUnits.task'),
      measurement_frequency: 'weekly',
    },
    {
      kpi_name: _t('initiatives.kpiNames.documentCompletion'),
      description: _t('initiatives.kpiDescs.documentCompletion'),
      target_value: docs.length,
      current_value: 0,
      unit: _t('initiatives.kpiUnits.document'),
      measurement_frequency: 'monthly',
    },
    {
      kpi_name: _t('initiatives.kpiNames.timelineCompliance'),
      description: _t('initiatives.kpiDescs.timelineCompliance'),
      target_value: durationDays,
      current_value: 0,
      unit: _t('initiatives.kpiUnits.day'),
      measurement_frequency: 'monthly',
    },
    {
      kpi_name: _t('initiatives.kpiNames.beneficiaryTarget'),
      description: _t('initiatives.kpiDescs.beneficiaryTarget'),
      target_value: expectedBeneficiaries > 0 ? expectedBeneficiaries : 100,
      current_value: 0,
      unit: _t('initiatives.kpiUnits.beneficiary'),
      measurement_frequency: 'monthly',
    },
    {
      kpi_name: _t('initiatives.kpiNames.budgetCompliance'),
      description: _t('initiatives.kpiDescs.budgetCompliance'),
      target_value: budget > 0 ? budget : 100,
      current_value: 0,
      unit: budget > 0 ? _t('currency.riyal') : '%',
      measurement_frequency: 'monthly',
    },
  ];
};

export default function Initiatives() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const { permissions } = usePermissions();
  const canManageInitiatives = permissions.canManageInitiatives === true;
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
  const [teamMemberSearch, setTeamMemberSearch] = useState('');
  const [assignTeamOpen, setAssignTeamOpen] = useState(false);
  const [assignTeamSearch, setAssignTeamSearch] = useState('');
  const [assignTeamSelected, setAssignTeamSelected] = useState([]);
  const [assignTeamLoading, setAssignTeamLoading] = useState(false);

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

  const currentMember = members.find((m) => m.email === currentUser?.email);
  const accessibleInitiatives = useMemo(() => {
    if (canManageInitiatives) return initiatives;

    const memberId = String(currentMember?.id || '');
    const memberCommitteeId = String(currentMember?.committee_id || '');
    const memberName = String(currentUser?.full_name || currentMember?.full_name || '').trim();

    return initiatives.filter((initiative) => {
      const initiativeCommitteeId = String(initiative?.committee_id || '');
      const linkedTeamIds = parseTeamMemberIds(initiative?.team_members);
      const leaderId = String(initiative?.leader_id || '');
      const leaderName = String(initiative?.leader_name || '').trim();

      const matchesCommittee = memberCommitteeId && initiativeCommitteeId && initiativeCommitteeId === memberCommitteeId;
      const isInTeam = memberId && linkedTeamIds.some((id) => String(id) === memberId);
      const isLeader = memberId && leaderId && leaderId === memberId;
      const matchesLeaderName = memberName && leaderName && leaderName === memberName;

      return matchesCommittee || isInTeam || isLeader || matchesLeaderName;
    });
  }, [canManageInitiatives, initiatives, currentMember, currentUser]);

  const selectedLinkedTeam = useMemo(
    () => getInitiativeLinkedTeam(selectedInitiative, members),
    [selectedInitiative, members]
  );

  const availableTeamMembersForAdd = useMemo(() => {
    if (!selectedInitiative) return [];
    const linkedIds = new Set(selectedLinkedTeam.map((member) => String(member.id)));
    return members.filter((member) => !linkedIds.has(String(member.id)));
  }, [selectedInitiative, selectedLinkedTeam, members]);

  const filteredTeamMembersForQuickAdd = useMemo(() => {
    const q = teamMemberSearch.trim().toLowerCase();
    if (!q) return availableTeamMembersForAdd;

    return availableTeamMembersForAdd.filter((member) =>
      (member.full_name || '').toLowerCase().includes(q) ||
      (member.phone || '').includes(q) ||
      (member.department || '').toLowerCase().includes(q) ||
      (t(getRoleLabel(member.role)) || '').toLowerCase().includes(q)
    );
  }, [availableTeamMembersForAdd, teamMemberSearch]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(INITIATIVE_PREFILL_STORAGE_KEY);
      if (!raw) return;

      // لا نحذف البيانات حتى نتأكد من تحميل الصلاحيات
      if (!canManageInitiatives) return;

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
  }, [canManageInitiatives]);

  if (!permissions.canSeeInitiatives) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">{t('initiatives.noAccess')} {t('initiatives.noAccessNote')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: accessibleInitiatives.length,
    planning: accessibleInitiatives.filter(i => normalizeInitiativeStatus(i.status) === 'planning').length,
    approved: accessibleInitiatives.filter(i => normalizeInitiativeStatus(i.status) === 'approved').length,
    inProgress: accessibleInitiatives.filter(i => normalizeInitiativeStatus(i.status) === 'in_progress').length,
    completed: accessibleInitiatives.filter(i => normalizeInitiativeStatus(i.status) === 'completed').length,
    totalBudget: accessibleInitiatives.reduce((sum, i) => sum + (i.budget || 0), 0),
    totalBeneficiaries: accessibleInitiatives.reduce((sum, i) => sum + (i.expected_beneficiaries || 0), 0)
  };

  // فتح نافذة البحث والاختيار المتعدد
  const handleOpenAssignTeam = () => {
    setAssignTeamSearch('');
    setAssignTeamSelected([]);
    setAssignTeamOpen(true);
  };

  const toggleAssignTeamMember = (memberId) => {
    setAssignTeamSelected(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const filteredAssignTeamMembers = (() => {
    const q = assignTeamSearch.trim().toLowerCase();
    const list = availableTeamMembersForAdd;
    if (!q) return list;
    return list.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (t(getRoleLabel(m.role)) || '').includes(q)
    );
  })();

  const handleAssignTeamMembers = async () => {
    if (!selectedInitiative?.id || assignTeamSelected.length === 0) return;
    setAssignTeamLoading(true);
    try {
      const currentIds = parseTeamMemberIds(selectedInitiative.team_members);
      const mergedIds = [...new Set([...currentIds, ...assignTeamSelected.map(String)])];
      const updateData = { team_members: mergedIds };

      await api.entities.Initiative.update(selectedInitiative.id, updateData);
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setSelectedInitiative((prev) => (prev ? { ...prev, ...updateData } : prev));
      setAssignTeamOpen(false);
    } catch (err) {
      if (typeof window !== 'undefined') window.alert(`${t('initiatives.errorAddTeamMembers')}\n${err?.message || err}`);
    } finally {
      setAssignTeamLoading(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!canManageInitiatives) return;
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
      if (typeof window !== 'undefined') window.alert(`${t('initiatives.errorAddMember')}\n${err?.message || err}`);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    if (!canManageInitiatives) return;
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
      if (typeof window !== 'undefined') window.alert(`${t('initiatives.errorRemoveMember')}\n${err?.message || err}`);
    }
  };

  const handleDeleteInitiative = async (initiative) => {
    if (!canManageInitiatives) return;
    if (!initiative?.id) return;
    const confirmed = await requireSecureDeleteConfirmation(`${t('initiatives.confirmDeleteMsg')} "${initiative.title}"`);
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
        window.alert(`${t('initiatives.errorDeleteInitiative')}\n${err?.message || err}`);
      }
    } finally {
      setDeletingInitiative(false);
    }
  };

  const handleApplySuggestedKpis = async ({ silent = false } = {}) => {
    if (!canManageInitiatives) return;
    if (!selectedInitiative?.id) return;
    setApplyingSuggestedKpis(true);
    try {
      const existing = new Set((selectedInitiativeKpis || []).map((k) => String(k.kpi_name || '').trim()));
      const toCreate = selectedSuggestedKpis.filter((k) => !existing.has(String(k.kpi_name || '').trim()));

      if (toCreate.length === 0) {
        if (!silent && typeof window !== 'undefined') window.alert(t('initiatives.kpisAlreadyAdded'));
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
      if (!silent && typeof window !== 'undefined') window.alert(t('initiatives.kpisAddedSuccess'));
    } catch (err) {
      if (!silent && typeof window !== 'undefined') window.alert(`${t('initiatives.errorAddKpis')}\n${err?.message || err}`);
    } finally {
      setApplyingSuggestedKpis(false);
    }
  };

  const handleLinkSuggestedTeam = async ({ silent = false } = {}) => {
    if (!canManageInitiatives) return;
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
      if (!silent && typeof window !== 'undefined') window.alert(t('initiatives.teamLinkedSuccess'));
    } catch (err) {
      if (!silent && typeof window !== 'undefined') window.alert(`${t('initiatives.errorLinkTeam')}\n${err?.message || err}`);
    } finally {
      setApplyingSuggestedTeam(false);
    }
  };

  const filteredInitiatives = accessibleInitiatives.filter(i => {
    const matchesSearch = !searchQuery ||
      i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code?.includes(searchQuery) ||
      i.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeStatus === 'all' || normalizeInitiativeStatus(i.status) === activeStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedInitiativeStatus = normalizeInitiativeStatus(selectedInitiative?.status);

  const resetForm = () => {
    setFormData(getDefaultInitiativeFormData());
    setKpisList([]);
    setOpenedFromStandardLabel('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canManageInitiatives) return;
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
    if (!canManageInitiatives) return;
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
    <div className="min-h-screen bg-muted/50" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="gradient-primary text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Lightbulb className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t('initiatives.title')}</h1>
              <p className="text-white/70 text-sm mt-1">{t('initiatives.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">{t('initiatives.totalInitiatives')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.planning}</p>
              <p className="text-sm text-muted-foreground">{t('initiatives.underPlanning')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="w-8 h-8 mx-auto mb-2 text-amber-700 dark:text-amber-400" />
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">{t('initiatives.inProgress')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">{t('initiatives.completed')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
              <p className="text-2xl font-bold">{stats.totalBeneficiaries}</p>
              <p className="text-sm text-muted-foreground">{t('initiatives.beneficiaries')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{(stats.totalBudget / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">{t('initiatives.totalBudget')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('initiatives.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          {canManageInitiatives && (
            <Button onClick={() => { resetForm(); setFormOpen(true); }}>
              <Plus className="w-5 h-5 ml-2" />
              {t('initiatives.addNewInitiative')}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus} className="mb-6">
          <TabsList className="bg-card">
            <TabsTrigger value="all">{t('common.all')} ({stats.total})</TabsTrigger>
            <TabsTrigger value="planning">{t('initiatives.planning')} ({stats.planning})</TabsTrigger>
            <TabsTrigger value="approved">{t('initiatives.approvedStatus')} ({stats.approved})</TabsTrigger>
            <TabsTrigger value="in_progress">{t('initiatives.inProgressStatus')} ({stats.inProgress})</TabsTrigger>
            <TabsTrigger value="completed">{t('initiatives.completedStatus')} ({stats.completed})</TabsTrigger>
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
              <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('initiatives.noInitiatives')}</p>
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
                : t('initiatives.noTeamLinked');
              return (
                <Card key={initiative.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md">
                  {/* Header gradient bar */}
                  <div className={`bg-gradient-to-l ${statusConfig[initiativeStatus]?.gradient || 'from-gray-400 to-gray-500'} p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center font-mono text-xs font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">{initiative.code}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/25 text-white px-2 py-0.5 rounded-full">
                            <StatusIcon className="w-3 h-3" />
                            {t(statusConfig[initiativeStatus]?.label)}
                          </span>
                          {initiative.priority && (
                            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white`}>
                              {t(priorityConfig[initiative.priority]?.label)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-white font-bold text-base leading-tight truncate"><T>{initiative.title}</T></h3>
                        {initiative.axis_name && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Target className="w-3.5 h-3.5 text-white/80 shrink-0" />
                            <span className="text-white/90 text-xs truncate"><T>{initiative.axis_name}</T></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {initiative.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2"><T>{initiative.description}</T></p>
                    )}

                    {initiative.progress_percentage !== undefined && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{t('common.progress')}</span>
                          <span className="font-semibold">{initiative.progress_percentage}%</span>
                        </div>
                        <Progress value={initiative.progress_percentage} className="h-2" />
                      </div>
                    )}

                    {/* Info badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {initiative.committee_name && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3" />
                          <T>{initiative.committee_name}</T>
                        </span>
                      )}
                      {initiative.budget > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                          <DollarSign className="w-3 h-3" />
                          {initiative.budget.toLocaleString()} {t('common.sar')}
                        </span>
                      )}
                      {initiative.expected_beneficiaries > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          <TrendingUp className="w-3 h-3" />
                          {initiative.expected_beneficiaries} {t('initiatives.beneficiary')}
                        </span>
                      )}
                    </div>

                    {/* Team role stats grid */}
                    {(() => {
                      const teamStats = getTeamRoleStats(linkedTeam);
                      return (
                        <>
                          <div className="grid grid-cols-4 gap-1.5 mb-3">
                            <div className="text-center p-2 rounded-lg bg-primary/5 dark:bg-primary/10">
                              <UserCog className="w-4 h-4 text-primary mx-auto mb-0.5" />
                              <p className="text-lg font-bold text-primary">{teamStats.coordinators}</p>
                              <p className="text-[10px] text-primary/70">{t('initiatives.coordinator')}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-secondary/5 dark:bg-secondary/10">
                              <Users className="w-4 h-4 text-secondary mx-auto mb-0.5" />
                              <p className="text-lg font-bold text-secondary">{teamStats.members}</p>
                              <p className="text-[10px] text-secondary/70">{t('initiatives.members')}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-amber-50/80 dark:bg-amber-900/10">
                              <Eye className="w-4 h-4 text-amber-700 dark:text-amber-400 mx-auto mb-0.5" />
                              <p className="text-lg font-bold text-amber-800 dark:text-amber-300">{teamStats.supervisors}</p>
                              <p className="text-[10px] text-amber-600/70">{t('initiatives.supervisors')}</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/30">
                              <HandHelping className="w-4 h-4 text-slate-600 dark:text-slate-400 mx-auto mb-0.5" />
                              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{teamStats.volunteers}</p>
                              <p className="text-[10px] text-slate-500">{t('initiatives.volunteers')}</p>
                            </div>
                          </div>
                          {linkedTeam.length > 0 && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex -space-x-2 rtl:space-x-reverse">
                              {linkedTeam.slice(0, 5).map((m) => (
                                <div key={m.id} className="w-7 h-7 rounded-full gradient-primary border-2 border-white dark:border-card flex items-center justify-center text-[10px] font-bold text-white" title={m.full_name}>
                                  {(m.full_name || '').charAt(0)}
                                </div>
                              ))}
                              {linkedTeam.length > 5 && (
                                <div className="w-7 h-7 rounded-full bg-muted border-2 border-white flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                                  +{linkedTeam.length - 5}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{teamStats.total} {t('initiatives.member')}</span>
                          </div>
                          )}
                          {linkedTeam.length === 0 && (
                            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              {t('initiatives.noTeamLinked')}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <div className="flex gap-2 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { setSelectedInitiative(initiative); setViewOpen(true); }}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        {t('initiatives.view')}
                      </Button>
                      {canManageInitiatives && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/5"
                        disabled={deletingInitiative}
                        onClick={() => handleDeleteInitiative(initiative)}
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        {t('common.delete')}
                      </Button>
                      )}
                      {canManageInitiatives && initiativeStatus === 'planning' && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-primary hover:bg-primary/90"
                          onClick={() => handleStatusChange(initiative, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          {t('initiatives.approveBtn')}
                        </Button>
                      )}
                      {canManageInitiatives && initiativeStatus === 'approved' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleStatusChange(initiative, 'planning')}
                          >
                            <Clock className="w-4 h-4 ml-1" />
                            {t('initiatives.returnToPending')}
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-amber-700 hover:bg-amber-800 text-white"
                            onClick={() => handleStatusChange(initiative, 'in_progress')}
                          >
                            <Play className="w-4 h-4 ml-1" />
                            {t('initiatives.start')}
                          </Button>
                        </>
                      )}
                      {canManageInitiatives && initiativeStatus === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleStatusChange(initiative, 'planning')}
                        >
                          <Clock className="w-4 h-4 ml-1" />
                          {t('initiatives.returnToPending')}
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
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{t('initiatives.formTitle')}</DialogTitle>
          </DialogHeader>
          {openedFromStandardLabel && (
            <div className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-800">
              {t('initiatives.openedFromStandard')} <span className="font-semibold">{openedFromStandardLabel}</span>
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-purple-600">
                <Lightbulb className="w-5 h-5" />
                {t('initiatives.basicInfo')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>{t('initiatives.initiativeCode')}</Label>
                  <Input value={formData.code} readOnly disabled placeholder={t('initiatives.autoGenerated')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.priorityLabel')} *</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{t(val.label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t('initiatives.titleLabel')} *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t('initiatives.descriptionLabel')} *</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t('initiatives.objectives')}</Label>
                  <Textarea value={formData.objectives} onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} rows={2} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
                <Target className="w-5 h-5" />
                {t('initiatives.organizationalLink')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('initiatives.committeeLabel')} *</Label>
                  <Select value={formData.committee_id} onValueChange={(v) => {
                    const committee = committees.find(c => c.id === v);
                    setFormData({ ...formData, committee_id: v, committee_name: committee?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder={t('initiatives.selectCommittee')} /></SelectTrigger>
                    <SelectContent>
                      {committees.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.axisLabel')}</Label>
                  <Select value={formData.axis_id} onValueChange={(v) => {
                    const axis = axes.find(a => a.id === v);
                    setFormData({ ...formData, axis_id: v, axis_name: axis?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder={t('initiatives.selectAxisOptional')} /></SelectTrigger>
                    <SelectContent>
                      {axes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t('initiatives.relatedStandards')}</Label>
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
                    <div className="border rounded-lg p-3 text-xs text-muted-foreground bg-muted/50">
                      {!formData.axis_id
                        ? t('initiatives.selectAxisFirst')
                        : t('initiatives.noStandardsForAxis')}
                    </div>
                  )}

                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.leaderLabel')}</Label>
                  <Select value={formData.leader_id} onValueChange={(v) => {
                    const member = members.find(m => m.id === v);
                    setFormData({ ...formData, leader_id: v, leader_name: member?.full_name });
                  }}>
                    <SelectTrigger><SelectValue placeholder={t('initiatives.selectLeader')} /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.impactLevel')}</Label>
                  <Select value={formData.impact_level} onValueChange={(v) => setFormData({ ...formData, impact_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(impactConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{t(val)}</SelectItem>
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
                {t('initiatives.timeline')}
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>💡 {t('initiatives.budgetNoteTitle')}:</strong> {t('initiatives.budgetNoteText')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('initiatives.startDateLabel')} *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.endDateLabel')} *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.budgetLabel')}</Label>
                  <Input type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.linkBudget')}</Label>
                  <Select value={formData.budget_id || 'none'} onValueChange={(v) => {
                    const budget = budgets.find(b => b.id === v);
                    setFormData({ ...formData, budget_id: v === 'none' ? '' : v, budget_name: v === 'none' ? '' : budget?.name || '' });
                  }}>
                    <SelectTrigger><SelectValue placeholder={t('initiatives.selectBudgetOptional')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('initiatives.withoutLink')}</SelectItem>
                      {budgets.filter(b => b.status === 'active' || b.status === 'draft').map(budget => (
                        <SelectItem key={budget.id} value={budget.id}>
                          {budget.name} ({budget.fiscal_year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.linkAllocation')}</Label>
                  <Select 
                    value={formData.budget_allocation_id || 'none'} 
                    onValueChange={(v) => {
                      const allocation = allocations.find(a => a.id === v);
                      setFormData({ 
                        ...formData, 
                        budget_allocation_id: v === 'none' ? '' : v,
                        budget_allocation_category: v === 'none' ? '' : allocation?.category || '',
                        budget_id: v === 'none' ? formData.budget_id : allocation?.budget_id || formData.budget_id,
                        budget_name: v === 'none' ? formData.budget_name : allocation?.budget_name || formData.budget_name
                      });
                    }}
                    disabled={!formData.budget_id && allocations.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder={t('initiatives.selectAllocationOptional')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('initiatives.withoutLink')}</SelectItem>
                      {allocations
                        .filter(a => !formData.budget_id || a.budget_id === formData.budget_id)
                        .map(allocation => (
                          <SelectItem key={allocation.id} value={allocation.id}>
                            {allocation.committee_name || allocation.axis_name} - {allocation.category || t('initiatives.generalAllocation')} ({allocation.allocated_amount?.toLocaleString()} {t('common.sar')})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.expectedBeneficiaries')}</Label>
                  <Input type="number" value={formData.expected_beneficiaries} onChange={(e) => setFormData({ ...formData, expected_beneficiaries: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t('initiatives.targetAudience')}</Label>
                  <Input value={formData.target_audience} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} placeholder={t('initiatives.targetAudiencePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.locationScope')}</Label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('initiatives.partners')}</Label>
                  <Input value={formData.partners} onChange={(e) => setFormData({ ...formData, partners: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('initiatives.kpis')}</Label>
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
                          measurement_frequency: 'monthly'
                        }]);
                      }}
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      {t('initiatives.addKPI')}
                    </Button>
                  </div>
                  
                  {kpisList.length === 0 ? (
                    <div className="text-center py-4 border rounded-lg bg-muted/50">
                      <Target className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">{t('initiatives.noKPIsAdded')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-3 max-h-64 overflow-y-auto">
                      {kpisList.map((kpi, index) => (
                        <Card key={index} className="bg-muted/50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-sm">{t('initiatives.kpiNumber', { number: index + 1 })}</h4>
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
                                  placeholder={t('initiatives.kpiName')}
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
                                placeholder={t('initiatives.kpiTarget')}
                                value={kpi.target_value}
                                onChange={(e) => {
                                  const newList = [...kpisList];
                                  newList[index].target_value = parseFloat(e.target.value) || 0;
                                  setKpisList(newList);
                                }}
                              />
                              <Input
                                placeholder={t('initiatives.kpiUnit')}
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
                                  <SelectItem value="daily">{t('initiatives.daily')}</SelectItem>
                                  <SelectItem value="weekly">{t('initiatives.weekly')}</SelectItem>
                                  <SelectItem value="monthly">{t('initiatives.monthly')}</SelectItem>
                                  <SelectItem value="quarterly">{t('initiatives.quarterly')}</SelectItem>
                                  <SelectItem value="annual">{t('initiatives.annual')}</SelectItem>
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
                  <Label>{t('initiatives.notes')}</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {t('initiatives.saveInitiative')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Initiative Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('initiatives.viewTitle')} - {selectedInitiative?.code}</DialogTitle>
          </DialogHeader>
          {selectedInitiative && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{selectedInitiative.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{selectedInitiative.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusConfig[selectedInitiativeStatus]?.color}>
                        {t(statusConfig[selectedInitiativeStatus]?.label)}
                      </Badge>
                      <Badge className={priorityConfig[selectedInitiative.priority]?.color}>
                        {t(priorityConfig[selectedInitiative.priority]?.label)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedInitiative.objectives && (
                    <div>
                      <h4 className="font-semibold mb-1">{t('initiatives.objectivesView')}:</h4>
                      <p className="text-sm text-muted-foreground">{selectedInitiative.objectives}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('initiatives.committeeView')}:</span>
                      <p className="font-semibold">{selectedInitiative.committee_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('initiatives.axis')}:</span>
                      <p className="font-semibold">{selectedInitiative.axis_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('initiatives.period')}:</span>
                      <p className="font-semibold">{selectedInitiative.start_date} - {selectedInitiative.end_date}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('initiatives.leader')}:</span>
                      <p className="font-semibold">{selectedInitiative.leader_name || t('initiatives.unassigned')}</p>
                    </div>
                    {selectedInitiative.budget > 0 && (
                      <div>
                        <span className="text-muted-foreground">{t('initiatives.budgetView')}:</span>
                        <p className="font-semibold">{selectedInitiative.budget.toLocaleString()} {t('common.sar')}</p>
                      </div>
                    )}
                    {selectedInitiative.budget_allocation_id && (
                      <div>
                        <span className="text-muted-foreground">{t('initiatives.allocationLink')}:</span>
                        <p className="font-semibold">{selectedInitiative.budget_name || t('initiatives.linkedBudget')} — {selectedInitiative.budget_allocation_category || t('initiatives.allocationItem')}</p>
                      </div>
                    )}
                    {selectedInitiative.expected_beneficiaries > 0 && (
                      <div>
                        <span className="text-muted-foreground">{t('initiatives.beneficiariesView')}:</span>
                        <p className="font-semibold">{selectedInitiative.expected_beneficiaries}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">{t('initiatives.relatedStandards')}:</h4>
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
                      <p className="text-sm text-muted-foreground">{t('initiatives.noLinkedStandard')}</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">{t('initiatives.linkedTeam')}:</h4>
                    {selectedLinkedTeam.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('initiatives.noLinkedTeam')}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedLinkedTeam.map((member) => (
                          <div key={member.id} className="inline-flex items-center gap-1 border rounded-full px-2 py-1 text-xs bg-card">
                            <span>{member.full_name} {member.role ? `(${t(getRoleLabel(member.role))})` : ''}</span>
                            {canManageInitiatives && (
                              <button
                                type="button"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleRemoveTeamMember(member.id)}
                                title={t('initiatives.removeFromTeam')}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {canManageInitiatives && (
                    <div className="mt-3 space-y-2">
                      <Button
                        type="button"
                        onClick={handleOpenAssignTeam}
                        className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      >
                        <UserPlus className="w-4 h-4 ml-2" />
                        {t('initiatives.addTeamMembers')}
                      </Button>
                          <div className="relative">
                            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                            <Input
                              value={teamMemberSearch}
                              onChange={(e) => setTeamMemberSearch(e.target.value)}
                              placeholder={t('initiatives.quickSearchPlaceholder')}
                              className="pr-9 sm:w-[320px]"
                            />
                          </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={teamMemberToAddId} onValueChange={setTeamMemberToAddId}>
                          <SelectTrigger className="sm:w-[320px]">
                            <SelectValue placeholder={t('initiatives.quickSelectMember')} />
                          </SelectTrigger>
                          <SelectContent>
                                {filteredTeamMembersForQuickAdd.map((member) => (
                              <SelectItem key={member.id} value={String(member.id)}>
                                {member.full_name} {member.role ? `(${t(getRoleLabel(member.role))})` : ''}
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
                          {t('common.add')}
                        </Button>
                      </div>
                    </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                    <h4 className="font-semibold text-blue-800 mb-2">{t('initiatives.suggestedTeam')}</h4>
                    {selectedSuggestedTeam.length === 0 ? (
                      <p className="text-blue-700 text-xs">{t('initiatives.suggestedTeamEmpty')}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-1">
                        {selectedSuggestedTeam.map((member) => (
                          <Badge key={member.id} className="bg-card text-blue-700 border border-blue-200">
                            {member.full_name} {member.role ? `(${t(getRoleLabel(member.role))})` : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-sm">
                    <h4 className="font-semibold text-indigo-800 mb-2">{t('initiatives.suggestedTasks')}</h4>
                    <ul className="list-disc pr-5 space-y-1 text-indigo-700 text-xs">
                      {selectedSuggestedTasks.map((task, idx) => (
                        <li key={`task-${idx}`}>{task}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                    <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {t('initiatives.suggestedDocs')}
                    </h4>
                    <ul className="list-disc pr-5 space-y-1 text-amber-700 text-xs mb-2">
                      {selectedSuggestedDocs.map((doc, idx) => (
                        <li key={`doc-${idx}`}>{doc}</li>
                      ))}
                    </ul>
                    <p className="text-amber-600 text-xs">{t('initiatives.namingConvention')}: <code className="bg-amber-100 px-1 rounded">A[axis]-M[standard]-[type]-YYYY-MM-DD-v1.pdf</code></p>
                  </div>

                  {canManageInitiatives && (
                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={deletingInitiative}
                      onClick={() => handleDeleteInitiative(selectedInitiative)}
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      {t('initiatives.confirmDeleteInitiative')}
                    </Button>
                    {selectedInitiativeStatus === 'planning' && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => handleStatusChange(selectedInitiative, 'approved')}
                      >
                        <CheckCircle className="w-4 h-4 ml-1" />
                        {t('initiatives.approveBtn')}
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
                          {t('initiatives.returnToPending')}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700"
                          onClick={() => handleStatusChange(selectedInitiative, 'in_progress')}
                        >
                          <Play className="w-4 h-4 ml-1" />
                          {t('initiatives.start')}
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
                        {t('initiatives.returnToPending')}
                      </Button>
                    )}
                  </div>
                  )}
                </CardContent>
              </Card>

              <KPIManager initiativeId={selectedInitiative.id} initiativeTitle={selectedInitiative.title} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Team Members Dialog */}
      <Dialog open={assignTeamOpen} onOpenChange={setAssignTeamOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              {t('initiatives.assignTeamTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                value={assignTeamSearch}
                onChange={(e) => setAssignTeamSearch(e.target.value)}
                placeholder={t('initiatives.searchMembers')}
                className="pr-9"
              />
            </div>

            {/* Selected count */}
            {assignTeamSelected.length > 0 && (
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                <span className="text-sm text-green-700 font-medium">
                  <UserCheck className="w-4 h-4 inline ml-1" />
                  {t('initiatives.selectedCount', { count: assignTeamSelected.length })}
                </span>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => setAssignTeamSelected([])}>
                  {t('initiatives.deselectAll')}
                </Button>
              </div>
            )}

            {/* Members list */}
            <div className="border rounded-lg max-h-[320px] overflow-y-auto divide-y">
              {filteredAssignTeamMembers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {assignTeamSearch ? t('initiatives.noMatchingResults') : t('initiatives.allMembersAssigned')}
                </div>
              ) : (
                filteredAssignTeamMembers.map(m => {
                  const isSelected = assignTeamSelected.includes(m.id);
                  const memberCommittee = m.committee_id ? committees.find(c => c.id === m.committee_id) : null;
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleAssignTeamMember(m.id)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        isSelected ? 'bg-green-50/70' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${
                        isSelected
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {isSelected ? <UserCheck className="w-4 h-4" /> : (m.full_name || '').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{t(getRoleLabel(m.role))}</span>
                          {memberCommittee && (
                            <>
                              <span>•</span>
                              <span className="text-purple-600">{memberCommittee.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {m.phone && <span className="text-[11px] text-muted-foreground shrink-0 dir-ltr">{m.phone}</span>}
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setAssignTeamOpen(false)}>{t('common.cancel')}</Button>
              <Button
                onClick={handleAssignTeamMembers}
                disabled={assignTeamSelected.length === 0 || assignTeamLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {assignTeamLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {t('initiatives.addToTeam')} {assignTeamSelected.length > 0 ? `(${assignTeamSelected.length})` : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}