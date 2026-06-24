import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/apiClient';
import { getPermissions, getNavItemsForRole, PERMISSIONS_BY_ROLE } from '@/lib/permissions';
import { getHostCityTemplate } from '@/lib/city-hosts';
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
  Building2,
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
  Building2,
};

const MINISTRY_SELECTED_CITY_KEY = 'ministry_selected_city_id';
const MINISTRY_SELECTED_CITY_SCOPE_KEY = 'ministry_selected_city_scope';

function getSelectedScopeToken() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return 'default';
  try {
    const scope = localStorage.getItem(MINISTRY_SELECTED_CITY_SCOPE_KEY);
    if (scope) return `scope:${scope}`;
  } catch {}
  try {
    const cityId = localStorage.getItem(MINISTRY_SELECTED_CITY_KEY) || '';
    if (cityId) return `city:${cityId}`;
  } catch {}
  return 'default';
}

function parseRegionScope(user) {
  const raw = user?.ministry_region_scope ?? user?.region_scope ?? user?.ministry_region ?? user?.region;
  if (Array.isArray(raw)) return raw.map((v) => String(v || '').trim()).filter(Boolean);
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * خطاف صلاحيات المستخدم الحالي.
 * يعتمد على currentUser و currentMember (TeamMember المطابق للبريد).
 * @returns {{ role: string, permissions: Object, navItems: Array, isGovernor: boolean, currentMember: Object|null }}
 */
export function usePermissions() {
  const [scopeToken, setScopeToken] = useState(getSelectedScopeToken);

  useEffect(() => {
    const handleMinistryCitySelected = (event) => {
      const cityId = String(event?.detail?.cityId || '');
      const includeLegacyNull = event?.detail?.includeLegacyNull === true;
      const next = cityId ? `city:${cityId}|legacy:${includeLegacyNull ? '1' : '0'}` : 'default';
      setScopeToken(next);
    };
    window.addEventListener('ministry-city-selected', handleMinistryCitySelected);
    return () => window.removeEventListener('ministry-city-selected', handleMinistryCitySelected);
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['teamMembers', scopeToken],
    queryFn: () => api.entities.TeamMember.list(),
    select: (data) => Array.isArray(data) ? data : []
  });

  const { data: permissionOverrides = [] } = useQuery({
    queryKey: ['permissionOverrides', scopeToken],
    queryFn: () => api.entities.PermissionOverride.list(),
    select: (data) => Array.isArray(data) ? data : []
  });

  return useMemo(() => {
    const membersList = Array.isArray(members) ? members : [];
    const overridesList = Array.isArray(permissionOverrides) ? permissionOverrides : [];
    const currentMember = (currentUser?.national_id != null
      ? membersList.find((m) => String(m.national_id) === String(currentUser.national_id))
      : null) || membersList.find((m) => m.email === currentUser?.email);
    const ministryRoles = new Set(['ministry_admin', 'ministry_it_admin', 'ministry_staff', 'ministry_regional_staff']);
    const explicitRole = currentUser?.role || currentUser?.user_role;
    const hostCity = getHostCityTemplate();
    const isMinistryHost = hostCity?.isMinistry === true;
    const isLegacyAdmin = (currentUser?.user_role === 'admin' || currentUser?.role === 'admin');
    // الدور الوزاري الصريح له الأولوية على دور الفريق
    const role = ministryRoles.has(explicitRole)
      ? explicitRole
      : isLegacyAdmin
      ? (isMinistryHost ? 'ministry_admin' : 'governor')
      : (currentMember?.role || 'volunteer');
    const ministryRegionScope = parseRegionScope(currentUser);
    
    // دمج الصلاحيات الافتراضية مع التخصيصات من قاعدة البيانات
    let permissions = getPermissions(role);
    
    if (overridesList.length > 0) {
      const roleOverrides = overridesList.filter((o) => o.role === role);
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
    const isMinistryAdmin = role === 'ministry_admin';
    const isMinistryRole = ministryRoles.has(role);

    // بناء عناصر القائمة بناءً على الصلاحيات المدمجة (الافتراضية + التخصيصات)
    const navItemsFromPerms = getNavItemsForRole(role);
    const ministryNavOrder = ['MinistryDashboard', 'Reports', 'TeamManagement', 'Files', 'Settings'];
    const navItems = navItemsFromPerms
      .filter((item) => {
        if (!isMinistryRole) return true;
        return ministryNavOrder.includes(item.name);
      })
      .sort((a, b) => {
        if (!isMinistryRole) return 0;
        return ministryNavOrder.indexOf(a.name) - ministryNavOrder.indexOf(b.name);
      })
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
      isMinistryAdmin,
      isMinistryRole,
      ministryRegionScope,
    };
  }, [currentUser, members, permissionOverrides]);
}
