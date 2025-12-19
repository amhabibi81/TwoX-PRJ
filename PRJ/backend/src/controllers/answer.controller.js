import * as answerRepository from '../database/repositories/answer.repository.js';
import * as questionRepository from '../database/repositories/question.repository.js';
import * as teamRepository from '../database/repositories/team.repository.js';
import logger from '../utils/logger.js';

export const getMyAnswers = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    // Get user's team for current month
    const userTeams = teamRepository.getUserTeams(userId, month, year);
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

export const submitAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    // Validation is handled by middleware, values are already validated
    const { questionId, score } = req.body;

    // Additional security: Verify user ID is valid integer
    if (!userId || typeof userId !== 'number' || userId <= 0) {
      return res.status(401).json({ error: 'Invalid user authentication' });
    }

    // Get question to verify it exists and get its month/year
    const question = questionRepository.getQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user already answered this question for the question's month/year
    if (answerRepository.hasAnsweredQuestion(userId, questionId, question.month, question.year)) {
      return res.status(409).json({ 
        error: 'You have already answered this question for this month' 
      });
    }

    // Verify user is assigned to a team for the question's month/year
    // This prevents users from answering questions for months they're not assigned to
    const userTeams = teamRepository.getUserTeams(userId, question.month, question.year);
    if (userTeams.length === 0) {
      return res.status(403).json({ 
        error: 'You are not assigned to a team for this month' 
      });
    }

    // Use the first team (user should only be in one team per month)
    const team = userTeams[0];
    
    // Additional security: Verify user ID matches authenticated user
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Create answer (score is already validated by middleware as integer 1-5)
    const answer = answerRepository.createAnswer(userId, questionId, team.id, score);

    res.status(201).json({
      id: answer.id,
      user_id: answer.user_id,
      question_id: answer.question_id,
      team_id: answer.team_id,
      score: answer.score,
      created_at: answer.created_at
    });
  } catch (error) {
    logger.error({
      event: 'answer.submission.failure',
      userId: req.user?.id,
      questionId: req.body.questionId,
      reason: 'internal_error',
      error: error.message,
      stack: error.stack
    }, 'Submit answer error');
    
    // Handle specific errors
    if (error.message === 'Answer already exists for this user, question, and team combination') {
      return res.status(409).json({ error: error.message });
    }
    
    if (error.message === 'Score must be an integer between 1 and 5') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

