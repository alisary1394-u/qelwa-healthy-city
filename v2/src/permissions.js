export const ROLE_LABELS = {
  governor: "المشرف العام",
  coordinator: "منسق المدينة الصحية",
  committee_head: "رئيس لجنة",
  committee_coordinator: "منسق لجنة",
  committee_supervisor: "مشرف لجنة",
  committee_member: "عضو لجنة",
  member: "عضو",
  volunteer: "متطوع",
  budget_manager: "مدير الميزانية",
  accountant: "محاسب",
  financial_officer: "موظف مالي"
};

export const ROLE_PERMISSIONS = {
  governor: {
    canManageTeam: true,
    canManageTasks: true,
    canManageCommittees: true,
    canSeeReports: true,
    canManageFinance: true
  },
  coordinator: {
    canManageTeam: true,
    canManageTasks: true,
    canManageCommittees: true,
    canSeeReports: true,
    canManageFinance: false
  },
  committee_head: {
    canManageTeam: false,
    canManageTasks: true,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  committee_coordinator: {
    canManageTeam: false,
    canManageTasks: true,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  committee_supervisor: {
    canManageTeam: false,
    canManageTasks: true,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  committee_member: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  member: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  volunteer: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  budget_manager: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: false,
    canManageFinance: true
  },
  accountant: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: false,
    canManageFinance: true
  },
  financial_officer: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: false,
    canManageFinance: true
  }
};

export function getPermissions(role) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.volunteer;
}

