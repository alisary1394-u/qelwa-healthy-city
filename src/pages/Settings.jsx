import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Settings as SettingsIcon, Upload, Trash2, Save, RotateCcw, Database, ChevronDown, MapPin, Plus, GripVertical, X, Pencil, Check } from "lucide-react";
import { usePermissions } from '@/hooks/usePermissions';
import { appParams } from '@/lib/app-params';

const DEFAULT_DISTRICTS = ['حي الشفاء', 'حي الخالدية', 'حي الصفاء', 'حي النسيم', 'حي العزيزية', 'حي الشروق'];

export default function Settings() {
  const [uploading, setUploading] = useState(false);
  const [logoSectionOpen, setLogoSectionOpen] = useState(true);
  const [districtsSectionOpen, setDistrictsSectionOpen] = useState(true);
  const [districtsList, setDistrictsList] = useState([]);
  const [newDistrict, setNewDistrict] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingValue, setEditingValue] = useState('');
  const [districtsSaving, setDistrictsSaving] = useState(false);
  const [renamingDistricts, setRenamingDistricts] = useState(false);
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
  const [formData, setFormData] = useState({
    logo_text: currentSetting.logo_text || 'ق',
    city_name: currentSetting.city_name || 'المدينة الصحية',
    city_location: currentSetting.city_location || 'محافظة قلوة',
    logo_url: currentSetting.logo_url || ''
  });

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
      // Also sync formData when settings load
      if (appSetting) {
        setFormData({
          logo_text: appSetting.logo_text || 'ق',
          city_name: appSetting.city_name || 'المدينة الصحية',
          city_location: appSetting.city_location || 'محافظة قلوة',
          logo_url: appSetting.logo_url || ''
        });
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await api.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: result.file_url });
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, logo_url: '' });
  };

  const handleSave = async () => {
    if (!permissions.canManageSettings) return;
    if (currentSetting.id) {
      await updateMutation.mutateAsync({ id: currentSetting.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
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
          <p className="text-white/70">إدارة شعار ومعلومات المدينة والأحياء</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Collapsible open={logoSectionOpen} onOpenChange={setLogoSectionOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SettingsIcon className="w-6 h-6" />
                    إعدادات الشعار
                  </div>
                  <div className="flex items-center gap-3">
                    {!logoSectionOpen && (
                      <div className="flex items-center gap-2">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="" className="w-8 h-8 rounded-full object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{formData.logo_text}</span>
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground font-normal">{formData.city_name}</span>
                      </div>
                    )}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${logoSectionOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">تغيير أو تعديل أو حذف شعار المدينة من لوحة التحكم</p>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
            {/* Logo Preview */}
            <div className="bg-muted/50 p-6 rounded-lg border-2 border-dashed border-border">
              <Label className="block mb-3 font-semibold">معاينة الشعار الحالي</Label>
              <div className="flex items-center justify-center">
                {formData.logo_url ? (
                  <img 
                    src={formData.logo_url} 
                    alt="شعار المدينة" 
                    className="max-w-[200px] max-h-[200px] object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-white font-bold text-4xl">{formData.logo_text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>تحميل شعار جديد (صورة)</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={uploading}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  {uploading ? (
                    <>جاري التحميل...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-2" />
                      اختر صورة
                    </>
                  )}
                </Button>
                {formData.logo_url && (
                  <Button
                    variant="destructive"
                    onClick={handleRemoveLogo}
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف الشعار
                  </Button>
                )}
              </div>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                يُفضل استخدام صورة مربعة بحجم 200x200 بكسل أو أكبر
              </p>
            </div>

            {/* Logo Text */}
            <div className="space-y-2">
              <Label>نص الشعار البديل</Label>
              <Input
                value={formData.logo_text}
                onChange={(e) => setFormData({ ...formData, logo_text: e.target.value })}
                placeholder="الحرف الذي يظهر في حال عدم وجود صورة"
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground">
                هذا النص يظهر إذا لم يتم تحميل صورة للشعار
              </p>
            </div>

            {/* City Name */}
            <div className="space-y-2">
              <Label>اسم المدينة</Label>
              <Input
                value={formData.city_name}
                onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                placeholder="المدينة الصحية"
              />
            </div>

            {/* City Location */}
            <div className="space-y-2">
              <Label>موقع المدينة</Label>
              <Input
                value={formData.city_location}
                onChange={(e) => setFormData({ ...formData, city_location: e.target.value })}
                placeholder="محافظة قلوة"
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={!permissions.canManageSettings}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Save className="w-5 h-5 ml-2" />
              حفظ التغييرات
            </Button>
          </CardContent>
        </CollapsibleContent>
        </Card>
      </Collapsible>

        {/* ===== إدارة الأحياء ===== */}
        <Collapsible open={districtsSectionOpen} onOpenChange={setDistrictsSectionOpen}>
          <Card className="mt-6">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-6 h-6" />
                    إدارة الأحياء
                  </div>
                  <div className="flex items-center gap-3">
                    {!districtsSectionOpen && (
                      <span className="text-sm text-muted-foreground font-normal">{districtsList.length} حي</span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${districtsSectionOpen ? 'rotate-180' : ''}`} />
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
          <Card className="mt-6 border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                استعادة البيانات من نسخة احتياطية
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
          </Card>
        )}

        {/* إعادة تحميل بيانات التجربة (محلي أو Supabase) */}
        {canShowReseedTools && typeof api.clearLocalDataAndReseed === 'function' && (
          <Card className="mt-6 border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-lg">
                {reseedSourceLabel}
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
          </Card>
        )}
      </div>
    </div>
  );
}