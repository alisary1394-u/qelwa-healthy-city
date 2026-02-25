import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Upload, Trash2, Save, Image, RotateCcw, Database } from "lucide-react";
import { usePermissions } from '@/hooks/usePermissions';
import { appParams } from '@/lib/app-params';

export default function Settings() {
  const [uploading, setUploading] = useState(false);
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

  const currentSetting = settings[0] || {};
  const [formData, setFormData] = useState({
    logo_text: currentSetting.logo_text || 'ق',
    city_name: currentSetting.city_name || 'المدينة الصحية',
    city_location: currentSetting.city_location || 'محافظة قلوة',
    logo_url: currentSetting.logo_url || ''
  });

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

  const { isGovernor } = usePermissions();
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

  if (!isGovernor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى هذه الصفحة</p>
            <p className="text-gray-500 text-sm mt-2">هذه الصفحة متاحة فقط للمشرف العام</p>
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
    if (currentSetting.id) {
      await updateMutation.mutateAsync({ id: currentSetting.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إعدادات المدينة الصحية</h1>
          <p className="text-blue-100">إدارة شعار ومعلومات المدينة</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              تخصيص الشعار والمعلومات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Preview */}
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
              <Label className="block mb-3 font-semibold">معاينة الشعار الحالي</Label>
              <div className="flex items-center justify-center">
                {formData.logo_url ? (
                  <img 
                    src={formData.logo_url} 
                    alt="شعار المدينة" 
                    className="max-w-[200px] max-h-[200px] object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
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
              <p className="text-xs text-gray-500">
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
              <p className="text-xs text-gray-500">
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
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Save className="w-5 h-5 ml-2" />
              حفظ التغييرات
            </Button>
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
              <p className="text-sm text-gray-600 mt-1">
                إذا انحذفت البيانات (الفريق، المهام، اللجان…) وكان السيرفر يحفظ نسخاً احتياطية تلقائياً، يمكنك استعادة آخر نسخة. بعد الاستعادة سيتم إعادة تحميل الصفحة.
              </p>
              {backupsLoading ? (
                <p className="text-sm text-gray-500">جاري التحقق من النسخ الاحتياطية...</p>
              ) : backupsList.length === 0 ? (
                <p className="text-sm text-amber-700">لا توجد نسخ احتياطية حالياً. استخدم الخيار أدناه لإعادة تحميل بيانات التجربة.</p>
              ) : (
                <p className="text-sm text-gray-600">آخر نسخة: {backupsList[0]?.name || ''}</p>
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
              <p className="text-sm text-gray-600 mt-1">
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