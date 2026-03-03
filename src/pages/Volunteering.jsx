import React, { useState, useMemo } from 'react';
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
import { Separator } from "@/components/ui/separator";
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from "@/components/ui/use-toast";
import {
  HandHelping, Plus, Search, Users, MapPin, Loader2, Eye, CheckCircle, AlertCircle,
  Clock, Calendar, Target, Building, Lightbulb, ClipboardList, UserPlus, UserCheck,
  UserX, Filter, TrendingUp, BarChart3, Star, Heart, Edit, Trash2, X, ChevronDown,
  Award, Briefcase, GraduationCap, Megaphone, Activity
} from "lucide-react";

// --- Constants ---
const OPPORTUNITY_TYPES = {
  field_survey: { label: 'مسح ميداني', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
  initiative_support: { label: 'دعم مبادرة', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50' },
  committee_work: { label: 'عمل لجنة', icon: Building, color: 'text-purple-600', bg: 'bg-purple-50' },
  community_event: { label: 'فعالية مجتمعية', icon: Megaphone, color: 'text-pink-600', bg: 'bg-pink-50' },
  training: { label: 'تدريب', icon: GraduationCap, color: 'text-[#0f766e]', bg: 'bg-emerald-50' },
  awareness: { label: 'توعية صحية', icon: Heart, color: 'text-red-500', bg: 'bg-red-50' },
  other: { label: 'أخرى', icon: Briefcase, color: 'text-gray-600', bg: 'bg-gray-50' },
};

const OPPORTUNITY_STATUS = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  open: { label: 'مفتوحة للتسجيل', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'جارية', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  closed: { label: 'مغلقة', color: 'bg-[#1e3a5f]/10 text-[#1e3a5f] border-[#1e3a5f]/20' },
  cancelled: { label: 'ملغاة', color: 'bg-red-100 text-red-700 border-red-200' },
};

const VOLUNTEER_STATUS = {
  pending: { label: 'بانتظار الموافقة', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'معتمد', color: 'bg-emerald-100 text-emerald-700', icon: UserCheck },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: UserX },
  completed: { label: 'أكمل التطوع', color: 'bg-blue-100 text-blue-700', icon: Award },
};

const PRIORITY_MAP = {
  low: { label: 'منخفضة', color: 'text-gray-500' },
  medium: { label: 'متوسطة', color: 'text-amber-500' },
  high: { label: 'عالية', color: 'text-orange-500' },
  urgent: { label: 'عاجلة', color: 'text-red-500' },
};

const emptyForm = {
  title: '', description: '', type: 'other', committee_id: '', committee_name: '',
  initiative_id: '', initiative_name: '', axis_id: '', axis_name: '',
  required_skills: '', min_volunteers: 1, max_volunteers: 10,
  start_date: '', end_date: '', location: '', status: 'draft',
  volunteers: [], priority: 'medium', notes: '',
};

export default function Volunteering() {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [assignSearch, setAssignSearch] = useState('');
  const [formData, setFormData] = useState({ ...emptyForm });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions } = usePermissions();
  const canManage = permissions.canManageVolunteering === true;

  // --- Data queries ---
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => api.auth.me() });
  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['volunteerOpportunities'],
    queryFn: () => api.entities.VolunteerOpportunity.list('-created_date'),
  });
  const { data: members = [] } = useQuery({ queryKey: ['teamMembers'], queryFn: () => api.entities.TeamMember.list() });
  const { data: committees = [] } = useQuery({ queryKey: ['committees'], queryFn: () => api.entities.Committee.list() });
  const { data: initiatives = [] } = useQuery({ queryKey: ['initiatives'], queryFn: () => api.entities.Initiative.list() });
  const { data: axes = [] } = useQuery({ queryKey: ['axes'], queryFn: () => api.entities.Axis.list('order') });
  const { data: surveys = [] } = useQuery({ queryKey: ['surveys'], queryFn: () => api.entities.FamilySurvey.list() });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.VolunteerOpportunity.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteerOpportunities'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.VolunteerOpportunity.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteerOpportunities'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.VolunteerOpportunity.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteerOpportunities'] }),
  });

  // --- Computed data ---
  const volunteers = useMemo(() => members.filter(m => m.role === 'volunteer' && m.status !== 'inactive'), [members]);

  const stats = useMemo(() => {
    const total = opportunities.length;
    const open = opportunities.filter(o => o.status === 'open').length;
    const inProgress = opportunities.filter(o => o.status === 'in_progress').length;
    const closed = opportunities.filter(o => o.status === 'closed').length;
    const allVolunteers = opportunities.flatMap(o => o.volunteers || []);
    const pendingApps = allVolunteers.filter(v => v.status === 'pending').length;
    const approvedVolunteers = allVolunteers.filter(v => v.status === 'approved' || v.status === 'completed').length;
    const totalHours = allVolunteers.reduce((sum, v) => sum + (v.hours_worked || 0), 0);
    const completedAssignments = allVolunteers.filter(v => v.status === 'completed').length;
    return { total, open, inProgress, closed, pendingApps, approvedVolunteers, totalHours, completedAssignments };
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (typeFilter !== 'all' && o.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (o.title || '').toLowerCase().includes(q) ||
          (o.description || '').toLowerCase().includes(q) ||
          (o.committee_name || '').toLowerCase().includes(q) ||
          (o.initiative_name || '').toLowerCase().includes(q) ||
          (o.location || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [opportunities, statusFilter, typeFilter, searchQuery]);

  // Volunteer stats breakdown
  const volunteerDistribution = useMemo(() => {
    const dist = {};
    opportunities.forEach(opp => {
      (opp.volunteers || []).forEach(v => {
        if (v.status === 'approved' || v.status === 'completed') {
          if (!dist[v.volunteer_id]) {
            dist[v.volunteer_id] = { name: v.volunteer_name, count: 0, hours: 0 };
          }
          dist[v.volunteer_id].count++;
          dist[v.volunteer_id].hours += (v.hours_worked || 0);
        }
      });
    });
    return Object.values(dist).sort((a, b) => b.count - a.count);
  }, [opportunities]);

  // Distribution by axis
  const axisDist = useMemo(() => {
    const map = {};
    axes.forEach(a => { map[a.id] = { name: a.name, count: 0 }; });
    opportunities.forEach(o => {
      if (o.axis_id && map[o.axis_id]) map[o.axis_id].count++;
    });
    return Object.values(map).filter(a => a.count > 0).sort((a, b) => b.count - a.count);
  }, [opportunities, axes]);

  // --- Actions ---
  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingOpp(null);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (opp) => {
    setEditingOpp(opp);
    setFormData({
      title: opp.title || '', description: opp.description || '', type: opp.type || 'other',
      committee_id: opp.committee_id || '', committee_name: opp.committee_name || '',
      initiative_id: opp.initiative_id || '', initiative_name: opp.initiative_name || '',
      axis_id: opp.axis_id || '', axis_name: opp.axis_name || '',
      required_skills: opp.required_skills || '', min_volunteers: opp.min_volunteers || 1,
      max_volunteers: opp.max_volunteers || 10, start_date: opp.start_date || '',
      end_date: opp.end_date || '', location: opp.location || '', status: opp.status || 'draft',
      volunteers: opp.volunteers || [], priority: opp.priority || 'medium', notes: opp.notes || '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      const payload = { ...formData, created_by: currentUser?.email, created_by_name: currentUser?.full_name };
      if (editingOpp) {
        await updateMutation.mutateAsync({ id: editingOpp.id, data: payload });
        toast({ title: 'تم التحديث', description: 'تم تحديث الفرصة التطوعية بنجاح.' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'تمت الإضافة', description: 'تم إنشاء الفرصة التطوعية بنجاح.' });
      }
      setFormOpen(false);
      resetForm();
    } catch (err) {
      toast({ title: 'خطأ', description: err?.message || 'فشل في الحفظ.', variant: 'destructive' });
    }
  };

  const handleDelete = async (opp) => {
    if (!canManage) return;
    if (!confirm(`هل تريد حذف الفرصة "${opp.title}"؟`)) return;
    try {
      await deleteMutation.mutateAsync(opp.id);
      toast({ title: 'تم الحذف', description: 'تم حذف الفرصة التطوعية.' });
    } catch (err) {
      toast({ title: 'خطأ', description: err?.message || 'فشل في الحذف.', variant: 'destructive' });
    }
  };

  const handleVolunteerAction = async (opp, volunteerId, newStatus) => {
    const updatedVolunteers = (opp.volunteers || []).map(v => {
      if (v.volunteer_id === volunteerId) {
        return { ...v, status: newStatus, approved_date: newStatus === 'approved' ? new Date().toISOString().split('T')[0] : v.approved_date };
      }
      return v;
    });
    try {
      await updateMutation.mutateAsync({ id: opp.id, data: { ...opp, id: undefined, volunteers: updatedVolunteers } });
      toast({ title: 'تم التحديث', description: newStatus === 'approved' ? 'تم قبول المتطوع.' : newStatus === 'rejected' ? 'تم رفض المتطوع.' : 'تم التحديث.' });
      if (selectedOpp?.id === opp.id) {
        setSelectedOpp({ ...opp, volunteers: updatedVolunteers });
      }
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في التحديث.', variant: 'destructive' });
    }
  };

  const handleAssignVolunteer = async (volunteer) => {
    if (!assignTarget) return;
    const existing = (assignTarget.volunteers || []).find(v => v.volunteer_id === volunteer.id);
    if (existing) {
      toast({ title: 'تنبيه', description: 'المتطوع مسجل بالفعل في هذه الفرصة.', variant: 'destructive' });
      return;
    }
    const updatedVolunteers = [
      ...(assignTarget.volunteers || []),
      {
        volunteer_id: volunteer.id,
        volunteer_name: volunteer.full_name,
        volunteer_phone: volunteer.phone || '',
        status: 'approved',
        applied_date: new Date().toISOString().split('T')[0],
        approved_date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        notes: '',
      }
    ];
    try {
      await updateMutation.mutateAsync({ id: assignTarget.id, data: { ...assignTarget, id: undefined, volunteers: updatedVolunteers } });
      setAssignTarget({ ...assignTarget, volunteers: updatedVolunteers });
      toast({ title: 'تم التعيين', description: `تم تعيين ${volunteer.full_name} في الفرصة.` });
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في التعيين.', variant: 'destructive' });
    }
  };

  const handleApplyToOpportunity = async (opp) => {
    if (!currentUser) return;
    const existing = (opp.volunteers || []).find(v => v.volunteer_id === currentUser.email || v.volunteer_id === currentUser.id);
    if (existing) {
      toast({ title: 'تنبيه', description: 'أنت مسجل بالفعل في هذه الفرصة.' });
      return;
    }
    const updatedVolunteers = [
      ...(opp.volunteers || []),
      {
        volunteer_id: currentUser.email || currentUser.id,
        volunteer_name: currentUser.full_name,
        volunteer_phone: '',
        status: 'pending',
        applied_date: new Date().toISOString().split('T')[0],
        hours_worked: 0,
        notes: '',
      }
    ];
    try {
      await updateMutation.mutateAsync({ id: opp.id, data: { ...opp, id: undefined, volunteers: updatedVolunteers } });
      toast({ title: 'تم التسجيل', description: 'تم تسجيلك في الفرصة التطوعية بنجاح. بانتظار الموافقة.' });
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في التسجيل.', variant: 'destructive' });
    }
  };

  const handleUpdateHours = async (opp, volunteerId, hours) => {
    const updatedVolunteers = (opp.volunteers || []).map(v => {
      if (v.volunteer_id === volunteerId) return { ...v, hours_worked: parseFloat(hours) || 0 };
      return v;
    });
    try {
      await updateMutation.mutateAsync({ id: opp.id, data: { ...opp, id: undefined, volunteers: updatedVolunteers } });
    } catch (_) { /* silent */ }
  };

  // Get related surveys count for a volunteer
  const getVolunteerSurveyCount = (volunteerId) => {
    return surveys.filter(s => s.surveyor_id === volunteerId).length;
  };

  // Filterable volunteers for assign dialog
  const filteredAssignVolunteers = useMemo(() => {
    if (!assignTarget) return [];
    const assignedIds = new Set((assignTarget.volunteers || []).map(v => v.volunteer_id));
    let list = members.filter(m => !assignedIds.has(m.id) && !assignedIds.has(m.email));
    if (assignSearch) {
      const q = assignSearch.toLowerCase();
      list = list.filter(m => (m.full_name || '').toLowerCase().includes(q) || (m.phone || '').includes(q));
    }
    return list;
  }, [members, assignTarget, assignSearch]);

  // All pending applications across all opportunities
  const allPendingApplications = useMemo(() => {
    const results = [];
    opportunities.forEach(opp => {
      (opp.volunteers || []).forEach(v => {
        if (v.status === 'pending') {
          results.push({ ...v, opportunityId: opp.id, opportunityTitle: opp.title, opportunity: opp });
        }
      });
    });
    return results;
  }, [opportunities]);

  // Helper to update form selects
  const handleCommitteeChange = (id) => {
    const c = committees.find(c => c.id === id);
    setFormData(prev => ({ ...prev, committee_id: id, committee_name: c?.name || '' }));
  };
  const handleInitiativeChange = (id) => {
    const i = initiatives.find(i => i.id === id);
    setFormData(prev => ({ ...prev, initiative_id: id, initiative_name: i?.title || '' }));
  };
  const handleAxisChange = (id) => {
    const a = axes.find(a => a.id === id);
    setFormData(prev => ({ ...prev, axis_id: id, axis_name: a?.name || '' }));
  };

  const getApprovedCount = (opp) => (opp.volunteers || []).filter(v => v.status === 'approved' || v.status === 'completed').length;
  const getPendingCount = (opp) => (opp.volunteers || []).filter(v => v.status === 'pending').length;

  if (!permissions.canSeeVolunteering) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md"><CardContent className="p-6 text-center">
          <p className="text-destructive font-semibold">غير مصرح لك بالوصول إلى صفحة التطوع.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50" dir="rtl">
      {/* Header */}
      <div className="gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <HandHelping className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">إدارة التطوع</h1>
                <p className="text-white/70 text-sm mt-1">الفرص التطوعية — إدارة المتطوعين — الأدوار والتوزيع</p>
              </div>
            </div>
            {canManage && (
              <Button onClick={openCreateForm} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
                <Plus className="w-5 h-5 ml-2" />
                فرصة تطوعية جديدة
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-t-4 border-t-[#1e3a5f] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1e3a5f]">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الفرص</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{stats.approvedVolunteers}</p>
                  <p className="text-xs text-muted-foreground">متطوع فعّال</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.pendingApps}</p>
                  <p className="text-xs text-muted-foreground">طلب بانتظار</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-[#0f766e] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0f766e]/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[#0f766e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0f766e]">{stats.totalHours}</p>
                  <p className="text-xs text-muted-foreground">ساعة تطوعية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Distribution by Type */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#1e3a5f]">
                  <BarChart3 className="w-5 h-5" />
                  توزيع الفرص حسب النوع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(OPPORTUNITY_TYPES).map(([key, { label, icon: Icon, color, bg }]) => {
                    const count = opportunities.filter(o => o.type === key).length;
                    if (count === 0) return null;
                    const pct = Math.max((count / stats.total) * 100, 8);
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className="font-medium flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${color}`} />
                            {label}
                          </span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(135deg, #0f766e, #1e3a5f)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Distribution by Axis */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#1e3a5f]">
                  <TrendingUp className="w-5 h-5" />
                  الفرص حسب المحور
                </CardTitle>
              </CardHeader>
              <CardContent>
                {axisDist.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد فرص مربوطة بمحاور</p>
                ) : (
                  <div className="space-y-3">
                    {axisDist.map(({ name, count }) => {
                      const maxC = axisDist[0]?.count || 1;
                      const pct = Math.max((count / maxC) * 100, 8);
                      return (
                        <div key={name}>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-medium">{name}</span>
                            <span className="text-muted-foreground">{count} فرص</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(135deg, #1e3a5f, #0f766e)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="opportunities" className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white">
              الفرص التطوعية ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="volunteers" className="data-[state=active]:bg-[#0f766e] data-[state=active]:text-white">
              المتطوعون ({volunteers.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              الطلبات ({stats.pendingApps})
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              لوحة الشرف ({volunteerDistribution.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* TAB: Opportunities */}
        {activeTab === 'opportunities' && (
          <>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input placeholder="بحث في الفرص..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-muted-foreground" /><SelectValue placeholder="الحالة" /></div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {Object.entries(OPPORTUNITY_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-muted-foreground" /><SelectValue placeholder="النوع" /></div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {Object.entries(OPPORTUNITY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Opportunities list */}
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1e3a5f]" />
                <p className="text-sm text-muted-foreground mt-2">جاري تحميل الفرص...</p>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <Card className="text-center py-16 shadow-sm">
                <CardContent>
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mb-4">
                    <HandHelping className="w-10 h-10 text-[#1e3a5f]/40" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-1">لا توجد فرص تطوعية</p>
                  <p className="text-sm text-muted-foreground/70">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' ? 'جرب تغيير معايير البحث' : 'ابدأ بإنشاء أول فرصة تطوعية'}
                  </p>
                  {canManage && !searchQuery && statusFilter === 'all' && (
                    <Button onClick={openCreateForm} className="mt-4 gradient-primary text-white">
                      <Plus className="w-5 h-5 ml-2" />
                      فرصة تطوعية جديدة
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOpportunities.map(opp => {
                  const typeInfo = OPPORTUNITY_TYPES[opp.type] || OPPORTUNITY_TYPES.other;
                  const statusInfo = OPPORTUNITY_STATUS[opp.status] || OPPORTUNITY_STATUS.draft;
                  const TypeIcon = typeInfo.icon;
                  const approved = getApprovedCount(opp);
                  const pending = getPendingCount(opp);
                  const capacityPct = opp.max_volunteers > 0 ? Math.round((approved / opp.max_volunteers) * 100) : 0;

                  return (
                    <Card key={opp.id} className="hover:shadow-lg transition-all border-r-4 group"
                      style={{ borderRightColor: opp.status === 'open' ? '#0f766e' : opp.status === 'in_progress' ? '#1e3a5f' : opp.status === 'closed' ? '#6b7280' : '#d1d5db' }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-lg ${typeInfo.bg} flex items-center justify-center`}>
                              <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-[#1e3a5f] text-sm leading-tight">{opp.title}</h3>
                              <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
                            </div>
                          </div>
                          <Badge className={`text-xs border ${statusInfo.color}`}>{statusInfo.label}</Badge>
                        </div>

                        {opp.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opp.description}</p>
                        )}

                        <div className="space-y-1.5 text-xs mb-3">
                          {opp.committee_name && (
                            <div className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-purple-500" /><span>{opp.committee_name}</span></div>
                          )}
                          {opp.initiative_name && (
                            <div className="flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500" /><span>{opp.initiative_name}</span></div>
                          )}
                          {opp.axis_name && (
                            <div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-[#0f766e]" /><span>{opp.axis_name}</span></div>
                          )}
                          {opp.location && (
                            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-400" /><span>{opp.location}</span></div>
                          )}
                          {(opp.start_date || opp.end_date) && (
                            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /><span>{opp.start_date || '?'} — {opp.end_date || '?'}</span></div>
                          )}
                        </div>

                        {/* Capacity bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{approved}/{opp.max_volunteers || '∞'} متطوع</span>
                            {pending > 0 && <span className="text-amber-600">{pending} طلب</span>}
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(capacityPct, 100)}%`, background: capacityPct >= 100 ? '#dc2626' : 'linear-gradient(135deg, #0f766e, #1e3a5f)' }} />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t">
                          <Button variant="outline" size="sm" className="flex-1 text-xs hover:bg-[#1e3a5f]/5"
                            onClick={() => { setSelectedOpp(opp); setViewOpen(true); }}>
                            <Eye className="w-3.5 h-3.5 ml-1" />عرض
                          </Button>
                          {opp.status === 'open' && !canManage && (
                            <Button size="sm" className="flex-1 text-xs bg-[#0f766e] hover:bg-[#0f766e]/90 text-white"
                              onClick={() => handleApplyToOpportunity(opp)}>
                              <UserPlus className="w-3.5 h-3.5 ml-1" />تسجيل
                            </Button>
                          )}
                          {canManage && (
                            <>
                              <Button variant="outline" size="sm" className="text-xs" onClick={() => openEditForm(opp)}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-xs text-red-500 hover:text-red-700" onClick={() => handleDelete(opp)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB: Volunteers */}
        {activeTab === 'volunteers' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {volunteers.length === 0 ? (
                <Card className="col-span-full text-center py-12">
                  <CardContent>
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">لا يوجد متطوعون مسجلون</p>
                  </CardContent>
                </Card>
              ) : volunteers.map(vol => {
                const assignedOpps = opportunities.filter(o =>
                  (o.volunteers || []).some(v => (v.volunteer_id === vol.id || v.volunteer_id === vol.email) && (v.status === 'approved' || v.status === 'completed'))
                );
                const totalHours = assignedOpps.reduce((sum, o) => {
                  const v = (o.volunteers || []).find(v => v.volunteer_id === vol.id || v.volunteer_id === vol.email);
                  return sum + (v?.hours_worked || 0);
                }, 0);
                const surveyCount = getVolunteerSurveyCount(vol.email);

                return (
                  <Card key={vol.id} className="hover:shadow-md transition-shadow border-r-4 border-r-[#0f766e]">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg">
                          {(vol.full_name || '?')[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1e3a5f]">{vol.full_name}</h3>
                          <p className="text-xs text-muted-foreground">{vol.phone || vol.email || ''}</p>
                        </div>
                      </div>

                      {vol.specialization && (
                        <Badge variant="outline" className="mb-2 text-xs">{vol.specialization}</Badge>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t">
                        <div>
                          <p className="text-lg font-bold text-[#1e3a5f]">{assignedOpps.length}</p>
                          <p className="text-xs text-muted-foreground">فرص</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[#0f766e]">{totalHours}</p>
                          <p className="text-xs text-muted-foreground">ساعة</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-amber-600">{surveyCount}</p>
                          <p className="text-xs text-muted-foreground">استبيان</p>
                        </div>
                      </div>

                      {assignedOpps.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">الفرص المعينة:</p>
                          <div className="flex flex-wrap gap-1">
                            {assignedOpps.slice(0, 3).map(o => (
                              <Badge key={o.id} variant="outline" className="text-xs bg-[#1e3a5f]/5 text-[#1e3a5f]">{o.title}</Badge>
                            ))}
                            {assignedOpps.length > 3 && <Badge variant="outline" className="text-xs">+{assignedOpps.length - 3}</Badge>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: Applications */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {allPendingApplications.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-500/40 mb-3" />
                  <p className="text-muted-foreground">لا توجد طلبات بانتظار المراجعة</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allPendingApplications.map((app, idx) => (
                  <Card key={idx} className="border-r-4 border-r-amber-400 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#1e3a5f]">{app.volunteer_name}</h4>
                          <p className="text-xs text-muted-foreground">تقدم لـ: {app.opportunityTitle}</p>
                          <p className="text-xs text-muted-foreground">تاريخ التقديم: {app.applied_date}</p>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={() => handleVolunteerAction(app.opportunity, app.volunteer_id, 'approved')}>
                            <UserCheck className="w-4 h-4 ml-1" />قبول
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 text-xs"
                            onClick={() => handleVolunteerAction(app.opportunity, app.volunteer_id, 'rejected')}>
                            <UserX className="w-4 h-4 ml-1" />رفض
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            {volunteerDistribution.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Award className="w-12 h-12 mx-auto text-amber-400/40 mb-3" />
                  <p className="text-muted-foreground">لا توجد بيانات متطوعين بعد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {volunteerDistribution.map((vol, idx) => (
                  <Card key={vol.name + idx} className={`hover:shadow-md transition-shadow ${idx === 0 ? 'border-r-4 border-r-amber-400' : idx === 1 ? 'border-r-4 border-r-gray-400' : idx === 2 ? 'border-r-4 border-r-orange-400' : ''}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-[#1e3a5f]'}`}>
                          {idx < 3 ? (
                            <Award className="w-5 h-5" />
                          ) : (
                            <span className="text-sm">{idx + 1}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#1e3a5f]">{vol.name}</h4>
                          <p className="text-xs text-muted-foreground">{vol.count} فرص مشارك فيها</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-[#0f766e]">{vol.hours}</p>
                        <p className="text-xs text-muted-foreground">ساعة تطوعية</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1e3a5f] flex items-center gap-2">
              <HandHelping className="w-5 h-5" />
              {editingOpp ? 'تعديل الفرصة التطوعية' : 'فرصة تطوعية جديدة'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 mt-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2 bg-[#1e3a5f]/5 p-2 rounded">
                <Target className="w-4 h-4" />
                المعلومات الأساسية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>عنوان الفرصة *</Label>
                  <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} required placeholder="مثال: مسح ميداني لحي الشمال" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>الوصف</Label>
                  <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="وصف تفصيلي للفرصة التطوعية..." />
                </div>
                <div className="space-y-2">
                  <Label>نوع الفرصة</Label>
                  <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPPORTUNITY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OPPORTUNITY_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الموقع</Label>
                  <Input value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="مثال: حي المركز" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Links to Axes, Committees, Initiatives */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#0f766e] flex items-center gap-2 bg-[#0f766e]/5 p-2 rounded">
                <Building className="w-4 h-4" />
                الربط بالمحاور واللجان والمبادرات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>المحور</Label>
                  <Select value={formData.axis_id || 'none'} onValueChange={v => handleAxisChange(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المحور" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون محور</SelectItem>
                      {axes.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>اللجنة</Label>
                  <Select value={formData.committee_id || 'none'} onValueChange={v => handleCommitteeChange(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="اختر اللجنة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون لجنة</SelectItem>
                      {committees.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المبادرة</Label>
                  <Select value={formData.initiative_id || 'none'} onValueChange={v => handleInitiativeChange(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="اختر المبادرة" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مبادرة</SelectItem>
                      {initiatives.map(i => <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Capacity & Schedule */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2 bg-[#1e3a5f]/5 p-2 rounded">
                <Calendar className="w-4 h-4" />
                السعة والجدول الزمني
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>الحد الأدنى للمتطوعين</Label>
                  <Input type="number" min="0" value={formData.min_volunteers} onChange={e => setFormData(p => ({ ...p, min_volunteers: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>الحد الأقصى للمتطوعين</Label>
                  <Input type="number" min="0" value={formData.max_volunteers} onChange={e => setFormData(p => ({ ...p, max_volunteers: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ البداية</Label>
                  <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء</Label>
                  <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>المهارات المطلوبة</Label>
                <Textarea value={formData.required_skills} onChange={e => setFormData(p => ({ ...p, required_skills: e.target.value }))} rows={2} placeholder="مثال: مهارات تواصل، استخدام تطبيقات الهاتف..." />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" className="bg-[#0f766e] hover:bg-[#0f766e]/90 text-white">
                {editingOpp ? 'تحديث' : 'إنشاء الفرصة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Opportunity Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1e3a5f] flex items-center gap-2">
              <Eye className="w-5 h-5" />
              تفاصيل الفرصة التطوعية
            </DialogTitle>
          </DialogHeader>
          {selectedOpp && (() => {
            const typeInfo = OPPORTUNITY_TYPES[selectedOpp.type] || OPPORTUNITY_TYPES.other;
            const statusInfo = OPPORTUNITY_STATUS[selectedOpp.status] || OPPORTUNITY_STATUS.draft;
            const TypeIcon = typeInfo.icon;
            const volList = selectedOpp.volunteers || [];

            return (
              <div className="space-y-4 mt-4">
                {/* Header info */}
                <Card className="border-r-4 border-r-[#1e3a5f]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl ${typeInfo.bg} flex items-center justify-center`}>
                        <TypeIcon className={`w-6 h-6 ${typeInfo.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#1e3a5f] text-lg">{selectedOpp.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge className={`text-xs border ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                          {selectedOpp.priority && (
                            <Badge variant="outline" className={`text-xs ${PRIORITY_MAP[selectedOpp.priority]?.color}`}>
                              {PRIORITY_MAP[selectedOpp.priority]?.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedOpp.description && <p className="text-sm text-muted-foreground">{selectedOpp.description}</p>}
                    <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                      {selectedOpp.axis_name && <div className="flex items-center gap-1.5"><Target className="w-4 h-4 text-[#0f766e]" /><span>المحور: <strong>{selectedOpp.axis_name}</strong></span></div>}
                      {selectedOpp.committee_name && <div className="flex items-center gap-1.5"><Building className="w-4 h-4 text-purple-500" /><span>اللجنة: <strong>{selectedOpp.committee_name}</strong></span></div>}
                      {selectedOpp.initiative_name && <div className="flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-500" /><span>المبادرة: <strong>{selectedOpp.initiative_name}</strong></span></div>}
                      {selectedOpp.location && <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-400" /><span>الموقع: <strong>{selectedOpp.location}</strong></span></div>}
                      {selectedOpp.start_date && <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-muted-foreground" /><span>البداية: <strong>{selectedOpp.start_date}</strong></span></div>}
                      {selectedOpp.end_date && <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-muted-foreground" /><span>الانتهاء: <strong>{selectedOpp.end_date}</strong></span></div>}
                    </div>
                    {selectedOpp.required_skills && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                        <span className="font-medium">المهارات المطلوبة: </span>{selectedOpp.required_skills}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Volunteers in this opportunity */}
                <Card className="border-r-4 border-r-[#0f766e]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-[#0f766e] flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        المتطوعون ({volList.length})
                      </CardTitle>
                      {canManage && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => { setAssignTarget(selectedOpp); setAssignSearch(''); setAssignOpen(true); }}>
                          <UserPlus className="w-4 h-4 ml-1" />تعيين متطوع
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {volList.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">لا يوجد متطوعون مسجلون بعد</p>
                    ) : (
                      <div className="space-y-3">
                        {volList.map((v, idx) => {
                          const vStatus = VOLUNTEER_STATUS[v.status] || VOLUNTEER_STATUS.pending;
                          const VIcon = vStatus.icon;
                          return (
                            <div key={v.volunteer_id + idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">
                                  {(v.volunteer_name || '?')[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{v.volunteer_name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge className={`text-xs ${vStatus.color}`}><VIcon className="w-3 h-3 ml-1" />{vStatus.label}</Badge>
                                    {v.applied_date && <span>تقدم: {v.applied_date}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {canManage && (v.status === 'approved' || v.status === 'completed') && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Input type="number" className="w-16 h-7 text-center text-xs" min="0" step="0.5"
                                      defaultValue={v.hours_worked || 0}
                                      onBlur={e => handleUpdateHours(selectedOpp, v.volunteer_id, e.target.value)} />
                                    <span className="text-muted-foreground">ساعة</span>
                                  </div>
                                )}
                                {canManage && v.status === 'pending' && (
                                  <div className="flex gap-1">
                                    <Button size="sm" className="h-7 px-2 bg-emerald-600 text-white text-xs"
                                      onClick={() => handleVolunteerAction(selectedOpp, v.volunteer_id, 'approved')}>
                                      <UserCheck className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 text-xs"
                                      onClick={() => handleVolunteerAction(selectedOpp, v.volunteer_id, 'rejected')}>
                                      <UserX className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                                {canManage && v.status === 'approved' && (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-blue-600"
                                    onClick={() => handleVolunteerAction(selectedOpp, v.volunteer_id, 'completed')}>
                                    <Award className="w-3.5 h-3.5 ml-1" />أكمل
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Assign Volunteer Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              تعيين متطوع — {assignTarget?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الهاتف..." value={assignSearch} onChange={e => setAssignSearch(e.target.value)} className="pr-9" />
            </div>
            {filteredAssignVolunteers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد أعضاء متاحون للتعيين</p>
            ) : (
              <div className="space-y-2">
                {filteredAssignVolunteers.slice(0, 20).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] font-bold text-sm">
                        {(m.full_name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.role === 'volunteer' ? 'متطوع' : m.role || ''} {m.phone ? `• ${m.phone}` : ''}</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-[#0f766e] hover:bg-[#0f766e]/90 text-white text-xs"
                      onClick={() => handleAssignVolunteer(m)}>
                      <UserPlus className="w-3.5 h-3.5 ml-1" />تعيين
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
