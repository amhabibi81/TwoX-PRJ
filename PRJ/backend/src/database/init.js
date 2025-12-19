import { migrate } from './migrate.js';
import * as questionRepository from './repositories/question.repository.js';
import logger from '../utils/logger.js';

export async function initializeDatabase() {
  try {
    logger.info({
      event: 'database.initialization.start'
    }, 'Initializing database...');
    
    // Run migrations
    migrate();
    
    // Seed default questions for current month if they don't exist
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const year = currentDate.getFullYear();
    
    const seeded = questionRepository.seedDefaultQuestions(month, year);
    if (seeded) {
      logger.info({
        event: 'database.questions.seeded',
        month,
        year,
        questionCount: 5
      }, `Seeded 5 default questions for ${month}/${year}`);
    } else {
      logger.debug({
        event: 'database.questions.skip',
        month,
        year
      }, `Questions already exist for ${month}/${year}, skipping seed`);
    }
    
    logger.info({
      event: 'database.initialization.success'
    }, 'Database initialized successfully');
    return true;
  } catch (error) {
    logger.error({
      event: 'database.initialization.failure',
      error: error.message,
      stack: error.stack
    }, 'Database initialization failed');
    throw error;
  }
}

export default initializeDatabase;

