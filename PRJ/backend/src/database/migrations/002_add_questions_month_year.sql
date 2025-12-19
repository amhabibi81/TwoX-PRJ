-- Add month and year columns to questions table
ALTER TABLE questions ADD COLUMN month INTEGER;
ALTER TABLE questions ADD COLUMN year INTEGER;

-- Update existing questions to have current month/year (if any exist)
-- This handles migration of existing data
UPDATE questions 
SET month = CAST(strftime('%m', 'now') AS INTEGER), 
    year = CAST(strftime('%Y', 'now') AS INTEGER)
WHERE month IS NULL OR year IS NULL;

-- Add index for faster queries by month/year
CREATE INDEX IF NOT EXISTS idx_questions_month_year ON questions(month, year);

