import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeStandardCode } from '@/utils/translationService';
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
import { Plus, DollarSign, TrendingUp, TrendingDown, Search, FileText, Clock, Loader2, Pencil, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from '@/hooks/usePermissions';
import T from '@/components/T';
import { AXES_CSV, sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';

const transactionCategories = {
  expense: ['salaries', 'supplies', 'operations', 'events', 'transportation', 'communication', 'printing', 'maintenance', 'contracts', 'training', 'rent', 'hospitality', 'other_expense'],
  income: ['sponsorship', 'donation', 'government', 'fees', 'other_income']
};

const paymentMethods = ['cash', 'check', 'bankTransfer', 'card', 'other'];

// حساب ضريبة القيمة المضافة
const calcVat = (amount, rate) => Math.round(amount * (rate / 100) * 100) / 100;

export default function Budget() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
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
    payment_method: 'cash',
    payment_reference: '',
    vat_rate: 0,
    vat_amount: 0,
    total_amount: 0,
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
    .reduce((sum, t) => sum + (Number(t.total_amount) || Number(t.amount) || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + (Number(t.total_amount) || Number(t.amount) || 0), 0);

  // المصروفات المعتمدة (لم تُصرف بعد) — تمثل التزامات مالية
  const committedExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'approved')
    .reduce((sum, t) => sum + (Number(t.total_amount) || Number(t.amount) || 0), 0);

  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  const balance = totalIncome - totalExpenses;
  // الرصيد المتاح = الإيرادات - المصروف الفعلي - الملتزم به (معتمد)
  const availableBalance = totalIncome - totalExpenses - committedExpenses;

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

  // الإنفاق الفعلي المحتسب من المعاملات المدفوعة لكل تخصيص
  const allocationSpentMap = useMemo(() => {
    const result = {};
    transactions
      .filter(t => t.type === 'expense' && t.status === 'paid')
      .forEach(t => {
        const amount = Number(t.total_amount) || Number(t.amount) || 0;
        const match = allocations.find(a =>
          (t.initiative_id && a.initiative_id && String(a.initiative_id) === String(t.initiative_id)) ||
          (t.committee_id && a.committee_id && String(a.committee_id) === String(t.committee_id)) ||
          (t.axis_id && a.axis_id && String(a.axis_id) === String(t.axis_id))
        );
        if (match) result[match.id] = (result[match.id] || 0) + amount;
      });
    return result;
  }, [transactions, allocations]);

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
      payment_method: 'cash',
      payment_reference: '',
      vat_rate: 0,
      vat_amount: 0,
      total_amount: 0,
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

    // تحذير تجاوز الميزانية المتاحة
    if (!editingTransaction && transactionForm.type === 'expense' && activeBudget) {
      const newAmount = Number(transactionForm.total_amount) || Number(transactionForm.amount) || 0;
      const remainingAvailable = (activeBudget.total_budget || 0) - totalExpenses - committedExpenses;
      if (newAmount > remainingAvailable && remainingAvailable >= 0) {
        const confirmOver = window.confirm(
          `⚠️ تحذير: هذه المعاملة (${newAmount.toLocaleString()} ريال) تتجاوز الرصيد المتاح (${remainingAvailable.toLocaleString()} ريال).\nهل تريد المتابعة رغم ذلك؟`
        );
        if (!confirmOver) return;
      }
    }

    setSaving(true);
    
    if (editingTransaction) {
      await updateTransactionMutation.mutateAsync({
        id: editingTransaction.id,
        data: { ...transactionForm }
      });
    } else {
      const year = new Date().getFullYear();
      const typePrefix = transactionForm.type === 'expense' ? 'EXP' : 'INC';
      const typeCount = transactions.filter(tx => tx.type === transactionForm.type).length;
      const transactionNumber = `${typePrefix}-${year}-${String(typeCount + 1).padStart(3, '0')}`;
      const totalAmount = Number(transactionForm.total_amount) || Number(transactionForm.amount) || 0;
      await createTransactionMutation.mutateAsync({
        ...transactionForm,
        total_amount: totalAmount,
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
      <div className="min-h-screen bg-muted/50 flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">{t('budget.noAccess')} {t('budget.noAccessNote')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="gradient-primary text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            {t('budget.title')}
          </h1>
          <p className="text-white/70">{t('budget.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">{t('budget.totalRevenue')}</p>
                  <p className="text-3xl font-bold">{totalIncome.toLocaleString()}</p>
                  <p className="text-sm text-white/70 mt-1">{t('currency.sar')}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-800 to-red-900 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">{t('budget.totalExpenses')}</p>
                  <p className="text-3xl font-bold">{totalExpenses.toLocaleString()}</p>
                  <p className="text-sm text-white/70 mt-1">{t('currency.sar')}</p>
                </div>
                <TrendingDown className="w-12 h-12 text-white/30" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${availableBalance >= 0 ? 'from-[#0f766e] to-[#14918a]' : 'from-red-700 to-red-900'} text-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-opacity-80 text-sm mb-1">{t('budget.availableBalance')}</p>
                  <p className="text-3xl font-bold">{availableBalance.toLocaleString()}</p>
                  <p className="text-sm text-white text-opacity-80 mt-1">{t('currency.sar')}</p>
                  <p className="text-xs text-white/60 mt-1">{t('budget.paidBalance')}: {balance.toLocaleString()}</p>
                </div>
                <DollarSign className="w-12 h-12 text-white text-opacity-60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-700 to-amber-800 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm mb-1">{t('budget.committedExpenses')}</p>
                  <p className="text-3xl font-bold">{committedExpenses.toLocaleString()}</p>
                  <p className="text-sm text-white/70 mt-1">{t('currency.sar')}</p>
                  {pendingTransactions > 0 && (
                    <p className="text-xs text-yellow-300 mt-1">⏳ {pendingTransactions} {t('budget.awaitingApproval')}</p>
                  )}
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
                <CardTitle>{t('budget.currentBudget')} - <T>{activeBudget.name}</T></CardTitle>
                <Badge className={activeBudget.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                  {activeBudget.status === 'active' ? t('budget.budgetTab.active') : t('budget.budgetTab.closed')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('budget.totalBudget')}</p>
                  <p className="text-2xl font-bold text-blue-600">{activeBudget.total_budget?.toLocaleString()} {t('currency.riyal')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('budget.budgetAllocations')}</p>
                  <p className="text-2xl font-bold text-purple-600">{totalAllocatedBudgets.toLocaleString()} {t('currency.riyal')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('budget.initiativeBudgets')}</p>
                  <p className="text-2xl font-bold text-indigo-600">{totalInitiativesBudgets.toLocaleString()} {t('currency.riyal')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('budget.actualSpent')}</p>
                  <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} {t('currency.riyal')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('budget.remaining')}</p>
                  <p className={`text-2xl font-bold ${(activeBudget.total_budget - totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(activeBudget.total_budget - totalExpenses).toLocaleString()} {t('currency.riyal')}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('budget.overview.committedTotal')}</span>
                  <span className="font-bold text-orange-600">{totalCommitted.toLocaleString()} {t('currency.riyal')}</span>
                </div>
                {activeBudget.total_budget > 0 && totalCommitted > activeBudget.total_budget && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                    ⚠️ {t('budget.overview.overBudgetWarning')} {(totalCommitted - activeBudget.total_budget).toLocaleString()} {t('currency.riyal')}
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
                            title={`${t('budget.overview.spentActually')}: ${totalExpenses.toLocaleString()} ${t('currency.riyal')}`}
                          />
                          <div
                            className="absolute h-3 bg-orange-400 opacity-60"
                            style={{ width: `${committedPct}%` }}
                            title={`${t('budget.committed')}: ${totalCommitted.toLocaleString()} ${t('currency.riyal')}`}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-destructive rounded"></div>
                          <span>{t('budget.overview.spentActually')} ({spentPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-400 rounded"></div>
                          <span>{t('budget.committed')} ({committedPct.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-600 rounded"></div>
                          <span>{t('budget.available')} ({remainPct.toFixed(1)}%)</span>
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
          <TabsList className="bg-card" dir={rtl ? 'rtl' : 'ltr'}>
            <TabsTrigger value="overview">{t('budget.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="transactions">{t('budget.tabs.transactions')}</TabsTrigger>
            <TabsTrigger value="budgets">{t('budget.tabs.budgets')}</TabsTrigger>
            <TabsTrigger value="allocations">{t('budget.tabs.allocations')}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('budget.overview.summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">{t('budget.overview.activeBudgets')}</p>
                      <p className="text-2xl font-bold text-blue-600">{budgets.filter(b => b.status === 'active').length}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">{t('budget.overview.financialAllocations')}</p>
                      <p className="text-2xl font-bold text-purple-600">{allocations.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{totalAllocatedBudgets.toLocaleString()} {t('currency.riyal')}</p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">{t('budget.overview.linkedInitiatives')}</p>
                      <p className="text-2xl font-bold text-indigo-600">{initiatives.filter(i => String(i.budget_id || '') === String(activeBudget?.id || '')).length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{totalInitiativesBudgets.toLocaleString()} {t('currency.riyal')}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">{t('budget.overview.totalTransactions')}</p>
                      <p className="text-2xl font-bold text-green-600">{transactions.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{totalExpenses.toLocaleString()} {t('budget.overview.spentAmount')}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-3">{t('budget.overview.topCategories')}</h3>
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
                              <span className="font-medium"><T>{category}</T></span>
                              <span className="text-red-600 font-bold">{amount.toLocaleString()} {t('currency.riyal')}</span>
                            </div>
                          ))}
                        {Object.keys(transactions.filter(t => t.type === 'expense' && t.status === 'paid')).length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-4">{t('budget.overview.noExpenses')}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">{t('budget.overview.topInitiatives')}</h3>
                      <div className="space-y-2">
                        {initiatives
                          .filter(i => String(i.budget_id || '') === String(activeBudget?.id || '') && i.budget > 0)
                          .sort((a, b) => (b.budget || 0) - (a.budget || 0))
                          .slice(0, 5)
                          .map(initiative => (
                            <div key={initiative.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded">
                              <span className="font-medium text-sm truncate flex-1"><T>{initiative.title}</T></span>
                              <span className="text-indigo-600 font-bold text-sm ms-2">{initiative.budget.toLocaleString()} {t('currency.riyal')}</span>
                            </div>
                          ))}
                        {initiatives.filter(i => String(i.budget_id || '') === String(activeBudget?.id || '') && i.budget > 0).length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-4">{t('budget.overview.noLinkedInitiatives')}</p>
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
                <Search className={`absolute ${rtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
                <Input
                  placeholder={t('budget.transactionTab.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={rtl ? 'pr-10' : 'pl-10'}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budget.transactionTab.allTypes')}</SelectItem>
                  <SelectItem value="income">{t('budget.transactionTab.income')}</SelectItem>
                  <SelectItem value="expense">{t('budget.transactionTab.expense')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budget.transactionTab.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('budget.transactionTab.statusPending')}</SelectItem>
                  <SelectItem value="approved">{t('budget.transactionTab.statusApproved')}</SelectItem>
                  <SelectItem value="paid">{t('budget.transactionTab.statusPaid')}</SelectItem>
                </SelectContent>
              </Select>
              {canCreateTransactions && (
                <Button onClick={() => { setEditingTransaction(null); resetTransactionForm(); setTransactionFormOpen(true); }} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-5 h-5 ms-2" />
                  {t('budget.transactionTab.newTransaction')}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">{t('budget.transactionTab.noTransactions')}</p>
                    <p className="text-muted-foreground text-sm mt-2">{t('budget.transactionTab.startAdding')}</p>
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
                            {transaction.type === 'income' ? t('budget.transactionTab.incomeLabel') : t('budget.transactionTab.expenseLabel')}
                          </Badge>
                          <Badge variant="outline"><T>{t(`budget.transactionCategories.${transaction.category}`, transaction.category)}</T></Badge>
                          <Badge className={
                            transaction.status === 'paid' ? 'bg-green-600' :
                            transaction.status === 'approved' ? 'bg-primary' :
                            transaction.status === 'pending' ? 'bg-yellow-600' :
                            'bg-destructive'
                          }>
                            {transaction.status === 'paid' ? t('budget.transactionTab.statusPaid') :
                             transaction.status === 'approved' ? t('budget.transactionTab.statusApproved') :
                             transaction.status === 'pending' ? t('budget.transactionTab.statusPending') : t('budget.transactionTab.statusRejected')}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-1"><T>{transaction.description}</T></h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {transaction.standard_code && (
                            <Badge variant="outline" className="text-xs">
                              {t('budget.transactionTab.standardLabel')} {transaction.standard_code}
                            </Badge>
                          )}
                          {transaction.initiative_title && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
                              {t('budget.transactionTab.initiativeLabel')} <T>{transaction.initiative_title}</T>
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div>{t('budget.transactionTab.amount')} <strong className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.amount?.toLocaleString()} {t('currency.riyal')}
                          </strong></div>
                          {transaction.beneficiary && <div>{t('budget.transactionTab.payee')} <strong><T>{transaction.beneficiary}</T></strong></div>}
                          <div>{t('budget.transactionTab.transDate')} <strong>{transaction.date}</strong></div>
                          {transaction.payment_method && <div>{t('budget.transactionTab.paymentMethod')} <strong><T>{t(`budget.paymentMethods.${transaction.payment_method}`, transaction.payment_method)}</T></strong></div>}
                          {transaction.committee_name && <div>{t('budget.transactionTab.committeeLabel')} <strong><T>{transaction.committee_name}</T></strong></div>}
                          {transaction.axis_name && <div>{t('budget.transactionTab.axisLabel')} <strong><T>{transaction.axis_name}</T></strong></div>}
                          {(transaction.vat_rate > 0) && <div>{t('budget.transactionTab.vatLabel')} <strong className="text-amber-600">{(transaction.vat_amount || 0).toLocaleString()} {t('currency.riyal')} ({transaction.vat_rate}%)</strong> — {t('budget.transactionTab.totalLabel')}: <strong>{(Number(transaction.total_amount) || Number(transaction.amount) || 0).toLocaleString()} {t('currency.riyal')}</strong></div>}
                          {transaction.payment_reference && <div>{t('budget.transactionTab.paymentReferenceLabel')} <strong className="font-mono">{transaction.payment_reference}</strong></div>}
                          {transaction.approved_by && <div>{t('budget.transactionTab.approvedBy')} <strong>{transaction.approved_by}</strong>{transaction.approval_date ? ` — ${transaction.approval_date}` : ''}</div>}
                          {transaction.payment_date && <div>{t('budget.transactionTab.paymentDate')} <strong>{transaction.payment_date}</strong></div>}
                        </div>
                      </div>
                      {canCreateTransactions && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="ms-2"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setTransactionForm({
                              type: transaction.type,
                              category: transaction.category,
                              amount: transaction.amount || 0,
                              vat_rate: transaction.vat_rate || 0,
                              vat_amount: transaction.vat_amount || 0,
                              total_amount: transaction.total_amount || transaction.amount || 0,
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
                              payment_method: transaction.payment_method || 'cash',
                              payment_reference: transaction.payment_reference || '',
                              receipt_number: transaction.receipt_number || '',
                              beneficiary: transaction.beneficiary || '',
                              notes: transaction.notes || '',
                              attachment_url: transaction.attachment_url || ''
                            });
                            setTransactionFormOpen(true);
                          }}
                          title={t('budget.form.editTransaction')}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    {canApproveTransactions && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">{t('budget.transactionTab.statusChange')}</p>
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
                              {t('budget.transactionTab.statusPending')}
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
                              {t('budget.transactionTab.statusApproved')}
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
                              {t('budget.transactionTab.statusPaid')}
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
                              {t('budget.transactionTab.statusRejected')}
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
                  <Plus className="w-5 h-5 ms-2" />
                  {t('budget.budgetTab.newBudget')}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <DollarSign className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">{t('budget.budgetTab.noBudgets')}</p>
                    {showBudgetManagement && (
                      <p className="text-muted-foreground text-sm mt-2">{t('budget.budgetTab.startCreating')}</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                budgets.map(budget => (
                <Card key={budget.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg"><T>{budget.name}</T></h3>
                        <p className="text-sm text-muted-foreground">{budget.fiscal_year}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {showBudgetManagement && (
                          <Button variant="outline" size="icon" onClick={() => openBudgetForm(budget)} title={t('budget.form.editBudget')}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge className={budget.status === 'active' ? 'bg-green-600' : budget.status === 'draft' ? 'bg-gray-600' : 'bg-destructive'}>
                          {budget.status === 'active' ? t('budget.budgetTab.active') : budget.status === 'draft' ? t('budget.budgetTab.draft') : t('budget.budgetTab.closed')}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('budget.budgetTab.totalBudgetLabel')}</span>
                        <strong className="text-blue-600">{budget.total_budget?.toLocaleString()} {t('currency.riyal')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('budget.budgetTab.period')}</span>
                        <strong>{budget.start_date} - {budget.end_date}</strong>
                      </div>
                    </div>
                    
                    {showBudgetManagement && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">{t('budget.budgetTab.statusChange')}</p>
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
                              {t('budget.budgetTab.draft')}
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
                              {t('budget.budgetTab.activate')}
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
                              {t('budget.budgetTab.closeBudget')}
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
                  <Plus className="w-5 h-5 ms-2" />
                  {t('budget.allocationTab.newAllocation')}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allocations.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <DollarSign className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground text-lg">{t('budget.allocationTab.noAllocations')}</p>
                    {showBudgetManagement && (
                      <p className="text-muted-foreground text-sm mt-2">{t('budget.allocationTab.startCreating')}</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                allocations.map(allocation => (
                (() => {
                  const linkedInitiatives = allocationInitiativesMap[allocation.id] || [];
                  const initiativesBudgetTotal = linkedInitiatives.reduce((sum, initiative) => sum + (Number(initiative.budget) || 0), 0);
                  const actualSpent = allocationSpentMap[allocation.id] ?? Number(allocation.spent_amount) ?? 0;
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
                        <h3 className="font-semibold"><T>{allocation.committee_name || allocation.axis_name || t('budget.allocationTab.generalAllocation')}</T></h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {allocation.category && <p className="text-sm text-muted-foreground"><T>{allocation.category}</T></p>}
                          {allocation.standard_code && (
                            <Badge variant="outline" className="text-xs">
                              {t('budget.transactionTab.standardLabel')} {allocation.standard_code}
                            </Badge>
                          )}
                          {allocation.initiative_title && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
                              {t('budget.transactionTab.initiativeLabel')} <T>{allocation.initiative_title}</T>
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
                            title={t('budget.form.editAllocation')}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge className={allocation.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                          {allocation.status === 'active' ? t('budget.allocationTab.activeStatus') : t('budget.allocationTab.expired')}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('budget.allocationTab.allocatedAmount')}</span>
                        <strong>{allocation.allocated_amount?.toLocaleString()} {t('currency.riyal')}</strong>
                      </div>
                      {actualSpent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('budget.allocationTab.actualSpent')}</span>
                        <strong className="text-red-600">{actualSpent.toLocaleString()} {t('currency.riyal')}</strong>
                      </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('budget.allocationTab.usedAmount')}</span>
                        <strong className="text-orange-600">{totalUtilized.toLocaleString()} {t('currency.riyal')}</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('budget.allocationTab.remainingAmount')}</span>
                        <strong className="text-green-600">{remaining.toLocaleString()} {t('currency.riyal')}</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('budget.allocationTab.linkedInitBudgets')}</span>
                        <strong className="text-blue-600">{initiativesBudgetTotal.toLocaleString()} {t('currency.riyal')}</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('budget.allocationTab.linkedInitCount')}</span>
                        <strong>{linkedInitiatives.length}</strong>
                      </div>
                      {linkedInitiatives.length > 0 && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                          <T>{linkedInitiatives.slice(0, 3).map((initiative) => initiative.title).join('، ')}</T>
                          {linkedInitiatives.length > 3 ? ` +${linkedInitiatives.length - 3}` : ''}
                        </p>
                      )}
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${utilizationPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">{utilizationPct.toFixed(1)}% {t('budget.allocationTab.used')}</p>
                    </div>
                    
                    {showBudgetManagement && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">{t('budget.allocationTab.statusChange')}</p>
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
                              {t('budget.allocationTab.activeStatus')}
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
                              {t('budget.allocationTab.inactiveStatus')}
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
                              {t('budget.allocationTab.closedStatus')}
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
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? t('budget.form.editTransaction') : t('budget.form.newTransaction')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('budget.form.transactionType')}</Label>
                <Select value={transactionForm.type} onValueChange={(v) => setTransactionForm({ ...transactionForm, type: v, category: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t('budget.transactionTab.incomeLabel')}</SelectItem>
                    <SelectItem value="expense">{t('budget.transactionTab.expenseLabel')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.category')}</Label>
                <Select value={transactionForm.category} onValueChange={(v) => setTransactionForm({ ...transactionForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder={t('budget.form.selectCategory')} /></SelectTrigger>
                  <SelectContent>
                    {transactionCategories[transactionForm.type].map(cat => (
                      <SelectItem key={cat} value={cat}>{t(`budget.transactionCategories.${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.amountRiyal')}</Label>
                <Input type="number" min="0" step="0.01" value={transactionForm.amount} onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  const vatAmount = calcVat(amount, transactionForm.vat_rate);
                  setTransactionForm({ ...transactionForm, amount, vat_amount: vatAmount, total_amount: amount + vatAmount });
                }} required />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.vatRate')}</Label>
                <Select value={String(transactionForm.vat_rate)} onValueChange={(v) => {
                  const rate = Number(v);
                  const vatAmount = calcVat(transactionForm.amount, rate);
                  setTransactionForm({ ...transactionForm, vat_rate: rate, vat_amount: vatAmount, total_amount: transactionForm.amount + vatAmount });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t('budget.form.vatNone')}</SelectItem>
                    <SelectItem value="15">{t('budget.form.vat15')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {transactionForm.vat_rate > 0 && (
                <div className="col-span-2 bg-amber-50 border border-amber-200 rounded p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('budget.form.amountBeforeVat')}:</span>
                    <strong>{transactionForm.amount.toLocaleString()} {t('currency.riyal')}</strong>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>{t('budget.form.vatAmount')} ({transactionForm.vat_rate}%):</span>
                    <strong>{transactionForm.vat_amount.toLocaleString()} {t('currency.riyal')}</strong>
                  </div>
                  <div className="flex justify-between font-bold border-t border-amber-200 pt-1">
                    <span>{t('budget.form.totalWithVat')}:</span>
                    <strong className="text-amber-700">{transactionForm.total_amount.toLocaleString()} {t('currency.riyal')}</strong>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t('budget.form.dateRequired')}</Label>
                <Input type="date" value={transactionForm.date} onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.description')}</Label>
                <Textarea value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} required rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.payee')}</Label>
                <Input value={transactionForm.beneficiary} onChange={(e) => setTransactionForm({ ...transactionForm, beneficiary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.paymentMethod')}</Label>
                <Select value={transactionForm.payment_method} onValueChange={(v) => setTransactionForm({ ...transactionForm, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{t(`budget.paymentMethods.${method}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.receiptNumber')}</Label>
                <Input value={transactionForm.receipt_number} onChange={(e) => setTransactionForm({ ...transactionForm, receipt_number: e.target.value })} placeholder={t('budget.form.receiptPlaceholder')} />
              </div>
              {transactionForm.payment_method !== 'cash' && (
                <div className="space-y-2">
                  <Label>{t('budget.form.paymentReference')} <span className="text-red-500 text-xs">*</span></Label>
                  <Input
                    value={transactionForm.payment_reference}
                    onChange={(e) => setTransactionForm({ ...transactionForm, payment_reference: e.target.value })}
                    required={transactionForm.payment_method !== 'cash'}
                    placeholder={transactionForm.payment_method === 'check' ? t('budget.form.checkNumberPlaceholder') : t('budget.form.transferReferencePlaceholder')}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>{t('budget.form.axis')}</Label>
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
                  <SelectTrigger><SelectValue placeholder={t('budget.form.selectAxisOptional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {axes.map(axis => (
                      <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.standard')}</Label>
                <Select 
                  value={transactionForm.standard_id || 'none'} 
                  onValueChange={(v) => {
                    const standard = standards.find(s => s.id === v);
                    setTransactionForm({ ...transactionForm, standard_id: v === 'none' ? '' : v, standard_code: v === 'none' ? '' : standard?.code || '' });
                  }}
                  disabled={!transactionForm.axis_id}
                >
                  <SelectTrigger><SelectValue placeholder={transactionForm.axis_id ? t('budget.form.selectStandardOptional') : t('budget.form.selectAxisFirst')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {sortAndDeduplicateStandardsByCode(standards
                      .filter(s => !transactionForm.axis_id || s.axis_id === transactionForm.axis_id))
                      .map(standard => (
                        <SelectItem key={standard.id} value={standard.id}>
                          {localizeStandardCode(standard.code)} - <T>{standard.name}</T>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.committee')}</Label>
                <Select value={transactionForm.committee_id || 'none'} onValueChange={(v) => {
                  const committee = committees.find(c => c.id === v);
                  setTransactionForm({ ...transactionForm, committee_id: v === 'none' ? '' : v, committee_name: v === 'none' ? '' : committee?.name });
                }}>
                  <SelectTrigger><SelectValue placeholder={t('budget.form.selectCommitteeOptional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {committees
                      .filter(c => !transactionForm.axis_id || c.axis_id === transactionForm.axis_id)
                      .map(committee => (
                        <SelectItem key={committee.id} value={committee.id}><T>{committee.name}</T></SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.initiative')}</Label>
                <Select value={transactionForm.initiative_id || 'none'} onValueChange={(v) => {
                  const initiative = initiatives.find(i => i.id === v);
                  setTransactionForm({ ...transactionForm, initiative_id: v === 'none' ? '' : v, initiative_title: v === 'none' ? '' : initiative?.title || '' });
                }}>
                  <SelectTrigger><SelectValue placeholder={t('budget.form.selectInitiativeOptional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {initiatives.map(initiative => (
                      <SelectItem key={initiative.id} value={initiative.id}>
                        {initiative.code} - <T>{initiative.title}</T>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.attachments')}</Label>
                <div className="flex gap-2">
                  <Input type="file" onChange={handleFileUpload} accept="image/*,.pdf" disabled={uploadingFile} />
                  {uploadingFile && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                {transactionForm.attachment_url && (
                  <p className="text-sm text-green-600">✓ {t('budget.form.fileUploaded')}</p>
                )}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.budgetNotes')}</Label>
                <Textarea value={transactionForm.notes} onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setTransactionFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                {editingTransaction ? t('budget.form.saveChanges') : t('budget.form.saveTransaction')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Budget Form Dialog - فقط لمدير الميزانية (ليس للمحاسب أو الموظف المالي) */}
      {showBudgetManagement && (
      <Dialog open={budgetFormOpen} onOpenChange={(open) => { setBudgetFormOpen(open); if (!open) { setEditingBudget(null); resetBudgetForm(); } }}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBudget ? t('budget.form.editBudget') : t('budget.form.newBudget')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBudget} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.budgetName')}</Label>
                <Input value={budgetForm.name} onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.fiscalYear')}</Label>
                <Input value={budgetForm.fiscal_year} onChange={(e) => setBudgetForm({ ...budgetForm, fiscal_year: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.totalBudgetAmount')}</Label>
                <Input type="number" value={budgetForm.total_budget} onChange={(e) => setBudgetForm({ ...budgetForm, total_budget: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.startDate')}</Label>
                <Input type="date" value={budgetForm.start_date} onChange={(e) => setBudgetForm({ ...budgetForm, start_date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.endDate')}</Label>
                <Input type="date" value={budgetForm.end_date} onChange={(e) => setBudgetForm({ ...budgetForm, end_date: e.target.value })} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.description')}</Label>
                <Textarea value={budgetForm.description} onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })} rows={2} />
              </div>
              {editingBudget && (
                <div className="col-span-2 space-y-2">
                  <Label>{t('budget.form.budgetStatus')}</Label>
                  <Select value={budgetForm.status} onValueChange={(v) => setBudgetForm({ ...budgetForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('budget.budgetTab.draft')}</SelectItem>
                      <SelectItem value="active">{t('budget.budgetTab.active')}</SelectItem>
                      <SelectItem value="closed">{t('budget.budgetTab.closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    💡 {t('budget.form.budgetStatusHint')}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeBudgetForm}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                {editingBudget ? t('budget.form.saveChanges') : t('budget.form.saveBudget')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* Allocation Form Dialog */}
      <Dialog open={allocationFormOpen} onOpenChange={(open) => { setAllocationFormOpen(open); if (!open) { setEditingAllocation(null); resetAllocationForm(); } }}>
        <DialogContent dir={rtl ? 'rtl' : 'ltr'} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAllocation ? t('budget.form.editAllocation') : t('budget.form.newAllocation')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAllocation} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.linkedBudget')}</Label>
                <Select value={allocationForm.budget_id} onValueChange={(v) => setAllocationForm({ ...allocationForm, budget_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t('budget.form.selectBudget')} /></SelectTrigger>
                  <SelectContent>
                    {budgets.filter(b => b.status === 'active' || b.status === 'draft').map(budget => (
                      <SelectItem key={budget.id} value={budget.id}><T>{budget.name}</T> {budget.status === 'draft' ? t('budget.form.draftBudgetSuffix') : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.axis')}</Label>
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
                  <SelectTrigger><SelectValue placeholder={t('budget.form.selectAxisOptional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {normalizedAxes.map(axis => (
                      <SelectItem key={axis.id} value={axis.id}><T>{axis.display_name}</T></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.standard')}</Label>
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
                  <SelectTrigger disabled={!allocationForm.axis_id}><SelectValue placeholder={t('budget.form.selectStandardOptional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {filteredStandardsForAllocation.map(standard => (
                      <SelectItem key={standard.id} value={standard.id}>
                        {localizeStandardCode(standard.code)} - <T>{standard.name || standard.title}</T>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.committee')}</Label>
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
                  <SelectTrigger disabled={!allocationForm.axis_id}><SelectValue placeholder={t('budget.form.selectCommitteeOptional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {filteredCommitteesForAllocation.map(committee => (
                      <SelectItem key={committee.id} value={committee.id}><T>{committee.name}</T></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.initiative')}</Label>
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
                  <SelectTrigger disabled={!allocationForm.axis_id}><SelectValue placeholder={t('budget.form.selectInitiativeOptional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('budget.form.noLink')}</SelectItem>
                    {filteredInitiativesForAllocation.map(initiative => (
                        <SelectItem key={initiative.id} value={initiative.id}>
                          <T>{initiative.title}</T>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('budget.form.filterHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.category')}</Label>
                <Input value={allocationForm.category} onChange={(e) => setAllocationForm({ ...allocationForm, category: e.target.value })} placeholder={t('budget.form.categoryPlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('budget.form.allocatedAmountLabel')}</Label>
                <Input type="number" value={allocationForm.allocated_amount} onChange={(e) => setAllocationForm({ ...allocationForm, allocated_amount: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>{t('budget.form.budgetNotes')}</Label>
                <Textarea value={allocationForm.notes} onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setAllocationFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                {editingAllocation ? t('budget.form.saveChanges') : t('budget.form.saveAllocation')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}