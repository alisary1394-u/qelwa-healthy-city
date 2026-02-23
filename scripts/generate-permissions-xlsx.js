/**
 * يولد ملف صلاحيات-المناصب.xlsx من بيانات الصلاحيات.
 * التشغيل: node scripts/generate-permissions-xlsx.js
 */
import XLSX from 'xlsx';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const PERMISSION_KEYS = [
  'canManageSettings', 'canManageTeam', 'canAddTeamMember', 'canEditTeamMember', 'canDeleteTeamMember',
  'canAddOrEditGovernor', 'canAddOrEditCoordinator', 'canManageCommittees', 'canManageStandards', 'canApproveEvidence',
  'canManageBudget', 'canApproveTransactions', 'canCreateTransactions', 'canViewFinancials', 'canManageInitiatives',
  'canVerifySurvey', 'canViewReports', 'canManageTasks', 'canViewFiles', 'canUploadFiles',
  'canSeeDashboard', 'canSeeReports', 'canSeeStandards', 'canSeeInitiatives', 'canSeeTasks',
  'canSeeBudget', 'canSeeCommittees', 'canSeeTeam', 'canSeeFiles',
];

const PERMISSION_LABELS_AR = [
  'إعدادات المدينة', 'إدارة الفريق', 'إضافة عضو', 'تعديل عضو', 'حذف عضو', 'إضافة/تعديل محافظ', 'إضافة/تعديل منسق',
  'إدارة اللجان', 'إدارة المعايير', 'اعتماد أدلة', 'إدارة الميزانية', 'اعتماد معاملات', 'إنشاء معاملات', 'عرض المالية',
  'إدارة المبادرات', 'التحقق من الاستبيانات', 'عرض التقارير', 'إدارة المهام', 'عرض الملفات', 'رفع ملفات',
  'لوحة التحكم', 'رابط التقارير', 'رابط المعايير', 'رابط المبادرات', 'رابط المهام', 'رابط الميزانية', 'رابط اللجان', 'رابط الفريق', 'رابط الملفات',
];

const ROLES = [
  { key: 'governor', label: 'المشرف العام (المحافظ)' },
  { key: 'coordinator', label: 'منسق المدينة الصحية' },
  { key: 'committee_head', label: 'رئيس لجنة' },
  { key: 'committee_coordinator', label: 'منسق لجنة' },
  { key: 'committee_supervisor', label: 'مشرف لجنة' },
  { key: 'committee_member', label: 'عضو لجنة' },
  { key: 'budget_manager', label: 'مدير الميزانية' },
  { key: 'accountant', label: 'المحاسب' },
  { key: 'financial_officer', label: 'الموظف المالي' },
  { key: 'member', label: 'عضو' },
  { key: 'volunteer', label: 'متطوع' },
];

const ROLE_PERMISSIONS = {
  governor: PERMISSION_KEYS.reduce((o, k) => ({ ...o, [k]: 1 }), {}),
  coordinator: { canManageSettings: 0, canManageTeam: 1, canAddTeamMember: 1, canEditTeamMember: 1, canDeleteTeamMember: 1, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 1, canManageStandards: 1, canApproveEvidence: 1, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 1, canViewFinancials: 1, canManageInitiatives: 1, canVerifySurvey: 1, canViewReports: 1, canManageTasks: 1, canViewFiles: 1, canUploadFiles: 1, canSeeDashboard: 1, canSeeReports: 1, canSeeStandards: 1, canSeeInitiatives: 1, canSeeTasks: 1, canSeeBudget: 1, canSeeCommittees: 1, canSeeTeam: 1, canSeeFiles: 1 },
  committee_head: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 1, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 1, canViewFinancials: 1, canManageInitiatives: 1, canVerifySurvey: 1, canViewReports: 1, canManageTasks: 1, canViewFiles: 1, canUploadFiles: 1, canSeeDashboard: 1, canSeeReports: 1, canSeeStandards: 1, canSeeInitiatives: 1, canSeeTasks: 1, canSeeBudget: 1, canSeeCommittees: 1, canSeeTeam: 1, canSeeFiles: 1 },
  committee_coordinator: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 1, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 1, canViewFinancials: 1, canManageInitiatives: 1, canVerifySurvey: 1, canViewReports: 1, canManageTasks: 1, canViewFiles: 1, canUploadFiles: 1, canSeeDashboard: 1, canSeeReports: 1, canSeeStandards: 1, canSeeInitiatives: 1, canSeeTasks: 1, canSeeBudget: 1, canSeeCommittees: 1, canSeeTeam: 1, canSeeFiles: 1 },
  committee_supervisor: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 1, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 1, canViewFinancials: 1, canManageInitiatives: 1, canVerifySurvey: 1, canViewReports: 1, canManageTasks: 1, canViewFiles: 1, canUploadFiles: 1, canSeeDashboard: 1, canSeeReports: 1, canSeeStandards: 1, canSeeInitiatives: 1, canSeeTasks: 1, canSeeBudget: 1, canSeeCommittees: 1, canSeeTeam: 1, canSeeFiles: 1 },
  committee_member: PERMISSION_KEYS.reduce((o, k) => ({ ...o, [k]: k === 'canViewReports' || k === 'canViewFiles' || k === 'canUploadFiles' || k.startsWith('canSee') ? (k === 'canSeeBudget' ? 0 : 1) : 0 }), {}),
  budget_manager: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 0, canManageBudget: 1, canApproveTransactions: 1, canCreateTransactions: 1, canViewFinancials: 1, canManageInitiatives: 0, canVerifySurvey: 0, canViewReports: 0, canManageTasks: 0, canViewFiles: 0, canUploadFiles: 0, canSeeDashboard: 0, canSeeReports: 0, canSeeStandards: 0, canSeeInitiatives: 0, canSeeTasks: 0, canSeeBudget: 1, canSeeCommittees: 0, canSeeTeam: 0, canSeeFiles: 0 },
  accountant: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 0, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 1, canViewFinancials: 1, canManageInitiatives: 0, canVerifySurvey: 0, canViewReports: 0, canManageTasks: 0, canViewFiles: 0, canUploadFiles: 0, canSeeDashboard: 0, canSeeReports: 0, canSeeStandards: 0, canSeeInitiatives: 0, canSeeTasks: 0, canSeeBudget: 1, canSeeCommittees: 0, canSeeTeam: 0, canSeeFiles: 0 },
  financial_officer: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 0, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 1, canViewFinancials: 1, canManageInitiatives: 0, canVerifySurvey: 0, canViewReports: 0, canManageTasks: 0, canViewFiles: 0, canUploadFiles: 0, canSeeDashboard: 0, canSeeReports: 0, canSeeStandards: 0, canSeeInitiatives: 0, canSeeTasks: 0, canSeeBudget: 1, canSeeCommittees: 0, canSeeTeam: 0, canSeeFiles: 0 },
  member: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 0, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 0, canViewFinancials: 0, canManageInitiatives: 0, canVerifySurvey: 0, canViewReports: 1, canManageTasks: 0, canViewFiles: 1, canUploadFiles: 1, canSeeDashboard: 1, canSeeReports: 1, canSeeStandards: 1, canSeeInitiatives: 1, canSeeTasks: 1, canSeeBudget: 0, canSeeCommittees: 1, canSeeTeam: 1, canSeeFiles: 1 },
  volunteer: { canManageSettings: 0, canManageTeam: 0, canAddTeamMember: 0, canEditTeamMember: 0, canDeleteTeamMember: 0, canAddOrEditGovernor: 0, canAddOrEditCoordinator: 0, canManageCommittees: 0, canManageStandards: 0, canApproveEvidence: 0, canManageBudget: 0, canApproveTransactions: 0, canCreateTransactions: 0, canViewFinancials: 0, canManageInitiatives: 0, canVerifySurvey: 0, canViewReports: 1, canManageTasks: 0, canViewFiles: 1, canUploadFiles: 1, canSeeDashboard: 1, canSeeReports: 1, canSeeStandards: 1, canSeeInitiatives: 1, canSeeTasks: 1, canSeeBudget: 0, canSeeCommittees: 1, canSeeTeam: 1, canSeeFiles: 1 },
};

const data = [];
data.push(['role_key', 'المنصب', ...PERMISSION_KEYS]);
data.push(['', '', ...PERMISSION_LABELS_AR]);
for (const r of ROLES) {
  const row = [r.key, r.label];
  const perms = ROLE_PERMISSIONS[r.key] || {};
  for (const k of PERMISSION_KEYS) row.push(perms[k] ?? 0);
  data.push(row);
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'الصلاحيات');
const outPath = join(root, 'صلاحيات-المناصب.xlsx');
XLSX.writeFile(wb, outPath);
console.log('تم إنشاء:', outPath);
