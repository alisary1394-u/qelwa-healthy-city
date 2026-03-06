import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, TrendingUp, CheckCircle, Clock, AlertCircle, Award, Target, Users, Lightbulb, BarChart3, ClipboardList, Shield, Activity, DollarSign, TrendingDown, Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import WHOStandardsReport from '@/components/reports/WHOStandardsReport';
import { AXIS_COUNTS_CSV, STANDARDS_CSV, sortAndDeduplicateStandardsByCode } from '@/api/standardsFromCsv';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';
import T from '@/components/T';

const REFERENCE_TOTAL = STANDARDS_CSV.length;

const STATUS_COLORS = {
  not_started: '#94a3b8', pending: '#94a3b8',
  in_progress: '#f59e0b', planning: '#94a3b8',
  completed: '#10b981', approved: '#059669',
  on_hold: '#6b7280', cancelled: '#ef4444',
};

const AXIS_COLORS = ['#1e3a5f','#0f766e','#92400e','#991b1b','#5b21b6','#0e7490','#312e81','#3f6212','#9a3412'];

function StatCard({ icon: Icon, label, value, sub, color = 'blue', className = '' }) {
  const colors = {
    blue: 'from-[#1e3a5f] to-[#2d5a8e]',
    green: 'from-[#0f766e] to-[#14918a]',
    amber: 'from-amber-700 to-amber-800',
    red: 'from-red-800 to-red-900',
    purple: 'from-[#5b21b6] to-[#7c3aed]',
    gray: 'from-slate-600 to-slate-700',
    teal: 'from-[#0e7490] to-[#0891b2]',
  };
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${colors[color] || colors.blue} p-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{label}</p>
              <p className="text-2xl md:text-3xl font-bold mt-1 leading-tight break-words">{value}</p>
              {sub && <p className="text-xs opacity-80 mt-1">{sub}</p>}
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        {Icon && <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center"><Icon className="w-5 h-5" /></div>}
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

function ProgressRing({ value, size = 120, strokeWidth = 10, color = '#3B82F6', label }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-bold text-foreground">{value}%</span>
      </div>
      {label && <p className="text-xs text-muted-foreground text-center">{label}</p>}
    </div>
  );
}

function AxisProgressCard({ name, order, completed, total, color }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:shadow-sm transition-shadow">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
        {order}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate"><T>{name}</T></p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{completed}/{total}</span>
        </div>
      </div>
      <Badge variant={pct >= 80 ? 'default' : pct > 0 ? 'secondary' : 'outline'} className="text-xs">{pct}%</Badge>
    </div>
  );
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === 'ar';
  const t_col = (key) => t(`reports.columns.${key}`);
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const [selectedCommittee, setSelectedCommittee] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [detailedReportType, setDetailedReportType] = useState('tasks_all');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [expandedAxis, setExpandedAxis] = useState(null);

  const { data: initiatives = [] } = useQuery({ queryKey: ['initiatives'], queryFn: () => api.entities.Initiative.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: () => api.entities.Task.list() });
  const { data: committees = [] } = useQuery({ queryKey: ['committees'], queryFn: () => api.entities.Committee.list() });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => api.entities.TeamMember.list() });
  const { data: kpis = [] } = useQuery({ queryKey: ['kpis'], queryFn: () => api.entities.InitiativeKPI.list() });
  const { data: standards = [] } = useQuery({ queryKey: ['standards'], queryFn: () => api.entities.Standard.list() });
  const { data: axes = [] } = useQuery({ queryKey: ['axes'], queryFn: () => api.entities.Axis.list('order') });
  const { data: evidence = [] } = useQuery({ queryKey: ['evidence'], queryFn: () => api.entities.Evidence.list() });
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: () => api.entities.Settings.list() });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: () => api.entities.Transaction.list('-date') });
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: () => api.entities.Budget.list('-created_date') });
  const { data: allocations = [] } = useQuery({ queryKey: ['allocations'], queryFn: () => api.entities.BudgetAllocation.list() });

  const filteredInitiatives = selectedCommittee === 'all' ? initiatives : initiatives.filter(i => i.committee_id === selectedCommittee);
  const filteredTransactions = selectedCommittee === 'all'
    ? transactions
    : transactions.filter((t) => String(t.committee_id || '') === String(selectedCommittee));
  const filteredAllocations = selectedCommittee === 'all'
    ? allocations
    : allocations.filter((a) => String(a.committee_id || '') === String(selectedCommittee));
  const filteredTasks = selectedCommittee === 'all' ? tasks : tasks.filter(t => {
    const member = members.find(m => m.id === t.assigned_to);
    return member?.committee_id === selectedCommittee;
  });

  const dedupedStandards = useMemo(() => sortAndDeduplicateStandardsByCode(standards), [standards]);

  const overallStandardsPct = useMemo(() => {
    const completed = dedupedStandards.filter(s => s.status === 'completed' || s.status === 'approved').length;
    return REFERENCE_TOTAL > 0 ? Math.round((completed / REFERENCE_TOTAL) * 100) : 0;
  }, [dedupedStandards]);

  const axisSummary = useMemo(() => axes.map((axis, idx) => {
    const order = axis.order ?? idx + 1;
    const expected = (order >= 1 && order <= AXIS_COUNTS_CSV.length) ? AXIS_COUNTS_CSV[order - 1] : 0;
    const axStd = standards.filter(s => s.axis_id === axis.id);
    const completed = axStd.filter(s => s.status === 'completed' || s.status === 'approved').length;
    return { id: axis.id, name: axis.name, order, total: expected, completed, color: AXIS_COLORS[idx % AXIS_COLORS.length] };
  }), [axes, standards]);

  const statusLabels = { not_started: t('reports.statuses.not_started'), in_progress: t('reports.statuses.in_progress'), completed: t('reports.statuses.completed'), approved: t('reports.statuses.approved'), pending: t('reports.statuses.pending'), planning: t('reports.statuses.planning'), on_hold: t('reports.statuses.on_hold'), cancelled: t('reports.statuses.cancelled') };
  const priorityLabels = { low: t('reports.priorities.low'), medium: t('reports.priorities.medium'), high: t('reports.priorities.high'), urgent: t('reports.priorities.urgent') };

  const standardsByStatus = [
    { name: t('reports.statuses.not_started'), value: standards.filter(s => s.status === 'not_started').length, color: STATUS_COLORS.not_started },
    { name: t('reports.statuses.in_progress'), value: standards.filter(s => s.status === 'in_progress').length, color: STATUS_COLORS.in_progress },
    { name: t('reports.statuses.completed'), value: standards.filter(s => s.status === 'completed').length, color: STATUS_COLORS.completed },
    { name: t('reports.statuses.approved'), value: standards.filter(s => s.status === 'approved').length, color: STATUS_COLORS.approved },
  ];

  const initiativesByStatus = [
    { name: t('reports.statuses.planningLabel'), value: filteredInitiatives.filter(i => i.status === 'planning').length, color: '#94a3b8' },
    { name: t('reports.statuses.approved'), value: filteredInitiatives.filter(i => i.status === 'approved').length, color: '#3b82f6' },
    { name: t('reports.statuses.in_progress'), value: filteredInitiatives.filter(i => i.status === 'in_progress').length, color: '#f59e0b' },
    { name: t('reports.statuses.completed'), value: filteredInitiatives.filter(i => i.status === 'completed').length, color: '#10b981' },
    { name: t('reports.statuses.on_hold'), value: filteredInitiatives.filter(i => i.status === 'on_hold').length, color: '#6b7280' },
    { name: t('reports.statuses.cancelled'), value: filteredInitiatives.filter(i => i.status === 'cancelled').length, color: '#ef4444' },
  ];

  const initiativesByCommittee = committees
    .map(c => ({
      name: c.name?.slice(0, 20) || t('reports.unspecified'),
      count: filteredInitiatives.filter(i => i.committee_id === c.id).length,
    }))
    .filter(item => item.count > 0);

  const initiativesByPriority = [
    { name: t('reports.priorities.low'), count: filteredInitiatives.filter(i => i.priority === 'low').length, color: '#94a3b8' },
    { name: t('reports.priorities.medium'), count: filteredInitiatives.filter(i => i.priority === 'medium').length, color: '#3b82f6' },
    { name: t('reports.priorities.high'), count: filteredInitiatives.filter(i => i.priority === 'high').length, color: '#f59e0b' },
    { name: t('reports.priorities.urgent'), count: filteredInitiatives.filter(i => i.priority === 'urgent').length, color: '#ef4444' },
  ];

  const tasksByStatus = [
    { name: t('reports.statuses.pending'), value: filteredTasks.filter(t => t.status === 'pending').length, color: '#94a3b8' },
    { name: t('reports.statuses.in_progress'), value: filteredTasks.filter(t => t.status === 'in_progress').length, color: '#f59e0b' },
    { name: t('reports.statuses.completedF'), value: filteredTasks.filter(t => t.status === 'completed').length, color: '#10b981' },
    { name: t('reports.statuses.cancelledF'), value: filteredTasks.filter(t => t.status === 'cancelled').length, color: '#ef4444' },
  ];

  const tasksByMember = members.slice(0, 10).map(m => ({
    name: m.full_name?.slice(0, 15) || t('reports.unspecified'),
    completed: tasks.filter(t => t.assigned_to === m.id && t.status === 'completed').length,
    pending: tasks.filter(t => t.assigned_to === m.id && t.status === 'pending').length,
    inProgress: tasks.filter(t => t.assigned_to === m.id && t.status === 'in_progress').length,
  }));

  const overdueTasks = filteredTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
  const locale = rtl ? 'ar-SA' : 'en-US';
  const currencyFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const compactCurrencyFormatter = useMemo(() => new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }), [locale]);
  const formatCurrency = (value) => `${currencyFormatter.format(Number(value) || 0)} ${t('reports.currencySymbol')}`;
  const formatCompactCurrency = (value) => `${compactCurrencyFormatter.format(Number(value) || 0)} ${t('reports.currencySymbol')}`;

  const paidIncome = filteredTransactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const paidExpenses = filteredTransactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const pendingFinancialOps = filteredTransactions.filter((t) => t.status === 'pending').length;
  const netBalance = paidIncome - paidExpenses;

  const activeBudget = budgets.find((budget) => budget.status === 'active') || budgets[0] || null;
  const activeBudgetTotal = Number(activeBudget?.total_budget) || 0;
  const activeBudgetUsagePct = activeBudgetTotal > 0 ? Math.min(100, Math.round((paidExpenses / activeBudgetTotal) * 100)) : 0;

  const expensesByCategory = useMemo(() => {
    const grouped = filteredTransactions
      .filter((t) => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => {
        const key = t.category || t('reports.otherCategory');
        acc[key] = (acc[key] || 0) + (Number(t.amount) || 0);
        return acc;
      }, {});

    return Object.entries(grouped)
      .map(([name, amount], index) => ({
        name,
        amount,
        color: AXIS_COLORS[index % AXIS_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredTransactions]);

  const monthlyCashflow = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        name: d.toLocaleDateString(rtl ? 'ar-SA' : 'en-US', { month: 'short' }),
        income: 0,
        expense: 0,
      };
    });

    const indexByKey = new Map(months.map((m, index) => [m.key, index]));
    filteredTransactions.forEach((t) => {
      if (t.status !== 'paid' || !t.date) return;
      const date = new Date(t.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const idx = indexByKey.get(key);
      if (idx == null) return;
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') months[idx].income += amount;
      if (t.type === 'expense') months[idx].expense += amount;
    });

    return months;
  }, [filteredTransactions]);

  const allocationsByCommittee = useMemo(() => {
    const grouped = filteredAllocations.reduce((acc, a) => {
      const name = a.committee_name || committees.find((c) => String(c.id) === String(a.committee_id))?.name || t('reports.unspecified');
      acc[name] = (acc[name] || 0) + (Number(a.allocated_amount) || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, amount], index) => ({
        name,
        amount,
        color: AXIS_COLORS[index % AXIS_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredAllocations, committees]);

  const topExpenses = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'expense' && t.status === 'paid')
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 5);
  }, [filteredTransactions]);

  const getTaskCommitteeName = (t) => { const m = members.find(m2 => m2.id === t.assigned_to); return committees.find(c => c.id === m?.committee_id)?.name || ''; };
  const getTaskInitiativeTitle = (t) => initiatives.find(i => i.id === t.initiative_id)?.title || '';
  const getMemberCommitteeName = (m) => committees.find(c => c.id === m.committee_id)?.name || '';
  const getKpiInitiativeTitle = (k) => initiatives.find(i => i.id === k.initiative_id)?.title || '';

  const detailedReportConfig = [
    { value: 'tasks_all', label: t('reports.detailedConfig.tasks_all'), getData: () => filteredTasks.map(t => ({ [t_col('title')]: t.title, [t_col('status')]: statusLabels[t.status] || t.status, [t_col('priority')]: priorityLabels[t.priority] || t.priority, [t_col('dueDate')]: t.due_date || '—', [t_col('assignee')]: t.assigned_to_name || '—', [t_col('committee')]: getTaskCommitteeName(t), [t_col('initiative')]: getTaskInitiativeTitle(t) })) },
    { value: 'tasks_completed', label: t('reports.detailedConfig.tasks_completed'), getData: () => filteredTasks.filter(t => t.status === 'completed').map(t => ({ [t_col('title')]: t.title, [t_col('priority')]: priorityLabels[t.priority] || t.priority, [t_col('dueDate')]: t.due_date || '—', [t_col('assignee')]: t.assigned_to_name || '—', [t_col('committee')]: getTaskCommitteeName(t) })) },
    { value: 'tasks_overdue', label: t('reports.detailedConfig.tasks_overdue'), getData: () => overdueTasks.map(t => ({ [t_col('title')]: t.title, [t_col('status')]: statusLabels[t.status] || t.status, [t_col('dueDate')]: t.due_date, [t_col('assignee')]: t.assigned_to_name || '—', [t_col('committee')]: getTaskCommitteeName(t) })) },
    { value: 'initiatives_all', label: t('reports.detailedConfig.initiatives_all'), getData: () => filteredInitiatives.map(i => ({ [t_col('title')]: i.title, [t_col('committee')]: i.committee_name || '—', [t_col('status')]: statusLabels[i.status] || i.status, [t_col('completionPct')]: i.progress_percentage ?? '—', [t_col('startDate')]: i.start_date || '—', [t_col('endDate')]: i.end_date || '—' })) },
    { value: 'team', label: t('reports.detailedConfig.team'), getData: () => members.map(m => ({ [t_col('name')]: m.full_name || '—', [t_col('position')]: m.role || '—', [t_col('committee')]: getMemberCommitteeName(m), [t_col('department')]: m.department || '—', [t_col('email')]: m.email || '—', [t_col('phone')]: m.phone || '—' })) },
    { value: 'standards', label: t('reports.detailedConfig.standards'), getData: () => dedupedStandards.map(s => ({ [t_col('code')]: s.code || '—', [t_col('title')]: s.title || '—', [t_col('axis')]: s.axis_name || '—', [t_col('status')]: statusLabels[s.status] || s.status })) },
    { value: 'kpis', label: t('reports.detailedConfig.kpis'), getData: () => kpis.map(k => ({ [t_col('indicator')]: k.kpi_name || '—', [t_col('initiative')]: getKpiInitiativeTitle(k), [t_col('currentValue')]: k.current_value, [t_col('target')]: k.target_value, [t_col('unit')]: k.unit || '—', [t_col('completionPct')]: k.target_value > 0 ? Math.round((k.current_value / k.target_value) * 100) : 0 })) },
    { value: 'budget_overview', label: t('reports.detailedConfig.budget_overview'), getData: () => [{ [t_col('activeBudgetName')]: activeBudget?.name || '—', [t_col('fiscalYear')]: activeBudget?.fiscal_year || '—', [t_col('paidRevenue')]: paidIncome, [t_col('paidExpenses')]: paidExpenses, [t_col('netBalance')]: netBalance, [t_col('pendingOps')]: pendingFinancialOps, [t_col('totalBudget')]: activeBudgetTotal, [t_col('spendingPct')]: activeBudgetUsagePct }] },
    { value: 'budget_transactions', label: t('reports.detailedConfig.budget_transactions'), getData: () => filteredTransactions.map(tx => ({ [t_col('date')]: tx.date || '—', [t_col('type')]: tx.type === 'income' ? t('reports.transactionTypes.income') : t('reports.transactionTypes.expense'), [t_col('category')]: tx.category || '—', [t_col('value')]: Number(tx.amount) || 0, [t_col('status')]: tx.status === 'paid' ? t('reports.transactionStatuses.paid') : tx.status === 'pending' ? t('reports.transactionStatuses.pending') : tx.status === 'rejected' ? t('reports.transactionStatuses.rejected') : (tx.status || '—'), [t_col('committee')]: tx.committee_name || committees.find(c => String(c.id) === String(tx.committee_id))?.name || '—', [t_col('beneficiary')]: tx.beneficiary || '—', [t_col('receiptRef')]: tx.receipt_number || '—' })) },
    { value: 'budget_allocations', label: t('reports.detailedConfig.budget_allocations'), getData: () => filteredAllocations.map(a => ({ [t_col('budget')]: a.budget_name || budgets.find(b => String(b.id) === String(a.budget_id))?.name || '—', [t_col('committee')]: a.committee_name || committees.find(c => String(c.id) === String(a.committee_id))?.name || '—', [t_col('classification')]: a.category || '—', [t_col('allocatedAmount')]: Number(a.allocated_amount) || 0, [t_col('remainingAmount')]: Number(a.remaining_amount) || 0, [t_col('initiative')]: a.initiative_title || initiatives.find(i => String(i.id) === String(a.initiative_id))?.title || '—' })) },
  ];

  const currentDetailedData = (() => { const c = detailedReportConfig.find(c2 => c2.value === detailedReportType); return c ? c.getData() : []; })();
  const detailedReportFilename = (() => { const c = detailedReportConfig.find(c2 => c2.value === detailedReportType); return c ? c.label.replace(/\s*[(（].*?[)）]\s*/g, '').trim() : t('reports.report'); })();

  const exportToCSV = (data, filename) => {
    try {
      if (!Array.isArray(data) || data.length === 0) { toast({ title: t('reports.noDataToExport') }); return; }
      const headers = Object.keys(data[0]);
      const esc = (v) => { const s = String(v ?? ''); return /[,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      const csv = '\ufeff' + [headers.map(esc).join(','), ...data.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 200);
      toast({ title: t('reports.exportSuccess'), description: `${filename}.csv` });
    } catch (e) { toast({ title: t('reports.exportFailed'), description: e?.message, variant: 'destructive' }); }
  };

  const tabExportIds = {
    overview: { id: 'reports-overview', filename: `${t('reports.filenames.overview')}.pdf` },
    standards: { id: 'reports-standards', filename: `${t('reports.filenames.standards')}.pdf` },
    initiatives: { id: 'reports-initiatives', filename: `${t('reports.filenames.initiatives')}.pdf` },
    tasks: { id: 'reports-tasks', filename: `${t('reports.filenames.tasks')}.pdf` },
    budget: { id: 'reports-budget', filename: `${t('reports.filenames.budget')}.pdf` },
    detailed: { id: 'detailed-report-content', filename: `${t('reports.filenames.detailed')}-${detailedReportFilename}.pdf` },
  };

  const exportToPDF = async (elementId, filename) => {
    setExportingPDF(true);
    let restore = [];
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const element = document.getElementById(elementId);
      if (!element) { toast({ title: t('reports.exportFailed'), description: t('reports.elementNotFound'), variant: 'destructive' }); return; }
      let el = element;
      while (el && el !== document.body) {
        restore.push({ el, display: el.style.display, visibility: el.style.visibility, hidden: el.getAttribute('hidden') });
        el.style.display = 'block'; el.style.visibility = 'visible';
        if (el.getAttribute('hidden') != null) el.removeAttribute('hidden');
        el = el.parentElement;
      }
      element.scrollIntoView({ behavior: 'instant', block: 'start' });
      await new Promise(r => setTimeout(r, 150));
      const cw = Math.max(element.scrollWidth || 800, 800), ch = Math.max(element.scrollHeight || 600, 600);
      const px = cw * ch, sc = px > 14e6 ? 1 : px > 8e6 ? 1.35 : 2;
      const canvas = await html2canvas(element, {
        scale: sc, useCORS: true, logging: false, windowWidth: cw, windowHeight: ch,
        onclone: (doc) => {
          const clonedElement = doc.getElementById(elementId);
          if (!clonedElement) return;
          clonedElement.querySelectorAll('[class*="gradient"]').forEach(e => { e.style.background = '#2563eb'; e.style.backgroundImage = 'none'; });
        },
      });
      if (!canvas.width || !canvas.height) { toast({ title: t('reports.failed'), description: t('reports.contentEmpty'), variant: 'destructive' }); return; }
      let imgSrc; let imgType = 'JPEG';
      try { const j = canvas.toDataURL('image/jpeg', 0.86); if (j?.startsWith('data:image/')) imgSrc = j; } catch {}
      if (!imgSrc) { try { const p = canvas.toDataURL('image/png'); if (p?.startsWith('data:image/')) { imgSrc = p; imgType = 'PNG'; } } catch {} }
      if (!imgSrc) { imgSrc = canvas; imgType = 'PNG'; }
      const pdf = new jsPDF('p', 'mm', 'a4');
      const iw = 210, ph = 295, ih = (canvas.height * iw) / canvas.width;
      let hl = ih, pos = 0;
      pdf.addImage(imgSrc, imgType, 0, pos, iw, ih); hl -= ph;
      while (hl >= 0) { pos = hl - ih; pdf.addPage(); pdf.addImage(imgSrc, imgType, 0, pos, iw, ih); hl -= ph; }
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 200);
      toast({ title: t('reports.exportSuccess'), description: filename });
    } catch (e) { toast({ title: t('reports.failed'), description: e?.message, variant: 'destructive' }); }
    finally {
      restore.forEach(({ el: e, display, visibility, hidden }) => { e.style.display = display; e.style.visibility = visibility; if (hidden != null) e.setAttribute('hidden', hidden); });
      setExportingPDF(false);
    }
  };

  const completedTasksPct = filteredTasks.length > 0 ? Math.round((filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100) : 0;
  const completedInitPct = filteredInitiatives.length > 0 ? Math.round((filteredInitiatives.filter(i => i.status === 'completed').length / filteredInitiatives.length) * 100) : 0;

  if (!permissions?.canSeeReports) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
        <Card className="max-w-md"><CardContent className="p-6 text-center">
          <Shield className="w-12 h-12 mx-auto text-red-400 mb-3" />
          <p className="text-red-600 font-semibold">{t('reports.noAccess')}</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-800" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-700 via-blue-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <BarChart3 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{t('reports.title')}</h1>
                <p className="text-blue-100 text-sm mt-1"><T>{t('reports.citySubtitle', { city: settings[0]?.city_name || t('layout.defaultCity') })}</T></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                <SelectTrigger className="w-[180px] bg-white/15 border-white/30 text-white">
                  <SelectValue placeholder={t('reports.allCommittees')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('reports.allCommittees')}</SelectItem>
                  {committees.map(c => <SelectItem key={c.id} value={c.id}><T>{c.name}</T></SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => { const te = tabExportIds[activeTab]; if (te) exportToPDF(te.id, te.filename); }} disabled={exportingPDF} variant="secondary" size="sm">
                <Download className="w-4 h-4 ms-1" />
                {exportingPDF ? t('reports.exporting') : t('reports.exportPDF')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 gap-1 mb-6 bg-card border border-border shadow-sm rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg">{t('reports.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="standards" className="rounded-lg">{t('reports.tabs.standards')}</TabsTrigger>
            <TabsTrigger value="initiatives" className="rounded-lg">{t('reports.tabs.initiatives')}</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg">{t('reports.tabs.tasks')}</TabsTrigger>
            <TabsTrigger value="budget" className="rounded-lg">{t('reports.tabs.budget')}</TabsTrigger>
            <TabsTrigger value="detailed" className="rounded-lg">{t('reports.tabs.detailed')}</TabsTrigger>
          </TabsList>

          {/* ==================== OVERVIEW ==================== */}
          <TabsContent value="overview">
            <div id="reports-overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Target} label={t('reports.stats.internationalStandards')} value={REFERENCE_TOTAL} sub={t('reports.completedPct', { pct: overallStandardsPct })} color="blue" />
                <StatCard icon={Lightbulb} label={t('reports.stats.initiatives')} value={filteredInitiatives.length} sub={t('reports.completedCount', { count: filteredInitiatives.filter(i => i.status === 'completed').length })} color="purple" />
                <StatCard icon={ClipboardList} label={t('reports.stats.tasks')} value={filteredTasks.length} sub={t('reports.completedCount', { count: filteredTasks.filter(t => t.status === 'completed').length })} color="green" />
                <StatCard icon={Users} label={t('reports.stats.team')} value={members.filter(m => m.status === 'active').length} sub={t('reports.committeeCount', { count: committees.length })} color="teal" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress Rings */}
                <Card className="col-span-1">
                  <CardHeader><CardTitle className="text-lg">{t('reports.overview.completionRates')}</CardTitle></CardHeader>
                  <CardContent className="flex justify-around items-center py-6">
                    <div className="relative"><ProgressRing value={overallStandardsPct} color="#3B82F6" /><p className="text-xs text-center text-muted-foreground mt-2">{t('reports.tabs.standards')}</p></div>
                    <div className="relative"><ProgressRing value={completedInitPct} color="#8B5CF6" /><p className="text-xs text-center text-muted-foreground mt-2">{t('reports.tabs.initiatives')}</p></div>
                    <div className="relative"><ProgressRing value={completedTasksPct} color="#10B981" /><p className="text-xs text-center text-muted-foreground mt-2">{t('reports.tabs.tasks')}</p></div>
                  </CardContent>
                </Card>

                {/* Initiatives by Status */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.overview.initiativesByStatus')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={initiativesByStatus.filter(i => i.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {initiativesByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tasks by Status */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.overview.tasksByStatus')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={tasksByStatus.filter(t => t.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {tasksByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Overdue Tasks Alert */}
              {overdueTasks.length > 0 && (
                <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-red-700 dark:text-red-300 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {t('reports.overview.overdueTasks')} ({overdueTasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {overdueTasks.slice(0, 5).map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-red-100 dark:border-red-900/40">
                          <span className="text-sm font-medium truncate flex-1"><T>{t.title}</T></span>
                          <Badge variant="destructive" className="text-xs ms-2">{t.due_date}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ==================== STANDARDS ==================== */}
          <TabsContent value="standards">
            <div id="reports-standards" className="space-y-6">
              <SectionHeader icon={Target} title={t('reports.standardsReport.title')} description={t('reports.standardsCount', { count: REFERENCE_TOTAL })}>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(dedupedStandards.map(s => ({ [t_col('code')]: s.code, [t_col('title')]: s.title, [t_col('axis')]: s.axis_name, [t_col('status')]: statusLabels[s.status] || s.status })), t('reports.detailedConfig.standards'))}>
                  <Download className="w-4 h-4 ms-1" /> CSV
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => exportToPDF('who-report', `${t('reports.filenames.whoStandards')}.pdf`)} disabled={exportingPDF}>
                  <Award className="w-4 h-4 ms-1" /> {t('reports.standardsReport.whoReport')}
                </Button>
              </SectionHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Target} label={t('reports.standardsReport.totalStandards')} value={REFERENCE_TOTAL} color="blue" />
                <StatCard icon={CheckCircle} label={t('reports.standardsReport.completedApproved')} value={standards.filter(s => s.status === 'completed' || s.status === 'approved').length} color="green" />
                <StatCard icon={Clock} label={t('reports.standardsReport.inProgress')} value={standards.filter(s => s.status === 'in_progress').length} color="amber" />
                <StatCard icon={TrendingUp} label={t('reports.standardsReport.completionRate')} value={`${overallStandardsPct}%`} color="purple" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.standardsReport.statusDistribution')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={standardsByStatus.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {standardsByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.standardsReport.byAxis')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={axisSummary} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} unit="%" />
                        <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="completed" fill="#10b981" name={t('reports.statuses.completed')} radius={[0, 4, 4, 0]}>
                          {axisSummary.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Axis Progress List */}
              <Card>
                <CardHeader><CardTitle className="text-lg">{t('reports.standardsReport.axisDetails')}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {axisSummary.map(a => (
                    <AxisProgressCard key={a.id} name={a.name} order={a.order} completed={a.completed} total={a.total} color={a.color} />
                  ))}
                </CardContent>
              </Card>

              <div className="hidden">
                <WHOStandardsReport standards={standards} axes={axes} evidence={evidence} settings={settings[0]} />
              </div>
            </div>
          </TabsContent>

          {/* ==================== INITIATIVES ==================== */}
          <TabsContent value="initiatives">
            <div id="reports-initiatives" className="space-y-6">
              <SectionHeader icon={Lightbulb} title={t('reports.initiativesReport.title')} description={t('reports.initiativeCount', { count: filteredInitiatives.length })}>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredInitiatives.map(i => ({ [t_col('title')]: i.title, [t_col('committee')]: i.committee_name, [t_col('status')]: statusLabels[i.status] || i.status, [t_col('completionPct')]: i.progress_percentage })), t('reports.tabs.initiatives'))}>
                  <Download className="w-4 h-4 ms-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('reports-initiatives', `${t('reports.filenames.initiatives')}.pdf`)} disabled={exportingPDF}>
                  <Download className="w-4 h-4 ms-1" /> PDF
                </Button>
              </SectionHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Lightbulb} label={t('reports.initiativesReport.totalInitiatives')} value={filteredInitiatives.length} color="purple" />
                <StatCard icon={CheckCircle} label={t('reports.initiativesReport.completedF')} value={filteredInitiatives.filter(i => i.status === 'completed').length} color="green" />
                <StatCard icon={Activity} label={t('reports.initiativesReport.inProgress')} value={filteredInitiatives.filter(i => i.status === 'in_progress').length} color="amber" />
                <StatCard icon={TrendingUp} label={t('reports.initiativesReport.completionRate')} value={`${completedInitPct}%`} color="blue" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.initiativesReport.byCommittee')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={initiativesByCommittee}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis /><Tooltip />
                        <Bar dataKey="count" fill="#8B5CF6" name={t('reports.initiativesReport.initiativeCount')} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.initiativesReport.initiativesByPriority')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={initiativesByPriority}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name={t('reports.initiativesReport.initiativeCount')} radius={[4, 4, 0, 0]}>
                          {initiativesByPriority.map((item, index) => (
                            <Cell key={`init-priority-${index}`} fill={item.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ==================== TASKS ==================== */}
          <TabsContent value="tasks">
            <div id="reports-tasks" className="space-y-6">
              <SectionHeader icon={ClipboardList} title={t('reports.tasksReport.title')} description={t('reports.taskCount', { count: filteredTasks.length })}>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredTasks.map(tk => ({ [t_col('title')]: tk.title, [t_col('assignee')]: tk.assigned_to_name, [t_col('status')]: statusLabels[tk.status] || tk.status, [t_col('priority')]: priorityLabels[tk.priority] || tk.priority, [t_col('dueDate')]: tk.due_date || '' })), t('reports.tabs.tasks'))}>
                  <Download className="w-4 h-4 ms-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('reports-tasks', `${t('reports.filenames.tasks')}.pdf`)} disabled={exportingPDF}>
                  <Download className="w-4 h-4 ms-1" /> PDF
                </Button>
              </SectionHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={ClipboardList} label={t('reports.tasksReport.totalTasks')} value={filteredTasks.length} color="blue" />
                <StatCard icon={CheckCircle} label={t('reports.tasksReport.completedF')} value={filteredTasks.filter(t => t.status === 'completed').length} color="green" />
                <StatCard icon={AlertCircle} label={t('reports.tasksReport.overdue')} value={overdueTasks.length} color="red" />
                <StatCard icon={TrendingUp} label={t('reports.tasksReport.completionRate')} value={`${completedTasksPct}%`} color="teal" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.tasksReport.tasksByPriority')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={[
                        { name: t('reports.priorities.low'), value: filteredTasks.filter(t => t.priority === 'low').length, fill: '#94a3b8' },
                        { name: t('reports.priorities.medium'), value: filteredTasks.filter(t => t.priority === 'medium').length, fill: '#3b82f6' },
                        { name: t('reports.priorities.high'), value: filteredTasks.filter(t => t.priority === 'high').length, fill: '#f59e0b' },
                        { name: t('reports.priorities.urgent'), value: filteredTasks.filter(t => t.priority === 'urgent').length, fill: '#ef4444' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" /><YAxis /><Tooltip />
                        <Bar dataKey="value" name={t('reports.tasksReport.taskCount')} radius={[4, 4, 0, 0]}>
                          {[{ fill: '#94a3b8' }, { fill: '#3b82f6' }, { fill: '#f59e0b' }, { fill: '#ef4444' }].map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.tasksReport.memberPerformance')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={tasksByMember.filter(m => m.completed + m.inProgress + m.pending > 0)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                        <Bar dataKey="completed" fill="#10b981" name={t('reports.tasksReport.completedF')} stackId="a" />
                        <Bar dataKey="inProgress" fill="#f59e0b" name={t('reports.tasksReport.inProgressF')} stackId="a" />
                        <Bar dataKey="pending" fill="#94a3b8" name={t('reports.tasksReport.pendingF')} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ==================== BUDGET ==================== */}
          <TabsContent value="budget">
            <div id="reports-budget" className="space-y-6">
              <SectionHeader icon={DollarSign} title={t('reports.budgetReport.title')} description={t('reports.budgetReport.description')}>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredTransactions.map(tx => ({ [t_col('date')]: tx.date || '—', [t_col('type')]: tx.type === 'income' ? t('reports.transactionTypes.income') : t('reports.transactionTypes.expense'), [t_col('category')]: tx.category || '—', [t_col('value')]: Number(tx.amount) || 0, [t_col('status')]: tx.status === 'paid' ? t('reports.transactionStatuses.paid') : tx.status === 'pending' ? t('reports.transactionStatuses.pending') : tx.status === 'rejected' ? t('reports.transactionStatuses.rejected') : (tx.status || '—'), [t_col('committee')]: tx.committee_name || committees.find(c => String(c.id) === String(tx.committee_id))?.name || '—', [t_col('beneficiary')]: tx.beneficiary || '—', [t_col('description')]: tx.description || '—' })), t('reports.detailedConfig.budget_transactions'))}>
                  <Download className="w-4 h-4 ms-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('reports-budget', `${t('reports.filenames.budget')}.pdf`)} disabled={exportingPDF}>
                  <Download className="w-4 h-4 ms-1" /> PDF
                </Button>
              </SectionHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={TrendingUp} label={t('reports.budgetReport.paidRevenue')} value={formatCompactCurrency(paidIncome)} sub={formatCurrency(paidIncome)} color="green" />
                <StatCard icon={TrendingDown} label={t('reports.budgetReport.paidExpenses')} value={formatCompactCurrency(paidExpenses)} sub={formatCurrency(paidExpenses)} color="red" />
                <StatCard icon={Wallet} label={t('reports.budgetReport.netBalance')} value={formatCompactCurrency(netBalance)} sub={formatCurrency(netBalance)} color={netBalance >= 0 ? 'blue' : 'amber'} />
                <StatCard icon={Clock} label={t('reports.budgetReport.pendingOps')} value={pendingFinancialOps} color="gray" />
              </div>

              <Card className="border-emerald-100 dark:border-emerald-900/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between gap-2">
                    <span>{t('reports.budgetReport.activeBudgetStatus')}</span>
                    <Badge variant="secondary">{activeBudget?.name || t('reports.budgetReport.noActiveBudget')}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-lg border bg-card"><span className="text-muted-foreground">{t('reports.budgetReport.fiscalYear')}</span> <span className="font-semibold">{activeBudget?.fiscal_year || '—'}</span></div>
                    <div className="p-3 rounded-lg border bg-card"><span className="text-muted-foreground">{t('reports.budgetReport.totalBudget')}</span> <span className="font-semibold">{formatCurrency(activeBudgetTotal)}</span></div>
                    <div className="p-3 rounded-lg border bg-card"><span className="text-muted-foreground">{t('reports.budgetReport.spendingRate')}</span> <span className="font-semibold">{activeBudgetUsagePct}%</span></div>
                  </div>
                  <Progress value={activeBudgetUsagePct} className="h-3" />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.budgetReport.expensesByCategory')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={expensesByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Bar dataKey="amount" name={t('reports.budgetReport.totalExpense')} radius={[4, 4, 0, 0]}>
                          {expensesByCategory.map((item, index) => (
                            <Cell key={`expense-cat-${index}`} fill={item.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">{t('reports.budgetReport.cashFlow')}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyCashflow}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(v) => formatCurrency(v)} />
                        <Legend />
                        <Bar dataKey="income" fill="#10b981" name={t('reports.budgetReport.incomeLabel')} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#ef4444" name={t('reports.budgetReport.expensesLabel')} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-lg">{t('reports.budgetReport.topExpenses')}</CardTitle></CardHeader>
                <CardContent>
                  {topExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{t('reports.budgetReport.noExpenses')}</p>
                  ) : (
                    <div className="space-y-2">
                      {topExpenses.map((te) => (
                        <div key={te.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="min-w-0">
                            <p className="font-medium truncate"><T>{te.description || te.category || t('reports.budgetReport.expense')}</T></p>
                            <p className="text-xs text-muted-foreground">{te.date || '—'} • <T>{te.committee_name || committees.find(c => String(c.id) === String(te.committee_id))?.name || t('reports.unspecified')}</T></p>
                          </div>
                          <Badge variant="destructive">{formatCurrency(te.amount)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg">{t('reports.budgetReport.allocationByCommittee')}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={allocationsByCommittee} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="amount" name={t('reports.budgetReport.allocatedAmount')} radius={[0, 4, 4, 0]}>
                        {allocationsByCommittee.map((item, index) => (
                          <Cell key={`alloc-committee-${index}`} fill={item.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== DETAILED ==================== */}
          <TabsContent value="detailed">
            <div id="detailed-report-content" className="space-y-6">
              <SectionHeader icon={FileText} title={t('reports.detailedReport.title')} description={t('reports.detailedReport.description')}>
                <Select value={detailedReportType} onValueChange={setDetailedReportType}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('reports.detailedReport.reportType')} /></SelectTrigger>
                  <SelectContent>
                    {detailedReportConfig.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(currentDetailedData, detailedReportFilename)} disabled={currentDetailedData.length === 0}>
                  <Download className="w-4 h-4 ms-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF('detailed-report-content', `${t('reports.filenames.report')}-${detailedReportFilename}.pdf`)} disabled={exportingPDF || currentDetailedData.length === 0}>
                  <Download className="w-4 h-4 ms-1" /> PDF
                </Button>
              </SectionHeader>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{detailedReportConfig.find(c => c.value === detailedReportType)?.label}</CardTitle>
                    <Badge variant="secondary">{currentDetailedData.length} {t('reports.detailedReport.record')}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {currentDetailedData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{t('reports.detailedReport.noData')}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            {Object.keys(currentDetailedData[0]).map(key => (
                              <TableHead key={key} className="whitespace-nowrap text-start font-bold text-foreground">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentDetailedData.map((row, idx) => (
                            <TableRow key={idx} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                              {Object.keys(currentDetailedData[0]).map(key => (
                                <TableCell key={key} className="text-start max-w-[280px] break-words">{String(row[key] ?? '—')}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
