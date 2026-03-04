import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Save, RotateCcw, Database, MapPin, Plus, GripVertical, X, Pencil, Check,
  Image, Upload, Trash2, Settings as SettingsIcon, Shield, Building2,
  HardDrive, AlertTriangle, CheckCircle2, Loader2, Search, Lock
} from "lucide-react";
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS_BY_ROLE, ROLE_LABELS, PERMISSION_REVIEW_KEYS } from '@/lib/permissions';
import { appParams } from '@/lib/app-params';

const DEFAULT_DISTRICTS = ['حي الشفاء', 'حي الخالدية', 'حي الصفاء', 'حي النسيم', 'حي العزيزية', 'حي الشروق'];

// Toast-like notification component
function Toast({ message, type = 'success', show, onClose }) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [show, onClose]);
  if (!show) return null;
  const colors = type === 'success'
    ? 'bg-emerald-500 text-white'
    : type === 'error' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white';
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-4 ${colors}`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {message}
    </div>
  );
}

export default function Settings() {
  const [districtsList, setDistrictsList] = useState([]);
  const [newDistrict, setNewDistrict] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingValue, setEditingValue] = useState('');
  const [districtsSaving, setDistrictsSaving] = useState(false);
  const [renamingDistricts, setRenamingDistricts] = useState(false);
  const [logoForm, setLogoForm] = useState({
    logo_url: '',
    logo_text: 'ق',
    city_name: 'المدينة الصحية',
    city_location: 'محافظة قلوة'
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Permissions state
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState('governor');
  const [editedPermissions, setEditedPermissions] = useState({ ...PERMISSIONS_BY_ROLE });
  const [permHasChanges, setPermHasChanges] = useState(false);
  const [permIsSaving, setPermIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const showToast = (message, type = 'success') => setToast({ show: true, message, type });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.entities.Settings.list()
  });

  const currentSetting = settings.find(s => s.city_name || s.logo_text || s.districts) || settings.find(s => !s.key) || {};

  useEffect(() => {
    if (currentSetting.id) {
      setLogoForm({
        logo_url: currentSetting.logo_url || '',
        logo_text: currentSetting.logo_text || 'ق',
        city_name: currentSetting.city_name || 'المدينة الصحية',
        city_location: currentSetting.city_location || 'محافظة قلوة'
      });
    }
  }, [currentSetting]);

  useEffect(() => {
    if (settings.length > 0) {
      const appSetting = settings.find(s => s.city_name || s.logo_text || s.districts) || settings.find(s => !s.key);
      const saved = appSetting?.districts;
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setDistrictsList(saved);
      } else {
        setDistrictsList(DEFAULT_DISTRICTS);
      }
    }
  }, [settings]);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Settings.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Settings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] })
  });

  // Permission overrides queries
  const { data: permissionOverrides = [], isLoading: isLoadingOverrides } = useQuery({
    queryKey: ['permissionOverrides'],
    queryFn: () => api.entities.PermissionOverride.list()
  });

  const createOverrideMutation = useMutation({
    mutationFn: (data) => api.entities.PermissionOverride.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissionOverrides'] })
  });

  const updateOverrideMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.PermissionOverride.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissionOverrides'] })
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: (id) => api.entities.PermissionOverride.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['permissionOverrides'] })
  });

  // Merge permission overrides
  useEffect(() => {
    if (permissionOverrides.length === 0) return;
    const merged = { ...PERMISSIONS_BY_ROLE };
    permissionOverrides.forEach((override) => {
      const roleKey = override.role;
      const permKey = override.permission_key;
      if (merged[roleKey] && permKey in merged[roleKey]) {
        merged[roleKey] = { ...merged[roleKey], [permKey]: override.is_enabled };
      }
    });
    setEditedPermissions(merged);
  }, [permissionOverrides]);

  const { permissions } = usePermissions();

  const canShowReseedTools =
    appParams.useLocalBackend ||
    appParams.useSupabaseBackend ||
    (appParams.apiUrl && appParams.allowServerReseed);
  const reseedSourceLabel = appParams.apiUrl
    ? 'سيرفر التطبيق'
    : appParams.useSupabaseBackend
      ? 'قاعدة Supabase'
      : 'الخلفية المحلية';

  const canShowBackupRestore = !!appParams.apiUrl && typeof api.backups?.list === 'function';
  const { data: backupsList = [], isLoading: backupsLoading } = useQuery({
    queryKey: ['backupsList'],
    queryFn: () => api.backups.list(),
    enabled: canShowBackupRestore,
  });
  const restoreMutation = useMutation({
    mutationFn: () => api.backups.restoreLatest(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', 'tasks', 'settings', 'committees'] });
      showToast(data?.message || 'تمت الاستعادة بنجاح');
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err) => showToast(err?.message || 'فشلت الاستعادة', 'error'),
  });

  if (!permissions.canSeeSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-600 font-bold text-lg">غير مصرح لك بالوصول</p>
            <p className="text-muted-foreground text-sm mt-2">صلاحيات الصفحة مرتبطة بمنصبك في الفريق</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== Logo management =====
  const handleLogoUpload = async (e) => {
    if (!permissions.canManageSettings) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const result = await api.integrations?.Core?.UploadFile?.({ file });
      if (result?.file_url) setLogoForm(f => ({ ...f, logo_url: result.file_url }));
      showToast('تم رفع الشعار بنجاح');
    } catch (err) {
      console.error(err);
      showToast('فشل رفع الشعار', 'error');
    }
    setLogoUploading(false);
  };

  const handleRemoveLogo = () => {
    if (!permissions.canManageSettings) return;
    setLogoForm(f => ({ ...f, logo_url: '' }));
  };

  const handleSaveLogo = async () => {
    if (!permissions.canManageSettings) return;
    setLogoSaved(false);
    const data = { ...logoForm };
    try {
      if (currentSetting.id) {
        await updateMutation.mutateAsync({ id: currentSetting.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setLogoSaved(true);
      showToast('تم حفظ إعدادات الشعار');
      setTimeout(() => setLogoSaved(false), 2000);
    } catch {
      showToast('فشل حفظ الإعدادات', 'error');
    }
  };

  // ===== Districts management =====
  const handleAddDistrict = () => {
    const name = newDistrict.trim();
    if (!name) return;
    if (districtsList.includes(name)) {
      showToast('هذا الحي موجود بالفعل', 'warning');
      return;
    }
    setDistrictsList([...districtsList, name]);
    setNewDistrict('');
  };

  const handleRemoveDistrict = (index) => {
    setDistrictsList(districtsList.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(districtsList[index]);
  };

  const handleConfirmEdit = () => {
    const name = editingValue.trim();
    if (!name) return;
    if (districtsList.some((d, i) => d === name && i !== editingIndex)) {
      showToast('هذا الاسم موجود بالفعل', 'warning');
      return;
    }
    const updated = [...districtsList];
    updated[editingIndex] = name;
    setDistrictsList(updated);
    setEditingIndex(-1);
    setEditingValue('');
  };

  const handleSaveDistricts = async () => {
    if (!permissions.canManageSettings) return;
    setDistrictsSaving(true);
    try {
      const payload = { districts: districtsList };
      if (currentSetting.id) {
        await updateMutation.mutateAsync({ id: currentSetting.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      showToast('تم حفظ الأحياء بنجاح');
    } catch (err) {
      console.error('Error saving districts:', err);
      showToast('فشل حفظ الأحياء', 'error');
    } finally {
      setDistrictsSaving(false);
    }
  };

  const handleResetDistricts = () => {
    setDistrictsList(DEFAULT_DISTRICTS);
    showToast('تم استعادة الأحياء الافتراضية');
  };

  const handleRenameExistingSurveyDistricts = async () => {
    if (!permissions.canManageSettings) return;
    setRenamingDistricts(true);
    try {
      const base = appParams.apiUrl || '';
      const resp = await fetch(base + '/api/rename-survey-districts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districts: districtsList })
      });
      const data = await resp.json();
      if (data.ok) {
        queryClient.invalidateQueries({ queryKey: ['surveys'] });
        showToast(`تم تحديث ${data.updated} استبيان من أصل ${data.total}`);
      } else {
        showToast(data.error || 'فشل التحديث', 'error');
      }
    } catch (err) {
      console.error('Error renaming districts:', err);
      showToast('فشل الاتصال بالسيرفر', 'error');
    } finally {
      setRenamingDistricts(false);
    }
  };

  const showDataTab = canShowBackupRestore || (canShowReseedTools && typeof api.clearLocalDataAndReseed === 'function');

  // Permissions helpers
  const allRoles = Object.keys(PERMISSIONS_BY_ROLE);
  const filteredPermissionKeys = useMemo(() => {
    if (!permSearchQuery) return PERMISSION_REVIEW_KEYS;
    const query = permSearchQuery.toLowerCase();
    return PERMISSION_REVIEW_KEYS.filter(({ label }) => label.toLowerCase().includes(query));
  }, [permSearchQuery]);

  const activeRolePermissions = editedPermissions[activeRole] || {};
  const activeRoleLabel = ROLE_LABELS[activeRole] || activeRole;
  const canManagePermissions = permissions.canManageSettings;

  const handlePermissionToggle = (roleKey, permissionKey) => {
    setEditedPermissions(prev => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [permissionKey]: !prev[roleKey][permissionKey] }
    }));
    setPermHasChanges(true);
  };

  const handleSavePermissions = async () => {
    setPermIsSaving(true);
    try {
      const modifiedBy = currentUser?.email || 'unknown';
      const modifiedAt = new Date().toISOString();
      for (const roleKey of Object.keys(editedPermissions)) {
        const rolePerms = editedPermissions[roleKey];
        const defaultPerms = PERMISSIONS_BY_ROLE[roleKey];
        for (const permKey of Object.keys(rolePerms)) {
          if (permKey === 'label') continue;
          const currentValue = rolePerms[permKey];
          const defaultValue = defaultPerms?.[permKey];
          if (currentValue !== defaultValue) {
            const existingOverride = permissionOverrides.find(o => o.role === roleKey && o.permission_key === permKey);
            if (existingOverride) {
              await updateOverrideMutation.mutateAsync({ id: existingOverride.id, data: { is_enabled: currentValue, modified_by: modifiedBy, modified_at: modifiedAt } });
            } else {
              await createOverrideMutation.mutateAsync({ role: roleKey, permission_key: permKey, is_enabled: currentValue, modified_by: modifiedBy, modified_at: modifiedAt });
            }
          } else {
            const existingOverride = permissionOverrides.find(o => o.role === roleKey && o.permission_key === permKey);
            if (existingOverride) {
              await deleteOverrideMutation.mutateAsync(existingOverride.id);
            }
          }
        }
      }
      showToast('تم حفظ تغييرات الصلاحيات بنجاح');
      setPermHasChanges(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      showToast(error?.message || 'حدث خطأ أثناء حفظ الصلاحيات', 'error');
    } finally {
      setPermIsSaving(false);
    }
  };

  const handleResetPermissions = async () => {
    try {
      for (const override of permissionOverrides) {
        await deleteOverrideMutation.mutateAsync(override.id);
      }
      setEditedPermissions({ ...PERMISSIONS_BY_ROLE });
      setPermHasChanges(false);
      showToast('تم إعادة تعيين جميع الصلاحيات إلى القيم الافتراضية');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      showToast('حدث خطأ أثناء إعادة التعيين', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50" dir="rtl">
      <Toast {...toast} onClose={() => setToast(t => ({ ...t, show: false }))} />

      {/* ===== Professional Header ===== */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAwdjYwTTAgMzBoNjAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-40" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-14 md:pb-16">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
              <SettingsIcon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">لوحة الإعدادات</h1>
              <p className="text-white/60 text-sm mt-1">إدارة شعار المدينة، الأحياء، وأدوات البيانات</p>
            </div>
            {currentUser && (
              <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/15">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold border-2 border-white/30">
                  {(currentUser.full_name || currentUser.name || '؟')[0]}
                </div>
                <div className="text-white text-sm">
                  <p className="font-medium leading-tight">{currentUser.full_name || currentUser.name || 'مستخدم'}</p>
                  <p className="text-white/50 text-[11px]">{permissions.canManageSettings ? 'مدير النظام' : 'عرض فقط'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center gap-3 mt-6 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/15">
              <Building2 className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white text-xs font-medium">{logoForm.city_name || 'المدينة الصحية'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/15">
              <MapPin className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white text-xs font-medium">{districtsList.length} حي</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/15">
              <Shield className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white text-xs font-medium">{permissions.canManageSettings ? 'صلاحيات كاملة' : 'عرض فقط'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tabs Content ===== */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-8">
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="w-full bg-white shadow-lg border border-border/50 rounded-2xl h-auto p-1.5 flex flex-wrap gap-1">
            <TabsTrigger value="branding" className="flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-2.5 px-4 text-sm font-medium gap-2">
              <Image className="w-4 h-4" />
              الشعار والهوية
            </TabsTrigger>
            <TabsTrigger value="districts" className="flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-2.5 px-4 text-sm font-medium gap-2">
              <MapPin className="w-4 h-4" />
              الأحياء
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 mr-1 bg-[#1e3a5f]/10 text-[#1e3a5f] data-[state=active]:bg-white/20 data-[state=active]:text-white">{districtsList.length}</Badge>
            </TabsTrigger>
            {showDataTab && (
              <TabsTrigger value="data" className="flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-2.5 px-4 text-sm font-medium gap-2">
                <Database className="w-4 h-4" />
                البيانات
              </TabsTrigger>
            )}
            {canManagePermissions && (
              <TabsTrigger value="permissions" className="flex-1 min-w-[120px] rounded-xl data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-2.5 px-4 text-sm font-medium gap-2">
                <Shield className="w-4 h-4" />
                الصلاحيات
              </TabsTrigger>
            )}
          </TabsList>

          {/* ===== Tab 1: Branding ===== */}
          <TabsContent value="branding" className="mt-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-l from-blue-50/80 to-indigo-50/50 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-[#1e3a5f]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">الشعار والهوية البصرية</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">تخصيص شعار واسم المدينة الصحية</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Logo Preview — modern card */}
                  <div className="flex flex-col items-center lg:items-start gap-4">
                    <div className="relative group">
                      <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-slate-50 to-white flex items-center justify-center overflow-hidden shadow-inner transition-all group-hover:border-[#1e3a5f]/30">
                        {logoForm.logo_url ? (
                          <img src={logoForm.logo_url} alt="شعار" className="w-full h-full object-contain p-2" />
                        ) : (
                          <span className="text-5xl font-bold text-white gradient-primary w-full h-full flex items-center justify-center rounded-xl">
                            {logoForm.logo_text || 'ق'}
                          </span>
                        )}
                      </div>
                      {/* Upload overlay */}
                      <button
                        className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                        disabled={logoUploading || !permissions.canManageSettings}
                        onClick={() => document.getElementById('settings-logo-upload').click()}
                      >
                        <div className="bg-white/90 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
                          <Upload className="w-4 h-4 text-[#1e3a5f]" />
                          <span className="text-xs font-medium text-[#1e3a5f]">
                            {logoUploading ? 'جاري الرفع...' : 'تغيير الشعار'}
                          </span>
                        </div>
                      </button>
                    </div>
                    <input
                      id="settings-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={logoUploading || !permissions.canManageSettings}
                        onClick={() => document.getElementById('settings-logo-upload').click()}
                      >
                        <Upload className="w-3.5 h-3.5 ml-1.5" />
                        {logoUploading ? 'جاري الرفع...' : 'رفع صورة'}
                      </Button>
                      {logoForm.logo_url && permissions.canManageSettings && (
                        <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleRemoveLogo}>
                          <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                          حذف
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center max-w-[180px]">
                      صورة مربعة بحجم 200×200 بكسل أو أكبر (PNG, JPG)
                    </p>
                  </div>

                  {/* Form fields */}
                  <div className="flex-1 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          نص الشعار البديل
                          <span className="text-[10px] text-muted-foreground font-normal">(يظهر عند عدم وجود صورة)</span>
                        </Label>
                        <Input
                          value={logoForm.logo_text}
                          disabled={!permissions.canManageSettings}
                          onChange={(e) => setLogoForm(f => ({ ...f, logo_text: e.target.value }))}
                          placeholder="ق"
                          maxLength={3}
                          className="h-11 text-center text-lg font-bold border-border/50 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">اسم المدينة</Label>
                        <Input
                          value={logoForm.city_name}
                          disabled={!permissions.canManageSettings}
                          onChange={(e) => setLogoForm(f => ({ ...f, city_name: e.target.value }))}
                          placeholder="المدينة الصحية"
                          className="h-11 border-border/50 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">موقع المدينة</Label>
                      <Input
                        value={logoForm.city_location}
                        disabled={!permissions.canManageSettings}
                        onChange={(e) => setLogoForm(f => ({ ...f, city_location: e.target.value }))}
                        placeholder="محافظة قلوة"
                        className="h-11 border-border/50 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/20"
                      />
                    </div>

                    <Separator />

                    <Button
                      onClick={handleSaveLogo}
                      disabled={!permissions.canManageSettings || updateMutation.isPending || createMutation.isPending}
                      className="w-full h-11 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      {updateMutation.isPending || createMutation.isPending ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      ) : logoSaved ? (
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                      ) : (
                        <Save className="w-4 h-4 ml-2" />
                      )}
                      {logoSaved ? 'تم الحفظ' : 'حفظ إعدادات الشعار'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Tab 2: Districts ===== */}
          <TabsContent value="districts" className="mt-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300">
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-l from-emerald-50/80 to-teal-50/50 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">إدارة الأحياء</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">الأحياء التي تظهر في نموذج المسح الميداني</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">
                    {districtsList.length} حي
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Districts grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-sm">قائمة الأحياء</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetDistricts}
                      className="text-xs text-muted-foreground hover:text-amber-600 h-7"
                    >
                      <RotateCcw className="w-3 h-3 ml-1" />
                      استعادة الافتراضي
                    </Button>
                  </div>
                  <div className="grid gap-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                    {districtsList.map((district, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-border/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] group hover:border-[#1e3a5f]/20 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-bold text-white bg-[#1e3a5f] rounded-lg w-7 h-7 flex items-center justify-center flex-shrink-0 shadow-sm">
                            {index + 1}
                          </span>
                          {editingIndex === index ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="flex-1 h-8 text-sm border-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmEdit();
                                if (e.key === 'Escape') { setEditingIndex(-1); setEditingValue(''); }
                              }}
                            />
                          ) : (
                            <span className="text-sm font-medium truncate">{district}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {editingIndex === index ? (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={handleConfirmEdit}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted" onClick={() => { setEditingIndex(-1); setEditingValue(''); }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleStartEdit(index)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleRemoveDistrict(index)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {districtsList.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">لا توجد أحياء. أضف حياً جديداً من الأسفل.</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Add new district */}
                <div className="space-y-3">
                  <Label className="font-semibold text-sm">إضافة حي جديد</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newDistrict}
                      onChange={(e) => setNewDistrict(e.target.value)}
                      placeholder="اكتب اسم الحي الجديد..."
                      className="flex-1 h-11 border-border/50 focus:border-emerald-500 focus:ring-emerald-500/20"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddDistrict(); }}
                    />
                    <Button
                      onClick={handleAddDistrict}
                      disabled={!newDistrict.trim()}
                      className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    >
                      <Plus className="w-4 h-4 ml-1.5" />
                      إضافة
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Save actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSaveDistricts}
                    disabled={!permissions.canManageSettings || districtsSaving}
                    className="flex-1 h-11 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white shadow-md"
                  >
                    {districtsSaving ? (
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    {districtsSaving ? 'جاري الحفظ...' : 'حفظ الأحياء'}
                  </Button>
                </div>

                {/* Rename existing surveys */}
                <Card className="bg-amber-50/50 border-amber-200/60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-800">تحديث الاستبيانات الموجودة</p>
                        <p className="text-xs text-amber-700/70 mt-1 leading-relaxed">
                          يغيّر أسماء الأحياء القديمة في جميع الاستبيانات المحفوظة إلى الأسماء الجديدة بالترتيب
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 border-amber-400 text-amber-700 hover:bg-amber-100 text-xs"
                          disabled={!permissions.canManageSettings || renamingDistricts}
                          onClick={handleRenameExistingSurveyDistricts}
                        >
                          {renamingDistricts ? (
                            <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                          )}
                          {renamingDistricts ? 'جاري التحديث...' : 'تحديث أسماء الأحياء في الاستبيانات'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Tab 3: Data Management ===== */}
          {showDataTab && (
            <TabsContent value="data" className="mt-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300 space-y-6">
              {/* Backup Restore */}
              {canShowBackupRestore && (
                <Card className="shadow-lg border-0 overflow-hidden">
                  <CardHeader className="bg-gradient-to-l from-green-50/80 to-emerald-50/50 border-b border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <HardDrive className="w-5 h-5 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">النسخ الاحتياطي والاستعادة</CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          استعادة البيانات من آخر نسخة احتياطية تلقائية
                        </p>
                      </div>
                      {!backupsLoading && (
                        <Badge variant="outline" className={backupsList.length > 0 ? 'border-green-300 text-green-700 bg-green-50' : 'border-amber-300 text-amber-700 bg-amber-50'}>
                          {backupsList.length > 0 ? `${backupsList.length} نسخة متوفرة` : 'لا توجد نسخ'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {backupsLoading ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">جاري التحقق من النسخ الاحتياطية...</span>
                      </div>
                    ) : backupsList.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">لا توجد نسخ احتياطية حالياً</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-green-50/50 rounded-xl p-4 border border-green-200/60">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-green-800">آخر نسخة احتياطية</p>
                              <p className="text-xs text-green-600/80 mt-0.5">{backupsList[0]?.name || 'غير محدد'}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          className="w-full h-11 bg-green-600 hover:bg-green-700 text-white shadow-md"
                          disabled={restoreMutation.isPending}
                          onClick={() => restoreMutation.mutate()}
                        >
                          {restoreMutation.isPending ? (
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          ) : (
                            <Database className="w-4 h-4 ml-2" />
                          )}
                          {restoreMutation.isPending ? 'جاري الاستعادة...' : 'استعادة من آخر نسخة احتياطية'}
                        </Button>
                        <p className="text-[11px] text-muted-foreground text-center">
                          بعد الاستعادة سيتم إعادة تحميل الصفحة تلقائياً
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Reseed Tools */}
              {canShowReseedTools && typeof api.clearLocalDataAndReseed === 'function' && (
                <Card className="shadow-lg border-0 overflow-hidden border-t-4 border-t-amber-400">
                  <CardHeader className="bg-gradient-to-l from-amber-50/80 to-orange-50/30 border-b border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-amber-900">إعادة تحميل بيانات التجربة</CardTitle>
                        <p className="text-sm text-amber-700/70 mt-0.5">المصدر: {reseedSourceLabel}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/60 space-y-2">
                      <p className="text-sm text-amber-800 leading-relaxed">
                        يمسح جميع البيانات الحالية ويعيد تحميل بيانات التجربة الافتراضية.
                      </p>
                      <p className="text-xs text-amber-600 leading-relaxed">
                        بعد إعادة التحميل سجّل الدخول برقم الهوية <strong className="text-amber-900">1</strong> وكلمة المرور <strong className="text-amber-900">123456</strong>
                      </p>
                    </div>
                    {appParams.apiUrl && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-200/40">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>هذا الخيار ظاهر لأن VITE_ALLOW_SERVER_RESEED مفعّل. استخدمه عند الضرورة فقط.</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full h-11 border-amber-400 text-amber-700 hover:bg-amber-100 font-medium"
                      onClick={() => api.clearLocalDataAndReseed()}
                    >
                      <RotateCcw className="w-4 h-4 ml-2" />
                      مسح البيانات وإعادة تحميل بيانات التجربة
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* ===== Tab 4: Permissions ===== */}
          {canManagePermissions && (
            <TabsContent value="permissions" className="mt-6 animate-in fade-in-50 slide-in-from-bottom-3 duration-300 space-y-6">
              {/* Summary Stats */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-l from-purple-50/80 to-indigo-50/50 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-700" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">إدارة الصلاحيات</CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">التحكم بمصفوفة صلاحيات المناصب</p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-xl font-bold text-purple-700">
                          {Object.values(activeRolePermissions).filter(Boolean).length}
                        </p>
                        <p className="text-purple-600 text-xs">مُفعّلة</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-muted-foreground">
                          {Object.values(activeRolePermissions).filter(v => !v).length}
                        </p>
                        <p className="text-muted-foreground text-xs">معطّلة</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-purple-700">
                          {Object.keys(activeRolePermissions).length}
                        </p>
                        <p className="text-purple-600 text-xs">إجمالي</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {isLoadingOverrides && (
                    <div className="flex items-center gap-3 text-blue-600 bg-blue-50 rounded-xl p-4 border border-blue-200/60">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <p className="text-sm">جاري تحميل الصلاحيات المخصصة...</p>
                    </div>
                  )}

                  {/* Unsaved changes alert */}
                  {permHasChanges && (
                    <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-4 border border-amber-200/60">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800">لديك تغييرات غير محفوظة</p>
                        <p className="text-xs text-amber-700/70 mt-0.5">احفظ التغييرات لتطبيقها على النظام</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleResetPermissions} disabled={permIsSaving} className="border-amber-400 text-amber-700 hover:bg-amber-100 text-xs">
                          <RotateCcw className="w-3.5 h-3.5 ml-1" />
                          إلغاء
                        </Button>
                        <Button size="sm" onClick={handleSavePermissions} disabled={permIsSaving} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                          {permIsSaving ? <Loader2 className="w-3.5 h-3.5 ml-1 animate-spin" /> : <Save className="w-3.5 h-3.5 ml-1" />}
                          {permIsSaving ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Search + actions */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث في الصلاحيات..."
                        value={permSearchQuery}
                        onChange={(e) => setPermSearchQuery(e.target.value)}
                        className="pr-10 h-10 border-border/50 focus:border-purple-500 focus:ring-purple-500/20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleResetPermissions} disabled={!permHasChanges || permIsSaving} className="h-10 text-xs">
                        <RotateCcw className="w-4 h-4 ml-1.5" />
                        إعادة تعيين
                      </Button>
                      <Button size="sm" onClick={handleSavePermissions} disabled={!permHasChanges || permIsSaving} className="h-10 bg-purple-600 hover:bg-purple-700 text-white text-xs">
                        {permIsSaving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Save className="w-4 h-4 ml-1.5" />}
                        {permIsSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Role selector */}
                  <div>
                    <Label className="font-semibold text-sm mb-3 block">اختر المنصب لتعديل صلاحياته</Label>
                    <Tabs value={activeRole} onValueChange={setActiveRole}>
                      <TabsList className="flex-wrap h-auto gap-1 bg-muted p-1 flex-row-reverse justify-end">
                        {allRoles.map((roleKey) => (
                          <TabsTrigger key={roleKey} value={roleKey} className="text-xs">
                            {ROLE_LABELS[roleKey]}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>

                  <Separator />

                  {/* Permissions list */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <Label className="font-semibold text-sm">صلاحيات: {activeRoleLabel}</Label>
                    </div>
                    {filteredPermissionKeys.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">لا توجد صلاحيات تطابق البحث</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredPermissionKeys.map(({ key, label }) => {
                          const isEnabled = activeRolePermissions[key] === true;
                          return (
                            <div key={key} className="flex items-center justify-between p-3 rounded-xl border bg-white hover:bg-muted/50 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                              <div className="flex items-center gap-3">
                                {isEnabled ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
                                )}
                                <div>
                                  <Label htmlFor={`${activeRole}-${key}`} className="text-sm font-medium cursor-pointer">{label}</Label>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{key}</p>
                                </div>
                              </div>
                              <Switch
                                id={`${activeRole}-${key}`}
                                checked={isEnabled}
                                onCheckedChange={() => handlePermissionToggle(activeRole, key)}
                                className="data-[state=checked]:bg-purple-600"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Footer spacing */}
      <div className="h-12" />
    </div>
  );
}