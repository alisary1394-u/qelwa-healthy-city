import React, { useMemo, useState } from 'react';
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, committee: null });
  const [formData, setFormData] = useState({ name: '', description: '', axis_id: '', axis_name: '', related_standards: [] });
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
      coordinators: scopedMembers.filter((m) => m.role === 'coordinator' || m.role === 'committee_coordinator').length,
      heads: scopedMembers.filter((m) => m.role === 'committee_head').length,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة اللجان. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getCommitteeStats = (committeeId) => {
    const committeeMembers = members.filter(m => m.committee_id === committeeId);
    return {
      coordinators: committeeMembers.filter(m => m.role === 'coordinator' || m.role === 'committee_coordinator').length,
      committee_members: committeeMembers.filter(m => m.role === 'committee_member').length,
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
        related_standards: committee.related_standards ? (Array.isArray(committee.related_standards) ? committee.related_standards : JSON.parse(committee.related_standards || '[]')) : []
      });
    } else {
      setEditingCommittee(null);
      setFormData({ name: '', description: '', axis_id: '', axis_name: '', related_standards: [] });
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
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إدارة اللجان</h1>
          <p className="text-blue-100">لجان برنامج المدينة الصحية</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{summaryStats.committees}</p><p className="text-sm text-gray-600">إجمالي اللجان</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{summaryStats.activeCommittees}</p><p className="text-sm text-gray-600">لجان نشطة</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{summaryStats.totalMembers}</p><p className="text-sm text-gray-600">إجمالي الأعضاء</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-sky-600">{summaryStats.coordinators}</p><p className="text-sm text-gray-600">المنسقون</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{summaryStats.heads}</p><p className="text-sm text-gray-600">رؤساء اللجان</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-teal-600">{summaryStats.volunteers}</p><p className="text-sm text-gray-600">المتطوعون</p></CardContent></Card>
        </div>

        {/* Search + Filters */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في اللجان (الاسم، الوصف، المحور)..."
              className="pr-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
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
              <Button variant="ghost" size="sm" className="h-9 text-sm text-gray-500" onClick={() => { setFilterAxis('all'); setFilterStatus('all'); }}>
                إزالة الفلاتر
              </Button>
            )}
            <div className="flex-1" />
            {canManage && (
              <Button onClick={() => handleOpenForm()} className="bg-blue-600 hover:bg-blue-700 h-9">
                <Plus className="w-4 h-4 ml-1" />
                إضافة لجنة
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredCommittees.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد نتائج مطابقة للبحث</p>
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
                'from-blue-500 to-blue-600',
                'from-emerald-500 to-emerald-600',
                'from-violet-500 to-violet-600',
                'from-amber-500 to-amber-600',
                'from-rose-500 to-rose-600',
                'from-cyan-500 to-cyan-600',
                'from-indigo-500 to-indigo-600',
                'from-lime-600 to-lime-700',
                'from-pink-500 to-pink-600',
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
                            <DropdownMenuContent align="start" dir="rtl">
                              <DropdownMenuItem onClick={() => handleOpenForm(committee)} className="gap-2">
                                <Edit className="w-4 h-4 text-blue-600" />
                                <span>تعديل اللجنة</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAssignMember(committee)} className="gap-2">
                                <UserPlus className="w-4 h-4 text-green-600" />
                                <span>إضافة عضو</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleStatus(committee)} className="gap-2">
                                <Power className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-green-600'}`} />
                                <span>{isActive ? 'تعطيل اللجنة' : 'تفعيل اللجنة'}</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteDialog({ open: true, committee })} className="gap-2 text-red-600 focus:text-red-600">
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
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{committee.description}</p>
                    )}

                    {/* Badges: standards count + axis */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {standardsCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                          <BookOpen className="w-3 h-3" />
                          {standardsCount} معيار
                        </span>
                      )}
                      {committee.related_standards && (() => {
                        const rs = Array.isArray(committee.related_standards) ? committee.related_standards : JSON.parse(committee.related_standards || '[]');
                        return rs.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            {rs.length} مرتبط
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      <div className="text-center p-2 rounded-lg bg-blue-50/80">
                        <UserCog className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-blue-700">{stats.coordinators}</p>
                        <p className="text-[10px] text-blue-600/70">منسق</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-green-50/80">
                        <Users className="w-4 h-4 text-green-600 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-green-700">{stats.committee_members}</p>
                        <p className="text-[10px] text-green-600/70">أعضاء</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-orange-50/80">
                        <Eye className="w-4 h-4 text-orange-600 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-orange-700">{stats.supervisors}</p>
                        <p className="text-[10px] text-orange-600/70">مشرفين</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-teal-50/80">
                        <HandHelping className="w-4 h-4 text-teal-600 mx-auto mb-0.5" />
                        <p className="text-lg font-bold text-teal-700">{stats.volunteers}</p>
                        <p className="text-[10px] text-teal-600/70">متطوعين</p>
                      </div>
                    </div>

                    {/* Members preview */}
                    {committeeMembers.length > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex -space-x-2 rtl:space-x-reverse">
                          {committeeMembers.slice(0, 5).map((m, i) => (
                            <div key={m.id} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white" title={m.full_name}>
                              {(m.full_name || '').charAt(0)}
                            </div>
                          ))}
                          {committeeMembers.length > 5 && (
                            <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-gray-600">
                              +{committeeMembers.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{stats.total} عضو</span>
                      </div>
                    )}
                    {committeeMembers.length === 0 && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
                        <Users className="w-3.5 h-3.5" />
                        لا يوجد أعضاء بعد
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Link to={`${createPageUrl('TeamManagement')}?committee=${committee.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full group-hover:bg-blue-50 group-hover:border-blue-300 group-hover:text-blue-700 transition-colors">
                          <Users className="w-3.5 h-3.5 ml-1" />
                          الأعضاء
                          <ChevronLeft className="w-3.5 h-3.5 mr-auto" />
                        </Button>
                      </Link>
                      {canManage && (
                        <Button variant="outline" size="sm" className="group-hover:bg-green-50 group-hover:border-green-300 group-hover:text-green-700 transition-colors" onClick={() => handleOpenAssignMember(committee)}>
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
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingCommittee ? 'تعديل اللجنة' : 'إضافة لجنة جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
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
                  <div className="border rounded-lg p-3 text-xs text-gray-600 bg-gray-50">
                    لا توجد معايير متاحة لهذا المحور حالياً.
                  </div>
                );
              })()}
              {!formData.axis_id && (
                <div className="border rounded-lg p-3 text-xs text-gray-600 bg-gray-50">
                  اختر محوراً أولاً لعرض المعايير المرتبطة.
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {editingCommittee ? 'حفظ' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف لجنة "{deleteDialog.committee?.name}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Existing Members Dialog */}
      <Dialog open={assignMemberOpen} onOpenChange={setAssignMemberOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              إضافة أعضاء إلى {assignTargetCommittee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                placeholder="بحث بالاسم أو الجوال أو الجهة..."
                className="pr-9"
              />
            </div>

            {/* Selected count */}
            {assignSelected.length > 0 && (
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                <span className="text-sm text-green-700 font-medium">
                  <UserCheck className="w-4 h-4 inline ml-1" />
                  تم تحديد {assignSelected.length} عضو
                </span>
                <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-7" onClick={() => setAssignSelected([])}>
                  إلغاء التحديد
                </Button>
              </div>
            )}

            {/* Members list */}
            <div className="border rounded-lg max-h-[320px] overflow-y-auto divide-y">
              {filteredAvailableMembers.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
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
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                        isSelected ? 'bg-green-50/70' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${
                        isSelected
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {isSelected ? <UserCheck className="w-4 h-4" /> : (m.full_name || '').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{m.full_name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span>{roleLabels[m.role] || m.role}</span>
                          {currentCommittee && (
                            <>
                              <span>•</span>
                              <span className="text-orange-600">{currentCommittee.name}</span>
                            </>
                          )}
                          {!currentCommittee && <span className="text-gray-400">بدون لجنة</span>}
                        </div>
                      </div>
                      {m.phone && <span className="text-[11px] text-gray-400 shrink-0 dir-ltr">{m.phone}</span>}
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
                className="bg-green-600 hover:bg-green-700"
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