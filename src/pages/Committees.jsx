import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Users, UserCog, Eye, HandHelping, Edit, Trash2, Building, Loader2, Search, ChevronLeft, Shield, MoreVertical, Target, Power, UserPlus, Filter, CheckCircle2, BookOpen, ClipboardList, UserCheck, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';

export default function Committees() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const [formOpen, setFormOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, committee: null });
  const [formData, setFormData] = useState({ name: '', description: '', axis_id: '', axis_name: '', related_standards: [], parent_committee_id: '', parent_committee_name: '', level: 'primary' });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  // Assign existing member dialog
  const [assignMemberOpen, setAssignMemberOpen] = useState(false);
  const [assignTargetCommittee, setAssignTargetCommittee] = useState(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSelected, setAssignSelected] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  // Filters
  const [filterAxis, setFilterAxis] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: committees = [], isLoading } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list('order')
  });

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Committee.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['committees'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Committee.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['committees'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Committee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['committees'] })
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.TeamMember.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
  });

  const { permissions, role, currentMember } = usePermissions();
  const canManage = permissions.canManageCommittees;

  const memberCommitteeId = String(currentMember?.committee_id || '');
  const isGlobalCommitteeScope = role === 'governor' || role === 'coordinator';

  const scopedCommittees = useMemo(() => {
    if (isGlobalCommitteeScope) return committees;
    if (!memberCommitteeId) return [];
    return committees.filter((c) => String(c.id || '') === memberCommitteeId);
  }, [isGlobalCommitteeScope, committees, memberCommitteeId]);

  const summaryStats = useMemo(() => {
    const committeeIds = new Set(scopedCommittees.map((c) => String(c.id || '')));
    const scopedMembers = members.filter((m) => committeeIds.has(String(m.committee_id || '')));
    return {
      committees: scopedCommittees.length,
      activeCommittees: scopedCommittees.filter((c) => c.status === 'active' || !c.status).length,
      totalMembers: scopedMembers.length,
      coordinators: scopedMembers.filter((m) => m.role === 'coordinator' || m.role === 'committee_coordinator' || m.role === 'committee_head').length,
      members: scopedMembers.filter((m) => m.role === 'committee_member' || m.role === 'member').length,
      supervisors: scopedMembers.filter((m) => m.role === 'committee_supervisor').length,
      volunteers: scopedMembers.filter((m) => m.role === 'volunteer').length,
    };
  }, [scopedCommittees, members]);

  const filteredCommittees = useMemo(() => {
    let list = scopedCommittees;
    // فلترة حسب المحور
    if (filterAxis === 'none') {
      list = list.filter((committee) => {
        const axis = resolveCommitteeAxis(committee);
        return !axis?.id;
      });
    } else if (filterAxis !== 'all') {
      list = list.filter((committee) => {
        const axis = resolveCommitteeAxis(committee);
        return axis?.id === filterAxis;
      });
    }
    // فلترة حسب الحالة
    if (filterStatus !== 'all') {
      list = list.filter((committee) => {
        const isActive = committee.status === 'active' || !committee.status;
        return filterStatus === 'active' ? isActive : !isActive;
      });
    }
    // بحث نصي
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((committee) => {
        const name = String(committee.name || '').toLowerCase();
        const description = String(committee.description || '').toLowerCase();
        const axisName = String(getCommitteeAxisName(committee) || '').toLowerCase();
        return name.includes(q) || description.includes(q) || axisName.includes(q);
      });
    }
    return list;
  }, [scopedCommittees, searchQuery, filterAxis, filterStatus, axes]);

  // الأعضاء المتاحين (غير مسجلين في هذه اللجنة)
  const availableMembers = useMemo(() => {
    if (!assignTargetCommittee) return [];
    return members.filter(m => m.committee_id !== assignTargetCommittee.id);
  }, [members, assignTargetCommittee]);

  const filteredAvailableMembers = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    if (!q) return availableMembers;
    return availableMembers.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      (m.department || '').toLowerCase().includes(q)
    );
  }, [availableMembers, assignSearch]);

  if (!permissions.canSeeCommittees) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold">غير مصرح لك بالوصول إلى صفحة اللجان. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getCommitteeStats = (committeeId) => {
    const committeeMembers = members.filter(m => m.committee_id === committeeId);
    return {
      coordinators: committeeMembers.filter(m => m.role === 'coordinator' || m.role === 'committee_coordinator' || m.role === 'committee_head').length,
      committee_members: committeeMembers.filter(m => m.role === 'committee_member' || m.role === 'member').length,
      supervisors: committeeMembers.filter(m => m.role === 'committee_supervisor').length,
      volunteers: committeeMembers.filter(m => m.role === 'volunteer').length,
      total: committeeMembers.length
    };
  };

  const handleOpenForm = (committee = null) => {
    if (!canManage) return;
    if (committee) {
      setEditingCommittee(committee);
      // حل تلقائي للمحور من اسم اللجنة
      const resolved = resolveCommitteeAxis(committee);
      setFormData({ 
        name: committee.name, 
        description: committee.description || '',
        axis_id: resolved?.id || committee.axis_id || '',
        axis_name: resolved?.name || committee.axis_name || '',
        related_standards: committee.related_standards ? (Array.isArray(committee.related_standards) ? committee.related_standards : JSON.parse(committee.related_standards || '[]')) : [],
        parent_committee_id: committee.parent_committee_id || '',
        parent_committee_name: committee.parent_committee_name || '',
        level: committee.level || 'primary'
      });
    } else {
      setEditingCommittee(null);
      setFormData({ name: '', description: '', axis_id: '', axis_name: '', related_standards: [], parent_committee_id: '', parent_committee_name: '', level: 'primary' });
    }
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    setLoading(true);
    if (editingCommittee) {
      await updateMutation.mutateAsync({ id: editingCommittee.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setLoading(false);
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!canManage) return;
    if (deleteDialog.committee) {
      const confirmed = await requireSecureDeleteConfirmation(`اللجنة "${deleteDialog.committee.name}"`);
      if (!confirmed) return;
      await deleteMutation.mutateAsync(deleteDialog.committee.id);
      setDeleteDialog({ open: false, committee: null });
    }
  };

  const handleToggleStatus = async (committee) => {
    if (!canManage) return;
    const currentActive = committee.status === 'active' || !committee.status;
    await updateMutation.mutateAsync({
      id: committee.id,
      data: { status: currentActive ? 'inactive' : 'active' }
    });
  };

  // ربط اسم المحور الصحيح من قائمة المحاور
  const resolveCommitteeAxis = (committee) => {
    // أولاً: من axis_id المربوط
    if (committee.axis_id) {
      const axis = axes.find(a => a.id === committee.axis_id);
      if (axis) return axis;
    }
    // ثانياً: مطابقة اسم اللجنة مع أسماء المحاور
    const committeeName = String(committee.name || '');
    const matched = axes.find(a => committeeName.includes(a.name));
    if (matched) return matched;
    // ثالثاً: اسم المحور المخزن
    if (committee.axis_name) {
      const byName = axes.find(a => a.name === committee.axis_name);
      if (byName) return byName;
      return { id: null, name: committee.axis_name };
    }
    return null;
  };

  const getCommitteeAxisName = (committee) => resolveCommitteeAxis(committee)?.name || null;

  // إضافة أعضاء حاليين للجنة
  const handleOpenAssignMember = (committee) => {
    setAssignTargetCommittee(committee);
    setAssignSearch('');
    setAssignSelected([]);
    setAssignMemberOpen(true);
  };

  const handleAssignMembers = async () => {
    if (!assignTargetCommittee || assignSelected.length === 0) return;
    setAssignLoading(true);
    try {
      for (const memberId of assignSelected) {
        await updateMemberMutation.mutateAsync({
          id: memberId,
          data: { committee_id: assignTargetCommittee.id, committee_name: assignTargetCommittee.name }
        });
      }
      setAssignMemberOpen(false);
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleSelectMember = (memberId) => {
    setAssignSelected(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  // عدد المعايير المرتبطة بكل لجنة
  const getCommitteeStandardsCount = (committee) => {
    const axis = resolveCommitteeAxis(committee);
    if (!axis?.id) return 0;
    return standards.filter(s => s.axis_id === axis.id).length;
  };

  // أعضاء اللجنة (يُستخدم لعرض صور مصغرة)
  const getCommitteeMembers = (committeeId) => {
    return members.filter(m => m.committee_id === committeeId);
  };

  return (
    <div className="min-h-screen bg-muted/50" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Building className="w-8 h-8" />
            إدارة اللجان
          </h1>
          <p className="text-white/70">لجان برنامج المدينة الصحية</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{summaryStats.committees}</p><p className="text-sm text-muted-foreground">إجمالي اللجان</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-secondary">{summaryStats.activeCommittees}</p><p className="text-sm text-muted-foreground">لجان نشطة</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{summaryStats.totalMembers}</p><p className="text-sm text-muted-foreground">إجمالي الأعضاء</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{summaryStats.coordinators}</p><p className="text-sm text-muted-foreground">المنسقون والرؤساء</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summaryStats.supervisors}</p><p className="text-sm text-muted-foreground">المشرفون</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-secondary">{summaryStats.volunteers}</p><p className="text-sm text-muted-foreground">المتطوعون</p></CardContent></Card>
        </div>

        {/* Search + Filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في اللجان (الاسم، الوصف، المحور)..."
              className="pr-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterAxis} onValueChange={setFilterAxis}>
              <SelectTrigger className="w-auto min-w-[140px] h-9 text-sm">
                <SelectValue placeholder="جميع المحاور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المحاور</SelectItem>
                {axes.map(axis => (
                  <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>
                ))}
                <SelectItem value="none">بدون محور</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-auto min-w-[120px] h-9 text-sm">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشطة فقط</SelectItem>
                <SelectItem value="inactive">غير نشطة</SelectItem>
              </SelectContent>
            </Select>
            {(filterAxis !== 'all' || filterStatus !== 'all') && (
              <Button variant="ghost" size="sm" className="h-9 text-sm text-muted-foreground" onClick={() => { setFilterAxis('all'); setFilterStatus('all'); }}>
                إزالة الفلاتر
              </Button>
            )}
            <div className="flex-1" />
            {canManage && (
              <Button onClick={() => handleOpenForm()} className="bg-primary hover:bg-primary/90 h-9">
                <Plus className="w-4 h-4 ml-1" />
                إضافة لجنة
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredCommittees.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">لا توجد نتائج مطابقة للبحث</p>
              {canManage && (
                <Button variant="outline" className="mt-4" onClick={() => handleOpenForm()}>
                  إضافة لجنة جديدة
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCommittees.map(committee => {
              const stats = getCommitteeStats(committee.id);
              const isActive = committee.status === 'active' || !committee.status;
              const resolvedAxisName = getCommitteeAxisName(committee);
              const standardsCount = getCommitteeStandardsCount(committee);
              const committeeMembers = getCommitteeMembers(committee.id);
              const axisColors = [
                'from-[#1e3a5f] to-[#2d5a8e]',
                'from-[#0f766e] to-[#14918a]',
                'from-[#92400e] to-[#b45309]',
                'from-[#991b1b] to-[#b91c1c]',
                'from-[#5b21b6] to-[#7c3aed]',
                'from-[#0e7490] to-[#0891b2]',
                'from-[#312e81] to-[#4338ca]',
                'from-[#3f6212] to-[#4d7c0f]',
                'from-[#9a3412] to-[#c2410c]',
              ];
              const axisIndex = resolvedAxisName ? axes.findIndex(a => a.name === resolvedAxisName) : -1;
              const gradientClass = axisIndex >= 0 ? axisColors[axisIndex % axisColors.length] : 'from-gray-400 to-gray-500';
              return (
                <Card key={committee.id} className={`group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md ${!isActive ? 'opacity-70' : ''}`}>
                  {/* Header gradient bar */}
                  <div className={`bg-gradient-to-l ${gradientClass} p-4 relative`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-lg leading-tight truncate">{committee.name}</h3>
                        {resolvedAxisName && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Target className="w-3.5 h-3.5 text-white/80 shrink-0" />
                            <span className="text-white/90 text-xs truncate">{resolvedAxisName}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-black/20 text-white/80'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-300' : 'bg-gray-300'}`}></span>
                          {isActive ? 'نشطة' : 'غير نشطة'}
                        </span>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" dir={rtl ? 'rtl' : 'ltr'}>
                              <DropdownMenuItem onClick={() => handleOpenForm(committee)} className="gap-2">
                                <Edit className="w-4 h-4 text-primary" />
                                <span>تعديل اللجنة</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAssignMember(committee)} className="gap-2">
                                <UserPlus className="w-4 h-4 text-secondary" />
                                <span>إضافة عضو</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingCommittee(null);
                                setFormData({ name: '', description: '', axis_id: '', axis_name: '', related_standards: [], parent_committee_id: committee.id, parent_committee_name: committee.name, level: committee.level === 'main' ? 'primary' : 'sub' });
                                setFormOpen(true);
                              }} className="gap-2">
                                <Building className="w-4 h-4 text-indigo-600" />
                                <span>إضافة لجنة فرعية</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleStatus(committee)} className="gap-2">
                                <Power className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-secondary'}`} />
                                <span>{isActive ? 'تعطيل اللجنة' : 'تفعيل اللجنة'}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, committee })} className="gap-2 text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4" />
                                <span>حذف اللجنة</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    {committee.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{committee.description}</p>
                    )}

                    {/* Parent committee & level badge */}
                    {committee.parent_committee_name && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
                        <Building className="w-3.5 h-3.5 text-primary/70" />
                        <span>تابعة لـ: <strong className="text-foreground">{committee.parent_committee_name}</strong></span>
                        <span className={`mr-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          committee.level === 'main' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          committee.level === 'primary' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        }`}>
                          {committee.level === 'main' ? '🏢 رئيسية' : committee.level === 'primary' ? '📋 رئيسية' : '📌 فرعية'}
                        </span>
                      </div>
                    )}

                    {/* Sub-committees count */}
                    {(() => {
                      const subCommittees = committees.filter(c => c.parent_committee_id === committee.id);
                      return subCommittees.length > 0 ? (
                        <div className="flex items-center gap-1.5 mb-2 text-xs">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-medium">
                            <Building className="w-3 h-3" />
                            {subCommittees.length} لجنة فرعية
                          </span>
                          <span className="text-muted-foreground truncate">
                            ({subCommittees.map(s => s.name).join('، ')})
                          </span>
                        </div>
                      ) : null;
                    })()}

                    {/* Badges: standards count + axis */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {standardsCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          <BookOpen className="w-3 h-3" />
                          {standardsCount} معيار
                        </span>
                      )}
                      {committee.related_standards && (() => {
                        const rs = Array.isArray(committee.related_standards) ? committee.related_standards : JSON.parse(committee.related_standards || '[]');
                        return rs.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            {rs.length} مرتبط
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      <div className="text-center p-2 rounded-lg bg-primary/5 dark:bg-primary/10">
                        <UserCog className="w-4 h-4 text-primary mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-primary">{stats.coordinators}</p>
                        <p className="text-[10px] text-primary/70">منسق</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-secondary/5 dark:bg-secondary/10">
                        <Users className="w-4 h-4 text-secondary mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-secondary">{stats.committee_members}</p>
                        <p className="text-[10px] text-secondary/70">أعضاء</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-amber-50/80 dark:bg-amber-900/10">
                        <Eye className="w-4 h-4 text-amber-700 dark:text-amber-400 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-amber-800 dark:text-amber-300">{stats.supervisors}</p>
                        <p className="text-[10px] text-amber-600/70">مشرفين</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/30">
                        <HandHelping className="w-4 h-4 text-slate-600 dark:text-slate-400 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{stats.volunteers}</p>
                        <p className="text-[10px] text-slate-500">متطوعين</p>
                      </div>
                    </div>

                    {/* Members preview */}
                    {committeeMembers.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex -space-x-2 rtl:space-x-reverse">
                          {committeeMembers.slice(0, 5).map((m, i) => (
                            <div key={m.id} className="w-7 h-7 rounded-full gradient-primary border-2 border-white dark:border-card flex items-center justify-center text-[10px] font-bold text-white" title={m.full_name}>
                              {(m.full_name || '').charAt(0)}
                            </div>
                          ))}
                          {committeeMembers.length > 5 && (
                            <div className="w-7 h-7 rounded-full bg-muted border-2 border-white flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                              +{committeeMembers.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{stats.total} عضو</span>
                      </div>
                    )}
                    {committeeMembers.length === 0 && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        لا يوجد أعضاء بعد
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Link to={`${createPageUrl('TeamManagement')}?committee=${committee.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full group-hover:bg-primary/5 group-hover:border-primary/30 group-hover:text-primary transition-colors">
                          <Users className="w-3.5 h-3.5 ml-1" />
                          الأعضاء
                          <ChevronLeft className="w-3.5 h-3.5 mr-auto" />
                        </Button>
                      </Link>
                      {canManage && (
                        <Button variant="outline" size="sm" className="group-hover:bg-secondary/5 group-hover:border-secondary/30 group-hover:text-secondary transition-colors" onClick={() => handleOpenAssignMember(committee)}>
                          <UserPlus className="w-3.5 h-3.5 ml-1" />
                          إضافة عضو
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

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{editingCommittee ? 'تعديل اللجنة' : 'إضافة لجنة جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            {/* حقل اللجنة الأم */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-primary" />
                تابعة لـ (اللجنة الأم)
              </Label>
              <Select
                value={formData.parent_committee_id || 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setFormData({ ...formData, parent_committee_id: '', parent_committee_name: '', level: 'primary' });
                  } else {
                    const parent = committees.find(c => c.id === v);
                    const parentLevel = parent?.level || parent?.type || '';
                    let childLevel = 'sub';
                    if (parentLevel === 'main') childLevel = 'primary';
                    else if (parentLevel === 'primary') childLevel = 'sub';
                    setFormData({
                      ...formData,
                      parent_committee_id: v,
                      parent_committee_name: parent?.name || '',
                      level: childLevel
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر اللجنة الأم (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون ربط (لجنة مستقلة)</SelectItem>
                  {committees
                    .filter(c => !editingCommittee || c.id !== editingCommittee.id)
                    .filter(c => c.level === 'main' || c.type === 'main' || !c.parent_committee_id)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.level === 'main' || c.type === 'main' ? '🏢' : '📋'} {c.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {formData.parent_committee_id && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-green-700 dark:text-green-300 font-semibold">
                    {formData.level === 'primary' ? '📋 ستُنشأ كـ: لجنة رئيسية' : '📌 ستُنشأ كـ: لجنة فرعية'}
                  </span>
                  <span className="text-green-600 dark:text-green-400">← تابعة لـ {formData.parent_committee_name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>اسم اللجنة *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: لجنة الصحة العامة"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف مختصر للجنة..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>المحور</Label>
              <Select 
                value={formData.axis_id || 'none'} 
                onValueChange={(v) => {
                  const axis = axes.find(a => a.id === v);
                  setFormData({ 
                    ...formData, 
                    axis_id: v === 'none' ? '' : v, 
                    axis_name: v === 'none' ? '' : axis?.name || '',
                    related_standards: []
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="اختر المحور (اختياري)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون ربط</SelectItem>
                  {axes.map(axis => (
                    <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المعايير المرتبطة</Label>
              {formData.axis_id && (() => {
                const axisStandards = sortAndDeduplicateStandardsByCode(standards.filter(s => s.axis_id === formData.axis_id));
                return axisStandards.length > 0 ? (
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {axisStandards.map(standard => (
                      <div key={standard.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.related_standards?.includes(standard.id)}
                          onChange={() => {
                            const current = formData.related_standards || [];
                            const next = current.includes(standard.id)
                              ? current.filter(id => id !== standard.id)
                              : [...current, standard.id];
                            setFormData({ ...formData, related_standards: next });
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{standard.code} - {standard.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border rounded-lg p-3 text-xs text-muted-foreground bg-muted/50">
                    لا توجد معايير متاحة لهذا المحور حالياً.
                  </div>
                );
              })()}
              {!formData.axis_id && (
                <div className="border rounded-lg p-3 text-xs text-muted-foreground bg-muted/50">
                  اختر محوراً أولاً لعرض المعايير المرتبطة.
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {editingCommittee ? 'حفظ' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف لجنة "{deleteDialog.committee?.name}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Existing Members Dialog */}
      <Dialog open={assignMemberOpen} onOpenChange={setAssignMemberOpen}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-secondary" />
              إضافة أعضاء إلى {assignTargetCommittee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="بحث بالاسم أو الجوال أو الجهة..."
                className="pr-9"
              />
            </div>

            {/* Selected count */}
            {assignSelected.length > 0 && (
              <div className="flex items-center justify-between bg-secondary/10 rounded-lg px-3 py-2">
                <span className="text-sm text-secondary font-medium">
                  <UserCheck className="w-4 h-4 inline ml-1" />
                  تم تحديد {assignSelected.length} عضو
                </span>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => setAssignSelected([])}>
                  إلغاء التحديد
                </Button>
              </div>
            )}

            {/* Members list */}
            <div className="border rounded-lg max-h-[320px] overflow-y-auto divide-y">
              {filteredAvailableMembers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {assignSearch ? 'لا توجد نتائج مطابقة' : 'جميع الأعضاء مسجلون في هذه اللجنة'}
                </div>
              ) : (
                filteredAvailableMembers.map(m => {
                  const isSelected = assignSelected.includes(m.id);
                  const currentCommittee = m.committee_id ? committees.find(c => c.id === m.committee_id) : null;
                  const roleLabels = {
                    governor: 'المشرف العام', coordinator: 'منسق', committee_head: 'رئيس لجنة',
                    committee_coordinator: 'منسق لجنة', committee_supervisor: 'مشرف', committee_member: 'عضو',
                    member: 'عضو', volunteer: 'متطوع', budget_manager: 'مدير ميزانية',
                    accountant: 'محاسب', financial_officer: 'موظف مالي'
                  };
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleSelectMember(m.id)}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                        isSelected ? 'bg-secondary/10' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${
                        isSelected
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {isSelected ? <UserCheck className="w-4 h-4" /> : (m.full_name || '').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{roleLabels[m.role] || m.role}</span>
                          {currentCommittee && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 dark:text-amber-400">{currentCommittee.name}</span>
                            </>
                          )}
                          {!currentCommittee && <span className="text-muted-foreground">بدون لجنة</span>}
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
              <Button type="button" variant="outline" onClick={() => setAssignMemberOpen(false)}>إلغاء</Button>
              <Button
                onClick={handleAssignMembers}
                disabled={assignSelected.length === 0 || assignLoading}
                className="bg-secondary hover:bg-secondary/90"
              >
                {assignLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                نقل {assignSelected.length > 0 ? `(${assignSelected.length})` : ''} للجنة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}