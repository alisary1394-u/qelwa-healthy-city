import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Mail, Loader2, CheckCircle } from "lucide-react";

export default function UserSettings() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ['userPreferences', currentUser?.email],
    queryFn: () => api.entities.UserPreferences.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser?.email
  });

  const currentPrefs = preferences[0] || {
    email_notifications: true,
    in_app_notifications: true,
    task_assigned_email: true,
    task_assigned_app: true,
    task_due_email: true,
    task_due_app: true
  };

  const [formData, setFormData] = useState(currentPrefs);

  useEffect(() => {
    if (preferences[0]) {
      setFormData(preferences[0]);
    }
  }, [preferences]);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.UserPreferences.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userPreferences'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.UserPreferences.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userPreferences'] })
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      if (preferences[0]) {
        await updateMutation.mutateAsync({
          id: preferences[0].id,
          data: formData
        });
      } else {
        await createMutation.mutateAsync({
          ...formData,
          user_email: currentUser?.email
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error(error);
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-green-600 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">الإعدادات الشخصية</h1>
          <p className="text-blue-100">إدارة تفضيلات الإشعارات والحساب</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <CardTitle>إعدادات الإشعارات</CardTitle>
            </div>
            <CardDescription>
              تحكم في كيفية ووقت استلام الإشعارات
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Global Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                الإعدادات العامة
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <Label className="text-base">الإشعارات داخل التطبيق</Label>
                    <p className="text-sm text-gray-500">إظهار الإشعارات في التطبيق</p>
                  </div>
                </div>
                <Switch
                  checked={formData.in_app_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, in_app_notifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-green-600" />
                  <div>
                    <Label className="text-base">إشعارات البريد الإلكتروني</Label>
                    <p className="text-sm text-gray-500">إرسال إشعارات عبر البريد</p>
                  </div>
                </div>
                <Switch
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                />
              </div>
            </div>

            <Separator />

            {/* Task Notifications */}
            <div className="space-y-4">
              <h3 className="font-semibold">إشعارات المهام</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>عند تعيين مهمة جديدة</Label>
                    <p className="text-xs text-gray-500">داخل التطبيق</p>
                  </div>
                  <Switch
                    checked={formData.task_assigned_app}
                    onCheckedChange={(checked) => setFormData({ ...formData, task_assigned_app: checked })}
                    disabled={!formData.in_app_notifications}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>عند تعيين مهمة جديدة</Label>
                    <p className="text-xs text-gray-500">عبر البريد الإلكتروني</p>
                  </div>
                  <Switch
                    checked={formData.task_assigned_email}
                    onCheckedChange={(checked) => setFormData({ ...formData, task_assigned_email: checked })}
                    disabled={!formData.email_notifications}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>تذكير بموعد المهمة</Label>
                    <p className="text-xs text-gray-500">داخل التطبيق</p>
                  </div>
                  <Switch
                    checked={formData.task_due_app}
                    onCheckedChange={(checked) => setFormData({ ...formData, task_due_app: checked })}
                    disabled={!formData.in_app_notifications}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>تذكير بموعد المهمة</Label>
                    <p className="text-xs text-gray-500">عبر البريد الإلكتروني</p>
                  </div>
                  <Switch
                    checked={formData.task_due_email}
                    onCheckedChange={(checked) => setFormData({ ...formData, task_due_email: checked })}
                    disabled={!formData.email_notifications}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {saved && <CheckCircle className="w-4 h-4 ml-2" />}
                حفظ الإعدادات
              </Button>
              {saved && <p className="text-sm text-green-600">تم حفظ الإعدادات بنجاح!</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}