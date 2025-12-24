import Database from 'better-sqlite3';
import { config } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let dbPath = null;

// Lazy database connection - only connect when first accessed
function getDatabase() {
  if (!db) {
    // Resolve database path - if relative, make it relative to project root
    dbPath = path.isAbsolute(config.databasePath)
      ? config.databasePath
      : path.resolve(__dirname, '../../', config.databasePath);

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

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
  }
  return db;
}

// Export a Proxy that lazily connects on first access
export default new Proxy({}, {
  get(target, prop) {
    const database = getDatabase();
    const value = database[prop];
    
    // If it's a function, bind it to the database instance
    if (typeof value === 'function') {
      return value.bind(database);
    }
    
    return value;
  },
  set(target, prop, value) {
    const database = getDatabase();
    database[prop] = value;
    return true;
  }
});

