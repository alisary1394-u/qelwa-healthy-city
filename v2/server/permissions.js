export const ROLES = {
  GOVERNOR: "governor",
  COORDINATOR: "coordinator",
  COMMITTEE_HEAD: "committee_head",
  COMMITTEE_COORDINATOR: "committee_coordinator",
  COMMITTEE_SUPERVISOR: "committee_supervisor",
  COMMITTEE_MEMBER: "committee_member",
  MEMBER: "member",
  VOLUNTEER: "volunteer",
  BUDGET_MANAGER: "budget_manager",
  ACCOUNTANT: "accountant",
  FINANCIAL_OFFICER: "financial_officer"
};

export const PERMISSIONS = {
  [ROLES.GOVERNOR]: {
    canManageTeam: true,
    canManageTasks: true,
    canManageCommittees: true,
    canSeeReports: true,
    canManageFinance: true
  },
  [ROLES.COORDINATOR]: {
    canManageTeam: true,
    canManageTasks: true,
    canManageCommittees: true,
    canSeeReports: true,
    canManageFinance: false
  },
  [ROLES.COMMITTEE_HEAD]: {
    canManageTeam: false,
    canManageTasks: true,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  [ROLES.COMMITTEE_COORDINATOR]: {
    canManageTeam: false,
    canManageTasks: true,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  [ROLES.COMMITTEE_SUPERVISOR]: {
    canManageTeam: false,
    canManageTasks: true,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  [ROLES.COMMITTEE_MEMBER]: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  [ROLES.MEMBER]: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  [ROLES.VOLUNTEER]: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: true,
    canManageFinance: false
  },
  [ROLES.BUDGET_MANAGER]: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: false,
    canManageFinance: true
  },
  [ROLES.ACCOUNTANT]: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: false,
    canManageFinance: true
  },
  [ROLES.FINANCIAL_OFFICER]: {
    canManageTeam: false,
    canManageTasks: false,
    canManageCommittees: false,
    canSeeReports: false,
    canManageFinance: true
  }
};

export function getPermissionsByRole(role) {
  return PERMISSIONS[role] ?? PERMISSIONS[ROLES.VOLUNTEER];
}

