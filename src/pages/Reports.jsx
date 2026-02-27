import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, TrendingUp, CheckCircle, Clock, AlertCircle, Award } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import WHOStandardsReport from '@/components/reports/WHOStandardsReport';
import { AXIS_COUNTS_CSV, STANDARDS_CSV, sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';
import { usePermissions } from '@/hooks/usePermissions';

const REFERENCE_TOTAL_STANDARDS = STANDARDS_CSV.length;
import { useToast } from '@/components/ui/use-toast';

export default function Reports() {
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const [selectedCommittee, setSelectedCommittee] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [detailedReportType, setDetailedReportType] = useState('tasks_all');

  const { data: initiatives = [] } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => api.entities.Initiative.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => api.entities.InitiativeKPI.list()
  });

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list()
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => api.entities.Evidence.list()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.entities.Settings.list()
  });

  if (!permissions.canSeeReports) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة التقارير. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter data
  const filteredInitiatives = selectedCommittee === 'all' 
    ? initiatives 
    : initiatives.filter(i => i.committee_id === selectedCommittee);

  const filteredTasks = selectedCommittee === 'all'
    ? tasks
    : tasks.filter(t => {
        const member = members.find(m => m.id === t.assigned_to);
        return member?.committee_id === selectedCommittee;
      });

  // Calculate statistics
  const initiativesByStatus = [
    { name: 'التخطيط', value: filteredInitiatives.filter(i => i.status === 'planning').length, color: '#94a3b8' },
    { name: 'معتمد', value: filteredInitiatives.filter(i => i.status === 'approved').length, color: '#3b82f6' },
    { name: 'قيد التنفيذ', value: filteredInitiatives.filter(i => i.status === 'in_progress').length, color: '#f59e0b' },
    { name: 'مكتمل', value: filteredInitiatives.filter(i => i.status === 'completed').length, color: '#10b981' },
    { name: 'معلق', value: filteredInitiatives.filter(i => i.status === 'on_hold').length, color: '#6b7280' },
    { name: 'ملغي', value: filteredInitiatives.filter(i => i.status === 'cancelled').length, color: '#ef4444' }
  ];

  const tasksByStatus = [
    { name: 'معلقة', value: filteredTasks.filter(t => t.status === 'pending').length, color: '#94a3b8' },
    { name: 'قيد التنفيذ', value: filteredTasks.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
    { name: 'مكتملة', value: filteredTasks.filter(t => t.status === 'completed').length, color: '#10b981' },
    { name: 'ملغاة', value: filteredTasks.filter(t => t.status === 'cancelled').length, color: '#ef4444' }
  ];

  const tasksByPriority = [
    { name: 'منخفضة', value: filteredTasks.filter(t => t.priority === 'low').length },
    { name: 'متوسطة', value: filteredTasks.filter(t => t.priority === 'medium').length },
    { name: 'عالية', value: filteredTasks.filter(t => t.priority === 'high').length },
    { name: 'عاجلة', value: filteredTasks.filter(t => t.priority === 'urgent').length }
  ];

  const initiativesByCommittee = committees.map(c => ({
    name: c.name,
    count: initiatives.filter(i => i.committee_id === c.id).length
  }));

  const tasksByMember = members.slice(0, 10).map(m => ({
    name: m.full_name?.slice(0, 15) || 'غير محدد',
    completed: tasks.filter(t => t.assigned_to === m.id && t.status === 'completed').length,
    pending: tasks.filter(t => t.assigned_to === m.id && t.status === 'pending').length,
    inProgress: tasks.filter(t => t.assigned_to === m.id && t.status === 'in_progress').length
  }));

  const kpiProgress = kpis.slice(0, 8).map(k => ({
    name: k.kpi_name?.slice(0, 20) || 'مؤشر',
    progress: k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0
  }));

  // Standards statistics
  const standardsByStatus = [
    { name: 'لم يبدأ', value: standards.filter(s => s.status === 'not_started').length, color: '#94a3b8' },
    { name: 'قيد التنفيذ', value: standards.filter(s => s.status === 'in_progress').length, color: '#f59e0b' },
    { name: 'مكتمل', value: standards.filter(s => s.status === 'completed').length, color: '#10b981' },
    { name: 'معتمد', value: standards.filter(s => s.status === 'approved').length, color: '#059669' }
  ];

  const standardsByAxis = axes.map(axis => {
    const order = axis.order ?? 0;
    const expectedCount = (order >= 1 && order <= AXIS_COUNTS_CSV.length) ? AXIS_COUNTS_CSV[order - 1] : standards.filter(s => s.axis_id === axis.id).length;
    const axisStandards = standards.filter(s => s.axis_id === axis.id);
    const completed = axisStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
    const avgCompletion = expectedCount > 0 ? Math.round((completed / expectedCount) * 100) : 0;
    return {
      name: axis.name,
      total: expectedCount,
      completed,
      avgCompletion
    };
  });

  // تسميات الحالات للعرض في التقارير التفصيلية
  const taskStatusLabel = { pending: 'معلقة', in_progress: 'قيد التنفيذ', completed: 'مكتملة', cancelled: 'ملغاة' };
  const taskPriorityLabel = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
  const initiativeStatusLabel = { planning: 'التخطيط', approved: 'معتمد', in_progress: 'قيد التنفيذ', completed: 'مكتمل', on_hold: 'معلق', cancelled: 'ملغي' };
  const standardStatusLabel = { not_started: 'لم يبدأ', in_progress: 'قيد التنفيذ', completed: 'مكتمل', approved: 'معتمد' };

  // بناء بيانات التقارير التفصيلية
  const getTaskCommitteeName = (t) => {
    const member = members.find(m => m.id === t.assigned_to);
    return committees.find(c => c.id === member?.committee_id)?.name || '';
  };
  const getTaskInitiativeTitle = (t) => initiatives.find(i => i.id === t.initiative_id)?.title || '';
  const getMemberCommitteeName = (m) => committees.find(c => c.id === m.committee_id)?.name || '';
  const getKpiInitiativeTitle = (k) => initiatives.find(i => i.id === k.initiative_id)?.title || '';

  const detailedReportConfig = [
    { value: 'tasks_all', label: 'المهام (كافة)', getData: () => filteredTasks.map(t => ({ 'العنوان': t.title, 'الوصف': t.description || '—', 'الحالة': taskStatusLabel[t.status] || t.status, 'الأولوية': taskPriorityLabel[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '—', 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t), 'المبادرة': getTaskInitiativeTitle(t) })) },
    { value: 'tasks_completed', label: 'المهام المنجزة', getData: () => filteredTasks.filter(t => t.status === 'completed').map(t => ({ 'العنوان': t.title, 'الوصف': t.description || '—', 'الحالة': taskStatusLabel[t.status] || t.status, 'الأولوية': taskPriorityLabel[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '—', 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t), 'المبادرة': getTaskInitiativeTitle(t) })) },
    { value: 'tasks_in_progress', label: 'المهام قيد التنفيذ', getData: () => filteredTasks.filter(t => t.status === 'in_progress').map(t => ({ 'العنوان': t.title, 'الوصف': t.description || '—', 'الحالة': taskStatusLabel[t.status] || t.status, 'الأولوية': taskPriorityLabel[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '—', 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t), 'المبادرة': getTaskInitiativeTitle(t) })) },
    { value: 'tasks_pending', label: 'المهام المعلقة', getData: () => filteredTasks.filter(t => t.status === 'pending').map(t => ({ 'العنوان': t.title, 'الوصف': t.description || '—', 'الحالة': taskStatusLabel[t.status] || t.status, 'الأولوية': taskPriorityLabel[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '—', 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t), 'المبادرة': getTaskInitiativeTitle(t) })) },
    { value: 'tasks_overdue', label: 'المهام المتأخرة', getData: () => filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').map(t => ({ 'العنوان': t.title, 'الوصف': t.description || '—', 'الحالة': taskStatusLabel[t.status] || t.status, 'الأولوية': taskPriorityLabel[t.priority] || t.priority, 'تاريخ الاستحقاق': t.due_date || '—', 'المكلف': t.assigned_to_name || '—', 'اللجنة': getTaskCommitteeName(t), 'المبادرة': getTaskInitiativeTitle(t) })) },
    { value: 'initiatives_all', label: 'المبادرات (كافة)', getData: () => filteredInitiatives.map(i => ({ 'العنوان': i.title, 'الوصف': i.description || '—', 'اللجنة': i.committee_name || '—', 'الحالة': initiativeStatusLabel[i.status] || i.status, 'الأولوية': i.priority || '—', 'نسبة الإنجاز %': i.progress_percentage ?? '—', 'تاريخ البدء': i.start_date || '—', 'تاريخ الانتهاء': i.end_date || '—' })) },
    { value: 'initiatives_completed', label: 'المبادرات المكتملة', getData: () => filteredInitiatives.filter(i => i.status === 'completed').map(i => ({ 'العنوان': i.title, 'الوصف': i.description || '—', 'اللجنة': i.committee_name || '—', 'الحالة': initiativeStatusLabel[i.status] || i.status, 'الأولوية': i.priority || '—', 'نسبة الإنجاز %': i.progress_percentage ?? '—', 'تاريخ البدء': i.start_date || '—', 'تاريخ الانتهاء': i.end_date || '—' })) },
    { value: 'initiatives_in_progress', label: 'المبادرات قيد التنفيذ', getData: () => filteredInitiatives.filter(i => i.status === 'in_progress').map(i => ({ 'العنوان': i.title, 'الوصف': i.description || '—', 'اللجنة': i.committee_name || '—', 'الحالة': initiativeStatusLabel[i.status] || i.status, 'الأولوية': i.priority || '—', 'نسبة الإنجاز %': i.progress_percentage ?? '—', 'تاريخ البدء': i.start_date || '—', 'تاريخ الانتهاء': i.end_date || '—' })) },
    { value: 'team', label: 'أعضاء الفريق', getData: () => members.map(m => ({ 'الاسم': m.full_name || '—', 'رقم الهوية': m.national_id || '—', 'المنصب': m.role || '—', 'اللجنة': getMemberCommitteeName(m), 'القسم/الجهة': m.department || '—', 'البريد': m.email || '—', 'الهاتف': m.phone || '—' })) },
    { value: 'standards', label: 'المعايير', getData: () => sortAndDeduplicateStandardsByCode(standards).map(s => ({ 'الرمز': s.code || '—', 'العنوان': s.title || '—', 'المحور': s.axis_name || axes.find(a => a.id === s.axis_id)?.name || '—', 'الحالة': standardStatusLabel[s.status] || s.status, 'نسبة الإنجاز %': s.completion_percentage ?? '—', 'الوصف': s.description || '—', 'المسؤول': s.assigned_to || '—' })) },
    { value: 'standards_kpis', label: 'المعايير ومؤشرات الأداء', getData: () => {
      const parseKpis = (str) => {
        if (!str) return [];
        try {
          const v = typeof str === 'string' ? JSON.parse(str) : str;
          return Array.isArray(v) ? v : [];
        } catch { return []; }
        };
      return sortAndDeduplicateStandardsByCode(standards).map(s => {
        const kpisList = parseKpis(s.kpis);
        const kpisText = kpisList.map(k => `${k.name}: ${k.target || '-'} ${k.unit && k.unit !== '-' ? `(${k.unit})` : ''}`).join('؛ ');
        return {
          'الرمز': s.code || '—',
          'العنوان': s.title || '—',
          'المحور': s.axis_name || axes.find(a => a.id === s.axis_id)?.name || '—',
          'الحالة': standardStatusLabel[s.status] || s.status,
          'نسبة الإنجاز %': s.completion_percentage ?? '—',
          'مؤشرات الأداء': kpisText || '—',
        };
      });
    } },
    { value: 'kpis', label: 'المؤشرات', getData: () => kpis.map(k => ({ 'المؤشر': k.kpi_name || '—', 'الوصف': k.description || '—', 'المبادرة': getKpiInitiativeTitle(k), 'القيمة الحالية': k.current_value, 'المستهدف': k.target_value, 'الوحدة': k.unit || '—', 'نسبة الإنجاز %': k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0 })) },
  ];

  const currentDetailedData = (() => {
    const config = detailedReportConfig.find(c => c.value === detailedReportType);
    return config ? config.getData() : [];
  })();
  const detailedReportFilename = (() => {
    const config = detailedReportConfig.find(c => c.value === detailedReportType);
    return config ? config.label.replace(/\s*[(\（].*?[)\）]\s*/g, '').trim() : 'تقرير-تفصيلي';
  })();

  // Export to CSV (يدعم مصفوفة فارغة)
  const exportToCSV = (data, filename) => {
    try {
      const emptyContent = '\ufeffلا توجد بيانات للتصدير';
      let csvContent = emptyContent;
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        const escapeCsv = (v) => {
          const s = String(v ?? '');
          if (/[,"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        };
        csvContent = [
          headers.map(escapeCsv).join(','),
          ...data.map(row => headers.map(h => escapeCsv(row[h])).join(','))
        ].join('\n');
        csvContent = '\ufeff' + csvContent;
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 200);
      toast({ title: 'تم التصدير', description: `تم تنزيل الملف: ${filename}.csv` });
    } catch (e) {
      toast({ title: 'فشل التصدير', description: e?.message || 'حدث خطأ أثناء تصدير CSV', variant: 'destructive' });
    }
  };

  // خريطة التبويبات لتصدير PDF حسب المحتوى
  const tabExportIds = {
    overview: { id: 'reports-overview', filename: 'تقرير-النظرة-العامة.pdf' },
    standards: { id: 'reports-standards', filename: 'تقرير-المعايير.pdf' },
    initiatives: { id: 'reports-initiatives', filename: 'تقرير-المبادرات.pdf' },
    tasks: { id: 'reports-tasks', filename: 'تقرير-المهام.pdf' },
    kpis: { id: 'reports-kpis', filename: 'تقرير-المؤشرات.pdf' },
    detailed: { id: 'detailed-report-content', filename: `تقرير-تفصيلي-${detailedReportFilename}.pdf` }
  };

  // Export to PDF (قد يستغرق 15–60 ثانية لتقرير منظمة الصحة حسب حجم المحتوى وجهازك)
  const exportToPDF = async (elementId = 'reports-content', filename = 'تقرير-التحليلات.pdf') => {
    setExportingPDF(true);
    let restore = [];
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        toast({ title: 'فشل التصدير', description: 'العنصر غير موجود. تأكد من فتح التبويب الصحيح.', variant: 'destructive' });
        return;
      }

      let el = element;
      while (el && el !== document.body) {
        const style = el.style;
        const hidden = el.getAttribute('hidden');
        restore.push({
          el,
          display: style.display,
          visibility: style.visibility,
          hidden,
        });
        style.display = 'block';
        style.visibility = 'visible';
        if (hidden != null) el.removeAttribute('hidden');
        el = el.parentElement;
      }
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(r => setTimeout(r, 150));

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        windowWidth: Math.max(element.scrollWidth || 800, 800),
        windowHeight: Math.max(element.scrollHeight || 600, 600),
        onclone: (clonedDoc, node) => {
          const root = node;
          root.querySelectorAll('.recharts-responsive-container').forEach((el) => {
            const placeholder = clonedDoc.createElement('div');
            placeholder.style.cssText = 'min-height: 120px; padding: 20px; background: #f1f5f9; color: #64748b; text-align: center; border-radius: 8px; display: flex; align-items: center; justify-content: center;';
            placeholder.textContent = 'رسم بياني (مستثنى من التصدير)';
            if (el.parentNode) el.parentNode.replaceChild(placeholder, el);
          });
          root.querySelectorAll('svg defs linearGradient, svg defs radialGradient').forEach((el) => el.remove());
          root.querySelectorAll('[class*="gradient"]').forEach((el) => {
            el.style.background = '#2563eb';
            el.style.backgroundImage = 'none';
          });
          root.querySelectorAll('img[src]').forEach((img) => {
            const s = (img.getAttribute('src') || '').trim();
            if (s.startsWith('http') && !s.startsWith(window.location.origin)) {
              img.removeAttribute('src');
              img.alt = img.alt || 'صورة';
              img.style.background = '#e2e8f0';
              img.style.minWidth = '40px';
              img.style.minHeight = '40px';
            }
          });
          root.style.minHeight = '400px';
          root.style.width = Math.max(root.scrollWidth || 800, 800) + 'px';
        },
      });

      if (!canvas.width || !canvas.height) {
        toast({ title: 'فشل تصدير PDF', description: 'المحتوى المراد تصديره فارغ أو غير ظاهر.', variant: 'destructive' });
        return;
      }

      let imgData;
      try {
        imgData = canvas.toDataURL('image/jpeg', 0.92);
      } catch (_) {
        imgData = canvas.toDataURL('image/png');
      }
      if (!imgData || !imgData.startsWith('data:image/')) {
        toast({ title: 'فشل تصدير PDF', description: 'تعذر إنشاء صورة من المحتوى. جرّب تقريراً أصغر أو تبويباً آخر.', variant: 'destructive' });
        return;
      }
      const imgType = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, imgType, 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, imgType, 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 200);
      toast({ title: 'تم التصدير', description: `تم تنزيل الملف: ${filename}` });
    } catch (e) {
      toast({ title: 'فشل تصدير PDF', description: e?.message || 'حدث خطأ. جرّب تقريراً أصغر أو تحقق من المتصفح.', variant: 'destructive' });
    } finally {
      restore.forEach(({ el, display, visibility, hidden }) => {
        el.style.display = display;
        el.style.visibility = visibility;
        if (hidden != null) el.setAttribute('hidden', hidden);
      });
      setExportingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                <FileText className="w-8 h-8" />
                التقارير والتحليلات
              </h1>
              <p className="text-blue-100">تحليل شامل لأداء المبادرات والمهام</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const t = tabExportIds[activeTab];
                  if (t) exportToPDF(t.id, t.filename);
                  else exportToPDF('reports-content', 'تقرير-التحليلات.pdf');
                }}
                disabled={exportingPDF}
                variant="secondary"
              >
                <Download className="w-4 h-4 ml-2" />
                {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF (التبويب الحالي)'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع اللجان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع اللجان</SelectItem>
                    {committees.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Content */}
        <div id="reports-content">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="detailed">تقارير تفصيلية</TabsTrigger>
              <TabsTrigger value="standards">المعايير</TabsTrigger>
              <TabsTrigger value="initiatives">المبادرات</TabsTrigger>
              <TabsTrigger value="tasks">المهام</TabsTrigger>
              <TabsTrigger value="kpis">المؤشرات</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div id="reports-overview" dir="rtl" className="report-font space-y-4 text-right">
              <div className="flex flex-wrap justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={() => exportToPDF('reports-overview', 'تقرير-النظرة-العامة.pdf')}
                  disabled={exportingPDF}
                >
                  <Download className="w-4 h-4 ml-2" />
                  {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(
                    [{
                      'إجمالي المبادرات': filteredInitiatives.length,
                      'المبادرات المكتملة': filteredInitiatives.filter(i => i.status === 'completed').length,
                      'إجمالي المهام': filteredTasks.length,
                      'المهام المكتملة': filteredTasks.filter(t => t.status === 'completed').length,
                      'المهام قيد التنفيذ': filteredTasks.filter(t => t.status === 'in_progress').length,
                      'المهام المعلقة': filteredTasks.filter(t => t.status === 'pending').length
                    }],
                    'النظرة-العامة'
                  )}
                >
                  <Download className="w-4 h-4 ml-2" />
                  تصدير CSV
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>إجمالي المبادرات</CardDescription>
                    <CardTitle className="text-3xl">{filteredInitiatives.length}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      {filteredInitiatives.filter(i => i.status === 'completed').length} مكتملة
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>إجمالي المهام</CardDescription>
                    <CardTitle className="text-3xl">{filteredTasks.length}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      {filteredTasks.filter(t => t.status === 'completed').length} مكتملة
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>المهام قيد التنفيذ</CardDescription>
                    <CardTitle className="text-3xl text-orange-600">
                      {filteredTasks.filter(t => t.status === 'in_progress').length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <Clock className="w-4 h-4" />
                      نشطة
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>المهام المعلقة</CardDescription>
                    <CardTitle className="text-3xl text-gray-600">
                      {filteredTasks.filter(t => t.status === 'pending').length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AlertCircle className="w-4 h-4" />
                      في الانتظار
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>المبادرات حسب الحالة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={initiativesByStatus.filter(i => i.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {initiativesByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>المهام حسب الحالة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={tasksByStatus.filter(t => t.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {tasksByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
              </div>
            </TabsContent>

            {/* تقارير تفصيلية Tab */}
            <TabsContent value="detailed" className="space-y-4">
              <div id="detailed-report-content" dir="rtl" className="report-font space-y-4 text-right">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Select value={detailedReportType} onValueChange={setDetailedReportType}>
                    <SelectTrigger className="w-full max-w-[280px]">
                      <SelectValue placeholder="اختر نوع التقرير" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tasks_all">المهام (كافة)</SelectItem>
                      <SelectItem value="tasks_completed">المهام المنجزة</SelectItem>
                      <SelectItem value="tasks_in_progress">المهام قيد التنفيذ</SelectItem>
                      <SelectItem value="tasks_pending">المهام المعلقة</SelectItem>
                      <SelectItem value="tasks_overdue">المهام المتأخرة</SelectItem>
                      <SelectItem value="initiatives_all">المبادرات (كافة)</SelectItem>
                      <SelectItem value="initiatives_completed">المبادرات المكتملة</SelectItem>
                      <SelectItem value="initiatives_in_progress">المبادرات قيد التنفيذ</SelectItem>
                      <SelectItem value="team">أعضاء الفريق</SelectItem>
                      <SelectItem value="standards">المعايير</SelectItem>
                      <SelectItem value="kpis">المؤشرات</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => exportToCSV(currentDetailedData, detailedReportFilename)}
                      disabled={currentDetailedData.length === 0}
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تصدير CSV
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportToPDF('detailed-report-content', `تقرير-تفصيلي-${detailedReportFilename}.pdf`)}
                      disabled={exportingPDF || currentDetailedData.length === 0}
                    >
                      <Download className="w-4 h-4 ml-2" />
                      {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
                    </Button>
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>جدول التقرير التفصيلي — {detailedReportConfig.find(c => c.value === detailedReportType)?.label}</CardTitle>
                    <CardDescription>{currentDetailedData.length} سجل</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentDetailedData.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center">لا توجد بيانات لهذا التقرير.</p>
                    ) : (
                      <div dir="rtl" className="overflow-x-auto rounded-md border text-right">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              {Object.keys(currentDetailedData[0]).map(key => (
                                <TableHead key={key} className="whitespace-nowrap text-right font-semibold">{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentDetailedData.map((row, idx) => (
                              <TableRow key={idx}>
                                {Object.keys(currentDetailedData[0]).map(key => (
                                  <TableCell key={key} dir="rtl" className="text-right align-top max-w-[280px] break-words whitespace-normal" title={String(row[key] ?? '')}>
                                    {String(row[key] ?? '—')}
                                  </TableCell>
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

            {/* Standards Tab */}
            <TabsContent value="standards" className="space-y-4">
              <div id="reports-standards" dir="rtl" className="report-font space-y-4 text-right">
              <div className="flex flex-wrap justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={() => exportToPDF('reports-standards', 'تقرير-المعايير.pdf')}
                  disabled={exportingPDF}
                >
                  <Download className="w-4 h-4 ml-2" />
                  {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF (هذا التبويب)'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportToCSV(
                    standards.map(s => ({
                      'الرمز': s.code,
                      'العنوان': s.title,
                      'المحور': s.axis_name,
                      'الحالة': s.status,
                      'نسبة الإنجاز': s.completion_percentage
                    })),
                    'المعايير'
                  )}
                >
                  <Download className="w-4 h-4 ml-2" />
                  تصدير CSV
                </Button>
                <div>
                  <Button 
                    onClick={() => exportToPDF('who-report', 'تقرير-معايير-منظمة-الصحة-العالمية.pdf')}
                    disabled={exportingPDF}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Award className="w-4 h-4 ml-2" />
                    {exportingPDF ? 'جاري التصدير...' : 'تقرير منظمة الصحة PDF'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">قد يستغرق 15–60 ثانية حسب حجم التقرير</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>إجمالي المعايير</CardDescription>
                    <CardTitle className="text-3xl">{REFERENCE_TOTAL_STANDARDS}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      جميع المعايير
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>المعايير المعتمدة</CardDescription>
                    <CardTitle className="text-3xl text-green-600">
                      {standards.filter(s => s.status === 'approved').length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      معتمدة
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>المعايير المكتملة</CardDescription>
                    <CardTitle className="text-3xl text-green-600">
                      {standards.filter(s => s.status === 'completed').length}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      مكتملة
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>نسبة الإنجاز</CardDescription>
                    <CardTitle className="text-3xl text-blue-600">
                      {(() => {
                        const deduped = sortAndDeduplicateStandardsByCode(standards);
                        return deduped.length > 0
                          ? Math.round(deduped.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / deduped.length)
                          : 0;
                      })()}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                      متوسط الإنجاز
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>المعايير حسب الحالة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={standardsByStatus.filter(s => s.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {standardsByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>التقدم حسب المحاور</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={standardsByAxis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avgCompletion" fill="#3b82f6" name="نسبة الإنجاز %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>المعايير حسب المحور</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={standardsByAxis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#94a3b8" name="إجمالي المعايير" />
                      <Bar dataKey="completed" fill="#10b981" name="المعايير المكتملة" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* WHO Standards Report */}
              </div>
              <div className="hidden">
                <WHOStandardsReport 
                  standards={standards}
                  axes={axes}
                  evidence={evidence}
                  settings={settings[0]}
                />
              </div>
            </TabsContent>

            {/* Initiatives Tab */}
            <TabsContent value="initiatives" className="space-y-4">
              <div id="reports-initiatives" dir="rtl" className="report-font space-y-4 text-right">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => exportToPDF('reports-initiatives', 'تقرير-المبادرات.pdf')}
                  disabled={exportingPDF}
                >
                  <Download className="w-4 h-4 ml-2" />
                  {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportToCSV(
                    filteredInitiatives.map(i => ({
                      'العنوان': i.title,
                      'اللجنة': i.committee_name,
                      'الحالة': i.status,
                      'الأولوية': i.priority,
                      'نسبة الإنجاز': i.progress_percentage
                    })),
                    'المبادرات'
                  )}
                >
                  <Download className="w-4 h-4 ml-2" />
                  تصدير CSV
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>المبادرات حسب اللجنة</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={initiativesByCommittee}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" name="عدد المبادرات" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>توزيع المبادرات حسب الأولوية</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'منخفضة', count: filteredInitiatives.filter(i => i.priority === 'low').length },
                      { name: 'متوسطة', count: filteredInitiatives.filter(i => i.priority === 'medium').length },
                      { name: 'عالية', count: filteredInitiatives.filter(i => i.priority === 'high').length },
                      { name: 'عاجلة', count: filteredInitiatives.filter(i => i.priority === 'urgent').length }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" name="عدد المبادرات" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4">
              <div id="reports-tasks" dir="rtl" className="report-font space-y-4 text-right">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => exportToPDF('reports-tasks', 'تقرير-المهام.pdf')}
                  disabled={exportingPDF}
                >
                  <Download className="w-4 h-4 ml-2" />
                  {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => exportToCSV(
                    filteredTasks.map(t => ({
                      'العنوان': t.title,
                      'المكلف': t.assigned_to_name,
                      'الحالة': t.status,
                      'الأولوية': t.priority,
                      'تاريخ الاستحقاق': t.due_date || 'غير محدد'
                    })),
                    'المهام'
                  )}
                >
                  <Download className="w-4 h-4 ml-2" />
                  تصدير CSV
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>المهام حسب الأولوية</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={tasksByPriority}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" name="عدد المهام" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>أداء الأعضاء (أفضل 10)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={tasksByMember} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" fill="#10b981" name="مكتملة" />
                      <Bar dataKey="inProgress" fill="#f59e0b" name="قيد التنفيذ" />
                      <Bar dataKey="pending" fill="#94a3b8" name="معلقة" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            {/* KPIs Tab */}
            <TabsContent value="kpis" className="space-y-4">
              <div id="reports-kpis" dir="rtl" className="report-font space-y-4 text-right">
              <div className="flex flex-wrap justify-end gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={() => exportToPDF('reports-kpis', 'تقرير-المؤشرات.pdf')}
                  disabled={exportingPDF}
                >
                  <Download className="w-4 h-4 ml-2" />
                  {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportToCSV(
                    kpis.map(k => {
                      const init = initiatives.find(i => i.id === k.initiative_id);
                      return {
                        'المؤشر': k.kpi_name,
                        'الوصف': k.description || '',
                        'القيمة الحالية': k.current_value,
                        'المستهدف': k.target_value,
                        'الوحدة': k.unit || '',
                        'نسبة الإنجاز %': k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0,
                        'المبادرة': init?.title || ''
                      };
                    }),
                    'المؤشرات'
                  )}
                >
                  <Download className="w-4 h-4 ml-2" />
                  تصدير CSV
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>تقدم مؤشرات الأداء الرئيسية</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={kpiProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="progress" fill="#3b82f6" name="نسبة الإنجاز %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kpis.slice(0, 6).map(kpi => (
                  <Card key={kpi.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{kpi.kpi_name}</CardTitle>
                      <CardDescription>{kpi.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>الحالي: {kpi.current_value} {kpi.unit}</span>
                          <span>المستهدف: {kpi.target_value} {kpi.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(100, (kpi.current_value / kpi.target_value) * 100)}%` 
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          {Math.round((kpi.current_value / kpi.target_value) * 100)}% مكتمل
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}