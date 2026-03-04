import React, { useState, useMemo } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, MapPinned, Users, MapPin, Loader2, Eye, CheckCircle, AlertCircle, FileText, BarChart3, Home, Filter, Calendar, TrendingUp, Heart, Shield, Droplets, GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import YesNoQuestion from "../components/survey/YesNoQuestion";
import { usePermissions } from '@/hooks/usePermissions';

const DEFAULT_DISTRICTS = ['حي الشفاء', 'حي الخالدية', 'حي الصفاء', 'حي النسيم', 'حي العزيزية', 'حي الشروق'];

const livelihoodOptions = ['زراعة', 'تجارة صغيرة', 'عمل فني', 'عمل', 'وظيفة', 'أخرى'];

export default function Survey() {
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [districtFilter, setDistrictFilter] = useState('all');

  const [formData, setFormData] = useState({
    survey_number: '',
    family_head_name: '',
    group_number: '',
    volunteer_name: '',
    district: '',
    address: '',
    demographics_total: 0,
    demographics_males: 0,
    demographics_females: 0,
    infants_total: 0,
    infants_males: 0,
    infants_females: 0,
    children_1_4_total: 0,
    children_1_4_males: 0,
    children_1_4_females: 0,
    children_5_14_total: 0,
    children_5_14_males: 0,
    children_5_14_females: 0,
    adults_15_44_total: 0,
    adults_15_44_males: 0,
    adults_15_44_females: 0,
    adults_45_65_total: 0,
    adults_45_65_males: 0,
    adults_45_65_females: 0,
    seniors_65_plus_total: 0,
    seniors_65_plus_males: 0,
    seniors_65_plus_females: 0,
    married_couples: 0,
    children_enrolled_school_total: 0,
    children_enrolled_school_males: 0,
    children_enrolled_school_females: 0,
    literate_total: 0,
    literate_males: 0,
    literate_females: 0,
    skilled_members_total: 0,
    skilled_members_males: 0,
    skilled_members_females: 0,
    skills_details: '',
    safe_water_access: false,
    has_toilet: false,
    has_bathroom: false,
    has_garbage_system: false,
    livelihood_patterns: [],
    income_less_than_dollar: false,
    income_sources: '',
    balanced_diet: false,
    access_to_healthy_markets: false,
    breastfeeding_over_6months: 0,
    breastfeeding_duration: 'none',
    births_last_12months: false,
    births_boys: 0,
    births_girls: 0,
    birth_assisted_by: 'trained',
    low_birth_weight_total: 0,
    low_birth_weight_boys: 0,
    low_birth_weight_girls: 0,
    children_fully_vaccinated: false,
    infant_deaths_last_year: false,
    infant_deaths_boys: 0,
    infant_deaths_girls: 0,
    infant_death_cause: '',
    child_deaths_1_5_years: false,
    child_deaths_1_5_boys: 0,
    child_deaths_1_5_girls: 0,
    child_death_1_5_cause: '',
    has_pregnant_woman: false,
    pregnant_count: 0,
    pregnant_tetanus_vaccination: false,
    pregnant_visited_by_trained: false,
    maternal_death_last_year: false,
    maternal_death_count: 0,
    maternal_death_cause: '',
    married_women_15_49_count: 0,
    married_women_names: '',
    contraception_users: 0,
    smokers_count: 0,
    has_chronic_diseases: false,
    chronic_diseases_details: '',
    has_disability: false,
    disability_details: '',
    deaths_from_diseases: false,
    deaths_from_diseases_details: '',
    access_to_health_facility: false,
    health_facility_distance_details: '',
    satisfied_with_health_services: false,
    health_satisfaction_details: '',
    access_to_sports_facilities: false,
    sports_access_details: '',
    participate_in_sports: false,
    sports_participation_details: '',
    access_to_green_areas: false,
    green_areas_details: '',
    satisfied_with_infrastructure: false,
    infrastructure_satisfaction_details: '',
    access_to_transport: false,
    transport_access_details: '',
    contributed_to_social_services: false,
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => api.entities.FamilySurvey.list('-created_date')
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.entities.Settings.list()
  });

  // Load districts from settings or use defaults
  const districts = useMemo(() => {
    const saved = settingsList[0]?.districts;
    const base = (saved && Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_DISTRICTS;
    return [...base, 'أخرى'];
  }, [settingsList]);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.FamilySurvey.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.FamilySurvey.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['surveys'] })
  });

  const currentMember = members.find(m => m.email === currentUser?.email);
  const { permissions } = usePermissions();
  const canVerify = permissions.canVerifySurvey;
  const canCreateSurvey = permissions.canCreateSurvey === true;

  const visibleSurveys = canVerify
    ? surveys
    : surveys.filter((survey) => {
        const surveyorId = String(survey?.surveyor_id || '').trim();
        const currentEmail = String(currentUser?.email || '').trim();
        return surveyorId && currentEmail && surveyorId === currentEmail;
      });

  const stats = {
    total: visibleSurveys.length,
    submitted: visibleSurveys.filter(s => s.status === 'submitted').length,
    verified: visibleSurveys.filter(s => s.status === 'verified').length,
    totalPeople: visibleSurveys.reduce((sum, s) => sum + (s.demographics_total || 0), 0)
  };

  const filteredSurveys = visibleSurveys.filter(s => {
    const matchesStatus = activeStatus === 'all' || s.status === activeStatus;
    const matchesDistrict = districtFilter === 'all' || s.district === districtFilter;
    const matchesSearch = !searchQuery ||
      s.family_head_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.survey_number?.includes(searchQuery) ||
      s.district?.includes(searchQuery);
    return matchesStatus && matchesSearch && matchesDistrict;
  });

  const resetForm = () => {
    setFormData({
      survey_number: '', family_head_name: '', group_number: '', volunteer_name: '',
      district: '', address: '', demographics_total: 0, demographics_males: 0, demographics_females: 0,
      infants_total: 0, infants_males: 0, infants_females: 0,
      children_1_4_total: 0, children_1_4_males: 0, children_1_4_females: 0,
      children_5_14_total: 0, children_5_14_males: 0, children_5_14_females: 0,
      adults_15_44_total: 0, adults_15_44_males: 0, adults_15_44_females: 0,
      adults_45_65_total: 0, adults_45_65_males: 0, adults_45_65_females: 0,
      seniors_65_plus_total: 0, seniors_65_plus_males: 0, seniors_65_plus_females: 0,
      married_couples: 0, children_enrolled_school_total: 0, children_enrolled_school_males: 0,
      children_enrolled_school_females: 0, literate_total: 0, literate_males: 0, literate_females: 0,
      skilled_members_total: 0, skilled_members_males: 0, skilled_members_females: 0, skills_details: '',
      safe_water_access: false, has_toilet: false, has_bathroom: false, has_garbage_system: false,
      livelihood_patterns: [], income_less_than_dollar: false, income_sources: '',
      balanced_diet: false, access_to_healthy_markets: false, breastfeeding_over_6months: 0,
      breastfeeding_duration: 'none', births_last_12months: false, births_boys: 0, births_girls: 0,
      birth_assisted_by: 'trained', low_birth_weight_total: 0, low_birth_weight_boys: 0,
      low_birth_weight_girls: 0, children_fully_vaccinated: false, infant_deaths_last_year: false,
      infant_deaths_boys: 0, infant_deaths_girls: 0, infant_death_cause: '',
      child_deaths_1_5_years: false, child_deaths_1_5_boys: 0, child_deaths_1_5_girls: 0,
      child_death_1_5_cause: '', has_pregnant_woman: false, pregnant_count: 0,
      pregnant_tetanus_vaccination: false, pregnant_visited_by_trained: false,
      maternal_death_last_year: false, maternal_death_count: 0, maternal_death_cause: '',
      married_women_15_49_count: 0, married_women_names: '', contraception_users: 0,
      smokers_count: 0, has_chronic_diseases: false, chronic_diseases_details: '',
      has_disability: false, disability_details: '', deaths_from_diseases: false,
      deaths_from_diseases_details: '', access_to_health_facility: false,
      health_facility_distance_details: '', satisfied_with_health_services: false,
      health_satisfaction_details: '', access_to_sports_facilities: false,
      sports_access_details: '', participate_in_sports: false, sports_participation_details: '',
      access_to_green_areas: false, green_areas_details: '', satisfied_with_infrastructure: false,
      infrastructure_satisfaction_details: '', access_to_transport: false,
      transport_access_details: '', contributed_to_social_services: false, notes: ''
    });
    setCurrentStep(1);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canCreateSurvey) return;
    setSaving(true);
    
    await createMutation.mutateAsync({
      ...formData,
      surveyor_id: currentUser?.email,
      surveyor_name: currentUser?.full_name || currentMember?.full_name,
      survey_date: new Date().toISOString().split('T')[0],
      status: 'submitted'
    });

    setSaving(false);
    setFormOpen(false);
    resetForm();
  };

  const handleVerify = async (survey) => {
    if (!canVerify) return;
    await updateMutation.mutateAsync({
      id: survey.id,
      data: { status: 'verified' }
    });
  };

  const toggleLivelihood = (item) => {
    const current = formData.livelihood_patterns || [];
    if (current.includes(item)) {
      setFormData({ ...formData, livelihood_patterns: current.filter(i => i !== item) });
    } else {
      setFormData({ ...formData, livelihood_patterns: [...current, item] });
    }
  };

  // District distribution
  const districtStats = useMemo(() => {
    const distMap = {};
    districts.forEach(d => { distMap[d] = { total: 0, verified: 0, people: 0 }; });
    visibleSurveys.forEach(s => {
      const d = s.district || 'أخرى';
      if (!distMap[d]) distMap[d] = { total: 0, verified: 0, people: 0 };
      distMap[d].total++;
      if (s.status === 'verified') distMap[d].verified++;
      distMap[d].people += (s.demographics_total || 0);
    });
    return Object.entries(distMap)
      .filter(([, v]) => v.total > 0)
      .sort((a, b) => b[1].total - a[1].total);
  }, [visibleSurveys]);

  // Health indicators summary
  const healthIndicators = useMemo(() => {
    if (visibleSurveys.length === 0) return null;
    const total = visibleSurveys.length;
    const safeWater = visibleSurveys.filter(s => s.safe_water_access).length;
    const hasToilet = visibleSurveys.filter(s => s.has_toilet).length;
    const vaccinated = visibleSurveys.filter(s => s.children_fully_vaccinated).length;
    const balancedDiet = visibleSurveys.filter(s => s.balanced_diet).length;
    const chronicDiseases = visibleSurveys.filter(s => s.has_chronic_diseases).length;
    return { total, safeWater, hasToilet, vaccinated, balancedDiet, chronicDiseases };
  }, [visibleSurveys]);

  const verificationRate = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-muted/50" dir="rtl">
      {/* Header */}
      <div className="gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
                <MapPinned className="w-8 h-8" />
                المسح الميداني للعائلة
              </h1>
              <p className="text-white/70">نموذج المسح وفق معايير منظمة الصحة العالمية</p>
            </div>
            {canCreateSurvey && (
              <Button onClick={() => { resetForm(); setFormOpen(true); }} className="bg-white/20 hover:bg-white/30 text-white border border-white/30">
                <Plus className="w-5 h-5 ml-2" />
                استبيان جديد
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-t-4 border-t-[#1e3a5f] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center">
                  <MapPinned className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1e3a5f]">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الاستبيانات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-[#0f766e] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#0f766e]/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#0f766e]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0f766e]">{stats.totalPeople}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الأفراد</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{stats.submitted}</p>
                  <p className="text-xs text-muted-foreground">بانتظار التحقق</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-emerald-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{stats.verified}</p>
                  <p className="text-xs text-muted-foreground">تم التحقق</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification Progress + District Distribution */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Verification Progress */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#1e3a5f]">
                  <TrendingUp className="w-5 h-5" />
                  نسبة التحقق
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${verificationRate}%`,
                          background: 'linear-gradient(135deg, #0f766e, #1e3a5f)'
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-[#1e3a5f]">{verificationRate}%</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>تم التحقق: {stats.verified}</span>
                  <span>بانتظار: {stats.submitted}</span>
                  <span>الإجمالي: {stats.total}</span>
                </div>

                {/* Health Indicators */}
                {healthIndicators && (
                  <div className="mt-5 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-[#1e3a5f] mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      المؤشرات الصحية
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-muted-foreground">مياه آمنة:</span>
                        <span className="font-semibold">{healthIndicators.safeWater}/{healthIndicators.total}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span className="text-muted-foreground">محصنون:</span>
                        <span className="font-semibold">{healthIndicators.vaccinated}/{healthIndicators.total}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Home className="w-4 h-4 text-[#0f766e]" />
                        <span className="text-muted-foreground">مرافق صحية:</span>
                        <span className="font-semibold">{healthIndicators.hasToilet}/{healthIndicators.total}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-muted-foreground">أمراض مزمنة:</span>
                        <span className="font-semibold text-red-600">{healthIndicators.chronicDiseases}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* District Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#1e3a5f]">
                  <BarChart3 className="w-5 h-5" />
                  توزيع الأحياء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {districtStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
                ) : (
                  <div className="space-y-3">
                    {districtStats.map(([district, data]) => {
                      const maxCount = districtStats[0]?.[1]?.total || 1;
                      const widthPct = Math.max((data.total / maxCount) * 100, 8);
                      return (
                        <div key={district}>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-medium flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#0f766e]" />
                              {district}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{data.total} استبيان</span>
                              <span>•</span>
                              <span>{data.people} فرد</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${widthPct}%`,
                                background: `linear-gradient(135deg, #0f766e, #1e3a5f)`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search, Filter & Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو رقم العائلة أو الحي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="w-full md:w-48">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="كل الأحياء" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأحياء</SelectItem>
              {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeStatus} onValueChange={setActiveStatus}>
          <TabsList className="bg-card">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#1e3a5f] data-[state=active]:text-white">الكل ({stats.total})</TabsTrigger>
            <TabsTrigger value="submitted" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white">بانتظار التحقق ({stats.submitted})</TabsTrigger>
            <TabsTrigger value="verified" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">تم التحقق ({stats.verified})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Surveys List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1e3a5f]" />
            <p className="text-sm text-muted-foreground mt-2">جاري تحميل الاستبيانات...</p>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <Card className="text-center py-16 shadow-sm">
            <CardContent>
              <div className="w-20 h-20 mx-auto rounded-full bg-[#1e3a5f]/10 flex items-center justify-center mb-4">
                <MapPinned className="w-10 h-10 text-[#1e3a5f]/40" />
              </div>
              <p className="text-lg font-medium text-muted-foreground mb-1">لا توجد استبيانات</p>
              <p className="text-sm text-muted-foreground/70">
                {searchQuery || districtFilter !== 'all' ? 'جرب تغيير معايير البحث أو الفلتر' : 'ابدأ بإنشاء أول استبيان ميداني'}
              </p>
              {canCreateSurvey && !searchQuery && districtFilter === 'all' && (
                <Button onClick={() => { resetForm(); setFormOpen(true); }} className="mt-4 gradient-primary text-white">
                  <Plus className="w-5 h-5 ml-2" />
                  استبيان جديد
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSurveys.map(survey => (
              <Card key={survey.id} className="hover:shadow-lg transition-all duration-200 border-r-4 group"
                style={{ borderRightColor: survey.status === 'verified' ? '#0f766e' : '#f59e0b' }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="outline" className="mb-2 text-[#1e3a5f] border-[#1e3a5f]/30 bg-[#1e3a5f]/5">{survey.survey_number || 'غير محدد'}</Badge>
                      <h3 className="font-semibold text-[#1e3a5f]">{survey.family_head_name}</h3>
                      <p className="text-sm text-muted-foreground">{survey.volunteer_name}</p>
                    </div>
                    <Badge className={survey.status === 'verified' 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200'}>
                      {survey.status === 'verified' ? '✓ تم التحقق' : '⏳ بانتظار'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#0f766e]" />
                      <span>{survey.district}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1e3a5f]" />
                      <span>{survey.demographics_total} أفراد</span>
                    </div>
                    {survey.survey_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{survey.survey_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick health indicators */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {survey.safe_water_access && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                        <Droplets className="w-3 h-3 ml-1" />مياه آمنة
                      </Badge>
                    )}
                    {survey.children_fully_vaccinated && (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200">
                        <Shield className="w-3 h-3 ml-1" />محصنون
                      </Badge>
                    )}
                    {survey.has_chronic_diseases && (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                        <Heart className="w-3 h-3 ml-1" />أمراض مزمنة
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSurvey(survey); setViewOpen(true); }}
                      className="flex-1 hover:bg-[#1e3a5f]/5 hover:text-[#1e3a5f] hover:border-[#1e3a5f]/30">
                      <Eye className="w-4 h-4 ml-1" />
                      عرض التفاصيل
                    </Button>
                    {canVerify && survey.status === 'submitted' && (
                      <Button size="sm" className="bg-[#0f766e] hover:bg-[#0f766e]/90 text-white" onClick={() => handleVerify(survey)}>
                        <CheckCircle className="w-4 h-4 ml-1" />
                        تحقق
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Survey Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">المسح الأساسي للعائلة - نموذج منظمة الصحة العالمية</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center gap-2 my-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(step => (
              <Button
                key={step}
                variant={currentStep === step ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentStep(step)}
                className={`w-8 h-8 p-0 ${currentStep === step ? 'gradient-primary text-white' : ''}`}
              >
                {step}
              </Button>
            ))}
          </div>

          <form onSubmit={handleSave} className="space-y-6 mt-4">
            {/* Step 0: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  معلومات أساسية
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم العائلة</Label>
                    <Input value={formData.survey_number} onChange={(e) => setFormData({ ...formData, survey_number: e.target.value })} placeholder="مثال: F001" />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم رب العائلة *</Label>
                    <Input value={formData.family_head_name} onChange={(e) => setFormData({ ...formData, family_head_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم المجموعة المكونة</Label>
                    <Input value={formData.group_number} onChange={(e) => setFormData({ ...formData, group_number: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم المتطوع الصحي</Label>
                    <Input value={formData.volunteer_name} onChange={(e) => setFormData({ ...formData, volunteer_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>الحي/المنطقة *</Label>
                    <Select value={formData.district} onValueChange={(v) => setFormData({ ...formData, district: v })}>
                      <SelectTrigger><SelectValue placeholder="اختر الحي" /></SelectTrigger>
                      <SelectContent>
                        {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان التفصيلي</Label>
                    <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Demographics */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">1. معطيات ديموغرافية</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 font-medium text-[#1e3a5f] bg-[#1e3a5f]/10 p-2 rounded">أفراد العائلة</div>
                  <div className="space-y-2">
                    <Label>الإجمالي</Label>
                    <Input type="number" value={formData.demographics_total} onChange={(e) => setFormData({ ...formData, demographics_total: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>رجال</Label>
                    <Input type="number" value={formData.demographics_males} onChange={(e) => setFormData({ ...formData, demographics_males: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>نساء</Label>
                    <Input type="number" value={formData.demographics_females} onChange={(e) => setFormData({ ...formData, demographics_females: parseInt(e.target.value) || 0 })} />
                  </div>

                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded mt-2">الأطفال أصغر من عام واحد</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.infants_total} onChange={(e) => setFormData({ ...formData, infants_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.infants_males} onChange={(e) => setFormData({ ...formData, infants_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.infants_females} onChange={(e) => setFormData({ ...formData, infants_females: parseInt(e.target.value) || 0 })} /></div>

                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded mt-2">الأطفال من سن 1-4 سنوات</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.children_1_4_total} onChange={(e) => setFormData({ ...formData, children_1_4_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.children_1_4_males} onChange={(e) => setFormData({ ...formData, children_1_4_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.children_1_4_females} onChange={(e) => setFormData({ ...formData, children_1_4_females: parseInt(e.target.value) || 0 })} /></div>

                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded mt-2">الأطفال من سن 5-14 سنة (سن الالتحاق بالمدرسة)</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.children_5_14_total} onChange={(e) => setFormData({ ...formData, children_5_14_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.children_5_14_males} onChange={(e) => setFormData({ ...formData, children_5_14_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.children_5_14_females} onChange={(e) => setFormData({ ...formData, children_5_14_females: parseInt(e.target.value) || 0 })} /></div>

                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded mt-2">البالغون 15-44 سنة</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.adults_15_44_total} onChange={(e) => setFormData({ ...formData, adults_15_44_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.adults_15_44_males} onChange={(e) => setFormData({ ...formData, adults_15_44_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.adults_15_44_females} onChange={(e) => setFormData({ ...formData, adults_15_44_females: parseInt(e.target.value) || 0 })} /></div>

                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded mt-2">البالغون 45-65 سنة</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.adults_45_65_total} onChange={(e) => setFormData({ ...formData, adults_45_65_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.adults_45_65_males} onChange={(e) => setFormData({ ...formData, adults_45_65_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.adults_45_65_females} onChange={(e) => setFormData({ ...formData, adults_45_65_females: parseInt(e.target.value) || 0 })} /></div>

                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded mt-2">البالغون 65+ سنة</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.seniors_65_plus_total} onChange={(e) => setFormData({ ...formData, seniors_65_plus_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.seniors_65_plus_males} onChange={(e) => setFormData({ ...formData, seniors_65_plus_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.seniors_65_plus_females} onChange={(e) => setFormData({ ...formData, seniors_65_plus_females: parseInt(e.target.value) || 0 })} /></div>

                  <div className="col-span-3 mt-2">
                    <Label>الأزواج في العائلات</Label>
                    <Input type="number" value={formData.married_couples} onChange={(e) => setFormData({ ...formData, married_couples: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Education */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">2. التعليم والإلمام بالقراءة والكتابة</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 font-medium text-[#1e3a5f] bg-[#1e3a5f]/10 p-2 rounded">عدد الأطفال الملتحقين بالمدرسة (5-14 عاماً)</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.children_enrolled_school_total} onChange={(e) => setFormData({ ...formData, children_enrolled_school_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.children_enrolled_school_males} onChange={(e) => setFormData({ ...formData, children_enrolled_school_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.children_enrolled_school_females} onChange={(e) => setFormData({ ...formData, children_enrolled_school_females: parseInt(e.target.value) || 0 })} /></div>

                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded mt-2">عدد الملمين بالقراءة والكتابة</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.literate_total} onChange={(e) => setFormData({ ...formData, literate_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.literate_males} onChange={(e) => setFormData({ ...formData, literate_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.literate_females} onChange={(e) => setFormData({ ...formData, literate_females: parseInt(e.target.value) || 0 })} /></div>
                </div>

                <Separator />

                <h3 className="font-semibold text-lg">3. التدريب والمهارات</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.skilled_members_total} onChange={(e) => setFormData({ ...formData, skilled_members_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>ذكور</Label><Input type="number" value={formData.skilled_members_males} onChange={(e) => setFormData({ ...formData, skilled_members_males: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>إناث</Label><Input type="number" value={formData.skilled_members_females} onChange={(e) => setFormData({ ...formData, skilled_members_females: parseInt(e.target.value) || 0 })} /></div>
                  <div className="col-span-3 space-y-2">
                    <Label>تفاصيل المهارات (نمط كل مهارة لكل عضو)</Label>
                    <Textarea value={formData.skills_details} onChange={(e) => setFormData({ ...formData, skills_details: e.target.value })} rows={2} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Water & Sanitation */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">4. مياه الشرب</h3>
                <YesNoQuestion
                  question="هل تتيسر للعائلة سبل الوصول إلى مياه الشرب المأمونة على مدار العام؟"
                  value={formData.safe_water_access}
                  onChange={(v) => setFormData({ ...formData, safe_water_access: v })}
                />
                <p className="text-sm text-muted-foreground">الوصول معناه توافر المياه على مدى فترة زمنية لا تتعدى 15 دقيقة سيراً على الأقدام</p>

                <Separator />

                <h3 className="font-semibold text-lg">5. الوصول إلى مراحيض صحية والصرف الصحي</h3>
                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل تمتلك العائلة مراحيضاً صحية داخل المنزل؟"
                    value={formData.has_toilet}
                    onChange={(v) => setFormData({ ...formData, has_toilet: v })}
                    bgColor="bg-muted/50"
                  />
                  <YesNoQuestion
                    question="هل تمتلك العائلة حماماً داخل المنزل؟"
                    value={formData.has_bathroom}
                    onChange={(v) => setFormData({ ...formData, has_bathroom: v })}
                    bgColor="bg-muted/50"
                  />
                  <YesNoQuestion
                    question="هل هناك نظام لجمع القمامة أو وعاء للقمامة لدى العائلة؟"
                    value={formData.has_garbage_system}
                    onChange={(v) => setFormData({ ...formData, has_garbage_system: v })}
                    bgColor="bg-muted/50"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Livelihood */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">6. أساليب كسب العيش</h3>
                <div className="space-y-2">
                  <Label>أنماط كسب العيش (اختر جميع الأنماط)</Label>
                  <div className="flex flex-wrap gap-2">
                    {livelihoodOptions.map(item => (
                      <Badge
                        key={item}
                        variant={formData.livelihood_patterns?.includes(item) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleLivelihood(item)}
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <YesNoQuestion
                  question="هل تكسب العائلة دخلاً يومياً أقل من دولار واحد للفرد؟"
                  value={formData.income_less_than_dollar}
                  onChange={(v) => setFormData({ ...formData, income_less_than_dollar: v })}
                  bgColor="bg-red-50"
                />
                <div className="space-y-2">
                  <Label>جميع مصادر الدخل</Label>
                  <Textarea value={formData.income_sources} onChange={(e) => setFormData({ ...formData, income_sources: e.target.value })} rows={2} />
                </div>
              </div>
            )}

            {/* Step 5: Food & Nutrition */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">7. الغذاء والتغذية</h3>
                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل تأكل العائلة اللحم، والسمك، والبيض، واللبن، والفاكهة، والخضروات مرتين على الأقل في الأسبوع؟"
                    value={formData.balanced_diet}
                    onChange={(v) => setFormData({ ...formData, balanced_diet: v })}
                    bgColor="bg-green-50"
                  />
                  <YesNoQuestion
                    question="هل للعائلة سبل مادية ومالية تسمح لها بالوصول إلى الأسواق/والحوانيت الصحية؟"
                    value={formData.access_to_healthy_markets}
                    onChange={(v) => setFormData({ ...formData, access_to_healthy_markets: v })}
                    bgColor="bg-green-50"
                  />
                </div>

                <Separator />

                <h4 className="font-medium">الرضاعة الطبيعية</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>عدد الأطفال الذين تلقوا رضاعة طبيعية مطلقة (أكبر من 6 أشهر)</Label>
                    <Input type="number" value={formData.breastfeeding_over_6months} onChange={(e) => setFormData({ ...formData, breastfeeding_over_6months: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>مدة الرضاعة الطبيعية</Label>
                    <Select value={formData.breastfeeding_duration} onValueChange={(v) => setFormData({ ...formData, breastfeeding_duration: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">لم ترضع رضاعة طبيعية أبداً</SelectItem>
                        <SelectItem value="less_6_months">أقل من ستة أشهر</SelectItem>
                        <SelectItem value="6_to_12_months">من ستة أشهر إلى عام</SelectItem>
                        <SelectItem value="more_2_years">أكثر من عامين</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Health Part 1 */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">8. الصحة - الولادات والأطفال</h3>
                
                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل كانت هناك أي ولادة لطفل حي خلال الـ 12 شهراً الماضية؟"
                    value={formData.births_last_12months}
                    onChange={(v) => setFormData({ ...formData, births_last_12months: v })}
                  />
                  {formData.births_last_12months && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded">
                      <div className="space-y-2"><Label>صبيان</Label><Input type="number" value={formData.births_boys} onChange={(e) => setFormData({ ...formData, births_boys: parseInt(e.target.value) || 0 })} /></div>
                      <div className="space-y-2"><Label>بنات</Label><Input type="number" value={formData.births_girls} onChange={(e) => setFormData({ ...formData, births_girls: parseInt(e.target.value) || 0 })} /></div>
                      <div className="space-y-2">
                        <Label>من ساعد على الولادة</Label>
                        <Select value={formData.birth_assisted_by} onValueChange={(v) => setFormData({ ...formData, birth_assisted_by: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trained">عاملون مدربون</SelectItem>
                            <SelectItem value="untrained">عاملون غير مدربين</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 font-medium text-muted-foreground bg-muted/50 p-2 rounded">المواليد أقل من 2500 غرام</div>
                  <div className="space-y-2"><Label>الإجمالي</Label><Input type="number" value={formData.low_birth_weight_total} onChange={(e) => setFormData({ ...formData, low_birth_weight_total: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>صبيان</Label><Input type="number" value={formData.low_birth_weight_boys} onChange={(e) => setFormData({ ...formData, low_birth_weight_boys: parseInt(e.target.value) || 0 })} /></div>
                  <div className="space-y-2"><Label>بنات</Label><Input type="number" value={formData.low_birth_weight_girls} onChange={(e) => setFormData({ ...formData, low_birth_weight_girls: parseInt(e.target.value) || 0 })} /></div>
                </div>

                <YesNoQuestion
                  question="هل تلقى جميع أطفال العائلة التحصينات ضد الأمراض الممكن الوقاية منها؟"
                  value={formData.children_fully_vaccinated}
                  onChange={(v) => setFormData({ ...formData, children_fully_vaccinated: v })}
                  bgColor="bg-green-50"
                />
              </div>
            )}

            {/* Step 7: Health Part 2 - Deaths */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">8. الصحة - الوفيات</h3>
                
                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل حدثت وفيات لأطفال أقل من عام واحد خلال السنة الأخيرة؟"
                    value={formData.infant_deaths_last_year}
                    onChange={(v) => setFormData({ ...formData, infant_deaths_last_year: v })}
                    bgColor="bg-red-50"
                  />
                  {formData.infant_deaths_last_year && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded">
                      <div className="space-y-2"><Label>صبيان</Label><Input type="number" value={formData.infant_deaths_boys} onChange={(e) => setFormData({ ...formData, infant_deaths_boys: parseInt(e.target.value) || 0 })} /></div>
                      <div className="space-y-2"><Label>بنات</Label><Input type="number" value={formData.infant_deaths_girls} onChange={(e) => setFormData({ ...formData, infant_deaths_girls: parseInt(e.target.value) || 0 })} /></div>
                      <div className="col-span-3 space-y-2"><Label>سبب الوفاة</Label><Input value={formData.infant_death_cause} onChange={(e) => setFormData({ ...formData, infant_death_cause: e.target.value })} /></div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل حدثت وفيات لأطفال 1-5 سنوات خلال السنة الأخيرة؟"
                    value={formData.child_deaths_1_5_years}
                    onChange={(v) => setFormData({ ...formData, child_deaths_1_5_years: v })}
                    bgColor="bg-red-50"
                  />
                  {formData.child_deaths_1_5_years && (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded">
                      <div className="space-y-2"><Label>صبيان</Label><Input type="number" value={formData.child_deaths_1_5_boys} onChange={(e) => setFormData({ ...formData, child_deaths_1_5_boys: parseInt(e.target.value) || 0 })} /></div>
                      <div className="space-y-2"><Label>بنات</Label><Input type="number" value={formData.child_deaths_1_5_girls} onChange={(e) => setFormData({ ...formData, child_deaths_1_5_girls: parseInt(e.target.value) || 0 })} /></div>
                      <div className="col-span-3 space-y-2"><Label>سبب الوفاة</Label><Input value={formData.child_death_1_5_cause} onChange={(e) => setFormData({ ...formData, child_death_1_5_cause: e.target.value })} /></div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل توفيت أية امرأة حامل خلال السنة الأخيرة؟"
                    value={formData.maternal_death_last_year}
                    onChange={(v) => setFormData({ ...formData, maternal_death_last_year: v })}
                    bgColor="bg-red-50"
                  />
                  {formData.maternal_death_last_year && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded">
                      <div className="space-y-2"><Label>العدد</Label><Input type="number" value={formData.maternal_death_count} onChange={(e) => setFormData({ ...formData, maternal_death_count: parseInt(e.target.value) || 0 })} /></div>
                      <div className="col-span-2 space-y-2"><Label>سبب الوفاة</Label><Input value={formData.maternal_death_cause} onChange={(e) => setFormData({ ...formData, maternal_death_cause: e.target.value })} /></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 8: Health Part 3 - Pregnancy & Family Planning */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">8. الصحة - الحمل وتنظيم الأسرة</h3>
                
                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل هناك أية امرأة حامل داخل الأسرة في الوقت الحالي؟"
                    value={formData.has_pregnant_woman}
                    onChange={(v) => setFormData({ ...formData, has_pregnant_woman: v })}
                    bgColor="bg-purple-50"
                  />
                  {formData.has_pregnant_woman && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded">
                      <div className="space-y-2"><Label>العدد</Label><Input type="number" value={formData.pregnant_count} onChange={(e) => setFormData({ ...formData, pregnant_count: parseInt(e.target.value) || 0 })} /></div>
                      <div className="col-span-2">
                        <YesNoQuestion
                          question="هل تلقت الحامل تمنيعاً ضد التيتانوس؟"
                          value={formData.pregnant_tetanus_vaccination}
                          onChange={(v) => setFormData({ ...formData, pregnant_tetanus_vaccination: v })}
                          bgColor="bg-card"
                        />
                      </div>
                      <div className="col-span-2">
                        <YesNoQuestion
                          question="هل زار أي شخص مدرب الحامل؟"
                          value={formData.pregnant_visited_by_trained}
                          onChange={(v) => setFormData({ ...formData, pregnant_visited_by_trained: v })}
                          bgColor="bg-card"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>عدد الإناث المتزوجات (15-49 عاماً)</Label>
                    <Input type="number" value={formData.married_women_15_49_count} onChange={(e) => setFormData({ ...formData, married_women_15_49_count: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>عدد مستخدمي عوازل منع الحمل الحديثة</Label>
                    <Input type="number" value={formData.contraception_users} onChange={(e) => setFormData({ ...formData, contraception_users: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>أسماء الإناث المتزوجات (15-49 عاماً)</Label>
                    <Textarea value={formData.married_women_names} onChange={(e) => setFormData({ ...formData, married_women_names: e.target.value })} rows={2} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 9: Health Part 4 - Chronic Diseases */}
            {currentStep === 9 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">8. الصحة - الأمراض المزمنة والعجز</h3>
                
                <div className="space-y-2">
                  <Label>عدد المدخنين في العائلة</Label>
                  <Input type="number" value={formData.smokers_count} onChange={(e) => setFormData({ ...formData, smokers_count: parseInt(e.target.value) || 0 })} />
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل شُخصت إصابة أي من أفراد العائلة بأمراض مزمنة؟"
                    value={formData.has_chronic_diseases}
                    onChange={(v) => setFormData({ ...formData, has_chronic_diseases: v })}
                    bgColor="bg-orange-50"
                  />
                  {formData.has_chronic_diseases && (
                    <div className="space-y-2">
                      <Label>التفاصيل (القلب، الكلى، الكبد، السكري، ضغط الدم، السرطان، أمراض أخرى)</Label>
                      <Textarea value={formData.chronic_diseases_details} onChange={(e) => setFormData({ ...formData, chronic_diseases_details: e.target.value })} rows={2} />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل هناك أي فرد من أفراد العائلة يعاني من العجز؟"
                    value={formData.has_disability}
                    onChange={(v) => setFormData({ ...formData, has_disability: v })}
                    bgColor="bg-orange-50"
                  />
                  {formData.has_disability && (
                    <div className="space-y-2">
                      <Label>رجاء التحديد</Label>
                      <Textarea value={formData.disability_details} onChange={(e) => setFormData({ ...formData, disability_details: e.target.value })} rows={2} />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل حدثت وفيات بسبب أمراض مزمنة أو حوادث؟"
                    value={formData.deaths_from_diseases}
                    onChange={(v) => setFormData({ ...formData, deaths_from_diseases: v })}
                    bgColor="bg-red-50"
                  />
                  {formData.deaths_from_diseases && (
                    <div className="space-y-2">
                      <Label>التفاصيل</Label>
                      <Textarea value={formData.deaths_from_diseases_details} onChange={(e) => setFormData({ ...formData, deaths_from_diseases_details: e.target.value })} rows={2} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 10: Social Services */}
            {currentStep === 9 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">9. الوصول إلى الخدمات الاجتماعية وتوافرها</h3>
                
                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل تتوافر للعائلة سبل الوصول إلى المرافق الصحية على مسافة لا تستغرق أكثر من 30 دقيقة سيراً؟"
                    value={formData.access_to_health_facility}
                    onChange={(v) => setFormData({ ...formData, access_to_health_facility: v })}
                  />
                  {!formData.access_to_health_facility && (
                    <Input placeholder="رجاء التحديد" value={formData.health_facility_distance_details} onChange={(e) => setFormData({ ...formData, health_facility_distance_details: e.target.value })} />
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل العائلة راضية عن الخدمات الصحية؟"
                    value={formData.satisfied_with_health_services}
                    onChange={(v) => setFormData({ ...formData, satisfied_with_health_services: v })}
                    bgColor="bg-green-50"
                  />
                  {!formData.satisfied_with_health_services && (
                    <Input placeholder="رجاء التحديد" value={formData.health_satisfaction_details} onChange={(e) => setFormData({ ...formData, health_satisfaction_details: e.target.value })} />
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل تتوافر سبل الوصول إلى المرافق الرياضية؟"
                    value={formData.access_to_sports_facilities}
                    onChange={(v) => setFormData({ ...formData, access_to_sports_facilities: v })}
                    bgColor="bg-purple-50"
                  />
                  {!formData.access_to_sports_facilities && (
                    <Input placeholder="رجاء التحديد" value={formData.sports_access_details} onChange={(e) => setFormData({ ...formData, sports_access_details: e.target.value })} />
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل يشارك أفراد العائلة في الأنشطة الرياضية الصحية الأسبوعية؟"
                    value={formData.participate_in_sports}
                    onChange={(v) => setFormData({ ...formData, participate_in_sports: v })}
                    bgColor="bg-purple-50"
                  />
                  {!formData.participate_in_sports && (
                    <Input placeholder="رجاء التحديد" value={formData.sports_participation_details} onChange={(e) => setFormData({ ...formData, sports_participation_details: e.target.value })} />
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل تتوافر سبل الوصول إلى المناطق الخضراء؟"
                    value={formData.access_to_green_areas}
                    onChange={(v) => setFormData({ ...formData, access_to_green_areas: v })}
                    bgColor="bg-green-50"
                  />
                  {!formData.access_to_green_areas && (
                    <Input placeholder="رجاء التحديد" value={formData.green_areas_details} onChange={(e) => setFormData({ ...formData, green_areas_details: e.target.value })} />
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل أفراد العائلة راضون عن الطرق والإسكان والبنية التحتية والمياه والصرف الصحي؟"
                    value={formData.satisfied_with_infrastructure}
                    onChange={(v) => setFormData({ ...formData, satisfied_with_infrastructure: v })}
                  />
                  {!formData.satisfied_with_infrastructure && (
                    <Input placeholder="رجاء التحديد" value={formData.infrastructure_satisfaction_details} onChange={(e) => setFormData({ ...formData, infrastructure_satisfaction_details: e.target.value })} />
                  )}
                </div>

                <div className="space-y-3">
                  <YesNoQuestion
                    question="هل تتوافر سبل الوصول إلى وسائل المواصلات المحلية على مسافة لا تستغرق 30 دقيقة؟"
                    value={formData.access_to_transport}
                    onChange={(v) => setFormData({ ...formData, access_to_transport: v })}
                  />
                  {!formData.access_to_transport && (
                    <Input placeholder="رجاء التحديد" value={formData.transport_access_details} onChange={(e) => setFormData({ ...formData, transport_access_details: e.target.value })} />
                  )}
                </div>

                <YesNoQuestion
                  question="هل ساهم أي فرد مالياً في الخدمات الاجتماعية خلال العام المنصرم؟"
                  value={formData.contributed_to_social_services}
                  onChange={(v) => setFormData({ ...formData, contributed_to_social_services: v })}
                  bgColor="bg-green-50"
                />

                <div className="space-y-2">
                  <Label>ملاحظات إضافية</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 justify-between pt-6 border-t">
              <div>
                {currentStep > 1 && (
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                    السابق
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
                {currentStep < 9 ? (
                  <Button type="button" onClick={() => setCurrentStep(currentStep + 1)} className="bg-primary">
                    التالي
                  </Button>
                ) : (
                  <Button type="submit" disabled={saving} className="bg-[#0f766e] hover:bg-[#0f766e]/90 text-white">
                    {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                    حفظ الاستبيان
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Survey Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1e3a5f] flex items-center gap-2">
              <MapPinned className="w-5 h-5" />
              تفاصيل الاستبيان - {selectedSurvey?.survey_number}
            </DialogTitle>
          </DialogHeader>
          {selectedSurvey && (
            <div className="space-y-4 mt-4">
              <Card className="border-r-4 border-r-[#1e3a5f]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#1e3a5f]">معلومات أساسية</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">رقم العائلة:</span> <strong className="text-[#1e3a5f]">{selectedSurvey.survey_number}</strong></div>
                  <div><span className="text-muted-foreground">رب العائلة:</span> <strong>{selectedSurvey.family_head_name}</strong></div>
                  <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#0f766e]" /><span className="text-muted-foreground">الحي:</span> <strong>{selectedSurvey.district}</strong></div>
                  <div><span className="text-muted-foreground">المتطوع:</span> <strong>{selectedSurvey.volunteer_name}</strong></div>
                </CardContent>
              </Card>

              <Card className="border-r-4 border-r-[#0f766e]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#0f766e]">المعطيات الديموغرافية</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-[#1e3a5f]/5 p-2 rounded text-center"><span className="text-muted-foreground block text-xs">إجمالي الأفراد</span> <strong className="text-lg text-[#1e3a5f]">{selectedSurvey.demographics_total}</strong></div>
                  <div className="bg-blue-50 p-2 rounded text-center"><span className="text-muted-foreground block text-xs">رجال</span> <strong className="text-lg">{selectedSurvey.demographics_males}</strong></div>
                  <div className="bg-pink-50 p-2 rounded text-center"><span className="text-muted-foreground block text-xs">نساء</span> <strong className="text-lg">{selectedSurvey.demographics_females}</strong></div>
                  <div className="col-span-3 text-muted-foreground mt-2">الأطفال &lt;1: {selectedSurvey.infants_total} | 1-4: {selectedSurvey.children_1_4_total} | 5-14: {selectedSurvey.children_5_14_total}</div>
                </CardContent>
              </Card>

              <Card className="border-r-4 border-r-emerald-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-emerald-700">التعليم والصحة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#1e3a5f]" />ملتحقون بالمدرسة: <strong>{selectedSurvey.children_enrolled_school_total}</strong></div>
                  <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-[#1e3a5f]" />ملمون بالقراءة والكتابة: <strong>{selectedSurvey.literate_total}</strong></div>
                  <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" />مياه شرب مأمونة: <strong className={selectedSurvey.safe_water_access ? 'text-emerald-600' : 'text-red-500'}>{selectedSurvey.safe_water_access ? '✓ نعم' : '✗ لا'}</strong></div>
                  <div className="flex items-center gap-2"><Home className="w-4 h-4 text-[#0f766e]" />مراحيض صحية: <strong className={selectedSurvey.has_toilet ? 'text-emerald-600' : 'text-red-500'}>{selectedSurvey.has_toilet ? '✓ نعم' : '✗ لا'}</strong></div>
                  <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" />التحصينات الكاملة: <strong className={selectedSurvey.children_fully_vaccinated ? 'text-emerald-600' : 'text-red-500'}>{selectedSurvey.children_fully_vaccinated ? '✓ نعم' : '✗ لا'}</strong></div>
                  {selectedSurvey.has_chronic_diseases && (
                    <div className="p-2 bg-red-50 rounded border border-red-200 flex items-start gap-2">
                      <Heart className="w-4 h-4 text-red-500 mt-0.5" />
                      <span>أمراض مزمنة: {selectedSurvey.chronic_diseases_details}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="text-sm text-muted-foreground pt-3 border-t flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                الباحث: {selectedSurvey.surveyor_name} | التاريخ: {selectedSurvey.survey_date}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}