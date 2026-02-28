import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Image, File, Search, Check, X, RotateCcw, Trash2, Eye, Loader2, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { usePermissions } from '@/hooks/usePermissions';

const fileTypes = [
  { value: "image", label: "صورة", icon: Image },
  { value: "document", label: "مستند", icon: FileText },
  { value: "report", label: "تقرير", icon: File },
  { value: "other", label: "أخرى", icon: File }
];

const statusConfig = {
  pending_supervisor: { label: "بانتظار اعتماد المشرف", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  pending_chairman: { label: "بانتظار اعتماد رئيس اللجنة", color: "bg-blue-100 text-blue-800", icon: Clock },
  approved: { label: "معتمد", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "مرفوض", color: "bg-red-100 text-red-800", icon: XCircle },
  returned: { label: "مُعاد", color: "bg-orange-100 text-orange-800", icon: AlertTriangle }
};

export default function Files() {
  const { permissions } = usePermissions();
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, file: null, action: null });
  const [actionReason, setActionReason] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', file_type: 'other', committee_id: '', file: null });
  const [uploading, setUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, file: null });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => api.entities.FileUpload.list('-created_date')
  });

  const { data: evidenceFiles = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => api.entities.Evidence.list('-created_date')
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.FileUpload.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.FileUpload.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.FileUpload.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] })
  });

  const deleteEvidenceMutation = useMutation({
    mutationFn: (id) => api.entities.Evidence.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  if (!permissions.canSeeFiles) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة الملفات. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentMember = members.find(m => m.email === currentUser?.email);
  const userRole = currentMember?.role || currentUser?.role;
  const canUploadFiles = permissions.canUploadFiles === true;

  const isGovernor = userRole === 'admin' || userRole === 'governor';
  const isSupervisor = userRole === 'committee_supervisor';
  const isCommitteeChairman = userRole === 'committee_head';

  const mapEvidenceStatusToFilesStatus = (status) => {
    if (!status) return 'pending_supervisor';
    if (status === 'approved') return 'approved';
    if (status === 'rejected') return 'rejected';
    if (status === 'returned') return 'returned';
    if (String(status).startsWith('pending')) return 'pending_supervisor';
    return 'pending_supervisor';
  };

  const mergedFiles = [
    ...files.map((f) => ({ ...f, _source: 'file_upload' })),
    ...evidenceFiles.map((e) => ({
      ...e,
      _source: 'evidence',
      status: mapEvidenceStatusToFilesStatus(e.status),
      committee_name: e.committee_name || e.axis_name || (e.standard_code ? `المعيار ${e.standard_code}` : ''),
    })),
  ];

  const filteredFiles = mergedFiles.filter(f => {
    const matchesStatus = activeStatus === 'all' || f.status === activeStatus;
    const matchesSearch = !searchQuery || f.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: mergedFiles.length,
    pending_supervisor: mergedFiles.filter(f => f.status === 'pending_supervisor').length,
    pending_chairman: mergedFiles.filter(f => f.status === 'pending_chairman').length,
    approved: mergedFiles.filter(f => f.status === 'approved').length,
    rejected: mergedFiles.filter(f => f.status === 'rejected').length,
    returned: mergedFiles.filter(f => f.status === 'returned').length
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!canUploadFiles) return;
    if (!formData.file) return;

    setUploading(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file: formData.file });

    const committee = committees.find(c => c.id === formData.committee_id);
    await createMutation.mutateAsync({
      title: formData.title,
      description: formData.description,
      file_url,
      file_type: formData.file_type,
      committee_id: formData.committee_id,
      committee_name: committee?.name || '',
      uploaded_by_name: currentUser?.full_name || currentMember?.full_name,
      uploaded_by_role: userRole,
      status: 'pending_supervisor'
    });

    setUploading(false);
    setUploadOpen(false);
    setFormData({ title: '', description: '', file_type: 'other', committee_id: '', file: null });
  };

  const handleAction = async () => {
    const { file, action } = actionDialog;
    if (!file) return;

    let updateData = {};
    const now = new Date().toISOString();
    const approverName = currentUser?.full_name || currentMember?.full_name;

    switch (action) {
      case 'approve_supervisor':
        updateData = {
          status: 'pending_chairman',
          supervisor_approval: { approved_by: approverName, approved_at: now }
        };
        break;
      case 'approve_chairman':
        updateData = {
          status: 'approved',
          chairman_approval: { approved_by: approverName, approved_at: now }
        };
        break;
      case 'reject':
        updateData = { status: 'rejected', rejection_reason: actionReason };
        break;
      case 'return':
        updateData = { status: 'returned', rejection_reason: actionReason };
        break;
    }

    await updateMutation.mutateAsync({ id: file.id, data: updateData });
    setActionDialog({ open: false, file: null, action: null });
    setActionReason('');
  };

  const handleDelete = async () => {
    if (deleteDialog.file) {
      if (deleteDialog.file._source === 'evidence') {
        await deleteEvidenceMutation.mutateAsync(deleteDialog.file.id);
      } else {
        await deleteMutation.mutateAsync(deleteDialog.file.id);
      }
      setDeleteDialog({ open: false, file: null });
    }
  };

  const handlePreviewFile = (fileUrl) => {
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
  };

  const canApproveAsSupervisor = (file) => file?._source === 'file_upload' && isSupervisor && file.status === 'pending_supervisor';
  const canApproveAsChairman = (file) => file?._source === 'file_upload' && isCommitteeChairman && file.status === 'pending_chairman';
  const canModifyOrDelete = isGovernor;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إدارة الملفات والصور</h1>
          <p className="text-blue-100">رفع واعتماد ملفات برنامج المدينة الصحية</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-500">الإجمالي</p>
          </CardContent></Card>
          <Card className="border-yellow-200 bg-yellow-50"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.pending_supervisor}</p>
            <p className="text-xs text-gray-500">بانتظار المشرف</p>
          </CardContent></Card>
          <Card className="border-blue-200 bg-blue-50"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.pending_chairman}</p>
            <p className="text-xs text-gray-500">بانتظار الرئيس</p>
          </CardContent></Card>
          <Card className="border-green-200 bg-green-50"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
            <p className="text-xs text-gray-500">معتمد</p>
          </CardContent></Card>
          <Card className="border-red-200 bg-red-50"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
            <p className="text-xs text-gray-500">مرفوض</p>
          </CardContent></Card>
          <Card className="border-orange-200 bg-orange-50"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-700">{stats.returned}</p>
            <p className="text-xs text-gray-500">مُعاد</p>
          </CardContent></Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input placeholder="بحث في الملفات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
          </div>
          {canUploadFiles && (
            <Button onClick={() => setUploadOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-5 h-5 ml-2" />
              رفع ملف جديد
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus} className="mb-6">
          <TabsList className="flex-wrap h-auto gap-1 bg-white p-1">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="pending_supervisor">بانتظار المشرف</TabsTrigger>
            <TabsTrigger value="pending_chairman">بانتظار الرئيس</TabsTrigger>
            <TabsTrigger value="approved">معتمد</TabsTrigger>
            <TabsTrigger value="rejected">مرفوض</TabsTrigger>
            <TabsTrigger value="returned">مُعاد</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Files Grid */}
        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
        ) : filteredFiles.length === 0 ? (
          <Card className="text-center py-12"><CardContent>
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد ملفات</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map(file => {
              const StatusIcon = statusConfig[file.status]?.icon || Clock;
              const FileIcon = fileTypes.find(t => t.value === file.file_type)?.icon || File;
              return (
                <Card key={`${file._source || 'file'}-${file.id}`} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{file.title}</h3>
                        <p className="text-sm text-gray-500">{file.uploaded_by_name}</p>
                      </div>
                    </div>

                    {file.description && <p className="text-sm text-gray-600 mb-3">{file.description}</p>}

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={statusConfig[file.status]?.color}>
                        <StatusIcon className="w-3 h-3 ml-1" />
                        {statusConfig[file.status]?.label}
                      </Badge>
                      {file.committee_name && <Badge variant="outline">{file.committee_name}</Badge>}
                      {file._source === 'evidence' && <Badge variant="outline">الأدلة المرفوعة</Badge>}
                    </div>

                    {file.rejection_reason && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">سبب: {file.rejection_reason}</p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                      <Button variant="outline" size="sm" onClick={() => handlePreviewFile(file.file_url)}>
                        <Eye className="w-4 h-4 ml-1" />عرض
                      </Button>

                      {canApproveAsSupervisor(file) && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setActionDialog({ open: true, file, action: 'approve_supervisor' })}>
                            <Check className="w-4 h-4 ml-1" />اعتماد
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setActionDialog({ open: true, file, action: 'reject' })}>
                            <X className="w-4 h-4 ml-1" />رفض
                          </Button>
                        </>
                      )}

                      {canApproveAsChairman(file) && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setActionDialog({ open: true, file, action: 'approve_chairman' })}>
                            <Check className="w-4 h-4 ml-1" />اعتماد نهائي
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setActionDialog({ open: true, file, action: 'reject' })}>
                            <X className="w-4 h-4 ml-1" />رفض
                          </Button>
                        </>
                      )}

                      {canModifyOrDelete && file._source !== 'evidence' && (
                        <Button size="sm" variant="outline" onClick={() => setActionDialog({ open: true, file, action: 'return' })}>
                          <RotateCcw className="w-4 h-4 ml-1" />إعادة
                        </Button>
                      )}

                      {canModifyOrDelete && (
                        <Button size="sm" variant="destructive" onClick={() => setDeleteDialog({ open: true, file })}>
                          <Trash2 className="w-4 h-4" />
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

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>رفع ملف جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان الملف *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع الملف</Label>
                <Select value={formData.file_type} onValueChange={(v) => setFormData({ ...formData, file_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fileTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اللجنة</Label>
                <Select value={formData.committee_id} onValueChange={(v) => setFormData({ ...formData, committee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر اللجنة" /></SelectTrigger>
                  <SelectContent>
                    {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>الملف *</Label>
              <Input type="file" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" required />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
                {uploading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                رفع الملف
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.action === 'approve_supervisor' && 'اعتماد أولي'}
              {actionDialog.action === 'approve_chairman' && 'اعتماد نهائي'}
              {actionDialog.action === 'reject' && 'رفض الملف'}
              {actionDialog.action === 'return' && 'إعادة الملف'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(actionDialog.action === 'reject' || actionDialog.action === 'return') && (
                <div className="mt-4">
                  <Label>السبب</Label>
                  <Textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="أدخل السبب..." className="mt-2" />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} className={actionDialog.action?.includes('approve') ? 'bg-green-600' : 'bg-red-600'}>
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الملف؟</AlertDialogDescription>
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