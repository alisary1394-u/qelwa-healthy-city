import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Edit, Trash2, CheckCircle, AlertCircle, Lightbulb, Target } from "lucide-react";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documentTypes";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const priorityConfig = {
  low: { label: "منخفضة", color: "bg-gray-100 text-gray-800" },
  medium: { label: "متوسطة", color: "bg-blue-100 text-blue-800" },
  high: { label: "عالية", color: "bg-orange-100 text-orange-800" },
  urgent: { label: "عاجلة", color: "bg-red-100 text-red-800" }
};

const statusConfig = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-800" },
  completed: { label: "مكتملة", color: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغاة", color: "bg-gray-100 text-gray-800" }
};

const categoryLabels = {
  field_work: "عمل ميداني",
  meeting: "اجتماع",
  report: "تقرير",
  survey: "مسح",
  training: "تدريب",
  other: "أخرى"
};

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, canEdit, initiatives = [] }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const initiativeTitle = task.initiative_title || (task.initiative_id && initiatives.find(i => i.id === task.initiative_id)?.title);

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isOverdue ? 'border-red-300 bg-red-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isOverdue && <AlertCircle className="w-4 h-4 text-red-500" />}
              <h3 className="font-semibold text-lg">{task.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={priorityConfig[task.priority]?.color}>
                {priorityConfig[task.priority]?.label}
              </Badge>
              <Badge className={statusConfig[task.status]?.color}>
                {statusConfig[task.status]?.label}
              </Badge>
              <Badge variant="outline">{categoryLabels[task.category]}</Badge>
              {task.document_type && DOCUMENT_TYPE_LABELS[task.document_type] && (
                <Badge variant="secondary" className="text-xs">{DOCUMENT_TYPE_LABELS[task.document_type]}</Badge>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(task)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="space-y-2 text-sm text-gray-600">
          {(initiativeTitle || task.initiative_id) && (
            <div className="flex items-center gap-2 text-purple-600">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span className="truncate">المبادرة: {initiativeTitle || '—'}</span>
            </div>
          )}
          {(task.standard_code || task.standard_id) && (
            <div className="flex items-center gap-2 text-blue-600">
              <Target className="w-4 h-4 shrink-0" />
              <span>المعيار: {task.standard_code || '—'}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>المكلف: {task.assigned_to_name || 'غير محدد'}</span>
          </div>
          {task.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                الاستحقاق: {format(new Date(task.due_date), 'dd MMMM yyyy', { locale: ar })}
              </span>
            </div>
          )}
          {task.reminder_date && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>تذكير: {format(new Date(task.reminder_date), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          )}
        </div>

        {canEdit && task.status !== 'completed' && task.status !== 'cancelled' && (
          <div className="mt-4 pt-3 border-t flex gap-2">
            {task.status === 'pending' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onStatusChange(task.id, 'in_progress')}
              >
                بدء التنفيذ
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onStatusChange(task.id, 'pending')}
              >
                إعادة للانتظار
              </Button>
            )}
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onStatusChange(task.id, 'completed')}
            >
              <CheckCircle className="w-4 h-4 ml-1" />
              إنجاز
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}