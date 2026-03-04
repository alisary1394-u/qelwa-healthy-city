import React, { useMemo, useState } from 'react';
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
import { Plus, DollarSign, TrendingUp, TrendingDown, Search, FileText, Clock, Loader2, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from '@/hooks/usePermissions';
import { AXES_CSV, sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';

const transactionCategories = {
  expense: [
    'رواتب وأجور', 'مستلزمات طبية', 'معدات وأجهزة', 'صيانة', 'مواصلات',
    'تدريب وتطوير', 'برامج توعية', 'مسح ميداني', 'فعاليات ومؤتمرات',
    'إيجارات', 'مرافق وخدمات', 'أخرى'
  ],
  income: ['تبرعات', 'دعم حكومي', 'مساهمات', 'أخرى']
};

const paymentMethods = ['نقدي', 'شيك', 'تحويل بنكي', 'بطاقة', 'أخرى'];

export default function Budget() {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [allocationFormOpen, setAllocationFormOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [transactionForm, setTransactionForm] = useState({
    type: 'expense',
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    committee_id: '',
    committee_name: '',
    axis_id: '',
    axis_name: '',
    standard_id: '',
    standard_code: '',
    initiative_id: '',
    initiative_title: '',
    payment_method: 'نقدي',
    receipt_number: '',
    beneficiary: '',
    notes: '',
    attachment_url: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    name: '',
    fiscal_year: new Date().getFullYear().toString(),
    start_date: '',
    end_date: '',
    total_budget: 0,
    description: '',
    notes: '',
    status: 'draft'
  });

  const [allocationForm, setAllocationForm] = useState({
    budget_id: '',
    budget_name: '',
    committee_id: '',
    committee_name: '',
    axis_id: '',
    axis_name: '',
    standard_id: '',
    standard_code: '',
    initiative_id: '',
    initiative_title: '',
    category: '',
    allocated_amount: 0,
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me()
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.entities.Transaction.list('-date')
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.entities.Budget.list('-created_date')
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: () => api.entities.BudgetAllocation.list()
  });

  const { data: initiatives = [] } = useQuery({
    queryKey: ['initiatives'],
    queryFn: () => api.entities.Initiative.list('-created_date')
  });

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list()
  });

  const normalizedAxes = useMemo(() => {
    return axes.map((axis) => {
      const order = Number(axis.order) || 0;
      const official = AXES_CSV.find((item) => Number(item.order) === order);
      return {
        ...axis,
        display_name: official?.name || axis.name,
      };
    });
  }, [axes]);

  const axisDisplayNameById = useMemo(() => {
    const map = new Map();
    normalizedAxes.forEach((axis) => map.set(String(axis.id), axis.display_name));
    return map;
  }, [normalizedAxes]);

  const { data: standards = [] } = useQuery({
    queryKey: ['standards'],
    queryFn: () => api.entities.Standard.list()
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list()
  });

  const { permissions, role, currentMember } = usePermissions();
  const canManageBudget = permissions.canManageBudget;
  const canApproveTransactions = permissions.canApproveTransactions;
  const canCreateTransactions = permissions.canCreateTransactions;
  const canViewFinancials = permissions.canViewFinancials;
  const memberRole = currentMember?.role || role;
  const showBudgetManagement = canManageBudget && memberRole !== 'accountant' && memberRole !== 'financial_officer';

  const createTransactionMutation = useMutation({
    mutationFn: (data) => api.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setTransactionFormOpen(false);
      resetTransactionForm();
    }
  });

  const createBudgetMutation = useMutation({
    mutationFn: (data) => api.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setBudgetFormOpen(false);
      setEditingBudget(null);
      resetBudgetForm();
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Budget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setBudgetFormOpen(false);
      setEditingBudget(null);
      resetBudgetForm();
    }
  });

  const createAllocationMutation = useMutation({
    mutationFn: (data) => api.entities.BudgetAllocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setAllocationFormOpen(false);
      setEditingAllocation(null);
      resetAllocationForm();
    }
  });

  const updateAllocationMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.BudgetAllocation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      setAllocationFormOpen(false);
      setEditingAllocation(null);
      resetAllocationForm();
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Transaction.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  });

  const activeBudget = budgets.find(b => b.status === 'active') || budgets[0];

  // Statistics
  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  const balance = totalIncome - totalExpenses;

  // Calculate total allocated budgets (excluding initiative-level allocations that are covered by committee/axis allocations)
  const { totalAllocatedBudgets, totalInitiativesBudgets, totalCommitted } = useMemo(() => {
    const budgetAllocations = allocations.filter(a => !activeBudget || String(a.budget_id || '') === String(activeBudget?.id));

    const allocTotal = budgetAllocations.reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0);

    // ميزانيات المبادرات المرتبطة بهذه الميزانية
    const linkedInitBudgets = initiatives
      .filter(i => {
        if (!activeBudget) return true;
        // مبادرة مربوطة مباشرة بالميزانية
        if (String(i.budget_id || '') === String(activeBudget.id)) return true;
        // مبادرة لها تخصيص ضمن هذه الميزانية
        if (i.budget_allocation_id && budgetAllocations.some(a => String(a.id) === String(i.budget_allocation_id))) return true;
        return false;
      })
      .reduce((sum, i) => sum + (Number(i.budget) || 0), 0);

    // الملتزم به = التخصيصات فقط (المبادرات تعمل ضمن التخصيصات)
    // إذا لا توجد تخصيصات نستخدم ميزانيات المبادرات
    const committed = allocTotal > 0 ? allocTotal : linkedInitBudgets;

    return {
      totalAllocatedBudgets: allocTotal,
      totalInitiativesBudgets: linkedInitBudgets,
      totalCommitted: committed
    };
  }, [activeBudget, allocations, initiatives]);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchQuery || 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.beneficiary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transaction_number?.includes(searchQuery);
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const allocationInitiativesMap = useMemo(() => {
    return allocations.reduce((acc, allocation) => {
      const directLinked = initiatives.filter((initiative) =>
        String(initiative.budget_allocation_id || '') === String(allocation.id)
      );

      const fallbackLinked = initiatives.filter((initiative) => {
        if (initiative.budget_allocation_id) return false;
        if (initiative.budget_id && String(initiative.budget_id) !== String(allocation.budget_id || '')) return false;
        const committeeMatch = allocation.committee_id && String(initiative.committee_id || '') === String(allocation.committee_id);
        const axisMatch = allocation.axis_id && String(initiative.axis_id || '') === String(allocation.axis_id);
        return committeeMatch || axisMatch;
      });

      const mergedById = [...directLinked, ...fallbackLinked].reduce((list, initiative) => {
        if (list.some((item) => String(item.id) === String(initiative.id))) return list;
        list.push(initiative);
        return list;
      }, []);

      acc[allocation.id] = mergedById;
      return acc;
    }, {});
  }, [allocations, initiatives]);

  const filteredStandardsForAllocation = useMemo(() => {
    if (!allocationForm.axis_id) return sortAndDeduplicateStandardsByCode(standards);
    return sortAndDeduplicateStandardsByCode(standards.filter((standard) => String(standard.axis_id || '') === String(allocationForm.axis_id)));
  }, [standards, allocationForm.axis_id]);

  const filteredCommitteesForAllocation = useMemo(() => {
    if (!allocationForm.axis_id) return committees;
    const filtered = committees.filter((committee) => String(committee.axis_id || '') === String(allocationForm.axis_id));
    return filtered.length > 0 ? filtered : committees;
  }, [committees, allocationForm.axis_id]);

  const filteredInitiativesForAllocation = useMemo(() => {
    return initiatives.filter((initiative) => {
      if (allocationForm.budget_id && initiative.budget_id && String(initiative.budget_id) !== String(allocationForm.budget_id)) return false;
      if (allocationForm.axis_id && String(initiative.axis_id || '') !== String(allocationForm.axis_id)) return false;
      if (allocationForm.standard_id && String(initiative.standard_id || '') !== String(allocationForm.standard_id)) return false;
      if (allocationForm.committee_id && String(initiative.committee_id || '') !== String(allocationForm.committee_id)) return false;
      return true;
    });
  }, [initiatives, allocationForm.budget_id, allocationForm.axis_id, allocationForm.standard_id, allocationForm.committee_id]);

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'expense',
      category: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      committee_id: '',
      committee_name: '',
      axis_id: '',
      axis_name: '',
      standard_id: '',
      standard_code: '',
      initiative_id: '',
      initiative_title: '',
      payment_method: 'نقدي',
      receipt_number: '',
      beneficiary: '',
      notes: '',
      attachment_url: ''
    });
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      name: '',
      fiscal_year: new Date().getFullYear().toString(),
      start_date: '',
      end_date: '',
      total_budget: 0,
      description: '',
      notes: '',
      status: 'draft'
    });
  };

  const resetAllocationForm = () => {
    setAllocationForm({
      budget_id: '',
      budget_name: '',
      committee_id: '',
      committee_name: '',
      axis_id: '',
      axis_name: '',
      standard_id: '',
      standard_code: '',
      initiative_id: '',
      initiative_title: '',
      category: '',
      allocated_amount: 0,
      notes: ''
    });
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!canCreateTransactions) return;
    setSaving(true);
    
    if (editingTransaction) {
      await updateTransactionMutation.mutateAsync({
        id: editingTransaction.id,
        data: {
          ...transactionForm
        }
      });
    } else {
      const transactionNumber = `T${Date.now().toString().slice(-6)}`;
      await createTransactionMutation.mutateAsync({
        ...transactionForm,
        transaction_number: transactionNumber,
        status: 'pending'
      });
    }
    
    setEditingTransaction(null);
    setSaving(false);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!showBudgetManagement) return;
    setSaving(true);
    if (editingBudget) {
      await updateBudgetMutation.mutateAsync({
        id: editingBudget.id,
        data: {
          name: budgetForm.name,
          fiscal_year: budgetForm.fiscal_year,
          start_date: budgetForm.start_date,
          end_date: budgetForm.end_date,
          total_budget: budgetForm.total_budget,
          description: budgetForm.description,
          notes: budgetForm.notes,
          status: budgetForm.status
        }
      });
    } else {
      await createBudgetMutation.mutateAsync({
        ...budgetForm,
        allocated_budget: 0,
        spent_amount: 0,
        remaining_budget: budgetForm.total_budget
      });
    }
    setSaving(false);
  };

  const openBudgetForm = (budget = null) => {
    if (!showBudgetManagement) return;
    if (budget) {
      setEditingBudget(budget);
      setBudgetForm({
        name: budget.name || '',
        fiscal_year: budget.fiscal_year || new Date().getFullYear().toString(),
        start_date: budget.start_date || '',
        end_date: budget.end_date || '',
        total_budget: budget.total_budget ?? 0,
        description: budget.description || '',
        notes: budget.notes || '',
        status: budget.status || 'draft'
      });
    } else {
      setEditingBudget(null);
      resetBudgetForm();
    }
    setBudgetFormOpen(true);
  };

  const closeBudgetForm = () => {
    setBudgetFormOpen(false);
    setEditingBudget(null);
    resetBudgetForm();
  };

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    if (!showBudgetManagement) return;
    setSaving(true);
    
    if (editingAllocation) {
      await updateAllocationMutation.mutateAsync({
        id: editingAllocation.id,
        data: {
          ...allocationForm,
          budget_name: budgets.find(b => b.id === allocationForm.budget_id)?.name
        }
      });
    } else {
      const budget = budgets.find(b => b.id === allocationForm.budget_id);
      await createAllocationMutation.mutateAsync({
        ...allocationForm,
        budget_name: budget?.name,
        spent_amount: 0,
        remaining_amount: allocationForm.allocated_amount,
        percentage_spent: 0,
        status: 'active'
      });
    }
    
    setSaving(false);
  };

  const handleApproveTransaction = async (transaction) => {
    if (!canApproveTransactions) return;
    await updateTransactionMutation.mutateAsync({
      id: transaction.id,
      data: {
        status: 'approved',
        approved_by: currentUser?.full_name,
        approval_date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleFileUpload = async (e) => {
    if (!canCreateTransactions) return;
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const result = await api.integrations.Core.UploadFile({ file });
    setTransactionForm({ ...transactionForm, attachment_url: result.file_url });
    setUploadingFile(false);
  };

  if (!canViewFinancials) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة الميزانية. صلاحيات العرض والمالية مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50" dir="rtl">
      <div className="gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            إدارة الميزانية والحسابات
          </h1>
          <p className="text-white/70">نظام محاسبي متكامل لإدارة المصروفات والإيرادات</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">إجمالي الإيرادات</p>
                  <p className="text-3xl font-bold">{totalIncome.toLocaleString()}</p>
                  <p className="text-sm text-white/70 mt-1">ريال سعودي</p>
                </div>
                <TrendingUp className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-800 to-red-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">إجمالي المصروفات</p>
                  <p className="text-3xl font-bold">{totalExpenses.toLocaleString()}</p>
                  <p className="text-sm text-white/70 mt-1">ريال سعودي</p>
                </div>
                <TrendingDown className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${balance >= 0 ? 'from-[#0f766e] to-[#14918a]' : 'from-amber-700 to-amber-800'} text-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-opacity-80 text-sm mb-1">الرصيد الحالي</p>
                  <p className="text-3xl font-bold">{balance.toLocaleString()}</p>
                  <p className="text-sm text-white text-opacity-80 mt-1">ريال سعودي</p>
                </div>
                <DollarSign className="w-12 h-12 text-white text-opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-700 to-amber-800 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">معاملات معلقة</p>
                  <p className="text-3xl font-bold">{pendingTransactions}</p>
                  <p className="text-sm text-white/70 mt-1">بانتظار الاعتماد</p>
                </div>
                <Clock className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Overview */}
        {activeBudget && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>الميزانية الحالية - {activeBudget.name}</CardTitle>
                <Badge className={activeBudget.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                  {activeBudget.status === 'active' ? 'نشطة' : 'مغلقة'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الميزانية</p>
                  <p className="text-2xl font-bold text-blue-600">{activeBudget.total_budget?.toLocaleString()} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التخصيصات المالية</p>
                  <p className="text-2xl font-bold text-purple-600">{totalAllocatedBudgets.toLocaleString()} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ميزانيات المبادرات</p>
                  <p className="text-2xl font-bold text-indigo-600">{totalInitiativesBudgets.toLocaleString()} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المبلغ المنفق فعلياً</p>
                  <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المتبقي</p>
                  <p className={`text-2xl font-bold ${(activeBudget.total_budget - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(activeBudget.total_budget - totalExpenses).toLocaleString()} ريال
                  </p>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">إجمالي الملتزم به (تخصيصات + مبادرات):</span>
                  <span className="font-bold text-orange-600">{totalCommitted.toLocaleString()} ريال</span>
                </div>
                {activeBudget.total_budget > 0 && totalCommitted > activeBudget.total_budget && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    ⚠️ التخصيصات تتجاوز إجمالي الميزانية بمبلغ {(totalCommitted - activeBudget.total_budget).toLocaleString()} ريال
                  </div>
                )}
                {(() => {
                  const tb = activeBudget.total_budget || 1;
                  const spentPct = Math.min((totalExpenses / tb) * 100, 100);
                  const committedPct = Math.min((totalCommitted / tb) * 100, 100);
                  const remaining = tb - totalExpenses;
                  const remainPct = Math.max((remaining / tb) * 100, 0);
                  return (
                    <>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div className="relative h-3 rounded-full overflow-hidden">
                          <div
                            className="absolute h-3 bg-destructive"
                            style={{ width: `${spentPct}%` }}
                            title={`منفق: ${totalExpenses.toLocaleString()} ريال`}
                          />
                          <div
                            className="absolute h-3 bg-orange-400 opacity-60"
                            style={{ width: `${committedPct}%` }}
                            title={`ملتزم به: ${totalCommitted.toLocaleString()} ريال`}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-destructive rounded"></div>
                          <span>منفق فعلياً ({spentPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-400 rounded"></div>
                          <span>ملتزم به ({committedPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-600 rounded"></div>
                          <span>متاح ({remainPct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-card" dir="rtl">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="transactions">المعاملات المالية</TabsTrigger>
            <TabsTrigger value="budgets">الميزانيات</TabsTrigger>
            <TabsTrigger value="allocations">التخصيصات</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ملخص الميزانية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">إجمالي الميزانيات النشطة</p>
                      <p className="text-2xl font-bold text-blue-600">{budgets.filter(b => b.status === 'active').length}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">التخصيصات المالية</p>
                      <p className="text-2xl font-bold text-purple-600">{allocations.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{totalAllocatedBudgets.toLocaleString()} ريال</p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">المبادرات المرتبطة</p>
                      <p className="text-2xl font-bold text-indigo-600">{initiatives.filter(i => String(i.budget_id || '') === String(activeBudget?.id || '')).length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{totalInitiativesBudgets.toLocaleString()} ريال</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">إجمالي المعاملات</p>
                      <p className="text-2xl font-bold text-green-600">{transactions.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{totalExpenses.toLocaleString()} ريال منفق</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-3">أعلى 5 فئات إنفاق</h3>
                      <div className="space-y-2">
                        {Object.entries(
                          transactions
                            .filter(t => t.type === 'expense' && t.status === 'paid')
                            .reduce((acc, t) => {
                              acc[t.category] = (acc[t.category] || 0) + (t.amount || 0);
                              return acc;
                            }, {})
                        )
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([category, amount]) => (
                            <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                              <span className="font-medium">{category}</span>
                              <span className="text-red-600 font-bold">{amount.toLocaleString()} ريال</span>
                            </div>
                          ))}
                        {Object.keys(transactions.filter(t => t.type === 'expense' && t.status === 'paid')).length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-4">لا توجد مصروفات بعد</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">أعلى 5 مبادرات من حيث الميزانية</h3>
                      <div className="space-y-2">
                        {initiatives
                          .filter(i => String(i.budget_id || '') === String(activeBudget?.id || '') && i.budget > 0)
                          .sort((a, b) => (b.budget || 0) - (a.budget || 0))
                          .slice(0, 5)
                          .map(initiative => (
                            <div key={initiative.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded">
                              <span className="font-medium text-sm truncate flex-1">{initiative.title}</span>
                              <span className="text-indigo-600 font-bold text-sm ml-2">{initiative.budget.toLocaleString()} ريال</span>
                            </div>
                          ))}
                        {initiatives.filter(i => String(i.budget_id || '') === String(activeBudget?.id || '') && i.budget > 0).length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-4">لا توجد مبادرات مرتبطة بعد</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="بحث بالوصف، المستفيد، أو رقم المعاملة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  <SelectItem value="income">إيرادات</SelectItem>
                  <SelectItem value="expense">مصروفات</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="pending">معلقة</SelectItem>
                  <SelectItem value="approved">معتمدة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                </SelectContent>
              </Select>
              {canCreateTransactions && (
                <Button onClick={() => { setEditingTransaction(null); resetTransactionForm(); setTransactionFormOpen(true); }} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-5 h-5 ml-2" />
                  معاملة جديدة
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">لا توجد معاملات مالية</p>
                    <p className="text-muted-foreground text-sm mt-2">ابدأ بإضافة معاملة جديدة</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTransactions.map(transaction => (
                <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline">{transaction.transaction_number}</Badge>
                          <Badge className={transaction.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {transaction.type === 'income' ? 'إيراد' : 'مصروف'}
                          </Badge>
                          <Badge variant="outline">{transaction.category}</Badge>
                          <Badge className={
                            transaction.status === 'paid' ? 'bg-green-600' :
                            transaction.status === 'approved' ? 'bg-primary' :
                            transaction.status === 'pending' ? 'bg-yellow-600' :
                            'bg-destructive'
                          }>
                            {transaction.status === 'paid' ? 'مدفوعة' :
                             transaction.status === 'approved' ? 'معتمدة' :
                             transaction.status === 'pending' ? 'معلقة' : 'مرفوضة'}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{transaction.description}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {transaction.standard_code && (
                            <Badge variant="outline" className="text-xs">
                              معيار: {transaction.standard_code}
                            </Badge>
                          )}
                          {transaction.initiative_title && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
                              مبادرة: {transaction.initiative_title}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div>المبلغ: <strong className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.amount?.toLocaleString()} ريال
                          </strong></div>
                          {transaction.beneficiary && <div>المستفيد: <strong>{transaction.beneficiary}</strong></div>}
                          <div>التاريخ: <strong>{transaction.date}</strong></div>
                          {transaction.payment_method && <div>طريقة الدفع: <strong>{transaction.payment_method}</strong></div>}
                          {transaction.committee_name && <div>اللجنة: <strong>{transaction.committee_name}</strong></div>}
                          {transaction.axis_name && <div>المحور: <strong>{transaction.axis_name}</strong></div>}
                        </div>
                      </div>
                      {canCreateTransactions && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="ml-2"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setTransactionForm({
                              type: transaction.type,
                              category: transaction.category,
                              amount: transaction.amount,
                              description: transaction.description,
                              date: transaction.date,
                              committee_id: transaction.committee_id || '',
                              committee_name: transaction.committee_name || '',
                              axis_id: transaction.axis_id || '',
                              axis_name: transaction.axis_name || '',
                              standard_id: transaction.standard_id || '',
                              standard_code: transaction.standard_code || '',
                              initiative_id: transaction.initiative_id || '',
                              initiative_title: transaction.initiative_title || '',
                              payment_method: transaction.payment_method || 'نقدي',
                              receipt_number: transaction.receipt_number || '',
                              beneficiary: transaction.beneficiary || '',
                              notes: transaction.notes || '',
                              attachment_url: transaction.attachment_url || ''
                            });
                            setTransactionFormOpen(true);
                          }}
                          title="تعديل المعاملة"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    {canApproveTransactions && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">تغيير الحالة:</p>
                        <div className="flex gap-2">
                          {transaction.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                              onClick={async () => {
                                await updateTransactionMutation.mutateAsync({
                                  id: transaction.id,
                                  data: { status: 'pending' }
                                });
                              }}
                            >
                              معلقة
                            </Button>
                          )}
                          {transaction.status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700"
                              onClick={async () => {
                                await updateTransactionMutation.mutateAsync({
                                  id: transaction.id,
                                  data: { status: 'approved', approved_by: currentUser?.full_name, approval_date: new Date().toISOString().split('T')[0] }
                                });
                              }}
                            >
                              معتمدة
                            </Button>
                          )}
                          {transaction.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-700"
                              onClick={async () => {
                                await updateTransactionMutation.mutateAsync({
                                  id: transaction.id,
                                  data: { status: 'paid', payment_date: new Date().toISOString().split('T')[0] }
                                });
                              }}
                            >
                              مدفوعة
                            </Button>
                          )}
                          {transaction.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-700"
                              onClick={async () => {
                                await updateTransactionMutation.mutateAsync({
                                  id: transaction.id,
                                  data: { status: 'rejected' }
                                });
                              }}
                            >
                              مرفوضة
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div>
            {showBudgetManagement && (
              <div className="flex justify-end mb-6">
                <Button onClick={() => openBudgetForm()} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-5 h-5 ml-2" />
                  ميزانية جديدة
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <DollarSign className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">لا توجد ميزانيات</p>
                    {showBudgetManagement && (
                      <p className="text-muted-foreground text-sm mt-2">ابدأ بإنشاء ميزانية جديدة</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                budgets.map(budget => (
                <Card key={budget.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{budget.name}</h3>
                        <p className="text-sm text-muted-foreground">{budget.fiscal_year}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {showBudgetManagement && (
                          <Button variant="outline" size="icon" onClick={() => openBudgetForm(budget)} title="تعديل الميزانية">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge className={budget.status === 'active' ? 'bg-green-600' : budget.status === 'draft' ? 'bg-gray-600' : 'bg-destructive'}>
                          {budget.status === 'active' ? 'نشطة' : budget.status === 'draft' ? 'مسودة' : 'مغلقة'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">إجمالي الميزانية:</span>
                        <strong className="text-blue-600">{budget.total_budget?.toLocaleString()} ريال</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الفترة:</span>
                        <strong>{budget.start_date} - {budget.end_date}</strong>
                      </div>
                    </div>
                    
                    {showBudgetManagement && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">تغيير الحالة:</p>
                        <div className="flex gap-2">
                          {budget.status !== 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={async () => {
                                await updateBudgetMutation.mutateAsync({
                                  id: budget.id,
                                  data: { status: 'draft' }
                                });
                              }}
                            >
                              مسودة
                            </Button>
                          )}
                          {budget.status !== 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-700"
                              onClick={async () => {
                                await updateBudgetMutation.mutateAsync({
                                  id: budget.id,
                                  data: { status: 'active' }
                                });
                              }}
                            >
                              تفعيل
                            </Button>
                          )}
                          {budget.status !== 'closed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-700"
                              onClick={async () => {
                                await updateBudgetMutation.mutateAsync({
                                  id: budget.id,
                                  data: { status: 'closed' }
                                });
                              }}
                            >
                              إغلاق
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Allocations Tab */}
        {activeTab === 'allocations' && (
          <div>
            {showBudgetManagement && (
              <div className="flex justify-end mb-6">
                <Button onClick={() => { setEditingAllocation(null); resetAllocationForm(); setAllocationFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-5 h-5 ml-2" />
                  تخصيص جديد
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allocations.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <DollarSign className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">لا توجد تخصيصات</p>
                    {showBudgetManagement && (
                      <p className="text-muted-foreground text-sm mt-2">ابدأ بإنشاء تخصيص جديد</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                allocations.map(allocation => (
                (() => {
                  const linkedInitiatives = allocationInitiativesMap[allocation.id] || [];
                  const initiativesBudgetTotal = linkedInitiatives.reduce((sum, initiative) => sum + (Number(initiative.budget) || 0), 0);
                  const actualSpent = Number(allocation.spent_amount) || 0;
                  const totalUtilized = actualSpent + initiativesBudgetTotal;
                  const remaining = (Number(allocation.allocated_amount) || 0) - totalUtilized;
                  const utilizationPct = Number(allocation.allocated_amount) > 0
                    ? Math.min((totalUtilized / Number(allocation.allocated_amount)) * 100, 100)
                    : 0;

                  return (
                <Card key={allocation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold">{allocation.committee_name || allocation.axis_name || 'تخصيص عام'}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {allocation.category && <p className="text-sm text-muted-foreground">{allocation.category}</p>}
                          {allocation.standard_code && (
                            <Badge variant="outline" className="text-xs">
                              معيار: {allocation.standard_code}
                            </Badge>
                          )}
                          {allocation.initiative_title && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
                              مبادرة: {allocation.initiative_title}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {showBudgetManagement && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditingAllocation(allocation);
                              setAllocationForm({
                                budget_id: allocation.budget_id || '',
                                budget_name: allocation.budget_name || '',
                                committee_id: allocation.committee_id || '',
                                committee_name: allocation.committee_name || '',
                                axis_id: allocation.axis_id || '',
                                axis_name: allocation.axis_name || '',
                                standard_id: allocation.standard_id || '',
                                standard_code: allocation.standard_code || '',
                                initiative_id: allocation.initiative_id || '',
                                initiative_title: allocation.initiative_title || '',
                                category: allocation.category || '',
                                allocated_amount: allocation.allocated_amount || 0,
                                notes: allocation.notes || ''
                              });
                              setAllocationFormOpen(true);
                            }}
                            title="تعديل التخصيص"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge className={allocation.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                          {allocation.status === 'active' ? 'نشط' : 'منتهي'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المبلغ المخصص:</span>
                        <strong>{allocation.allocated_amount?.toLocaleString()} ريال</strong>
                      </div>
                      {actualSpent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المنفق فعلياً:</span>
                        <strong className="text-red-600">{actualSpent.toLocaleString()} ريال</strong>
                      </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المستخدم (إنفاق + التزامات):</span>
                        <strong className="text-orange-600">{totalUtilized.toLocaleString()} ريال</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المتبقي:</span>
                        <strong className="text-green-600">{remaining.toLocaleString()} ريال</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ميزانيات المبادرات المرتبطة:</span>
                        <strong className="text-blue-600">{initiativesBudgetTotal.toLocaleString()} ريال</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">عدد المبادرات المرتبطة:</span>
                        <strong>{linkedInitiatives.length}</strong>
                      </div>
                      {linkedInitiatives.length > 0 && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          {linkedInitiatives.slice(0, 3).map((initiative) => initiative.title).join('، ')}
                          {linkedInitiatives.length > 3 ? ` +${linkedInitiatives.length - 3}` : ''}
                        </p>
                      )}
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${utilizationPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">{utilizationPct.toFixed(1)}% مستخدم</p>
                    </div>
                    
                    {showBudgetManagement && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">تغيير الحالة:</p>
                        <div className="flex gap-2">
                          {allocation.status !== 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-green-50 hover:bg-green-100 text-green-700"
                              onClick={async () => {
                                await api.entities.BudgetAllocation.update(allocation.id, { status: 'active' });
                                queryClient.invalidateQueries({ queryKey: ['allocations'] });
                              }}
                            >
                              نشط
                            </Button>
                          )}
                          {allocation.status !== 'inactive' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-muted/50 hover:bg-muted text-foreground"
                              onClick={async () => {
                                await api.entities.BudgetAllocation.update(allocation.id, { status: 'inactive' });
                                queryClient.invalidateQueries({ queryKey: ['allocations'] });
                              }}
                            >
                              غير نشط
                            </Button>
                          )}
                          {allocation.status !== 'closed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-700"
                              onClick={async () => {
                                await api.entities.BudgetAllocation.update(allocation.id, { status: 'closed' });
                                queryClient.invalidateQueries({ queryKey: ['allocations'] });
                              }}
                            >
                              مغلق
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                  );
                })()
              ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Form Dialog */}
      <Dialog open={transactionFormOpen} onOpenChange={(open) => { setTransactionFormOpen(open); if (!open) { setEditingTransaction(null); resetTransactionForm(); } }}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'تعديل المعاملة' : 'معاملة مالية جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع المعاملة *</Label>
                <Select value={transactionForm.type} onValueChange={(v) => setTransactionForm({ ...transactionForm, type: v, category: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">إيراد</SelectItem>
                    <SelectItem value="expense">مصروف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select value={transactionForm.category} onValueChange={(v) => setTransactionForm({ ...transactionForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                  <SelectContent>
                    {transactionCategories[transactionForm.type].map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المبلغ (ريال) *</Label>
                <Input type="number" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>التاريخ *</Label>
                <Input type="date" value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>الوصف *</Label>
                <Textarea value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} required rows={2} />
              </div>
              <div className="space-y-2">
                <Label>المستفيد/المورد</Label>
                <Input value={transactionForm.beneficiary} onChange={(e) => setTransactionForm({ ...transactionForm, beneficiary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <Select value={transactionForm.payment_method} onValueChange={(v) => setTransactionForm({ ...transactionForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>رقم الإيصال/الفاتورة</Label>
                <Input value={transactionForm.receipt_number} onChange={(e) => setTransactionForm({ ...transactionForm, receipt_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>المحور</Label>
                <Select value={transactionForm.axis_id || 'none'} onValueChange={(v) => {
                  const axis = axes.find(a => a.id === v);
                  setTransactionForm({ 
                    ...transactionForm, 
                    axis_id: v === 'none' ? '' : v, 
                    axis_name: v === 'none' ? '' : axis?.name,
                    standard_id: '',
                    standard_code: ''
                  });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر المحور (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {axes.map(axis => (
                      <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المعيار</Label>
                <Select 
                  value={transactionForm.standard_id || 'none'} 
                  onValueChange={(v) => {
                    const standard = standards.find(s => s.id === v);
                    setTransactionForm({ ...transactionForm, standard_id: v === 'none' ? '' : v, standard_code: v === 'none' ? '' : standard?.code || '' });
                  }}
                  disabled={!transactionForm.axis_id}
                >
                  <SelectTrigger><SelectValue placeholder={transactionForm.axis_id ? "اختر المعيار (اختياري)" : "اختر المحور أولاً"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {sortAndDeduplicateStandardsByCode(standards
                      .filter(s => !transactionForm.axis_id || s.axis_id === transactionForm.axis_id))
                      .map(standard => (
                        <SelectItem key={standard.id} value={standard.id}>
                          {standard.code} - {standard.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اللجنة</Label>
                <Select value={transactionForm.committee_id || 'none'} onValueChange={(v) => {
                  const committee = committees.find(c => c.id === v);
                  setTransactionForm({ ...transactionForm, committee_id: v === 'none' ? '' : v, committee_name: v === 'none' ? '' : committee?.name });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر اللجنة (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {committees
                      .filter(c => !transactionForm.axis_id || c.axis_id === transactionForm.axis_id)
                      .map(committee => (
                        <SelectItem key={committee.id} value={committee.id}>{committee.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>المبادرة</Label>
                <Select value={transactionForm.initiative_id || 'none'} onValueChange={(v) => {
                  const initiative = initiatives.find(i => i.id === v);
                  setTransactionForm({ ...transactionForm, initiative_id: v === 'none' ? '' : v, initiative_title: v === 'none' ? '' : initiative?.title || '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر المبادرة (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {initiatives.map(initiative => (
                      <SelectItem key={initiative.id} value={initiative.id}>
                        {initiative.code} - {initiative.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>المرفقات (فاتورة/إيصال)</Label>
                <div className="flex gap-2">
                  <Input type="file" onChange={handleFileUpload} accept="image/*,.pdf" disabled={uploadingFile} />
                  {uploadingFile && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                {transactionForm.attachment_url && (
                  <p className="text-sm text-green-600">✓ تم رفع الملف</p>
                )}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>ملاحظات</Label>
                <Textarea value={transactionForm.notes} onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setTransactionFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {editingTransaction ? 'حفظ التعديلات' : 'حفظ المعاملة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Budget Form Dialog - فقط لمدير الميزانية (ليس للمحاسب أو الموظف المالي) */}
      {showBudgetManagement && (
      <Dialog open={budgetFormOpen} onOpenChange={(open) => { setBudgetFormOpen(open); if (!open) { setEditingBudget(null); resetBudgetForm(); } }}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBudget ? 'تعديل الميزانية' : 'ميزانية جديدة'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>اسم الميزانية *</Label>
                <Input value={budgetForm.name} onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>السنة المالية *</Label>
                <Input value={budgetForm.fiscal_year} onChange={(e) => setBudgetForm({ ...budgetForm, fiscal_year: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>إجمالي الميزانية (ريال) *</Label>
                <Input type="number" value={budgetForm.total_budget} onChange={(e) => setBudgetForm({ ...budgetForm, total_budget: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>تاريخ البداية *</Label>
                <Input type="date" value={budgetForm.start_date} onChange={(e) => setBudgetForm({ ...budgetForm, start_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>تاريخ النهاية *</Label>
                <Input type="date" value={budgetForm.end_date} onChange={(e) => setBudgetForm({ ...budgetForm, end_date: e.target.value })} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>الوصف</Label>
                <Textarea value={budgetForm.description} onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })} rows={2} />
              </div>
              {editingBudget && (
                <div className="col-span-2 space-y-2">
                  <Label>حالة الميزانية *</Label>
                  <Select value={budgetForm.status} onValueChange={(v) => setBudgetForm({ ...budgetForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="active">نشطة</SelectItem>
                      <SelectItem value="closed">مغلقة</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    💡 المسودة: قيد الإعداد | النشطة: قيد التنفيذ | المغلقة: منتهية
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeBudgetForm}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {editingBudget ? 'حفظ التعديلات' : 'حفظ الميزانية'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* Allocation Form Dialog */}
      <Dialog open={allocationFormOpen} onOpenChange={(open) => { setAllocationFormOpen(open); if (!open) { setEditingAllocation(null); resetAllocationForm(); } }}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAllocation ? 'تعديل التخصيص' : 'تخصيص ميزانية جديد'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAllocation} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>الميزانية *</Label>
                <Select value={allocationForm.budget_id} onValueChange={(v) => setAllocationForm({ ...allocationForm, budget_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر الميزانية" /></SelectTrigger>
                  <SelectContent>
                    {budgets.filter(b => b.status === 'active' || b.status === 'draft').map(budget => (
                      <SelectItem key={budget.id} value={budget.id}>{budget.name} {budget.status === 'draft' ? '(مسودة)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المحور</Label>
                <Select value={allocationForm.axis_id || 'none'} onValueChange={(v) => {
                  const axis = normalizedAxes.find(a => a.id === v);
                  setAllocationForm({
                    ...allocationForm,
                    axis_id: v === 'none' ? '' : v,
                    axis_name: v === 'none' ? '' : axis?.display_name,
                    standard_id: '',
                    standard_code: '',
                    committee_id: '',
                    committee_name: '',
                    initiative_id: '',
                    initiative_title: ''
                  });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر المحور (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {normalizedAxes.map(axis => (
                      <SelectItem key={axis.id} value={axis.id}>{axis.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المعيار</Label>
                <Select value={allocationForm.standard_id || 'none'} onValueChange={(v) => {
                  const standard = standards.find(s => s.id === v);
                  setAllocationForm({
                    ...allocationForm,
                    standard_id: v === 'none' ? '' : v,
                    standard_code: v === 'none' ? '' : standard?.code || '',
                    initiative_id: '',
                    initiative_title: ''
                  });
                }}>
                  <SelectTrigger disabled={!allocationForm.axis_id}><SelectValue placeholder="اختر المعيار (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {filteredStandardsForAllocation.map(standard => (
                      <SelectItem key={standard.id} value={standard.id}>
                        {standard.code} - {standard.name || standard.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اللجنة</Label>
                <Select value={allocationForm.committee_id || 'none'} onValueChange={(v) => {
                  const committee = committees.find(c => c.id === v);
                  setAllocationForm({
                    ...allocationForm,
                    committee_id: v === 'none' ? '' : v,
                    committee_name: v === 'none' ? '' : committee?.name,
                    initiative_id: '',
                    initiative_title: ''
                  });
                }}>
                  <SelectTrigger disabled={!allocationForm.axis_id}><SelectValue placeholder="اختر اللجنة (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {filteredCommitteesForAllocation.map(committee => (
                      <SelectItem key={committee.id} value={committee.id}>{committee.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المبادرة</Label>
                <Select value={allocationForm.initiative_id || 'none'} onValueChange={(v) => {
                  const initiative = initiatives.find(i => i.id === v);
                  const committee = committees.find(c => c.id === initiative?.committee_id);
                  const axisName = axisDisplayNameById.get(String(initiative?.axis_id || ''));
                  const standard = standards.find(s => s.id === initiative?.standard_id);
                  setAllocationForm({
                    ...allocationForm,
                    initiative_id: v === 'none' ? '' : v,
                    initiative_title: v === 'none' ? '' : initiative?.title || '',
                    committee_id: v === 'none' ? allocationForm.committee_id : (initiative?.committee_id || allocationForm.committee_id),
                    committee_name: v === 'none' ? allocationForm.committee_name : (committee?.name || allocationForm.committee_name),
                    axis_id: v === 'none' ? allocationForm.axis_id : (initiative?.axis_id || allocationForm.axis_id),
                    axis_name: v === 'none' ? allocationForm.axis_name : (axisName || allocationForm.axis_name),
                    standard_id: v === 'none' ? allocationForm.standard_id : (initiative?.standard_id || allocationForm.standard_id),
                    standard_code: v === 'none' ? allocationForm.standard_code : (standard?.code || allocationForm.standard_code),
                  });
                }}>
                  <SelectTrigger disabled={!allocationForm.axis_id}><SelectValue placeholder="اختر المبادرة (اختياري)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط</SelectItem>
                    {filteredInitiativesForAllocation.map(initiative => (
                        <SelectItem key={initiative.id} value={initiative.id}>
                          {initiative.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  تم الترتيب: المحور ← المعيار ← اللجنة ← المبادرة، والقائمة تتفلتر تلقائياً حسب اختيارك.
                </p>
              </div>
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Input value={allocationForm.category} onChange={(e) => setAllocationForm({ ...allocationForm, category: e.target.value })} placeholder="مثال: تشغيلية، رأسمالية، إلخ" />
              </div>
              <div className="space-y-2">
                <Label>المبلغ المخصص (ريال) *</Label>
                <Input type="number" value={allocationForm.allocated_amount} onChange={(e) => setAllocationForm({ ...allocationForm, allocated_amount: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>ملاحظات</Label>
                <Textarea value={allocationForm.notes} onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setAllocationFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {editingAllocation ? 'حفظ التعديلات' : 'حفظ التخصيص'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}