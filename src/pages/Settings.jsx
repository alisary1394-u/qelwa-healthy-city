import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, RotateCcw, Database, MapPin, Plus, GripVertical, X, Pencil, Check, Image, Upload, Trash2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { usePermissions } from '@/hooks/usePermissions';
import { appParams } from '@/lib/app-params';

const DEFAULT_DISTRICTS = ['حي الشفاء', 'حي الخالدية', 'حي الصفاء', 'حي النسيم', 'حي العزيزية', 'حي الشروق'];

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
  const queryClient = useQueryClient();

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

  // Find the app config settings record (not key-value data_mode records)
  const currentSetting = settings.find(s => s.city_name || s.logo_text || s.districts) || settings.find(s => !s.key) || {};

  // Sync logo form from settings
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

  // Initialize districts from settings
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Settings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  const { permissions } = usePermissions();

  const canShowReseedTools =
    appParams.useLocalBackend ||
    appParams.useSupabaseBackend ||
    (appParams.apiUrl && appParams.allowServerReseed);
  const reseedSourceLabel = appParams.apiUrl
    ? 'بيانات التجربة (سيرفر التطبيق)'
    : appParams.useSupabaseBackend
      ? 'بيانات التجربة (قاعدة Supabase)'
      : 'بيانات التجربة (الخلفية المحلية)';

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
      if (typeof window !== 'undefined') window.alert(data?.message || 'تمت الاستعادة. حدّث الصفحة.');
      if (typeof window !== 'undefined') window.location.reload();
    },
    onError: (err) => {
      if (typeof window !== 'undefined') window.alert(err?.message || 'فشلت الاستعادة');
    },
  });

  if (!permissions.canSeeSettings) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى هذه الصفحة</p>
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
    } catch (err) { console.error(err); }
    setLogoUploading(false);
  };

  const handleRemoveLogo = () => {
    if (!permissions.canManageSettings) return;
    setLogoForm(f => ({ ...f, logo_url: '' }));
  };

  const handleSaveLogo = async () => {
    if (!permissions.canManageSettings) return;
    const data = { ...logoForm };
    if (currentSetting.id) {
      await updateMutation.mutateAsync({ id: currentSetting.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  // ===== Districts management =====
  const handleAddDistrict = () => {
    const name = newDistrict.trim();
    if (!name) return;
    if (districtsList.includes(name)) {
      window.alert('هذا الحي موجود بالفعل');
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
      window.alert('هذا الاسم موجود بالفعل');
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
      window.alert('تم حفظ الأحياء بنجاح');
    } catch (err) {
      console.error('Error saving districts:', err);
      window.alert('فشل حفظ الأحياء');
    } finally {
      setDistrictsSaving(false);
    }
  };

  const handleResetDistricts = () => {
    setDistrictsList(DEFAULT_DISTRICTS);
  };

  // تحديث أسماء الأحياء في الاستبيانات الموجودة
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
        window.alert(`تم تحديث ${data.updated} استبيان من أصل ${data.total}`);
      } else {
        window.alert(data.error || 'فشل التحديث');
      }
    } catch (err) {
      console.error('Error renaming districts:', err);
      window.alert('فشل الاتصال بالسيرفر');
    } finally {
      setRenamingDistricts(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50" dir="rtl">
      <div className="gradient-primary text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إعدادات المدينة الصحية</h1>
          <p className="text-white/70">إدارة أحياء المحافظة والإعدادات العامة</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* ===== إعدادات الشعار ===== */}
        <Collapsible defaultOpen={false}>
        <Card className="mb-6">
          <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-6 h-6" />
                إعدادات الشعار
              </div>
              <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">تغيير أو تعديل أو حذف شعار المدينة</p>
          </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <Label className="block mb-2 text-sm font-medium">معاينة الشعار</Label>
                <div className="w-32 h-32 rounded-xl border-2 border-border bg-card flex items-center justify-center overflow-hidden">
                  {logoForm.logo_url ? (
                    <img src={logoForm.logo_url} alt="شعار" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-4xl font-bold text-white gradient-primary w-full h-full flex items-center justify-center rounded-xl">
                      {logoForm.logo_text || 'ق'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logoUploading || !permissions.canManageSettings}
                    onClick={() => document.getElementById('settings-logo-upload').click()}
                  >
                    <Upload className="w-4 h-4 ml-2" />
                    {logoUploading ? 'جاري الرفع...' : 'تغيير الشعار'}
                  </Button>
                  {logoForm.logo_url && permissions.canManageSettings && (
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={handleRemoveLogo}>
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف الشعار
                    </Button>
                  )}
                  <input
                    id="settings-logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">نص الشعار البديل</Label>
                    <Input
                      value={logoForm.logo_text}
                      disabled={!permissions.canManageSettings}
                      onChange={(e) => setLogoForm(f => ({ ...f, logo_text: e.target.value }))}
                      placeholder="ق"
                      maxLength={3}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">اسم المدينة</Label>
                    <Input
                      value={logoForm.city_name}
                      disabled={!permissions.canManageSettings}
                      onChange={(e) => setLogoForm(f => ({ ...f, city_name: e.target.value }))}
                      placeholder="المدينة الصحية"
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-sm">موقع المدينة</Label>
                    <Input
                      value={logoForm.city_location}
                      disabled={!permissions.canManageSettings}
                      onChange={(e) => setLogoForm(f => ({ ...f, city_location: e.target.value }))}
                      placeholder="محافظة قلوة"
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveLogo}
                  disabled={!permissions.canManageSettings || updateMutation.isPending || createMutation.isPending}
                >
                  <Save className="w-4 h-4 ml-2" />
                  حفظ التعديلات
                </Button>
              </div>
            </div>
          </CardContent>
          </CollapsibleContent>
        </Card>
        </Collapsible>

        {/* ===== إدارة الأحياء ===== */}
        <Collapsible defaultOpen={false}>
        <Card>
          <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                إدارة الأحياء
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-normal">{districtsList.length} حي</span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </div>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">إضافة أو تعديل أو حذف أحياء المحافظة التي تظهر في نموذج المسح الميداني</p>
          </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
          <CardContent className="space-y-4">
                {/* Current districts list */}
                <div className="space-y-2">
                  <Label className="font-semibold">الأحياء الحالية ({districtsList.length})</Label>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {districtsList.map((district, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 group">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                        <span className="text-sm font-medium text-[#1e3a5f] bg-[#1e3a5f]/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">{index + 1}</span>
                        {editingIndex === index ? (
                          <>
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit(); if (e.key === 'Escape') { setEditingIndex(-1); setEditingValue(''); } }}
                            />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700" onClick={handleConfirmEdit}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => { setEditingIndex(-1); setEditingValue(''); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{district}</span>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleStartEdit(index)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveDistrict(index)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                    {districtsList.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">لا توجد أحياء. أضف حياً جديداً من الأسفل.</p>
                    )}
                  </div>
                </div>

                {/* Add new district */}
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="اكتب اسم الحي الجديد..."
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddDistrict(); }}
                  />
                  <Button onClick={handleAddDistrict} disabled={!newDistrict.trim()} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveDistricts}
                    disabled={!permissions.canManageSettings || districtsSaving}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <Save className="w-4 h-4 ml-2" />
                    {districtsSaving ? 'جاري الحفظ...' : 'حفظ الأحياء'}
                  </Button>
                  <Button variant="outline" onClick={handleResetDistricts} className="text-amber-600 border-amber-300 hover:bg-amber-50">
                    <RotateCcw className="w-4 h-4 ml-1" />
                    استعادة الافتراضي
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  ملاحظة: تغيير الأحياء هنا يؤثر على نموذج المسح الميداني. لتحديث أسماء الأحياء في الاستبيانات المحفوظة مسبقاً، استخدم الزر أدناه.
                </p>

                {/* Update existing surveys */}
                <div className="pt-2 border-t">
                  <Label className="font-semibold text-amber-700 block mb-2">تحديث الاستبيانات الموجودة</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    هذا الزر يغيّر أسماء الأحياء القديمة في جميع الاستبيانات المحفوظة إلى الأسماء الجديدة أعلاه (بالترتيب: الأول يصبح الأول، الثاني يصبح الثاني، إلخ)
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-amber-500 text-amber-700 hover:bg-amber-50"
                    disabled={!permissions.canManageSettings || renamingDistricts}
                    onClick={handleRenameExistingSurveyDistricts}
                  >
                    <RotateCcw className="w-4 h-4 ml-2" />
                    {renamingDistricts ? 'جاري التحديث...' : 'تحديث أسماء الأحياء في الاستبيانات الحالية'}
                  </Button>
                </div>
          </CardContent>
          </CollapsibleContent>
        </Card>
        </Collapsible>

        {/* استعادة من آخر نسخة احتياطية (سيرفر التطبيق فقط) */}
        {canShowBackupRestore && (
          <Collapsible defaultOpen={false}>
          <Card className="mt-6 border-green-200 bg-green-50/50">
            <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-green-100/50 transition-colors rounded-t-lg">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  استعادة البيانات من نسخة احتياطية
                </div>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                إذا انحذفت البيانات (الفريق، المهام، اللجان…) وكان السيرفر يحفظ نسخاً احتياطية تلقائياً، يمكنك استعادة آخر نسخة. بعد الاستعادة سيتم إعادة تحميل الصفحة.
              </p>
              {backupsLoading ? (
                <p className="text-sm text-muted-foreground">جاري التحقق من النسخ الاحتياطية...</p>
              ) : backupsList.length === 0 ? (
                <p className="text-sm text-amber-700">لا توجد نسخ احتياطية حالياً. استخدم الخيار أدناه لإعادة تحميل بيانات التجربة.</p>
              ) : (
                <p className="text-sm text-muted-foreground">آخر نسخة: {backupsList[0]?.name || ''}</p>
              )}
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent>
              <Button
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-100"
                disabled={backupsList.length === 0 || restoreMutation.isPending}
                onClick={() => restoreMutation.mutate()}
              >
                <Database className="w-4 h-4 ml-2" />
                {restoreMutation.isPending ? 'جاري الاستعادة...' : 'استعادة من آخر نسخة احتياطية'}
              </Button>
            </CardContent>
            </CollapsibleContent>
          </Card>
          </Collapsible>
        )}

        {/* إعادة تحميل بيانات التجربة (محلي أو Supabase) */}
        {canShowReseedTools && typeof api.clearLocalDataAndReseed === 'function' && (
          <Collapsible defaultOpen={false}>
          <Card className="mt-6 border-amber-200 bg-amber-50/50">
            <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-amber-100/50 transition-colors rounded-t-lg">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>
                {reseedSourceLabel}
                </span>
                <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                إذا لم تظهر اللجان أو الفريق أو المبادرات أو المهام أو الميزانيات، اضغط الزر أدناه لمسح البيانات وإعادة تحميل بيانات التجربة. بعد إعادة التحميل سجّل الدخول برقم الهوية <strong>1</strong> وكلمة المرور <strong>123456</strong>.
              </p>
              {appParams.apiUrl && (
                <p className="text-xs text-amber-700 mt-2">
                  تنبيه: هذا الخيار ظاهر لأن <code>VITE_ALLOW_SERVER_RESEED=true</code> مفعّل. استخدمه فقط عند الضرورة القصوى.
                </p>
              )}
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent>
              <Button
                variant="outline"
                className="border-amber-500 text-amber-700 hover:bg-amber-100"
                onClick={() => api.clearLocalDataAndReseed()}
              >
                <RotateCcw className="w-4 h-4 ml-2" />
                مسح البيانات وإعادة تحميل بيانات التجربة
              </Button>
            </CardContent>
            </CollapsibleContent>
          </Card>
          </Collapsible>
        )}
      </div>
    </div>
  );
}