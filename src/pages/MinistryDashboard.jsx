import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  listCities, createCity, updateCity, setCityStatus, deleteCity, getCitySummary, saveCityLeadership
} from '@/api/citiesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2, Plus, Search, MoreVertical, CheckCircle2, PauseCircle,
  Trash2, MapPin, AlertTriangle, Activity, Globe, Phone, Mail, RefreshCw, Edit3, Crown, UserCog
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getAllHostCityTemplates } from '@/lib/city-hosts';

const MINISTRY_SELECTED_CITY_KEY = 'ministry_selected_city_id';
const MINISTRY_SELECTED_CITY_SCOPE_KEY = 'ministry_selected_city_scope';

function normalizeCityName(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveIncludeLegacyNullForCity(city) {
  const templates = getAllHostCityTemplates();
  const matched = templates.find((item) => normalizeCityName(item?.cityName) === normalizeCityName(city?.name));
  return matched?.hasLegacyData === true;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('ar-SA');
}

// -------------------------------------------------------
// مكون بطاقة مدينة
// -------------------------------------------------------
function CityCard({ city, onAction, selectedCityId }) {
  const statusConfig = {
    active:    { label: 'نشطة',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    suspended: { label: 'موقوفة',  color: 'bg-amber-100  text-amber-700  border-amber-200'  },
    pending:   { label: 'معلقة',   color: 'bg-blue-100   text-blue-700   border-blue-200'   },
    deleted:   { label: 'محذوفة',  color: 'bg-red-100    text-red-700    border-red-200'    },
  };
  const cfg = statusConfig[city.status] ?? statusConfig.active;

  const { data: summary } = useQuery({
    queryKey: ['city-summary', city.id],
    queryFn: () => getCitySummary(city),
    staleTime: 5 * 60 * 1000,
  });

  const spentRatio = Number(summary?.totalBudget || 0) > 0
    ? Math.min(100, Math.round((Number(summary?.spentBudget || 0) / Number(summary?.totalBudget || 0)) * 100))
    : 0;
  const isSelected = String(selectedCityId || '') === String(city?.id || '');

  return (
    <Card className="group border border-slate-200/80 bg-white/90 shadow-sm hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {city.logo_url
                ? <img src={city.logo_url} alt={city.name} className="w-8 h-8 object-contain rounded" />
                : <Building2 className="w-5 h-5 text-primary" />
              }
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{city.name}</CardTitle>
              {city.region && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{city.region}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs border px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {city.status !== 'suspended' && (
                  <DropdownMenuItem onClick={() => onAction('suspend', city)}>
                    <PauseCircle className="w-4 h-4 ml-2 text-amber-500" />تعليق المدينة
                  </DropdownMenuItem>
                )}
                {city.status === 'suspended' && (
                  <DropdownMenuItem onClick={() => onAction('activate', city)}>
                    <CheckCircle2 className="w-4 h-4 ml-2 text-emerald-500" />تفعيل المدينة
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onAction('delete', city)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 ml-2" />حذف المدينة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* مؤشرات الأداء */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xl font-extrabold text-blue-700">{summary?.completionRate ?? '—'}%</p>
            <p className="text-[11px] text-blue-700/80">الإنجاز</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xl font-extrabold text-slate-800">{summary?.totalStandards ?? '—'}</p>
            <p className="text-[11px] text-slate-600">المعايير</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xl font-extrabold text-emerald-700">{summary?.inProgressStandards ?? '—'}</p>
            <p className="text-[11px] text-emerald-700/80">جارية</p>
          </div>
        </div>

        {/* مؤشرات تشغيل المدينة */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
            <p className="text-lg font-bold text-slate-900">{summary?.teamMembersCount ?? 0}</p>
            <p className="text-[11px] text-slate-600">أعضاء الفريق</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
            <p className="text-lg font-bold text-slate-900">{summary?.initiativesCount ?? 0}</p>
            <p className="text-[11px] text-slate-600">المبادرات</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
            <p className="text-lg font-bold text-slate-900">{summary?.surveysCount ?? 0}</p>
            <p className="text-[11px] text-slate-600">المسح الميداني</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
            <p className="text-lg font-bold text-slate-900">{summary?.committeesCount ?? 0}</p>
            <p className="text-[11px] text-slate-600">اللجان</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
            <p className="text-lg font-bold text-slate-900">{summary?.tasksCount ?? 0}</p>
            <p className="text-[11px] text-slate-600">المهام</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
            <p className="text-lg font-bold text-slate-900">{summary?.evidencesCount ?? 0}</p>
            <p className="text-[11px] text-slate-600">الأدلة</p>
          </div>
        </div>

        {/* مؤشرات الميزانية */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
          <div>
            <p className="text-[11px] text-blue-800/70">إجمالي الميزانية</p>
            <p className="text-lg font-extrabold text-blue-800">{formatCurrency(summary?.totalBudget)} ريال</p>
          </div>
          <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${spentRatio}%` }} />
          </div>
          <p className="text-[11px] text-blue-800/70">نسبة الصرف: {spentRatio}%</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-blue-100 bg-white p-2">
              <p className="text-[11px] text-slate-600">المخصص</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(summary?.allocatedBudget)} ريال</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white p-2">
              <p className="text-[11px] text-slate-600">المصروف</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(summary?.spentBudget)} ريال</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 p-2.5">
            <p className="text-[11px] text-slate-500">المحافظ</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{summary?.governor?.full_name || 'غير محدد'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-2.5">
            <p className="text-[11px] text-slate-500">المنسق</p>
            <p className="text-sm font-semibold text-slate-900 truncate">{summary?.coordinator?.full_name || 'غير محدد'}</p>
          </div>
        </div>

        {/* معلومات التواصل */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {city.contact_email && (
            <p className="flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              <span className="truncate">{city.contact_email}</span>
            </p>
          )}
          {city.contact_phone && (
            <p className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" />{city.contact_phone}
            </p>
          )}
          {city.registered_at && (
            <p className="flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              تسجيل: {new Date(city.registered_at).toLocaleDateString('ar-SA')}
            </p>
          )}
        </div>

        {/* شريط الإنجاز */}
        {summary?.completionRate !== undefined && (
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${summary.completionRate}%` }}
              />
            </div>
          </div>
        )}

        <Button
          variant={isSelected ? 'default' : 'secondary'}
          size="sm"
          className="w-full"
          onClick={() => onAction('selectCity', city)}
        >
          <Building2 className="w-3.5 h-3.5 ml-1" />
          {isSelected ? 'المدينة المختارة حالياً' : 'اختيار المدينة وفتح لوحة التحكم'}
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => onAction('editCity', city)}>
            <Edit3 className="w-3.5 h-3.5 ml-1" />تعديل المدينة
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction('assignGovernor', city, summary?.governor || null)}>
            <Crown className="w-3.5 h-3.5 ml-1" />المحافظ
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction('assignCoordinator', city, summary?.coordinator || null)}>
            <UserCog className="w-3.5 h-3.5 ml-1" />المنسق
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------
// نموذج إضافة مدينة
// -------------------------------------------------------
function CityFormDialog({ open, onClose, onSave, initialData = null, title, submitLabel }) {
  const [form, setForm] = useState({
    name: '', region: '', contact_email: '', contact_phone: '',
    population: '', area_km2: '', notes: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initialData?.name || '',
      region: initialData?.region || '',
      contact_email: initialData?.contact_email || '',
      contact_phone: initialData?.contact_phone || '',
      population: initialData?.population || '',
      area_km2: initialData?.area_km2 || '',
      notes: initialData?.notes || '',
    });
    setErrors({});
  }, [open, initialData]);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم المدينة مطلوب';
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      e.contact_email = 'البريد الإلكتروني غير صحيح';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(field, val) {
    setForm(p => ({ ...p, [field]: val }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      population: form.population ? parseInt(form.population) : null,
      area_km2: form.area_km2 ? parseFloat(form.area_km2) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label>اسم المدينة <span className="text-destructive">*</span></Label>
              <Input
                placeholder="مثال: محافظة قلوة"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>المنطقة / المحافظة</Label>
              <Input
                placeholder="مثال: منطقة عسير"
                value={form.region}
                onChange={e => handleChange('region', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  placeholder="admin@city.gov.sa"
                  value={form.contact_email}
                  onChange={e => handleChange('contact_email', e.target.value)}
                  dir="ltr"
                />
                {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>رقم التواصل</Label>
                <Input
                  placeholder="05xxxxxxxx"
                  value={form.contact_phone}
                  onChange={e => handleChange('contact_phone', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>عدد السكان</Label>
                <Input
                  type="number"
                  placeholder="مثال: 50000"
                  value={form.population}
                  onChange={e => handleChange('population', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>المساحة (كم²)</Label>
                <Input
                  type="number"
                  placeholder="مثال: 1200"
                  value={form.area_km2}
                  onChange={e => handleChange('area_km2', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea
                placeholder="أي ملاحظات إضافية..."
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit}>
            <Plus className="w-4 h-4 ml-1" />{submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadershipDialog({ open, onClose, onSave, city, role, initialMember }) {
  const [form, setForm] = useState({
    full_name: '',
    national_id: '',
    email: '',
    phone: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({
      full_name: initialMember?.full_name || '',
      national_id: initialMember?.national_id || '',
      email: initialMember?.email || '',
      phone: initialMember?.phone || '',
      password: '',
    });
    setErrors({});
  }, [open, initialMember]);

  function validate() {
    const nextErrors = {};
    if (!String(form.full_name || '').trim()) nextErrors.full_name = 'الاسم مطلوب';
    if (!/^\d{10}$/.test(String(form.national_id || ''))) nextErrors.national_id = 'رقم الهوية يجب أن يتكون من 10 أرقام';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || ''))) nextErrors.email = 'البريد الإلكتروني غير صحيح';
    if (form.phone && !/^05\d{8}$/.test(String(form.phone || ''))) nextErrors.phone = 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام';
    if (!initialMember?.id && String(form.password || '').length < 4) nextErrors.password = 'كلمة المرور مطلوبة ويجب ألا تقل عن 4 أحرف';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      ...form,
      role,
      city,
    });
  }

  const roleLabel = role === 'governor' ? 'المحافظ' : 'المنسق';

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {role === 'governor' ? <Crown className="w-5 h-5 text-primary" /> : <UserCog className="w-5 h-5 text-primary" />}
            {initialMember?.id ? `تعديل ${roleLabel} ${city?.name || ''}` : `تعيين ${roleLabel} ${city?.name || ''}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>الاسم الكامل</Label>
            <Input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>رقم الهوية</Label>
            <Input dir="ltr" maxLength={10} value={form.national_id} onChange={(e) => setForm((prev) => ({ ...prev, national_id: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            {errors.national_id && <p className="text-xs text-destructive">{errors.national_id}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>البريد الإلكتروني</Label>
            <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>رقم الجوال</Label>
            <Input dir="ltr" maxLength={10} value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{initialMember?.id ? 'كلمة المرور الجديدة' : 'كلمة المرور'}</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} placeholder={initialMember?.id ? 'اتركها فارغة للإبقاء على الحالية' : '4 أحرف على الأقل'} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit}>{initialMember?.id ? 'حفظ التعديلات' : `تعيين ${roleLabel}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------
// الصفحة الرئيسية — لوحة الوزارة
// -------------------------------------------------------
export default function MinistryDashboard() {
  const { user } = useAuth();
  const { isMinistryAdmin } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [leadershipDialog, setLeadershipDialog] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type, city }
  const [selectedCityId, setSelectedCityId] = useState(() => {
    try {
      return localStorage.getItem(MINISTRY_SELECTED_CITY_KEY) || '';
    } catch {
      return '';
    }
  });

  // التحقق من الصلاحية
  const canAccessMinistryDashboard =
    isMinistryAdmin || user?.role === 'admin' || user?.user_role === 'admin';

  if (user && !canAccessMinistryDashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">غير مصرح بالوصول</h2>
        <p className="text-muted-foreground">هذه الصفحة مخصصة لمسؤولي وزارة الصحة فقط.</p>
        <Button onClick={() => navigate(createPageUrl('Dashboard'))}>العودة للوحة التحكم</Button>
      </div>
    );
  }

  // جلب المدن
  const { data: cities = [], isLoading, refetch } = useQuery({
    queryKey: ['cities'],
    queryFn: () => listCities(),
    staleTime: 2 * 60 * 1000,
  });

  // إنشاء مدينة
  const createMutation = useMutation({
    mutationFn: createCity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setShowAddDialog(false);
      toast({ title: 'تم تسجيل المدينة بنجاح', description: 'يمكنك الآن إضافة مدير للمدينة.' });
    },
    onError: (err) => {
      toast({ title: 'خطأ في التسجيل', description: err?.message ?? 'حدث خطأ غير متوقع', variant: 'destructive' });
    },
  });

  const updateCityMutation = useMutation({
    mutationFn: ({ city, updates }) => updateCity(city, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      queryClient.invalidateQueries({ queryKey: ['city-summary', variables?.city?.id] });
      setEditingCity(null);
      toast({ title: 'تم تحديث بيانات المدينة' });
    },
    onError: (err) => {
      toast({ title: 'تعذر تحديث المدينة', description: err?.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
    },
  });

  const leadershipMutation = useMutation({
    mutationFn: ({ city, data }) => saveCityLeadership(city, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['city-summary', variables?.city?.id] });
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setLeadershipDialog(null);
      toast({ title: 'تم حفظ بيانات القيادة بنجاح' });
    },
    onError: (err) => {
      toast({ title: 'تعذر حفظ بيانات القيادة', description: err?.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
    },
  });

  // تغيير حالة المدينة
  const statusMutation = useMutation({
    mutationFn: ({ city, status }) => setCityStatus(city, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setConfirmAction(null);
      toast({ title: 'تم تحديث حالة المدينة' });
    },
  });

  // حذف مدينة
  const deleteMutation = useMutation({
    mutationFn: (city) => deleteCity(city),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setConfirmAction(null);
      toast({ title: 'تم حذف المدينة' });
    },
  });

  function handleCityAction(type, city, member = null) {
    if (type === 'suspend' || type === 'activate' || type === 'delete') {
      setConfirmAction({ type, city });
      return;
    }
    if (type === 'editCity') {
      setEditingCity(city);
      return;
    }
    if (type === 'selectCity') {
      try {
        const cityId = String(city?.id || '');
        const includeLegacyNull = resolveIncludeLegacyNullForCity(city);
        localStorage.setItem(MINISTRY_SELECTED_CITY_KEY, cityId);
        localStorage.setItem(MINISTRY_SELECTED_CITY_SCOPE_KEY, JSON.stringify({ cityId, includeLegacyNull }));
        window.dispatchEvent(new CustomEvent('ministry-city-selected', { detail: { cityId, includeLegacyNull } }));
      } catch {}
      setSelectedCityId(String(city?.id || ''));
      toast({ title: `تم اختيار ${city?.name || 'المدينة'}`, description: 'تم إظهار القائمة اليمنى وفتح لوحة التحكم.' });
      navigate(createPageUrl('Dashboard'));
      return;
    }
    if (type === 'assignGovernor' || type === 'assignCoordinator') {
      setLeadershipDialog({
        city,
        role: type === 'assignGovernor' ? 'governor' : 'coordinator',
        member,
      });
    }
  }

  function confirmActionHandler() {
    if (!confirmAction) return;
    const { type, city } = confirmAction;
    if (type === 'delete') {
      deleteMutation.mutate(city);
    } else if (type === 'suspend') {
      statusMutation.mutate({ city, status: 'suspended' });
    } else if (type === 'activate') {
      statusMutation.mutate({ city, status: 'active' });
    }
  }

  const activeCities = cities.filter(c => c.status !== 'deleted');
  const filteredCities = activeCities.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.region?.toLowerCase().includes(search.toLowerCase())
  );

  // إحصائيات سريعة
  const stats = {
    total: activeCities.length,
    active: activeCities.filter(c => c.status === 'active').length,
    suspended: activeCities.filter(c => c.status === 'suspended').length,
    pending: activeCities.filter(c => c.status === 'pending').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* رأس الصفحة */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-l from-slate-50 to-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-slate-900">
            <Globe className="w-6 h-6 text-primary" />
            لوحة تحكم وزارة الصحة
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            إشراف مركزي على أداء المدن الصحية
          </p>
          {!!selectedCityId && (
            <p className="text-xs text-emerald-700 mt-2 font-medium">تم اختيار مدينة. القائمة اليمنى مفعلة.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!!selectedCityId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                try {
                  localStorage.removeItem(MINISTRY_SELECTED_CITY_KEY);
                  localStorage.removeItem(MINISTRY_SELECTED_CITY_SCOPE_KEY);
                  window.dispatchEvent(new CustomEvent('ministry-city-selected', { detail: { cityId: '', includeLegacyNull: false } }));
                } catch {}
                setSelectedCityId('');
                toast({ title: 'تم إلغاء اختيار المدينة', description: 'تم إخفاء القائمة اليمنى حتى يتم اختيار مدينة مرة أخرى.' });
              }}
            >
              إلغاء اختيار المدينة
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ml-1" />تحديث
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 ml-1" />تسجيل مدينة
          </Button>
        </div>
      </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي المدن', value: stats.total, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'مدن نشطة', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'مدن موقوفة', value: stats.suspended, icon: PauseCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'قيد المراجعة', value: stats.pending, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
        ].map(stat => (
          <Card key={stat.label} className="border border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* بحث */}
      <div className="relative rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="ابحث عن مدينة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-10 border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {/* شبكة المدن */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredCities.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Building2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {search ? 'لا توجد مدن تطابق البحث' : 'لم يتم تسجيل أي مدينة بعد'}
            </p>
            {!search && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 ml-1" />تسجيل أول مدينة
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCities.map(city => (
            <CityCard key={city.id} city={city} onAction={handleCityAction} selectedCityId={selectedCityId} />
          ))}
        </div>
      )}

      {/* نموذج إضافة مدينة */}
      <CityFormDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="تسجيل مدينة صحية جديدة"
        submitLabel="تسجيل المدينة"
        onSave={data => createMutation.mutate(data)}
      />

      <CityFormDialog
        open={!!editingCity}
        onClose={() => setEditingCity(null)}
        initialData={editingCity}
        title={`تعديل بيانات ${editingCity?.name || 'المدينة'}`}
        submitLabel="حفظ التعديلات"
        onSave={(data) => updateCityMutation.mutate({ city: editingCity, updates: data })}
      />

      <LeadershipDialog
        open={!!leadershipDialog}
        onClose={() => setLeadershipDialog(null)}
        city={leadershipDialog?.city}
        role={leadershipDialog?.role}
        initialMember={leadershipDialog?.member}
        onSave={(data) => leadershipMutation.mutate({ city: leadershipDialog?.city, data })}
      />

      {/* تأكيد الإجراء */}
      <Dialog open={!!confirmAction} onOpenChange={v => !v && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {confirmAction?.type === 'delete' ? 'حذف المدينة' :
               confirmAction?.type === 'suspend' ? 'تعليق المدينة' : 'تفعيل المدينة'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.type === 'delete'
              ? `هل أنت متأكد من حذف "${confirmAction?.city?.name}"؟ لن يتمكن مستخدمو هذه المدينة من الدخول.`
              : confirmAction?.type === 'suspend'
              ? `هل تريد تعليق نشاط مدينة "${confirmAction?.city?.name}"؟`
              : `هل تريد تفعيل مدينة "${confirmAction?.city?.name}"؟`
            }
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>إلغاء</Button>
            <Button
              variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
              onClick={confirmActionHandler}
              disabled={statusMutation.isPending || deleteMutation.isPending}
            >
              {statusMutation.isPending || deleteMutation.isPending ? 'جارٍ...' : 'تأكيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
