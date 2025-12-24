import db from '../../config/database.js';
import { ROLES } from '../../config/roles.config.js';

export const createUser = (username, email, passwordHash, role = ROLES.MEMBER) => {
  try {
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(username, email, passwordHash, role);
    
    return findUserById(result.lastInsertRowid);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
};

export const findUserByEmail = (email) => {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
};

export const findUserById = (id) => {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
};

export const findUserByUsername = (username) => {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
};

export const getAllUsers = () => {
  return db.prepare('SELECT id, username, email, created_at FROM users ORDER BY created_at').all();
};

export const updateUser = (id, updates) => {
  const fields = [];
  const values = [];
  
  if (updates.username !== undefined) {
    fields.push('username = ?');
    values.push(updates.username);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if (updates.password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push(updates.password_hash);
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  
  if (fields.length === 0) {
    return findUserById(id);
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  try {
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return findUserById(id);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Username or email already exists');
    }
    throw error;
  }
};

/**
 * Get user's role
 * @param {number} userId - The user ID
 * @returns {string|null} User's role or null if user not found
 */
export const getUserRole = (userId) => {
  const user = findUserById(userId);
  return user?.role || null;
};

/**
 * Update user's role
 * @param {number} userId - The user ID
 * @param {string} role - The new role
 * @returns {object|null} Updated user object or null if user not found
 */
export const updateUserRole = (userId, role) => {
  return updateUser(userId, { role });
};

/**
 * Get all users with a specific role
 * @param {string} role - The role to filter by
 * @returns {Array} Array of user objects
 */
export const getUsersByRole = (role) => {
  return db.prepare(`
    SELECT id, username, email, role, created_at 
    FROM users 
    WHERE role = ? 
    ORDER BY created_at
  `).all(role);
};

