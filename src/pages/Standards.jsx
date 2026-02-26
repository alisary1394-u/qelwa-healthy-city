import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AXES_SEED, AXIS_SHORT_NAMES, AXIS_COUNTS, getAxisOrderFromStandardIndex } from '@/api/seedAxesAndStandards';
import { STANDARDS_CSV, AXIS_KPIS_CSV as AXIS_KPIS, OVERALL_CLASSIFICATION_KPI } from '@/api/standardsFromCsv';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Target, Upload, FileText, Image, Check, X, Eye, Loader2, Trash2, Edit3, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

function parseJsonArray(str, fallback = []) {
  if (!str) return fallback;
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const statusConfig = {
  not_started: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  approved: { label: 'معتمد', color: 'bg-purple-100 text-purple-700' }
};

/** استخراج مؤشر المعيار (0–79) من الرمز محور-رقم، مع دعم 12 محوراً (CSV) */
function getStandardIndexFromCode(code) {
  const match = String(code || '').match(/م\s*(\d+)\s*-\s*(\d+)/) || String(code || '').match(/م(\d+)-(\d+)/);
  if (!match) return -1;
  const axisNum = parseInt(match[1], 10);
  const i = parseInt(match[2], 10);
  if (axisNum < 1 || axisNum > 12 || i < 1) return -1;
  if (AXIS_COUNTS[axisNum - 1] != null) {
    const before = AXIS_COUNTS.slice(0, axisNum - 1).reduce((a, b) => a + b, 0);
    return Math.min(79, before + (i - 1));
  }
  return Math.min(79, (axisNum - 1) * 8 + (i - 1));
}

function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  return list.length === 0 ? 'أدلة ومستندات تدعم تحقيق المعيار' : 'أدلة مطلوبة: ' + list.join('، ');
}

export default function Standards() {
  const [activeAxis, setActiveAxis] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [showResultTable, setShowResultTable] = useState(false);
  const [syncingStandards, setSyncingStandards] = useState(false);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: axes = [], isLoading: loadingAxes } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list('order')
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

  const { permissions } = usePermissions();
  const canManageStandards = permissions.canManageStandards;

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

  /** مزامنة نصوص المعايير (عنوان، وصف، أدلة، مؤشرات، اسم المحور، ومحور axis_id) من دليل منظمة الصحة — كل معيار يُوضع في محوره الصحيح حسب موضعه في الدليل */
  const syncStandardsFromGuide = useCallback(async () => {
    const [list, axesData] = await Promise.all([
      api.entities.Standard.list('code').catch(() => []),
      api.entities.Axis.list('order').catch(() => [])
    ]);
    if (list.length === 0) return;
    setSyncingStandards(true);
    try {
      let updated = 0;
      for (const standard of list) {
        const idx = getStandardIndexFromCode(standard.code);
        const item = STANDARDS_CSV[idx];
        if (!item) continue;
        const axisOrder = getAxisOrderFromStandardIndex(idx);
        const axisName = AXES_SEED[axisOrder - 1]?.name ?? standard.axis_name;
        const axisRecord = axesData.find((a) => Number(a.order) === axisOrder);
        const axisId = axisRecord?.id ?? standard.axis_id;
        const documents = item.documents ?? [];
        const kpisList = Array.isArray(item.kpis) ? [...item.kpis] : [{ name: 'مؤشر التحقق', target: 'أدلة متوفرة (+)', unit: 'تحقق', description: item.title ?? '' }];
        await updateStandardMutation.mutateAsync({
          id: standard.id,
          data: {
            title: item.title ?? standard.title,
            description: item.title ?? standard.description,
            required_evidence: buildRequiredEvidence(documents),
            required_documents: JSON.stringify(documents),
            kpis: JSON.stringify(kpisList),
            axis_name: axisName,
            axis_id: axisId,
          }
        });
        updated += 1;
      }
      await queryClient.invalidateQueries({ queryKey: ['standards'] });
      if (typeof window !== 'undefined' && updated > 0) {
        window.alert(`تم تحديث ${updated} معياراً من ملف المعايير (Healthy_Cities_Criteria.csv).`);
      }
    } finally {
      setSyncingStandards(false);
    }
  }, [updateStandardMutation, queryClient]);

  /** تحديث المعايير تلقائياً من ملف المعايير (مرة واحدة عند توفر البيانات لمن لديه صلاحية الإدارة) */
  const syncRanRef = useRef(false);
  useEffect(() => {
    if (!canManageStandards || syncingStandards || syncRanRef.current || standards.length === 0 || axes.length === 0) return;
    syncRanRef.current = true;
    syncStandardsFromGuide().catch(() => { syncRanRef.current = false; });
  }, [canManageStandards, standards.length, axes.length, syncingStandards, syncStandardsFromGuide]);

  const createEvidenceMutation = useMutation({
    mutationFn: (data) => api.entities.Evidence.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  const updateEvidenceMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Evidence.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  const currentMember = members.find(m => m.email === currentUser?.email);
  const canManage = canManageStandards;
  const canApprove = permissions.canApproveEvidence;

  if (!permissions.canSeeStandards) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة المعايير. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredStandards = standards.filter(s => {
    const matchesAxis = activeAxis === 'all' || s.axis_id === activeAxis;
    const matchesSearch = !searchQuery || 
      s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAxis && matchesSearch;
  });

  const getAxisProgress = (axisId) => {
    const axisStandards = standards.filter(s => s.axis_id === axisId);
    if (axisStandards.length === 0) return 0;
    const completed = axisStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
    return Math.round((completed / axisStandards.length) * 100);
  };

  const handleSaveAxis = async (e) => {
    e.preventDefault();
    await createAxisMutation.mutateAsync(axisForm);
    setAxisFormOpen(false);
    setAxisForm({ name: '', description: '', order: axes.length + 1 });
  };

  const handleSaveStandard = async (e) => {
    e.preventDefault();
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
    await updateEvidenceMutation.mutateAsync({
      id: evidenceItem.id,
      data: { status: 'rejected', rejection_reason: reason }
    });
  };

  const getStandardEvidence = (standardId) => evidence.filter(e => e.standard_id === standardId);

  const activeAxisEntity = activeAxis !== 'all' ? axes.find(a => a.id === activeAxis) : null;
  const pageTitle = activeAxisEntity
    ? ((activeAxisEntity.order >= 1 && activeAxisEntity.order <= AXIS_SHORT_NAMES.length)
        ? AXIS_SHORT_NAMES[activeAxisEntity.order - 1]
        : activeAxisEntity.name)
    : 'المعايير الدولية والأدلة';

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{pageTitle}</h1>
          <p className="text-blue-100">{activeAxisEntity ? `${standards.filter(s => s.axis_id === activeAxis).length} معيار` : '80 معياراً وفق منظمة الصحة العالمية'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* جدول النتيجة - مؤشرات الأداء لكل محور (الملحق الثاني) */}
        <Card className="mb-6 border-blue-100 bg-blue-50/50">
          <CardHeader
            className="cursor-pointer flex flex-row items-center justify-between"
            onClick={() => setShowResultTable(!showResultTable)}
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              جدول النتيجة — مؤشرات الأداء لكل محور (الملحق الثاني)
            </CardTitle>
            {showResultTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </CardHeader>
          {showResultTable && (
            <CardContent className="space-y-4 pt-0">
              <p className="text-sm text-gray-600">
                حسب دليل منظمة الصحة العالمية: كل معيار يُقيّم بأدلة متوفرة (+) أو أدلة غير متوفرة (-). للاعتراف بالمدينة كـ «مدينة صحية» يجب تحقيق 80% على الأقل من إجمالي المعايير.
              </p>
              <div className="rounded-lg border bg-white p-3">
                <h4 className="font-semibold mb-2">مؤشر التصنيف الإجمالي</h4>
                <p><span className="text-blue-600">{OVERALL_CLASSIFICATION_KPI.name}</span>: {OVERALL_CLASSIFICATION_KPI.target} ({OVERALL_CLASSIFICATION_KPI.unit})</p>
                <p className="text-xs text-gray-500 mt-1">{OVERALL_CLASSIFICATION_KPI.description}</p>
              </div>
              <Tabs defaultValue="axes" className="w-full">
                <TabsList>
                  <TabsTrigger value="axes">مؤشرات كل محور</TabsTrigger>
                </TabsList>
                <TabsContent value="axes" className="space-y-3 mt-3">
                  {AXIS_KPIS.map((axisKpi) => (
                    <div key={axisKpi.axis_order} className="rounded-lg border bg-white p-3">
                      <h4 className="font-semibold text-base mb-2">المحور {axisKpi.axis_order}: {axisKpi.axis_name}</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {axisKpi.kpis.map((k, i) => (
                          <li key={i}>
                            <span className="font-medium">{k.name}</span>
                            {' — الهدف: '}
                            <span className="text-green-700">{k.target}</span>
                            {k.unit && k.unit !== '-' && ` (${k.unit})`}
                            {k.description && <span className="text-gray-500 block mr-4 mt-0.5">{k.description}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          {canManage && (
            <>
              <Button onClick={() => setAxisFormOpen(true)} variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                إضافة محور
              </Button>
              <Button onClick={() => setStandardFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 ml-2" />
                إضافة معيار
              </Button>
            </>
          )}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="بحث في المعايير..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Axes Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            <Button
              variant={activeAxis === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveAxis('all')}
              className="whitespace-nowrap"
            >
              جميع المحاور ({standards.length})
            </Button>
            {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(axis => {
              const order = axis.order ?? 0;
              const tabLabel = (order >= 1 && order <= AXIS_SHORT_NAMES.length) ? AXIS_SHORT_NAMES[order - 1] : axis.name;
              const count = standards.filter(s => s.axis_id === axis.id).length;
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

        {/* Axis Progress Cards */}
        {activeAxis === 'all' && axes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(axis => {
              const order = axis.order ?? 0;
              const tabLabel = (order >= 1 && order <= AXIS_SHORT_NAMES.length) ? AXIS_SHORT_NAMES[order - 1] : axis.name;
              const progress = getAxisProgress(axis.id);
              const axisStandards = standards.filter(s => s.axis_id === axis.id);
              return (
                <Card key={axis.id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveAxis(axis.id)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{tabLabel}</h3>
                      <Badge variant="outline">{axisStandards.length} معيار</Badge>
                    </div>
                    <Progress value={progress} className="h-2 mb-1" />
                    <p className="text-sm text-gray-500">{progress}% مكتمل</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Standards List */}
        {loadingStandards ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : filteredStandards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد معايير</p>
              {canManage && (
                <Button variant="outline" className="mt-4" onClick={() => setStandardFormOpen(true)}>
                  إضافة معيار جديد
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredStandards.map(standard => {
              const standardEvidence = getStandardEvidence(standard.id);
              const approvedEvidence = standardEvidence.filter(e => e.status === 'approved').length;
              return (
                <Card key={standard.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="font-mono">{standard.code}</Badge>
                          <Badge className={statusConfig[standard.status]?.color}>
                            {statusConfig[standard.status]?.label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{standard.title}</h3>
                        {standard.description && (
                          <p className="text-sm text-gray-600 mt-1">{standard.description}</p>
                        )}
                        {standard.required_evidence && (
                          <p className="text-sm text-blue-600 mt-2">
                            <FileText className="w-4 h-4 inline ml-1" />
                            الأدلة المطلوبة: {standard.required_evidence}
                          </p>
                        )}
                        {(() => {
                          const docs = parseJsonArray(standard.required_documents);
                          const kpisList = parseJsonArray(standard.kpis);
                          return (
                            <div className="mt-3 space-y-2">
                              {docs.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">المستندات المطلوبة: </span>
                                  <ul className="list-disc list-inside text-gray-600 pr-2">
                                    {docs.map((d, i) => (
                                      <li key={i}>{typeof d === 'string' ? d : d?.name || '-'}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {kpisList.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700 flex items-center gap-1">
                                    <BarChart3 className="w-4 h-4" /> مؤشرات الأداء (KPI):
                                  </span>
                                  <ul className="mt-1 space-y-0.5 text-gray-600">
                                    {kpisList.map((k, i) => (
                                      <li key={i} className="flex flex-col gap-0.5">
                                        <span className="flex items-center gap-2 flex-wrap">
                                          <span>{typeof k === 'object' && k?.name ? k.name : String(k)}</span>
                                          {typeof k === 'object' && (k.target || k.unit) && (
                                            <Badge variant="outline" className="text-xs">
                                              الهدف: {k.target ?? '-'} {k.unit ? `(${k.unit})` : ''}
                                            </Badge>
                                          )}
                                        </span>
                                        {typeof k === 'object' && k?.description && (
                                          <span className="text-gray-500 text-xs block pr-2 border-r-2 border-gray-100">{k.description}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span>المحور: {standard.axis_name}</span>
                          <span>الأدلة: {approvedEvidence}/{standardEvidence.length}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditStandard(standard);
                              setEditDocuments(parseJsonArray(standard.required_documents));
                              setEditKpis(parseJsonArray(standard.kpis).map(k => typeof k === 'object' ? { name: k.name ?? '', target: k.target ?? '', unit: k.unit ?? '' } : { name: String(k), target: '', unit: '' }));
                              setEditStandardOpen(true);
                            }}
                          >
                            <Edit3 className="w-4 h-4 ml-2" />
                            تعديل المستندات والمؤشرات
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => { setSelectedStandard(standard); setEvidenceFormOpen(true); }}
                        >
                          <Upload className="w-4 h-4 ml-2" />
                          رفع دليل
                        </Button>
                      </div>
                    </div>

                    {/* Evidence List */}
                    {standardEvidence.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-3">الأدلة المرفوعة:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {standardEvidence.map(ev => (
                            <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              {ev.file_type === 'image' ? (
                                <Image className="w-8 h-8 text-blue-600" />
                              ) : (
                                <FileText className="w-8 h-8 text-green-600" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{ev.title}</p>
                                <div className="flex items-center gap-2">
                                  <Badge className={
                                    ev.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    ev.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }>
                                    {ev.status === 'approved' ? 'معتمد' : ev.status === 'rejected' ? 'مرفوض' : 'بانتظار'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <a href={ev.file_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button>
                                </a>
                                {canApprove && ev.status === 'pending' && (
                                  <>
                                    <Button size="icon" variant="ghost" className="text-green-600" onClick={() => handleApproveEvidence(ev)}>
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleRejectEvidence(ev, 'غير مطابق')}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Axis Form */}
      <Dialog open={axisFormOpen} onOpenChange={setAxisFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة محور جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveAxis} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اسم المحور *</Label>
              <Input value={axisForm.name} onChange={(e) => setAxisForm({ ...axisForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={axisForm.description} onChange={(e) => setAxisForm({ ...axisForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input type="number" value={axisForm.order} onChange={(e) => setAxisForm({ ...axisForm, order: parseInt(e.target.value) })} />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setAxisFormOpen(false)}>إلغاء</Button>
              <Button type="submit" className="bg-blue-600">حفظ</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standard Form */}
      <Dialog open={standardFormOpen} onOpenChange={setStandardFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة معيار جديد</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveStandard} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>رمز المعيار *</Label>
                <Input value={standardForm.code} onChange={(e) => setStandardForm({ ...standardForm, code: e.target.value })} placeholder="مثال: S01" required />
              </div>
              <div className="space-y-2">
                <Label>المحور *</Label>
                <Select value={standardForm.axis_id} onValueChange={(v) => setStandardForm({ ...standardForm, axis_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المحور" /></SelectTrigger>
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
              <Label>عنوان المعيار *</Label>
              <Input value={standardForm.title} onChange={(e) => setStandardForm({ ...standardForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={standardForm.description} onChange={(e) => setStandardForm({ ...standardForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الأدلة المطلوبة</Label>
              <Textarea value={standardForm.required_evidence} onChange={(e) => setStandardForm({ ...standardForm, required_evidence: e.target.value })} placeholder="مثال: صور، تقارير، وثائق رسمية" />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setStandardFormOpen(false)}>إلغاء</Button>
              <Button type="submit" className="bg-blue-600">حفظ</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Standard - المستندات المطلوبة ومؤشرات KPI */}
      <Dialog open={editStandardOpen} onOpenChange={setEditStandardOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المستندات المطلوبة ومؤشرات الأداء — {editStandard?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <Label className="font-medium">المستندات المطلوبة</Label>
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
                      placeholder="اسم المستند"
                    />
                    <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setEditDocuments(editDocuments.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEditDocuments([...editDocuments, ''])}>
                <Plus className="w-4 h-4 ml-2" /> إضافة مستند
              </Button>
            </div>
            <div>
              <Label className="font-medium">مؤشرات الأداء (KPI)</Label>
              <div className="mt-2 space-y-3">
                {editKpis.map((kpi, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <Input value={kpi.name} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], name: e.target.value }; setEditKpis(n); }} placeholder="اسم المؤشر" className="flex-1 min-w-[120px]" />
                    <Input value={kpi.target} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], target: e.target.value }; setEditKpis(n); }} placeholder="الهدف" className="w-24" />
                    <Input value={kpi.unit} onChange={(e) => { const n = [...editKpis]; n[i] = { ...n[i], unit: e.target.value }; setEditKpis(n); }} placeholder="الوحدة" className="w-20" />
                    <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setEditKpis(editKpis.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEditKpis([...editKpis, { name: '', target: '', unit: '' }])}>
                <Plus className="w-4 h-4 ml-2" /> إضافة مؤشر
              </Button>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setEditStandardOpen(false)}>إلغاء</Button>
              <Button
                className="bg-blue-600"
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
                حفظ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Form */}
      <Dialog open={evidenceFormOpen} onOpenChange={setEvidenceFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع دليل للمعيار {selectedStandard?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadEvidence} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>عنوان الدليل *</Label>
              <Input value={evidenceForm.title} onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={evidenceForm.description} onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>الملف *</Label>
              <Input type="file" onChange={(e) => setEvidenceForm({ ...evidenceForm, file: e.target.files[0] })} accept="image/*,.pdf,.doc,.docx" required />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setEvidenceFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={uploading} className="bg-blue-600">
                {uploading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                رفع الدليل
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}