import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/apiClient';
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
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';

const roleKeys = [
  'all', 'governor', 'coordinator', 'committee_head',
  'committee_coordinator', 'committee_supervisor', 'committee_member',
  'member', 'volunteer', 'budget_manager', 'accountant', 'financial_officer'
];

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

function isBlankValue(value) {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

function isLocalSeedEmail(value) {
  return typeof value === 'string' && /@local$/i.test(value.trim());
}

export default function TeamManagement() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const [activeRole, setActiveRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, member: null });
  
  const urlParams = new URLSearchParams(window.location.search);
  const selectedCommitteeId = urlParams.get('committee') || '';
  const [activeCommittee, setActiveCommittee] = useState(selectedCommitteeId);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.TeamMember.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.TeamMember.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.TeamMember.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
  });

  const { permissions, role: userRole, currentMember: authMember } = usePermissions();
  const canAdd = permissions.canAddTeamMember === true;
  const canDelete = permissions.canDeleteTeamMember === true;
  const canAddOrEditGovernor = permissions.canAddOrEditGovernor === true;
  const canAddOrEditCoordinator = permissions.canAddOrEditCoordinator === true;
  const isGovernor = userRole === 'governor' || userRole === 'admin';
  const canEditMember = (member) => canAdd && (isGovernor || (member.role !== 'governor' && member.role !== 'coordinator'));
  const canDeleteMember = (member) => canDelete && (isGovernor || (member.role !== 'governor' && member.role !== 'coordinator'));

  const authMemberCommitteeId = String(authMember?.committee_id || '');
  const isGlobalTeamScope = userRole === 'governor' || userRole === 'coordinator';

  const scopedMembers = useMemo(() => {
    if (isGlobalTeamScope) return members;
    if (!authMember) return [];
    if (!authMemberCommitteeId) return [authMember];
    return members.filter((m) => String(m.committee_id || '') === authMemberCommitteeId);
  }, [isGlobalTeamScope, members, authMember, authMemberCommitteeId]);

  const scopedCommittees = useMemo(() => {
    if (isGlobalTeamScope) return committees;
    if (!authMemberCommitteeId) return [];
    return committees.filter((c) => String(c.id || '') === authMemberCommitteeId);
  }, [isGlobalTeamScope, committees, authMemberCommitteeId]);

  if (!permissions.canSeeTeam) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">{t('team.noAccessNote')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supervisors = scopedMembers.filter(m => 
    m.role === 'committee_head' || m.role === 'committee_supervisor' || m.role === 'coordinator' || m.role === 'governor'
  );

  const filteredMembers = scopedMembers.filter(m => {
    const matchesRole = activeRole === 'all' || m.role === activeRole;
    const matchesCommittee = !activeCommittee || m.committee_id === activeCommittee;
    const matchesSearch = !searchQuery || 
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery) ||
      m.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.national_id?.includes(searchQuery) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesCommittee && matchesSearch;
  });

  const activeCommitteeName = activeCommittee ? scopedCommittees.find(c => c.id === activeCommittee)?.name : '';

  const stats = {
    total: scopedMembers.length,
    governor: scopedMembers.filter(m => m.role === 'governor').length,
    coordinator: scopedMembers.filter(m => m.role === 'coordinator').length,
    committee_head: scopedMembers.filter(m => m.role === 'committee_head').length,
    committee_coordinator: scopedMembers.filter(m => m.role === 'committee_coordinator').length,
    committee_supervisor: scopedMembers.filter(m => m.role === 'committee_supervisor').length,
    committee_member: scopedMembers.filter(m => m.role === 'committee_member').length,
    member: scopedMembers.filter(m => m.role === 'member').length,
    volunteer: scopedMembers.filter(m => m.role === 'volunteer').length,
    budget_manager: scopedMembers.filter(m => m.role === 'budget_manager').length,
    accountant: scopedMembers.filter(m => m.role === 'accountant').length,
    financial_officer: scopedMembers.filter(m => m.role === 'financial_officer').length
  };

  const handleSave = async (data) => {
    if (editingMember) {
      if (!canEditMember(editingMember)) return;
    } else if (!canAdd) {
      return;
    }

    let payload = { ...data };
    let latestMember = editingMember || null;

    if (editingMember?.id) {
      try {
        latestMember = await api.entities.TeamMember.get(editingMember.id);
      } catch (_) {
        latestMember = editingMember;
      }
      // نرسل دائماً نسخة مدمجة مع آخر بيانات للعضو لتفادي أي Backend يستبدل السجل بالكامل.
      payload = { ...(latestMember || {}), ...data };
      delete payload.id;
    }

    if (!payload.committee_id || payload.committee_id === 'null') {
      delete payload.committee_id;
      delete payload.committee_name;
    }
    if (!payload.supervisor_id || payload.supervisor_id === 'null') {
      delete payload.supervisor_id;
    }
    if (editingMember && (payload.password === '' || payload.password == null)) {
      delete payload.password;
    }
    if (editingMember) {
      // حماية بيانات التواصل: عند تعديل المنصب/الصلاحيات لا نسمح بمسح البريد أو الهاتف بقيمة فارغة بالخطأ.
      ['email', 'phone'].forEach((field) => {
        if (isBlankValue(data[field])) {
          if (!isBlankValue(latestMember?.[field])) {
            payload[field] = latestMember[field];
          } else {
            delete payload[field];
          }
        }
      });

      // لا نسمح باستبدال بريد حقيقي بقيمة بذرة افتراضية (@local) أثناء التحديث.
      const currentEmail = latestMember?.email;
      if (isLocalSeedEmail(data.email) && !isBlankValue(currentEmail) && !isLocalSeedEmail(currentEmail)) {
        payload.email = currentEmail;
      }
    }
    try {
      if (editingMember) {
        await updateMutation.mutateAsync({ id: editingMember.id, data: payload });
        toast({ title: t('team.memberUpdated'), description: t('team.memberUpdatedDesc') });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: t('team.memberAdded'), description: t('team.memberAddedDesc') });
      }
      setEditingMember(null);
      setFormOpen(false);
    } catch (err) {
      const is404 = err?.response?.status === 404 || err?.status === 404 || (err?.message && err.message.includes('404'));
      const message = is404
        ? t('team.error404')
        : (err?.response?.data?.message || err?.message || err?.data?.message || t('team.saveFailed'));
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
      throw err;
    }
  };

  const handleEdit = async (member) => {
    if (!canEditMember(member)) return;
    setEditingMember(member);
    setFormOpen(true);

    try {
      const fullMember = await api.entities.TeamMember.get(member.id);
      if (fullMember) setEditingMember(fullMember);
    } catch (_) {
      // نتابع ببيانات القائمة عند تعذر جلب التفاصيل.
    }
  };

  const handleDelete = async () => {
    if (!canDeleteMember(deleteDialog.member || {})) return;
    if (deleteDialog.member) {
      const confirmed = await requireSecureDeleteConfirmation(`${t('team.member')} "${deleteDialog.member.full_name}"`);
      if (!confirmed) return;

      await deleteMutation.mutateAsync(deleteDialog.member.id);
      setDeleteDialog({ open: false, member: null });
    }
  };

  return (
    <div className="min-h-screen bg-muted/50" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t('team.title')}</h1>
              <p className="text-blue-100 text-sm mt-1">{t('team.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-card shadow-sm border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] p-4 text-white text-center">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-90" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm opacity-90">{t('team.totalMembers')}</p>
              </div>
            </CardContent>
          </Card>
          {Object.entries(roleIcons).map(([role, Icon]) => (
            <Card key={role} className="bg-card shadow-sm border-0 overflow-hidden">
              <CardContent className="p-4 text-center hover:shadow-md transition-shadow">
                <Icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xl font-bold">{stats[role]}</p>
                <p className="text-xs text-muted-foreground">{t('roles.' + role)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Committee Filter */}
        {scopedCommittees.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <Building className="w-5 h-5 text-muted-foreground" />
            <Select value={activeCommittee} onValueChange={setActiveCommittee}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t('team.allCommittees')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{t('team.allCommittees')}</SelectItem>
                {scopedCommittees.map(c => (
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
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('team.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          {canAdd && (
            <Button 
              onClick={() => { setEditingMember(null); setFormOpen(true); }}
              className="bg-primary hover:bg-primary/90"
            >
              <UserPlus className="w-5 h-5 ml-2" />
              {t('team.addMember')}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeRole} onValueChange={setActiveRole} className="mb-6">
          <TabsList className="flex-wrap h-auto gap-1 bg-card p-1">
            <TabsTrigger value="all">{t('team.allRoles')} ({stats.total})</TabsTrigger>
            <TabsTrigger value="governor">{t('roles.governor')} ({stats.governor})</TabsTrigger>
            <TabsTrigger value="coordinator">{t('roles.coordinator')} ({stats.coordinator})</TabsTrigger>
            <TabsTrigger value="committee_head">{t('roles.committee_head')} ({stats.committee_head})</TabsTrigger>
            <TabsTrigger value="committee_coordinator">{t('roles.committee_coordinator')} ({stats.committee_coordinator})</TabsTrigger>
            <TabsTrigger value="committee_supervisor">{t('roles.committee_supervisor')} ({stats.committee_supervisor})</TabsTrigger>
            <TabsTrigger value="committee_member">{t('roles.committee_member')} ({stats.committee_member})</TabsTrigger>
            <TabsTrigger value="member">{t('roles.member')} ({stats.member})</TabsTrigger>
            <TabsTrigger value="volunteer">{t('roles.volunteer')} ({stats.volunteer})</TabsTrigger>
            <TabsTrigger value="budget_manager">{t('roles.budget_manager')} ({stats.budget_manager})</TabsTrigger>
            <TabsTrigger value="accountant">{t('roles.accountant')} ({stats.accountant})</TabsTrigger>
            <TabsTrigger value="financial_officer">{t('roles.financial_officer')} ({stats.financial_officer})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Members Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('team.noMembers')}</p>
              {canAdd && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => { setEditingMember(null); setFormOpen(true); }}
                >
                  {t('team.addMember')}
                </Button>
              )}
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
                canEdit={canEditMember(member)}
                canDelete={canDeleteMember(member)}
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
        existingDepartments={[...new Set((scopedMembers || []).map(m => m.department).filter(Boolean))]}
        restrictedRoles={[!(canAddOrEditGovernor) && 'governor', !(canAddOrEditCoordinator) && 'coordinator'].filter(Boolean)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('team.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('team.confirmDeleteMsg', { name: deleteDialog.member?.full_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('team.deleteBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}