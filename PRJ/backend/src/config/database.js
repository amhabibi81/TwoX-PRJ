import Database from 'better-sqlite3';
import { config } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve database path - if relative, make it relative to project root
const dbPath = path.isAbsolute(config.databasePath)
  ? config.databasePath
  : path.resolve(__dirname, '../../', config.databasePath);

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

try {
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  logger.info({
    event: 'database.connection.success',
    path: dbPath
  }, `Connected to SQLite database at ${dbPath}`);
} catch (error) {
  logger.error({
    event: 'database.connection.failure',
    path: dbPath,
    error: error.message,
    stack: error.stack
  }, 'Failed to connect to database');
  process.exit(1);
}

export default db;

