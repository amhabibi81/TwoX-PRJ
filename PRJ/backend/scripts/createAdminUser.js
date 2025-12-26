import bcrypt from 'bcrypt';
import '../src/config/env.js';
import * as userRepository from '../src/database/repositories/user.repository.js';
import { config } from '../src/config/env.js';
import { ROLES } from '../src/config/roles.config.js';
import logger from '../src/utils/logger.js';

/**
 * Create or verify admin user
 * Uses ADMIN_EMAILS and ADMIN_DEFAULT_PASSWORD from environment variables
 */
async function createAdminUser() {
  try {
    // Check if ADMIN_EMAILS is configured
    if (!config.adminEmails || config.adminEmails.length === 0) {
      console.error('❌ ADMIN_EMAILS environment variable is not configured.');
      console.log('Please set ADMIN_EMAILS in your .env file or environment variables.');
      process.exit(1);
    }

    const adminEmail = config.adminEmails[0].toLowerCase().trim();
    const adminPassword = config.adminDefaultPassword;
    const adminUsername = adminEmail.split('@')[0]; // Use email prefix as username

    console.log(`\n🔍 Checking for admin user: ${adminEmail}`);

    // Check if admin user already exists
    const existingAdmin = userRepository.findUserByEmail(adminEmail);

    if (existingAdmin) {
      console.log(`✅ Admin user already exists:`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Role: ${existingAdmin.role || 'member'}`);
      console.log(`   User ID: ${existingAdmin.id}`);
      console.log(`\n⚠️  Note: Password is not displayed for security.`);
      console.log(`   If you need to reset the password, you can update it manually in the database.`);
      return existingAdmin;
    }

    // Admin user doesn't exist - create it
    console.log(`\n📝 Creating admin user...`);

    // Hash the default password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const adminUser = userRepository.createUser(
      adminUsername,
      adminEmail,
      passwordHash,
      ROLES.ADMIN
    );

    console.log(`\n✅ Admin user created successfully!`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`\n⚠️  SECURITY WARNING: Please change this password immediately after first login!`);

    logger.info({
      event: 'admin.user.created.script',
      userId: adminUser.id,
      email: adminEmail,
      username: adminUsername
    }, `Admin user created via script: ${adminEmail}`);

    return adminUser;
  } catch (error) {
    if (error.message === 'Username or email already exists') {
      console.error(`\n❌ Error: A user with this email or username already exists.`);
      console.log(`   Please check the database or use a different email.`);
    } else {
      console.error(`\n❌ Error creating admin user: ${error.message}`);
      logger.error({
        event: 'admin.user.creation.failure.script',
        error: error.message,
        stack: error.stack
      }, 'Failed to create admin user via script');
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
