-- Add hour and day fields to teams table for hourly team generation
-- Keep month and year for backward compatibility, but add hour and day
-- Note: SQLite doesn't support adding CHECK constraints to existing columns via ALTER TABLE
-- We'll add the columns without CHECK constraints and enforce validation in application layer

ALTER TABLE teams ADD COLUMN hour INTEGER;
ALTER TABLE teams ADD COLUMN day INTEGER;

-- Create index for hour-based queries
CREATE INDEX IF NOT EXISTS idx_teams_hour_day_month_year ON teams(hour, day, month, year);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at);


