import { migrate } from './migrate.js';
import * as questionRepository from './repositories/question.repository.js';
import * as userRepository from './repositories/user.repository.js';
import { config } from '../config/env.js';
import { ROLES } from '../config/roles.config.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

export async function initializeDatabase() {
  try {
    logger.info({
      event: 'database.initialization.start'
    }, 'Initializing database...');
    
    // Run migrations
    migrate();
    
    // Seed default questions for current month if they don't exist
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const year = currentDate.getFullYear();
    
    const seeded = questionRepository.seedDefaultQuestions(month, year);
    if (seeded) {
      logger.info({
        event: 'database.questions.seeded',
        month,
        year,
        questionCount: 5
      }, `Seeded 5 default questions for ${month}/${year}`);
    } else {
      logger.debug({
        event: 'database.questions.skip',
        month,
        year
      }, `Questions already exist for ${month}/${year}, skipping seed`);
    }
    
    // Always ensure admin user exists if ADMIN_EMAILS is configured
    logger.info({
      event: 'database.admin.check.start',
      adminEmailsConfigured: config.adminEmails.length,
      adminEmails: config.adminEmails
    }, `Checking admin user creation. ADMIN_EMAILS configured: ${config.adminEmails.length > 0 ? 'yes' : 'no'}`);
    
    if (config.adminEmails.length > 0) {
      const adminEmail = config.adminEmails[0].toLowerCase().trim();
      const adminPassword = config.adminDefaultPassword;
      const adminUsername = adminEmail.split('@')[0]; // Use email prefix as username
      
      logger.info({
        event: 'database.admin.check.details',
        email: adminEmail,
        username: adminUsername,
        passwordLength: adminPassword.length,
        passwordMasked: '*'.repeat(Math.min(adminPassword.length, 8))
      }, `Checking for admin user: ${adminEmail} (username: ${adminUsername})`);
      
      // Check if admin user already exists
      const existingAdmin = userRepository.findUserByEmail(adminEmail);
      
      if (!existingAdmin) {
        // Admin user doesn't exist - create it
        logger.info({
          event: 'database.admin.creation.start',
          email: adminEmail,
          username: adminUsername
        }, `Admin user not found. Creating admin user: ${adminEmail}`);
        
        try {
          // Hash the default password
          const passwordHash = await bcrypt.hash(adminPassword, 10);
          
          logger.debug({
            event: 'database.admin.password.hashed',
            email: adminEmail
          }, `Password hashed successfully for ${adminEmail}`);
          
          // Create admin user
          const adminUser = userRepository.createUser(
            adminUsername,
            adminEmail,
            passwordHash,
            ROLES.ADMIN
          );
          
          logger.info({
            event: 'database.admin.created',
            userId: adminUser.id,
            email: adminEmail,
            username: adminUsername,
            role: adminUser.role
          }, `✅ Successfully created default admin user: ${adminEmail} (ID: ${adminUser.id})`);
          
          logger.warn({
            event: 'database.admin.security',
            email: adminEmail,
            userId: adminUser.id
          }, `⚠️  SECURITY: Default admin user created with password '${adminPassword}'. Please change this password immediately after first login.`);
          
          // Log login credentials for reference (only in logs, not exposed)
          logger.info({
            event: 'database.admin.credentials',
            email: adminEmail,
            passwordLength: adminPassword.length
          }, `Admin login credentials - Email: ${adminEmail}, Password length: ${adminPassword.length} characters`);
        } catch (error) {
          logger.error({
            event: 'database.admin.creation.failure',
            email: adminEmail,
            username: adminUsername,
            error: error.message,
            errorCode: error.code,
            stack: error.stack
          }, `❌ CRITICAL: Failed to create default admin user for ${adminEmail}. Error: ${error.message}${error.code ? ` (Code: ${error.code})` : ''}`);
          
          // Log additional context for debugging
          if (error.message.includes('already exists')) {
            logger.warn({
              event: 'database.admin.creation.conflict',
              email: adminEmail,
              username: adminUsername
            }, `User with email ${adminEmail} or username ${adminUsername} may already exist. Attempting to find existing user...`);
            
            // Try to find by username as well
            const userByUsername = userRepository.findUserByUsername(adminUsername);
            if (userByUsername) {
              logger.info({
                event: 'database.admin.found.by.username',
                userId: userByUsername.id,
                email: userByUsername.email,
                username: userByUsername.username
              }, `Found existing user by username: ${adminUsername} (Email: ${userByUsername.email})`);
            }
          }
          
          // Don't throw - allow server to start even if admin creation fails
          logger.warn({
            event: 'database.admin.creation.skipped',
            email: adminEmail
          }, `Server will start without admin user. Manual admin creation may be required.`);
        }
      } else {
        // Admin user already exists
        logger.info({
          event: 'database.admin.exists',
          userId: existingAdmin.id,
          email: adminEmail,
          username: existingAdmin.username,
          role: existingAdmin.role || 'member'
        }, `✅ Admin user already exists: ${adminEmail} (ID: ${existingAdmin.id}, Role: ${existingAdmin.role || 'member'})`);
      }
    } else {
      logger.warn({
        event: 'database.admin.skip',
        reason: 'no_admin_emails',
        adminEmailsValue: process.env.ADMIN_EMAILS || 'not set'
      }, `⚠️  ADMIN_EMAILS environment variable is not configured or empty. Skipping admin user creation. Set ADMIN_EMAILS to enable automatic admin user creation.`);
    }
    
    logger.info({
      event: 'database.initialization.success'
    }, 'Database initialized successfully');
    return true;
  } catch (error) {
    logger.error({
      event: 'database.initialization.failure',
      error: error.message,
      stack: error.stack
    }, 'Database initialization failed');
    throw error;
  }
}

export default initializeDatabase;

