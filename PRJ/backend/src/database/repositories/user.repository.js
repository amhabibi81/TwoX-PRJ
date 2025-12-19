import db from '../../config/database.js';

export const createUser = (username, email, passwordHash) => {
  try {
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `).run(username, email, passwordHash);
    
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

