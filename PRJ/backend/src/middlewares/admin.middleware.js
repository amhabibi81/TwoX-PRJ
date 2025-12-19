import { config } from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if user is an admin
 * Checks if user email is in ADMIN_EMAILS environment variable
 * If ADMIN_EMAILS is not set, allows any authenticated user (for demo)
 * 
 * Note: This middleware should be used AFTER auth middleware
 * which sets req.user with user data including email
 */
export default (req, res, next) => {
  // Check if user is authenticated (should be set by auth middleware)
  if (!req.user || !req.user.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const adminEmails = config.adminEmails;

  // If ADMIN_EMAILS is not set, allow any authenticated user (for demo)
  if (!adminEmails || adminEmails.length === 0) {
    logger.debug({
      event: 'admin.access.granted',
      userId: req.user.id,
      email: req.user.email,
      reason: 'demo_mode'
    }, `Admin access granted to ${req.user.email} (no ADMIN_EMAILS configured - demo mode)`);
    return next();
  }

  // Check if user email is in admin list
  const userEmail = req.user.email.toLowerCase().trim();
  const isAdmin = adminEmails.some(email => email.toLowerCase().trim() === userEmail);

  if (!isAdmin) {
    return res.status(403).json({ 
      error: 'Forbidden: Admin access required',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
};
