import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Edit, Trash2, CheckCircle, AlertCircle, Lightbulb, Target, Play, RotateCcw } from "lucide-react";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documentTypes";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import T from "@/components/T";

const ROLE_LABELS_AR = {
  governor: 'المشرف العام',
  coordinator: 'منسق',
  committee_head: 'رئيس لجنة',
  committee_coordinator: 'منسق لجنة',
  committee_supervisor: 'مشرف',
  committee_member: 'عضو',
  member: 'عضو',
  volunteer: 'متطوع',
  budget_manager: 'مدير ميزانية',
  accountant: 'محاسب',
  financial_officer: 'مسؤول مالي',
};

const priorityConfig = {
  low: { label: "منخفضة", color: "bg-muted text-foreground", dot: "bg-gray-400" },
  medium: { label: "متوسطة", color: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  high: { label: "عالية", color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  urgent: { label: "عاجلة", color: "bg-red-100 text-red-800", dot: "bg-red-500" }
};

const statusConfig = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800", border: "border-yellow-300" },
  in_progress: { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-800", border: "border-blue-300" },
  completed: { label: "مكتملة", color: "bg-green-100 text-green-800", border: "border-green-300" },
  cancelled: { label: "ملغاة", color: "bg-muted text-foreground", border: "border-border" }
};

const categoryLabels = {
  field_work: "عمل ميداني",
  meeting: "اجتماع",
  report: "تقرير",
  survey: "مسح",
  training: "تدريب",
  other: "أخرى"
};

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, canEdit, initiatives = [], members = [] }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const initiativeTitle = task.initiative_title || (task.initiative_id && initiatives.find(i => i.id === task.initiative_id)?.title);
  const assignedMember = members.find(m => String(m.id) === String(task.assigned_to));
  const assigneeName = task.assigned_to_name || assignedMember?.full_name || 'غير محدد';
  const assigneeRole = assignedMember?.role;
  const assigneeInitial = (assigneeName || '').charAt(0);

  const dueLabel = task.due_date
    ? (() => {
        try {
          const d = new Date(task.due_date);
          const distance = formatDistanceToNow(d, { locale: ar, addSuffix: true });
          return { text: format(d, 'dd MMMM yyyy', { locale: ar }), distance };
        } catch { return { text: task.due_date, distance: '' }; }
      })()
    : null;

  return (
    <Card className={`hover:shadow-lg transition-all ${isOverdue ? 'border-red-300 bg-red-50/50' : ''} ${statusConfig[task.status]?.border || ''}`}>
      <CardContent className="p-4">
        {/* Header: Title + priority dot + actions */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isOverdue && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
              <div className={`w-2 h-2 rounded-full shrink-0 ${priorityConfig[task.priority]?.dot || 'bg-gray-400'}`} title={priorityConfig[task.priority]?.label} />
              <h3 className="font-semibold text-base truncate"><T>{task.title}</T></h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge className={`text-[10px] px-1.5 py-0.5 ${statusConfig[task.status]?.color}`}>
                {statusConfig[task.status]?.label}
              </Badge>
              <Badge className={`text-[10px] px-1.5 py-0.5 ${priorityConfig[task.priority]?.color}`}>
                {priorityConfig[task.priority]?.label}
              </Badge>
              {categoryLabels[task.category] && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{categoryLabels[task.category]}</Badge>
              )}
              {task.document_type && DOCUMENT_TYPE_LABELS[task.document_type] && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{DOCUMENT_TYPE_LABELS[task.document_type]}</Badge>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-0.5 shrink-0 mr-1">
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(task)}>
                <Edit className="w-3.5 h-3.5 text-blue-600" />
              </Button>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onDelete(task)}>
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
              </Button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2"><T>{task.description}</T></p>
        )}

        {/* Assignee card */}
        <div className="flex items-center gap-2.5 mb-3 p-2 rounded-lg bg-muted/50/80 border border-gray-100">
          <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
            {assigneeInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate"><T>{assigneeName}</T></p>
            {assigneeRole && (
              <p className="text-[11px] text-muted-foreground">{ROLE_LABELS_AR[assigneeRole] || assigneeRole}</p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground mb-3">
          {(initiativeTitle || task.initiative_id) && (
            <div className="flex items-center gap-1.5 text-purple-600">
              <Lightbulb className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate"><T>{initiativeTitle || '—'}</T></span>
            </div>
          )}
          {(task.standard_code || task.standard_id) && (
            <div className="flex items-center gap-1.5 text-blue-600">
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>{task.standard_code || '—'}</span>
            </div>
          )}
          {dueLabel && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                {dueLabel.text}
              </span>
              {dueLabel.distance && (
                <span className={`text-[10px] mr-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>({dueLabel.distance})</span>
              )}
            </div>
          )}
          {task.reminder_date && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>تذكير: {format(new Date(task.reminder_date), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {canEdit && task.status !== 'completed' && task.status !== 'cancelled' && (
          <div className="flex gap-2 pt-2.5 border-t">
            {task.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => onStatusChange(task.id, 'in_progress')}
              >
                <Play className="w-3.5 h-3.5 ml-1" />
                بدء التنفيذ
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => onStatusChange(task.id, 'pending')}
              >
                <RotateCcw className="w-3.5 h-3.5 ml-1" />
                إعادة للانتظار
              </Button>
            )}
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
              onClick={() => onStatusChange(task.id, 'completed')}
            >
              <CheckCircle className="w-3.5 h-3.5 ml-1" />
              إنجاز
            </Button>
          </div>
        )}
        {task.status === 'completed' && (
          <div className="flex items-center gap-1.5 pt-2 border-t text-green-600 text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>تم الإنجاز {task.completion_date ? format(new Date(task.completion_date), 'dd MMMM yyyy', { locale: ar }) : ''}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}