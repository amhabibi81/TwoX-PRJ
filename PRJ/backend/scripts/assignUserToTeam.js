import '../src/config/env.js';
import * as userRepository from '../src/database/repositories/user.repository.js';
import * as teamRepository from '../src/database/repositories/team.repository.js';
import * as teamMemberRepository from '../src/database/repositories/teamMember.repository.js';
import logger from '../src/utils/logger.js';

/**
 * Assign a user to a team for the current hour
 * @param {string} email - User email to assign
 */
async function assignUserToTeam(email) {
  try {
    console.log('\n👤 Assigning User to Team\n');
    console.log('='.repeat(60));

    // Find user by email
    const user = userRepository.findUserByEmail(email);
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found.`);
      console.log('\n💡 Tip: Make sure the user exists in the database.');
      console.log('   You can create users using: npm run seed:users\n');
      process.exit(1);
    }

    console.log(`\n✅ Found user: ${user.username} (ID: ${user.id})`);
    console.log(`   Email: ${user.email}\n`);

    // Get current date/time
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`📅 Current time: ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}\n`);

    // Check if user is already in a team for this hour
    const existingTeams = teamRepository.getTeamsByHour(currentHour, currentDay, currentMonth, currentYear);
    let userTeam = null;
    
    for (const team of existingTeams) {
      if (teamMemberRepository.isMember(team.id, user.id)) {
        userTeam = team;
        break;
      }
    }

    if (userTeam) {
      const members = teamMemberRepository.getTeamMembers(userTeam.id);
      console.log(`✅ User is already assigned to team: ${userTeam.name}`);
      console.log(`\n📊 Team Details:`);
      console.log(`   - Team ID: ${userTeam.id}`);
      console.log(`   - Team Name: ${userTeam.name}`);
      console.log(`   - Members (${members.length}):`);
      members.forEach(m => {
        const marker = m.id === user.id ? ' ← YOU' : '';
        console.log(`     • ${m.username} (${m.email})${marker}`);
      });
      console.log('');
      return;
    }

    // Check if teams exist for this hour
    if (existingTeams.length === 0) {
      console.log('⚠️  No teams found for this hour.');
      console.log('   Creating teams first...\n');
      
      // Ensure we have enough users (at least 4 for teams)
      const allUsers = userRepository.getAllUsers();
      
      if (allUsers.length < 4) {
        console.log(`⚠️  Only ${allUsers.length} user(s) found. Need at least 4 users for teams.`);
        console.log('   Seeding mock users...\n');
        
        // Import seed function
        const bcrypt = (await import('bcrypt')).default;
        const DEFAULT_PASSWORD = 'test123';
        const USER_COUNT = 20;
        
        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        const createdUsers = [];
        
        for (let i = 1; i <= USER_COUNT; i++) {
          const username = `user${i}`;
          const email = `user${i}@test.com`;
          
          try {
            const newUser = userRepository.createUser(username, email, passwordHash);
            createdUsers.push(newUser);
          } catch (error) {
            if (error.message.includes('already exists')) {
              const existingUser = userRepository.findUserByUsername(username);
              if (existingUser) {
                createdUsers.push(existingUser);
              }
            }
          }
        }
        
        console.log(`✅ Ensured ${allUsers.length + createdUsers.length} users exist\n`);
      }
      
      // Now create teams for current hour
      const allUsersNow = userRepository.getAllUsers();
      const teamSize = 4;
      const teamCount = Math.floor(allUsersNow.length / teamSize);
      
      console.log(`Creating ${teamCount} teams with ${teamSize} members each...\n`);
      
      for (let i = 0; i < teamCount; i++) {
        const teamName = `Team ${i + 1}`;
        const startIdx = i * teamSize;
        const endIdx = Math.min(startIdx + teamSize, allUsersNow.length);
        const teamUserIds = allUsersNow.slice(startIdx, endIdx).map(u => u.id);
        
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
        
        console.log(`✅ Created ${teamName} with ${teamUserIds.length} members`);
      }
      
      // Handle remainder users
      const remainder = allUsersNow.length % teamSize;
      if (remainder > 0) {
        const remainingUsers = allUsersNow.slice(teamCount * teamSize);
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
        
        console.log(`✅ Created ${teamName} with ${remainder} members\n`);
      }
      
      // Refresh teams list
      const updatedTeams = teamRepository.getTeamsByHour(currentHour, currentDay, currentMonth, currentYear);
      existingTeams.push(...updatedTeams);
    }

    // Find a team with available space (prefer teams with fewer members)
    let targetTeam = null;
    let minMembers = Infinity;

    for (const team of existingTeams) {
      const memberCount = teamMemberRepository.getMemberCount(team.id);
      
      // Prefer teams with fewer members, but not full (assuming max 4-5 per team)
      if (memberCount < 5 && memberCount < minMembers) {
        minMembers = memberCount;
        targetTeam = team;
      }
    }

    // If all teams are full, use the first team
    if (!targetTeam) {
      targetTeam = existingTeams[0];
      console.log('⚠️  All teams appear to be full. Assigning to first team.\n');
    }

    // Add user to team
    try {
      teamMemberRepository.addMember(targetTeam.id, user.id);
      
      const members = teamMemberRepository.getTeamMembers(targetTeam.id);
      
      console.log(`✅ Successfully assigned user to team: ${targetTeam.name}`);
      console.log(`\n📊 Team Details:`);
      console.log(`   - Team ID: ${targetTeam.id}`);
      console.log(`   - Team Name: ${targetTeam.name}`);
      console.log(`   - Members (${members.length}):`);
      members.forEach(m => {
        const marker = m.id === user.id ? ' ← YOU' : '';
        console.log(`     • ${m.username} (${m.email})${marker}`);
      });
      console.log('');

      logger.info({
        event: 'user.assigned.to.team',
        userId: user.id,
        teamId: targetTeam.id,
        hour: currentHour,
        day: currentDay,
        month: currentMonth,
        year: currentYear
      }, 'User assigned to team successfully');

    } catch (error) {
      if (error.message.includes('already a member')) {
        console.log(`✅ User is already a member of team: ${targetTeam.name}\n`);
      } else {
        throw error;
      }
    }

  } catch (error) {
    logger.error({
      event: 'user.assignment.failure',
      email,
      error: error.message,
      stack: error.stack
    }, 'Failed to assign user to team');
    console.error('\n❌ Error assigning user to team:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address.');
  console.log('\nUsage: node scripts/assignUserToTeam.js <email>');
  console.log('Example: node scripts/assignUserToTeam.js amhabibi81@gmail.com\n');
  process.exit(1);
}

// Run script
assignUserToTeam(email)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

