import '../src/config/env.js';
import db from '../src/config/database.js';
import * as userRepository from '../src/database/repositories/user.repository.js';
import * as teamRepository from '../src/database/repositories/team.repository.js';
import * as teamMemberRepository from '../src/database/repositories/teamMember.repository.js';
import logger from '../src/utils/logger.js';

// Import seed function logic
import bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'test123';
const USER_COUNT = 20;

/**
 * Seed mock users if needed
 */
async function ensureMockUsers() {
  const users = userRepository.getAllUsers();
  
  if (users.length >= USER_COUNT) {
    console.log(`✅ Found ${users.length} users in database`);
    return users;
  }

  console.log(`\n⚠️  Only ${users.length} users found. Seeding mock users...`);
  
  // Hash password
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Create mock users
  const createdUsers = [];
  for (let i = 1; i <= USER_COUNT; i++) {
    const username = `user${i}`;
    const email = `user${i}@test.com`;

    try {
      const user = userRepository.createUser(username, email, passwordHash);
      createdUsers.push(user);
    } catch (error) {
      if (error.message.includes('already exists')) {
        // User already exists, find it
        const existingUser = userRepository.findUserByUsername(username);
        if (existingUser) {
          createdUsers.push(existingUser);
        }
      } else {
        throw error;
      }
    }
  }

  console.log(`✅ Created/seeded ${createdUsers.length} users\n`);
  return createdUsers;
}

/**
 * Create test teams manually
 * @param {boolean} force - If true, delete existing teams for current hour before creating new ones
 */
async function createTestTeams(force = false) {
  try {
    console.log('\n🧪 Creating Test Teams\n');
    console.log('='.repeat(60));

    // Ensure mock users exist
    const users = await ensureMockUsers();
    
    if (users.length < 4) {
      console.error('❌ Need at least 4 users to create teams');
      process.exit(1);
    }

    // Get current date/time
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`\n📅 Creating teams for ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}\n`);

    // Check if teams already exist for this hour
    const teamsExist = teamRepository.teamsExistForHour(currentHour, currentDay, currentMonth, currentYear);
    
    if (teamsExist && !force) {
      console.log('⚠️  Teams already exist for this hour. Skipping creation.');
      console.log('   To recreate teams, use: npm run test:create-teams -- --force\n');
      
      // Show existing teams
      const existingTeams = teamRepository.getTeamsByHour(currentHour, currentDay, currentMonth, currentYear);
      console.log('Existing teams:');
      existingTeams.forEach(team => {
        const members = teamMemberRepository.getTeamMembers(team.id);
        const memberNames = members.map(m => m.username).join(', ');
        console.log(`  - ${team.name}: ${memberNames}`);
      });
      return;
    }

    // If force is true, delete existing teams for this hour
    if (teamsExist && force) {
      console.log('🗑️  Force flag detected. Deleting existing teams for this hour...\n');
      
      const existingTeams = teamRepository.getTeamsByHour(currentHour, currentDay, currentMonth, currentYear);
      const teamIds = existingTeams.map(t => t.id);
      
      if (teamIds.length > 0) {
        // Delete team members first (foreign key constraint)
        const placeholders = teamIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM team_members WHERE team_id IN (${placeholders})`).run(...teamIds);
        
        // Delete answers for these teams
        db.prepare(`DELETE FROM answers WHERE team_id IN (${placeholders})`).run(...teamIds);
        
        // Delete teams
        db.prepare(`DELETE FROM teams WHERE id IN (${placeholders})`).run(...teamIds);
        
        console.log(`✅ Deleted ${existingTeams.length} existing team(s) and related data\n`);
      }
    }

    // Create teams - divide users into teams of 4
    const teams = [];
    const teamSize = 4;
    const teamCount = Math.floor(users.length / teamSize);

    console.log(`Creating ${teamCount} teams with ${teamSize} members each...\n`);

    for (let i = 0; i < teamCount; i++) {
      const teamName = `Team ${i + 1}`;
      const startIdx = i * teamSize;
      const endIdx = Math.min(startIdx + teamSize, users.length);
      const teamUserIds = users.slice(startIdx, endIdx).map(u => u.id);

      // Create team
      const team = teamRepository.createTeam(
        teamName,
        currentMonth,
        currentYear,
        currentDay,
        currentHour
      );

      // Add members
      for (const userId of teamUserIds) {
        try {
          teamMemberRepository.addMember(team.id, userId);
        } catch (error) {
          if (!error.message.includes('already a member')) {
            throw error;
          }
        }
      }

      // Get team members for display
      const members = teamMemberRepository.getTeamMembers(team.id);
      const memberNames = members.map(m => `${m.username} (ID: ${m.id})`).join(', ');

      teams.push({
        team,
        members: memberNames
      });

      console.log(`✅ ${teamName}: ${memberNames}`);
    }

    // Handle remainder users (if any)
    const remainder = users.length % teamSize;
    if (remainder > 0) {
      const remainingUsers = users.slice(teamCount * teamSize);
      const teamName = `Team ${teamCount + 1}`;
      
      const team = teamRepository.createTeam(
        teamName,
        currentMonth,
        currentYear,
        currentDay,
        currentHour
      );

      for (const user of remainingUsers) {
        try {
          teamMemberRepository.addMember(team.id, user.id);
        } catch (error) {
          if (!error.message.includes('already a member')) {
            throw error;
          }
        }
      }

      const members = teamMemberRepository.getTeamMembers(team.id);
      const memberNames = members.map(m => `${m.username} (ID: ${m.id})`).join(', ');
      
      teams.push({
        team,
        members: memberNames
      });

      console.log(`✅ ${teamName}: ${memberNames} (${remainder} members)`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n✅ Successfully created ${teams.length} teams!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total teams: ${teams.length}`);
    console.log(`   - Total users: ${users.length}`);
    console.log(`   - Hour: ${currentHour}:00`);
    console.log(`   - Date: ${currentDay}/${currentMonth}/${currentYear}\n`);

    logger.info({
      event: 'test.teams.created',
      teamCount: teams.length,
      userCount: users.length,
      hour: currentHour,
      day: currentDay,
      month: currentMonth,
      year: currentYear
    }, 'Test teams created successfully');

  } catch (error) {
    logger.error({
      event: 'test.teams.creation.failure',
      error: error.message,
      stack: error.stack
    }, 'Failed to create test teams');
    console.error('\n❌ Error creating test teams:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');

// Run script
createTestTeams(force)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

