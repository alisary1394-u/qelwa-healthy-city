import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/api/apiClient';
import { getPermissions, getNavItemsForRole, PERMISSIONS_BY_ROLE } from '@/lib/permissions';
import {
  LayoutDashboard,
  BarChart3,
  Target,
  Lightbulb,
  ClipboardList,
  DollarSign,
  Building,
  Users,
  FolderOpen,
  Menu,
  Shield,
  HandHelping,
  MapPinned,
  Settings,
} from 'lucide-react';

const ICON_MAP = {
  LayoutDashboard,
  BarChart3,
  Target,
  Lightbulb,
  ClipboardList,
  DollarSign,
  Building,
  Users,
  FolderOpen,
  Shield,
  HandHelping,
  MapPinned,
  SettingsIcon: Settings,
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

  const { data: permissionOverrides = [] } = useQuery({
    queryKey: ['permissionOverrides'],
    queryFn: () => api.entities.PermissionOverride.list(),
  });

  return useMemo(() => {
    const currentMember = (currentUser?.national_id != null
      ? members.find((m) => String(m.national_id) === String(currentUser.national_id))
      : null) || members.find((m) => m.email === currentUser?.email);
    // الصلاحيات تعتمد فقط على دور العضو في الفريق: إن وُجد في الفريق نستخدم دوره، وإلا نعامله كمتطوع (لا نعتمد user_role من النظام حتى لا يحصل غير المسجلين على صلاحيات المشرف)
    const role = (currentUser?.user_role === 'admin' || currentUser?.role === 'admin')
      ? 'governor'
      : (currentMember?.role || 'volunteer');
    
    // دمج الصلاحيات الافتراضية مع التخصيصات من قاعدة البيانات
    let permissions = getPermissions(role);
    
    if (permissionOverrides.length > 0) {
      const roleOverrides = permissionOverrides.filter((o) => o.role === role);
      if (roleOverrides.length > 0) {
        const customPermissions = { ...permissions };
        roleOverrides.forEach((override) => {
          const permKey = override.permission_key;
          if (permKey in customPermissions) {
            customPermissions[permKey] = override.is_enabled;
          }
        });
        permissions = customPermissions;
      }
    }
    
    const isGovernor = role === 'governor';

    // بناء عناصر القائمة بناءً على الصلاحيات المدمجة (الافتراضية + التخصيصات)
    const navItemsFromPerms = getNavItemsForRole(role);
    const navItems = navItemsFromPerms
      .filter((item) => permissions[item.permission] !== false)
      .map((item) => ({
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
  }, [currentUser, members, permissionOverrides]);
}
