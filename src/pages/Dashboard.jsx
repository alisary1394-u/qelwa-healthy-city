import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { STANDARDS_CSV } from '@/api/standardsFromCsv';
import { 
  BarChart3, Target, Users, FileCheck, MapPinned, LayoutDashboard,
  AlertTriangle, CheckCircle2, Clock, Building2,
  ArrowLeft, Activity, TrendingUp, Shield, Zap,
  Image, Upload, Trash2, Save, Settings, ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const REFERENCE_STANDARDS_COUNT = STANDARDS_CSV.length;
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const axisColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316'
];

// Animated counter component
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    startRef.current = display;
    const startTime = performance.now();
    
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(startRef.current + (target - startRef.current) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <span>{display}</span>;
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="page-container animate-in" dir="rtl">
      <div className="h-40 skeleton rounded-2xl mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 skeleton rounded-xl" />
        <div className="h-80 skeleton rounded-xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { permissions } = usePermissions();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: axes = [], isLoading: axesLoading } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list('order'),
    select: (data) => {
      if (!Array.isArray(data)) return [];
      return [...data]
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .filter(axis => { const o = Number(axis.order); return o >= 1 && o <= 9; });
    }
  });

  const { data: standards = [], isLoading: standardsLoading } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => api.entities.Evidence.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => api.entities.FamilySurvey.list()
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.entities.Settings.list()
  });

  const queryClient = useQueryClient();
  const currentSetting = settingsList[0] || {};

  const [logoForm, setLogoForm] = useState({
    logo_url: '',
    logo_text: 'ق',
    city_name: 'المدينة الصحية',
    city_location: 'محافظة قلوة'
  });
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (currentSetting.id) {
      setLogoForm({
        logo_url: currentSetting.logo_url || '',
        logo_text: currentSetting.logo_text || 'ق',
        city_name: currentSetting.city_name || 'المدينة الصحية',
        city_location: currentSetting.city_location || 'محافظة قلوة'
      });
    }
  }, [currentSetting]);

  const createSettingsMutation = useMutation({
    mutationFn: (data) => api.entities.Settings.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  });
  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Settings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  });

  if (!permissions.canSeeDashboard) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-destructive/60" />
            <p className="text-destructive font-semibold">غير مصرح لك بالوصول إلى لوحة التحكم.</p>
            <p className="text-sm text-muted-foreground mt-2">الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (axesLoading || standardsLoading) {
    return <DashboardSkeleton />;
  }

  const handleLogoUpload = async (e) => {
    if (!permissions.canManageSettings) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const result = await api.integrations?.Core?.UploadFile?.({ file });
      if (result?.file_url) setLogoForm(f => ({ ...f, logo_url: result.file_url }));
    } catch (err) { console.error(err); }
    setLogoUploading(false);
  };

  const handleRemoveLogo = () => {
    if (!permissions.canManageSettings) return;
    setLogoForm(f => ({ ...f, logo_url: '' }));
  };

  const handleSaveLogo = async () => {
    if (!permissions.canManageSettings) return;
    const data = { ...logoForm };
    if (currentSetting.id) {
      await updateSettingsMutation.mutateAsync({ id: currentSetting.id, data });
    } else {
      await createSettingsMutation.mutateAsync(data);
    }
  };

  const totalStandards = REFERENCE_STANDARDS_COUNT;
  const completedStandards = standards.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const overallProgress = totalStandards > 0 ? Math.round((completedStandards / totalStandards) * 100) : 0;
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length;
  const pendingEvidence = evidence.filter(e => e.status === 'pending').length;
  const activeMembers = members.filter(m => m.status === 'active').length;

  const axisProgress = axes.map((axis, index) => {
    const axisStandards = standards.filter(s => s.axis_id === axis.id);
    const completed = axisStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
    const total = axisStandards.length;
    return {
      name: axis.name,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed,
      total,
      color: axisColors[index % axisColors.length]
    };
  });

  const statusData = [
    { name: 'مكتمل', value: standards.filter(s => s.status === 'completed' || s.status === 'approved').length, color: '#0f766e' },
    { name: 'قيد التنفيذ', value: standards.filter(s => s.status === 'in_progress').length, color: '#1e3a5f' },
    { name: 'لم يبدأ', value: standards.filter(s => s.status === 'not_started' || !s.status).length, color: '#94A3B8' }
  ].filter(d => d.value > 0);

  const statsCards = [
    { icon: Target, label: 'المعايير الدولية', value: REFERENCE_STANDARDS_COUNT, color: 'text-primary', bgColor: 'bg-primary/10', delay: '0' },
    { icon: Users, label: 'أعضاء الفريق', value: activeMembers, color: 'text-teal-700 dark:text-teal-400', bgColor: 'bg-teal-600/10', delay: '75' },
    { icon: FileCheck, label: 'الأدلة المرفوعة', value: evidence.length, color: 'text-slate-700 dark:text-slate-400', bgColor: 'bg-slate-600/10', delay: '150' },
    { icon: MapPinned, label: 'استبيانات المسح', value: surveys.length, color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-600/10', delay: '225' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAyYzguODM3IDAgMTYgNy4xNjMgMTYgMTZzLTcuMTYzIDE2LTE2IDE2LTE2LTcuMTYzLTE2LTE2IDcuMTYzLTE2IDE2LTE2eiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative page-container py-8 md:py-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">لوحة التحكم</h1>
                  <p className="text-white/70 text-sm">{currentSetting.city_name || 'مدينة قلوة الصحية'} — متابعة الإنجاز</p>
                </div>
              </div>
            </div>
            {currentUser && (
              <div className="hidden md:block text-left">
                <p className="text-white/70 text-sm">مرحباً</p>
                <p className="text-white font-semibold">{currentUser.full_name}</p>
              </div>
            )}
          </div>
          
          {/* Overall Progress Card */}
          <Card className="mt-6 bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-white/70 text-sm mb-1">نسبة الإنجاز الكلية</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">
                      <AnimatedNumber value={overallProgress} />
                    </span>
                    <span className="text-2xl text-white/60">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white"><AnimatedNumber value={completedStandards} /></p>
                    <p className="text-xs text-white/60">مكتمل</p>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white"><AnimatedNumber value={totalStandards} /></p>
                    <p className="text-xs text-white/60">إجمالي</p>
                  </div>
                  <div className="w-px h-10 bg-white/20" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white"><AnimatedNumber value={pendingTasks} /></p>
                    <p className="text-xs text-white/60">مهمة قائمة</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Progress value={overallProgress} className="h-3 bg-white/15" />
                <div className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-white/30 to-transparent" style={{ width: '100%' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="page-container -mt-2">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsCards.map((stat, i) => (
            <div key={i} className="stat-card p-4 animate-in" style={{ animationDelay: `${stat.delay}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-muted-foreground/40" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                <AnimatedNumber value={stat.value} />
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* إعدادات الشعار */}
        {permissions.canSeeSettings && (
        <Collapsible defaultOpen={false}>
          <Card className="mb-6 border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="w-5 h-5 text-primary" />
                    إعدادات الشعار
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CardTitle>
                <p className="text-sm text-muted-foreground">تغيير أو تعديل أو حذف شعار المدينة من لوحة التحكم</p>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Label className="block mb-2 text-sm font-medium">معاينة الشعار</Label>
                  <div className="w-32 h-32 rounded-xl border-2 border-border bg-card flex items-center justify-center overflow-hidden">
                    {logoForm.logo_url ? (
                      <img src={logoForm.logo_url} alt="شعار" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-4xl font-bold text-white gradient-primary w-full h-full flex items-center justify-center rounded-xl">
                        {logoForm.logo_text || 'ق'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logoUploading || !permissions.canManageSettings}
                      onClick={() => document.getElementById('dashboard-logo-upload').click()}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      {logoUploading ? 'جاري الرفع...' : 'تغيير الشعار'}
                    </Button>
                    {logoForm.logo_url && permissions.canManageSettings && (
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={handleRemoveLogo}>
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف الشعار
                      </Button>
                    )}
                    <input
                      id="dashboard-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">نص الشعار البديل</Label>
                      <Input
                        value={logoForm.logo_text}
                        disabled={!permissions.canManageSettings}
                        onChange={(e) => setLogoForm(f => ({ ...f, logo_text: e.target.value }))}
                        placeholder="ق"
                        maxLength={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">اسم المدينة</Label>
                      <Input
                        value={logoForm.city_name}
                        disabled={!permissions.canManageSettings}
                        onChange={(e) => setLogoForm(f => ({ ...f, city_name: e.target.value }))}
                        placeholder="المدينة الصحية"
                        className="mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-sm">موقع المدينة</Label>
                      <Input
                        value={logoForm.city_location}
                        disabled={!permissions.canManageSettings}
                        onChange={(e) => setLogoForm(f => ({ ...f, city_location: e.target.value }))}
                        placeholder="محافظة قلوة"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveLogo}
                      disabled={!permissions.canManageSettings || createSettingsMutation.isPending || updateSettingsMutation.isPending}
                    >
                      <Save className="w-4 h-4 ml-2" />
                      حفظ التعديلات
                    </Button>
                    <Link to={createPageUrl('Settings')}>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 ml-2" />
                        إعدادات المدينة الكاملة
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        )}

        {/* Alerts */}
        {(overdueTasks > 0 || pendingEvidence > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-in">
            {overdueTasks > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-destructive">{overdueTasks} مهام متأخرة</p>
                    <p className="text-sm text-muted-foreground">تحتاج إلى متابعة عاجلة</p>
                  </div>
                  <Link to={createPageUrl('Tasks') + '?filter=overdue'}>
                    <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                      عرض <ArrowLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            {pendingEvidence > 0 && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-warning">{pendingEvidence} دليل بانتظار المراجعة</p>
                    <p className="text-sm text-muted-foreground">تحتاج إلى اعتماد</p>
                  </div>
                  <Link to={createPageUrl('Standards') + '?filter=pending'}>
                    <Button size="sm" variant="outline" className="border-warning/30 text-warning hover:bg-warning/10">
                      عرض <ArrowLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in" style={{ animationDelay: '200ms' }}>
          {/* Axis Progress */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  نسبة الإنجاز حسب المحاور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {axes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="font-medium">لم يتم إضافة المحاور بعد</p>
                    <Link to={createPageUrl('Standards')}>
                      <Button variant="outline" className="mt-4" size="sm">إضافة المحاور والمعايير</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {axisProgress.map((axis, index) => (
                      <div key={index} className="group">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground">{axis.name}</span>
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {axis.completed}/{axis.total} 
                            <span className="mr-1 font-medium" style={{ color: axis.color }}>({axis.progress}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ 
                              width: `${axis.progress}%`, 
                              backgroundColor: axis.color,
                              boxShadow: axis.progress > 0 ? `0 0 8px ${axis.color}40` : 'none'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Pie Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-primary" />
                حالة المعايير
              </CardTitle>
            </CardHeader>
            <CardContent>
              {standards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.75rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          direction: 'rtl',
                          fontFamily: 'Tajawal'
                        }}
                        formatter={(value, name) => [`${value} معيار`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3">
                    {statusData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="text-sm font-semibold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6 shadow-sm animate-in" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-primary" />
              الوصول السريع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { href: 'Standards', icon: Target, label: 'المعايير والأدلة', color: 'text-primary', bg: 'group-hover:bg-primary/10' },
                { href: 'Survey', icon: MapPinned, label: 'المسح الميداني', color: 'text-teal-700 dark:text-teal-400', bg: 'group-hover:bg-teal-600/10' },
                { href: 'Tasks', icon: CheckCircle2, label: 'المهام', color: 'text-amber-700 dark:text-amber-400', bg: 'group-hover:bg-amber-600/10' },
                { href: 'TeamManagement', icon: Users, label: 'الفريق', color: 'text-slate-700 dark:text-slate-400', bg: 'group-hover:bg-slate-600/10' },
              ].map((action) => (
                <Link key={action.href} to={createPageUrl(action.href)} className="group">
                  <div className="border border-border rounded-xl p-4 text-center hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl bg-muted ${action.bg} flex items-center justify-center mx-auto mb-2 transition-colors`}>
                      <action.icon className={`w-6 h-6 ${action.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}