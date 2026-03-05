import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, ClipboardList, Clock, CheckCircle2, AlertTriangle, ListTodo, MessageCircle, Lightbulb, Users, Filter } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import TaskForm from "@/components/tasks/TaskForm";
import { usePermissions } from '@/hooks/usePermissions';
import { sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';
import { requireSecureDeleteConfirmation } from '@/lib/secure-delete';

function parseTeamMemberIds(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((v) => String(v)).filter(Boolean);
  }
  if (typeof rawValue !== 'string') return [];
  const text = rawValue.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v)).filter(Boolean);
  } catch {
    // fallback below
  }
  return text.split(',').map((v) => v.trim()).filter(Boolean);
}

import { useSearchParams } from 'react-router-dom';

export default function Tasks() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const { permissions, role, currentMember } = usePermissions();
  const [searchParams] = useSearchParams();

  const [activeStatus, setActiveStatus] = useState(() => {
    const f = searchParams.get('filter');
    return f === 'overdue' ? 'overdue' : 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInitiative, setFilterInitiative] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.entities.Task.list('-created_date')
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: initiatives = [] } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => api.entities.Initiative.list()
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Task.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const canManageTasks = permissions.canManageTasks === true;

  const memberId = String(currentMember?.id || '');
  const memberCommitteeId = String(currentMember?.committee_id || '');
  const memberName = String(currentUser?.full_name || currentMember?.full_name || '').trim();
  const isGlobalTaskScope = role === 'governor' || role === 'coordinator';

  const accessibleInitiatives = useMemo(() => {
    if (isGlobalTaskScope) return initiatives;
    if (!currentMember) return [];

    return initiatives.filter((initiative) => {
      const initiativeCommitteeId = String(initiative?.committee_id || '');
      const linkedTeamIds = parseTeamMemberIds(initiative?.team_members);
      const leaderId = String(initiative?.leader_id || '');
      const leaderName = String(initiative?.leader_name || '').trim();

      const matchesCommittee = memberCommitteeId && initiativeCommitteeId && initiativeCommitteeId === memberCommitteeId;
      const isInTeam = memberId && linkedTeamIds.some((id) => id === memberId);
      const isLeader = memberId && leaderId && leaderId === memberId;
      const matchesLeaderName = memberName && leaderName && leaderName === memberName;

      return matchesCommittee || isInTeam || isLeader || matchesLeaderName;
    });
  }, [isGlobalTaskScope, currentMember, initiatives, memberCommitteeId, memberId, memberName]);

  const accessibleInitiativeIds = useMemo(
    () => new Set(accessibleInitiatives.map((i) => String(i.id || ''))),
    [accessibleInitiatives]
  );

  const accessibleTasks = useMemo(() => {
    if (isGlobalTaskScope) return tasks;
    if (!currentMember) return [];

    return tasks.filter((task) => {
      const taskCommitteeId = String(task?.committee_id || '');
      const taskAssigneeId = String(task?.assigned_to || '');
      const taskAssigneeName = String(task?.assigned_to_name || '').trim();
      const taskInitiativeId = String(task?.initiative_id || '');
      const taskCreator = String(task?.assigned_by || task?.created_by || '').trim();
      const myEmail = String(currentUser?.email || '').trim();

      const matchesCommittee = memberCommitteeId && taskCommitteeId && taskCommitteeId === memberCommitteeId;
      const assignedToMe = memberId && taskAssigneeId && taskAssigneeId === memberId;
      const assignedToMyName = memberName && taskAssigneeName && taskAssigneeName === memberName;
      const linkedToMyInitiative = taskInitiativeId && accessibleInitiativeIds.has(taskInitiativeId);
      const createdByMe = myEmail && taskCreator && taskCreator === myEmail;

      return matchesCommittee || assignedToMe || assignedToMyName || linkedToMyInitiative || createdByMe;
    });
  }, [isGlobalTaskScope, currentMember, tasks, memberCommitteeId, memberId, memberName, accessibleInitiativeIds, currentUser]);

  const scopedMembers = useMemo(() => {
    if (isGlobalTaskScope) return members;
    if (memberCommitteeId) return members.filter((m) => String(m.committee_id || '') === memberCommitteeId);
    return currentMember ? [currentMember] : [];
  }, [isGlobalTaskScope, members, memberCommitteeId, currentMember]);

  // الأعضاء الذين لديهم مهام
  const assigneesWithTasks = useMemo(() => {
    const map = new Map();
    accessibleTasks.forEach(task => {
      if (task.assigned_to) {
        const member = members.find(m => String(m.id) === String(task.assigned_to));
        const name = task.assigned_to_name || member?.full_name || t('common.unspecified');
        if (!map.has(task.assigned_to)) map.set(task.assigned_to, { id: task.assigned_to, name, count: 0 });
        map.get(task.assigned_to).count++;
      }
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [accessibleTasks, members, t]);

  if (!permissions.canSeeTasks) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-semibold">{t('tasks.noAccess')} {t('tasks.noAccessNote')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: accessibleTasks.length,
    pending: accessibleTasks.filter(t => t.status === 'pending').length,
    in_progress: accessibleTasks.filter(t => t.status === 'in_progress').length,
    completed: accessibleTasks.filter(t => t.status === 'completed').length,
    overdue: accessibleTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
    highPriority: accessibleTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    uniqueAssignees: new Set(accessibleTasks.map(t => t.assigned_to).filter(Boolean)).size,
  };

  const filteredTasks = accessibleTasks.filter(t => {
    const matchesStatus = activeStatus === 'all' || 
      (activeStatus === 'overdue' ? (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed') : t.status === activeStatus);

    const matchesSearch = !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInitiative = filterInitiative === 'all' || t.initiative_id === filterInitiative;
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || String(t.assigned_to) === filterAssignee;
    return matchesStatus && matchesSearch && matchesInitiative && matchesPriority && matchesAssignee;
  });

  const handleSave = async (data) => {
    if (!canManageTasks) return;
    const payload = { ...data };
    if (!payload.initiative_id) { delete payload.initiative_id; delete payload.initiative_title; }
    if (!payload.standard_id) { delete payload.standard_id; delete payload.standard_code; }
    if (!payload.document_type) delete payload.document_type;
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask.id, data: payload });
    } else {
      const newTask = await createMutation.mutateAsync({ ...payload, assigned_by: currentUser?.email });

      // Create notification for assigned user
      const assignedMember = members.find(m => m.id === data.assigned_to);
      if (assignedMember?.email) {
        await api.entities.Notification.create({
          user_email: assignedMember.email,
          title: t('tasks.addNewTask'),
          message: `${t('tasks.newTaskAssigned')}: ${data.title}`,
          type: 'task_assigned',
          related_id: newTask.id,
          is_read: false
        });
      }
    }
    setEditingTask(null);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    if (!canManageTasks) return;
    const updateData = { status: newStatus };
    if (newStatus === 'completed') {
      updateData.completion_date = new Date().toISOString().split('T')[0];
    }
    await updateMutation.mutateAsync({ id: taskId, data: updateData });
  };

  const handleDelete = async () => {
    if (!canManageTasks) return;
    if (deleteDialog.task) {
      const confirmed = await requireSecureDeleteConfirmation(`${t('tasks.deleteTask')} "${deleteDialog.task.title}"`);
      if (!confirmed) return;
      await deleteMutation.mutateAsync(deleteDialog.task.id);
      setDeleteDialog({ open: false, task: null });
    }
  };

  return (
    <div className="min-h-screen bg-muted/50" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="gradient-primary text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t('tasks.title')}</h1>
              <p className="text-white/70 text-sm mt-1">{t('tasks.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <ListTodo className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{t('tasks.totalTasks')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-700 dark:text-amber-400" />
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">{t('tasks.pendingStatus')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-6 h-6 mx-auto mb-2 text-sky-700 dark:text-sky-400" />
              <p className="text-2xl font-bold">{stats.in_progress}</p>
              <p className="text-xs text-muted-foreground">{t('tasks.inProgressStatus')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">{t('tasks.completedStatus')}</p>
            </CardContent>
          </Card>
          <Card className={stats.overdue > 0 ? 'border-destructive/30 bg-destructive/5' : ''}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
              <p className="text-xs text-muted-foreground">{t('tasks.overdueLabel')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
              <p className="text-2xl font-bold">{stats.uniqueAssignees}</p>
              <p className="text-xs text-muted-foreground">{t('tasks.assignees')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('tasks.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          {accessibleInitiatives.length > 0 && (
            <Select value={filterInitiative} onValueChange={setFilterInitiative}>
              <SelectTrigger className="w-[200px]">
                <Lightbulb className="w-4 h-4 ml-1 text-primary" />
                <SelectValue placeholder={t('tasks.selectInitiative')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allInitiatives')}</SelectItem>
                {accessibleInitiatives.map(i => (
                  <SelectItem key={i.id} value={i.id}>{i.code} - {(i.title || '').slice(0, 35)}{(i.title?.length || 0) > 35 ? '...' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 ml-1 text-amber-700 dark:text-amber-400" />
              <SelectValue placeholder={t('tasks.selectPriority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
              <SelectItem value="urgent">{t('tasks.urgentPriority')}</SelectItem>
              <SelectItem value="high">{t('tasks.highPriority')}</SelectItem>
              <SelectItem value="medium">{t('tasks.mediumPriority')}</SelectItem>
              <SelectItem value="low">{t('tasks.lowPriority')}</SelectItem>
            </SelectContent>
          </Select>
          {assigneesWithTasks.length > 1 && (
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[180px]">
                <Users className="w-4 h-4 ml-1 text-slate-600 dark:text-slate-400" />
                <SelectValue placeholder={t('tasks.assignedTo')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allMembers')}</SelectItem>
                {assigneesWithTasks.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.name} ({a.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <a 
            href={api.agents?.getWhatsAppConnectURL?.('tasks_assistant')} 
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full md:w-auto bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/30">
              <MessageCircle className="w-5 h-5 ml-2" />
              {t('tasks.whatsappReminders')}
            </Button>
          </a>
          {canManageTasks && (
            <Button
              onClick={() => { setEditingTask(null); setFormOpen(true); }}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-5 h-5 ml-2" />
              {t('tasks.addTask')}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus} className="mb-6">
          <TabsList className="flex-wrap h-auto gap-1 bg-card p-1">
            <TabsTrigger value="all">{t('tasks.allStatuses')} ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending">{t('tasks.pendingStatus')} ({stats.pending})</TabsTrigger>
            <TabsTrigger value="in_progress">{t('tasks.inProgressStatus')} ({stats.in_progress})</TabsTrigger>
            <TabsTrigger value="completed">{t('tasks.completedStatus')} ({stats.completed})</TabsTrigger>
            <TabsTrigger value="overdue" className={stats.overdue > 0 ? 'text-destructive' : ''}>
              {t('tasks.overdueLabel')} ({stats.overdue})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tasks Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('tasks.noTasks')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={(t) => { setEditingTask(t); setFormOpen(true); }}
                onDelete={(t) => setDeleteDialog({ open: true, task: t })}
                onStatusChange={handleStatusChange}
                canEdit={canManageTasks}
                initiatives={accessibleInitiatives}
                members={members}
              />
            ))}
          </div>
        )}
      </div>

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        onSave={handleSave}
        members={scopedMembers}
        initiatives={accessibleInitiatives}
        standards={sortAndDeduplicateStandardsByCode(standards)}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent dir={rtl ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tasks.confirmDeleteTask')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tasks.confirmDeleteMessage', { title: deleteDialog.task?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}