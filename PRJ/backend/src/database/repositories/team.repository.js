import db from '../../config/database.js';

export const createTeam = (name, month, year, day = null, hour = null) => {
  try {
    const result = db.prepare(`
      INSERT INTO teams (name, month, year, day, hour)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, month, year, day, hour);
    
    return getTeamById(result.lastInsertRowid);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Team with this name already exists for this time period');
    }
    throw error;
  }
};

export const getTeamById = (id) => {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id) || null;
};

export const getTeamsByMonth = (month, year) => {
  return db.prepare('SELECT * FROM teams WHERE month = ? AND year = ? ORDER BY name')
    .all(month, year);
};

export const getTeamsByHour = (hour, day, month, year) => {
  return db.prepare(`
    SELECT * FROM teams 
    WHERE hour = ? AND day = ? AND month = ? AND year = ? 
    ORDER BY name
  `).all(hour, day, month, year);
};

export const getUserTeams = (userId, month, year) => {
  return db.prepare(`
    SELECT t.* FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ? AND t.month = ? AND t.year = ?
    ORDER BY t.name
  `).all(userId, month, year);
};

export const getUserTeamsByHour = (userId, hour, day, month, year) => {
  return db.prepare(`
    SELECT t.* FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ? AND t.hour = ? AND t.day = ? AND t.month = ? AND t.year = ?
    ORDER BY t.name
  `).all(userId, hour, day, month, year);
};

export const getAllTeams = () => {
  return db.prepare('SELECT * FROM teams ORDER BY year DESC, month DESC, name').all();
};

export const updateTeam = (id, updates) => {
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.month !== undefined) {
    fields.push('month = ?');
    values.push(updates.month);
  }
  if (updates.year !== undefined) {
    fields.push('year = ?');
    values.push(updates.year);
  }
  
  if (fields.length === 0) {
    return getTeamById(id);
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  try {
    db.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return getTeamById(id);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Team with this name already exists for this month and year');
    }
    throw error;
  }
};

export const deleteTeam = (id) => {
  return db.prepare('DELETE FROM teams WHERE id = ?').run(id);
};

export const teamsExistForMonth = (month, year) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM teams WHERE month = ? AND year = ?')
    .get(month, year);
  return result.count > 0;
};

export const teamsExistForHour = (hour, day, month, year) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM teams 
    WHERE hour = ? AND day = ? AND month = ? AND year = ?
  `).get(hour, day, month, year);
  return result.count > 0;
};

/**
 * Get teams created within the last N hours
 */
export const getTeamsInLastHours = (hours) => {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);
  
  return db.prepare(`
    SELECT * FROM teams 
    WHERE created_at >= datetime(?)
    ORDER BY created_at DESC
  `).all(cutoffTime.toISOString());
};

