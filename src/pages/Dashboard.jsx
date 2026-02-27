import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { STANDARDS_CSV } from '@/api/standardsFromCsv';
import { 
  BarChart3, Target, Users, FileCheck, ClipboardList, 
  AlertTriangle, CheckCircle2, Clock, TrendingUp, Building2,
  ArrowLeft, Activity, Image, Upload, Trash2, Save, Settings
} from "lucide-react";

/** عدد المعايير حسب مرجع المعايير (9 محاور، 80 معياراً) */
const REFERENCE_STANDARDS_COUNT = STANDARDS_CSV.length;
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const axisColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316'
];

export default function Dashboard() {
  const { permissions } = usePermissions();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list('order'),
    select: (data) => {
      if (!Array.isArray(data)) return [];
      const sortedAxes = [...data].sort((a, b) => {
        const orderA = Number(a.order) || 0;
        const orderB = Number(b.order) || 0;
        if (orderA < 1 || orderA > 9) return 1;
        if (orderB < 1 || orderB > 9) return -1;
        return orderA - orderB;
      });
      return sortedAxes.filter(axis => {
        const order = Number(axis.order);
        return order >= 1 && order <= 9;
      });
    }
  });

  const { data: standards = [] } = useQuery({
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
  const userRole = currentUser?.user_role || currentUser?.role;
  const currentMember = members.find(m => m.email === currentUser?.email);
  const isGovernor = userRole === 'admin' || currentMember?.role === 'governor';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى لوحة التحكم. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const result = await api.integrations?.Core?.UploadFile?.({ file });
      if (result?.file_url) setLogoForm(f => ({ ...f, logo_url: result.file_url }));
    } catch (err) { console.error(err); }
    setLogoUploading(false);
  };

  const handleRemoveLogo = () => setLogoForm(f => ({ ...f, logo_url: '' }));

  const handleSaveLogo = async () => {
    const data = { ...logoForm };
    if (currentSetting.id) {
      await updateSettingsMutation.mutateAsync({ id: currentSetting.id, data });
    } else {
      await createSettingsMutation.mutateAsync(data);
    }
  };

  // Calculate overall stats — المعايير المعتمدة في التطبيق: 80 (مرجع المعايير)
  const totalStandards = REFERENCE_STANDARDS_COUNT;
  const completedStandards = standards.filter(s => s.status === 'completed' || s.status === 'approved').length;
  const overallProgress = totalStandards > 0 ? Math.round((completedStandards / totalStandards) * 100) : 0;

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length;
  const pendingEvidence = evidence.filter(e => e.status === 'pending').length;

  // Axis progress data
  const axisProgress = axes.map((axis, index) => {
    const axisStandards = standards.filter(s => s.axis_id === axis.id);
    const completed = axisStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
    const total = axisStandards.length || 1;
    return {
      name: axis.name,
      progress: Math.round((completed / total) * 100),
      completed,
      total,
      color: axisColors[index % axisColors.length]
    };
  });

  const statusData = [
    { name: 'مكتمل', value: standards.filter(s => s.status === 'completed' || s.status === 'approved').length, color: '#10B981' },
    { name: 'قيد التنفيذ', value: standards.filter(s => s.status === 'in_progress').length, color: '#3B82F6' },
    { name: 'لم يبدأ', value: standards.filter(s => s.status === 'not_started').length, color: '#9CA3AF' }
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 via-blue-700 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-8 h-8" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">لوحة التحكم</h1>
              <p className="text-blue-100">مدينة قلوة الصحية - متابعة الإنجاز</p>
            </div>
          </div>
          
          {/* Overall Progress */}
          <Card className="bg-white/10 border-0 text-white mt-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100">نسبة الإنجاز الكلية</p>
                  <p className="text-4xl font-bold">{overallProgress}%</p>
                </div>
                <div className="text-left">
                  <p className="text-blue-100">المعايير المكتملة</p>
                  <p className="text-2xl font-bold">{completedStandards} / {totalStandards}</p>
                </div>
              </div>
              <Progress value={overallProgress} className="h-3 bg-white/20" />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{REFERENCE_STANDARDS_COUNT}</p>
              <p className="text-sm text-gray-500">المعايير الدولية</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{members.filter(m => m.status === 'active').length}</p>
              <p className="text-sm text-gray-500">أعضاء الفريق</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileCheck className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{evidence.length}</p>
              <p className="text-sm text-gray-500">الأدلة المرفوعة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">{surveys.length}</p>
              <p className="text-sm text-gray-500">استبيانات المسح</p>
            </CardContent>
          </Card>
        </div>

        {/* إعدادات الشعار */}
        <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5 text-blue-600" />
                إعدادات الشعار
              </CardTitle>
              <p className="text-sm text-gray-500">تغيير أو تعديل أو حذف شعار المدينة من لوحة التحكم</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Label className="block mb-2 text-sm font-medium">معاينة الشعار</Label>
                  <div className="w-32 h-32 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                    {logoForm.logo_url ? (
                      <img src={logoForm.logo_url} alt="شعار" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-4xl font-bold text-white bg-gradient-to-br from-blue-600 to-green-600 w-full h-full flex items-center justify-center rounded-xl">
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
                      disabled={logoUploading}
                      onClick={() => document.getElementById('dashboard-logo-upload').click()}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      {logoUploading ? 'جاري الرفع...' : 'تغيير الشعار'}
                    </Button>
                    {logoForm.logo_url && (
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={handleRemoveLogo}>
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
                        onChange={(e) => setLogoForm(f => ({ ...f, city_name: e.target.value }))}
                        placeholder="المدينة الصحية"
                        className="mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-sm">موقع المدينة</Label>
                      <Input
                        value={logoForm.city_location}
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
                      disabled={createSettingsMutation.isPending || updateSettingsMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
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
          </Card>

        {/* Alerts */}
        {(overdueTasks > 0 || pendingEvidence > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {overdueTasks > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 flex items-center gap-4">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">{overdueTasks} مهام متأخرة</p>
                    <p className="text-sm text-red-600">تحتاج إلى متابعة عاجلة</p>
                  </div>
                  <Link to={createPageUrl('Tasks')} className="mr-auto">
                    <Button size="sm" variant="outline" className="border-red-300 text-red-700">
                      عرض <ArrowLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            {pendingEvidence > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4 flex items-center gap-4">
                  <Clock className="w-10 h-10 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">{pendingEvidence} دليل بانتظار المراجعة</p>
                    <p className="text-sm text-yellow-600">تحتاج إلى اعتماد</p>
                  </div>
                  <Link to={createPageUrl('Standards')} className="mr-auto">
                    <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-700">
                      عرض <ArrowLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Axis Progress */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  نسبة الإنجاز حسب المحاور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {axes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>لم يتم إضافة المحاور بعد</p>
                    <Link to={createPageUrl('Standards')}>
                      <Button variant="outline" className="mt-3">إضافة المحاور والمعايير</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {axisProgress.map((axis, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{axis.name}</span>
                          <span className="text-sm text-gray-500">{axis.completed}/{axis.total} ({axis.progress}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full transition-all duration-500"
                            style={{ width: `${axis.progress}%`, backgroundColor: axis.color }}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                حالة المعايير
              </CardTitle>
            </CardHeader>
            <CardContent>
              {standards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>لا توجد بيانات</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4">
                    {statusData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>الوصول السريع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to={createPageUrl('Standards')}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <Target className="w-6 h-6 text-blue-600" />
                  <span>المعايير والأدلة</span>
                </Button>
              </Link>
              <Link to={createPageUrl('Survey')}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <ClipboardList className="w-6 h-6 text-green-600" />
                  <span>المسح الميداني</span>
                </Button>
              </Link>
              <Link to={createPageUrl('Tasks')}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <CheckCircle2 className="w-6 h-6 text-orange-600" />
                  <span>المهام</span>
                </Button>
              </Link>
              <Link to={createPageUrl('TeamManagement')}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  <span>الفريق</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}