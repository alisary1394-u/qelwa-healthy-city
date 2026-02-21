import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, TrendingUp, CheckCircle, Clock, AlertCircle, Award } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import WHOStandardsReport from '@/components/reports/WHOStandardsReport';
import { usePermissions } from '@/hooks/usePermissions';

export default function Reports() {
  const { permissions } = usePermissions();
  const [selectedCommittee, setSelectedCommittee] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [exportingPDF, setExportingPDF] = useState(false);

  const { data: initiatives = [] } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => base44.entities.Initiative.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => base44.entities.Committee.list()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => base44.entities.InitiativeKPI.list()
  });

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => base44.entities.Standard.list()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => base44.entities.Axis.list()
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => base44.entities.Evidence.list()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.Settings.list()
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

  const standardsByAxis = axes.map(axis => ({
    name: axis.name,
    total: standards.filter(s => s.axis_id === axis.id).length,
    completed: standards.filter(s => s.axis_id === axis.id && (s.status === 'completed' || s.status === 'approved')).length,
    avgCompletion: standards.filter(s => s.axis_id === axis.id).length > 0 
      ? Math.round(standards.filter(s => s.axis_id === axis.id).reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / standards.filter(s => s.axis_id === axis.id).length)
      : 0
  }));

  // Export to CSV
  const exportToCSV = (data, filename) => {
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  // Export to PDF
  const exportToPDF = async (elementId = 'reports-content', filename = 'تقرير-التحليلات.pdf') => {
    setExportingPDF(true);
    const element = document.getElementById(elementId);
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
    setExportingPDF(false);
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
            <div className="flex gap-2">
              <Button onClick={exportToPDF} disabled={exportingPDF} variant="secondary">
                <Download className="w-4 h-4 ml-2" />
                {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
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
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="standards">المعايير</TabsTrigger>
              <TabsTrigger value="initiatives">المبادرات</TabsTrigger>
              <TabsTrigger value="tasks">المهام</TabsTrigger>
              <TabsTrigger value="kpis">المؤشرات</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
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
            </TabsContent>

            {/* Standards Tab */}
            <TabsContent value="standards" className="space-y-4">
              <div className="flex justify-end gap-2 mb-4">
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
                <Button 
                  onClick={() => exportToPDF('who-report', 'تقرير-معايير-منظمة-الصحة-العالمية.pdf')}
                  disabled={exportingPDF}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Award className="w-4 h-4 ml-2" />
                  {exportingPDF ? 'جاري التصدير...' : 'تقرير منظمة الصحة PDF'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>إجمالي المعايير</CardDescription>
                    <CardTitle className="text-3xl">{standards.length}</CardTitle>
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
                      {standards.length > 0 
                        ? Math.round(standards.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / standards.length)
                        : 0}%
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
              <div className="flex justify-end gap-2">
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
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-4">
              <div className="flex justify-end gap-2">
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
            </TabsContent>

            {/* KPIs Tab */}
            <TabsContent value="kpis" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}