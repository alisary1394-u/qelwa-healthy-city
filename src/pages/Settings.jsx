import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, RotateCcw, Database, MapPin, Plus, GripVertical, X, Pencil, Check } from "lucide-react";
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
        {/* ===== إدارة الأحياء ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              إدارة الأحياء
              <span className="text-sm text-muted-foreground font-normal mr-auto">{districtsList.length} حي</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">إضافة أو تعديل أو حذف أحياء المحافظة التي تظهر في نموذج المسح الميداني</p>
          </CardHeader>
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
        </Card>

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