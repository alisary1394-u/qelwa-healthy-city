import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Search, Lightbulb, Users, Calendar, DollarSign, 
  Target, TrendingUp, Clock, CheckCircle, AlertCircle,
  Loader2, Eye, Edit, Play, Pause, X
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import KPIManager from "../components/initiatives/KPIManager";
import { usePermissions } from '@/hooks/usePermissions';

const statusConfig = {
  planning: { label: 'تخطيط', color: 'bg-gray-600', icon: Clock },
  approved: { label: 'معتمدة', color: 'bg-blue-600', icon: CheckCircle },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-yellow-600', icon: Play },
  completed: { label: 'مكتملة', color: 'bg-green-600', icon: CheckCircle },
  on_hold: { label: 'متوقفة', color: 'bg-orange-600', icon: Pause },
  cancelled: { label: 'ملغاة', color: 'bg-red-600', icon: X }
};

const priorityConfig = {
  low: { label: 'منخفضة', color: 'bg-blue-100 text-blue-700' },
  medium: { label: 'متوسطة', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'عالية', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'عاجلة', color: 'bg-red-100 text-red-700' }
};

const impactConfig = {
  low: 'تأثير محدود',
  medium: 'تأثير متوسط',
  high: 'تأثير كبير',
  very_high: 'تأثير كبير جداً'
};

export default function Initiatives() {
  const { permissions } = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    objectives: '',
    committee_id: '',
    committee_name: '',
    axis_id: '',
    axis_name: '',
    related_standards: [],
    target_audience: '',
    expected_beneficiaries: 0,
    start_date: '',
    end_date: '',
    budget: 0,
    leader_id: '',
    leader_name: '',
    team_members: [],
    priority: 'medium',
    impact_level: 'medium',
    location: '',
    partners: '',
    notes: ''
  });

  const [kpisList, setKpisList] = useState([]);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => api.entities.Initiative.list('-created_date')
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list()
  });

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Initiative.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setFormOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Initiative.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      setViewOpen(false);
    }
  });

  if (!permissions.canSeeInitiatives) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة المبادرات. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: initiatives.length,
    planning: initiatives.filter(i => i.status === 'planning').length,
    inProgress: initiatives.filter(i => i.status === 'in_progress').length,
    completed: initiatives.filter(i => i.status === 'completed').length,
    totalBudget: initiatives.reduce((sum, i) => sum + (i.budget || 0), 0),
    totalBeneficiaries: initiatives.reduce((sum, i) => sum + (i.expected_beneficiaries || 0), 0)
  };

  const filteredInitiatives = initiatives.filter(i => {
    const matchesSearch = !searchQuery ||
      i.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code?.includes(searchQuery) ||
      i.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeStatus === 'all' || i.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      objectives: '',
      committee_id: '',
      committee_name: '',
      axis_id: '',
      axis_name: '',
      related_standards: [],
      target_audience: '',
      expected_beneficiaries: 0,
      start_date: '',
      end_date: '',
      budget: 0,
      leader_id: '',
      leader_name: '',
      team_members: [],
      priority: 'medium',
      impact_level: 'medium',
      location: '',
      partners: '',
      notes: ''
    });
    setKpisList([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const initiativeCode = formData.code || `INI${Date.now().toString().slice(-6)}`;
    const newInitiative = await createMutation.mutateAsync({
      ...formData,
      code: initiativeCode,
      status: 'planning',
      progress_percentage: 0,
      actual_cost: 0
    });

    // Create KPIs if any
    if (kpisList.length > 0 && newInitiative) {
      for (const kpi of kpisList) {
        const percentage = (kpi.current_value / kpi.target_value) * 100;
        const status = percentage >= 100 ? 'achieved' :
                       percentage >= 75 ? 'on_track' :
                       percentage >= 50 ? 'at_risk' : 'behind';
        
        await api.entities.InitiativeKPI.create({
          ...kpi,
          initiative_id: newInitiative.id,
          initiative_title: formData.title,
          status,
          last_updated: new Date().toISOString().split('T')[0]
        });
      }
    }

    setSaving(false);
  };

  const handleStatusChange = async (initiative, newStatus) => {
    await updateMutation.mutateAsync({
      id: initiative.id,
      data: { 
        status: newStatus,
        ...(newStatus === 'approved' && {
          approval_date: new Date().toISOString().split('T')[0],
          approved_by: currentUser?.full_name
        })
      }
    });
  };

  const toggleStandard = (standardId) => {
    const current = formData.related_standards || [];
    if (current.includes(standardId)) {
      setFormData({ ...formData, related_standards: current.filter(s => s !== standardId) });
    } else {
      setFormData({ ...formData, related_standards: [...current, standardId] });
    }
  };

  const axisStandards = standards.filter(s => s.axis_id === formData.axis_id);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-purple-600 to-blue-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إدارة المبادرات</h1>
          <p className="text-purple-100">مبادرات المدينة الصحية المرتبطة باللجان والمعايير</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">إجمالي المبادرات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-2xl font-bold">{stats.planning}</p>
              <p className="text-sm text-gray-500">تحت التخطيط</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">قيد التنفيذ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-gray-500">مكتملة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.totalBeneficiaries}</p>
              <p className="text-sm text-gray-500">المستفيدون</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{(stats.totalBudget / 1000).toFixed(0)}K</p>
              <p className="text-sm text-gray-500">الميزانية</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="بحث بالعنوان أو الرمز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-5 h-5 ml-2" />
            مبادرة جديدة
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="planning">تخطيط ({stats.planning})</TabsTrigger>
            <TabsTrigger value="in_progress">قيد التنفيذ ({stats.inProgress})</TabsTrigger>
            <TabsTrigger value="completed">مكتملة ({stats.completed})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Initiatives Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
          </div>
        ) : filteredInitiatives.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Lightbulb className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد مبادرات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInitiatives.map(initiative => {
              const StatusIcon = statusConfig[initiative.status]?.icon || Clock;
              return (
                <Card key={initiative.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">{initiative.code}</Badge>
                        <h3 className="font-bold text-lg mb-1">{initiative.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{initiative.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <Badge className={statusConfig[initiative.status]?.color}>
                          <StatusIcon className="w-3 h-3 ml-1" />
                          {statusConfig[initiative.status]?.label}
                        </Badge>
                        <Badge className={priorityConfig[initiative.priority]?.color}>
                          {priorityConfig[initiative.priority]?.label}
                        </Badge>
                      </div>

                      {initiative.progress_percentage !== undefined && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">التقدم</span>
                            <span className="font-semibold">{initiative.progress_percentage}%</span>
                          </div>
                          <Progress value={initiative.progress_percentage} className="h-2" />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          <span>{initiative.axis_name || 'غير محدد'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{initiative.committee_name || 'غير محدد'}</span>
                        </div>
                        {initiative.budget > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{initiative.budget.toLocaleString()} ريال</span>
                          </div>
                        )}
                        {initiative.expected_beneficiaries > 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{initiative.expected_beneficiaries} مستفيد</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => { setSelectedInitiative(initiative); setViewOpen(true); }}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        عرض
                      </Button>
                      {initiative.status === 'planning' && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleStatusChange(initiative, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          اعتماد
                        </Button>
                      )}
                      {initiative.status === 'approved' && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                          onClick={() => handleStatusChange(initiative, 'in_progress')}
                        >
                          <Play className="w-4 h-4 ml-1" />
                          بدء
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

      {/* Initiative Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">مبادرة جديدة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-purple-600">
                <Lightbulb className="w-5 h-5" />
                المعلومات الأساسية
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رمز المبادرة</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="INI001" />
                </div>
                <div className="space-y-2">
                  <Label>الأولوية *</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>عنوان المبادرة *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>الوصف *</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={3} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>الأهداف</Label>
                  <Textarea value={formData.objectives} onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} rows={2} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-600">
                <Target className="w-5 h-5" />
                الارتباط التنظيمي
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اللجنة *</Label>
                  <Select value={formData.committee_id} onValueChange={(v) => {
                    const committee = committees.find(c => c.id === v);
                    setFormData({ ...formData, committee_id: v, committee_name: committee?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر اللجنة" /></SelectTrigger>
                    <SelectContent>
                      {committees.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المحور</Label>
                  <Select value={formData.axis_id} onValueChange={(v) => {
                    const axis = axes.find(a => a.id === v);
                    setFormData({ ...formData, axis_id: v, axis_name: axis?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر المحور" /></SelectTrigger>
                    <SelectContent>
                      {axes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.axis_id && axisStandards.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <Label>المعايير المرتبطة</Label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                      {axisStandards.map(standard => (
                        <div key={standard.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.related_standards?.includes(standard.id)}
                            onChange={() => toggleStandard(standard.id)}
                            className="rounded"
                          />
                          <span className="text-sm">{standard.code} - {standard.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>قائد المبادرة</Label>
                  <Select value={formData.leader_id} onValueChange={(v) => {
                    const member = members.find(m => m.id === v);
                    setFormData({ ...formData, leader_id: v, leader_name: member?.full_name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="اختر القائد" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>مستوى التأثير</Label>
                  <Select value={formData.impact_level} onValueChange={(v) => setFormData({ ...formData, impact_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(impactConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2 text-green-600">
                <Calendar className="w-5 h-5" />
                الجدول الزمني والميزانية
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ البداية *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ النهاية *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>الميزانية المطلوبة (ريال)</Label>
                  <Input type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>عدد المستفيدين المتوقع</Label>
                  <Input type="number" value={formData.expected_beneficiaries} onChange={(e) => setFormData({ ...formData, expected_beneficiaries: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>الفئة المستهدفة</Label>
                  <Input value={formData.target_audience} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} placeholder="مثال: الأسر، الشباب، المرضى، إلخ" />
                </div>
                <div className="space-y-2">
                  <Label>الموقع/النطاق الجغرافي</Label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>الشركاء</Label>
                  <Input value={formData.partners} onChange={(e) => setFormData({ ...formData, partners: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>مؤشرات الأداء الرئيسية (KPIs)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setKpisList([...kpisList, {
                          kpi_name: '',
                          description: '',
                          target_value: 0,
                          current_value: 0,
                          unit: '',
                          measurement_frequency: 'شهري'
                        }]);
                      }}
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة مؤشر
                    </Button>
                  </div>
                  
                  {kpisList.length === 0 ? (
                    <div className="text-center py-4 border rounded-lg bg-gray-50">
                      <Target className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">لم يتم إضافة مؤشرات أداء بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-3 max-h-64 overflow-y-auto">
                      {kpisList.map((kpi, index) => (
                        <Card key={index} className="bg-gray-50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-sm">مؤشر #{index + 1}</h4>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setKpisList(kpisList.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="col-span-2">
                                <Input
                                  placeholder="اسم المؤشر *"
                                  value={kpi.kpi_name}
                                  onChange={(e) => {
                                    const newList = [...kpisList];
                                    newList[index].kpi_name = e.target.value;
                                    setKpisList(newList);
                                  }}
                                  required
                                />
                              </div>
                              <Input
                                type="number"
                                placeholder="القيمة المستهدفة"
                                value={kpi.target_value}
                                onChange={(e) => {
                                  const newList = [...kpisList];
                                  newList[index].target_value = parseFloat(e.target.value) || 0;
                                  setKpisList(newList);
                                }}
                              />
                              <Input
                                placeholder="وحدة القياس"
                                value={kpi.unit}
                                onChange={(e) => {
                                  const newList = [...kpisList];
                                  newList[index].unit = e.target.value;
                                  setKpisList(newList);
                                }}
                              />
                              <Select
                                value={kpi.measurement_frequency}
                                onValueChange={(v) => {
                                  const newList = [...kpisList];
                                  newList[index].measurement_frequency = v;
                                  setKpisList(newList);
                                }}
                              >
                                <SelectTrigger className="col-span-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="يومي">يومي</SelectItem>
                                  <SelectItem value="أسبوعي">أسبوعي</SelectItem>
                                  <SelectItem value="شهري">شهري</SelectItem>
                                  <SelectItem value="ربع سنوي">ربع سنوي</SelectItem>
                                  <SelectItem value="سنوي">سنوي</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ المبادرة
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Initiative Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل المبادرة - {selectedInitiative?.code}</DialogTitle>
          </DialogHeader>
          {selectedInitiative && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{selectedInitiative.title}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{selectedInitiative.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusConfig[selectedInitiative.status]?.color}>
                        {statusConfig[selectedInitiative.status]?.label}
                      </Badge>
                      <Badge className={priorityConfig[selectedInitiative.priority]?.color}>
                        {priorityConfig[selectedInitiative.priority]?.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedInitiative.objectives && (
                    <div>
                      <h4 className="font-semibold mb-1">الأهداف:</h4>
                      <p className="text-sm text-gray-600">{selectedInitiative.objectives}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">اللجنة:</span>
                      <p className="font-semibold">{selectedInitiative.committee_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">المحور:</span>
                      <p className="font-semibold">{selectedInitiative.axis_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">الفترة:</span>
                      <p className="font-semibold">{selectedInitiative.start_date} - {selectedInitiative.end_date}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">القائد:</span>
                      <p className="font-semibold">{selectedInitiative.leader_name || 'غير محدد'}</p>
                    </div>
                    {selectedInitiative.budget > 0 && (
                      <div>
                        <span className="text-gray-500">الميزانية:</span>
                        <p className="font-semibold">{selectedInitiative.budget.toLocaleString()} ريال</p>
                      </div>
                    )}
                    {selectedInitiative.expected_beneficiaries > 0 && (
                      <div>
                        <span className="text-gray-500">المستفيدون المتوقعون:</span>
                        <p className="font-semibold">{selectedInitiative.expected_beneficiaries}</p>
                      </div>
                    )}
                  </div>

                  {selectedInitiative.related_standards?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">المعايير المرتبطة:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedInitiative.related_standards.map(sid => {
                          const standard = standards.find(s => s.id === sid);
                          return standard ? (
                            <Badge key={sid} variant="outline">{standard.code} - {standard.title}</Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <KPIManager initiativeId={selectedInitiative.id} initiativeTitle={selectedInitiative.title} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}