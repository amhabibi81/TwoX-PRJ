-- Create user_managers table to track manager-employee relationships
CREATE TABLE IF NOT EXISTS user_managers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    manager_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, manager_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_managers_user_id ON user_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_managers_manager_id ON user_managers(manager_id);
