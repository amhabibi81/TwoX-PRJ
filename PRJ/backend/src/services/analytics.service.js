import * as analyticsRepository from '../database/repositories/analytics.repository.js';
import * as questionRepository from '../database/repositories/question.repository.js';
import logger from '../utils/logger.js';

/**
 * Calculate team participation rate for a given month/year
 * Formula: (submitted answers / expected answers) * 100
 * Expected answers = team_members_count * questions_count for month
 * Returns array of {teamId, teamName, participationRate, submittedAnswers, expectedAnswers}
 */
export const calculateTeamParticipationRate = (month, year) => {
  try {
    const cacheKey = `team_participation_${month}_${year}`;
    
    // Check cache first
    const cached = analyticsRepository.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug({ month, year, cacheKey }, 'Using cached team participation rate');
      return cached.data;
    }

    // Calculate from repository
    const rawData = analyticsRepository.getTeamParticipationRate(month, year);
    
    const result = rawData.map(team => {
      const expectedAnswers = team.expected_answers || 0;
      const submittedAnswers = team.submitted_answers || 0;
      const participationRate = expectedAnswers > 0 
        ? (submittedAnswers / expectedAnswers) * 100 
        : 0;

      return {
        teamId: team.team_id,
        teamName: team.team_name,
        participationRate: parseFloat(participationRate.toFixed(2)),
        submittedAnswers,
        expectedAnswers,
        memberCount: team.member_count || 0,
        questionCount: team.question_count || 0
      };
    });

    // Cache the result
    analyticsRepository.setCachedAnalytics(cacheKey, 'team_participation', month, year, result);
    
    return result;
  } catch (error) {
    logger.error({ month, year, error: error.message, stack: error.stack }, 'Error calculating team participation rate');
    throw error;
  }
};

/**
 * Calculate average score per team for a given month/year
 * Formula: SUM(scores) / COUNT(answers) per team
 * Only counts answers with valid scores (1-5)
 * Returns array of {teamId, teamName, averageScore, totalAnswers}
 */
export const calculateAverageScorePerTeam = (month, year) => {
  try {
    const cacheKey = `team_avg_score_${month}_${year}`;
    
    // Check cache first
    const cached = analyticsRepository.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug({ month, year, cacheKey }, 'Using cached team average scores');
      return cached.data;
    }

    // Calculate from repository
    const rawData = analyticsRepository.getAverageScorePerTeam(month, year);
    
    const result = rawData.map(team => ({
      teamId: team.team_id,
      teamName: team.team_name,
      averageScore: parseFloat((team.average_score || 0).toFixed(2)),
      totalAnswers: team.total_answers || 0,
      totalScore: team.total_score || 0
    }));

    // Cache the result
    analyticsRepository.setCachedAnalytics(cacheKey, 'team_avg_score', month, year, result);
    
    return result;
  } catch (error) {
    logger.error({ month, year, error: error.message, stack: error.stack }, 'Error calculating average score per team');
    throw error;
  }
};

/**
 * Calculate average score per user for a given month/year
 * Formula: SUM(scores) / COUNT(answers) per user
 * Aggregated across all teams user belongs to in month
 * Only counts answers with valid scores
 * Returns array of {userId, username, email, averageScore, totalAnswers}
 */
export const calculateAverageScorePerUser = (month, year) => {
  try {
    const cacheKey = `user_avg_score_${month}_${year}`;
    
    // Check cache first
    const cached = analyticsRepository.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug({ month, year, cacheKey }, 'Using cached user average scores');
      return cached.data;
    }

    // Calculate from repository
    const rawData = analyticsRepository.getAverageScorePerUser(month, year);
    
    const result = rawData.map(user => ({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      averageScore: parseFloat((user.average_score || 0).toFixed(2)),
      totalAnswers: user.total_answers || 0,
      totalScore: user.total_score || 0
    }));

    // Cache the result
    analyticsRepository.setCachedAnalytics(cacheKey, 'user_avg_score', month, year, result);
    
    return result;
  } catch (error) {
    logger.error({ month, year, error: error.message, stack: error.stack }, 'Error calculating average score per user');
    throw error;
  }
};

/**
 * Get top and bottom performers for a given month/year
 * Uses calculateAverageScorePerUser and filters by minimum answer count
 * Returns {top: [...], bottom: [...]}
 */
export const getTopBottomPerformers = (month, year, topCount = 3, bottomCount = 3) => {
  try {
    const cacheKey = `top_performers_${month}_${year}_${topCount}_${bottomCount}`;
    
    // Check cache first
    const cached = analyticsRepository.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug({ month, year, cacheKey }, 'Using cached top/bottom performers');
      return cached.data;
    }

    // Get top performers (minimum 3 answers to avoid skewed results)
    const topRaw = analyticsRepository.getTopPerformers(month, year, topCount);
    const top = topRaw.map(user => ({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      averageScore: parseFloat((user.average_score || 0).toFixed(2)),
      totalAnswers: user.total_answers || 0
    }));

    // Get bottom performers (minimum 3 answers to avoid skewed results)
    const bottomRaw = analyticsRepository.getBottomPerformers(month, year, bottomCount);
    const bottom = bottomRaw.map(user => ({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      averageScore: parseFloat((user.average_score || 0).toFixed(2)),
      totalAnswers: user.total_answers || 0
    }));

    const result = { top, bottom };

    // Cache the result
    analyticsRepository.setCachedAnalytics(cacheKey, 'top_performers', month, year, result);
    
    return result;
  } catch (error) {
    logger.error({ month, year, error: error.message, stack: error.stack }, 'Error getting top/bottom performers');
    throw error;
  }
};

/**
 * Calculate month-over-month comparison
 * Compares current month vs previous month metrics
 * Returns {current: {...}, previous: {...}, changes: {...}}
 */
export const calculateMonthComparison = (currentMonth, currentYear) => {
  try {
    const cacheKey = `month_comparison_${currentMonth}_${currentYear}`;
    
    // Check cache first
    const cached = analyticsRepository.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug({ currentMonth, currentYear, cacheKey }, 'Using cached month comparison');
      return cached.data;
    }

    // Get comparison data from repository
    const comparison = analyticsRepository.getMonthComparison(currentMonth, currentYear);

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    const changes = {
      totalUsers: {
        value: (comparison.current.total_users || 0) - (comparison.previous.total_users || 0),
        percentage: calculateChange(
          comparison.current.total_users || 0,
          comparison.previous.total_users || 0
        )
      },
      totalTeams: {
        value: (comparison.current.total_teams || 0) - (comparison.previous.total_teams || 0),
        percentage: calculateChange(
          comparison.current.total_teams || 0,
          comparison.previous.total_teams || 0
        )
      },
      totalAnswers: {
        value: (comparison.current.total_answers || 0) - (comparison.previous.total_answers || 0),
        percentage: calculateChange(
          comparison.current.total_answers || 0,
          comparison.previous.total_answers || 0
        )
      },
      avgParticipationRate: {
        value: (comparison.current.avgParticipationRate || 0) - (comparison.previous.avgParticipationRate || 0),
        percentage: calculateChange(
          comparison.current.avgParticipationRate || 0,
          comparison.previous.avgParticipationRate || 0
        )
      },
      avgScore: {
        value: (comparison.current.avgScore || 0) - (comparison.previous.avgScore || 0),
        percentage: calculateChange(
          comparison.current.avgScore || 0,
          comparison.previous.avgScore || 0
        )
      }
    };

    const result = {
      current: {
        month: currentMonth,
        year: currentYear,
        totalUsers: comparison.current.total_users || 0,
        totalTeams: comparison.current.total_teams || 0,
        totalAnswers: comparison.current.total_answers || 0,
        avgParticipationRate: parseFloat((comparison.current.avgParticipationRate || 0).toFixed(2)),
        avgScore: parseFloat((comparison.current.avgScore || 0).toFixed(2))
      },
      previous: {
        month: comparison.prevMonth,
        year: comparison.prevYear,
        totalUsers: comparison.previous.total_users || 0,
        totalTeams: comparison.previous.total_teams || 0,
        totalAnswers: comparison.previous.total_answers || 0,
        avgParticipationRate: parseFloat((comparison.previous.avgParticipationRate || 0).toFixed(2)),
        avgScore: parseFloat((comparison.previous.avgScore || 0).toFixed(2))
      },
      changes: {
        totalUsers: {
          value: changes.totalUsers.value,
          percentage: parseFloat(changes.totalUsers.percentage.toFixed(2))
        },
        totalTeams: {
          value: changes.totalTeams.value,
          percentage: parseFloat(changes.totalTeams.percentage.toFixed(2))
        },
        totalAnswers: {
          value: changes.totalAnswers.value,
          percentage: parseFloat(changes.totalAnswers.percentage.toFixed(2))
        },
        avgParticipationRate: {
          value: parseFloat(changes.avgParticipationRate.value.toFixed(2)),
          percentage: parseFloat(changes.avgParticipationRate.percentage.toFixed(2))
        },
        avgScore: {
          value: parseFloat(changes.avgScore.value.toFixed(2)),
          percentage: parseFloat(changes.avgScore.percentage.toFixed(2))
        }
      }
    };

    // Cache the result
    analyticsRepository.setCachedAnalytics(cacheKey, 'month_comparison', currentMonth, currentYear, result);
    
    return result;
  } catch (error) {
    logger.error({ currentMonth, currentYear, error: error.message, stack: error.stack }, 'Error calculating month comparison');
    throw error;
  }
};

/**
 * Generic function to get or calculate analytics with caching
 * @param {string} cacheKey - Unique cache key
 * @param {string} cacheType - Type of cache (for indexing)
 * @param {number} month - Month
 * @param {number} year - Year
 * @param {Function} calculatorFn - Function that calculates the analytics
 * @returns {Promise<any>} Cached or calculated analytics data
 */
export const getOrCalculateAnalytics = async (cacheKey, cacheType, month, year, calculatorFn) => {
  try {
    // Check cache first
    const cached = analyticsRepository.getCachedAnalytics(cacheKey);
    if (cached) {
      return cached.data;
    }

    // Calculate using provided function
    const result = await calculatorFn();
    
    // Cache the result
    analyticsRepository.setCachedAnalytics(cacheKey, cacheType, month, year, result);
    
    return result;
  } catch (error) {
    logger.error({ cacheKey, cacheType, month, year, error: error.message }, 'Error in getOrCalculateAnalytics');
    throw error;
  }
};
