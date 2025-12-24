import db from '../../config/database.js';

/**
 * Assign a manager to a user
 * @param {number} userId - The user being managed
 * @param {number} managerId - The manager's user ID
 */
export const assignManager = (userId, managerId) => {
  if (userId === managerId) {
    throw new Error('User cannot be their own manager');
  }

  try {
    const result = db.prepare(`
      INSERT INTO user_managers (user_id, manager_id)
      VALUES (?, ?)
    `).run(userId, managerId);
    
    return db.prepare('SELECT * FROM user_managers WHERE id = ?').get(result.lastInsertRowid);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Manager relationship already exists');
    }
    throw error;
  }
};

/**
 * Get a user's manager
 * @param {number} userId - The user ID
 * @returns {object|null} Manager record or null
 */
export const getManager = (userId) => {
  return db.prepare(`
    SELECT um.*, u.username as manager_username, u.email as manager_email
    FROM user_managers um
    INNER JOIN users u ON um.manager_id = u.id
    WHERE um.user_id = ?
    LIMIT 1
  `).get(userId) || null;
};

/**
 * Get all users managed by a manager
 * @param {number} managerId - The manager's user ID
 * @returns {Array} Array of managed user records
 */
export const getManagedUsers = (managerId) => {
  return db.prepare(`
    SELECT um.*, u.id as user_id, u.username, u.email
    FROM user_managers um
    INNER JOIN users u ON um.user_id = u.id
    WHERE um.manager_id = ?
    ORDER BY u.username
  `).all(managerId);
};

/**
 * Check if a user is managed by a specific manager
 * @param {number} managerId - The manager's user ID
 * @param {number} userId - The user ID to check
 * @returns {boolean} True if manager manages the user
 */
export const isManager = (managerId, userId) => {
  const result = db.prepare(`
    SELECT id FROM user_managers 
    WHERE manager_id = ? AND user_id = ?
  `).get(managerId, userId);
  
  return result !== null;
};

/**
 * Remove a manager relationship
 * @param {number} userId - The user ID
 * @param {number} managerId - The manager's user ID
 */
export const removeManager = (userId, managerId) => {
  return db.prepare(`
    DELETE FROM user_managers 
    WHERE user_id = ? AND manager_id = ?
  `).run(userId, managerId);
};

/**
 * Get all manager relationships
 * @returns {Array} Array of all manager relationships
 */
export const getAllManagerRelationships = () => {
  return db.prepare(`
    SELECT um.*, 
           u1.username as user_username, u1.email as user_email,
           u2.username as manager_username, u2.email as manager_email
    FROM user_managers um
    INNER JOIN users u1 ON um.user_id = u1.id
    INNER JOIN users u2 ON um.manager_id = u2.id
    ORDER BY u2.username, u1.username
  `).all();
};
