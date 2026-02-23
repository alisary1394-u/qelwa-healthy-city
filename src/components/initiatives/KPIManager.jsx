import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function KPIManager({ initiativeId, initiativeTitle }) {
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    kpi_name: '',
    description: '',
    target_value: 0,
    current_value: 0,
    unit: '',
    measurement_frequency: 'شهري',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: kpis = [] } = useQuery({
    queryKey: ['kpis', initiativeId],
    queryFn: () => api.entities.InitiativeKPI.filter({ initiative_id: initiativeId })
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.InitiativeKPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis', initiativeId] });
      setFormOpen(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.InitiativeKPI.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpis', initiativeId] })
  });

  const resetForm = () => {
    setFormData({
      kpi_name: '',
      description: '',
      target_value: 0,
      current_value: 0,
      unit: '',
      measurement_frequency: 'شهري',
      notes: ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const percentage = (formData.current_value / formData.target_value) * 100;
    const status = percentage >= 100 ? 'achieved' :
                   percentage >= 75 ? 'on_track' :
                   percentage >= 50 ? 'at_risk' : 'behind';

    await createMutation.mutateAsync({
      ...formData,
      initiative_id: initiativeId,
      initiative_title: initiativeTitle,
      status,
      last_updated: new Date().toISOString().split('T')[0]
    });

    setSaving(false);
  };

  const handleUpdateValue = async (kpi, newValue) => {
    const percentage = (newValue / kpi.target_value) * 100;
    const status = percentage >= 100 ? 'achieved' :
                   percentage >= 75 ? 'on_track' :
                   percentage >= 50 ? 'at_risk' : 'behind';

    await updateMutation.mutateAsync({
      id: kpi.id,
      data: {
        current_value: newValue,
        status,
        last_updated: new Date().toISOString().split('T')[0]
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-700';
      case 'on_track': return 'bg-blue-100 text-blue-700';
      case 'at_risk': return 'bg-yellow-100 text-yellow-700';
      case 'behind': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'achieved': return 'محقق';
      case 'on_track': return 'على المسار';
      case 'at_risk': return 'معرض للخطر';
      case 'behind': return 'متأخر';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">مؤشرات الأداء (KPIs)</h3>
        <Button size="sm" onClick={() => setFormOpen(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 ml-1" />
          مؤشر جديد
        </Button>
      </div>

      {kpis.length === 0 ? (
        <Card className="text-center py-8 bg-gray-50">
          <CardContent>
            <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">لا توجد مؤشرات أداء بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {kpis.map(kpi => {
            const percentage = Math.min((kpi.current_value / kpi.target_value) * 100, 100);
            return (
              <Card key={kpi.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{kpi.kpi_name}</h4>
                      {kpi.description && <p className="text-sm text-gray-500">{kpi.description}</p>}
                    </div>
                    <Badge className={getStatusColor(kpi.status)}>
                      {getStatusLabel(kpi.status)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">التقدم</span>
                      <span className="font-semibold">{kpi.current_value} / {kpi.target_value} {kpi.unit}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-gray-500">{percentage.toFixed(1)}% محقق</p>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateValue(kpi, Math.max(0, kpi.current_value - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={kpi.current_value}
                        onChange={(e) => handleUpdateValue(kpi, parseFloat(e.target.value) || 0)}
                        className="text-center"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateValue(kpi, kpi.current_value + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* KPI Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>مؤشر أداء جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>اسم المؤشر *</Label>
              <Input value={formData.kpi_name} onChange={(e) => setFormData({ ...formData, kpi_name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>القيمة المستهدفة *</Label>
                <Input type="number" value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>القيمة الحالية</Label>
                <Input type="number" value={formData.current_value} onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>وحدة القياس</Label>
                <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="مثال: مستفيد، جلسة، يوم" />
              </div>
              <div className="space-y-2">
                <Label>تكرار القياس</Label>
                <Select value={formData.measurement_frequency} onValueChange={(v) => setFormData({ ...formData, measurement_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="يومي">يومي</SelectItem>
                    <SelectItem value="أسبوعي">أسبوعي</SelectItem>
                    <SelectItem value="شهري">شهري</SelectItem>
                    <SelectItem value="ربع سنوي">ربع سنوي</SelectItem>
                    <SelectItem value="سنوي">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ المؤشر
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}