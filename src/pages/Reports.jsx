import React, { useState, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { FileText, Download, TrendingUp, CheckCircle, Clock, AlertCircle, Award, Target, Users, Lightbulb, BarChart3, ClipboardList, Shield, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import WHOStandardsReport from '@/components/reports/WHOStandardsReport';
import { AXIS_COUNTS_CSV, STANDARDS_CSV, sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';

const REFERENCE_TOTAL = STANDARDS_CSV.length;

const STATUS_COLORS = {
  not_started: '#94a3b8', pending: '#94a3b8',
  in_progress: '#f59e0b', planning: '#94a3b8',
  completed: '#10b981', approved: '#059669',
  on_hold: '#6b7280', cancelled: '#ef4444',
};

const AXIS_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F97316'];

function StatCard({ icon: Icon, label, value, sub, color = 'blue', className = '' }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    gray: 'from-gray-500 to-gray-600',
    teal: 'from-teal-500 to-teal-600',
  };
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${colors[color] || colors.blue} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{label}</p>
              <p className="text-3xl font-bold mt-1">{value}</p>
              {sub && <p className="text-xs opacity-80 mt-1">{sub}</p>}
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        {Icon && <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Icon className="w-5 h-5" /></div>}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function ProgressRing({ value, size = 120, strokeWidth = 10, color = '#3B82F6', label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-gray-900">{value}%</span>
      </div>
      {label && <p className="text-xs text-gray-500 text-center">{label}</p>}
    </div>
  );
}

function AxisProgressCard({ name, order, completed, total, color }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
        {order}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs text-gray-500 whitespace-nowrap">{completed}/{total}</span>
        </div>
      </div>
      <Badge variant={pct >= 80 ? 'default' : pct > 0 ? 'secondary' : 'outline'} className="text-xs">{pct}%</Badge>
    </div>
  );
}

export default function Reports() {
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const [selectedCommittee, setSelectedCommittee] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [detailedReportType, setDetailedReportType] = useState('tasks_all');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [expandedAxis, setExpandedAxis] = useState(null);

  const { data: initiatives = [] } = useQuery({ queryKey: ['initiatives'], queryFn: () => api.entities.Initiative.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => api.entities.Task.list() });
  const { data: committees = [] } = useQuery({ queryKey: ['committees'], queryFn: () => api.entities.Committee.list() });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => api.entities.TeamMember.list() });
  const { data: kpis = [] } = useQuery({ queryKey: ['kpis'], queryFn: () => api.entities.InitiativeKPI.list() });
  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => api.entities.Standard.list() });
  const { data: axes = [] } = useQuery({ queryKey: ['axes'], queryFn: () => api.entities.Axis.list('order') });
  const { data: evidence = [] } = useQuery({ queryKey: ['evidence'], queryFn: () => api.entities.Evidence.list() });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => api.entities.Settings.list() });

  if (!permissions.canSeeReports) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md"><CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 mx-auto text-red-400 mb-3" />
          <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة التقارير.</p>
        </CardContent></Card>
      </div>
    );
  }

  const filteredInitiatives = selectedCommittee === 'all' ? initiatives : initiatives.filter(i => i.committee_id === selectedCommittee);
  const filteredTasks = selectedCommittee === 'all' ? tasks : tasks.filter(t => {
    const member = members.find(m => m.id === t.assigned_to);
    return member?.committee_id === selectedCommittee;
  });

  const dedupedStandards = useMemo(() => sortAndDeduplicateStandardsByCode(standards), [standards]);

  const overallStandardsPct = useMemo(() => {
    const completed = dedupedStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
    return REFERENCE_TOTAL > 0 ? Math.round((completed / REFERENCE_TOTAL) * 100) : 0;
  }, [dedupedStandards]);

  const axisSummary = useMemo(() => axes.map((axis, idx) => {
    const order = axis.order ?? idx + 1;
    const expected = (order >= 1 && order <= AXIS_COUNTS_CSV.length) ? AXIS_COUNTS_CSV[order - 1] : 0;
    const axStd = standards.filter(s => s.axis_id === axis.id);
    const completed = axStd.filter(s => s.status === 'completed' || s.status === 'approved').length;
    return { id: axis.id, name: axis.name, order, total: expected, completed, color: AXIS_COLORS[idx % AXIS_COLORS.length] };
  }), [axes, standards]);

  const statusLabels = { not_started: 'لم يبدأ', in_progress: 'قيد التنفيذ', completed: 'مكتمل', approved: 'معتمد', pending: 'معلقة', planning: 'تخطيط', on_hold: 'معلق', cancelled: 'ملغي' };
  const priorityLabels = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };

  const standardsByStatus = [
    { name: 'لم يبدأ', value: standards.filter(s => s.status === 'not_started').length, color: STATUS_COLORS.not_started },
    { name: 'قيد التنفيذ', value: standards.filter(s => s.status === 'in_progress').length, color: STATUS_COLORS.in_progress },
    { name: 'مكتمل', value: standards.filter(s => s.status === 'completed').length, color: STATUS_COLORS.completed },
    { name: 'معتمد', value: standards.filter(s => s.status === 'approved').length, color: STATUS_COLORS.approved },
  ];

  const initiativesByStatus = [
    { name: 'التخطيط', value: filteredInitiatives.filter(i => i.status === 'planning').length, color: '#94a3b8' },
    { name: 'معتمد', value: filteredInitiatives.filter(i => i.status === 'approved').length, color: '#3b82f6' },
    { name: 'قيد التنفيذ', value: filteredInitiatives.filter(i => i.status === 'in_progress').length, color: '#f59e0b' },
    { name: 'مكتمل', value: filteredInitiatives.filter(i => i.status === 'completed').length, color: '#10b981' },
    { name: 'معلق', value: filteredInitiatives.filter(i => i.status === 'on_hold').length, color: '#6b7280' },
    { name: 'ملغي', value: filteredInitiatives.filter(i => i.status === 'cancelled').length, color: '#ef4444' },
  ];

  const initiativesByCommittee = committees
    .map(c => ({
      name: c.name?.slice(0, 20) || 'غير محدد',
      count: filteredInitiatives.filter(i => i.committee_id === c.id).length,
    }))
    .filter(item => item.count > 0);

  const initiativesByPriority = [
    { name: 'منخفضة', count: filteredInitiatives.filter(i => i.priority === 'low').length, color: '#94a3b8' },
    { name: 'متوسطة', count: filteredInitiatives.filter(i => i.priority === 'medium').length, color: '#3b82f6' },
    { name: 'عالية', count: filteredInitiatives.filter(i => i.priority === 'high').length, color: '#f59e0b' },
    { name: 'عاجلة', count: filteredInitiatives.filter(i => i.priority === 'urgent').length, color: '#ef4444' },
  ];

  const tasksByStatus = [
    { name: 'معلقة', value: filteredTasks.filter(t => t.status === 'pending').length, color: '#94a3b8' },
    { name: 'قيد التنفيذ', value: filteredTasks.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
    { name: 'مكتملة', value: filteredTasks.filter(t => t.status === 'completed').length, color: '#10b981' },
    { name: 'ملغاة', value: filteredTasks.filter(t => t.status === 'cancelled').length, color: '#ef4444' },
  ];

  const tasksByMember = members.slice(0, 10).map(m => ({
    name: m.full_name?.slice(0, 15) || 'غير محدد',
    completed: tasks.filter(t => t.assigned_to === m.id && t.status === 'completed').length,
    pending: tasks.filter(t => t.assigned_to === m.id && t.status === 'pending').length,
    inProgress: tasks.filter(t => t.assigned_to === m.id && t.status === 'in_progress').length,
  }));

  const overdueTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');

  const getTaskCommitteeName = (t) => { const m = members.find(m2 => m2.id === t.assigned_to); return committees.find(c => c.id === m?.committee_id)?.name || ''; };
  const getTaskInitiativeTitle = (t) => initiatives.find(i => i.id === t.initiative_id)?.title || '';
  const getMemberCommitteeName = (m) => committees.find(c => c.id === m.committee_id)?.name || '';
  const getKpiInitiativeTitle = (k) => initiatives.find(i => i.id === k.initiative_id)?.title || '';

  const detailedReportConfig = [
    { value: 'tasks_all', label: 'المهام (كافة)', getData: () => filteredTasks.map(t => ({ 'العنوان': t.title, 'الحالة': statusLabels[t.status] || t.status, 'الأولوية': priorityLabels[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '—', 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t), 'المبادرة': getTaskInitiativeTitle(t) })) },
    { value: 'tasks_completed', label: 'المهام المنجزة', getData: () => filteredTasks.filter(t => t.status === 'completed').map(t => ({ 'العنوان': t.title, 'الأولوية': priorityLabels[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '—', 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t) })) },
    { value: 'tasks_overdue', label: 'المهام المتأخرة', getData: () => overdueTasks.map(t => ({ 'العنوان': t.title, 'الحالة': statusLabels[t.status] || t.status, 'تاريخ الاستحقاق': t.due_date, 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t) })) },
    { value: 'initiatives_all', label: 'المبادرات (كافة)', getData: () => filteredInitiatives.map(i => ({ 'العنوان': i.title, 'اللجنة': i.committee_name || '—', 'الحالة': statusLabels[i.status] || i.status, 'نسبة الإنجاز %': i.progress_percentage ?? '—', 'تاريخ البدء': i.start_date || '—', 'تاريخ الانتهاء': i.end_date || '—' })) },
    { value: 'team', label: 'أعضاء الفريق', getData: () => members.map(m => ({ 'الاسم': m.full_name || '—', 'المنصب': m.role || '—', 'اللجنة': getMemberCommitteeName(m), 'القسم/الجهة': m.department || '—', 'البريد': m.email || '—', 'الهاتف': m.phone || '—' })) },
    { value: 'standards', label: 'المعايير', getData: () => dedupedStandards.map(s => ({ 'الرمز': s.code || '—', 'العنوان': s.title || '—', 'المحور': s.axis_name || '—', 'الحالة': statusLabels[s.status] || s.status })) },
    { value: 'kpis', label: 'المؤشرات', getData: () => kpis.map(k => ({ 'المؤشر': k.kpi_name || '—', 'المبادرة': getKpiInitiativeTitle(k), 'القيمة الحالية': k.current_value, 'المستهدف': k.target_value, 'الوحدة': k.unit || '—', 'نسبة الإنجاز %': k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0 })) },
  ];

  const currentDetailedData = (() => { const c = detailedReportConfig.find(c2 => c2.value === detailedReportType); return c ? c.getData() : []; })();
  const detailedReportFilename = (() => { const c = detailedReportConfig.find(c2 => c2.value === detailedReportType); return c ? c.label.replace(/\s*[(\（].*?[)\）]\s*/g, '').trim() : 'تقرير'; })();

  const exportToCSV = (data, filename) => {
    try {
      if (!Array.isArray(data) || data.length === 0) { toast({ title: 'لا توجد بيانات للتصدير' }); return; }
      const headers = Object.keys(data[0]);
      const esc = (v) => { const s = String(v ?? ''); return /[,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const csv = '\ufeff' + [headers.map(esc).join(','), ...data.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 200);
      toast({ title: 'تم التصدير', description: `${filename}.csv` });
    } catch (e) { toast({ title: 'فشل التصدير', description: e?.message, variant: 'destructive' }); }
  };

  const tabExportIds = {
    overview: { id: 'reports-overview', filename: 'تقرير-النظرة-العامة.pdf' },
    standards: { id: 'reports-standards', filename: 'تقرير-المعايير.pdf' },
    initiatives: { id: 'reports-initiatives', filename: 'تقرير-المبادرات.pdf' },
    tasks: { id: 'reports-tasks', filename: 'تقرير-المهام.pdf' },
    detailed: { id: 'detailed-report-content', filename: `تقرير-تفصيلي-${detailedReportFilename}.pdf` },
  };

  const exportToPDF = async (elementId, filename) => {
    setExportingPDF(true);
    let restore = [];
    try {
      const element = document.getElementById(elementId);
      if (!element) { toast({ title: 'فشل التصدير', description: 'العنصر غير موجود.', variant: 'destructive' }); return; }
      let el = element;
      while (el && el !== document.body) {
        restore.push({ el, display: el.style.display, visibility: el.style.visibility, hidden: el.getAttribute('hidden') });
        el.style.display = 'block'; el.style.visibility = 'visible';
        if (el.getAttribute('hidden') != null) el.removeAttribute('hidden');
        el = el.parentElement;
      }
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(r => setTimeout(r, 150));
      const cw = Math.max(element.scrollWidth || 800, 800), ch = Math.max(element.scrollHeight || 600, 600);
      const px = cw * ch, sc = px > 14e6 ? 1 : px > 8e6 ? 1.35 : 2;
      const canvas = await html2canvas(element, {
        scale: sc, useCORS: true, logging: false, windowWidth: cw, windowHeight: ch,
        onclone: (doc, node) => {
          node.querySelectorAll('.recharts-responsive-container').forEach(e => {
            const p = doc.createElement('div');
            p.style.cssText = 'min-height:120px;padding:20px;background:#f1f5f9;color:#64748b;text-align:center;border-radius:8px;display:flex;align-items:center;justify-content:center;';
            p.textContent = 'رسم بياني (مستثنى من التصدير)';
            if (e.parentNode) e.parentNode.replaceChild(p, e);
          });
          node.querySelectorAll('[class*="gradient"]').forEach(e => { e.style.background = '#2563eb'; e.style.backgroundImage = 'none'; });
        },
      });
      if (!canvas.width || !canvas.height) { toast({ title: 'فشل', description: 'المحتوى فارغ', variant: 'destructive' }); return; }
      let imgSrc; let imgType = 'JPEG';
      try { const j = canvas.toDataURL('image/jpeg', 0.86); if (j?.startsWith('data:image/')) imgSrc = j; } catch {}
      if (!imgSrc) { try { const p = canvas.toDataURL('image/png'); if (p?.startsWith('data:image/')) { imgSrc = p; imgType = 'PNG'; } } catch {} }
      if (!imgSrc) { imgSrc = canvas; imgType = 'PNG'; }
      const pdf = new jsPDF('p', 'mm', 'a4');
      const iw = 210, ph = 295, ih = (canvas.height * iw) / canvas.width;
      let hl = ih, pos = 0;
      pdf.addImage(imgSrc, imgType, 0, pos, iw, ih); hl -= ph;
      while (hl >= 0) { pos = hl - ih; pdf.addPage(); pdf.addImage(imgSrc, imgType, 0, pos, iw, ih); hl -= ph; }
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 200);
      toast({ title: 'تم التصدير', description: filename });
    } catch (e) { toast({ title: 'فشل', description: e?.message, variant: 'destructive' }); }
    finally {
      restore.forEach(({ el: e, display, visibility, hidden }) => { e.style.display = display; e.style.visibility = visibility; if (hidden != null) e.setAttribute('hidden', hidden); });
      setExportingPDF(false);
    }
  };

  const completedTasksPct = filteredTasks.length > 0 ? Math.round((filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100) : 0;
  const completedInitPct = filteredInitiatives.length > 0 ? Math.round((filteredInitiatives.filter(i => i.status === 'completed').length / filteredInitiatives.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">التقارير والتحليلات</h1>
                <p className="text-blue-100 text-sm mt-1">مدينة {settings[0]?.city_name || 'قلوة'} الصحية — تحليل شامل للأداء</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                <SelectTrigger className="w-[180px] bg-white/15 border-white/30 text-white">
                  <SelectValue placeholder="جميع اللجان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع اللجان</SelectItem>
                  {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => { const t = tabExportIds[activeTab]; if (t) exportToPDF(t.id, t.filename); }} disabled={exportingPDF} variant="secondary" size="sm">
                <Download className="w-4 h-4 ml-1" />
                {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1 mb-6 bg-white shadow-sm rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg">نظرة عامة</TabsTrigger>
            <TabsTrigger value="standards" className="rounded-lg">المعايير</TabsTrigger>
            <TabsTrigger value="initiatives" className="rounded-lg">المبادرات</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg">المهام</TabsTrigger>
            <TabsTrigger value="detailed" className="rounded-lg">تقارير تفصيلية</TabsTrigger>
          </TabsList>

          {/* ==================== OVERVIEW ==================== */}
          <TabsContent value="overview">
            <div id="reports-overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Target} label="المعايير الدولية" value={REFERENCE_TOTAL} sub={`${overallStandardsPct}% مكتمل`} color="blue" />
                <StatCard icon={Lightbulb} label="المبادرات" value={filteredInitiatives.length} sub={`${filteredInitiatives.filter(i => i.status === 'completed').length} مكتملة`} color="purple" />
                <StatCard icon={ClipboardList} label="المهام" value={filteredTasks.length} sub={`${filteredTasks.filter(t => t.status === 'completed').length} مكتملة`} color="green" />
                <StatCard icon={Users} label="الفريق" value={members.filter(m => m.status === 'active').length} sub={`${committees.length} لجنة`} color="teal" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress Rings */}
                <Card className="col-span-1">
                  <CardHeader><CardTitle className="text-lg">نسب الإنجاز</CardTitle></CardHeader>
                  <CardContent className="flex justify-around items-center py-6">
                    <div className="relative"><ProgressRing value={overallStandardsPct} color="#3B82F6" /><p className="text-xs text-center text-gray-500 mt-2">المعايير</p></div>
                    <div className="relative"><ProgressRing value={completedInitPct} color="#8B5CF6" /><p className="text-xs text-center text-gray-500 mt-2">المبادرات</p></div>
                    <div className="relative"><ProgressRing value={completedTasksPct} color="#10B981" /><p className="text-xs text-center text-gray-500 mt-2">المهام</p></div>
                  </CardContent>
                </Card>

                {/* Initiatives by Status */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">المبادرات حسب الحالة</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={initiativesByStatus.filter(i => i.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {initiativesByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tasks by Status */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">المهام حسب الحالة</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={tasksByStatus.filter(t => t.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {tasksByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Tasks Alert */}
              {overdueTasks.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-red-700 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> مهام متأخرة ({overdueTasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {overdueTasks.slice(0, 5).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-red-100">
                          <span className="text-sm font-medium truncate flex-1">{t.title}</span>
                          <Badge variant="destructive" className="text-xs mr-2">{t.due_date}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ==================== STANDARDS ==================== */}
          <TabsContent value="standards">
            <div id="reports-standards" className="space-y-6">
              <SectionHeader icon={Target} title="تقرير المعايير الدولية" description={`${REFERENCE_TOTAL} معيار — 9 محاور`}>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(dedupedStandards.map(s => ({ 'الرمز': s.code, 'العنوان': s.title, 'المحور': s.axis_name, 'الحالة': statusLabels[s.status] || s.status })), 'المعايير')}>
                  <Download className="w-4 h-4 ml-1" /> CSV
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => exportToPDF('who-report', 'تقرير-معايير-WHO.pdf')} disabled={exportingPDF}>
                  <Award className="w-4 h-4 ml-1" /> تقرير WHO
                </Button>
              </SectionHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Target} label="إجمالي المعايير" value={REFERENCE_TOTAL} color="blue" />
                <StatCard icon={CheckCircle} label="مكتمل + معتمد" value={standards.filter(s => s.status === 'completed' || s.status === 'approved').length} color="green" />
                <StatCard icon={Clock} label="قيد التنفيذ" value={standards.filter(s => s.status === 'in_progress').length} color="amber" />
                <StatCard icon={TrendingUp} label="نسبة الإنجاز" value={`${overallStandardsPct}%`} color="purple" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">توزيع المعايير حسب الحالة</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={standardsByStatus.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {standardsByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">الإنجاز حسب المحاور</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={axisSummary} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="completed" fill="#10b981" name="مكتمل" radius={[0, 4, 4, 0]}>
                          {axisSummary.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Axis Progress List */}
              <Card>
                <CardHeader><CardTitle className="text-lg">تفاصيل المحاور</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {axisSummary.map(a => (
                    <AxisProgressCard key={a.id} name={a.name} order={a.order} completed={a.completed} total={a.total} color={a.color} />
                  ))}
                </CardContent>
              </Card>

              <div className="hidden">
                <WHOStandardsReport standards={standards} axes={axes} evidence={evidence} settings={settings[0]} />
              </div>
            </div>
          </TabsContent>

          {/* ==================== INITIATIVES ==================== */}
          <TabsContent value="initiatives">
            <div id="reports-initiatives" className="space-y-6">
              <SectionHeader icon={Lightbulb} title="تقرير المبادرات" description={`${filteredInitiatives.length} مبادرة`}>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredInitiatives.map(i => ({ 'العنوان': i.title, 'اللجنة': i.committee_name, 'الحالة': statusLabels[i.status] || i.status, 'نسبة الإنجاز': i.progress_percentage })), 'المبادرات')}>
                  <Download className="w-4 h-4 ml-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('reports-initiatives', 'تقرير-المبادرات.pdf')} disabled={exportingPDF}>
                  <Download className="w-4 h-4 ml-1" /> PDF
                </Button>
              </SectionHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Lightbulb} label="إجمالي المبادرات" value={filteredInitiatives.length} color="purple" />
                <StatCard icon={CheckCircle} label="مكتملة" value={filteredInitiatives.filter(i => i.status === 'completed').length} color="green" />
                <StatCard icon={Activity} label="قيد التنفيذ" value={filteredInitiatives.filter(i => i.status === 'in_progress').length} color="amber" />
                <StatCard icon={TrendingUp} label="نسبة الإنجاز" value={`${completedInitPct}%`} color="blue" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">المبادرات حسب اللجنة</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={initiativesByCommittee}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis /><Tooltip />
                        <Bar dataKey="count" fill="#8B5CF6" name="عدد المبادرات" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">توزيع المبادرات حسب الأولوية</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={initiativesByPriority}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="عدد المبادرات" radius={[4, 4, 0, 0]}>
                          {initiativesByPriority.map((item, index) => (
                            <Cell key={`init-priority-${index}`} fill={item.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ==================== TASKS ==================== */}
          <TabsContent value="tasks">
            <div id="reports-tasks" className="space-y-6">
              <SectionHeader icon={ClipboardList} title="تقرير المهام" description={`${filteredTasks.length} مهمة`}>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredTasks.map(t => ({ 'العنوان': t.title, 'المكلف': t.assigned_to_name, 'الحالة': statusLabels[t.status] || t.status, 'الأولوية': priorityLabels[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '' })), 'المهام')}>
                  <Download className="w-4 h-4 ml-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('reports-tasks', 'تقرير-المهام.pdf')} disabled={exportingPDF}>
                  <Download className="w-4 h-4 ml-1" /> PDF
                </Button>
              </SectionHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={ClipboardList} label="إجمالي المهام" value={filteredTasks.length} color="blue" />
                <StatCard icon={CheckCircle} label="مكتملة" value={filteredTasks.filter(t => t.status === 'completed').length} color="green" />
                <StatCard icon={AlertCircle} label="متأخرة" value={overdueTasks.length} color="red" />
                <StatCard icon={TrendingUp} label="نسبة الإنجاز" value={`${completedTasksPct}%`} color="teal" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">المهام حسب الأولوية</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={[
                        { name: 'منخفضة', value: filteredTasks.filter(t => t.priority === 'low').length, fill: '#94a3b8' },
                        { name: 'متوسطة', value: filteredTasks.filter(t => t.priority === 'medium').length, fill: '#3b82f6' },
                        { name: 'عالية', value: filteredTasks.filter(t => t.priority === 'high').length, fill: '#f59e0b' },
                        { name: 'عاجلة', value: filteredTasks.filter(t => t.priority === 'urgent').length, fill: '#ef4444' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" /><YAxis /><Tooltip />
                        <Bar dataKey="value" name="عدد المهام" radius={[4, 4, 0, 0]}>
                          {[{ fill: '#94a3b8' }, { fill: '#3b82f6' }, { fill: '#f59e0b' }, { fill: '#ef4444' }].map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">أداء الأعضاء</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={tasksByMember.filter(m => m.completed + m.inProgress + m.pending > 0)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                        <Bar dataKey="completed" fill="#10b981" name="مكتملة" stackId="a" />
                        <Bar dataKey="inProgress" fill="#f59e0b" name="قيد التنفيذ" stackId="a" />
                        <Bar dataKey="pending" fill="#94a3b8" name="معلقة" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ==================== DETAILED ==================== */}
          <TabsContent value="detailed">
            <div id="detailed-report-content" className="space-y-6">
              <SectionHeader icon={FileText} title="التقارير التفصيلية" description="اختر نوع التقرير ثم صدّره بصيغة CSV أو PDF">
                <Select value={detailedReportType} onValueChange={setDetailedReportType}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="نوع التقرير" /></SelectTrigger>
                  <SelectContent>
                    {detailedReportConfig.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(currentDetailedData, detailedReportFilename)} disabled={currentDetailedData.length === 0}>
                  <Download className="w-4 h-4 ml-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('detailed-report-content', `تقرير-${detailedReportFilename}.pdf`)} disabled={exportingPDF || currentDetailedData.length === 0}>
                  <Download className="w-4 h-4 ml-1" /> PDF
                </Button>
              </SectionHeader>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{detailedReportConfig.find(c => c.value === detailedReportType)?.label}</CardTitle>
                    <Badge variant="secondary">{currentDetailedData.length} سجل</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentDetailedData.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>لا توجد بيانات لهذا التقرير</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            {Object.keys(currentDetailedData[0]).map(key => (
                              <TableHead key={key} className="whitespace-nowrap text-right font-bold text-gray-700">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentDetailedData.map((row, idx) => (
                            <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              {Object.keys(currentDetailedData[0]).map(key => (
                                <TableCell key={key} className="text-right max-w-[280px] break-words">{String(row[key] ?? '—')}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
