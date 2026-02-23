import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Users, UserCog, Eye, HandHelping, Edit, Trash2, Building, Loader2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/hooks/usePermissions';

export default function Committees() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, committee: null });
  const [formData, setFormData] = useState({ name: '', description: '' });
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

  const { permissions } = usePermissions();
  const canManage = permissions.canManageCommittees;

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
    if (committee) {
      setEditingCommittee(committee);
      setFormData({ name: committee.name, description: committee.description || '' });
    } else {
      setEditingCommittee(null);
      setFormData({ name: '', description: '' });
    }
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
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
    if (deleteDialog.committee) {
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
        ) : committees.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد لجان</p>
              {canManage && (
                <Button variant="outline" className="mt-4" onClick={() => handleOpenForm()}>
                  إضافة لجنة جديدة
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {committees.map(committee => {
              const stats = getCommitteeStats(committee.id);
              return (
                <Card key={committee.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{committee.name}</CardTitle>
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