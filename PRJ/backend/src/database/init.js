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
    if (config.adminEmails.length > 0) {
      const adminEmail = config.adminEmails[0].toLowerCase().trim();
      const adminPassword = config.adminDefaultPassword;
      const adminUsername = adminEmail.split('@')[0]; // Use email prefix as username
      
      // Check if admin user already exists
      const existingAdmin = userRepository.findUserByEmail(adminEmail);
      
      if (!existingAdmin) {
        // Admin user doesn't exist - create it
        try {
          // Hash the default password
          const passwordHash = await bcrypt.hash(adminPassword, 10);
          
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
            username: adminUsername
          }, `Created default admin user: ${adminEmail}`);
          
          logger.warn({
            event: 'database.admin.security',
            email: adminEmail
          }, `⚠️  SECURITY: Default admin user created with password '${adminPassword}'. Please change this password immediately after first login.`);
        } catch (error) {
          logger.error({
            event: 'database.admin.creation.failure',
            email: adminEmail,
            error: error.message,
            stack: error.stack
          }, `Failed to create default admin user: ${error.message}`);
          // Don't throw - allow server to start even if admin creation fails
        }
      } else {
        // Admin user already exists
        logger.info({
          event: 'database.admin.exists',
          userId: existingAdmin.id,
          email: adminEmail,
          username: existingAdmin.username
        }, `Admin user already exists: ${adminEmail}`);
      }
    } else {
      logger.debug({
        event: 'database.admin.skip',
        reason: 'no_admin_emails'
      }, 'ADMIN_EMAILS not configured. Skipping admin user creation.');
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

