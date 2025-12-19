import * as questionRepository from '../database/repositories/question.repository.js';
import logger from '../utils/logger.js';

export const getQuestions = (req, res) => {
  try {
    const { month, year } = req.query;
    
    let questions;
    
    if (month && year) {
      // Fetch questions for specified month/year
      // Values are already validated by middleware
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      questions = questionRepository.getQuestionsByMonth(monthNum, yearNum);
    } else {
      // Fetch questions for current month (active questions)
      questions = questionRepository.getActiveQuestions();
    }
    
    res.json(questions);
  } catch (error) {
    logger.error({
      event: 'question.retrieval.failure',
      month: req.query.month,
      year: req.query.year,
      error: error.message,
      stack: error.stack
    }, 'Get questions error');
    res.status(500).json({ error: 'Internal server error' });
  }
};
