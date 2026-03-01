import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Save, RotateCcw, Search, AlertCircle, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS_BY_ROLE, ROLE_LABELS, PERMISSION_REVIEW_KEYS } from '@/lib/permissions';
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PermissionsManager() {
  const { permissions, role } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState('governor');
  const [editedPermissions, setEditedPermissions] = useState({ ...PERMISSIONS_BY_ROLE });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

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

  useEffect(() => {
    if (permissionOverrides.length === 0) return;
    
    const merged = { ...PERMISSIONS_BY_ROLE };
    permissionOverrides.forEach((override) => {
      const roleKey = override.role;
      const permKey = override.permission_key;
      if (merged[roleKey] && permKey in merged[roleKey]) {
        merged[roleKey] = {
          ...merged[roleKey],
          [permKey]: override.is_enabled
        };
      }
    });
    
    setEditedPermissions(merged);
  }, [permissionOverrides]);

  const allRoles = Object.keys(PERMISSIONS_BY_ROLE);
  const filteredPermissionKeys = useMemo(() => {
    if (!searchQuery) return PERMISSION_REVIEW_KEYS;
    const query = searchQuery.toLowerCase();
    return PERMISSION_REVIEW_KEYS.filter(({ label }) => 
      label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const activeRolePermissions = editedPermissions[activeRole] || {};
  const activeRoleLabel = ROLE_LABELS[activeRole] || activeRole;

  const canManagePermissions = role === 'governor' || role === 'coordinator';

  if (!canManagePermissions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Lock className="w-16 h-16 mx-auto text-red-300 mb-4" />
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى لوحة الصلاحيات.</p>
            <p className="text-gray-500 text-sm mt-2">هذه الصفحة متاحة للمشرف العام ومنسق المدينة الصحية فقط.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePermissionToggle = (roleKey, permissionKey) => {
    setEditedPermissions(prev => ({
      ...prev,
      [roleKey]: {
        ...prev[roleKey],
        [permissionKey]: !prev[roleKey][permissionKey]
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
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
            const existingOverride = permissionOverrides.find(
              (o) => o.role === roleKey && o.permission_key === permKey
            );
            
            if (existingOverride) {
              await updateOverrideMutation.mutateAsync({
                id: existingOverride.id,
                data: {
                  is_enabled: currentValue,
                  modified_by: modifiedBy,
                  modified_at: modifiedAt
                }
              });
            } else {
              await createOverrideMutation.mutateAsync({
                role: roleKey,
                permission_key: permKey,
                is_enabled: currentValue,
                modified_by: modifiedBy,
                modified_at: modifiedAt
              });
            }
          } else {
            const existingOverride = permissionOverrides.find(
              (o) => o.role === roleKey && o.permission_key === permKey
            );
            if (existingOverride) {
              await deleteOverrideMutation.mutateAsync(existingOverride.id);
            }
          }
        }
      }
      
      toast({
        title: 'تم الحفظ بنجاح',
        description: 'تم حفظ تغييرات الصلاحيات. يُرجى إعادة تحميل الصفحة لتطبيق التغييرات.',
        variant: 'default',
      });
      
      setHasChanges(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast({
        title: 'خطأ في الحفظ',
        description: error?.message || 'حدث خطأ أثناء حفظ الصلاحيات. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      for (const override of permissionOverrides) {
        await deleteOverrideMutation.mutateAsync(override.id);
      }
      
      setEditedPermissions({ ...PERMISSIONS_BY_ROLE });
      setHasChanges(false);
      
      toast({
        title: 'تمت إعادة التعيين',
        description: 'تم إعادة تعيين جميع الصلاحيات إلى القيم الافتراضية.',
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إعادة التعيين.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-purple-700 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">لوحة إدارة الصلاحيات</h1>
              <p className="text-purple-100 text-sm mt-1">التحكم الكامل بمصفوفة صلاحيات المناصب</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Summary Stats */}
        <Card className="mb-6 border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">ملخص الصلاحيات</span>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {Object.values(activeRolePermissions).filter(Boolean).length}
                  </p>
                  <p className="text-purple-600">مُفعّلة</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-500">
                    {Object.values(activeRolePermissions).filter(v => !v).length}
                  </p>
                  <p className="text-gray-600">معطّلة</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {Object.keys(activeRolePermissions).length}
                  </p>
                  <p className="text-purple-600">إجمالي</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoadingOverrides && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-blue-800">جاري تحميل الصلاحيات المخصصة...</p>
            </CardContent>
          </Card>
        )}
        {/* Alert for unsaved changes */}
        {hasChanges && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
              <div className="flex-1">
                <p className="text-orange-800 font-medium">لديك تغييرات غير محفوظة</p>
                <p className="text-orange-600 text-sm">احفظ التغييرات لتطبيقها على النظام</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  disabled={isSaving}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <RotateCcw className="w-4 h-4 ml-1" />
                  إلغاء
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 ml-1" />
                  )}
                  {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="بحث في الصلاحيات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              إعادة تعيين الكل
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 ml-2" />
              )}
              {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </div>

        {/* Role Tabs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">اختر المنصب لتعديل صلاحياته</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeRole} onValueChange={setActiveRole}>
              <TabsList className="flex-wrap h-auto gap-1 bg-gray-100 p-1 flex-row-reverse justify-end">
                {allRoles.map((roleKey) => (
                  <TabsTrigger 
                    key={roleKey} 
                    value={roleKey}
                    className="text-sm"
                  >
                    {ROLE_LABELS[roleKey]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Permissions Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              صلاحيات: {activeRoleLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPermissionKeys.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد صلاحيات تطابق البحث</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPermissionKeys.map(({ key, label }) => {
                  const isEnabled = activeRolePermissions[key] === true;
                  return (
                    <div 
                      key={key}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isEnabled ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                        <div>
                          <Label 
                            htmlFor={`${activeRole}-${key}`}
                            className="text-base font-medium cursor-pointer"
                          >
                            {label}
                          </Label>
                          <p className="text-xs text-gray-500 mt-0.5">{key}</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
