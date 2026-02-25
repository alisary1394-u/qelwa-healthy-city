import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { getPermissions, getNavItemsForRole } from '@/lib/permissions';
import {
  LayoutDashboard,
  FileSearch,
  Target,
  Lightbulb,
  ClipboardList,
  DollarSign,
  Building,
  Users,
  FolderOpen,
  Menu,
} from 'lucide-react';

const ICON_MAP = {
  LayoutDashboard,
  FileSearch,
  Target,
  Lightbulb,
  ClipboardList,
  DollarSign,
  Building,
  Users,
  FolderOpen,
};

/**
 * خطاف صلاحيات المستخدم الحالي.
 * يعتمد على currentUser و currentMember (TeamMember المطابق للبريد).
 * @returns {{ role: string, permissions: Object, navItems: Array, isGovernor: boolean, currentMember: Object|null }}
 */
export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => api.entities.TeamMember.list(),
  });

  const currentMember = (currentUser?.national_id != null
    ? members.find((m) => String(m.national_id) === String(currentUser.national_id))
    : null) || members.find((m) => m.email === currentUser?.email);
  // الصلاحيات تعتمد فقط على دور العضو في الفريق: إن وُجد في الفريق نستخدم دوره، وإلا نعامله كمتطوع (لا نعتمد user_role من النظام حتى لا يحصل غير المسجلين على صلاحيات المشرف)
  const role = currentMember?.role ?? (currentUser?.user_role === 'admin' || currentUser?.role === 'admin' ? 'volunteer' : (currentUser?.user_role || currentUser?.role || 'volunteer'));
  const permissions = getPermissions(role);
  const isGovernor = role === 'admin' || role === 'governor';

  const navItemsFromPerms = getNavItemsForRole(role);
  const navItems = navItemsFromPerms.map((item) => ({
    ...item,
    icon: ICON_MAP[item.icon] || Menu,
  }));

  return {
    role,
    permissions,
    navItems,
    isGovernor,
    currentMember: currentMember ?? null,
  };
}
