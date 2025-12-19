-- Add score column to answers table
-- SQLite doesn't support CHECK constraints in ALTER TABLE, so we add the column
-- and enforce the constraint in application logic
ALTER TABLE answers ADD COLUMN score INTEGER;

-- For existing answers, set score to NULL (they used answer_text)
-- New answers will use score field
UPDATE answers SET score = NULL WHERE score IS NULL;

-- Note: answer_text column remains for backward compatibility
-- New code should use score field (1-5) instead

