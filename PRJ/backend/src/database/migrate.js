import db from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create migrations table if it doesn't exist
function createMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Get list of applied migrations
function getAppliedMigrations() {
  const rows = db.prepare('SELECT name FROM migrations ORDER BY name').all();
  return rows.map(row => row.name);
}

// Record that a migration has been applied
function recordMigration(name) {
  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
}

// Get all migration files from the migrations directory
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  return files;
}

// Run a single migration file
function runMigration(filename) {
  const filePath = path.join(__dirname, 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  logger.info({
    event: 'migration.start',
    filename
  }, `Running migration: ${filename}`);
  
  try {
    db.exec(sql);
    recordMigration(filename);
    logger.info({
      event: 'migration.success',
      filename
    }, `Applied: ${filename}`);
  } catch (error) {
    logger.error({
      event: 'migration.failure',
      filename,
      error: error.message,
      stack: error.stack
    }, `Failed to apply ${filename}`);
    throw error;
  }
}

// Run all pending migrations
export function migrate() {
  logger.info({
    event: 'migration.run.start'
  }, 'Running database migrations...');
  
  createMigrationsTable();
  const appliedMigrations = getAppliedMigrations();
  const migrationFiles = getMigrationFiles();
  
  const pendingMigrations = migrationFiles.filter(
    file => !appliedMigrations.includes(file)
  );
  
  if (pendingMigrations.length === 0) {
    logger.info({
      event: 'migration.run.complete',
      pendingCount: 0
    }, 'No pending migrations');
    return;
  }
  
  logger.info({
    event: 'migration.run.pending',
    pendingCount: pendingMigrations.length
  }, `Found ${pendingMigrations.length} pending migration(s)`);
  
  for (const migration of pendingMigrations) {
    runMigration(migration);
  }
  
  logger.info({
    event: 'migration.run.complete',
    appliedCount: pendingMigrations.length
  }, 'All migrations completed');
}

// Get migration status
export function getMigrationStatus() {
  createMigrationsTable();
  const appliedMigrations = getAppliedMigrations();
  const migrationFiles = getMigrationFiles();
  
  return {
    applied: appliedMigrations,
    pending: migrationFiles.filter(file => !appliedMigrations.includes(file)),
    total: migrationFiles.length
  };
}

