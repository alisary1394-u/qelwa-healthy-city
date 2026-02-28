import React, { useCallback, useMemo, useState } from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronDown, Eye, FileText, Image, Loader2, Minus, Paperclip, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';

function safeParseJson(value, fallback) {
	if (value == null) return fallback;
	if (typeof value === 'object') return value;
	if (typeof value !== 'string') return fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

function normalizeStandardKpis(kpis) {
	const list = Array.isArray(kpis) ? kpis : [];
	return list
		.map((k) => {
			if (!k) return null;
			if (typeof k === 'string') {
				return {
					name: k,
					description: '',
					target_value: 0,
					unit: '',
					measurement_frequency: 'شهري',
					notes: '',
				};
			}
			if (typeof k === 'object') {
				return {
					name: k.name ?? k.kpi_name ?? '',
					description: k.description ?? '',
					target_value: Number(k.target_value ?? k.target ?? 0) || 0,
					unit: k.unit ?? '',
					measurement_frequency: k.measurement_frequency ?? 'شهري',
					notes: k.notes ?? '',
				};
			}
			return null;
		})
		.filter(Boolean)
		.filter((k) => k.name);
}

function getStatusFromValues(targetValue, currentValue) {
	const target = Number(targetValue) || 0;
	const current = Number(currentValue) || 0;
	const percentage = target > 0 ? (current / target) * 100 : 0;
	const status = percentage >= 100 ? 'achieved' : percentage >= 75 ? 'on_track' : percentage >= 50 ? 'at_risk' : 'behind';
	return { percentage, status };
}

function getStatusColor(status) {
	switch (status) {
		case 'achieved':
			return 'bg-green-100 text-green-700';
		case 'on_track':
			return 'bg-blue-100 text-blue-700';
		case 'at_risk':
			return 'bg-yellow-100 text-yellow-700';
		case 'behind':
			return 'bg-red-100 text-red-700';
		default:
			return 'bg-gray-100 text-gray-700';
	}
}

function getStatusLabel(status) {
	switch (status) {
		case 'achieved':
			return 'محقق';
		case 'on_track':
			return 'على المسار';
		case 'at_risk':
			return 'معرض للخطر';
		case 'behind':
			return 'متأخر';
		default:
			return 'غير محدد';
	}
}

export default function StandardKPIManager({ standard, evidence = [] }) {
	const { permissions, role, currentMember, isGovernor } = usePermissions();
	const queryClient = useQueryClient();

	const isGlobalInitiativeManager = role === 'governor' || role === 'coordinator' || permissions?.canManageInitiatives === true;
	const isCommitteeLeader = role === 'committee_head' || role === 'committee_coordinator' || role === 'committee_supervisor';
	const sameCommittee = Boolean(
		standard?.committee_id &&
		currentMember?.committee_id &&
		String(standard.committee_id) === String(currentMember.committee_id)
	);

	const canEditKpis = isGlobalInitiativeManager || (isCommitteeLeader && sameCommittee);
	const canUploadEvidence = permissions?.canUploadFiles === true || canEditKpis;
	const canApproveEvidence = permissions?.canApproveEvidence === true;
	const canDeleteEvidence = Boolean(isGovernor);
	const isPendingEvidenceStatus = (status) => typeof status === 'string' && status.startsWith('pending');

	const [formOpen, setFormOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editingKpiIndex, setEditingKpiIndex] = useState(null);

	const [evidenceOpen, setEvidenceOpen] = useState(false);
	const [selectedKpiName, setSelectedKpiName] = useState('');
	const [uploadingEvidence, setUploadingEvidence] = useState(false);
	const [evidenceForm, setEvidenceForm] = useState({ title: '', description: '', files: [] });

	const [formData, setFormData] = useState({
		name: '',
		description: '',
		target_value: 0,
		unit: '',
		measurement_frequency: 'شهري',
		notes: '',
	});

	const normalizedKpis = useMemo(() => normalizeStandardKpis(safeParseJson(standard?.kpis, [])), [standard?.kpis]);
	const valuesMap = useMemo(() => {
		const raw = safeParseJson(standard?.kpi_values, {});
		return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
	}, [standard?.kpi_values]);

	const evidenceByKpiName = useMemo(() => {
		const list = Array.isArray(evidence) ? evidence : [];
		return list
			.filter((e) => e?.standard_id === standard?.id && e?.kpi_type === 'standard' && e?.kpi_name)
			.reduce((acc, item) => {
				const k = String(item.kpi_name);
				if (!acc[k]) acc[k] = [];
				acc[k].push(item);
				return acc;
			}, {});
	}, [evidence, standard?.id]);

	const updateStandardMutation = useMutation({
		mutationFn: ({ id, data }) => api.entities.Standard.update(id, data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['standards'] }),
	});

	const createEvidenceMutation = useMutation({
		mutationFn: (data) => api.entities.Evidence.create(data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] }),
	});

	const deleteEvidenceMutation = useMutation({
		mutationFn: (id) => api.entities.Evidence.delete(id),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] }),
	});

	const updateEvidenceMutation = useMutation({
		mutationFn: ({ id, data }) => api.entities.Evidence.update(id, data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] }),
	});

	const resetForm = () => {
		setFormData({
			name: '',
			description: '',
			target_value: 0,
			unit: '',
			measurement_frequency: 'شهري',
			notes: '',
		});
	};

	const openCreateDialog = () => {
		if (!canEditKpis) return;
		setEditingKpiIndex(null);
		resetForm();
		setFormOpen(true);
	};

	const openEditDialog = (idx) => {
		if (!canEditKpis) return;
		const kpi = normalizedKpis[idx];
		if (!kpi) return;
		setEditingKpiIndex(idx);
		setFormData({
			name: kpi.name || '',
			description: kpi.description || '',
			target_value: Number(kpi.target_value) || 0,
			unit: kpi.unit || '',
			measurement_frequency: kpi.measurement_frequency || 'شهري',
			notes: kpi.notes || '',
		});
		setFormOpen(true);
	};

	const persistKpis = async (nextKpis) => {
		if (!standard?.id) return;
		await updateStandardMutation.mutateAsync({
			id: standard.id,
			data: { kpis: JSON.stringify(nextKpis) },
		});
	};

	const persistKpiValues = async (nextValues) => {
		if (!standard?.id) return;
		await updateStandardMutation.mutateAsync({
			id: standard.id,
			data: { kpi_values: JSON.stringify(nextValues) },
		});
	};

	const handleSave = async (e) => {
		e.preventDefault();
		if (!canEditKpis) return;
		if (!standard?.id) return;

		setSaving(true);
		try {
			const next = [...normalizedKpis];
			const kpiObj = {
				name: String(formData.name || '').trim(),
				description: formData.description || '',
				target_value: Number(formData.target_value) || 0,
				unit: formData.unit || '',
				measurement_frequency: formData.measurement_frequency || 'شهري',
				notes: formData.notes || '',
			};
			if (!kpiObj.name) return;

			if (editingKpiIndex != null && next[editingKpiIndex]) {
				next[editingKpiIndex] = kpiObj;
			} else {
				next.push(kpiObj);
			}

			await persistKpis(next);
			setFormOpen(false);
			setEditingKpiIndex(null);
			resetForm();
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteKpi = async (idx) => {
		if (!canEditKpis) return;
		const kpi = normalizedKpis[idx];
		if (!kpi?.name) return;
		const ok = typeof window !== 'undefined'
			? window.confirm('هل أنت متأكد من حذف المؤشر؟ سيتم حذف مرفقاته أيضاً.')
			: false;
		if (!ok) return;

		try {
			const attachments = evidenceByKpiName[kpi.name] || [];
			for (const att of attachments) {
				if (att?.id) await deleteEvidenceMutation.mutateAsync(att.id);
			}

			const nextKpis = normalizedKpis.filter((_, i) => i !== idx);
			await persistKpis(nextKpis);

			const nextValues = { ...valuesMap };
			delete nextValues[kpi.name];
			await persistKpiValues(nextValues);
		} catch (err) {
			if (typeof window !== 'undefined') {
				window.alert(`فشل حذف المؤشر.\n${err?.message || err}`);
			}
		}
	};

	const handleUpdateValue = async (kpi, newValue) => {
		if (!canEditKpis) return;
		if (!kpi?.name) return;
		try {
			const nextValues = { ...valuesMap, [kpi.name]: Number(newValue) || 0 };
			await persistKpiValues(nextValues);
		} catch (err) {
			if (typeof window !== 'undefined') {
				window.alert(`فشل تعديل قيمة المؤشر.\n${err?.message || err}`);
			}
		}
	};

	const openEvidenceDialog = (kpiName) => {
		if (!canUploadEvidence) return;
		setSelectedKpiName(kpiName);
		setEvidenceForm({ title: '', description: '', files: [] });
		setEvidenceOpen(true);
	};

	const handleUploadEvidence = async (e) => {
		e.preventDefault();
		if (!canUploadEvidence) return;
		if (!standard?.id) return;
		if (!selectedKpiName) return;
		const files = Array.isArray(evidenceForm.files) ? evidenceForm.files : [];
		if (files.length === 0) return;

		setUploadingEvidence(true);
		try {
			for (const file of files) {
				const { file_url } = await api.integrations.Core.UploadFile({ file });
				const fileType = file.type?.startsWith('image/') ? 'image' : 'document';
				await createEvidenceMutation.mutateAsync({
					kpi_type: 'standard',
					kpi_name: selectedKpiName,
					title: evidenceForm.title || file.name,
					description: evidenceForm.description,
					file_url,
					file_name: file.name,
					file_type: fileType,
					standard_id: standard.id,
					standard_code: standard.code,
					axis_id: standard.axis_id,
					uploaded_by_name: currentMember?.full_name,
					status: 'pending',
					created_at: new Date().toISOString(),
				});
			}
			setEvidenceOpen(false);
			setSelectedKpiName('');
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
		const ok = typeof window !== 'undefined' ? window.confirm('هل أنت متأكد من حذف المرفق؟') : false;
		if (!ok) return;
		await deleteEvidenceMutation.mutateAsync(evidenceItem.id);
	};

	const handleApproveEvidence = async (evidenceItem) => {
		if (!canApproveEvidence) return;
		if (!evidenceItem?.id) return;
		await updateEvidenceMutation.mutateAsync({
			id: evidenceItem.id,
			data: {
				status: 'approved',
				approved_by: currentMember?.full_name,
				approved_at: new Date().toISOString(),
			},
		});
	};

	const handleRejectEvidence = async (evidenceItem, reason) => {
		if (!canApproveEvidence) return;
		if (!evidenceItem?.id) return;
		await updateEvidenceMutation.mutateAsync({
			id: evidenceItem.id,
			data: { status: 'rejected', rejection_reason: reason || 'غير مطابق للمتطلبات' },
		});
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

	return (
		<div className="space-y-4">
			<Collapsible className="mt-4">
				<CollapsibleTrigger asChild>
					<button type="button" className="w-full text-right group">
						<div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100/50 transition-colors">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-lg text-blue-900">مؤشرات الأداء (KPIs)</h3>
								<Badge variant="secondary" className="text-xs">{normalizedKpis.length}</Badge>
							</div>
							<ChevronDown className="w-5 h-5 text-gray-500 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
						</div>
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="space-y-4 pt-3">
						<div className="flex items-center justify-end">
							{canEditKpis && (
								<Button size="sm" onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700">
									<Plus className="w-4 h-4 ml-1" />
									مؤشر جديد
								</Button>
							)}
						</div>

						{normalizedKpis.length === 0 ? (
							<Card className="text-center py-8 bg-gray-50">
								<CardContent>
									<p className="text-gray-500 text-sm">لا توجد مؤشرات أداء بعد</p>
								</CardContent>
							</Card>
						) : (
							<div className="space-y-3">
								{normalizedKpis.map((kpi, idx) => {
									const currentValue = valuesMap[kpi.name] ?? 0;
									const { percentage, status } = getStatusFromValues(kpi.target_value, currentValue);
									const attachments = evidenceByKpiName[kpi.name] || [];
									return (
										<Card key={`${standard?.id}-${kpi.name}-${idx}`}>
											<CardContent className="p-4">
												<div className="flex items-start justify-between mb-3">
													<div className="flex-1">
														<h4 className="font-semibold">{kpi.name}</h4>
														{kpi.description && <p className="text-sm text-gray-500">{kpi.description}</p>}
													</div>
													<div className="flex items-center gap-2">
														{canEditKpis && (
															<Button size="icon" variant="ghost" onClick={() => openEditDialog(idx)} title="تعديل">
																<Pencil className="w-4 h-4" />
															</Button>
														)}
														{canEditKpis && (
															<Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteKpi(idx)} title="حذف">
																<Trash2 className="w-4 h-4" />
															</Button>
														)}
														<Badge className={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
													</div>
												</div>

											<div className="space-y-2">
												<div className="flex justify-between text-sm">
													<span className="text-gray-500">التقدم</span>
								<span className="font-semibold">
													{currentValue} / {Number(kpi.target_value) || 0} {kpi.unit === 'تحقق' ? 'مستند' : kpi.unit}
												</span>
												</div>
												<Progress value={Math.min(percentage, 100)} className="h-2" />
												<p className="text-xs text-gray-500">{Math.min(percentage, 100).toFixed(1)}% محقق</p>

											<div className="flex items-center gap-2 pt-2">
												<Button size="sm" variant="outline" disabled={!canEditKpis} onClick={() => handleUpdateValue(kpi, Math.max(0, Number(currentValue) - 1))}>
													<Minus className="w-4 h-4" />
												</Button>
												<Input
													type="number"
													min={0}
													max={Number(kpi.target_value) || undefined}
													value={Number(currentValue) || 0}
													disabled={!canEditKpis}
													onChange={(ev) => {
														const target = Number(kpi.target_value) || 0;
														const val = Math.max(0, parseFloat(ev.target.value) || 0);
														handleUpdateValue(kpi, target > 0 ? Math.min(val, target) : val);
													}}
													className="text-center"
												/>
												<Button size="sm" variant="outline" disabled={!canEditKpis || (Number(kpi.target_value) > 0 && Number(currentValue) >= Number(kpi.target_value))} onClick={() => handleUpdateValue(kpi, Number(currentValue) + 1)}>
													<Plus className="w-4 h-4" />
												</Button>
											</div>

												<div className="pt-3 mt-3 border-t">
													<Collapsible>
														<div className="flex items-center justify-between gap-2">
															<CollapsibleTrigger asChild>
																<button type="button" className="text-right group flex items-center gap-2 text-sm text-gray-700">
																	<Paperclip className="w-4 h-4" />
																	<span>مرفقات المؤشر</span>
																	<Badge variant="outline" className="text-xs">{attachments.length}</Badge>
																	<ChevronDown className="w-4 h-4 text-gray-500 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
																</button>
															</CollapsibleTrigger>
															<Button size="sm" variant="outline" disabled={!canUploadEvidence} onClick={() => openEvidenceDialog(kpi.name)}>
																<Upload className="w-4 h-4 ml-2" />
																رفع مرفق
															</Button>
														</div>

														<CollapsibleContent>
															{attachments.length > 0 ? (
																<div className="mt-2 space-y-2">
																	{attachments.map((att) => (
																		<div key={att.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-50">
																			{att.file_type === 'image' ? (
																				<Image className="w-4 h-4 text-blue-600" />
																			) : (
																				<FileText className="w-4 h-4 text-green-700" />
																			)}
																			<button
																				type="button"
																				onClick={() => handlePreviewEvidence(att.file_url)}
																				className="text-sm text-blue-700 hover:underline flex-1 min-w-0 truncate text-right"
																				title={att.title || att.file_name}
																			>
																				{att.title || att.file_name || 'مرفق'}
																			</button>
																			<Button size="icon" variant="ghost" className="text-blue-700" title="معاينة" onClick={() => handlePreviewEvidence(att.file_url)}>
																				<Eye className="w-4 h-4" />
																			</Button>
																			{canApproveEvidence && isPendingEvidenceStatus(att.status) && (
																				<>
																					<Button size="sm" variant="ghost" className="text-green-700" onClick={() => handleApproveEvidence(att)}>
																						<Check className="w-4 h-4 ml-1" />اعتماد
																					</Button>
																					<Button size="sm" variant="ghost" className="text-red-700" onClick={() => handleRejectEvidence(att, 'غير مطابق للمتطلبات')}>
																						<X className="w-4 h-4 ml-1" />رفض
																					</Button>
																				</>
																			)}
																			{canDeleteEvidence && (
																				<Button size="sm" variant="ghost" className="text-red-700" onClick={() => handleDeleteEvidence(att)}>
																					<Trash2 className="w-4 h-4 ml-1" />حذف
																				</Button>
																			)}
																		</div>
																	))}
																</div>
															) : (
																<div className="mt-2 text-sm text-gray-500">لا توجد مرفقات</div>
															)}
														</CollapsibleContent>
													</Collapsible>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
					</div>
				</CollapsibleContent>
			</Collapsible>

			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent dir="rtl">
					<DialogHeader>
						<DialogTitle>{editingKpiIndex != null ? 'تعديل مؤشر الأداء' : 'مؤشر أداء جديد'}</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSave} className="space-y-4 mt-4">
						<div className="space-y-2">
							<Label>اسم المؤشر *</Label>
							<Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
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
							<div className="space-y-2">
								<Label>ملاحظات</Label>
								<Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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

			<Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
				<DialogContent dir="rtl">
					<DialogHeader>
						<DialogTitle>رفع مرفقات للمؤشر: {selectedKpiName || ''}</DialogTitle>
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
								<div className="text-xs text-gray-600">{evidenceForm.files.length} ملف(ات) محدد</div>
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
