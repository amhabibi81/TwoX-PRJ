import * as answerRepository from '../database/repositories/answer.repository.js';
import * as teamMemberRepository from '../database/repositories/teamMember.repository.js';
import { EVALUATION_WEIGHTS, SOURCE_TYPES } from '../config/evaluation.config.js';
import logger from '../utils/logger.js';

/**
 * Calculate weighted score for a user on a specific question
 * Formula: (selfScore × 0.20) + (peerAvgScore × 0.50) + (managerScore × 0.30)
 * 
 * @param {number} evaluatedUserId - The user being evaluated
 * @param {number} teamId - The team ID
 * @param {number} questionId - The question ID
 * @returns {object} { weightedScore, selfScore, peerAvgScore, managerScore, breakdown }
 */
export const calculateWeightedScoreForUser = (evaluatedUserId, teamId, questionId) => {
  try {
    // Get all answers for this user-question-team combination
    const allAnswers = answerRepository.getAnswersForUser(evaluatedUserId, teamId);
    const questionAnswers = allAnswers.filter(a => a.question_id === questionId);

    // Separate answers by source type
    const selfAnswer = questionAnswers.find(a => a.source_type === SOURCE_TYPES.SELF);
    const peerAnswers = questionAnswers.filter(a => a.source_type === SOURCE_TYPES.PEER);
    const managerAnswer = questionAnswers.find(a => a.source_type === SOURCE_TYPES.MANAGER);

    // Extract scores
    const selfScore = selfAnswer && selfAnswer.score ? selfAnswer.score : 0;
    const managerScore = managerAnswer && managerAnswer.score ? managerAnswer.score : 0;

    // Calculate peer average
    let peerAvgScore = 0;
    if (peerAnswers.length > 0) {
      const peerScores = peerAnswers
        .filter(a => a.score !== null && a.score !== undefined && a.score >= 1 && a.score <= 5)
        .map(a => a.score);
      
      if (peerScores.length > 0) {
        peerAvgScore = peerScores.reduce((sum, score) => sum + score, 0) / peerScores.length;
      }
    }

    // Calculate weighted score
    const weightedScore = 
      (selfScore * EVALUATION_WEIGHTS.self) +
      (peerAvgScore * EVALUATION_WEIGHTS.peer) +
      (managerScore * EVALUATION_WEIGHTS.manager);

    return {
      weightedScore: parseFloat(weightedScore.toFixed(2)),
      selfScore: selfScore || null,
      peerAvgScore: peerAvgScore > 0 ? parseFloat(peerAvgScore.toFixed(2)) : null,
      managerScore: managerScore || null,
      breakdown: {
        self: {
          score: selfScore || null,
          count: selfAnswer ? 1 : 0,
          weight: EVALUATION_WEIGHTS.self
        },
        peer: {
          score: peerAvgScore > 0 ? parseFloat(peerAvgScore.toFixed(2)) : null,
          count: peerAnswers.length,
          weight: EVALUATION_WEIGHTS.peer
        },
        manager: {
          score: managerScore || null,
          count: managerAnswer ? 1 : 0,
          weight: EVALUATION_WEIGHTS.manager
        }
      }
    };
  } catch (error) {
    logger.error({
      event: 'weighted.score.calculation.error',
      evaluatedUserId,
      teamId,
      questionId,
      error: error.message,
      stack: error.stack
    }, 'Error calculating weighted score for user');
    throw error;
  }
};

/**
 * Calculate weighted score for a team on a specific question
 * Aggregates weighted scores for all team members
 * 
 * @param {number} teamId - The team ID
 * @param {number} questionId - The question ID
 * @returns {object} { weightedScore, memberScores, breakdown }
 */
export const calculateWeightedScoreForTeam = (teamId, questionId) => {
  try {
    // Get all team members
    const teamMembers = teamMemberRepository.getTeamMembers(teamId);
    
    if (teamMembers.length === 0) {
      return {
        weightedScore: 0,
        memberScores: [],
        breakdown: {
          self: { total: 0, count: 0 },
          peer: { total: 0, count: 0 },
          manager: { total: 0, count: 0 }
        }
      };
    }

    // Calculate weighted score for each member
    const memberScores = teamMembers.map(member => {
      const userScore = calculateWeightedScoreForUser(member.id, teamId, questionId);
      return {
        userId: member.id,
        username: member.username,
        email: member.email,
        ...userScore
      };
    });

    // Aggregate team weighted score (average of all member weighted scores)
    const totalWeightedScore = memberScores.reduce((sum, m) => sum + (m.weightedScore || 0), 0);
    const teamWeightedScore = memberScores.length > 0 
      ? totalWeightedScore / memberScores.length 
      : 0;

    // Aggregate breakdown
    const breakdown = {
      self: {
        total: memberScores.reduce((sum, m) => sum + (m.selfScore || 0), 0),
        count: memberScores.filter(m => m.selfScore !== null).length
      },
      peer: {
        total: memberScores.reduce((sum, m) => sum + (m.peerAvgScore || 0), 0),
        count: memberScores.filter(m => m.peerAvgScore !== null).length
      },
      manager: {
        total: memberScores.reduce((sum, m) => sum + (m.managerScore || 0), 0),
        count: memberScores.filter(m => m.managerScore !== null).length
      }
    };

    return {
      weightedScore: parseFloat(teamWeightedScore.toFixed(2)),
      memberScores,
      breakdown
    };
  } catch (error) {
    logger.error({
      event: 'team.weighted.score.calculation.error',
      teamId,
      questionId,
      error: error.message,
      stack: error.stack
    }, 'Error calculating weighted score for team');
    throw error;
  }
};

/**
 * Get evaluation breakdown for a user
 * Returns all answers (self, peer, manager) with details
 * 
 * @param {number} evaluatedUserId - The user being evaluated
 * @param {number} teamId - The team ID
 * @param {number} questionId - The question ID
 * @returns {object} Breakdown with counts and averages per source type
 */
export const getEvaluationBreakdown = (evaluatedUserId, teamId, questionId) => {
  try {
    const allAnswers = answerRepository.getAnswersForUser(evaluatedUserId, teamId);
    const questionAnswers = allAnswers.filter(a => a.question_id === questionId);

    const selfAnswers = questionAnswers.filter(a => a.source_type === SOURCE_TYPES.SELF);
    const peerAnswers = questionAnswers.filter(a => a.source_type === SOURCE_TYPES.PEER);
    const managerAnswers = questionAnswers.filter(a => a.source_type === SOURCE_TYPES.MANAGER);

    const calculateAvg = (answers) => {
      const validScores = answers
        .filter(a => a.score !== null && a.score !== undefined && a.score >= 1 && a.score <= 5)
        .map(a => a.score);
      
      if (validScores.length === 0) return null;
      return parseFloat((validScores.reduce((sum, s) => sum + s, 0) / validScores.length).toFixed(2));
    };

    return {
      self: {
        count: selfAnswers.length,
        average: calculateAvg(selfAnswers),
        answers: selfAnswers.map(a => ({
          id: a.id,
          userId: a.user_id,
          username: a.username,
          score: a.score,
          createdAt: a.created_at
        }))
      },
      peer: {
        count: peerAnswers.length,
        average: calculateAvg(peerAnswers),
        answers: peerAnswers.map(a => ({
          id: a.id,
          userId: a.user_id,
          username: a.username,
          score: a.score,
          createdAt: a.created_at
        }))
      },
      manager: {
        count: managerAnswers.length,
        average: calculateAvg(managerAnswers),
        answers: managerAnswers.map(a => ({
          id: a.id,
          userId: a.user_id,
          username: a.username,
          score: a.score,
          createdAt: a.created_at
        }))
      }
    };
  } catch (error) {
    logger.error({
      event: 'evaluation.breakdown.error',
      evaluatedUserId,
      teamId,
      questionId,
      error: error.message,
      stack: error.stack
    }, 'Error getting evaluation breakdown');
    throw error;
  }
};

/**
 * Calculate total weighted score for a user across all questions in a team
 * 
 * @param {number} evaluatedUserId - The user being evaluated
 * @param {number} teamId - The team ID
 * @param {Array} questionIds - Array of question IDs
 * @returns {object} { totalWeightedScore, questionScores, breakdown }
 */
export const calculateTotalWeightedScoreForUser = (evaluatedUserId, teamId, questionIds) => {
  try {
    const questionScores = questionIds.map(questionId => {
      const score = calculateWeightedScoreForUser(evaluatedUserId, teamId, questionId);
      return {
        questionId,
        ...score
      };
    });

    const totalWeightedScore = questionScores.reduce((sum, q) => sum + (q.weightedScore || 0), 0);

    // Aggregate breakdown across all questions
    const breakdown = {
      self: {
        total: questionScores.reduce((sum, q) => sum + (q.selfScore || 0), 0),
        count: questionScores.filter(q => q.selfScore !== null).length,
        average: questionScores.filter(q => q.selfScore !== null).length > 0
          ? parseFloat((questionScores.reduce((sum, q) => sum + (q.selfScore || 0), 0) / 
                       questionScores.filter(q => q.selfScore !== null).length).toFixed(2))
          : null
      },
      peer: {
        total: questionScores.reduce((sum, q) => sum + (q.peerAvgScore || 0), 0),
        count: questionScores.filter(q => q.peerAvgScore !== null).length,
        average: questionScores.filter(q => q.peerAvgScore !== null).length > 0
          ? parseFloat((questionScores.reduce((sum, q) => sum + (q.peerAvgScore || 0), 0) / 
                       questionScores.filter(q => q.peerAvgScore !== null).length).toFixed(2))
          : null
      },
      manager: {
        total: questionScores.reduce((sum, q) => sum + (q.managerScore || 0), 0),
        count: questionScores.filter(q => q.managerScore !== null).length,
        average: questionScores.filter(q => q.managerScore !== null).length > 0
          ? parseFloat((questionScores.reduce((sum, q) => sum + (q.managerScore || 0), 0) / 
                       questionScores.filter(q => q.managerScore !== null).length).toFixed(2))
          : null
      }
    };

    return {
      totalWeightedScore: parseFloat(totalWeightedScore.toFixed(2)),
      questionScores,
      breakdown
    };
  } catch (error) {
    logger.error({
      event: 'total.weighted.score.calculation.error',
      evaluatedUserId,
      teamId,
      error: error.message,
      stack: error.stack
    }, 'Error calculating total weighted score for user');
    throw error;
  }
};

/**
 * Validate that evaluation weights sum to 1.0
 * @throws {Error} If weights don't sum to 1.0
 */
export const validateEvaluationWeights = () => {
  const total = EVALUATION_WEIGHTS.self + EVALUATION_WEIGHTS.peer + EVALUATION_WEIGHTS.manager;
  if (Math.abs(total - 1.0) > 0.001) {
    throw new Error(`Evaluation weights must sum to 1.0, got ${total}`);
  }
  return true;
};
