-- Add evaluated_user_id and source_type to answers table for 360-degree evaluations
ALTER TABLE answers ADD COLUMN evaluated_user_id INTEGER;
ALTER TABLE answers ADD COLUMN source_type TEXT DEFAULT 'peer';

-- Set evaluated_user_id for existing answers based on team context
-- For existing peer evaluations, set evaluated_user_id to a teammate (or NULL if team has only one member)
UPDATE answers 
SET evaluated_user_id = (
    SELECT tm2.user_id 
    FROM team_members tm1
    INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = answers.user_id 
      AND tm2.user_id != answers.user_id
      AND tm1.team_id = answers.team_id
    LIMIT 1
)
WHERE evaluated_user_id IS NULL AND team_id IS NOT NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_answers_evaluated_user_id ON answers(evaluated_user_id);
CREATE INDEX IF NOT EXISTS idx_answers_source_type ON answers(source_type);

-- Note: SQLite doesn't support DROP CONSTRAINT, so the new unique constraint
-- (user_id, question_id, team_id, evaluated_user_id, source_type) will be
-- enforced in application logic. The existing constraint remains for backward compatibility.
