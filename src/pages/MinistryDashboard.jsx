import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  listCities, createCity, setCityStatus, deleteCity, getCitySummary
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
  Trash2, MapPin, AlertTriangle, Activity, Globe, Phone, Mail, RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('ar-SA');
}

// -------------------------------------------------------
// مكون بطاقة مدينة
// -------------------------------------------------------
function CityCard({ city, onAction }) {
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border border-border/60">
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
      <CardContent className="space-y-3 pt-0">
        {/* مؤشرات الأداء */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{summary?.completionRate ?? '—'}%</p>
            <p className="text-[10px] text-muted-foreground">الإنجاز</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{summary?.totalStandards ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">المعايير</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{summary?.inProgressStandards ?? '—'}</p>
            <p className="text-[10px] text-muted-foreground">جارية</p>
          </div>
        </div>

        {/* مؤشرات تشغيل المدينة */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border p-2">
            <p className="text-base font-bold">{summary?.teamMembersCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">أعضاء الفريق</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-base font-bold">{summary?.initiativesCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">المبادرات</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-base font-bold">{summary?.surveysCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">المسح الميداني</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-base font-bold">{summary?.committeesCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">اللجان</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-base font-bold">{summary?.tasksCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">المهام</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-base font-bold">{summary?.evidencesCount ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">الأدلة</p>
          </div>
        </div>

        {/* مؤشرات الميزانية */}
        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-lg border bg-muted/20 p-2">
            <p className="text-[11px] text-muted-foreground">إجمالي الميزانية</p>
            <p className="text-base font-bold text-primary">{formatCurrency(summary?.totalBudget)} ريال</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-2">
              <p className="text-[11px] text-muted-foreground">المخصص</p>
              <p className="text-sm font-semibold">{formatCurrency(summary?.allocatedBudget)} ريال</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[11px] text-muted-foreground">المصروف</p>
              <p className="text-sm font-semibold">{formatCurrency(summary?.spentBudget)} ريال</p>
            </div>
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
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------
// نموذج إضافة مدينة
// -------------------------------------------------------
function AddCityDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', region: '', contact_email: '', contact_phone: '',
    population: '', area_km2: '', notes: '',
  });
  const [errors, setErrors] = useState({});

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
    setForm({ name: '', region: '', contact_email: '', contact_phone: '', population: '', area_km2: '', notes: '' });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            تسجيل مدينة صحية جديدة
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
            <Plus className="w-4 h-4 ml-1" />تسجيل المدينة
          </Button>
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
  const [confirmAction, setConfirmAction] = useState(null); // { type, city }

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

  // تغيير حالة المدينة
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => setCityStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setConfirmAction(null);
      toast({ title: 'تم تحديث حالة المدينة' });
    },
  });

  // حذف مدينة
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteCity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      setConfirmAction(null);
      toast({ title: 'تم حذف المدينة' });
    },
  });

  function handleCityAction(type, city) {
    if (type === 'suspend' || type === 'activate' || type === 'delete') {
      setConfirmAction({ type, city });
    }
  }

  function confirmActionHandler() {
    if (!confirmAction) return;
    const { type, city } = confirmAction;
    if (type === 'delete') {
      deleteMutation.mutate(city.id);
    } else if (type === 'suspend') {
      statusMutation.mutate({ id: city.id, status: 'suspended' });
    } else if (type === 'activate') {
      statusMutation.mutate({ id: city.id, status: 'active' });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            لوحة تحكم وزارة الصحة
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            إشراف مركزي على أداء المدن الصحية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 ml-1" />تحديث
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 ml-1" />تسجيل مدينة
          </Button>
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
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن مدينة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-9"
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
            <CityCard key={city.id} city={city} onAction={handleCityAction} />
          ))}
        </div>
      )}

      {/* نموذج إضافة مدينة */}
      <AddCityDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSave={data => createMutation.mutate(data)}
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
