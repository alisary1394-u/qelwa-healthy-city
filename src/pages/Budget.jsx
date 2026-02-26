import React, { useState } from 'react';
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
import { Plus, DollarSign, TrendingUp, TrendingDown, Search, FileText, CheckCircle, Clock, Download, Upload, Loader2, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from '@/hooks/usePermissions';

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
    notes: ''
  });

  const [allocationForm, setAllocationForm] = useState({
    budget_id: '',
    budget_name: '',
    committee_id: '',
    committee_name: '',
    axis_id: '',
    axis_name: '',
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

  const { data: committees = [] } = useQuery({
    queryKey: ['committees'],
    queryFn: () => api.entities.Committee.list()
  });

  const { data: axes = [] } = useQuery({
    queryKey: ['axes'],
    queryFn: () => api.entities.Axis.list()
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
  const showBudgetManagement = canManageBudget && memberRole !== 'accountant';

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

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchQuery || 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.beneficiary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.transaction_number?.includes(searchQuery);
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

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
      notes: ''
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
      category: '',
      allocated_amount: 0,
      notes: ''
    });
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const transactionNumber = `T${Date.now().toString().slice(-6)}`;
    await createTransactionMutation.mutateAsync({
      ...transactionForm,
      transaction_number: transactionNumber,
      status: 'pending'
    });
    
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
          notes: budgetForm.notes
        }
      });
    } else {
      await createBudgetMutation.mutateAsync({
        ...budgetForm,
        allocated_budget: 0,
        spent_amount: 0,
        remaining_budget: budgetForm.total_budget,
        status: 'draft'
      });
    }
    setSaving(false);
  };

  const openBudgetForm = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setBudgetForm({
        name: budget.name || '',
        fiscal_year: budget.fiscal_year || new Date().getFullYear().toString(),
        start_date: budget.start_date || '',
        end_date: budget.end_date || '',
        total_budget: budget.total_budget ?? 0,
        description: budget.description || '',
        notes: budget.notes || ''
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
    setSaving(true);
    
    const budget = budgets.find(b => b.id === allocationForm.budget_id);
    await createAllocationMutation.mutateAsync({
      ...allocationForm,
      budget_name: budget?.name,
      spent_amount: 0,
      remaining_amount: allocationForm.allocated_amount,
      percentage_spent: 0,
      status: 'active'
    });
    
    setSaving(false);
  };

  const handleApproveTransaction = async (transaction) => {
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
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const result = await api.integrations.Core.UploadFile({ file });
    setTransactionForm({ ...transactionForm, attachment_url: result.file_url });
    setUploadingFile(false);
  };

  if (!canViewFinancials) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 font-semibold">غير مصرح لك بالوصول إلى صفحة الميزانية. صلاحيات العرض والمالية مرتبطة بمنصبك في الفريق.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="bg-gradient-to-l from-green-600 to-blue-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">إدارة الميزانية والحسابات</h1>
          <p className="text-green-100">نظام محاسبي متكامل لإدارة المصروفات والإيرادات</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">إجمالي الإيرادات</p>
                  <p className="text-3xl font-bold">{totalIncome.toLocaleString()}</p>
                  <p className="text-sm text-blue-100 mt-1">ريال سعودي</p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm mb-1">إجمالي المصروفات</p>
                  <p className="text-3xl font-bold">{totalExpenses.toLocaleString()}</p>
                  <p className="text-sm text-red-100 mt-1">ريال سعودي</p>
                </div>
                <TrendingDown className="w-12 h-12 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${balance >= 0 ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600'} text-white`}>
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

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm mb-1">معاملات معلقة</p>
                  <p className="text-3xl font-bold">{pendingTransactions}</p>
                  <p className="text-sm text-yellow-100 mt-1">بانتظار الاعتماد</p>
                </div>
                <Clock className="w-12 h-12 text-yellow-200" />
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">إجمالي الميزانية</p>
                  <p className="text-2xl font-bold text-blue-600">{activeBudget.total_budget?.toLocaleString()} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">المبلغ المنفق</p>
                  <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">المتبقي</p>
                  <p className="text-2xl font-bold text-green-600">{(activeBudget.total_budget - totalExpenses).toLocaleString()} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">نسبة الإنفاق</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {((totalExpenses / activeBudget.total_budget) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      (totalExpenses / activeBudget.total_budget) * 100 > 90 ? 'bg-red-600' :
                      (totalExpenses / activeBudget.total_budget) * 100 > 75 ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}
                    style={{ width: `${Math.min((totalExpenses / activeBudget.total_budget) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="transactions">المعاملات المالية</TabsTrigger>
            <TabsTrigger value="budgets">الميزانيات</TabsTrigger>
            <TabsTrigger value="allocations">التخصيصات</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                <Button onClick={() => setTransactionFormOpen(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-5 h-5 ml-2" />
                  معاملة جديدة
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {filteredTransactions.map(transaction => (
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
                            transaction.status === 'approved' ? 'bg-blue-600' :
                            transaction.status === 'pending' ? 'bg-yellow-600' :
                            'bg-red-600'
                          }>
                            {transaction.status === 'paid' ? 'مدفوعة' :
                             transaction.status === 'approved' ? 'معتمدة' :
                             transaction.status === 'pending' ? 'معلقة' : 'مرفوضة'}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{transaction.description}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
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
                      {transaction.status === 'pending' && canApproveTransactions && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveTransaction(transaction)}
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          اعتماد
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div>
            {showBudgetManagement && (
              <div className="flex justify-end mb-6">
                <Button onClick={() => openBudgetForm()} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-5 h-5 ml-2" />
                  ميزانية جديدة
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.map(budget => (
                <Card key={budget.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{budget.name}</h3>
                        <p className="text-sm text-gray-500">{budget.fiscal_year}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {showBudgetManagement && (
                          <Button variant="outline" size="icon" onClick={() => openBudgetForm(budget)} title="تعديل الميزانية">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge className={budget.status === 'active' ? 'bg-green-600' : budget.status === 'draft' ? 'bg-gray-600' : 'bg-red-600'}>
                          {budget.status === 'active' ? 'نشطة' : budget.status === 'draft' ? 'مسودة' : 'مغلقة'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">إجمالي الميزانية:</span>
                        <strong className="text-blue-600">{budget.total_budget?.toLocaleString()} ريال</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">الفترة:</span>
                        <strong>{budget.start_date} - {budget.end_date}</strong>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Allocations Tab */}
        {activeTab === 'allocations' && (
          <div>
            {showBudgetManagement && (
              <div className="flex justify-end mb-6">
                <Button onClick={() => setAllocationFormOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-5 h-5 ml-2" />
                  تخصيص جديد
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allocations.map(allocation => (
                <Card key={allocation.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{allocation.committee_name || allocation.axis_name}</h3>
                        <p className="text-sm text-gray-500">{allocation.category}</p>
                      </div>
                      <Badge className={allocation.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                        {allocation.status === 'active' ? 'نشط' : 'منتهي'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">المبلغ المخصص:</span>
                        <strong>{allocation.allocated_amount?.toLocaleString()} ريال</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">المنفق:</span>
                        <strong className="text-red-600">{allocation.spent_amount?.toLocaleString()} ريال</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">المتبقي:</span>
                        <strong className="text-green-600">{allocation.remaining_amount?.toLocaleString()} ريال</strong>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${allocation.percentage_spent || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center">{allocation.percentage_spent?.toFixed(1)}% منفق</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Form Dialog */}
      <Dialog open={transactionFormOpen} onOpenChange={setTransactionFormOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاملة مالية جديدة</DialogTitle>
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
                <Label>اللجنة</Label>
                <Select value={transactionForm.committee_id} onValueChange={(v) => {
                  const committee = committees.find(c => c.id === v);
                  setTransactionForm({ ...transactionForm, committee_id: v, committee_name: committee?.name });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر اللجنة" /></SelectTrigger>
                  <SelectContent>
                    {committees.map(committee => (
                      <SelectItem key={committee.id} value={committee.id}>{committee.name}</SelectItem>
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
                حفظ المعاملة
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
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeBudgetForm}>إلغاء</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                {editingBudget ? 'حفظ التعديلات' : 'حفظ الميزانية'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}

      {/* Allocation Form Dialog */}
      <Dialog open={allocationFormOpen} onOpenChange={setAllocationFormOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تخصيص ميزانية جديد</DialogTitle>
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
                <Label>اللجنة</Label>
                <Select value={allocationForm.committee_id} onValueChange={(v) => {
                  const committee = committees.find(c => c.id === v);
                  setAllocationForm({ ...allocationForm, committee_id: v, committee_name: committee?.name });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر اللجنة" /></SelectTrigger>
                  <SelectContent>
                    {committees.map(committee => (
                      <SelectItem key={committee.id} value={committee.id}>{committee.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المحور</Label>
                <Select value={allocationForm.axis_id} onValueChange={(v) => {
                  const axis = axes.find(a => a.id === v);
                  setAllocationForm({ ...allocationForm, axis_id: v, axis_name: axis?.name });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر المحور" /></SelectTrigger>
                  <SelectContent>
                    {axes.map(axis => (
                      <SelectItem key={axis.id} value={axis.id}>{axis.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Input value={allocationForm.category} onChange={(e) => setAllocationForm({ ...allocationForm, category: e.target.value })} />
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
                حفظ التخصيص
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}