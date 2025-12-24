import dotenv from 'dotenv';

dotenv.config();

// Only validate environment variables if NODE_ENV is set (indicates we're running, not building)
// During build phase, NODE_ENV may not be set, so we skip validation
// When server starts, NODE_ENV will be set by Render, so validation runs
if (process.env.NODE_ENV) {
  const requiredEnvVars = ['JWT_SECRET', 'PORT', 'DATABASE_PATH'];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your .env file.');
    process.exit(1);
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    console.error('❌ Invalid JWT_SECRET. Must be at least 32 characters long.');
    process.exit(1);
  }

  const portValue = parseInt(process.env.PORT, 10);
  if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
    console.error('❌ Invalid PORT value. Must be a number between 1 and 65535.');
    process.exit(1);
  }

  if (!process.env.DATABASE_PATH || process.env.DATABASE_PATH.trim().length === 0) {
    console.error('❌ Invalid DATABASE_PATH. Must be a non-empty string.');
    process.exit(1);
  }
}

// Parse values safely (may be undefined during build phase, but validated if NODE_ENV is set)
const databasePath = process.env.DATABASE_PATH ? process.env.DATABASE_PATH.trim() : '';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;

// Parse optional ADMIN_EMAILS (comma-separated)
const adminEmails = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim()).filter(email => email.length > 0)
  : [];

export const config = {
  jwtSecret: process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '',
  port,
  databasePath,
  adminEmails,
};

