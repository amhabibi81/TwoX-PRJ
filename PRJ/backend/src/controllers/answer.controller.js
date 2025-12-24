import * as answerRepository from '../database/repositories/answer.repository.js';
import * as questionRepository from '../database/repositories/question.repository.js';
import * as teamRepository from '../database/repositories/team.repository.js';
import * as teamMemberRepository from '../database/repositories/teamMember.repository.js';
import * as userManagerRepository from '../database/repositories/userManager.repository.js';
import { SOURCE_TYPES, VALID_SOURCE_TYPES } from '../config/evaluation.config.js';
import { ROLES } from '../config/roles.config.js';
import logger from '../utils/logger.js';

export const getMyAnswers = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    const currentDay = currentDate.getDate();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Get user's team for current hour
    const userTeams = teamRepository.getUserTeamsByHour(userId, currentHour, currentDay, month, year);
    if (userTeams.length === 0) {
      return res.json({
        answers: [],
        teamId: null,
        month,
        year
      });
    }

    const teamId = userTeams[0].id;
    const answers = answerRepository.getAnswersByUser(userId, teamId);

    res.json({
      answers: answers.map(a => ({
        id: a.id,
        question_id: a.question_id,
        question_text: a.question_text,
        score: a.score,
        created_at: a.created_at
      })),
      teamId,
      month,
      year
    });
  } catch (error) {
    logger.error({
      event: 'answer.retrieval.failure',
      userId,
      month,
      year,
      error: error.message
    }, 'Get my answers error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit an answer (supports 360-degree evaluations)
 * Body: { questionId, score, evaluatedUserId (optional), sourceType (optional, defaults to 'peer') }
 */
export const submitAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    // Validation is handled by middleware, values are already validated
    const { questionId, score, evaluatedUserId, sourceType } = req.body;

    // Additional security: Verify user ID is valid integer
    if (!userId || typeof userId !== 'number' || userId <= 0) {
      return res.status(401).json({ error: 'Invalid user authentication' });
    }

    // Get question to verify it exists and get its month/year
    const question = questionRepository.getQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Determine source type (default to peer for backward compatibility)
    const finalSourceType = sourceType || SOURCE_TYPES.PEER;
    
    if (!VALID_SOURCE_TYPES.includes(finalSourceType)) {
      return res.status(400).json({ 
        error: `Invalid source_type. Must be one of: ${VALID_SOURCE_TYPES.join(', ')}` 
      });
    }

    // Get current hour/day for team lookup
    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    const currentDay = currentDate.getDate();

    // Verify user is assigned to a team for the current hour
    const userTeams = teamRepository.getUserTeamsByHour(userId, currentHour, currentDay, question.month, question.year);
    if (userTeams.length === 0) {
      return res.status(403).json({ 
        error: 'You are not assigned to a team for this hour' 
      });
    }

    // Use the first team (user should only be in one team per month)
    const team = userTeams[0];

    // Determine evaluated user and validate permissions
    let finalEvaluatedUserId = evaluatedUserId;

    if (finalSourceType === SOURCE_TYPES.SELF) {
      // Self evaluation: evaluated user must be the same as the user submitting
      finalEvaluatedUserId = userId;
    } else if (finalSourceType === SOURCE_TYPES.PEER) {
      // Peer evaluation: evaluated user must be a teammate
      if (!finalEvaluatedUserId) {
        return res.status(400).json({ 
          error: 'evaluatedUserId is required for peer evaluations' 
        });
      }
      
      if (finalEvaluatedUserId === userId) {
        return res.status(400).json({ 
          error: 'Cannot submit peer evaluation for yourself. Use self-evaluation instead.' 
        });
      }

      // Verify both users are in the same team
      const evaluatedUserTeams = teamRepository.getUserTeamsByHour(finalEvaluatedUserId, currentHour, currentDay, question.month, question.year);
      const evaluatedUserInTeam = evaluatedUserTeams.some(t => t.id === team.id);
      
      if (!evaluatedUserInTeam) {
        return res.status(403).json({ 
          error: 'You can only evaluate teammates from your own team' 
        });
      }
    } else if (finalSourceType === SOURCE_TYPES.MANAGER) {
      // Manager evaluation: user must be manager of evaluated user OR admin
      if (!finalEvaluatedUserId) {
        return res.status(400).json({ 
          error: 'evaluatedUserId is required for manager evaluations' 
        });
      }

      // Authorization is handled by middleware (requireAnyRole([ROLES.ADMIN, ROLES.MANAGER]))
      // Additional check: If user has manager role (not admin), verify they manage this specific user
      // Admins can evaluate anyone, managers can evaluate users they manage
      const userRole = req.user.role || ROLES.MEMBER;
      
      if (userRole === ROLES.MANAGER) {
        // Manager role users must have a manager relationship with the evaluated user
        const isManager = userManagerRepository.isManager(userId, finalEvaluatedUserId);
        if (!isManager) {
          return res.status(403).json({ 
            error: 'You can only submit manager evaluations for users you manage' 
          });
        }
      }
      // Admin role users can evaluate anyone (no additional check needed)
    }

    // Check if answer already exists with same source type and evaluated user
    if (answerRepository.hasAnsweredQuestion(userId, questionId, question.month, question.year, finalEvaluatedUserId, finalSourceType)) {
      return res.status(409).json({ 
        error: `You have already submitted a ${finalSourceType} evaluation for this question` 
      });
    }

    // Additional security: Verify user ID matches authenticated user
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Create answer (score is already validated by middleware as integer 1-5)
    const answer = answerRepository.createAnswer(userId, questionId, team.id, score, finalEvaluatedUserId, finalSourceType);

    res.status(201).json({
      id: answer.id,
      user_id: answer.user_id,
      question_id: answer.question_id,
      team_id: answer.team_id,
      evaluated_user_id: answer.evaluated_user_id,
      source_type: answer.source_type,
      score: answer.score,
      created_at: answer.created_at
    });
  } catch (error) {
    logger.error({
      event: 'answer.submission.failure',
      userId: req.user?.id,
      questionId: req.body.questionId,
      evaluatedUserId: req.body.evaluatedUserId,
      sourceType: req.body.sourceType,
      reason: 'internal_error',
      error: error.message,
      stack: error.stack
    }, 'Submit answer error');
    
    // Handle specific errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    if (error.message === 'Score must be an integer between 1 and 5') {
      return res.status(400).json({ error: error.message });
    }

    if (error.message.includes('Invalid source_type')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit self-evaluation
 * Body: { questionId, score }
 */
export const submitSelfEvaluation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId, score } = req.body;

    // Submit as self evaluation
    req.body.evaluatedUserId = userId;
    req.body.sourceType = SOURCE_TYPES.SELF;

    return submitAnswer(req, res);
  } catch (error) {
    logger.error({
      event: 'self.evaluation.submission.failure',
      userId: req.user?.id,
      error: error.message
    }, 'Submit self evaluation error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit peer evaluation
 * Body: { questionId, score, evaluatedUserId }
 */
export const submitPeerEvaluation = async (req, res) => {
  try {
    const { questionId, score, evaluatedUserId } = req.body;

    if (!evaluatedUserId) {
      return res.status(400).json({ error: 'evaluatedUserId is required for peer evaluations' });
    }

    // Submit as peer evaluation
    req.body.sourceType = SOURCE_TYPES.PEER;

    return submitAnswer(req, res);
  } catch (error) {
    logger.error({
      event: 'peer.evaluation.submission.failure',
      userId: req.user?.id,
      error: error.message
    }, 'Submit peer evaluation error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit manager evaluation (admin/manager only)
 * Body: { questionId, score, evaluatedUserId }
 */
export const submitManagerEvaluation = async (req, res) => {
  try {
    const { questionId, score, evaluatedUserId } = req.body;

    if (!evaluatedUserId) {
      return res.status(400).json({ error: 'evaluatedUserId is required for manager evaluations' });
    }

    // Submit as manager evaluation
    req.body.sourceType = SOURCE_TYPES.MANAGER;

    return submitAnswer(req, res);
  } catch (error) {
    logger.error({
      event: 'manager.evaluation.submission.failure',
      userId: req.user?.id,
      error: error.message
    }, 'Submit manager evaluation error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

