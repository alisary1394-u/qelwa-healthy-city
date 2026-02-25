import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const ALL_ROLES = [
  { value: "governor", label: "المشرف العام (المحافظ)" },
  { value: "coordinator", label: "منسق المدينة الصحية" },
  { value: "committee_head", label: "رئيس لجنة" },
  { value: "committee_coordinator", label: "منسق لجنة" },
  { value: "committee_supervisor", label: "مشرف لجنة" },
  { value: "committee_member", label: "عضو لجنة" },
  { value: "member", label: "عضو" },
  { value: "volunteer", label: "متطوع" },
  { value: "budget_manager", label: "مدير الميزانية" },
  { value: "accountant", label: "محاسب" },
  { value: "financial_officer", label: "موظف مالي" }
];

/** أقسام وجهات متاحة للاختيار في حقل القسم/الجهة (أقسام التطبيق + جهات عامة) */
const DEPARTMENT_OPTIONS = [
  // أقسام التطبيق
  'لوحة التحكم',
  'التقارير',
  'المعايير',
  'المبادرات',
  'المهام',
  'الميزانية',
  'اللجان',
  'الفريق',
  'الملفات',
  'الاستبيان',
  'الإعدادات',
  // جهات وأقسام عامة
  'الصحة العامة',
  'البيئة',
  'التعليم',
  'البلدية',
  'الشؤون الاجتماعية',
  'الزراعة',
  'المياه',
  'الطوارئ والدفاع المدني',
  'الإعلام والتوعية',
  'الشؤون البلدية والقروية',
  'الرعاية الصحية الأولية',
  'الصحة المدرسية',
  'الطب الوقائي',
  'الخدمات المساندة',
  'أخرى'
];

const OTHER_DEPARTMENT_VALUE = '__other__';

export default function MemberForm({ open, onOpenChange, member, onSave, supervisors, committees, selectedCommitteeId, existingDepartments = [], restrictedRoles = [] }) {
  const roles = (restrictedRoles && restrictedRoles.length) ? ALL_ROLES.filter((r) => !restrictedRoles.includes(r.value)) : ALL_ROLES;
  const [formData, setFormData] = useState({
    full_name: '',
    national_id: '',
    password: '',
    role: 'volunteer',
    committee_id: '',
    committee_name: '',
    specialization: '',
    phone: '',
    email: '',
    department: '',
    supervisor_id: '',
    status: 'active',
    join_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [departmentOther, setDepartmentOther] = useState('');

  const predefinedDepts = DEPARTMENT_OPTIONS.filter(d => d !== 'أخرى');
  const existingUnique = [...new Set((existingDepartments || []).filter(Boolean))].filter(d => !predefinedDepts.includes(d));
  const departmentOptions = [
    ...predefinedDepts.map(d => ({ value: d, label: d })),
    ...existingUnique.map(d => ({ value: d, label: d })),
    { value: OTHER_DEPARTMENT_VALUE, label: 'أخرى' }
  ];
  const isPredefinedOrExisting = predefinedDepts.includes(formData.department) || existingUnique.includes(formData.department);
  const departmentSelectValue = isPredefinedOrExisting
    ? formData.department
    : (formData.department ? OTHER_DEPARTMENT_VALUE : '');

  useEffect(() => {
    if (member) {
      setFormData({
        full_name: member.full_name || '',
        national_id: member.national_id || '',
        password: member.password || '',
        role: member.role || 'volunteer',
        committee_id: member.committee_id || '',
        committee_name: member.committee_name || '',
        specialization: member.specialization || '',
        phone: member.phone || '',
        email: member.email || '',
        department: member.department || '',
        supervisor_id: member.supervisor_id || '',
        status: member.status || 'active',
        join_date: member.join_date || new Date().toISOString().split('T')[0],
        notes: member.notes || ''
      });
    } else {
      const defaultCommittee = selectedCommitteeId ? committees?.find(c => c.id === selectedCommitteeId) : null;
      setFormData({
        full_name: '',
        national_id: '',
        password: '',
        role: 'volunteer',
        committee_id: selectedCommitteeId || '',
        committee_name: defaultCommittee?.name || '',
        specialization: '',
        phone: '',
        email: '',
        department: '',
        supervisor_id: '',
        status: 'active',
        join_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    if (member?.department && !DEPARTMENT_OPTIONS.includes(member.department)) {
      setDepartmentOther(member.department);
    } else {
      setDepartmentOther('');
    }
  }, [member, open, selectedCommitteeId, committees]);

  const handleCommitteeChange = (committeeId) => {
    const committee = committees?.find(c => c.id === committeeId);
    setFormData({
      ...formData,
      committee_id: committeeId,
      committee_name: committee?.name || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const departmentToSave = departmentSelectValue === OTHER_DEPARTMENT_VALUE ? departmentOther : formData.department;
      await onSave({ ...formData, department: departmentToSave || '' });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentChange = (value) => {
    if (value === OTHER_DEPARTMENT_VALUE) {
      setFormData({ ...formData, department: '' });
    } else {
      setFormData({ ...formData, department: value });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {member ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="أدخل الاسم الكامل"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>رقم الهوية</Label>
              <Input
                value={formData.national_id}
                onChange={(e) => setFormData({...formData, national_id: e.target.value})}
                placeholder="أدخل رقم الهوية"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label>الدور *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>التخصص</Label>
              <Input
                value={formData.specialization}
                onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                placeholder="مثال: طب عام، تمريض، إدارة صحية"
              />
            </div>
            
            <div className="space-y-2">
              <Label>رقم الهاتف *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="05xxxxxxxx"
                dir="ltr"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <Label>كلمة المرور (للدخول للنظام)</Label>
              <Input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder={member ? 'اتركه فارغاً للإبقاء على كلمة المرور الحالية' : 'اختر كلمة مرور قوية'}
              />
              <p className="text-xs text-gray-500">
                {member ? 'لا تُرسل كلمة مرور جديدة إن تركت الحقل فارغاً.' : 'يستخدم رقم الهوية وكلمة المرور لتسجيل الدخول'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>اللجنة</Label>
              <Select value={formData.committee_id} onValueChange={handleCommitteeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر اللجنة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>بدون لجنة</SelectItem>
                  {committees?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>القسم/الجهة</Label>
              <Select value={departmentSelectValue} onValueChange={handleDepartmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم أو الجهة" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departmentSelectValue === OTHER_DEPARTMENT_VALUE && (
                <Input
                  value={departmentOther}
                  onChange={(e) => setDepartmentOther(e.target.value)}
                  placeholder="أدخل اسم القسم أو الجهة"
                  className="mt-2"
                />
              )}
            </div>
            
            {(formData.role === 'volunteer' || formData.role === 'member') && (
              <div className="space-y-2">
                <Label>المشرف المباشر</Label>
                <Select value={formData.supervisor_id} onValueChange={(v) => setFormData({...formData, supervisor_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المشرف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>بدون مشرف</SelectItem>
                    {supervisors?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>تاريخ الانضمام</Label>
              <Input
                type="date"
                value={formData.join_date}
                onChange={(e) => setFormData({...formData, join_date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="أي ملاحظات إضافية..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {member ? 'حفظ التعديلات' : 'إضافة العضو'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}