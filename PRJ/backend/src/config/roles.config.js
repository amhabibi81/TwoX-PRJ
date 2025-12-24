/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines valid roles and their hierarchy
 */

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member'
};

export const VALID_ROLES = Object.values(ROLES);

// Role hierarchy (for permission checks)
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.MANAGER]: 2,
  [ROLES.MEMBER]: 1
};

/**
 * Check if a role has at least the required permission level
 * @param {string} userRole - The user's role
 * @param {string} requiredRole - The minimum required role
 * @returns {boolean} True if user role meets or exceeds required role
 */
export const hasMinimumRole = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Validate if a role is valid
 * @param {string} role - The role to validate
 * @returns {boolean} True if role is valid
 */
export const isValidRole = (role) => {
  return VALID_ROLES.includes(role);
};
