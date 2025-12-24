import * as userRepository from '../database/repositories/user.repository.js';
import { ROLES, isValidRole } from '../config/roles.config.js';
import logger from '../utils/logger.js';

/**
 * Helper to get role from JWT or database
 * Ensures backward compatibility with existing tokens that don't have role
 * @param {object} user - User object from JWT (req.user)
 * @returns {Promise<string>} User's role
 */
async function getUserRole(user) {
  // If role in JWT, use it (new tokens)
  if (user.role && isValidRole(user.role)) {
    return user.role;
  }
  
  // Otherwise fetch from database (backward compatibility for old tokens)
  try {
    const userRecord = userRepository.findUserById(user.id);
    if (userRecord && userRecord.role) {
      // Attach role to req.user for future use in the same request
      user.role = userRecord.role;
      return userRecord.role;
    }
    
    // Default to member if no role found
    return ROLES.MEMBER;
  } catch (error) {
    logger.error({
      event: 'role.fetch.error',
      userId: user.id,
      error: error.message
    }, 'Error fetching user role from database');
    return ROLES.MEMBER;
  }
}

/**
 * Middleware factory: Require a specific role
 * @param {string} requiredRole - The required role
 * @returns {Function} Express middleware
 */
export const requireRole = (requiredRole) => {
  if (!isValidRole(requiredRole)) {
    throw new Error(`Invalid role: ${requiredRole}`);
  }

  return async (req, res, next) => {
    // Ensure user is authenticated (should be set by auth middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    try {
      const userRole = await getUserRole(req.user);
      
      if (userRole !== requiredRole) {
        logger.warn({
          event: 'authorization.denied',
          userId: req.user.id,
          userRole,
          requiredRole,
          path: req.path
        }, 'Access denied: insufficient role');
        
        return res.status(403).json({
          error: 'Forbidden',
          message: `This resource requires ${requiredRole} role. Your role: ${userRole}`
        });
      }
      
      next();
    } catch (error) {
      logger.error({
        event: 'authorization.error',
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      }, 'Error in requireRole middleware');
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * Middleware factory: Require any of the specified roles
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 */
export const requireAnyRole = (allowedRoles) => {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('allowedRoles must be a non-empty array');
  }
  
  // Validate all roles
  allowedRoles.forEach(role => {
    if (!isValidRole(role)) {
      throw new Error(`Invalid role in allowedRoles: ${role}`);
    }
  });

  return async (req, res, next) => {
    // Ensure user is authenticated (should be set by auth middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    try {
      const userRole = await getUserRole(req.user);
      
      if (!allowedRoles.includes(userRole)) {
        logger.warn({
          event: 'authorization.denied',
          userId: req.user.id,
          userRole,
          allowedRoles,
          path: req.path
        }, 'Access denied: role not in allowed list');
        
        return res.status(403).json({
          error: 'Forbidden',
          message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`
        });
      }
      
      next();
    } catch (error) {
      logger.error({
        event: 'authorization.error',
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      }, 'Error in requireAnyRole middleware');
      
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * Convenience middleware: Require admin or manager role
 * @returns {Function} Express middleware
 */
export const requireAdminOrManager = () => {
  return requireAnyRole([ROLES.ADMIN, ROLES.MANAGER]);
};
