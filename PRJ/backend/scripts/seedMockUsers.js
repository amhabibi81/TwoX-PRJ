import bcrypt from 'bcrypt';
import '../src/config/env.js';
import db from '../src/config/database.js';
import * as userRepository from '../src/database/repositories/user.repository.js';
import logger from '../src/utils/logger.js';

const DEFAULT_PASSWORD = 'test123';
const USER_COUNT = 20;

/**
 * Seed mock users for testing
 * @param {boolean} clearExisting - If true, delete all existing users first
 */
async function seedMockUsers(clearExisting = false) {
  try {
    logger.info({
      event: 'seed.users.start',
      userCount: USER_COUNT,
      clearExisting
    }, 'Starting to seed mock users...');

    // Clear existing users if requested
    if (clearExisting) {
      logger.info({ event: 'seed.users.clear' }, 'Clearing existing users...');
      db.prepare('DELETE FROM team_members').run(); // Delete team members first (foreign key constraint)
      db.prepare('DELETE FROM answers').run(); // Delete answers
      db.prepare('DELETE FROM users').run(); // Delete users
      logger.info({ event: 'seed.users.cleared' }, 'Existing users cleared');
    }

    // Check if users already exist
    const existingUsers = userRepository.getAllUsers();
    if (existingUsers.length > 0 && !clearExisting) {
      logger.warn({
        event: 'seed.users.skip',
        existingCount: existingUsers.length
      }, `Found ${existingUsers.length} existing users. Use --clear flag to delete them first.`);
      console.log(`\nFound ${existingUsers.length} existing users. Skipping seed.`);
      console.log('To clear existing users and reseed, run: npm run seed:users -- --clear\n');
      return existingUsers;
    }

    // Hash password once for all users
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // Create mock users
    const createdUsers = [];
    for (let i = 1; i <= USER_COUNT; i++) {
      const username = `user${i}`;
      const email = `user${i}@test.com`;

      try {
        const user = userRepository.createUser(username, email, passwordHash);
        createdUsers.push(user);
        logger.debug({
          event: 'seed.user.created',
          userId: user.id,
          username: user.username
        }, `Created user: ${username}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          logger.warn({
            event: 'seed.user.skip',
            username,
            reason: 'already_exists'
          }, `User ${username} already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    logger.info({
      event: 'seed.users.success',
      createdCount: createdUsers.length,
      totalCount: USER_COUNT
    }, `Successfully created ${createdUsers.length} mock users`);

    console.log('\n✅ Mock users seeded successfully!');
    console.log(`\nCreated ${createdUsers.length} users:`);
    console.log('Username format: user1, user2, ..., user20');
    console.log('Email format: user1@test.com, user2@test.com, ..., user20@test.com');
    console.log(`Password for all users: ${DEFAULT_PASSWORD}\n`);

    console.log('User IDs:');
    createdUsers.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id}, Email: ${user.email})`);
    });
    console.log('');

    return createdUsers;
  } catch (error) {
    logger.error({
      event: 'seed.users.failure',
      error: error.message,
      stack: error.stack
    }, 'Failed to seed mock users');
    console.error('\n❌ Error seeding mock users:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const clearExisting = args.includes('--clear') || args.includes('-c');

// Run seed
seedMockUsers(clearExisting)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });


