import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Search, Users, Crown, UserCog, Eye, HandHelping, Building, X, DollarSign, Calculator, Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import MemberCard from "@/components/team/MemberCard";
import MemberForm from "@/components/team/MemberForm";
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS_BY_ROLE, ROLE_LABELS } from '@/lib/permissions';

const roleLabels = {
  all: "الجميع",
  governor: "المشرف العام",
  coordinator: "منسق المدينة الصحية",
  committee_head: "رؤساء اللجان",
  committee_coordinator: "منسقو اللجان",
  committee_supervisor: "مشرفو اللجان",
  committee_member: "أعضاء اللجان",
  member: "الأعضاء",
  volunteer: "المتطوعين",
  budget_manager: "مديرو الميزانية",
  accountant: "المحاسبون",
  financial_officer: "الموظفون الماليون"
};

const roleIcons = {
  governor: Crown,
  coordinator: UserCog,
  committee_head: Users,
  committee_coordinator: UserCog,
  committee_supervisor: Users,
  committee_member: Users,
  member: Eye,
  volunteer: HandHelping,
  budget_manager: DollarSign,
  accountant: Calculator,
  financial_officer: Briefcase
};

const PERMISSION_SUMMARY_KEYS = [
  { key: 'canManageSettings', label: 'إعدادات المدينة' },
  { key: 'canManageTeam', label: 'إدارة الفريق' },
  { key: 'canManageStandards', label: 'إدارة المعايير' },
  { key: 'canManageBudget', label: 'إدارة الميزانية' },
  { key: 'canApproveTransactions', label: 'اعتماد معاملات' },
  { key: 'canCreateTransactions', label: 'إنشاء معاملات' },
  { key: 'canViewFinancials', label: 'عرض المالية' },
  { key: 'canManageCommittees', label: 'إدارة اللجان' },
  { key: 'canManageInitiatives', label: 'إدارة المبادرات' },
  { key: 'canVerifySurvey', label: 'التحقق من الاستبيانات' },
];

export default function TeamManagement() {
  const [activeRole, setActiveRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, member: null });
  const [showPermissionsReview, setShowPermissionsReview] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const selectedCommitteeId = urlParams.get('committee') || '';
  const [activeCommittee, setActiveCommittee] = useState(selectedCommitteeId);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => base44.entities.Committee.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
  });

  const { permissions } = usePermissions();
  const canEdit = permissions.canManageTeam;

  if (!permissions.canSeeTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة الفريق. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supervisors = members.filter(m => 
    m.role === 'committee_head' || m.role === 'committee_supervisor' || m.role === 'coordinator' || m.role === 'governor'
  );

  const filteredMembers = members.filter(m => {
    const matchesRole = activeRole === 'all' || m.role === activeRole;
    const matchesCommittee = !activeCommittee || m.committee_id === activeCommittee;
    const matchesSearch = !searchQuery || 
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery) ||
      m.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesCommittee && matchesSearch;
  });

  const activeCommitteeName = activeCommittee ? committees.find(c => c.id === activeCommittee)?.name : '';

  const stats = {
    total: members.length,
    governor: members.filter(m => m.role === 'governor').length,
    coordinator: members.filter(m => m.role === 'coordinator').length,
    committee_head: members.filter(m => m.role === 'committee_head').length,
    committee_coordinator: members.filter(m => m.role === 'committee_coordinator').length,
    committee_supervisor: members.filter(m => m.role === 'committee_supervisor').length,
    committee_member: members.filter(m => m.role === 'committee_member').length,
    member: members.filter(m => m.role === 'member').length,
    volunteer: members.filter(m => m.role === 'volunteer').length,
    budget_manager: members.filter(m => m.role === 'budget_manager').length,
    accountant: members.filter(m => m.role === 'accountant').length,
    financial_officer: members.filter(m => m.role === 'financial_officer').length
  };

  const handleSave = async (data) => {
    const payload = { ...data };
    if (!payload.committee_id || payload.committee_id === 'null') {
      delete payload.committee_id;
      delete payload.committee_name;
    }
    if (!payload.supervisor_id || payload.supervisor_id === 'null') {
      delete payload.supervisor_id;
    }
    try {
      if (editingMember) {
        await updateMutation.mutateAsync({ id: editingMember.id, data: payload });
        toast({ title: 'تم التحديث', description: 'تم تحديث بيانات العضو بنجاح.' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'تمت الإضافة', description: 'تم إضافة العضو الجديد بنجاح.' });
      }
      setEditingMember(null);
      setFormOpen(false);
    } catch (err) {
      const is404 = err?.response?.status === 404 || err?.status === 404 || (err?.message && err.message.includes('404'));
      const message = is404
        ? 'خطأ 404: تأكد من ملف .env.local (VITE_BASE44_APP_ID و VITE_BASE44_APP_BASE_URL من لوحة Base44)، ثم نفّذ: npx base44 entities push'
        : (err?.response?.data?.message || err?.message || err?.data?.message || 'فشل في الحفظ.');
      toast({ title: 'خطأ', description: message, variant: 'destructive' });
      throw err;
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteDialog.member) {
      await deleteMutation.mutateAsync(deleteDialog.member.id);
      setDeleteDialog({ open: false, member: null });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إدارة فريق المدينة الصحية</h1>
          <p className="text-blue-100">محافظة قلوة - برنامج المدن الصحية</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* مراجعة الصلاحيات حسب المنصب */}
        <Card className="mb-6 border-blue-100 bg-blue-50/50">
          <CardHeader
            className="cursor-pointer flex flex-row items-center justify-between py-4"
            onClick={() => setShowPermissionsReview(!showPermissionsReview)}
          >
            <CardTitle className="text-lg">مراجعة الصلاحيات حسب المنصب</CardTitle>
            <span className="text-sm text-gray-500">{showPermissionsReview ? '▼ إخفاء' : '▶ عرض'}</span>
          </CardHeader>
          {showPermissionsReview && (
            <CardContent className="pt-0 overflow-x-auto">
              <p className="text-sm text-gray-600 mb-3">كل منصب له صلاحيات محددة في التطبيق. الجدول التالي يلخص من يملك أي صلاحية.</p>
              <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-right">المنصب</th>
                    {PERMISSION_SUMMARY_KEYS.map(({ label }) => (
                      <th key={label} className="border p-2 text-center">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['governor', 'coordinator', 'committee_head', 'committee_coordinator', 'committee_supervisor', 'committee_member', 'budget_manager', 'accountant', 'financial_officer', 'member', 'volunteer'].map((roleKey) => {
                    const p = PERMISSIONS_BY_ROLE[roleKey];
                    if (!p) return null;
                    return (
                      <tr key={roleKey} className="hover:bg-gray-50">
                        <td className="border p-2 font-medium">{p.label}</td>
                        {PERMISSION_SUMMARY_KEYS.map(({ key }) => (
                          <td key={key} className="border p-2 text-center">
                            {p[key] ? <span className="text-green-600">✓</span> : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          )}
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">إجمالي الأعضاء</p>
            </CardContent>
          </Card>
          {Object.entries(roleIcons).map(([role, Icon]) => (
            <Card key={role} className="bg-white">
              <CardContent className="p-4 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="text-xl font-bold">{stats[role]}</p>
                <p className="text-xs text-gray-500">{roleLabels[role]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Committee Filter */}
        {committees.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <Building className="w-5 h-5 text-gray-500" />
            <Select value={activeCommittee} onValueChange={setActiveCommittee}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="جميع اللجان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>جميع اللجان</SelectItem>
                {committees.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeCommittee && (
              <Button variant="ghost" size="sm" onClick={() => setActiveCommittee('')}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="بحث بالاسم أو الهاتف أو القسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button 
            onClick={() => { setEditingMember(null); setFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-5 h-5 ml-2" />
            إضافة عضو جديد
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeRole} onValueChange={setActiveRole} className="mb-6">
          <TabsList className="flex-wrap h-auto gap-1 bg-white p-1">
            <TabsTrigger value="all">الجميع ({stats.total})</TabsTrigger>
            <TabsTrigger value="governor">المشرف العام ({stats.governor})</TabsTrigger>
            <TabsTrigger value="coordinator">المنسق ({stats.coordinator})</TabsTrigger>
            <TabsTrigger value="committee_head">رؤساء اللجان ({stats.committee_head})</TabsTrigger>
            <TabsTrigger value="committee_coordinator">منسقو اللجان ({stats.committee_coordinator})</TabsTrigger>
            <TabsTrigger value="committee_supervisor">مشرفو اللجان ({stats.committee_supervisor})</TabsTrigger>
            <TabsTrigger value="committee_member">أعضاء اللجان ({stats.committee_member})</TabsTrigger>
            <TabsTrigger value="member">الأعضاء ({stats.member})</TabsTrigger>
            <TabsTrigger value="volunteer">المتطوعين ({stats.volunteer})</TabsTrigger>
            <TabsTrigger value="budget_manager">مدير الميزانية ({stats.budget_manager})</TabsTrigger>
            <TabsTrigger value="accountant">المحاسبون ({stats.accountant})</TabsTrigger>
            <TabsTrigger value="financial_officer">الموظفون الماليون ({stats.financial_officer})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Members Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">جاري التحميل...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا يوجد أعضاء</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { setEditingMember(null); setFormOpen(true); }}
              >
                إضافة عضو جديد
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onDelete={(m) => setDeleteDialog({ open: true, member: m })}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Member Form Dialog */}
      <MemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editingMember}
        onSave={handleSave}
        supervisors={supervisors}
        committees={committees}
        selectedCommitteeId={activeCommittee}
        existingDepartments={[...new Set((members || []).map(m => m.department).filter(Boolean))]}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العضو "{deleteDialog.member?.full_name}"؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}