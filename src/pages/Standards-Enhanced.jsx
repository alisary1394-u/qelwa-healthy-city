/**
 * تحديث صفحة المعايير لاستخدام المؤشرات المحسنة
 * إضافة المؤشرات المتقدمة والعرض المحسّن
 */

import React, { useState, useCallback, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AXES_SEED, AXIS_SHORT_NAMES, AXIS_COUNTS, getAxisOrderFromStandardIndex } from '@/api/seedAxesAndStandards';
import { STANDARDS_CSV, AXIS_KPIS_CSV as AXIS_KPIS, OVERALL_CLASSIFICATION_KPI, getStandardCodeFromIndex, sortAndDeduplicateStandardsByCode, normalizeStandardCode } from '@/api/standardsFromCsv';

// استيراد المؤشرات المحسنة
import { buildAdvancedKpisForStandard, buildRequiredDocumentsForStandard, buildVerificationMethodsForStandard } from '@/api/enhancedKpis';
import { ENHANCED_AXIS_KPIS, calculateAxisScore, generateAxisPerformanceReport } from '@/api/enhancedAxisKpis';
import { generateVerificationReport, verifyDocumentCompleteness } from '@/api/verificationGuide';
import { buildIntegratedStandardsData, generateIntegratedPerformanceReport } from '@/api/integratedKpis';

import { createAxesSelectFunction } from '@/lib/axesSort';
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
import { Plus, Search, Target, Upload, FileText, Image, Check, X, Eye, Loader2, Trash2, Edit3, BarChart3, ChevronDown, ChevronUp, TrendingUp, Users, Award, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

function parseJsonArray(str, fallback = []) {
  if (!str) return fallback;
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
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
          target: '',
          unit: '',
          description: '',
          category: 'عام',
          weight: 1,
        };
      }
      if (typeof k === 'object') {
        return {
          name: k.name ?? '',
          target: k.target ?? '',
          unit: k.unit ?? '',
          description: k.description ?? '',
          category: k.category ?? 'عام',
          weight: k.weight ?? 1,
          scale: k.scale,
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter((k) => k.name);
}

function parseJsonObject(str, fallback = {}) {
  if (!str) return fallback;
  try {
    const v = JSON.parse(str);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function formatDateSafe(value) {
	if (!value) return '—';
	const d = new Date(value);
	if (!Number.isFinite(d.getTime())) return '—';
	return d.toLocaleDateString('ar-SA');
}

const statusConfig = {
  not_started: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  approved: { label: 'معتمد', color: 'bg-purple-100 text-purple-700' }
};

/** إجمالي المعايير حسب مرجع المعايير (9 محاور، 80 معياراً) */
const REFERENCE_TOTAL_STANDARDS = STANDARDS_CSV.length;

function buildRequiredEvidence(documents) {
  const list = Array.isArray(documents) && documents.length ? documents : [];
  return list.length === 0 ? 'أدلة ومستندات تدعم تحقيق المعيار' : 'أدلة مطلوبة: ' + list.join('، ');
}

function getStandardIndexFromCode(code) {
	const match = String(code || '').trim().replace(/\s+/g, '').match(/م(\d+)-(\d+)/);
	if (!match) return -1;
	const axisNum = parseInt(match[1], 10);
	const i = parseInt(match[2], 10);
	if (axisNum < 1 || axisNum > AXIS_COUNTS.length || i < 1) return -1;
	const before = AXIS_COUNTS.slice(0, axisNum - 1).reduce((a, b) => a + b, 0);
	return Math.min(STANDARDS_CSV.length - 1, before + (i - 1));
}

function getAxisOrderFromStandardCode(code) {
	const match = String(code || '').trim().replace(/\s+/g, '').match(/م(\d+)-(\d+)/);
	if (!match) return null;
	const axisNum = parseInt(match[1], 10);
	return Number.isFinite(axisNum) ? axisNum : null;
}

// ===== مكونات المؤشرات المحسنة =====

function calculateKpiScore(kpi, value) {
  if (!value || value === 'غير متوفر') return 0;

  if (kpi.unit === '%') {
    const target = parseFloat(String(kpi.target).replace('%', ''));
    const actual = parseFloat(String(value).replace('%', ''));
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(actual)) return 0;
    return Math.min((actual / target) * 100, 100);
  }

  if (kpi.scale) {
    const targetIndex = kpi.scale.indexOf(kpi.target);
    const actualIndex = kpi.scale.indexOf(value);
    if (targetIndex <= 0 || actualIndex < 0) return 0;
    if (actualIndex >= targetIndex) return 100;
    return (actualIndex / targetIndex) * 100;
  }

  if (kpi.unit === 'شخص' || kpi.unit === 'جهة' || kpi.unit === 'مشروع') {
    const target = parseFloat(kpi.target);
    const actual = parseFloat(value);
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(actual)) return 0;
    return Math.min((actual / target) * 100, 100);
  }

  return String(value) === String(kpi.target) ? 100 : 50;
}

function KpiIndicator({ kpi, value, showProgress = true }) {
  const getScore = () => {
    return calculateKpiScore(kpi, value);
  };

  const score = getScore();
  const getStatusColor = () => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (score >= 90) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-blue-600" />;
    if (score >= 50) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <X className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{kpi.name}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {kpi.category}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">القيمة:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {value || 'غير متوفر'}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">الهدف:</span>
          <span className="font-medium">{kpi.target}</span>
        </div>
        
        {showProgress && (
          <div>
            <Progress value={score} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>الإنجاز: {Math.round(score)}%</span>
              <span>الوزن: {Math.round(kpi.weight * 100)}%</span>
            </div>
          </div>
        )}
        
        {kpi.description && (
          <p className="text-xs text-gray-500 mt-2">{kpi.description}</p>
        )}
      </div>
    </div>
  );
}

function StandardKpisCard({ standard, kpis, values = {} }) {
  const enhancedKpis = kpis.length > 0 ? kpis : buildAdvancedKpisForStandard(standard.title, standard.global_num, standard.axis_order);
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" />
          مؤشرات الأداء المحسنة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enhancedKpis.map((kpi, index) => (
            <KpiIndicator
              key={index}
              kpi={kpi}
              value={values[kpi.name]}
              showProgress={true}
            />
          ))}
        </div>
        
        {enhancedKpis.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد مؤشرات أداء محددة لهذا المعيار</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AxisPerformanceCard({ axis, standards }) {
  const axisKpis = ENHANCED_AXIS_KPIS.find(k => k.axis_order === axis.order)?.kpis || [];
  
  // حساب النتيجة الإجمالية للمحور
  const calculateAxisScore = () => {
    if (standards.length === 0) return 0;

		let totalScore = 0;
		let totalWeight = 0;

		standards.forEach((standard) => {
			const kpis = parseJsonArray(standard.kpis);
			const valuesMap = parseJsonObject(standard.kpi_values);
			kpis.forEach((kpi) => {
				if (!kpi || typeof kpi !== 'object') return;
				const weight = Number(kpi.weight) || 0;
				if (weight <= 0) return;
				const score = calculateKpiScore(kpi, valuesMap[kpi.name]);
				totalScore += score * weight;
				totalWeight += weight;
			});
		});

		return totalWeight > 0 ? totalScore / totalWeight : 0;
  };
  
  const score = calculateAxisScore();
  const completedStandards = standards.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const progress = standards.length > 0 ? (completedStandards / standards.length) * 100 : 0;
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold text-lg">{axis.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{axis.description}</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {standards.length} معيار
          </Badge>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">مستوى الإنجاز</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">نقاط الأداء</span>
              <span className={`font-medium ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {Math.round(score)}/100
              </span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{completedStandards} مكتمل</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>{standards.length - completedStandards} متبقي</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VerificationStatusCard({ standard, documents = [] }) {
  const verificationReport = generateVerificationReport(standard.code, documents, []);
  const documentStatus = verifyDocumentCompleteness(standard.code, documents);
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5" />
          حالة التحقق والمستندات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">اكتمال المستندات</span>
            <Badge variant={documentStatus.completeness >= 80 ? 'default' : 'secondary'}>
              {documentStatus.completeness}%
            </Badge>
          </div>
          
          <Progress value={documentStatus.completeness} className="h-2" />
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {documentStatus.status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : documentStatus.status === 'partial' ? (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              ) : (
                <X className="w-4 h-4 text-red-600" />
              )}
              <span>
                {documentStatus.completed} من {documentStatus.total} مستند مكتمل
              </span>
            </div>
            
            {documentStatus.missing.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">المستندات المفقودة:</p>
                <ul className="list-disc list-inside space-y-1">
                  {documentStatus.missing.slice(0, 3).map((doc, index) => (
                    <li key={index} className="text-xs">{doc.name}</li>
                  ))}
                  {documentStatus.missing.length > 3 && (
                    <li className="text-xs">و {documentStatus.missing.length - 3} مستندات أخرى...</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Standards() {
  const [activeAxis, setActiveAxis] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [axisFormOpen, setAxisFormOpen] = useState(false);
  const [standardFormOpen, setStandardFormOpen] = useState(false);
  const [evidenceFormOpen, setEvidenceFormOpen] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [editStandard, setEditStandard] = useState(null);
  const [editDocuments, setEditDocuments] = useState([]);
  const [editKpis, setEditKpis] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showKpis, setShowKpis] = useState({});
  const [showVerification, setShowVerification] = useState({});
  
  const [axisForm, setAxisForm] = useState({ name: '', description: '', order: 0 });
  const [standardForm, setStandardForm] = useState({ code: '', title: '', description: '', axis_id: '', required_evidence: '' });
  const [evidenceForm, setEvidenceForm] = useState({ title: '', description: '', file: null });

  const queryClient = useQueryClient();
  const { permissions, role, currentMember } = usePermissions();
  const canManage = permissions?.canManageStandards === true;
	const isGlobalInitiativeManager = role === 'governor' || role === 'coordinator' || permissions?.canManageInitiatives === true;
	const isCommitteeLeader = role === 'committee_head' || role === 'committee_coordinator' || role === 'committee_supervisor';
	const currentUser = null;
	const authMember = null;

	const [kpiValuesOpen, setKpiValuesOpen] = useState(false);
	const [kpiValuesStandard, setKpiValuesStandard] = useState(null);
	const [kpiValuesForm, setKpiValuesForm] = useState({});

	const [kpiFormOpen, setKpiFormOpen] = useState(false);
	const [kpiFormStandard, setKpiFormStandard] = useState(null);
	const [editingKpiIndex, setEditingKpiIndex] = useState(null);
	const [kpiFormData, setKpiFormData] = useState({ name: '', target: '', unit: '', description: '', category: 'عام', weight: 1, scale: undefined });

	const [kpiEvidenceOpen, setKpiEvidenceOpen] = useState(false);
	const [kpiEvidenceStandard, setKpiEvidenceStandard] = useState(null);
	const [kpiEvidenceKpiName, setKpiEvidenceKpiName] = useState('');
	const [kpiEvidenceForm, setKpiEvidenceForm] = useState({ title: '', description: '', files: [] });
	const [uploadingKpiEvidence, setUploadingKpiEvidence] = useState(false);

	const sameCommitteeForStandard = Boolean(
		kpiValuesStandard?.committee_id &&
		currentMember?.committee_id &&
		String(kpiValuesStandard.committee_id) === String(currentMember.committee_id)
	);
	const canEditStandardKpis = isGlobalInitiativeManager || (isCommitteeLeader && sameCommitteeForStandard);

  // Queries
  const { data: axes = [], isLoading: loadingAxes } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list()
  });

  const { data: standards = [], isLoading: loadingStandards } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => api.entities.Evidence.list()
  });

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				if (typeof api?.seedAxesAndStandardsIfNeeded === 'function') {
					await api.seedAxesAndStandardsIfNeeded();
					if (cancelled) return;
					queryClient.invalidateQueries({ queryKey: ['axes'] });
					queryClient.invalidateQueries({ queryKey: ['standards'] });
				}
			} catch (e) {
				// ignore
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [queryClient]);

  // Mutations
  const createAxisMutation = useMutation({
    mutationFn: (data) => api.entities.Axis.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['axes'] })
  });

  const createStandardMutation = useMutation({
    mutationFn: (data) => api.entities.Standard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standards'] });
      queryClient.invalidateQueries({ queryKey: ['axes'] });
    }
  });

  const updateStandardMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Standard.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['standards'] })
  });

	useEffect(() => {
		if (!canManage) return;
		if (!Array.isArray(axes) || axes.length === 0) return;
		if (!Array.isArray(standards) || standards.length === 0) return;
		const axisIds = new Set(axes.map((a) => String(a.id)));
		const broken = standards.filter((s) => s?.axis_id && !axisIds.has(String(s.axis_id)));
		if (broken.length === 0) return;

		let cancelled = false;
		(async () => {
			try {
				for (const s of broken) {
					if (cancelled) return;
					const idx = getStandardIndexFromCode(s.code);
					if (idx < 0) continue;
					const axisOrder = getAxisOrderFromStandardIndex(idx);
					const axis = axes.find((a) => Number(a.order) === Number(axisOrder));
					if (!axis?.id) continue;
					await updateStandardMutation.mutateAsync({
						id: s.id,
						data: {
							axis_id: axis.id,
							axis_name: axis.name,
						},
					});
				}
			} catch (e) {
				// ignore
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [axes, standards, canManage, updateStandardMutation]);

	const openKpiValuesDialog = (standard) => {
		const standardSameCommittee = Boolean(
			standard?.committee_id &&
			currentMember?.committee_id &&
			String(standard.committee_id) === String(currentMember.committee_id)
		);
		const allow = isGlobalInitiativeManager || (isCommitteeLeader && standardSameCommittee);
		if (!allow) return;
		if (!standard?.id) return;
		const kpis = parseJsonArray(standard.kpis);
		const saved = parseJsonObject(standard.kpi_values);
		const next = {};
		kpis.forEach((kpi) => {
			if (!kpi || typeof kpi !== 'object') return;
			next[kpi.name] = saved[kpi.name] ?? '';
		});
		setKpiValuesStandard(standard);
		setKpiValuesForm(next);
		setKpiValuesOpen(true);
	};

	const handleSaveKpiValues = async () => {
		if (!canEditStandardKpis) return;
		if (!kpiValuesStandard?.id) return;
		await updateStandardMutation.mutateAsync({
			id: kpiValuesStandard.id,
			data: {
				kpi_values: JSON.stringify(kpiValuesForm || {}),
			},
		});
		setKpiValuesOpen(false);
		setKpiValuesStandard(null);
		setKpiValuesForm({});
	};

	const openCreateKpiDialog = (standard) => {
		if (!standard?.id) return;
		setKpiFormStandard(standard);
		setEditingKpiIndex(null);
		setKpiFormData({ name: '', target: '', unit: '', description: '', category: 'عام', weight: 1, scale: undefined });
		setKpiFormOpen(true);
	};

	const openEditKpiDialog = (standard, kpis, index) => {
		if (!standard?.id) return;
		const kpi = kpis[index];
		if (!kpi) return;
		setKpiFormStandard(standard);
		setEditingKpiIndex(index);
		setKpiFormData({
			name: kpi.name || '',
			target: kpi.target || '',
			unit: kpi.unit || '',
			description: kpi.description || '',
			category: kpi.category || 'عام',
			weight: Number(kpi.weight) || 1,
			scale: kpi.scale,
		});
		setKpiFormOpen(true);
	};

	const handleSaveKpiDefinition = async (e) => {
		e?.preventDefault?.();
		if (!kpiFormStandard?.id) return;
		const standardSameCommittee = Boolean(
			kpiFormStandard?.committee_id &&
			currentMember?.committee_id &&
			String(kpiFormStandard.committee_id) === String(currentMember.committee_id)
		);
		const allow = isGlobalInitiativeManager || (isCommitteeLeader && standardSameCommittee);
		if (!allow) return;

		const existing = normalizeStandardKpis(parseJsonArray(kpiFormStandard.kpis));
		const next = [...existing];
		const item = {
			name: kpiFormData.name,
			target: kpiFormData.target,
			unit: kpiFormData.unit,
			description: kpiFormData.description,
			category: kpiFormData.category,
			weight: Number(kpiFormData.weight) || 1,
		};
		if (Array.isArray(kpiFormData.scale)) item.scale = kpiFormData.scale;

		if (editingKpiIndex != null) {
			next[editingKpiIndex] = item;
		} else {
			next.push(item);
		}

		await updateStandardMutation.mutateAsync({
			id: kpiFormStandard.id,
			data: {
				kpis: JSON.stringify(next),
			},
		});
		setKpiFormOpen(false);
		setKpiFormStandard(null);
		setEditingKpiIndex(null);
	};

	const handleDeleteKpi = async (standard, kpis, index) => {
		if (!standard?.id) return;
		const standardSameCommittee = Boolean(
			standard?.committee_id &&
			currentMember?.committee_id &&
			String(standard.committee_id) === String(currentMember.committee_id)
		);
		const allow = isGlobalInitiativeManager || (isCommitteeLeader && standardSameCommittee);
		if (!allow) return;
		const kpi = kpis[index];
		if (!kpi?.name) return;
		const ok = typeof window !== 'undefined' ? window.confirm('هل أنت متأكد من حذف المؤشر؟ سيتم حذف مرفقاته أيضاً.') : false;
		if (!ok) return;

		try {
			const attachments = getKpiEvidence(standard.id, kpi.name);
			for (const att of attachments) {
				if (att?.id) await deleteEvidenceMutation.mutateAsync(att.id);
			}
			const next = kpis.filter((_, i) => i !== index);
			await updateStandardMutation.mutateAsync({
				id: standard.id,
				data: { kpis: JSON.stringify(next) },
			});
			// تنظيف القيمة المسجلة لهذا المؤشر
			const valuesMap = parseJsonObject(standard.kpi_values);
			if (valuesMap && Object.prototype.hasOwnProperty.call(valuesMap, kpi.name)) {
				delete valuesMap[kpi.name];
				await updateStandardMutation.mutateAsync({
					id: standard.id,
					data: { kpi_values: JSON.stringify(valuesMap) },
				});
			}
		} catch (err) {
			if (typeof window !== 'undefined') window.alert(`فشل حذف المؤشر.\n${err?.message || err}`);
		}
	};

	const handleUpdateKpiValue = async (standard, kpiName, value) => {
		if (!standard?.id || !kpiName) return;
		const standardSameCommittee = Boolean(
			standard?.committee_id &&
			currentMember?.committee_id &&
			String(standard.committee_id) === String(currentMember.committee_id)
		);
		const allow = isGlobalInitiativeManager || (isCommitteeLeader && standardSameCommittee);
		if (!allow) return;
		const map = parseJsonObject(standard.kpi_values);
		map[kpiName] = value;
		await updateStandardMutation.mutateAsync({
			id: standard.id,
			data: { kpi_values: JSON.stringify(map) },
		});
	};

	const openKpiEvidenceDialog = (standard, kpiName) => {
		if (!standard?.id || !kpiName) return;
		const standardSameCommittee = Boolean(
			standard?.committee_id &&
			currentMember?.committee_id &&
			String(standard.committee_id) === String(currentMember.committee_id)
		);
		const allow = isGlobalInitiativeManager || (isCommitteeLeader && standardSameCommittee);
		if (!allow) return;
		setKpiEvidenceStandard(standard);
		setKpiEvidenceKpiName(kpiName);
		setKpiEvidenceForm({ title: '', description: '', files: [] });
		setKpiEvidenceOpen(true);
	};

	const handleUploadKpiEvidence = async (e) => {
		e.preventDefault();
		if (!kpiEvidenceStandard?.id || !kpiEvidenceKpiName) return;
		const standardSameCommittee = Boolean(
			kpiEvidenceStandard?.committee_id &&
			currentMember?.committee_id &&
			String(kpiEvidenceStandard.committee_id) === String(currentMember.committee_id)
		);
		const allow = isGlobalInitiativeManager || (isCommitteeLeader && standardSameCommittee);
		if (!allow) return;
		const files = Array.isArray(kpiEvidenceForm.files) ? kpiEvidenceForm.files : [];
		if (files.length === 0) return;
		setUploadingKpiEvidence(true);
		try {
			for (const file of files) {
				const { file_url } = await api.integrations.Core.UploadFile({ file });
				const fileType = file.type?.startsWith('image/') ? 'image' : 'document';
				await createEvidenceMutation.mutateAsync({
					title: kpiEvidenceForm.title || file.name,
					description: kpiEvidenceForm.description,
					file_url,
					file_type: fileType,
					standard_id: kpiEvidenceStandard.id,
					standard_code: kpiEvidenceStandard.code,
					axis_id: kpiEvidenceStandard.axis_id,
					uploaded_by_name: currentMember?.full_name,
					status: 'pending',
					kpi_type: 'standard',
					kpi_name: kpiEvidenceKpiName,
				});
			}
			setKpiEvidenceOpen(false);
			setKpiEvidenceStandard(null);
			setKpiEvidenceKpiName('');
			setKpiEvidenceForm({ title: '', description: '', files: [] });
		} catch (err) {
			if (typeof window !== 'undefined') window.alert(`فشل رفع المرفقات.\n${err?.message || err}`);
		} finally {
			setUploadingKpiEvidence(false);
		}
	};

  const createEvidenceMutation = useMutation({
    mutationFn: (data) => api.entities.Evidence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['standards'] });
    }
  });

  const updateEvidenceMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Evidence.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evidence'] })
  });

  const deleteEvidenceMutation = useMutation({
    mutationFn: (id) => api.entities.Evidence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['standards'] });
    }
  });

	const getStandardEvidence = (standardId) => evidence.filter(e => e.standard_id === standardId && e.kpi_type !== 'standard');
	const getKpiEvidence = (standardId, kpiName) => evidence.filter(e => e.standard_id === standardId && e.kpi_type === 'standard' && e.kpi_name === kpiName);

const getAxisProgress = (axisId) => {
	const axis = axes.find(a => a.id === axisId);
	const order = axis?.order ?? 0;
	const expectedCount = (order >= 1 && order <= AXIS_COUNTS.length) ? AXIS_COUNTS[order - 1] : 1;
	const completed = standards.filter((s) => {
		if (s.axis_id === axisId) return s.status === 'completed' || s.status === 'approved';
		const codeAxisOrder = getAxisOrderFromStandardCode(s.code);
		return codeAxisOrder != null && Number(codeAxisOrder) === Number(order) && (s.status === 'completed' || s.status === 'approved');
	}).length;
	return expectedCount > 0 ? Math.round((completed / expectedCount) * 100) : 0;
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
	if (editStandard?.id) {
		await updateStandardMutation.mutateAsync({
			id: editStandard.id,
			data: {
				code: standardForm.code,
				title: standardForm.title,
				description: standardForm.description,
				axis_id: standardForm.axis_id,
				axis_name: axis?.name || '',
				required_evidence: standardForm.required_evidence,
			},
		});
		setEditStandard(null);
	} else {
		await createStandardMutation.mutateAsync({
			...standardForm,
			axis_name: axis?.name || '',
			status: 'not_started'
		});
	}
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
		uploaded_by_name: currentMember?.full_name,
		status: 'pending'
	});

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
        approved_by: currentMember?.full_name,
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

  const handlePreviewFile = useCallback((fileUrl) => {
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


  const activeAxisEntity = activeAxis !== 'all' ? axes.find(a => a.id === activeAxis) : null;
  const pageTitle = activeAxisEntity
    ? ((activeAxisEntity.order >= 1 && activeAxisEntity.order <= AXIS_SHORT_NAMES.length)
        ? AXIS_SHORT_NAMES[activeAxisEntity.order - 1]
        : activeAxisEntity.name)
    : 'جميع المحاور';

  const filteredStandardsFn = useCallback(() => {
    let list = Array.isArray(standards) ? standards : [];

		if (activeAxis !== 'all') {
			const activeAxisOrder = axes.find((a) => a.id === activeAxis)?.order;
			list = list.filter((s) => {
				if (s?.axis_id === activeAxis) return true;
				if (!activeAxisOrder) return false;
				const codeAxisOrder = getAxisOrderFromStandardCode(s?.code);
				return codeAxisOrder != null && Number(codeAxisOrder) === Number(activeAxisOrder);
			});
		}

		if (String(searchQuery || '').trim()) {
			const query = String(searchQuery || '').toLowerCase();
			list = list.filter((s) => {
				const title = String(s?.title || '').toLowerCase();
				const desc = String(s?.description || '').toLowerCase();
				const code = String(s?.code || '').toLowerCase();
				return title.includes(query) || desc.includes(query) || code.includes(query);
			});
		}

		list = [...list].sort((a, b) => {
			const ma = String(a?.code || '').match(/^م(\d+)-(\d+)$/);
			const mb = String(b?.code || '').match(/^م(\d+)-(\d+)$/);
			const axA = ma ? parseInt(ma[1], 10) : 0;
			const nA = ma ? parseInt(ma[2], 10) : 0;
			const axB = mb ? parseInt(mb[1], 10) : 0;
			const nB = mb ? parseInt(mb[2], 10) : 0;
			if (axA !== axB) return axA - axB;
			return nA - nB;
		});

		return sortAndDeduplicateStandardsByCode(list);
  }, [standards, activeAxis, searchQuery, axes]);

  const filteredStandards = filteredStandardsFn();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">المعايير والمؤشرات</h1>
          <p className="text-gray-600 mt-1">{pageTitle}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في المعايير..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-64"
            />
          </div>
          {canManage && (
            <Button onClick={() => setStandardFormOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              معيار جديد
            </Button>
          )}
        </div>
      </div>

      {/* Axis Tabs */}
      <div>
        <div className="flex gap-2 pb-2">
          <Button
            variant={activeAxis === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveAxis('all')}
            className="whitespace-nowrap"
          >
            جميع المحاور ({REFERENCE_TOTAL_STANDARDS})
          </Button>
          {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(axis => {
            const order = axis.order ?? 0;
            const tabLabel = (order >= 1 && order <= AXIS_SHORT_NAMES.length) ? AXIS_SHORT_NAMES[order - 1] : axis.name;
            const count = (order >= 1 && order <= AXIS_COUNTS.length) ? AXIS_COUNTS[order - 1] : 0;
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

      {/* Enhanced Axis Progress Cards */}
      {activeAxis === 'all' && axes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {[...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(axis => {
						const axisStandards = standards.filter((s) => {
							if (s.axis_id === axis.id) return true;
							const codeAxisOrder = getAxisOrderFromStandardCode(s.code);
							return codeAxisOrder != null && Number(codeAxisOrder) === Number(axis.order);
						});
            return (
              <AxisPerformanceCard
                key={axis.id}
                axis={axis}
                standards={axisStandards}
              />
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
        <div className="space-y-6">
          {filteredStandards.map(standard => {
            const standardEvidence = getStandardEvidence(standard.id);
            const approvedEvidence = standardEvidence.filter(e => e.status === 'approved').length;
            const enhancedKpis = buildAdvancedKpisForStandard(standard.title, standard.global_num, standard.axis_order);
            const requiredDocuments = buildRequiredDocumentsForStandard(standard.title, standard.axis_order);
					const standardKpis = normalizeStandardKpis(parseJsonArray(standard.kpis));
					const valuesMap = parseJsonObject(standard.kpi_values);
					const standardSameCommittee = Boolean(
						standard?.committee_id &&
						currentMember?.committee_id &&
						String(standard.committee_id) === String(currentMember.committee_id)
					);
					const canEditThisStandardKpis = isGlobalInitiativeManager || (isCommitteeLeader && standardSameCommittee);
            
            return (
              <Card key={standard.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline" className="font-mono">{standard.code}</Badge>
                        <Badge className={statusConfig[standard.status]?.color}>
                          {statusConfig[standard.status]?.label}
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-xl mb-2">{standard.title}</h3>
                      {standard.description && (
                        <p className="text-gray-600 mb-4">{standard.description}</p>
                      )}
                      
                      {/* Enhanced KPIs Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            مؤشرات الأداء
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowKpis(prev => ({ ...prev, [standard.id]: !prev[standard.id] }))}
                          >
                            {showKpis[standard.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        {showKpis[standard.id] && (
                          <div className="space-y-3 mb-4">
								<div className="flex items-center justify-end gap-2">
									{canEditThisStandardKpis && (
										<Button size="sm" onClick={() => openCreateKpiDialog(standard)} className="bg-purple-600 hover:bg-purple-700">
											<Plus className="w-4 h-4 ml-2" />
											مؤشر جديد
										</Button>
									)}
								</div>

								{standardKpis.length === 0 ? (
									<div className="text-sm text-gray-500">لا توجد مؤشرات لهذا المعيار</div>
								) : (
									<div className="space-y-3">
										{standardKpis.map((kpi, idx) => {
											const currentValue = valuesMap[kpi.name] ?? '';
											const score = calculateKpiScore(kpi, currentValue || 'غير متوفر');
											const attachments = getKpiEvidence(standard.id, kpi.name);
											return (
												<Card key={`${standard.id}-${kpi.name}-${idx}`}> 
													<CardContent className="p-4">
														<div className="flex items-start justify-between gap-2">
															<div className="flex-1 min-w-0">
																<div className="font-semibold truncate">{kpi.name}</div>
																{kpi.description && <div className="text-sm text-gray-500">{kpi.description}</div>}
																<div className="text-xs text-gray-500 mt-1">الهدف: {kpi.target} {kpi.unit}</div>
															</div>
															<div className="flex items-center gap-2">
																<Badge variant="outline" className="text-xs">{Math.round(score)}%</Badge>
																{canEditThisStandardKpis && (
																	<Button size="icon" variant="ghost" onClick={() => openEditKpiDialog(standard, standardKpis, idx)} title="تعديل">
																		<Edit3 className="w-4 h-4" />
																	</Button>
																)}
																{canEditThisStandardKpis && (
																	<Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDeleteKpi(standard, standardKpis, idx)} title="حذف">
																		<Trash2 className="w-4 h-4" />
																	</Button>
																)}
															</div>
														</div>

														<div className="mt-3 space-y-2">
															<Input
																value={currentValue}
																disabled={!canEditThisStandardKpis}
																onChange={(e) => handleUpdateKpiValue(standard, kpi.name, e.target.value)}
																placeholder="القيمة الحالية"
															/>
															<Progress value={score} className="h-2" />
														</div>

														<div className="pt-3 mt-3 border-t">
															<div className="flex items-center justify-between">
																<div className="text-sm text-gray-700 flex items-center gap-2">
																	<Upload className="w-4 h-4" />
																	<span>مرفقات المؤشر</span>
																	<Badge variant="outline" className="text-xs">{attachments.length}</Badge>
																</div>
																<Button size="sm" variant="outline" disabled={!canEditThisStandardKpis} onClick={() => openKpiEvidenceDialog(standard, kpi.name)}>
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
																			<button
																				type="button"
																				onClick={() => handlePreviewFile(att.file_url)}
																				className="text-sm text-blue-700 hover:underline flex-1 min-w-0 truncate text-right"
																				title={att.title}
																			>
																				{att.title || 'مرفق'}
																			</button>
																			{canEditThisStandardKpis && (
																				<Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteEvidenceMutation.mutateAsync(att.id)}>
																					<Trash2 className="w-4 h-4" />
																				</Button>
																			)}
																		</div>
																	))}
																</div>
															)}
														</div>
													</CardContent>
												</Card>
											);
										})}
									</div>
								)}
							</div>
                        )}
                        
                        {!showKpis[standard.id] && (
                          <div className="flex flex-wrap gap-2">
								{standardKpis.slice(0, 3).map((kpi, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
									{kpi.name}: {kpi.target}
                              </Badge>
                            ))}
								{standardKpis.length > 3 && (
                              <Badge variant="outline" className="text-xs">
									+{standardKpis.length - 3} مؤشرات أخرى
								</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Required Documents Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            المستندات المطلوبة
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowVerification(prev => ({ ...prev, [standard.id]: !prev[standard.id] }))}
                          >
                            {showVerification[standard.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        {showVerification[standard.id] ? (
                          <div className="space-y-2 mb-4">
                            {requiredDocuments.slice(0, 5).map((doc, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                <FileText className="w-4 h-4" />
                                <span>{doc.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.type}
                                </Badge>
                              </div>
                            ))}
                            {requiredDocuments.length > 5 && (
                              <p className="text-sm text-gray-500">
                                و {requiredDocuments.length - 5} مستندات أخرى...
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {requiredDocuments.slice(0, 3).map((doc, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {doc.name}
                              </Badge>
                            ))}
                            {requiredDocuments.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{requiredDocuments.length - 3} مستندات
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500 border-t pt-4">
                        <span>المحور: {standard.axis_name}</span>
                        <span>الأدلة: {approvedEvidence}/{standardEvidence.length}</span>
                        <span>المؤشرات: {standardKpis.length}</span>
                        <span>المستندات: {requiredDocuments.length}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap lg:flex-col">
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditStandard(standard);
                            setEditDocuments(parseJsonArray(standard.required_documents));
                            setEditKpis(parseJsonArray(standard.kpis).map(k => typeof k === 'object' ? { name: k.name ?? '', target: k.target ?? '', unit: k.unit ?? '' } : { name: String(k), target: '', unit: '' }));
							setStandardForm({
								code: standard.code || '',
								title: standard.title || '',
								description: standard.description || '',
								axis_id: standard.axis_id || '',
								required_evidence: standard.required_evidence || '',
							});
							setStandardFormOpen(true);
                          }}
                        >
                          <Edit3 className="w-4 h-4 ml-2" />
                          تعديل
                        </Button>
                      )}

						{canEditThisStandardKpis && standardKpis.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => openKpiValuesDialog(standard)}
							>
								<BarChart3 className="w-4 h-4 ml-2" />
								تحديث قيم المؤشرات
							</Button>
						)}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStandard(standard);
                          setEvidenceFormOpen(true);
                        }}
                      >
                        <Upload className="w-4 h-4 ml-2" />
                        رفع دليل
                      </Button>
                    </div>
                  </div>
                  
                  {/* Evidence List */}
                  {standardEvidence.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3">الأدلة المرفوعة</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                        {standardEvidence.map((evidence) => (
                          <Card key={evidence.id} className="relative h-fit self-start">
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  {evidence.file_type === 'image' ? (
                                    <Image className="w-4 h-4 text-gray-500 shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                                  )}
                                  <h5 className="font-medium text-sm truncate">{evidence.title}</h5>
                                </div>
                                <Badge variant={evidence.status === 'approved' ? 'default' : evidence.status === 'rejected' ? 'destructive' : 'secondary'}>
                                  {evidence.status === 'approved' ? 'معتمد' : evidence.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                </Badge>
                              </div>
                              
                              {evidence.description && (
                                <p className="text-sm text-gray-600 mb-1">{evidence.description}</p>
                              )}
                              
                              <div className="flex justify-between items-center gap-2 mt-2 text-xs text-gray-500">
                                <span className="truncate">بواسطة: {evidence.uploaded_by_name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span>{formatDateSafe(evidence.created_at)}</span>
                                  {canManage && evidence.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="outline" onClick={() => handleApproveEvidence(evidence)}>
                                        <Check className="w-3 h-3 ml-1" />
                                        اعتماد
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleRejectEvidence(evidence, 'غير مطابق للمتطلبات')}>
                                        <X className="w-3 h-3 ml-1" />
                                        رفض
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
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

      {/* Dialogs */}
      {/* Axis Form Dialog */}
      <Dialog open={axisFormOpen} onOpenChange={setAxisFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة محور جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAxis} className="space-y-4">
            <div>
              <Label htmlFor="axis-name">اسم المحور</Label>
              <Input
                id="axis-name"
                value={axisForm.name}
                onChange={(e) => setAxisForm({ ...axisForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="axis-description">وصف المحور</Label>
              <Textarea
                id="axis-description"
                value={axisForm.description}
                onChange={(e) => setAxisForm({ ...axisForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="axis-order">الترتيب</Label>
              <Input
                id="axis-order"
                type="number"
                value={axisForm.order}
                onChange={(e) => setAxisForm({ ...axisForm, order: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAxisFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">
                إضافة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Standard Form Dialog */}
      <Dialog
			open={standardFormOpen}
			onOpenChange={(open) => {
				setStandardFormOpen(open);
				if (!open) {
					setEditStandard(null);
					setStandardForm({ code: '', title: '', description: '', axis_id: '', required_evidence: '' });
				}
			}}
		>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editStandard?.id ? 'تعديل المعيار' : 'إضافة معيار جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStandard} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="standard-code">رمز المعيار</Label>
                <Input
                  id="standard-code"
                  value={standardForm.code}
                  onChange={(e) => setStandardForm({ ...standardForm, code: e.target.value })}
                  placeholder="م1-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="standard-axis">المحور</Label>
                <Select value={standardForm.axis_id} onValueChange={(value) => setStandardForm({ ...standardForm, axis_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحور" />
                  </SelectTrigger>
                  <SelectContent>
                    {axes.map(axis => (
                      <SelectItem key={axis.id} value={axis.id}>
                        {axis.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="standard-title">عنوان المعيار</Label>
              <Input
                id="standard-title"
                value={standardForm.title}
                onChange={(e) => setStandardForm({ ...standardForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="standard-description">وصف المعيار</Label>
              <Textarea
                id="standard-description"
                value={standardForm.description}
                onChange={(e) => setStandardForm({ ...standardForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="standard-evidence">الأدلة المطلوبة</Label>
              <Textarea
                id="standard-evidence"
                value={standardForm.required_evidence}
                onChange={(e) => setStandardForm({ ...standardForm, required_evidence: e.target.value })}
                rows={2}
                placeholder="صف الأدلة والمستندات المطلوبة لتحقيق هذا المعيار"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStandardFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit">
					{editStandard?.id ? 'حفظ' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Dialog */}
      <Dialog open={evidenceFormOpen} onOpenChange={setEvidenceFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع دليل للمعيار: {selectedStandard?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadEvidence} className="space-y-4">
            <div>
              <Label htmlFor="evidence-title">عنوان الدليل</Label>
              <Input
                id="evidence-title"
                value={evidenceForm.title}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="evidence-description">وصف الدليل</Label>
              <Textarea
                id="evidence-description"
                value={evidenceForm.description}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="evidence-file">الملف</Label>
              <Input
                id="evidence-file"
                type="file"
                onChange={(e) => setEvidenceForm({ ...evidenceForm, file: e.target.files[0] })}
                required
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEvidenceFormOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    رفع
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

		{/* KPI Values Dialog */}
		<Dialog open={kpiValuesOpen} onOpenChange={setKpiValuesOpen}>
			<DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						تحديث قيم مؤشرات الأداء — {kpiValuesStandard?.code || ''}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 mt-4">
					{parseJsonArray(kpiValuesStandard?.kpis).length === 0 ? (
						<div className="text-sm text-gray-600">لا توجد مؤشرات مسجلة لهذا المعيار.</div>
					) : (
						<div className="space-y-3">
							{parseJsonArray(kpiValuesStandard?.kpis).map((kpi, idx) => (
								<div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center p-2 bg-gray-50 rounded-lg">
									<div className="md:col-span-2">
										<div className="text-sm font-medium">{kpi?.name || ''}</div>
										<div className="text-xs text-gray-600">الهدف: {kpi?.target || ''}</div>
									</div>
									<Input
										value={kpiValuesForm?.[kpi?.name] ?? ''}
										onChange={(e) => setKpiValuesForm((prev) => ({ ...prev, [kpi?.name]: e.target.value }))}
										placeholder="القيمة الحالية"
									/>
								</div>
							))}
						</div>
					)}
					<div className="flex gap-3 justify-end pt-4 border-t">
						<Button type="button" variant="outline" onClick={() => setKpiValuesOpen(false)}>إلغاء</Button>
						<Button type="button" className="bg-blue-600" onClick={handleSaveKpiValues}>حفظ</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>

		{/* KPI Definition Dialog */}
		<Dialog open={kpiFormOpen} onOpenChange={setKpiFormOpen}>
			<DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{editingKpiIndex != null ? 'تعديل مؤشر' : 'مؤشر جديد'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSaveKpiDefinition} className="space-y-4 mt-4">
					<div className="space-y-2">
						<Label>اسم المؤشر *</Label>
						<Input value={kpiFormData.name} onChange={(e) => setKpiFormData((p) => ({ ...p, name: e.target.value }))} required />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>الهدف</Label>
							<Input value={kpiFormData.target} onChange={(e) => setKpiFormData((p) => ({ ...p, target: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>الوحدة</Label>
							<Input value={kpiFormData.unit} onChange={(e) => setKpiFormData((p) => ({ ...p, unit: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>التصنيف</Label>
							<Input value={kpiFormData.category} onChange={(e) => setKpiFormData((p) => ({ ...p, category: e.target.value }))} />
						</div>
						<div className="space-y-2">
							<Label>الوزن</Label>
							<Input type="number" value={kpiFormData.weight} onChange={(e) => setKpiFormData((p) => ({ ...p, weight: parseFloat(e.target.value) || 1 }))} />
						</div>
					</div>
					<div className="space-y-2">
						<Label>الوصف</Label>
						<Textarea value={kpiFormData.description} onChange={(e) => setKpiFormData((p) => ({ ...p, description: e.target.value }))} rows={2} />
					</div>
					<div className="flex gap-3 justify-end pt-4 border-t">
						<Button type="button" variant="outline" onClick={() => setKpiFormOpen(false)}>إلغاء</Button>
						<Button type="submit" className="bg-purple-600 hover:bg-purple-700">حفظ</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>

		{/* KPI Evidence Upload Dialog */}
		<Dialog open={kpiEvidenceOpen} onOpenChange={setKpiEvidenceOpen}>
			<DialogContent dir="rtl">
				<DialogHeader>
					<DialogTitle>رفع مرفقات للمؤشر: {kpiEvidenceKpiName || ''}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleUploadKpiEvidence} className="space-y-4 mt-4">
					<div className="space-y-2">
						<Label>عنوان المرفق (اختياري)</Label>
						<Input value={kpiEvidenceForm.title} onChange={(e) => setKpiEvidenceForm((p) => ({ ...p, title: e.target.value }))} />
					</div>
					<div className="space-y-2">
						<Label>وصف (اختياري)</Label>
						<Textarea value={kpiEvidenceForm.description} onChange={(e) => setKpiEvidenceForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
					</div>
					<div className="space-y-2">
						<Label>اختر ملفات (يمكن أكثر من ملف)</Label>
						<Input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => setKpiEvidenceForm((p) => ({ ...p, files: Array.from(e.target.files || []) }))} required />
					</div>
					<div className="flex gap-3 justify-end pt-4 border-t">
						<Button type="button" variant="outline" onClick={() => setKpiEvidenceOpen(false)}>إلغاء</Button>
						<Button type="submit" disabled={uploadingKpiEvidence} className="bg-purple-600 hover:bg-purple-700">
							{uploadingKpiEvidence && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
							رفع
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
    </div>
  );
}
