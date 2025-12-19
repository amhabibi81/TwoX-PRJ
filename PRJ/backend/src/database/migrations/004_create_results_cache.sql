-- Create results cache table to store calculated team scores per month
CREATE TABLE IF NOT EXISTS results_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL CHECK(month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 0,
    answer_count INTEGER NOT NULL DEFAULT 0,
    question_count INTEGER NOT NULL DEFAULT 0,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(month, year, team_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_results_cache_month_year ON results_cache(month, year);
CREATE INDEX IF NOT EXISTS idx_results_cache_team_id ON results_cache(team_id);

