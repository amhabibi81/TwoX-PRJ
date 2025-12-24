import '../src/config/env.js';
import * as userRepository from '../src/database/repositories/user.repository.js';
import * as teamRepository from '../src/database/repositories/team.repository.js';
import * as teamMemberRepository from '../src/database/repositories/teamMember.repository.js';
import logger from '../src/utils/logger.js';

/**
 * Move a user to a different team (remove from old team, add to new team)
 * @param {string} email - User email
 * @param {number} targetTeamId - Target team ID
 */
async function moveUserToTeam(email, targetTeamId) {
  try {
    console.log('\n🔄 Moving User to Team\n');
    console.log('='.repeat(60));

    // Find user by email
    const user = userRepository.findUserByEmail(email);
    
    if (!user) {
      console.error(`❌ User with email "${email}" not found.`);
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

    // Find user's current team for this hour
    const userTeams = teamRepository.getUserTeamsByHour(user.id, currentHour, currentDay, currentMonth, currentYear);
    
    if (userTeams.length > 0) {
      const currentTeam = userTeams[0];
      console.log(`📋 Current team: ${currentTeam.name} (ID: ${currentTeam.id})`);
      
      // Remove from current team
      teamMemberRepository.removeMember(currentTeam.id, user.id);
      console.log(`   ✅ Removed from current team\n`);
    }

    // Validate target team exists
    const targetTeam = teamRepository.getTeamById(targetTeamId);
    if (!targetTeam) {
      console.error(`❌ Team with ID ${targetTeamId} not found.`);
      process.exit(1);
    }

    // Check if team is for current hour
    if (targetTeam.hour !== currentHour || targetTeam.day !== currentDay || 
        targetTeam.month !== currentMonth || targetTeam.year !== currentYear) {
      console.error(`❌ Target team is not for the current hour.`);
      console.error(`   Team hour: ${targetTeam.hour}:00 on ${targetTeam.day}/${targetTeam.month}/${targetTeam.year}`);
      console.error(`   Current hour: ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}`);
      process.exit(1);
    }

    // Add to target team
    try {
      teamMemberRepository.addMember(targetTeamId, user.id);
      
      const members = teamMemberRepository.getTeamMembers(targetTeamId);
      
      console.log(`✅ Successfully moved user to team: ${targetTeam.name}`);
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
        event: 'user.moved.to.team',
        userId: user.id,
        teamId: targetTeamId,
        hour: currentHour,
        day: currentDay,
        month: currentMonth,
        year: currentYear
      }, 'User moved to team successfully');

    } catch (error) {
      if (error.message.includes('already a member')) {
        console.log(`✅ User is already a member of team: ${targetTeam.name}\n`);
      } else {
        throw error;
      }
    }

  } catch (error) {
    logger.error({
      event: 'user.move.failure',
      email,
      error: error.message,
      stack: error.stack
    }, 'Failed to move user to team');
    console.error('\n❌ Error moving user to team:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get arguments from command line
const email = process.argv[2];
const targetTeamId = parseInt(process.argv[3]);

if (!email || !targetTeamId) {
  console.error('❌ Please provide email and target team ID.');
  console.log('\nUsage: node scripts/moveUserToTeam.js <email> <teamId>');
  console.log('Example: node scripts/moveUserToTeam.js amhabibi81@gmail.com 1\n');
  process.exit(1);
}

// Run script
moveUserToTeam(email, targetTeamId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

