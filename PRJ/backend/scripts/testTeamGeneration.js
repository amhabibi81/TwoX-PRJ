import '../src/config/env.js';
import db from '../src/config/database.js';
import * as userRepository from '../src/database/repositories/user.repository.js';
import * as teamRepository from '../src/database/repositories/team.repository.js';
import * as teamMemberRepository from '../src/database/repositories/teamMember.repository.js';
import { generateTeamsForHour } from '../src/services/teamGeneration.service.js';
import logger from '../src/utils/logger.js';

/**
 * Get team members for a team
 */
function getTeamMembers(teamId) {
  return teamMemberRepository.getTeamMembers(teamId);
}

/**
 * Check if two users were teammates in a given hour/day/month/year
 */
function wereTeammatesInHour(userId1, userId2, hour, day, month, year) {
  const teams = teamRepository.getTeamsByHour(hour, day, month, year);
  
  for (const team of teams) {
    const members = getTeamMembers(team.id);
    const memberIds = members.map(m => m.id);
    
    if (memberIds.includes(userId1) && memberIds.includes(userId2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find previous teammates for a user across all months
 */
function findPreviousTeammates(userId, excludeMonth, excludeYear) {
  const allTeams = teamRepository.getAllTeams();
  const previousTeammates = new Set();
  
  for (const team of allTeams) {
    // Skip current month/year
    if (team.month === excludeMonth && team.year === excludeYear) {
      continue;
    }
    
    const members = getTeamMembers(team.id);
    const memberIds = members.map(m => m.id);
    
    if (memberIds.includes(userId)) {
      memberIds.forEach(id => {
        if (id !== userId) {
          previousTeammates.add(id);
        }
      });
    }
  }
  
  return Array.from(previousTeammates);
}

/**
 * Test team generation for multiple months
 */
async function testTeamGeneration() {
  try {
    console.log('\n🧪 Testing Team Generation Logic\n');
    console.log('=' .repeat(60));

    // Check if users exist
    const users = userRepository.getAllUsers();
    if (users.length < 3) {
      console.log('\n❌ Not enough users for testing. Need at least 3 users.');
      console.log('Please run: npm run seed:users\n');
      process.exit(1);
    }

    console.log(`\n✅ Found ${users.length} users in database`);
    console.log('User IDs:', users.map(u => u.id).join(', '));

    // Test hours to generate teams for (current hour and next 2 hours)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    const currentHour = currentDate.getHours();
    
    const testHours = [
      { hour: currentHour, day: currentDay, month: currentMonth, year: currentYear },
      { hour: (currentHour + 1) % 24, day: currentDay, month: currentMonth, year: currentYear },
      { hour: (currentHour + 2) % 24, day: currentDay, month: currentMonth, year: currentYear }
    ];

    console.log('\n📅 Generating teams for test hours:');
    testHours.forEach(({ hour, day, month, year }) => {
      console.log(`   - Hour ${hour}:00 on ${day}/${month}/${year}`);
    });

    const generatedTeams = {};

    // Generate teams for each hour
    for (const { hour, day, month, year } of testHours) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`\n📊 Generating teams for ${hour}:00 on ${day}/${month}/${year}...`);

      // Check if teams already exist
      if (teamRepository.teamsExistForHour(hour, day, month, year)) {
        console.log(`⚠️  Teams already exist for ${hour}:00 on ${day}/${month}/${year}, skipping generation`);
        const existingTeams = teamRepository.getTeamsByHour(hour, day, month, year);
        generatedTeams[`${hour}-${day}-${month}-${year}`] = existingTeams;
      } else {
        const result = await generateTeamsForHour({ hour, day, month, year });
        
        if (!result.success) {
          console.error(`❌ Failed to generate teams: ${result.error}`);
          continue;
        }

        console.log(`✅ Generated ${result.teamCount} teams`);
        const teams = teamRepository.getTeamsByHour(hour, day, month, year);
        generatedTeams[`${hour}-${day}-${month}-${year}`] = teams;
      }

      // Display teams for this hour
      const teams = generatedTeams[`${hour}-${day}-${month}-${year}`];
      console.log(`\n📋 Teams for ${hour}:00 on ${day}/${month}/${year}:`);
      
      for (const team of teams) {
        const members = getTeamMembers(team.id);
        const memberUsernames = members.map(m => `${m.username} (ID: ${m.id})`);
        console.log(`   ${team.name}: ${memberUsernames.join(', ')}`);
      }
    }

    // Verify no users are paired together in consecutive hours
    console.log(`\n${'='.repeat(60)}`);
    console.log('\n🔍 Verifying team generation logic...\n');

    let violationsFound = 0;
    const violations = [];

    for (let i = 0; i < testHours.length - 1; i++) {
      const currentHour = testHours[i];
      const nextHour = testHours[i + 1];
      
      const currentKey = `${currentHour.hour}-${currentHour.day}-${currentHour.month}-${currentHour.year}`;
      const nextKey = `${nextHour.hour}-${nextHour.day}-${nextHour.month}-${nextHour.year}`;
      
      const currentTeams = generatedTeams[currentKey] || [];
      const nextTeams = generatedTeams[nextKey] || [];

      // Check each user pair in current hour
      for (const team of currentTeams) {
        const members = getTeamMembers(team.id);
        const memberIds = members.map(m => m.id);

        // Check all pairs in this team
        for (let j = 0; j < memberIds.length; j++) {
          for (let k = j + 1; k < memberIds.length; k++) {
            const userId1 = memberIds[j];
            const userId2 = memberIds[k];
            
            // Check if they're also teammates in next hour
            if (wereTeammatesInHour(userId1, userId2, nextHour.hour, nextHour.day, nextHour.month, nextHour.year)) {
              violationsFound++;
              const user1 = users.find(u => u.id === userId1);
              const user2 = users.find(u => u.id === userId2);
              violations.push({
                users: [user1?.username || userId1, user2?.username || userId2],
                hours: [
                  `${currentHour.hour}:00 on ${currentHour.day}/${currentHour.month}/${currentHour.year}`,
                  `${nextHour.hour}:00 on ${nextHour.day}/${nextHour.month}/${nextHour.year}`
                ]
              });
            }
          }
        }
      }
    }

    // Display results
    if (violationsFound === 0) {
      console.log('✅ SUCCESS: No users were paired together in consecutive hours!');
      console.log('   The team generation logic is working correctly.\n');
    } else {
      console.log(`⚠️  WARNING: Found ${violationsFound} violation(s) where users were paired together in consecutive hours:`);
      violations.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.users[0]} and ${violation.users[1]} were teammates in both ${violation.hours[0]} and ${violation.hours[1]}`);
      });
      console.log('\n   Note: Some violations may be unavoidable if there are not enough users.');
      console.log('   The algorithm tries to avoid previous teammates but may fall back to random assignment when constraints cannot be satisfied.\n');
    }

    // Show statistics
    console.log('📊 Statistics:');
    Object.keys(generatedTeams).forEach(key => {
      const [hour, day, month, year] = key.split('-');
      const teams = generatedTeams[key];
      const totalMembers = teams.reduce((sum, team) => {
        return sum + getTeamMembers(team.id).length;
      }, 0);
      const avgTeamSize = (totalMembers / teams.length).toFixed(2);
      console.log(`   ${hour}:00 on ${day}/${month}/${year}: ${teams.length} teams, ${totalMembers} total members, avg team size: ${avgTeamSize}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Test completed!\n');

  } catch (error) {
    logger.error({
      event: 'test.team.generation.failure',
      error: error.message,
      stack: error.stack
    }, 'Test team generation failed');
    console.error('\n❌ Error during testing:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testTeamGeneration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });


