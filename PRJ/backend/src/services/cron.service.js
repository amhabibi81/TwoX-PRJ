import cron from 'node-cron';
import { generateTeamsForMonth } from './teamGeneration.service.js';
import logger from '../utils/logger.js';

/**
 * Calculate the next month and year
 */
function getNextMonth() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = currentDate.getFullYear();
  
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  
  // Handle December -> January
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = currentYear + 1;
  }
  
  return { month: nextMonth, year: nextYear };
}

/**
 * Check if today is the last day of the month
 */
function isLastDayOfMonth() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // If tomorrow is the 1st, today is the last day
  return tomorrow.getDate() === 1;
}

/**
 * Setup monthly team generation cron job
 * Runs daily at 11:59 PM and checks if it's the last day of month
 * Generates teams for the NEXT month on the last day
 */
export const setupMonthlyTeamGeneration = () => {
  // Cron expression: Run daily at 23:59
  // We'll check inside the handler if it's the last day
  const cronExpression = '59 23 * * *';
  
  const job = cron.schedule(cronExpression, async () => {
    try {
      // Only proceed if today is the last day of the month
      if (!isLastDayOfMonth()) {
        return; // Not the last day, skip execution
      }
      
      const { month, year } = getNextMonth();
      
      logger.info({
        event: 'team.generation.cron.triggered',
        month,
        year,
        source: 'cron'
      }, `Cron job triggered: Generating teams for ${month}/${year}`);
      
      const result = await generateTeamsForMonth(month, year);
      
      if (result.success) {
        logger.info({
          event: 'team.generation.cron.success',
          month,
          year,
          teamCount: result.teamCount,
          source: 'cron'
        }, `Successfully generated ${result.teamCount} teams for ${month}/${year}`);
      } else if (result.skipped) {
        logger.info({
          event: 'team.generation.cron.skipped',
          month,
          year,
          reason: result.error,
          source: 'cron'
        }, `Skipped: ${result.error}`);
      } else {
        logger.error({
          event: 'team.generation.cron.failure',
          month,
          year,
          error: result.error,
          source: 'cron'
        }, `Failed to generate teams: ${result.error}`);
      }
    } catch (error) {
      logger.error({
        event: 'team.generation.cron.error',
        error: error.message,
        stack: error.stack,
        source: 'cron'
      }, 'Cron job error');
      // Don't throw - allow cron to continue running
    }
  }, {
    scheduled: false, // Don't start immediately
    timezone: 'UTC' // Use UTC timezone
  });
  
  // Start the cron job
  job.start();
  
  const { month, year } = getNextMonth();
  logger.info({
    event: 'cron.job.scheduled',
    job: 'monthly_team_generation',
    schedule: 'Daily at 11:59 PM UTC (executes on last day of month)',
    nextTargetMonth: month,
    nextTargetYear: year
  }, 'Monthly team generation cron job scheduled');
  
  return job;
};
