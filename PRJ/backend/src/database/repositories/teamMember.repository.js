import db from '../../config/database.js';

export const addMember = (teamId, userId) => {
  try {
    const result = db.prepare(`
      INSERT INTO team_members (team_id, user_id)
      VALUES (?, ?)
    `).run(teamId, userId);
    
    return db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('User is already a member of this team');
    }
    throw error;
  }
};

export const removeMember = (teamId, userId) => {
  return db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?')
    .run(teamId, userId);
};

export const getTeamMembers = (teamId) => {
  return db.prepare(`
    SELECT u.id, u.username, u.email, tm.created_at as joined_at
    FROM team_members tm
    INNER JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.created_at
  `).all(teamId);
};

export const getUserTeams = (userId) => {
  return db.prepare(`
    SELECT t.*, tm.created_at as joined_at
    FROM team_members tm
    INNER JOIN teams t ON tm.team_id = t.id
    WHERE tm.user_id = ?
    ORDER BY t.year DESC, t.month DESC, t.name
  `).all(userId);
};

export const isMember = (teamId, userId) => {
  const result = db.prepare('SELECT id FROM team_members WHERE team_id = ? AND user_id = ?')
    .get(teamId, userId);
  return result !== null;
};

export const getMemberCount = (teamId) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?')
    .get(teamId);
  return result ? result.count : 0;
};

