import { UserAccount, UserModulePermissions, PlatformModule, UserRole } from '@/types/inventory';

/**
 * Absolute Role Hierarchy Levels:
 * admin (Tier 1: Absolute Root / Full Control) -> 40
 * owner (Tier 2: Business & Financial Lead)    -> 30
 * manager (Tier 3: Workshop & Operations Floor)-> 20
 * staff                                        -> 10
 * viewer (Tier 4: Read-Only)                   -> 0
 */
export const ROLE_LEVELS: Record<string, number> = {
  admin: 40,
  Admin: 40,
  owner: 30,
  Owner: 30,
  manager: 20,
  Manager: 20,
  staff: 10,
  Staff: 10,
  viewer: 0,
  Viewer: 0,
};

/**
 * Checks if a user is the absolute root administrator.
 */
export function isSuperAdmin(user: Partial<UserAccount> | null | undefined): boolean {
  if (!user) return false;
  const roleLower = String(user.role || '').toLowerCase();
  return roleLower === 'admin' || user.username?.toLowerCase() === 'bako';
}

/**
 * Universal Authorization Helper:
 * Checks if currentUser has a specific permission.
 * Immediate, unconditional bypass for admin.
 */
export function hasPermission(
  currentUser: Partial<UserAccount> | null | undefined,
  permissionKey: keyof UserModulePermissions
): boolean {
  if (!currentUser) return false;
  // Immediate, unconditional override for admin
  if (currentUser.role === 'admin' || currentUser.role === 'Admin' || isSuperAdmin(currentUser)) {
    return true; // Admin bypasses all restrictions unconditionally
  }
  return !!currentUser.permissions?.[permissionKey];
}

/**
 * Module Access Authorization Helper:
 * Checks if currentUser can access a specific platform module.
 * Immediate, unconditional bypass for admin.
 */
export function canAccessModule(
  currentUser: Partial<UserAccount> | null | undefined,
  mod: PlatformModule
): boolean {
  if (!currentUser) return false;
  // Immediate, unconditional override for admin
  if (currentUser.role === 'admin' || currentUser.role === 'Admin' || isSuperAdmin(currentUser)) {
    return true; // Admin bypasses all restrictions unconditionally
  }
  if (mod === 'hub') return true;
  const perms = currentUser.permissions;
  if (!perms) return false;

  if (mod === 'panels' || mod === 'orders') return !!perms.canViewPanels;
  if (mod === 'sales') return !!perms.canViewSales;
  if (mod === 'goods' || mod === 'shipping') return !!perms.canViewWarehouse;
  if (mod === 'profit') return !!perms.canViewFinancialAnalytics;
  if (mod === 'audit') return !!perms.canAccessAdmin;
  return false;
}

/**
 * User Management Authorization Helper:
 * Checks if currentUser can manage accounts generally.
 * Immediate, unconditional bypass for admin.
 */
export function canManageUsers(
  currentUser: Partial<UserAccount> | null | undefined
): boolean {
  if (!currentUser) return false;
  // Immediate, unconditional override for admin
  if (currentUser.role === 'admin' || currentUser.role === 'Admin' || isSuperAdmin(currentUser)) {
    return true; // Admin bypasses all restrictions unconditionally
  }
  return !!currentUser.permissions?.canAccessAdmin;
}

/**
 * Specific Account Modification Authorization:
 * - Admin can edit, deactivate, or reset password for ANY account (including Owner).
 * - Owner or non-admins CANNOT modify or reset passwords for Admin accounts.
 */
export function canModifyUser(
  currentUser: Partial<UserAccount> | null | undefined,
  targetUser: Partial<UserAccount> | null | undefined
): boolean {
  if (!currentUser || !targetUser) return false;
  if (currentUser.role === 'admin' || currentUser.role === 'Admin' || isSuperAdmin(currentUser)) {
    return true; // Admin can modify any account including owner
  }
  if (isSuperAdmin(targetUser)) {
    return false; // Non-admins (including owner) can NEVER modify admin accounts
  }
  const curLevel = ROLE_LEVELS[String(currentUser.role || '').toLowerCase()] || 0;
  const targetLevel = ROLE_LEVELS[String(targetUser.role || '').toLowerCase()] || 0;
  return curLevel >= targetLevel;
}

/**
 * Specific Account Deletion Authorization:
 * - Admin can delete ANY account (including Owner), except the permanent system root ('bako').
 * - Owner or non-admins CANNOT delete Admin accounts under any circumstances.
 */
export function canDeleteUser(
  currentUser: Partial<UserAccount> | null | undefined,
  targetUser: Partial<UserAccount> | null | undefined
): boolean {
  if (!currentUser || !targetUser) return false;
  // System root bako cannot be deleted by anyone to preserve system stability
  if (targetUser.username?.toLowerCase() === 'bako') return false;

  if (currentUser.role === 'admin' || currentUser.role === 'Admin' || isSuperAdmin(currentUser)) {
    return true; // Admin can delete any account (including owner)
  }
  if (isSuperAdmin(targetUser)) {
    return false; // Non-admins (including owner) can NEVER delete admin accounts
  }
  const curLevel = ROLE_LEVELS[String(currentUser.role || '').toLowerCase()] || 0;
  const targetLevel = ROLE_LEVELS[String(targetUser.role || '').toLowerCase()] || 0;
  return curLevel > targetLevel;
}

/**
 * Credential Visibility Authorization:
 * - Admin can view plaintext credentials for accounts.
 * - Non-admins (including Owner) MUST NOT view credentials of admin accounts.
 */
export function canViewCredentials(
  currentUser: Partial<UserAccount> | null | undefined,
  targetUser: Partial<UserAccount> | null | undefined
): boolean {
  if (!currentUser || !targetUser) return false;
  if (currentUser.role === 'admin' || currentUser.role === 'Admin' || isSuperAdmin(currentUser)) {
    return true; // Admin can view credentials
  }
  if (isSuperAdmin(targetUser)) {
    return false; // Owner/others cannot view admin credentials
  }
  return false;
}

/**
 * Role Assignment Authorization:
 * - Only Admin can create or assign the 'Admin' role.
 * - Owner can assign 'Owner', 'Manager', 'Staff', or 'Viewer'.
 */
export function canAssignRole(
  currentUser: Partial<UserAccount> | null | undefined,
  roleToAssign: UserRole
): boolean {
  if (!currentUser) return false;
  const assignRoleLower = String(roleToAssign).toLowerCase();
  if (assignRoleLower === 'admin') {
    return isSuperAdmin(currentUser);
  }
  const curLevel = ROLE_LEVELS[String(currentUser.role || '').toLowerCase()] || 0;
  const targetLevel = ROLE_LEVELS[assignRoleLower] || 0;
  return curLevel >= targetLevel;
}
