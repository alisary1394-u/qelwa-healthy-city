import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lightbulb, Target, Search, UserCheck, X } from "lucide-react";
import { DOCUMENT_TYPES } from "@/lib/documentTypes";

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
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      (m.email || '').toLowerCase().includes(q) ||
      (ROLE_LABELS_AR[m.role] || '').includes(q)
    );
  }, [members, memberSearchQuery]);

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
              {/* Selected member display */}
              {formData.assigned_to && (() => {
                const selected = members.find(m => m.id === formData.assigned_to);
                return selected ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {(selected.full_name || '').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{selected.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{ROLE_LABELS_AR[selected.role] || selected.role}</p>
                    </div>
                    <button type="button" className="text-muted-foreground hover:text-red-500" onClick={() => setFormData({ ...formData, assigned_to: '', assigned_to_name: '' })}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null;
              })()}
              {/* Search box */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={memberSearchQuery}
                  onChange={(e) => { setMemberSearchQuery(e.target.value); setMemberSearchOpen(true); }}
                  onFocus={() => setMemberSearchOpen(true)}
                  placeholder="ابحث عن عضو بالاسم أو الدور..."
                  className="pr-9"
                />
              </div>
              {/* Members dropdown list */}
              {memberSearchOpen && (
                <div className="border rounded-lg max-h-[180px] overflow-y-auto divide-y bg-card shadow-sm">
                  {filteredMembers.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                  ) : (
                    filteredMembers.map(m => {
                      const isSelected = String(formData.assigned_to) === String(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            handleMemberChange(m.id);
                            setMemberSearchOpen(false);
                            setMemberSearchQuery('');
                          }}
                          className={`flex items-center gap-2.5 p-2 cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${
                            isSelected ? 'bg-primary text-white border-blue-600' : 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {isSelected ? <UserCheck className="w-3.5 h-3.5" /> : (m.full_name || '').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">{ROLE_LABELS_AR[m.role] || m.role}</p>
                          </div>
                          {m.phone && <span className="text-[10px] text-muted-foreground shrink-0">{m.phone}</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {initiatives?.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Lightbulb className="w-4 h-4" /> المبادرة المرتبطة</Label>
                <Select
                  value={formData.initiative_id || 'none'}
                  onValueChange={(v) => {
                    const init = initiatives.find(i => i.id === v);
                    setFormData({ ...formData, initiative_id: v === 'none' ? '' : v, initiative_title: v === 'none' ? '' : init?.title });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="بدون مبادرة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مبادرة</SelectItem>
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
                  value={formData.standard_id || 'none'}
                  onValueChange={(v) => {
                    const s = standards.find(st => st.id === v);
                    setFormData({ ...formData, standard_id: v === 'none' ? '' : v, standard_code: v === 'none' ? '' : s?.code });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="بدون معيار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون معيار</SelectItem>
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
                    <SelectItem value="none">بدون نوع</SelectItem>
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
              <p className="text-xs text-muted-foreground">سيتم إرسال تذكير بالبريد الإلكتروني للمكلف في هذا التاريخ</p>
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
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {task ? 'حفظ التعديلات' : 'إضافة المهمة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}