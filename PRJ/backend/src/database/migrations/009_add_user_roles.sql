-- Add role column to users table for RBAC system
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'member';

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set all existing NULL roles to 'member' (safety measure)
-- Note: Admin role assignment from ADMIN_EMAILS will be handled in application-level migration
UPDATE users SET role = 'member' WHERE role IS NULL;
