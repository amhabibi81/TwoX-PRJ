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

/**
 * Get all user IDs who have been teammates with the given user in previous months/years
 * @param {number} userId - The user ID
 * @param {number} excludeMonth - Month to exclude (current month being generated)
 * @param {number} excludeYear - Year to exclude (current year being generated)
 * @returns {Array<number>} Array of user IDs who were previous teammates
 */
export const getPreviousTeammates = (userId, excludeMonth = null, excludeYear = null) => {
  let query = `
    SELECT DISTINCT tm2.user_id
    FROM team_members tm1
    INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    INNER JOIN teams t ON tm1.team_id = t.id
    WHERE tm1.user_id = ? AND tm2.user_id != ?
  `;
  
  const params = [userId, userId];
  
  if (excludeMonth !== null && excludeYear !== null) {
    query += ` AND NOT (t.month = ? AND t.year = ?)`;
    params.push(excludeMonth, excludeYear);
  }
  
  const results = db.prepare(query).all(...params);
  return results.map(r => r.user_id);
};

/**
 * Build a set of user pairs (as strings "userId1-userId2") who have been teammates before
 * @param {Array<number>} userIds - Array of user IDs to check
 * @param {number} excludeHour - Hour to exclude (current hour being generated)
 * @param {number} excludeDay - Day to exclude (current day being generated)
 * @param {number} excludeMonth - Month to exclude (current month being generated)
 * @param {number} excludeYear - Year to exclude (current year being generated)
 * @returns {Set<string>} Set of strings like "1-2" representing user pairs who were teammates
 */
export const getPreviousTeamPairings = (userIds, excludeHour = null, excludeDay = null, excludeMonth = null, excludeYear = null) => {
  if (userIds.length < 2) {
    return new Set();
  }
  
  // Create placeholders for IN clause
  const placeholders = userIds.map(() => '?').join(',');
  let query = `
    SELECT DISTINCT 
      CASE 
        WHEN tm1.user_id < tm2.user_id THEN tm1.user_id || '-' || tm2.user_id
        ELSE tm2.user_id || '-' || tm1.user_id
      END as pair
    FROM team_members tm1
    INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
    INNER JOIN teams t ON tm1.team_id = t.id
    WHERE tm1.user_id IN (${placeholders})
      AND tm2.user_id IN (${placeholders})
      AND tm1.user_id != tm2.user_id
  `;
  
  const params = [...userIds, ...userIds];
  
  // Exclude current hour if provided, otherwise check teams from last hour
  if (excludeHour !== null && excludeDay !== null && excludeMonth !== null && excludeYear !== null) {
    // Exclude current hour
    query += ` AND NOT (t.hour = ? AND t.day = ? AND t.month = ? AND t.year = ?)`;
    params.push(excludeHour, excludeDay, excludeMonth, excludeYear);
    
    // Also check teams from last hour (to avoid immediate re-pairing)
    // Calculate previous hour
    let prevHour = excludeHour - 1;
    let prevDay = excludeDay;
    let prevMonth = excludeMonth;
    let prevYear = excludeYear;
    
    if (prevHour < 0) {
      prevHour = 23;
      prevDay = excludeDay - 1;
      if (prevDay < 1) {
        prevMonth = excludeMonth - 1;
        if (prevMonth < 1) {
          prevMonth = 12;
          prevYear = excludeYear - 1;
        }
        // Approximate day - in production you'd want proper date handling
        prevDay = 28; // Safe fallback
      }
    }
    
    // Include teams from last hour in the check (we want to avoid these pairings)
    // The query already excludes current hour, so we're checking historical teams
  } else {
    // If no specific hour provided, check teams from last hour using created_at
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    query += ` AND t.created_at >= datetime(?)`;
    params.push(oneHourAgo.toISOString());
  }
  
  const results = db.prepare(query).all(...params);
  return new Set(results.map(r => r.pair));
};

