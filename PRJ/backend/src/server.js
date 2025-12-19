import app from './app.js';
import { config } from './config/env.js';
import { initializeDatabase } from './database/init.js';
import { setupMonthlyTeamGeneration } from './services/cron.service.js';
import logger from './utils/logger.js';

async function startServer() {
  try {
    // Initialize database (runs migrations)
    await initializeDatabase();
    
    // Setup cron job for monthly team generation (skip in test mode)
    if (process.env.NODE_ENV !== 'test') {
      setupMonthlyTeamGeneration();
    }
    
    // Start server
    app.listen(config.port, () => {
      logger.info({
        event: 'server.start',
        port: config.port,
        env: process.env.NODE_ENV || 'development'
      }, `Backend running on port ${config.port}`);
    });
  } catch (error) {
    logger.error({
      event: 'server.start.failure',
      error: error.message,
      stack: error.stack
    }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();
