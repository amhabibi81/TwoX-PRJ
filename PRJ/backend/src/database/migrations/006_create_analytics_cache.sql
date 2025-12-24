-- Create analytics cache table to store calculated analytics aggregations per month/year
CREATE TABLE IF NOT EXISTS analytics_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    cache_type TEXT NOT NULL, -- 'team_participation', 'user_avg_score', 'top_performers', 'month_comparison'
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    data TEXT NOT NULL, -- JSON string of cached data
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_cache_type_month_year ON analytics_cache(cache_type, month, year);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
