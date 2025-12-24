import * as teamRepository from '../database/repositories/team.repository.js';
import * as teamMemberRepository from '../database/repositories/teamMember.repository.js';
import * as userRepository from '../database/repositories/user.repository.js';
import * as answerRepository from '../database/repositories/answer.repository.js';
import * as questionRepository from '../database/repositories/question.repository.js';
import * as evaluationScoringService from '../services/evaluationScoring.service.js';
import db from '../config/database.js';
import { generateTeamsForMonth } from '../services/teamGeneration.service.js';
import logger from '../utils/logger.js';

export const generateTeams = async (req, res) => {
  try {
    const { month, year } = req.body;
    const userId = req.user?.id;

    // Use hourly generation (backward compatible with month/year)
    const result = await generateTeamsForMonth(month, year);

    if (!result.success) {
      if (result.skipped) {
        logger.info({
          event: 'team.generation.skipped',
          month,
          year,
          userId,
          source: 'manual',
          reason: 'teams_already_exist'
        }, 'Team generation skipped: teams already exist');
      } else {
        logger.warn({
          event: 'team.generation.failure',
          month,
          year,
          userId,
          source: 'manual',
          reason: result.error
        }, 'Team generation failed');
      }
      return res.status(result.statusCode).json({ 
        error: result.error,
        skipped: result.skipped || false
      });
    }

    logger.info({
      event: 'team.generation.success',
      month: result.month,
      year: result.year,
      teamCount: result.teamCount,
      userId,
      source: 'manual'
    }, 'Team generation successful');

    res.json({
      message: result.message,
      month: result.month,
      year: result.year,
      teams: result.teams
    });
  } catch (error) {
    logger.error({
      event: 'team.generation.failure',
      month: req.body.month,
      year: req.body.year,
      userId: req.user?.id,
      source: 'manual',
      reason: 'internal_error',
      error: error.message
    }, 'Generate teams error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Admin endpoint for manual team generation
 * Accepts optional month and year query parameters (defaults to next month)
 */
export const generateTeamsAdmin = async (req, res) => {
  try {
    let { month, year } = req.query;

    // If month/year not provided, default to next month
    if (!month || !year) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Calculate next month
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear = currentYear + 1;
      }
      
      month = nextMonth;
      year = nextYear;
    }

    // Parse and validate
    month = parseInt(month, 10);
    year = parseInt(year, 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month. Must be between 1 and 12.' });
    }

    if (isNaN(year) || year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Invalid year.' });
    }

    const result = await generateTeamsForMonth(month, year);

    if (!result.success) {
      // If teams already exist, return 200 OK with message (safe re-run)
      if (result.skipped) {
        logger.info({
          event: 'team.generation.skipped',
          hour: result.hour,
          day: result.day,
          month: result.month,
          year: result.year,
          userId: req.user?.id,
          source: 'admin_manual',
          reason: 'teams_already_exist'
        }, 'Admin team generation skipped: teams already exist');
        return res.status(200).json({
          message: result.error,
          skipped: true,
          hour: result.hour,
          day: result.day,
          month: result.month,
          year: result.year
        });
      }
      
      logger.warn({
        event: 'team.generation.failure',
        hour: result.hour,
        day: result.day,
        month: result.month,
        year: result.year,
        userId: req.user?.id,
        source: 'admin_manual',
        reason: result.error
      }, 'Admin team generation failed');
      return res.status(result.statusCode).json({ 
        error: result.error
      });
    }

    logger.info({
      event: 'team.generation.success',
      hour: result.hour,
      day: result.day,
      month: result.month,
      year: result.year,
      teamCount: result.teamCount,
      userId: req.user?.id,
      source: 'admin_manual'
    }, 'Admin team generation successful');

    res.json({
      message: result.message,
      hour: result.hour,
      day: result.day,
      month: result.month,
      year: result.year,
      teams: result.teams,
      teamCount: result.teamCount
    });
  } catch (error) {
    logger.error({
      event: 'team.generation.failure',
      month: req.query.month,
      year: req.query.year,
      userId: req.user?.id,
      source: 'admin_manual',
      reason: 'internal_error',
      error: error.message
    }, 'Admin generate teams error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyTeam = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const hour = currentDate.getHours();
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const year = currentDate.getFullYear();

    // Check if teams exist for current hour
    const teamsExist = teamRepository.teamsExistForHour(hour, day, month, year);
    
    if (!teamsExist) {
      return res.status(404).json({
        team: null,
        error: 'Teams have not been generated for this hour',
        hour,
        day,
        month,
        year
      });
    }

    // Get user's teams for current hour
    const teams = teamRepository.getUserTeamsByHour(userId, hour, day, month, year);

    if (teams.length === 0) {
      return res.status(404).json({
        team: null,
        error: 'You have not been assigned to a team for this hour',
        hour,
        day,
        month,
        year
      });
    }

    // Get team members for the first team (assuming user is in one team per hour)
    const team = teams[0];
    const members = teamMemberRepository.getTeamMembers(team.id);

    res.json({
      team: {
        id: team.id,
        name: team.name,
        hour: team.hour,
        day: team.day,
        month: team.month,
        year: team.year,
        members: members.map(m => ({
          id: m.id,
          username: m.username,
          email: m.email,
          joined_at: m.joined_at
        }))
      }
    });
  } catch (error) {
    logger.error({
      event: 'team.retrieval.failure',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Get my team error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a team manually
 * POST /teams
 * Body: { name, month, year, memberIds? }
 */
export const createTeam = async (req, res) => {
  try {
    const { name, month, year, day, hour, memberIds = [] } = req.body;
    const userId = req.user?.id;

    // Use current hour/day if not provided
    const now = new Date();
    const currentHour = hour !== null && hour !== undefined ? hour : now.getHours();
    const currentDay = day !== null && day !== undefined ? day : now.getDate();
    const currentMonth = month || now.getMonth() + 1;
    const currentYear = year || now.getFullYear();

    // Validate team doesn't already exist
    if (teamRepository.teamsExistForHour(currentHour, currentDay, currentMonth, currentYear)) {
      const existingTeams = teamRepository.getTeamsByHour(currentHour, currentDay, currentMonth, currentYear);
      const teamWithSameName = existingTeams.find(t => t.name === name);
      if (teamWithSameName) {
        return res.status(409).json({ 
          error: 'Team with this name already exists for this hour' 
        });
      }
    }

    // Validate all member IDs exist
    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        const user = userRepository.findUserById(memberId);
        if (!user) {
          return res.status(400).json({ 
            error: `User with ID ${memberId} does not exist` 
          });
        }
      }
    }

    // Create team
    const team = teamRepository.createTeam(name, currentMonth, currentYear, currentDay, currentHour);

    // Add members if provided
    const addedMembers = [];
    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        try {
          teamMemberRepository.addMember(team.id, memberId);
          addedMembers.push(memberId);
        } catch (error) {
          if (error.message.includes('already a member')) {
            logger.warn({
              event: 'team.member.add.duplicate',
              teamId: team.id,
              userId: memberId,
              adminUserId: userId
            }, 'User already a member of team');
          } else {
            throw error;
          }
        }
      }
    }

    // Get team with members
    const members = teamMemberRepository.getTeamMembers(team.id);

    logger.info({
      event: 'team.creation.success',
      teamId: team.id,
      name,
      hour: currentHour,
      day: currentDay,
      month: currentMonth,
      year: currentYear,
      memberCount: members.length,
      adminUserId: userId
    }, 'Team created successfully');

    res.status(201).json({
      message: 'Team created successfully',
      team: {
        id: team.id,
        name: team.name,
        hour: team.hour,
        day: team.day,
        month: team.month,
        year: team.year,
        members: members.map(m => ({
          id: m.id,
          username: m.username,
          email: m.email,
          joined_at: m.joined_at
        }))
      }
    });
  } catch (error) {
    logger.error({
      event: 'team.creation.failure',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Create team error');
    
    if (error.message && error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add a member to a team
 * POST /teams/:teamId/members
 * Body: { userId }
 */
export const addTeamMember = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;
    const adminUserId = req.user?.id;

    // Validate team exists
    const team = teamRepository.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Validate user exists
    const user = userRepository.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    if (teamMemberRepository.isMember(teamId, userId)) {
      return res.status(409).json({ error: 'User is already a member of this team' });
    }

    // Add member
    teamMemberRepository.addMember(teamId, userId);

    // Get updated team with members
    const members = teamMemberRepository.getTeamMembers(teamId);

    logger.info({
      event: 'team.member.add.success',
      teamId,
      userId,
      adminUserId
    }, 'Team member added successfully');

    res.json({
      message: 'Member added to team successfully',
      team: {
        id: team.id,
        name: team.name,
        month: team.month,
        year: team.year,
        members: members.map(m => ({
          id: m.id,
          username: m.username,
          email: m.email,
          joined_at: m.joined_at
        }))
      }
    });
  } catch (error) {
    logger.error({
      event: 'team.member.add.failure',
      teamId: req.params.teamId,
      userId: req.body.userId,
      adminUserId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Add team member error');
    
    if (error.message && error.message.includes('already a member')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Remove a member from a team
 * DELETE /teams/:teamId/members/:userId
 */
export const removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const adminUserId = req.user?.id;

    // Validate team exists
    const team = teamRepository.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Validate user exists
    const user = userRepository.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is a member
    if (!teamMemberRepository.isMember(teamId, userId)) {
      return res.status(404).json({ error: 'User is not a member of this team' });
    }

    // Remove member
    teamMemberRepository.removeMember(teamId, userId);

    // Get updated team with members
    const members = teamMemberRepository.getTeamMembers(teamId);

    logger.info({
      event: 'team.member.remove.success',
      teamId,
      userId,
      adminUserId
    }, 'Team member removed successfully');

    res.json({
      message: 'Member removed from team successfully',
      team: {
        id: team.id,
        name: team.name,
        month: team.month,
        year: team.year,
        members: members.map(m => ({
          id: m.id,
          username: m.username,
          email: m.email,
          joined_at: m.joined_at
        }))
      }
    });
  } catch (error) {
    logger.error({
      event: 'team.member.remove.failure',
      teamId: req.params.teamId,
      userId: req.params.userId,
      adminUserId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Remove team member error');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all teams with scores for current hour
 * GET /teams/all-with-scores
 */
export const getAllTeamsWithScores = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const hour = currentDate.getHours();
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Get all teams for current hour
    const teams = teamRepository.getTeamsByHour(hour, day, month, year);

    if (teams.length === 0) {
      return res.json({
        hour,
        day,
        month,
        year,
        teams: [],
        winner: null,
        message: 'No teams found for this hour'
      });
    }

    // Get questions for current month/year
    const questions = questionRepository.getQuestionsByMonth(month, year);
    const questionCount = questions.length;

    // Check if 360-degree evaluations are enabled
    const sampleAnswer = db.prepare('SELECT source_type FROM answers LIMIT 1').get();
    const has360Evaluations = sampleAnswer && sampleAnswer.source_type !== null;

    // Calculate scores for each team
    const teamsWithScores = teams.map(team => {
      let totalScore = 0;
      let answerCount = 0;
      let weightedScore = 0;
      let usesWeightedScoring = false;

      if (has360Evaluations && questionCount > 0) {
        // Use weighted scoring for 360-degree evaluations
        try {
          const questionIds = questions.map(q => q.id);
          let teamWeightedTotal = 0;
          let questionsWithScores = 0;

          // Calculate weighted score for each team member across all questions
          const members = teamMemberRepository.getTeamMembers(team.id);
          
          for (const member of members) {
            const userScore = evaluationScoringService.calculateTotalWeightedScoreForUser(
              member.id,
              team.id,
              questionIds
            );
            
            if (userScore.totalWeightedScore > 0) {
              teamWeightedTotal += userScore.totalWeightedScore;
              questionsWithScores += userScore.questionScores.filter(q => q.weightedScore > 0).length;
            }
          }

          weightedScore = teamWeightedTotal;
          totalScore = weightedScore; // Use weighted score as total
          answerCount = questionsWithScores;
          usesWeightedScoring = true;
        } catch (error) {
          logger.warn({
            event: 'weighted.scoring.fallback',
            teamId: team.id,
            error: error.message
          }, 'Falling back to unweighted scoring for team');
          // Fall through to unweighted calculation
        }
      }

      // Fallback to unweighted calculation if weighted scoring failed or not enabled
      if (!usesWeightedScoring) {
        const answers = answerRepository.getAnswersByTeam(team.id);
        const validAnswers = answers.filter(a => a.score !== null && a.score !== undefined);
        totalScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
        answerCount = validAnswers.length;
      }

      const avgScore = answerCount > 0 ? (totalScore / answerCount) : 0;
      
      // Get team members
      const members = teamMemberRepository.getTeamMembers(team.id);
      
      return {
        teamId: team.id,
        teamName: team.name,
        hour: team.hour,
        day: team.day,
        month: team.month,
        year: team.year,
        totalScore: parseFloat(totalScore.toFixed(2)),
        weightedScore: usesWeightedScoring ? parseFloat(weightedScore.toFixed(2)) : null,
        answerCount,
        questionCount,
        averageScore: parseFloat(avgScore.toFixed(2)),
        completionPercentage: questionCount > 0 
          ? parseFloat(((answerCount / questionCount) * 100).toFixed(1))
          : 0,
        usesWeightedScoring,
        members: members.map(m => ({
          id: m.id,
          username: m.username,
          email: m.email
        }))
      };
    });

    // Sort by total score (descending)
    teamsWithScores.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      // Tie-breaker: average score
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      // Final tie-breaker: team ID
      return a.teamId - b.teamId;
    });

    // Find user's team ID
    const userTeam = teamsWithScores.find(t => 
      t.members.some(m => m.id === userId)
    );
    const userTeamId = userTeam ? userTeam.teamId : null;

    // Determine winner (team with highest score > 0)
    const winner = teamsWithScores.length > 0 && teamsWithScores[0].totalScore > 0
      ? {
          teamId: teamsWithScores[0].teamId,
          teamName: teamsWithScores[0].teamName,
          totalScore: teamsWithScores[0].totalScore,
          averageScore: teamsWithScores[0].averageScore
        }
      : null;

    logger.info({
      event: 'teams.with.scores.retrieved',
      userId,
      hour,
      day,
      month,
      year,
      teamCount: teamsWithScores.length
    }, 'Retrieved all teams with scores');

    res.json({
      hour,
      day,
      month,
      year,
      teams: teamsWithScores,
      winner,
      userTeamId
    });
  } catch (error) {
    logger.error({
      event: 'teams.with.scores.failure',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Get all teams with scores error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
