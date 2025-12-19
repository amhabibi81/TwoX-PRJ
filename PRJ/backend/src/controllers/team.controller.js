import * as teamRepository from '../database/repositories/team.repository.js';
import * as teamMemberRepository from '../database/repositories/teamMember.repository.js';
import { generateTeamsForMonth } from '../services/teamGeneration.service.js';
import logger from '../utils/logger.js';

export const generateTeams = async (req, res) => {
  try {
    const { month, year } = req.body;
    const userId = req.user?.id;

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
          month: result.month,
          year: result.year,
          userId: req.user?.id,
          source: 'admin_manual',
          reason: 'teams_already_exist'
        }, 'Admin team generation skipped: teams already exist');
        return res.status(200).json({
          message: result.error,
          skipped: true,
          month: result.month,
          year: result.year
        });
      }
      
      logger.warn({
        event: 'team.generation.failure',
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
      month: result.month,
      year: result.year,
      teamCount: result.teamCount,
      userId: req.user?.id,
      source: 'admin_manual'
    }, 'Admin team generation successful');

    res.json({
      message: result.message,
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
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const year = currentDate.getFullYear();

    // Check if teams exist for current month/year
    const teamsExist = teamRepository.teamsExistForMonth(month, year);
    
    if (!teamsExist) {
      return res.status(404).json({
        team: null,
        error: 'Teams have not been generated for this month',
        month,
        year
      });
    }

    // Get user's teams for current month
    const teams = teamRepository.getUserTeams(userId, month, year);

    if (teams.length === 0) {
      return res.status(404).json({
        team: null,
        error: 'You have not been assigned to a team for this month',
        month,
        year
      });
    }

    // Get team members for the first team (assuming user is in one team per month)
    const team = teams[0];
    const members = teamMemberRepository.getTeamMembers(team.id);

    res.json({
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
      event: 'team.retrieval.failure',
      userId: req.user?.id,
      month,
      year,
      error: error.message,
      stack: error.stack
    }, 'Get my team error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
