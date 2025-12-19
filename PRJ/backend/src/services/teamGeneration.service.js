import * as teamRepository from '../database/repositories/team.repository.js';
import * as teamMemberRepository from '../database/repositories/teamMember.repository.js';
import * as userRepository from '../database/repositories/user.repository.js';
import logger from '../utils/logger.js';

// Fisher-Yates shuffle algorithm for truly random shuffling
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate teams for a specific month/year
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {object} options - Options object
 * @param {boolean} options.force - Force regeneration even if teams exist (default: false)
 * @returns {Promise<object>} Result object with success, message, teams, etc.
 */
export const generateTeamsForMonth = async (month, year, options = {}) => {
  const { force = false } = options;
  const TEAM_SIZE = 4;

  try {
    // Validate input
    if (!month || !year) {
      return {
        success: false,
        error: 'Month and year are required',
        statusCode: 400
      };
    }

    if (month < 1 || month > 12) {
      return {
        success: false,
        error: 'Month must be between 1 and 12',
        statusCode: 400
      };
    }

    // Check if teams already exist for this month/year (unless force is true)
    if (!force && teamRepository.teamsExistForMonth(month, year)) {
      return {
        success: false,
        skipped: true,
        error: `Teams already exist for ${month}/${year}. Cannot regenerate teams for the same month.`,
        statusCode: 409,
        month: parseInt(month),
        year: parseInt(year)
      };
    }

    // Get all active users
    const allUsers = userRepository.getAllUsers();
    const users = allUsers.map(u => ({ id: u.id }));

    // Validate minimum users
    if (users.length < 3) {
      return {
        success: false,
        error: 'Not enough users. Need at least 3 users to create teams.',
        statusCode: 400
      };
    }

    // If force is true and teams exist, we would need to delete existing teams first
    // For now, we'll skip if teams exist (safe re-run behavior)
    if (force && teamRepository.teamsExistForMonth(month, year)) {
      // Note: Force regeneration not implemented per requirements (safe re-run only)
      return {
        success: false,
        skipped: true,
        error: `Teams already exist for ${month}/${year}. Safe re-run: skipping generation.`,
        statusCode: 409,
        month: parseInt(month),
        year: parseInt(year)
      };
    }

    // Shuffle users using Fisher-Yates algorithm
    const shuffledUsers = shuffleArray(users);

    // Calculate team distribution
    const fullTeamsCount = Math.floor(users.length / TEAM_SIZE);
    const remainder = users.length % TEAM_SIZE;

    const teams = [];
    let userIndex = 0;

    // Create full teams of 4
    for (let i = 0; i < fullTeamsCount; i++) {
      const teamName = `Team ${i + 1}`;
      const team = teamRepository.createTeam(teamName, month, year);
      teams.push(team);

      // Assign 4 users to team
      for (let j = 0; j < TEAM_SIZE; j++) {
        teamMemberRepository.addMember(team.id, shuffledUsers[userIndex].id);
        userIndex++;
      }
    }

    // Handle remainder users
    if (remainder > 0) {
      if (remainder < 3) {
        // Distribute 1-2 remaining users to existing teams
        for (let i = 0; i < remainder; i++) {
          const teamIndex = i % teams.length;
          teamMemberRepository.addMember(teams[teamIndex].id, shuffledUsers[userIndex].id);
          userIndex++;
        }
      } else if (remainder >= 3 && remainder <= 5) {
        // Create last team with 3-5 members
        const teamName = `Team ${teams.length + 1}`;
        const team = teamRepository.createTeam(teamName, month, year);
        teams.push(team);

        for (let i = 0; i < remainder; i++) {
          teamMemberRepository.addMember(team.id, shuffledUsers[userIndex].id);
          userIndex++;
        }
      } else {
        // remainder > 5: Create additional team(s) of 4, then handle new remainder
        while (userIndex < shuffledUsers.length) {
          const remainingUsers = shuffledUsers.length - userIndex;
          
          if (remainingUsers >= 3 && remainingUsers <= 5) {
            // Create last team with remaining 3-5 users
            const teamName = `Team ${teams.length + 1}`;
            const team = teamRepository.createTeam(teamName, month, year);
            teams.push(team);

            while (userIndex < shuffledUsers.length) {
              teamMemberRepository.addMember(team.id, shuffledUsers[userIndex].id);
              userIndex++;
            }
          } else if (remainingUsers > 5) {
            // Create another team of 4
            const teamName = `Team ${teams.length + 1}`;
            const team = teamRepository.createTeam(teamName, month, year);
            teams.push(team);

            for (let j = 0; j < TEAM_SIZE && userIndex < shuffledUsers.length; j++) {
              teamMemberRepository.addMember(team.id, shuffledUsers[userIndex].id);
              userIndex++;
            }
          } else {
            // remainingUsers < 3: Distribute to existing teams
            while (userIndex < shuffledUsers.length) {
              const teamIndex = (userIndex - (shuffledUsers.length - remainingUsers)) % teams.length;
              teamMemberRepository.addMember(teams[teamIndex].id, shuffledUsers[userIndex].id);
              userIndex++;
            }
          }
        }
      }
    }

    // Get member counts for each team
    const teamsWithMembers = teams.map(team => {
      const memberCount = teamMemberRepository.getMemberCount(team.id);
      return {
        id: team.id,
        name: team.name,
        month: team.month,
        year: team.year,
        memberCount
      };
    });

    logger.info({
      event: 'team.generation.service.success',
      month: parseInt(month),
      year: parseInt(year),
      teamCount: teams.length,
      totalUsers: users.length
    }, `Generated ${teams.length} teams for ${month}/${year}`);

    return {
      success: true,
      message: `Generated ${teams.length} teams for ${month}/${year}`,
      month: parseInt(month),
      year: parseInt(year),
      teams: teamsWithMembers,
      teamCount: teams.length
    };
  } catch (error) {
    logger.error({
      event: 'team.generation.service.error',
      month: parseInt(month),
      year: parseInt(year),
      error: error.message,
      stack: error.stack
    }, 'Generate teams service error');
    
    // Handle specific database errors
    if (error.message && error.message.includes('already exists')) {
      return {
        success: false,
        error: error.message,
        statusCode: 409
      };
    }
    
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500,
      details: error.message
    };
  }
};
