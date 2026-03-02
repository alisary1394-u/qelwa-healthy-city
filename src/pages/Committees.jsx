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
import { Plus, Users, UserCog, Eye, HandHelping, Edit, Trash2, Building, Loader2, Search } from "lucide-react";
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
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scopedCommittees;
    return scopedCommittees.filter((committee) => {
      const name = String(committee.name || '').toLowerCase();
      const description = String(committee.description || '').toLowerCase();
      const axis = String(committee.axis_name || '').toLowerCase();
      return name.includes(q) || description.includes(q) || axis.includes(q);
    });
  }, [scopedCommittees, searchQuery]);

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
      setFormData({ 
        name: committee.name, 
        description: committee.description || '',
        axis_id: committee.axis_id || '',
        axis_name: committee.axis_name || '',
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

        <div className="mb-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في اللجان (الاسم، الوصف، المحور)..."
            className="pr-9"
          />
        </div>

        {canManage && (
          <div className="mb-6">
            <Button onClick={() => handleOpenForm()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 ml-2" />
              إضافة لجنة جديدة
            </Button>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommittees.map(committee => {
              const stats = getCommitteeStats(committee.id);
              return (
                <Card key={committee.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{committee.name}</CardTitle>
                        {committee.axis_name && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            المحور: {committee.axis_name}
                          </Badge>
                        )}
                        {committee.description && (
                          <p className="text-sm text-gray-500 mt-1">{committee.description}</p>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenForm(committee)}>
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, committee })}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <UserCog className="w-4 h-4 text-blue-600" />
                        <span>منسق: {stats.coordinators}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <Users className="w-4 h-4 text-green-600" />
                        <span>أعضاء: {stats.committee_members}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                        <Eye className="w-4 h-4 text-orange-600" />
                        <span>مشرفين: {stats.supervisors}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-teal-50 rounded">
                        <HandHelping className="w-4 h-4 text-teal-600" />
                        <span>متطوعين: {stats.volunteers}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <Badge variant={committee.status === 'active' ? 'default' : 'secondary'}>
                        {committee.status === 'active' ? 'نشطة' : 'غير نشطة'}
                      </Badge>
                      <Link to={`${createPageUrl('TeamManagement')}?committee=${committee.id}`}>
                        <Button variant="outline" size="sm">
                          عرض الأعضاء
                        </Button>
                      </Link>
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
    </div>
  );
}