import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lightbulb, Target } from "lucide-react";
import { DOCUMENT_TYPES } from "@/lib/documentTypes";

const priorities = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" }
];

const categories = [
  { value: "field_work", label: "عمل ميداني" },
  { value: "meeting", label: "اجتماع" },
  { value: "report", label: "تقرير" },
  { value: "survey", label: "مسح" },
  { value: "training", label: "تدريب" },
  { value: "other", label: "أخرى" }
];

export default function TaskForm({ open, onOpenChange, task, onSave, members, initiatives = [], standards = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    assigned_to_name: '',
    initiative_id: '',
    initiative_title: '',
    standard_id: '',
    standard_code: '',
    document_type: '',
    priority: 'medium',
    status: 'pending',
    due_date: '',
    reminder_date: '',
    category: 'other',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        assigned_to_name: task.assigned_to_name || '',
        initiative_id: task.initiative_id || '',
        initiative_title: task.initiative_title || '',
        standard_id: task.standard_id || '',
        standard_code: task.standard_code || '',
        document_type: task.document_type || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        due_date: task.due_date || '',
        reminder_date: task.reminder_date ? task.reminder_date.slice(0, 16) : '',
        category: task.category || 'other',
        notes: task.notes || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        assigned_to_name: '',
        initiative_id: '',
        initiative_title: '',
        standard_id: '',
        standard_code: '',
        document_type: '',
        priority: 'medium',
        status: 'pending',
        due_date: '',
        reminder_date: '',
        category: 'other',
        notes: ''
      });
    }
  }, [task, open]);

  const handleMemberChange = (memberId) => {
    const member = members.find(m => m.id === memberId);
    setFormData({
      ...formData,
      assigned_to: memberId,
      assigned_to_name: member?.full_name || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {task ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>عنوان المهمة *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="أدخل عنوان المهمة"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="وصف تفصيلي للمهمة..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المكلف بالمهمة *</Label>
              <Select value={formData.assigned_to} onValueChange={handleMemberChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العضو" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {initiatives?.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Lightbulb className="w-4 h-4" /> المبادرة المرتبطة</Label>
                <Select
                  value={formData.initiative_id}
                  onValueChange={(v) => {
                    const init = initiatives.find(i => i.id === v);
                    setFormData({ ...formData, initiative_id: v, initiative_title: init?.title });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="بدون مبادرة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون مبادرة</SelectItem>
                    {initiatives.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.code} - {(i.title || '').slice(0, 45)}{(i.title?.length || 0) > 45 ? '...' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {standards?.length > 0 && (
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-1"><Target className="w-4 h-4" /> المعيار المرتبط (للإثبات)</Label>
                <Select
                  value={formData.standard_id}
                  onValueChange={(v) => {
                    const s = standards.find(st => st.id === v);
                    setFormData({ ...formData, standard_id: v, standard_code: s?.code });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="بدون معيار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">بدون معيار</SelectItem>
                    {standards.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.code} - {s.title?.slice(0, 50)}...</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.standard_id && (
              <div className="space-y-2">
                <Label>نوع المستند</Label>
                <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الأولوية</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>تاريخ الاستحقاق</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>تاريخ ووقت التذكير</Label>
              <Input
                type="datetime-local"
                value={formData.reminder_date}
                onChange={(e) => setFormData({...formData, reminder_date: e.target.value, reminder_sent: false})}
              />
              <p className="text-xs text-gray-500">سيتم إرسال تذكير بالبريد الإلكتروني للمكلف في هذا التاريخ</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {task ? 'حفظ التعديلات' : 'إضافة المهمة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}