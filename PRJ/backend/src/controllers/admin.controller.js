import * as analyticsService from '../services/analytics.service.js';
import * as userRepository from '../database/repositories/user.repository.js';
import * as teamRepository from '../database/repositories/team.repository.js';
import * as questionRepository from '../database/repositories/question.repository.js';
import * as answerRepository from '../database/repositories/answer.repository.js';
import logger from '../utils/logger.js';

/**
 * Get comprehensive dashboard metrics for admin
 * Query params: month (optional), year (optional)
 * Defaults to current month/year if not provided
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    let { month, year } = req.query;
    
    // Default to current month/year if not provided
    if (!month || !year) {
      const currentDate = new Date();
      month = currentDate.getMonth() + 1;
      year = currentDate.getFullYear();
    }

    // Validate month/year
    month = parseInt(month, 10);
    year = parseInt(year, 10);
    
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Year must be between 2000 and 3000' });
    }

    // Get all metrics in parallel
    const [
      participationRates,
      teamAverages,
      userAverages,
      performers,
      monthComparison
    ] = await Promise.all([
      analyticsService.calculateTeamParticipationRate(month, year),
      analyticsService.calculateAverageScorePerTeam(month, year),
      analyticsService.calculateAverageScorePerUser(month, year),
      analyticsService.getTopBottomPerformers(month, year, 3, 3),
      analyticsService.calculateMonthComparison(month, year)
    ]);

    // Calculate overview statistics
    const totalUsers = userRepository.getAllUsers().length;
    const teams = teamRepository.getTeamsByMonth(month, year);
    const totalTeams = teams.length;
    const questions = questionRepository.getQuestionsByMonth(month, year);
    const totalQuestions = questions.length;
    
    // Calculate overall participation rate
    const totalExpectedAnswers = participationRates.reduce((sum, team) => sum + (team.expectedAnswers || 0), 0);
    const totalSubmittedAnswers = participationRates.reduce((sum, team) => sum + (team.submittedAnswers || 0), 0);
    const overallParticipationRate = totalExpectedAnswers > 0 
      ? (totalSubmittedAnswers / totalExpectedAnswers) * 100 
      : 0;

    // Calculate overall average score
    const totalAnswers = teamAverages.reduce((sum, team) => sum + (team.totalAnswers || 0), 0);
    const totalScore = teamAverages.reduce((sum, team) => sum + (team.totalScore || 0), 0);
    const overallAverageScore = totalAnswers > 0 ? totalScore / totalAnswers : 0;

    logger.info({
      event: 'admin.dashboard.accessed',
      userId: req.user?.id,
      month,
      year
    }, 'Admin dashboard metrics retrieved');

    res.json({
      month,
      year,
      overview: {
        totalUsers,
        totalTeams,
        totalQuestions,
        overallParticipationRate: parseFloat(overallParticipationRate.toFixed(2)),
        overallAverageScore: parseFloat(overallAverageScore.toFixed(2))
      },
      participationRates,
      teamAverages,
      userAverages,
      performers,
      monthComparison
    });
  } catch (error) {
    logger.error({
      event: 'admin.dashboard.error',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Error retrieving admin dashboard metrics');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get team participation rates
 * Query params: month, year
 */
export const getTeamParticipation = async (req, res) => {
  try {
    let { month, year } = req.query;
    
    if (!month || !year) {
      const currentDate = new Date();
      month = currentDate.getMonth() + 1;
      year = currentDate.getFullYear();
    }

    month = parseInt(month, 10);
    year = parseInt(year, 10);
    
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Year must be between 2000 and 3000' });
    }

    const participationRates = analyticsService.calculateTeamParticipationRate(month, year);

    res.json({
      month,
      year,
      participationRates
    });
  } catch (error) {
    logger.error({
      event: 'admin.participation.error',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Error retrieving team participation rates');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get average scores per team
 * Query params: month, year
 */
export const getTeamAverages = async (req, res) => {
  try {
    let { month, year } = req.query;
    
    if (!month || !year) {
      const currentDate = new Date();
      month = currentDate.getMonth() + 1;
      year = currentDate.getFullYear();
    }

    month = parseInt(month, 10);
    year = parseInt(year, 10);
    
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Year must be between 2000 and 3000' });
    }

    const teamAverages = analyticsService.calculateAverageScorePerTeam(month, year);

    res.json({
      month,
      year,
      teamAverages
    });
  } catch (error) {
    logger.error({
      event: 'admin.team.averages.error',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Error retrieving team average scores');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get average scores per user
 * Query params: month, year
 */
export const getUserAverages = async (req, res) => {
  try {
    let { month, year } = req.query;
    
    if (!month || !year) {
      const currentDate = new Date();
      month = currentDate.getMonth() + 1;
      year = currentDate.getFullYear();
    }

    month = parseInt(month, 10);
    year = parseInt(year, 10);
    
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Year must be between 2000 and 3000' });
    }

    const userAverages = analyticsService.calculateAverageScorePerUser(month, year);

    res.json({
      month,
      year,
      userAverages
    });
  } catch (error) {
    logger.error({
      event: 'admin.user.averages.error',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Error retrieving user average scores');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get top and bottom performers
 * Query params: month, year, limit (optional, default 3)
 */
export const getPerformers = async (req, res) => {
  try {
    let { month, year, limit } = req.query;
    
    if (!month || !year) {
      const currentDate = new Date();
      month = currentDate.getMonth() + 1;
      year = currentDate.getFullYear();
    }

    month = parseInt(month, 10);
    year = parseInt(year, 10);
    limit = limit ? parseInt(limit, 10) : 3;
    
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Year must be between 2000 and 3000' });
    }
    
    if (limit < 1 || limit > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const performers = analyticsService.getTopBottomPerformers(month, year, limit, limit);

    res.json({
      month,
      year,
      limit,
      performers
    });
  } catch (error) {
    logger.error({
      event: 'admin.performers.error',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Error retrieving top/bottom performers');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get month-over-month comparison
 * Query params: month, year
 */
export const getMonthComparison = async (req, res) => {
  try {
    let { month, year } = req.query;
    
    if (!month || !year) {
      const currentDate = new Date();
      month = currentDate.getMonth() + 1;
      year = currentDate.getFullYear();
    }

    month = parseInt(month, 10);
    year = parseInt(year, 10);
    
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Month must be between 1 and 12' });
    }
    
    if (year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Year must be between 2000 and 3000' });
    }

    const comparison = analyticsService.calculateMonthComparison(month, year);

    res.json({
      comparison
    });
  } catch (error) {
    logger.error({
      event: 'admin.month.comparison.error',
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    }, 'Error retrieving month comparison');
    
    res.status(500).json({ error: 'Internal server error' });
  }
};
