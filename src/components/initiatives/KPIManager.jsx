import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, Minus, Loader2, Upload, Paperclip, Trash2, FileText, Image, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from '@/hooks/usePermissions';
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';

export default function KPIManager({ initiativeId, initiativeTitle }) {
	const { permissions, role, currentMember } = usePermissions();
	const isGlobalInitiativeManager = role === 'governor' || role === 'coordinator' || permissions?.canManageInitiatives === true;
	const isCommitteeLeader = role === 'committee_head' || role === 'committee_coordinator' || role === 'committee_supervisor';

	const { data: initiative } = useQuery({
		queryKey: ['initiative', initiativeId],
		queryFn: () => api.entities.Initiative.get(initiativeId),
		enabled: !!initiativeId,
	});

	const sameCommittee = Boolean(
		initiative?.committee_id &&
		currentMember?.committee_id &&
		String(initiative.committee_id) === String(currentMember.committee_id)
	);

	const canEditKpis = isGlobalInitiativeManager || (isCommitteeLeader && sameCommittee);
	const canUploadEvidence = (permissions?.canUploadFiles === true) && (isGlobalInitiativeManager || sameCommittee || role === 'governor' || role === 'coordinator')
		|| canEditKpis;
	const canDeleteEvidence = canEditKpis;

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);

	const [evidenceOpen, setEvidenceOpen] = useState(false);
	const [selectedKpi, setSelectedKpi] = useState(null);
	const [uploadingEvidence, setUploadingEvidence] = useState(false);
	const [evidenceForm, setEvidenceForm] = useState({ title: '', description: '', files: [] });

  const [formData, setFormData] = useState({
    kpi_name: '',
    description: '',
    target_value: 0,
    current_value: 0,
    unit: '',
    measurement_frequency: 'شهري',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis', initiativeId],
    queryFn: () => api.entities.InitiativeKPI.filter({ initiative_id: initiativeId })
  });

	const { data: kpiEvidence = [] } = useQuery({
		queryKey: ['kpiEvidence', initiativeId],
		queryFn: () => api.entities.KpiEvidence.filter({ initiative_id: initiativeId })
	});

	const evidenceByKpiId = (Array.isArray(kpiEvidence) ? kpiEvidence : []).reduce((acc, item) => {
		const kpiId = item?.initiative_kpi_id;
		if (!kpiId) return acc;
		if (!acc[kpiId]) acc[kpiId] = [];
		acc[kpiId].push(item);
		return acc;
	}, {});

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.InitiativeKPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis', initiativeId] });
      setFormOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.InitiativeKPI.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpis', initiativeId] })
  });

	const deleteMutation = useMutation({
		mutationFn: (id) => api.entities.InitiativeKPI.delete(id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpis', initiativeId] })
	});

	const createEvidenceMutation = useMutation({
		mutationFn: (data) => api.entities.KpiEvidence.create(data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpiEvidence', initiativeId] })
	});

	const deleteEvidenceMutation = useMutation({
		mutationFn: (id) => api.entities.KpiEvidence.delete(id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpiEvidence', initiativeId] })
	});

  const resetForm = () => {
    setFormData({
      kpi_name: '',
      description: '',
      target_value: 0,
      current_value: 0,
      unit: '',
      measurement_frequency: 'شهري',
      notes: ''
    });
  };

	const openCreateDialog = () => {
		if (!canEditKpis) return;
		setEditingKpi(null);
		resetForm();
		setFormOpen(true);
	};

	const openEditDialog = (kpi) => {
		if (!canEditKpis) return;
		if (!kpi?.id) return;
		setEditingKpi(kpi);
		setFormData({
			kpi_name: kpi.kpi_name || '',
			description: kpi.description || '',
			target_value: Number(kpi.target_value) || 0,
			current_value: Number(kpi.current_value) || 0,
			unit: kpi.unit || '',
			measurement_frequency: kpi.measurement_frequency || 'شهري',
			notes: kpi.notes || '',
		});
		setFormOpen(true);
	};

	const handleDeleteKpi = async (kpi) => {
		if (!canEditKpis) return;
		if (!kpi?.id) return;
		const ok = await requireSecureDeleteConfirmation(`المؤشر "${kpi.kpi_name || 'غير معنون'}"`);
		if (!ok) return;
		try {
			const attachments = evidenceByKpiId[kpi.id] || [];
			for (const att of attachments) {
				if (att?.id) {
					await deleteEvidenceMutation.mutateAsync(att.id);
				}
			}
			await deleteMutation.mutateAsync(kpi.id);
		} catch (err) {
			if (typeof window !== 'undefined') {
				window.alert(`فشل حذف المؤشر.\n${err?.message || err}`);
			}
		}
	};

	const handleSave = async (e) => {
		e.preventDefault();
		if (!canEditKpis) return;
		setSaving(true);

		try {
			const target = Number(formData.target_value) || 0;
			const current = Number(formData.current_value) || 0;
			const percentage = target > 0 ? (current / target) * 100 : 0;
			const status = percentage >= 100 ? 'achieved' :
								 percentage >= 75 ? 'on_track' :
								 percentage >= 50 ? 'at_risk' : 'behind';

			if (editingKpi?.id) {
				await updateMutation.mutateAsync({
					id: editingKpi.id,
					data: {
						...formData,
						status,
						last_updated: new Date().toISOString().split('T')[0]
					}
				});
				setFormOpen(false);
				setEditingKpi(null);
				resetForm();
			} else {
				await createMutation.mutateAsync({
					...formData,
					initiative_id: initiativeId,
					initiative_title: initiativeTitle,
					status,
					last_updated: new Date().toISOString().split('T')[0]
				});
			}
		} catch (err) {
			if (typeof window !== 'undefined') {
				window.alert(`فشل حفظ المؤشر.\n${err?.message || err}`);
			}
		} finally {
			setSaving(false);
		}
  };

  const handleUpdateValue = async (kpi, newValue) => {
		if (!canEditKpis) return;
		try {
			const target = Number(kpi.target_value) || 0;
			const current = Number(newValue) || 0;
			const percentage = target > 0 ? (current / target) * 100 : 0;
			const status = percentage >= 100 ? 'achieved' :
								 percentage >= 75 ? 'on_track' :
								 percentage >= 50 ? 'at_risk' : 'behind';

			await updateMutation.mutateAsync({
				id: kpi.id,
				data: {
					current_value: current,
					status,
					last_updated: new Date().toISOString().split('T')[0]
				}
			});
		} catch (err) {
			if (typeof window !== 'undefined') {
				window.alert(`فشل تعديل قيمة المؤشر.\n${err?.message || err}`);
			}
		}
  };

	const openEvidenceDialog = (kpi) => {
		if (!canUploadEvidence) return;
		setSelectedKpi(kpi);
		setEvidenceForm({ title: '', description: '', files: [] });
		setEvidenceOpen(true);
	};

	const handleUploadEvidence = async (e) => {
		e.preventDefault();
		if (!canUploadEvidence) return;
		if (!selectedKpi?.id) return;
		const files = Array.isArray(evidenceForm.files) ? evidenceForm.files : [];
		if (files.length === 0) return;

		setUploadingEvidence(true);
		try {
			for (const file of files) {
				const { file_url } = await api.integrations.Core.UploadFile({ file });
				const fileType = file.type?.startsWith('image/') ? 'image' : 'document';
				await createEvidenceMutation.mutateAsync({
					kpi_type: 'initiative',
					initiative_id: initiativeId,
					initiative_title: initiativeTitle,
					initiative_kpi_id: selectedKpi.id,
					kpi_name: selectedKpi.kpi_name,
					title: evidenceForm.title || file.name,
					description: evidenceForm.description,
					file_url,
					file_name: file.name,
					file_type: fileType,
					created_at: new Date().toISOString(),
				});
			}
			setEvidenceOpen(false);
			setSelectedKpi(null);
			setEvidenceForm({ title: '', description: '', files: [] });
		} catch (err) {
			if (typeof window !== 'undefined') {
				window.alert(`فشل رفع المرفقات.\n${err?.message || err}`);
			}
		} finally {
			setUploadingEvidence(false);
		}
	};

	const handleDeleteEvidence = async (evidenceItem) => {
		if (!canDeleteEvidence) return;
		if (!evidenceItem?.id) return;
		const ok = await requireSecureDeleteConfirmation(`مرفق المؤشر "${evidenceItem.title || evidenceItem.file_name || 'غير معنون'}"`);
		if (!ok) return;
		await deleteEvidenceMutation.mutateAsync(evidenceItem.id);
	};

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-700';
      case 'on_track': return 'bg-blue-100 text-blue-700';
      case 'at_risk': return 'bg-yellow-100 text-yellow-700';
      case 'behind': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'achieved': return 'محقق';
      case 'on_track': return 'على المسار';
      case 'at_risk': return 'معرض للخطر';
      case 'behind': return 'متأخر';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">مؤشرات الأداء (KPIs)</h3>
			{canEditKpis && (
				<Button size="sm" onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
					<Plus className="w-4 h-4 ml-1" />
					مؤشر جديد
				</Button>
			)}
      </div>

      {kpis.length === 0 ? (
        <Card className="text-center py-8 bg-gray-50">
          <CardContent>
            <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">لا توجد مؤشرات أداء بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {kpis.map((kpi) => {
						const target = Number(kpi.target_value) || 0;
						const current = Number(kpi.current_value) || 0;
						const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const attachments = evidenceByKpiId[kpi.id] || [];
            return (
              <Card key={kpi.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{kpi.kpi_name}</h4>
                      {kpi.description && <p className="text-sm text-gray-500">{kpi.description}</p>}
                    </div>
						<div className="flex items-center gap-2">
							{canEditKpis && (
								<Button size="icon" variant="ghost" onClick={() => openEditDialog(kpi)} title="تعديل">
									<Pencil className="w-4 h-4" />
								</Button>
							)}
							{canEditKpis && (
								<Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteKpi(kpi)} title="حذف">
									<Trash2 className="w-4 h-4" />
								</Button>
							)}
							<Badge className={getStatusColor(kpi.status)}>
								{getStatusLabel(kpi.status)}
							</Badge>
						</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">التقدم</span>
                      <span className="font-semibold">{kpi.current_value} / {kpi.target_value} {kpi.unit}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-gray-500">{percentage.toFixed(1)}% محقق</p>

                    <div className="flex items-center gap-2 pt-2">
                      <Button size="sm" variant="outline" disabled={!canEditKpis} onClick={() => handleUpdateValue(kpi, Math.max(0, kpi.current_value - 1))}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={kpi.current_value}
                        disabled={!canEditKpis}
                        onChange={(e) => handleUpdateValue(kpi, parseFloat(e.target.value) || 0)}
                        className="text-center"
                      />
                      <Button size="sm" variant="outline" disabled={!canEditKpis} onClick={() => handleUpdateValue(kpi, kpi.current_value + 1)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="pt-3 mt-3 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Paperclip className="w-4 h-4" />
                          <span>مرفقات المؤشر</span>
                          <Badge variant="outline" className="text-xs">{attachments.length}</Badge>
                        </div>
                        <Button size="sm" variant="outline" disabled={!canUploadEvidence} onClick={() => openEvidenceDialog(kpi)}>
                          <Upload className="w-4 h-4 ml-2" />
                          رفع مرفق
                        </Button>
                      </div>

                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
                              {att.file_type === 'image' ? (
                                <Image className="w-4 h-4 text-blue-600" />
                              ) : (
                                <FileText className="w-4 h-4 text-green-700" />
                              )}
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-700 hover:underline flex-1 min-w-0 truncate"
                                title={att.title || att.file_name}
                              >
                                {att.title || att.file_name || 'مرفق'}
                              </a>
										{canDeleteEvidence && (
											<Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteEvidence(att)}>
												<Trash2 className="w-4 h-4" />
											</Button>
										)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* KPI Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
				<DialogTitle>{editingKpi ? 'تعديل مؤشر الأداء' : 'مؤشر أداء جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اسم المؤشر *</Label>
              <Input value={formData.kpi_name} onChange={(e) => setFormData({ ...formData, kpi_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>القيمة المستهدفة *</Label>
                <Input type="number" value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>القيمة الحالية</Label>
                <Input type="number" value={formData.current_value} onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>وحدة القياس</Label>
                <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="مثال: مستفيد، جلسة، يوم" />
              </div>
              <div className="space-y-2">
                <Label>تكرار القياس</Label>
                <Select value={formData.measurement_frequency} onValueChange={(v) => setFormData({ ...formData, measurement_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="يومي">يومي</SelectItem>
                    <SelectItem value="أسبوعي">أسبوعي</SelectItem>
                    <SelectItem value="شهري">شهري</SelectItem>
                    <SelectItem value="ربع سنوي">ربع سنوي</SelectItem>
                    <SelectItem value="سنوي">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ المؤشر
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* KPI Evidence Upload Dialog */}
      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع مرفقات للمؤشر: {selectedKpi?.kpi_name || ''}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadEvidence} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان المرفق (اختياري)</Label>
              <Input value={evidenceForm.title} onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>وصف (اختياري)</Label>
              <Textarea value={evidenceForm.description} onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>اختر ملفات (يمكن أكثر من ملف)</Label>
              <Input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setEvidenceForm({ ...evidenceForm, files: Array.from(e.target.files || []) })}
                required
              />
              {Array.isArray(evidenceForm.files) && evidenceForm.files.length > 0 && (
                <div className="text-xs text-gray-600">
                  {evidenceForm.files.length} ملف(ات) محدد
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setEvidenceOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={uploadingEvidence} className="bg-purple-600 hover:bg-purple-700">
                {uploadingEvidence && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                رفع
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}