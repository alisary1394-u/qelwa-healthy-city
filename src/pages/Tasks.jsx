import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, ClipboardList, Clock, CheckCircle2, AlertTriangle, ListTodo, MessageCircle } from "lucide-react";
import TaskCard from "@/components/tasks/TaskCard";
import TaskForm from "@/components/tasks/TaskForm";
import { usePermissions } from '@/hooks/usePermissions';

export default function Tasks() {
  const { permissions } = usePermissions();
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const userRole = currentUser?.user_role || currentUser?.role;
  const canEdit = userRole === 'admin' || userRole === 'chairman' || userRole === 'coordinator' || userRole === 'supervisor';

  if (!permissions.canSeeTasks) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة المهام. الصلاحيات مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = activeStatus === 'all' || 
      (activeStatus === 'overdue' ? (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed') : t.status === activeStatus);
    const matchesSearch = !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSave = async (data) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask.id, data });
    } else {
      const newTask = await createMutation.mutateAsync({ ...data, assigned_by: currentUser?.email });
      
      // Create notification for assigned user
      const assignedMember = members.find(m => m.id === data.assigned_to);
      if (assignedMember?.email) {
        await base44.entities.Notification.create({
          user_email: assignedMember.email,
          title: 'مهمة جديدة',
          message: `تم تعيين مهمة جديدة لك: ${data.title}`,
          type: 'task_assigned',
          related_id: newTask.id,
          is_read: false
        });
      }
    }
    setEditingTask(null);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'completed') {
      updateData.completion_date = new Date().toISOString().split('T')[0];
    }
    await updateMutation.mutateAsync({ id: taskId, data: updateData });
  };

  const handleDelete = async () => {
    if (deleteDialog.task) {
      await deleteMutation.mutateAsync(deleteDialog.task.id);
      setDeleteDialog({ open: false, task: null });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إدارة المهام والتذكيرات</h1>
          <p className="text-blue-100">متابعة وتنظيم مهام فريق المدينة الصحية</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <ListTodo className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-gray-500">إجمالي المهام</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-gray-500">قيد الانتظار</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ClipboardList className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.in_progress}</p>
              <p className="text-xs text-gray-500">قيد التنفيذ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-xs text-gray-500">مكتملة</p>
            </CardContent>
          </Card>
          <Card className={stats.overdue > 0 ? 'border-red-300 bg-red-50' : ''}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-xs text-gray-500">متأخرة</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="بحث في المهام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <a 
            href={base44.agents?.getWhatsAppConnectURL?.('tasks_assistant')} 
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="w-full md:w-auto bg-green-50 hover:bg-green-100 text-green-700 border-green-300">
              <MessageCircle className="w-5 h-5 ml-2" />
              تذكيرات واتساب
            </Button>
          </a>
          <Button
            onClick={() => { setEditingTask(null); setFormOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 ml-2" />
            إضافة مهمة
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus} className="mb-6">
          <TabsList className="flex-wrap h-auto gap-1 bg-white p-1">
            <TabsTrigger value="all">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending">قيد الانتظار ({stats.pending})</TabsTrigger>
            <TabsTrigger value="in_progress">قيد التنفيذ ({stats.in_progress})</TabsTrigger>
            <TabsTrigger value="completed">مكتملة ({stats.completed})</TabsTrigger>
            <TabsTrigger value="overdue" className={stats.overdue > 0 ? 'text-red-600' : ''}>
              متأخرة ({stats.overdue})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tasks Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد مهام</p>
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
                canEdit={canEdit}
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
        members={members}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المهمة "{deleteDialog.task?.title}"؟
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