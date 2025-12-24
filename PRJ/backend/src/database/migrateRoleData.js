import db from '../config/database.js';
import { config } from '../config/env.js';
import * as userRepository from '../database/repositories/user.repository.js';
import { ROLES } from '../config/roles.config.js';
import logger from '../utils/logger.js';

/**
 * Post-migration script to assign roles based on ADMIN_EMAILS
 * Called after migration 009_add_user_roles.sql runs
 * 
 * This function:
 * 1. Migrates existing admins from ADMIN_EMAILS to 'admin' role
 * 2. Sets all NULL roles to 'member' (safety measure)
 */
export function migrateAdminRoles() {
  try {
    logger.info({
      event: 'role.migration.start'
    }, 'Starting role migration from ADMIN_EMAILS...');

    const adminEmails = config.adminEmails || [];
    let adminCount = 0;
    let memberCount = 0;

    // Migrate users with admin emails to 'admin' role
    if (adminEmails.length > 0) {
      logger.info({
        event: 'role.migration.admin.emails',
        count: adminEmails.length,
        emails: adminEmails
      }, `Migrating ${adminEmails.length} admin email(s) to admin role`);

      adminEmails.forEach(email => {
        try {
          const normalizedEmail = email.toLowerCase().trim();
          const user = userRepository.findUserByEmail(normalizedEmail);
          
          if (user) {
            // Check if user already has admin role
            if (user.role !== ROLES.ADMIN) {
              userRepository.updateUserRole(user.id, ROLES.ADMIN);
              adminCount++;
              logger.debug({
                event: 'role.migration.admin.assigned',
                userId: user.id,
                email: normalizedEmail
              }, `Assigned admin role to ${normalizedEmail}`);
            } else {
              logger.debug({
                event: 'role.migration.admin.already',
                userId: user.id,
                email: normalizedEmail
              }, `User ${normalizedEmail} already has admin role`);
            }
          } else {
            logger.warn({
              event: 'role.migration.admin.notfound',
              email: normalizedEmail
            }, `Admin email ${normalizedEmail} not found in database`);
          }
        } catch (error) {
          logger.error({
            event: 'role.migration.admin.error',
            email: email,
            error: error.message
          }, `Error migrating admin role for ${email}`);
        }
      });
    } else {
      logger.info({
        event: 'role.migration.admin.none'
      }, 'No ADMIN_EMAILS configured, skipping admin migration');
    }

    // Set all NULL roles to 'member' (safety measure)
    const nullRoleResult = db.prepare('UPDATE users SET role = ? WHERE role IS NULL').run(ROLES.MEMBER);
    memberCount = nullRoleResult.changes || 0;

    if (memberCount > 0) {
      logger.info({
        event: 'role.migration.member.assigned',
        count: memberCount
      }, `Set ${memberCount} user(s) with NULL role to 'member'`);
    }

    logger.info({
      event: 'role.migration.complete',
      adminCount,
      memberCount
    }, `Role migration complete: ${adminCount} admin(s), ${memberCount} member(s) set`);

    return {
      success: true,
      adminCount,
      memberCount
    };
  } catch (error) {
    logger.error({
      event: 'role.migration.failure',
      error: error.message,
      stack: error.stack
    }, 'Role migration failed');
    throw error;
  }
}
