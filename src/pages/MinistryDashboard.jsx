/**
 * MinistryDashboard — لوحة تحكم وزارة الصحة المتكاملة
 * Comprehensive, fully-standalone ministry control panel
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import {
  listCities, createCity, updateCity, setCityStatus, deleteCity, getCitySummary, saveCityLeadership
} from '@/api/citiesApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  Building2, Plus, Search, MoreVertical, CheckCircle2, PauseCircle,
  Trash2, MapPin, AlertTriangle, Activity, Globe, Phone, Mail, RefreshCw,
  Edit3, Crown, UserCog, Users, Target, BarChart3, Award, Briefcase,
  ArrowUpRight, FileCheck, TrendingUp, DollarSign, Layers, ShieldCheck
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getAllHostCityTemplates } from '@/lib/city-hosts';

const MINISTRY_SELECTED_CITY_KEY    = 'ministry_selected_city_id';
const MINISTRY_SELECTED_CITY_SCOPE_KEY = 'ministry_selected_city_scope';

function normalizeCityName(v) { return String(v || '').trim().toLowerCase(); }
function resolveIncludeLegacyNullForCity(city) {
  const templates = getAllHostCityTemplates();
  const matched = templates.find(t => normalizeCityName(t?.cityName) === normalizeCityName(city?.name));
  return matched?.hasLegacyData === true;
}
function fmtCurrency(v) { return Number(v || 0).toLocaleString('ar-SA'); }
function completionColor(r) {
  r = Number(r) || 0;
  if (r >= 80) return '#10b981';
  if (r >= 60) return '#3b82f6';
  if (r >= 30) return '#f59e0b';
  return '#ef4444';
}
function completionLabel(r) {
  r = Number(r) || 0;
  if (r >= 80) return { t: 'ممتاز',       c: 'bg-emerald-100 text-emerald-800' };
  if (r >= 60) return { t: 'جيد',         c: 'bg-blue-100 text-blue-800'    };
  if (r >= 30) return { t: 'متوسط',       c: 'bg-amber-100 text-amber-800'  };
  return           { t: 'يحتاج تطوير', c: 'bg-red-100 text-red-800'      };
}

// Hook: تجميع بيانات جميع المدن
function useCityAggregates(activeCities) {
  const results = useQueries({
    queries: activeCities.map(city => ({
      queryKey: ['city-summary', city.id],
      queryFn:  () => getCitySummary(city),
      staleTime: 2 * 60 * 1000,
    }))
  });
  return useMemo(() => {
    const pairs  = activeCities.map((city, i) => ({ city, d: results[i]?.data || null }));
    const loaded = pairs.filter(p => p.d);
    const sum    = key => loaded.reduce((a, p) => a + (Number(p.d?.[key]) || 0), 0);
    const rates  = loaded.map(p => Number(p.d?.completionRate) || 0);
    const avgCompletion = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
    const chartData = loaded
      .map(p => ({ name: p.city?.name || '', completion: Number(p.d?.completionRate) || 0 }))
      .sort((a, b) => b.completion - a.completion);
    return {
      isLoading:        results.some(q => q.isLoading),
      avgCompletion,
      totalStandards:   sum('totalStandards'),
      totalMembers:     sum('teamMembersCount'),
      totalBudget:      sum('totalBudget'),
      totalSpent:       sum('spentBudget'),
      totalTasks:       sum('tasksCount'),
      totalInitiatives: sum('initiativesCount'),
      totalEvidence:    sum('evidencesCount'),
      chartData,
    };
  }, [results, activeCities]);
}

// CityTableRow: صف مضغوط في جدول النظرة العامة
function CityTableRow({ rank, city, onAction, canManageCities, canManageLeadership }) {
  const { data: summary } = useQuery({
    queryKey: ['city-summary', city.id],
    queryFn:  () => getCitySummary(city),
    staleTime: 2 * 60 * 1000,
  });
  const rate = Number(summary?.completionRate) || 0;
  const lbl  = completionLabel(rate);
  const statusMap = {
    active:    { t: 'نشطة',   c: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    suspended: { t: 'موقوفة', c: 'bg-amber-50 text-amber-700 border border-amber-200'       },
    pending:   { t: 'معلقة',  c: 'bg-blue-50 text-blue-700 border border-blue-200'           },
  };
  const sc = statusMap[city.status] || statusMap.active;
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="py-3 px-4 text-slate-400 font-mono text-sm text-center">{rank}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {city.logo_url ? <img src={city.logo_url} alt="" className="w-6 h-6 rounded object-contain" /> : <Building2 className="w-4 h-4 text-primary" />}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">{city.name}</p>
            {city.region && <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{city.region}</p>}
          </div>
        </div>
      </td>
      <td className="py-3 px-4 min-w-[150px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${rate}%`, backgroundColor: completionColor(rate) }} />
          </div>
          <span className="text-sm font-bold min-w-[38px] text-right" style={{ color: completionColor(rate) }}>{rate}%</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${lbl.c}`}>{lbl.t}</span>
      </td>
      <td className="py-3 px-4 text-center text-sm font-semibold text-slate-700">{summary?.totalStandards ?? '—'}</td>
      <td className="py-3 px-4 text-center text-sm text-slate-600">{summary?.teamMembersCount ?? '—'}</td>
      <td className="py-3 px-4 text-center text-sm text-slate-600">{summary?.tasksCount ?? '—'}</td>
      <td className="py-3 px-4 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${sc.c}`}>{sc.t}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 justify-center">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAction('selectCity', city)} title="فتح لوحة المدينة">
            <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
          </Button>
          {canManageCities && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => onAction('editCity', city)}><Edit3 className="w-3.5 h-3.5 ml-2" />تعديل بيانات المدينة</DropdownMenuItem>
                {canManageLeadership && <DropdownMenuItem onClick={() => onAction('assignGovernor', city)}><Crown className="w-3.5 h-3.5 ml-2" />تعيين المحافظ</DropdownMenuItem>}
                {canManageLeadership && <DropdownMenuItem onClick={() => onAction('assignCoordinator', city)}><UserCog className="w-3.5 h-3.5 ml-2" />تعيين المنسق</DropdownMenuItem>}
                {city.status !== 'suspended'
                  ? <DropdownMenuItem onClick={() => onAction('suspend', city)}><PauseCircle className="w-3.5 h-3.5 ml-2 text-amber-500" />تعليق</DropdownMenuItem>
                  : <DropdownMenuItem onClick={() => onAction('activate', city)}><CheckCircle2 className="w-3.5 h-3.5 ml-2 text-emerald-500" />تفعيل</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => onAction('delete', city)} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-3.5 h-3.5 ml-2" />حذف المدينة
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
    </tr>
  );
}

// CityCard: بطاقة مدينة تفصيلية
function CityCard({ city, onAction, selectedCityId, canManageCities, canManageLeadership }) {
  const statusConfig = {
    active:    { label: 'نشطة',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    suspended: { label: 'موقوفة', color: 'bg-amber-100  text-amber-700  border-amber-200'    },
    pending:   { label: 'معلقة',  color: 'bg-blue-100   text-blue-700   border-blue-200'     },
    deleted:   { label: 'محذوفة', color: 'bg-red-100    text-red-700    border-red-200'      },
  };
  const cfg = statusConfig[city.status] ?? statusConfig.active;
  const { data: summary } = useQuery({
    queryKey: ['city-summary', city.id],
    queryFn:  () => getCitySummary(city),
    staleTime: 0,
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
              {city.logo_url ? <img src={city.logo_url} alt={city.name} className="w-8 h-8 object-contain rounded" /> : <Building2 className="w-5 h-5 text-primary" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight truncate">{city.name}</CardTitle>
              {city.region && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{city.region}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs border px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
            {canManageCities && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {city.status !== 'suspended' && <DropdownMenuItem onClick={() => onAction('suspend', city)}><PauseCircle className="w-4 h-4 ml-2 text-amber-500" />تعليق المدينة</DropdownMenuItem>}
                  {city.status === 'suspended' && <DropdownMenuItem onClick={() => onAction('activate', city)}><CheckCircle2 className="w-4 h-4 ml-2 text-emerald-500" />تفعيل المدينة</DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => onAction('delete', city)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 ml-2" />حذف المدينة</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
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
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'أعضاء الفريق',   val: summary?.teamMembersCount },
            { label: 'المبادرات',       val: summary?.initiativesCount },
            { label: 'المسح الميداني', val: summary?.surveysCount     },
            { label: 'اللجان',          val: summary?.committeesCount  },
            { label: 'المهام',          val: summary?.tasksCount       },
            { label: 'الأدلة',          val: summary?.evidencesCount   },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
              <p className="text-lg font-bold text-slate-900">{val ?? 0}</p>
              <p className="text-[11px] text-slate-600">{label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-2">
          <div>
            <p className="text-[11px] text-blue-800/70">إجمالي الميزانية</p>
            <p className="text-lg font-extrabold text-blue-800">{fmtCurrency(summary?.totalBudget)} ريال</p>
          </div>
          <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${spentRatio}%` }} />
          </div>
          <p className="text-[11px] text-blue-800/70">نسبة الصرف: {spentRatio}%</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-blue-100 bg-white p-2">
              <p className="text-[11px] text-slate-600">المخصص</p>
              <p className="text-sm font-semibold">{fmtCurrency(summary?.allocatedBudget)} ريال</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-white p-2">
              <p className="text-[11px] text-slate-600">المصروف</p>
              <p className="text-sm font-semibold">{fmtCurrency(summary?.spentBudget)} ريال</p>
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
        <div className="space-y-1 text-xs text-muted-foreground">
          {city.contact_email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{city.contact_email}</span></p>}
          {city.contact_phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{city.contact_phone}</p>}
          {city.registered_at && <p className="flex items-center gap-1.5"><Activity className="w-3 h-3" />تسجيل: {new Date(city.registered_at).toLocaleDateString('ar-SA')}</p>}
        </div>
        <Button variant={isSelected ? 'default' : 'secondary'} size="sm" className="w-full" onClick={() => onAction('selectCity', city)}>
          <Building2 className="w-3.5 h-3.5 ml-1" />
          {isSelected ? 'المدينة المختارة حالياً' : 'فتح لوحة تحكم المدينة'}
        </Button>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {canManageCities ? <Button variant="outline" size="sm" onClick={() => onAction('editCity', city)}><Edit3 className="w-3.5 h-3.5 ml-1" />تعديل</Button> : <div />}
          {canManageLeadership ? <Button variant="outline" size="sm" onClick={() => onAction('assignGovernor', city, summary?.governor || null)}><Crown className="w-3.5 h-3.5 ml-1" />المحافظ</Button> : <div />}
          {canManageLeadership ? <Button variant="outline" size="sm" onClick={() => onAction('assignCoordinator', city, summary?.coordinator || null)}><UserCog className="w-3.5 h-3.5 ml-1" />المنسق</Button> : <div />}
        </div>
      </CardContent>
    </Card>
  );
}

// CityFormDialog
function CityFormDialog({ open, onClose, onSave, initialData = null, title, submitLabel }) {
  const [form, setForm] = useState({ name: '', region: '', contact_email: '', contact_phone: '', population: '', area_km2: '', notes: '' });
  const [errors, setErrors] = useState({});
  React.useEffect(() => {
    if (!open) return;
    setForm({ name: initialData?.name || '', region: initialData?.region || '', contact_email: initialData?.contact_email || '', contact_phone: initialData?.contact_phone || '', population: initialData?.population || '', area_km2: initialData?.area_km2 || '', notes: initialData?.notes || '' });
    setErrors({});
  }, [open, initialData]);
  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم المدينة مطلوب';
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) e.contact_email = 'البريد غير صحيح';
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleChange(f, v) { setForm(p => ({ ...p, [f]: v })); if (errors[f]) setErrors(p => ({ ...p, [f]: undefined })); }
  function handleSubmit() { if (!validate()) return; onSave({ ...form, population: form.population ? parseInt(form.population) : null, area_km2: form.area_km2 ? parseFloat(form.area_km2) : null }); }
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>اسم المدينة <span className="text-destructive">*</span></Label>
            <Input placeholder="مثال: محافظة قلوة" value={form.name} onChange={e => handleChange('name', e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>المنطقة / المحافظة</Label>
            <Input placeholder="مثال: منطقة عسير" value={form.region} onChange={e => handleChange('region', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" dir="ltr" placeholder="admin@city.gov.sa" value={form.contact_email} onChange={e => handleChange('contact_email', e.target.value)} />
              {errors.contact_email && <p className="text-xs text-destructive">{errors.contact_email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>رقم التواصل</Label>
              <Input placeholder="05xxxxxxxx" value={form.contact_phone} onChange={e => handleChange('contact_phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>عدد السكان</Label><Input type="number" placeholder="50000" value={form.population} onChange={e => handleChange('population', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>المساحة (كم²)</Label><Input type="number" placeholder="1200" value={form.area_km2} onChange={e => handleChange('area_km2', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>ملاحظات</Label><Textarea placeholder="أي ملاحظات إضافية..." value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit}><Plus className="w-4 h-4 ml-1" />{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// LeadershipDialog
function LeadershipDialog({ open, onClose, onSave, city, role, initialMember }) {
  const [form, setForm] = useState({ full_name: '', national_id: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  React.useEffect(() => {
    if (!open) return;
    setForm({ full_name: initialMember?.full_name || '', national_id: initialMember?.national_id || '', email: initialMember?.email || '', phone: initialMember?.phone || '', password: '' });
    setErrors({});
  }, [open, initialMember]);
  function validate() {
    const e = {};
    if (!String(form.full_name || '').trim()) e.full_name = 'الاسم مطلوب';
    if (!/^\d{10}$/.test(String(form.national_id || ''))) e.national_id = 'رقم الهوية 10 أرقام';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || ''))) e.email = 'البريد الإلكتروني غير صحيح';
    if (form.phone && !/^05\d{8}$/.test(String(form.phone || ''))) e.phone = 'رقم الجوال يبدأ بـ 05 ويتكون من 10 أرقام';
    if (!initialMember?.id && String(form.password || '').length < 4) e.password = 'كلمة المرور مطلوبة (4 أحرف على الأقل)';
    setErrors(e); return Object.keys(e).length === 0;
  }
  function handleSubmit() { if (!validate()) return; onSave({ ...form, role, city }); }
  const roleLabel = role === 'governor' ? 'المحافظ' : 'المنسق';
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {role === 'governor' ? <Crown className="w-5 h-5 text-primary" /> : <UserCog className="w-5 h-5 text-primary" />}
            {initialMember?.id ? `تعديل ${roleLabel}` : `تعيين ${roleLabel}`} — {city?.name || ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label>الاسم الكامل</Label><Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />{errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}</div>
          <div className="space-y-1.5"><Label>رقم الهوية</Label><Input dir="ltr" maxLength={10} value={form.national_id} onChange={e => setForm(p => ({ ...p, national_id: e.target.value.replace(/\D/g,'').slice(0,10) }))} />{errors.national_id && <p className="text-xs text-destructive">{errors.national_id}</p>}</div>
          <div className="space-y-1.5"><Label>البريد الإلكتروني</Label><Input dir="ltr" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />{errors.email && <p className="text-xs text-destructive">{errors.email}</p>}</div>
          <div className="space-y-1.5"><Label>رقم الجوال</Label><Input dir="ltr" maxLength={10} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))} />{errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}</div>
          <div className="space-y-1.5">
            <Label>{initialMember?.id ? 'كلمة المرور الجديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور'}</Label>
            <Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={initialMember?.id ? 'اتركها فارغة للإبقاء' : '4 أحرف على الأقل'} />
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

// MinistryDashboard — الصفحة الرئيسية
export default function MinistryDashboard() {
  const { user } = useAuth();
  const { isMinistryAdmin, isMinistryRole, role, permissions, ministryRegionScope = [] } = usePermissions();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const [activeTab,        setActiveTab]        = useState('overview');
  const [search,           setSearch]           = useState('');
  const [showAddDialog,    setShowAddDialog]    = useState(false);
  const [editingCity,      setEditingCity]      = useState(null);
  const [leadershipDialog, setLeadershipDialog] = useState(null);
  const [confirmAction,    setConfirmAction]    = useState(null);
  const [selectedCityId,   setSelectedCityId]   = useState(() => {
    try { return localStorage.getItem(MINISTRY_SELECTED_CITY_KEY) || ''; } catch { return ''; }
  });

  const canAccessMinistryDashboard =
    isMinistryRole || isMinistryAdmin || user?.role === 'admin' || user?.user_role === 'admin';
  const canManageCities    = permissions?.canManageCities === true || isMinistryAdmin;
  const canManageLeadership = permissions?.canAddOrEditGovernor === true || permissions?.canAddOrEditCoordinator === true;

  const normalizeRegion = v => String(v || '').trim().toLowerCase();
  const regionScope = Array.isArray(ministryRegionScope)
    ? ministryRegionScope.map(normalizeRegion).filter(Boolean) : [];

  const { data: cities = [], isLoading: citiesLoading, refetch } = useQuery({
    queryKey: ['cities'],
    queryFn:   listCities,
    staleTime: 2 * 60 * 1000,
  });

  const { data: ministryTeamMembers = [] } = useQuery({
    queryKey: ['ministryTeamMembers', 'ministry-dashboard'],
    queryFn:  () => api.entities.MinistryTeamMember.list(),
    enabled:  isMinistryRole,
    select:   d => Array.isArray(d) ? d : [],
  });

  const regionScopedCities = role === 'ministry_regional_staff'
    ? (regionScope.length > 0 ? cities.filter(c => regionScope.some(r => normalizeRegion(c?.region).includes(r))) : [])
    : cities;

  const activeCities   = regionScopedCities.filter(c => c.status !== 'deleted');
  const filteredCities = activeCities.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.region?.toLowerCase().includes(search.toLowerCase())
  );

  const agg = useCityAggregates(activeCities);

  const cityStats = {
    total:     activeCities.length,
    active:    activeCities.filter(c => c.status === 'active').length,
    suspended: activeCities.filter(c => c.status === 'suspended').length,
    pending:   activeCities.filter(c => c.status === 'pending').length,
  };

  const ministryRoleKeys = ['ministry_it_admin', 'ministry_staff', 'ministry_regional_staff'];
  const ministryMembers  = ministryTeamMembers.filter(m => ministryRoleKeys.includes(String(m?.role || '')));
  const teamStats = {
    total:    ministryMembers.length,
    it:       ministryMembers.filter(m => m.role === 'ministry_it_admin').length,
    central:  ministryMembers.filter(m => m.role === 'ministry_staff').length,
    regional: ministryMembers.filter(m => m.role === 'ministry_regional_staff').length,
  };

  const createMutation = useMutation({
    mutationFn: createCity,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities'] }); setShowAddDialog(false); toast({ title: 'تم تسجيل المدينة بنجاح' }); },
    onError: err => toast({ title: 'خطأ في التسجيل', description: err?.message ?? '', variant: 'destructive' }),
  });
  const updateCityMutation = useMutation({
    mutationFn: ({ city, updates }) => updateCity(city, updates),
    onSuccess: (_, v) => { queryClient.invalidateQueries({ queryKey: ['cities'] }); queryClient.invalidateQueries({ queryKey: ['city-summary', v?.city?.id] }); setEditingCity(null); toast({ title: 'تم تحديث بيانات المدينة' }); },
    onError: err => toast({ title: 'تعذر تحديث المدينة', description: err?.message || '', variant: 'destructive' }),
  });
  const leadershipMutation = useMutation({
    mutationFn: ({ city, data }) => saveCityLeadership(city, data),
    onSuccess: (_, v) => { queryClient.invalidateQueries({ queryKey: ['city-summary', v?.city?.id] }); queryClient.invalidateQueries({ queryKey: ['teamMembers'] }); setLeadershipDialog(null); toast({ title: 'تم حفظ بيانات القيادة بنجاح' }); },
    onError: err => toast({ title: 'تعذر حفظ بيانات القيادة', description: err?.message || '', variant: 'destructive' }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ city, status }) => setCityStatus(city, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities'] }); setConfirmAction(null); toast({ title: 'تم تحديث حالة المدينة' }); },
  });
  const deleteMutation = useMutation({
    mutationFn: city => deleteCity(city),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities'] }); setConfirmAction(null); toast({ title: 'تم حذف المدينة' }); },
  });

  function handleCityAction(type, city, member = null) {
    if (type === 'suspend' || type === 'activate' || type === 'delete') { setConfirmAction({ type, city }); return; }
    if (type === 'editCity') { setEditingCity(city); return; }
    if (type === 'selectCity') {
      try {
        const cityId = String(city?.id || '');
        const cityName = String(city?.name || '').trim();
        const includeLegacyNull = resolveIncludeLegacyNullForCity(city);
        localStorage.setItem(MINISTRY_SELECTED_CITY_KEY, cityId);
        localStorage.setItem(MINISTRY_SELECTED_CITY_SCOPE_KEY, JSON.stringify({ cityId, cityName, includeLegacyNull }));
        window.dispatchEvent(new CustomEvent('ministry-city-selected', { detail: { cityId, cityName, includeLegacyNull } }));
      } catch {}
      setSelectedCityId(String(city?.id || ''));
      toast({ title: `تم اختيار ${city?.name || 'المدينة'}`, description: 'يمكنك الآن تصفح بياناتها.' });
      navigate(createPageUrl('Dashboard'));
      return;
    }
    if (type === 'assignGovernor' || type === 'assignCoordinator') {
      setLeadershipDialog({ city, role: type === 'assignGovernor' ? 'governor' : 'coordinator', member });
    }
  }

  function confirmActionHandler() {
    if (!confirmAction) return;
    const { type, city } = confirmAction;
    if (type === 'delete')    deleteMutation.mutate(city);
    else if (type === 'suspend')  statusMutation.mutate({ city, status: 'suspended' });
    else if (type === 'activate') statusMutation.mutate({ city, status: 'active' });
  }

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

  const spendPct = agg.totalBudget > 0 ? Math.round((agg.totalSpent / agg.totalBudget) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50/80" dir="rtl">

      {/* HERO HEADER */}
      <div className="bg-gradient-to-l from-[#0f2d5b] via-[#1a56db] to-[#0ea5e9] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 tracking-tight">
                <Globe className="w-7 h-7 text-sky-300" />لوحة تحكم وزارة الصحة
              </h1>
              <p className="text-blue-200 text-sm mt-1">إشراف مركزي وتحليل شامل لأداء المدن الصحية</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => { queryClient.invalidateQueries({ queryKey: ['city-summary'] }); refetch(); }}>
                <RefreshCw className="w-4 h-4 ml-1" />تحديث
              </Button>
              {canManageCities && (
                <Button size="sm" className="bg-white text-primary font-semibold hover:bg-white/90"
                  onClick={() => { setActiveTab('cities'); setShowAddDialog(true); }}>
                  <Plus className="w-4 h-4 ml-1" />تسجيل مدينة
                </Button>
              )}
            </div>
          </div>
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-6">
            {[
              { icon: BarChart3, label: 'متوسط الإنجاز الكلي',   value: `${agg.avgCompletion}%`,          sub: `عبر ${activeCities.length} مدينة`,      accent: 'text-sky-300'    },
              { icon: Target,   label: 'إجمالي المعايير',        value: agg.totalStandards || '—',         sub: 'مجموع معايير جميع المدن',              accent: 'text-emerald-300' },
              { icon: Users,    label: 'أعضاء الفرق',            value: agg.totalMembers || '—',           sub: 'في جميع المدن مجتمعة',                 accent: 'text-violet-300'  },
              { icon: DollarSign, label: 'إجمالي الميزانية',     value: `${fmtCurrency(agg.totalBudget)} ر`, sub: `صُرف ${spendPct}% (${fmtCurrency(agg.totalSpent)} ر)`, accent: 'text-amber-300' },
            ].map(k => (
              <div key={k.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
                <div className="flex items-center gap-1.5 mb-2">
                  <k.icon className={`w-4 h-4 ${k.accent}`} />
                  <span className="text-xs text-blue-100">{k.label}</span>
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-white">{k.value}</p>
                <p className="text-[11px] text-blue-200 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-white border border-slate-200 shadow-sm h-auto p-1 gap-1 w-full sm:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4" />نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="cities" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Building2 className="w-4 h-4" />المدن الصحية ({cityStats.total})
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="w-4 h-4" />فريق الوزارة ({teamStats.total})
            </TabsTrigger>
          </TabsList>

          {/* تبويب: نظرة عامة */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي المدن',  value: cityStats.total,     icon: Building2,    color: 'text-primary',     bg: 'bg-primary/10'  },
                { label: 'مدن نشطة',      value: cityStats.active,    icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
                { label: 'مدن موقوفة',    value: cityStats.suspended, icon: PauseCircle,  color: 'text-amber-600',   bg: 'bg-amber-100'   },
                { label: 'قيد المراجعة',  value: cityStats.pending,   icon: Activity,     color: 'text-blue-600',    bg: 'bg-blue-100'    },
              ].map(s => (
                <Card key={s.label} className="bg-white border border-border/60 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {agg.chartData.length > 0 && (
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />مقارنة نسبة الإنجاز بين المدن الصحية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={agg.chartData} margin={{ top: 8, right: 8, bottom: 32, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-15} textAnchor="end" interval={0} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                      <RechartsTooltip formatter={v => [`${v}%`, 'نسبة الإنجاز']} contentStyle={{ borderRadius: '10px', fontSize: '13px', direction: 'rtl' }} />
                      <Bar dataKey="completion" radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {agg.chartData.map((entry, i) => <Cell key={i} fill={completionColor(entry.completion)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4 mt-1 justify-center">
                    {[{ color: '#10b981', label: 'ممتاز ≥80%' }, { color: '#3b82f6', label: 'جيد 60–79%' }, { color: '#f59e0b', label: 'متوسط 30–59%' }, { color: '#ef4444', label: 'يحتاج تطوير <30%' }].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />{l.label}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" />ترتيب المدن حسب الأداء</div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('cities')}>
                    عرض التفاصيل الكاملة <ArrowUpRight className="w-4 h-4 mr-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                {citiesLoading ? (
                  <div className="flex items-center justify-center py-10"><div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
                ) : activeCities.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد مدن مسجلة</p>
                    {canManageCities && <Button size="sm" className="mt-3" onClick={() => { setActiveTab('cities'); setShowAddDialog(true); }}><Plus className="w-4 h-4 ml-1" />تسجيل أول مدينة</Button>}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50/70 text-slate-600 text-right">
                          <th className="py-3 px-4 font-medium w-10 text-center">#</th>
                          <th className="py-3 px-4 font-medium">المدينة</th>
                          <th className="py-3 px-4 font-medium">نسبة الإنجاز</th>
                          <th className="py-3 px-4 font-medium text-center">المعايير</th>
                          <th className="py-3 px-4 font-medium text-center">الفريق</th>
                          <th className="py-3 px-4 font-medium text-center">المهام</th>
                          <th className="py-3 px-4 font-medium text-center">الحالة</th>
                          <th className="py-3 px-4 font-medium text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeCities.map((city, idx) => (
                          <CityTableRow key={city.id} rank={idx + 1} city={city} onAction={handleCityAction} canManageCities={canManageCities} canManageLeadership={canManageLeadership} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي المهام',     value: agg.totalTasks,        icon: FileCheck,   color: 'text-violet-600', bg: 'bg-violet-50'  },
                { label: 'إجمالي المبادرات',  value: agg.totalInitiatives,  icon: Layers,      color: 'text-indigo-600', bg: 'bg-indigo-50'  },
                { label: 'إجمالي الأدلة',     value: agg.totalEvidence,     icon: ShieldCheck, color: 'text-teal-600',   bg: 'bg-teal-50'    },
                { label: 'نسبة الصرف الكلية', value: `${spendPct}%`,        icon: TrendingUp,  color: 'text-blue-600',   bg: 'bg-blue-50'    },
              ].map(s => (
                <Card key={s.label} className="bg-white border border-border/60 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* تبويب: المدن الصحية */}
          <TabsContent value="cities" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="ابحث عن مدينة بالاسم أو المنطقة..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 bg-white" />
              </div>
              {canManageCities && <Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 ml-1" />تسجيل مدينة</Button>}
            </div>
            {citiesLoading ? (
              <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
            ) : filteredCities.length === 0 ? (
              <Card className="border-dashed border-2 bg-white">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <Building2 className="w-12 h-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">{search ? 'لا توجد مدن تطابق البحث' : 'لم يتم تسجيل أي مدينة بعد'}</p>
                  {!search && canManageCities && <Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 ml-1" />تسجيل أول مدينة</Button>}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCities.map(city => (
                  <CityCard key={city.id} city={city} onAction={handleCityAction} selectedCityId={selectedCityId} canManageCities={canManageCities} canManageLeadership={canManageLeadership} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* تبويب: فريق الوزارة */}
          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إجمالي موظفي الوزارة', value: teamStats.total,    icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
                { label: 'تقنية المعلومات',       value: teamStats.it,       icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
                { label: 'موظفون مركزيون',        value: teamStats.central,  icon: Briefcase,   color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'موظفو المناطق',          value: teamStats.regional, icon: MapPin,      color: 'text-teal-600',   bg: 'bg-teal-50'   },
              ].map(s => (
                <Card key={s.label} className="bg-white border border-border/60 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="bg-white shadow-sm border border-slate-200">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5 text-primary" />أعضاء فريق الوزارة</CardTitle>
                <Button variant="outline" size="sm" onClick={() => navigate(`${createPageUrl('TeamManagement')}?view=ministry`)}>
                  <UserCog className="w-4 h-4 ml-1" />إدارة الفريق الكاملة
                </Button>
              </CardHeader>
              <CardContent>
                {ministryMembers.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا يوجد موظفون مسجلون في فريق الوزارة بعد</p>
                    <Button size="sm" className="mt-3" onClick={() => navigate(`${createPageUrl('TeamManagement')}?view=ministry`)}><Plus className="w-4 h-4 ml-1" />إضافة موظف</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      {ministryMembers.slice(0, 15).map(m => {
                        const roleMap = {
                          ministry_admin:          { label: 'مسؤول الوزارة',   cls: 'bg-blue-100 text-blue-800'    },
                          ministry_it_admin:       { label: 'تقنية المعلومات', cls: 'bg-violet-100 text-violet-800' },
                          ministry_staff:          { label: 'موظف مركزي',      cls: 'bg-indigo-100 text-indigo-800' },
                          ministry_regional_staff: { label: 'موظف منطقة',      cls: 'bg-teal-100 text-teal-800'    },
                        };
                        const rm = roleMap[m.role] || { label: m.role, cls: 'bg-slate-100 text-slate-800' };
                        return (
                          <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                              {String(m.full_name || '?').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{m.full_name || '—'}</p>
                              {m.email && <p className="text-xs text-slate-400 truncate">{m.email}</p>}
                              {m.ministry_region && <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" />{m.ministry_region}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${rm.cls}`}>{rm.label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {ministryMembers.length > 15 && (
                      <div className="text-center pt-3">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`${createPageUrl('TeamManagement')}?view=ministry`)}>
                          عرض جميع الموظفين ({ministryMembers.length}) <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOGS */}
      {canManageCities && (
        <CityFormDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} title="تسجيل مدينة صحية جديدة" submitLabel="تسجيل المدينة" onSave={data => createMutation.mutate(data)} />
      )}
      {canManageCities && (
        <CityFormDialog open={!!editingCity} onClose={() => setEditingCity(null)} initialData={editingCity} title={`تعديل بيانات ${editingCity?.name || 'المدينة'}`} submitLabel="حفظ التعديلات" onSave={data => updateCityMutation.mutate({ city: editingCity, updates: data })} />
      )}
      {canManageLeadership && (
        <LeadershipDialog open={!!leadershipDialog} onClose={() => setLeadershipDialog(null)} city={leadershipDialog?.city} role={leadershipDialog?.role} initialMember={leadershipDialog?.member} onSave={data => leadershipMutation.mutate({ city: leadershipDialog?.city, data })} />
      )}
      <Dialog open={!!confirmAction} onOpenChange={v => !v && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {confirmAction?.type === 'delete' ? 'حذف المدينة' : confirmAction?.type === 'suspend' ? 'تعليق المدينة' : 'تفعيل المدينة'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmAction?.type === 'delete'
              ? `هل أنت متأكد من حذف "${confirmAction?.city?.name}"؟ لن يتمكن مستخدمو هذه المدينة من الدخول.`
              : confirmAction?.type === 'suspend'
              ? `هل تريد تعليق نشاط مدينة "${confirmAction?.city?.name}"؟`
              : `هل تريد تفعيل مدينة "${confirmAction?.city?.name}"؟`}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>إلغاء</Button>
            <Button variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'} onClick={confirmActionHandler} disabled={statusMutation.isPending || deleteMutation.isPending}>
              {statusMutation.isPending || deleteMutation.isPending ? 'جارٍ...' : 'تأكيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
