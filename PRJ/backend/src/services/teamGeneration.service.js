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
 * Generate teams for the current hour (hourly team generation)
 * @param {object} options - Options object
 * @param {boolean} options.force - Force regeneration even if teams exist (default: false)
 * @param {number} options.hour - Optional hour (0-23), defaults to current hour
 * @param {number} options.day - Optional day (1-31), defaults to current day
 * @param {number} options.month - Optional month (1-12), defaults to current month
 * @param {number} options.year - Optional year, defaults to current year
 * @returns {Promise<object>} Result object with success, message, teams, etc.
 */
export const generateTeamsForHour = async (options = {}) => {
  const { force = false, hour = null, day = null, month = null, year = null } = options;
  const TEAM_SIZE = 4;

  try {
    // Get current date/time or use provided values
    const now = new Date();
    const currentHour = hour !== null ? hour : now.getHours();
    const currentDay = day !== null ? day : now.getDate();
    const currentMonth = month !== null ? month : now.getMonth() + 1;
    const currentYear = year !== null ? year : now.getFullYear();

    // Validate input
    if (currentHour < 0 || currentHour > 23) {
      return {
        success: false,
        error: 'Hour must be between 0 and 23',
        statusCode: 400
      };
    }

    if (currentDay < 1 || currentDay > 31) {
      return {
        success: false,
        error: 'Day must be between 1 and 31',
        statusCode: 400
      };
    }

    if (currentMonth < 1 || currentMonth > 12) {
      return {
        success: false,
        error: 'Month must be between 1 and 12',
        statusCode: 400
      };
    }

    // Check if teams already exist for this hour (unless force is true)
    if (!force && teamRepository.teamsExistForHour(currentHour, currentDay, currentMonth, currentYear)) {
      return {
        success: false,
        skipped: true,
        error: `Teams already exist for ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}. Cannot regenerate teams for the same hour.`,
        statusCode: 409,
        hour: currentHour,
        day: currentDay,
        month: currentMonth,
        year: currentYear
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
    if (force && teamRepository.teamsExistForHour(currentHour, currentDay, currentMonth, currentYear)) {
      // Note: Force regeneration not implemented per requirements (safe re-run only)
      return {
        success: false,
        skipped: true,
        error: `Teams already exist for ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}. Safe re-run: skipping generation.`,
        statusCode: 409,
        hour: currentHour,
        day: currentDay,
        month: currentMonth,
        year: currentYear
      };
    }

    // Get previous team pairings to avoid (check teams from last hour to avoid immediate re-pairing)
    // We'll check teams created in the last hour to avoid pairing users who were just teammates
    const previousPairings = teamMemberRepository.getPreviousTeamPairings(
      users.map(u => u.id),
      currentHour,
      currentDay,
      currentMonth,
      currentYear
    );

    // Helper function to check if two users were teammates before
    const wereTeammates = (userId1, userId2) => {
      const pair = userId1 < userId2 ? `${userId1}-${userId2}` : `${userId2}-${userId1}`;
      return previousPairings.has(pair);
    };

    // Helper function to find users who haven't been teammates with current team members
    const findNonConflictingUser = (availableUsers, currentTeamUserIds) => {
      if (currentTeamUserIds.length === 0) {
        // First member, any user is fine
        return availableUsers.length > 0 ? availableUsers[0] : null;
      }

      // Try to find a user who hasn't been teammates with any current team member
      for (const user of availableUsers) {
        let hasConflict = false;
        for (const teamUserId of currentTeamUserIds) {
          if (wereTeammates(user.id, teamUserId)) {
            hasConflict = true;
            break;
          }
        }
        if (!hasConflict) {
          return user;
        }
      }

      // If no non-conflicting user found, return first available (fallback)
      return availableUsers.length > 0 ? availableUsers[0] : null;
    };

    // Shuffle users using Fisher-Yates algorithm
    const shuffledUsers = shuffleArray(users);
    const availableUsers = [...shuffledUsers];

    // Calculate team distribution
    const fullTeamsCount = Math.floor(users.length / TEAM_SIZE);
    const remainder = users.length % TEAM_SIZE;

    const teams = [];
    let userIndex = 0;

    // Create full teams of 4, trying to avoid previous teammates
    for (let i = 0; i < fullTeamsCount; i++) {
      const teamName = `Team ${i + 1}`;
      const team = teamRepository.createTeam(teamName, currentMonth, currentYear, currentDay, currentHour);
      teams.push(team);

      const teamUserIds = [];
      
      // Assign 4 users to team, avoiding previous teammates when possible
      for (let j = 0; j < TEAM_SIZE && userIndex < availableUsers.length; j++) {
        const currentTeamUserIds = teamUserIds.map(u => u.id);
        const selectedUser = findNonConflictingUser(
          availableUsers.slice(userIndex),
          currentTeamUserIds
        );

        if (selectedUser) {
          // Find index of selected user in availableUsers
          const selectedIndex = availableUsers.findIndex(u => u.id === selectedUser.id);
          if (selectedIndex >= userIndex) {
            // Swap selected user to current position
            [availableUsers[userIndex], availableUsers[selectedIndex]] = 
              [availableUsers[selectedIndex], availableUsers[userIndex]];
          }
          
          teamMemberRepository.addMember(team.id, availableUsers[userIndex].id);
          teamUserIds.push(availableUsers[userIndex]);
          userIndex++;
        } else {
          // Fallback: just use next user
          teamMemberRepository.addMember(team.id, availableUsers[userIndex].id);
          teamUserIds.push(availableUsers[userIndex]);
          userIndex++;
        }
      }
    }

    // Handle remainder users
    if (userIndex < availableUsers.length) {
      const remainingCount = availableUsers.length - userIndex;
      
      if (remainingCount < 3) {
        // Distribute 1-2 remaining users to existing teams, avoiding conflicts when possible
        for (let i = 0; i < remainingCount && userIndex < availableUsers.length; i++) {
          // Find team with least conflicts
          let bestTeamIndex = 0;
          let minConflicts = Infinity;
          
          for (let t = 0; t < teams.length; t++) {
            const teamMembers = teamMemberRepository.getTeamMembers(teams[t].id);
            const teamUserIds = teamMembers.map(m => m.id);
            let conflicts = 0;
            
            for (const teamUserId of teamUserIds) {
              if (wereTeammates(availableUsers[userIndex].id, teamUserId)) {
                conflicts++;
              }
            }
            
            if (conflicts < minConflicts) {
              minConflicts = conflicts;
              bestTeamIndex = t;
            }
          }
          
          teamMemberRepository.addMember(teams[bestTeamIndex].id, availableUsers[userIndex].id);
          userIndex++;
        }
      } else if (remainingCount >= 3 && remainingCount <= 5) {
        // Create last team with 3-5 members, avoiding conflicts
        const teamName = `Team ${teams.length + 1}`;
        const team = teamRepository.createTeam(teamName, currentMonth, currentYear, currentDay, currentHour);
        teams.push(team);

        const teamUserIds = [];
        while (userIndex < availableUsers.length) {
          const currentTeamUserIds = teamUserIds.map(u => u.id);
          const selectedUser = findNonConflictingUser(
            availableUsers.slice(userIndex),
            currentTeamUserIds
          );

          if (selectedUser) {
            const selectedIndex = availableUsers.findIndex(u => u.id === selectedUser.id);
            if (selectedIndex >= userIndex) {
              [availableUsers[userIndex], availableUsers[selectedIndex]] = 
                [availableUsers[selectedIndex], availableUsers[userIndex]];
            }
          }
          
          teamMemberRepository.addMember(team.id, availableUsers[userIndex].id);
          teamUserIds.push(availableUsers[userIndex]);
          userIndex++;
        }
      } else {
        // remainder > 5: Create additional team(s) of 4, then handle new remainder
        while (userIndex < availableUsers.length) {
          const remainingUsers = availableUsers.length - userIndex;
          
          if (remainingUsers >= 3 && remainingUsers <= 5) {
            // Create last team with remaining 3-5 users
            const teamName = `Team ${teams.length + 1}`;
            const team = teamRepository.createTeam(teamName, currentMonth, currentYear, currentDay, currentHour);
            teams.push(team);

            const teamUserIds = [];
            while (userIndex < availableUsers.length) {
              const currentTeamUserIds = teamUserIds.map(u => u.id);
              const selectedUser = findNonConflictingUser(
                availableUsers.slice(userIndex),
                currentTeamUserIds
              );

              if (selectedUser) {
                const selectedIndex = availableUsers.findIndex(u => u.id === selectedUser.id);
                if (selectedIndex >= userIndex) {
                  [availableUsers[userIndex], availableUsers[selectedIndex]] = 
                    [availableUsers[selectedIndex], availableUsers[userIndex]];
                }
              }
              
              teamMemberRepository.addMember(team.id, availableUsers[userIndex].id);
              teamUserIds.push(availableUsers[userIndex]);
              userIndex++;
            }
          } else if (remainingUsers > 5) {
            // Create another team of 4
            const teamName = `Team ${teams.length + 1}`;
            const team = teamRepository.createTeam(teamName, currentMonth, currentYear, currentDay, currentHour);
            teams.push(team);

            const teamUserIds = [];
            for (let j = 0; j < TEAM_SIZE && userIndex < availableUsers.length; j++) {
              const currentTeamUserIds = teamUserIds.map(u => u.id);
              const selectedUser = findNonConflictingUser(
                availableUsers.slice(userIndex),
                currentTeamUserIds
              );

              if (selectedUser) {
                const selectedIndex = availableUsers.findIndex(u => u.id === selectedUser.id);
                if (selectedIndex >= userIndex) {
                  [availableUsers[userIndex], availableUsers[selectedIndex]] = 
                    [availableUsers[selectedIndex], availableUsers[userIndex]];
                }
              }
              
              teamMemberRepository.addMember(team.id, availableUsers[userIndex].id);
              teamUserIds.push(availableUsers[userIndex]);
              userIndex++;
            }
          } else {
            // remainingUsers < 3: Distribute to existing teams
            while (userIndex < availableUsers.length) {
              // Find team with least conflicts
              let bestTeamIndex = 0;
              let minConflicts = Infinity;
              
              for (let t = 0; t < teams.length; t++) {
                const teamMembers = teamMemberRepository.getTeamMembers(teams[t].id);
                const teamUserIds = teamMembers.map(m => m.id);
                let conflicts = 0;
                
                for (const teamUserId of teamUserIds) {
                  if (wereTeammates(availableUsers[userIndex].id, teamUserId)) {
                    conflicts++;
                  }
                }
                
                if (conflicts < minConflicts) {
                  minConflicts = conflicts;
                  bestTeamIndex = t;
                }
              }
              
              teamMemberRepository.addMember(teams[bestTeamIndex].id, availableUsers[userIndex].id);
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
      hour: currentHour,
      day: currentDay,
      month: currentMonth,
      year: currentYear,
      teamCount: teams.length,
      totalUsers: users.length
    }, `Generated ${teams.length} teams for ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}`);

    return {
      success: true,
      message: `Generated ${teams.length} teams for ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}`,
      hour: currentHour,
      day: currentDay,
      month: currentMonth,
      year: currentYear,
      teams: teamsWithMembers,
      teamCount: teams.length
    };
  } catch (error) {
    logger.error({
      event: 'team.generation.service.error',
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

/**
 * Generate teams for a specific month/year (backward compatibility)
 * This now generates teams for the current hour within that month/year
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @param {object} options - Options object
 * @param {boolean} options.force - Force regeneration even if teams exist (default: false)
 * @returns {Promise<object>} Result object with success, message, teams, etc.
 */
export const generateTeamsForMonth = async (month, year, options = {}) => {
  const now = new Date();
  return generateTeamsForHour({
    ...options,
    month,
    year,
    day: now.getDate(),
    hour: now.getHours()
  });
};
