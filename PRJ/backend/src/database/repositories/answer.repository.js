import db from '../../config/database.js';
import { SOURCE_TYPES, VALID_SOURCE_TYPES } from '../../config/evaluation.config.js';

/**
 * Create an answer with support for 360-degree evaluations
 * @param {number} userId - The user submitting the answer
 * @param {number} questionId - The question ID
 * @param {number} teamId - The team ID
 * @param {number} score - The score (1-5)
 * @param {number|null} evaluatedUserId - The user being evaluated (null for backward compatibility)
 * @param {string} sourceType - Source type: 'self', 'peer', or 'manager' (defaults to 'peer')
 */
export const createAnswer = (userId, questionId, teamId, score, evaluatedUserId = null, sourceType = SOURCE_TYPES.PEER) => {
  // Validate score
  if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
    throw new Error('Score must be an integer between 1 and 5');
  }

  // Validate source type
  if (!VALID_SOURCE_TYPES.includes(sourceType)) {
    throw new Error(`Invalid source_type. Must be one of: ${VALID_SOURCE_TYPES.join(', ')}`);
  }

  // For backward compatibility: if evaluatedUserId is null, try to infer from team context
  if (evaluatedUserId === null && teamId) {
    // Try to find a teammate (for peer evaluation)
    const teammate = db.prepare(`
      SELECT tm2.user_id 
      FROM team_members tm1
      INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = ? AND tm2.user_id != ? AND tm1.team_id = ?
      LIMIT 1
    `).get(userId, userId, teamId);
    
    if (teammate) {
      evaluatedUserId = teammate.user_id;
    }
  }

  // Check for duplicate answer with new unique constraint
  // Constraint: (user_id, question_id, team_id, evaluated_user_id, source_type)
  const existing = db.prepare(`
    SELECT id FROM answers 
    WHERE user_id = ? AND question_id = ? AND team_id = ? 
      AND (evaluated_user_id = ? OR (evaluated_user_id IS NULL AND ? IS NULL))
      AND source_type = ?
  `).get(userId, questionId, teamId, evaluatedUserId, evaluatedUserId, sourceType);

  if (existing) {
    throw new Error(`Answer already exists for this user, question, team, evaluated user, and source type combination`);
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO answers (user_id, question_id, team_id, score, evaluated_user_id, source_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, questionId, teamId, score, evaluatedUserId, sourceType);
    
    return db.prepare('SELECT * FROM answers WHERE id = ?').get(result.lastInsertRowid);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Answer already exists for this user, question, team, evaluated user, and source type combination');
    }
    throw error;
  }
};

/**
 * Check if user has answered a question
 * @param {number} userId - The user ID
 * @param {number} questionId - The question ID
 * @param {number} month - The month
 * @param {number} year - The year
 * @param {number|null} evaluatedUserId - Optional: check for specific evaluated user
 * @param {string|null} sourceType - Optional: check for specific source type
 * @returns {boolean} True if answer exists
 */
export const hasAnsweredQuestion = (userId, questionId, month, year, evaluatedUserId = null, sourceType = null) => {
  let query = `
    SELECT COUNT(*) as count
    FROM answers a
    INNER JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND a.question_id = ? AND q.month = ? AND q.year = ?
  `;
  
  const params = [userId, questionId, month, year];
  
  if (evaluatedUserId !== null) {
    query += ` AND a.evaluated_user_id = ?`;
    params.push(evaluatedUserId);
  } else {
    query += ` AND a.evaluated_user_id IS NULL`;
  }
  
  if (sourceType !== null) {
    query += ` AND a.source_type = ?`;
    params.push(sourceType);
  }
  
  const result = db.prepare(query).get(...params);
  return result.count > 0;
};

export const updateAnswer = (userId, questionId, teamId, score) => {
  // Validate score
  if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
    throw new Error('Score must be an integer between 1 and 5');
  }
  
  db.prepare(`
    UPDATE answers 
    SET score = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND question_id = ? AND team_id = ?
  `).run(score, userId, questionId, teamId);
  
  return db.prepare(`
    SELECT * FROM answers 
    WHERE user_id = ? AND question_id = ? AND team_id = ?
  `).get(userId, questionId, teamId);
};

export const getAnswersByUser = (userId, teamId = null) => {
  if (teamId) {
    return db.prepare(`
      SELECT a.*, q.text as question_text
      FROM answers a
      INNER JOIN questions q ON a.question_id = q.id
      WHERE a.user_id = ? AND a.team_id = ?
      ORDER BY a.created_at
    `).all(userId, teamId);
  }
  
  return db.prepare(`
    SELECT a.*, q.text as question_text
    FROM answers a
    INNER JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ?
    ORDER BY a.created_at
  `).all(userId);
};

export const getAnswersByQuestion = (questionId, teamId = null) => {
  if (teamId) {
    return db.prepare(`
      SELECT a.*, u.username, u.email
      FROM answers a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.question_id = ? AND a.team_id = ?
      ORDER BY a.created_at
    `).all(questionId, teamId);
  }
  
  return db.prepare(`
    SELECT a.*, u.username, u.email
    FROM answers a
    INNER JOIN users u ON a.user_id = u.id
    WHERE a.question_id = ?
    ORDER BY a.created_at
  `).all(questionId);
};

/**
 * Get answers by team with optional filters
 * @param {number} teamId - The team ID
 * @param {string|null} sourceType - Optional: filter by source type
 * @param {number|null} evaluatedUserId - Optional: filter by evaluated user
 * @returns {Array} Array of answers
 */
export const getAnswersByTeam = (teamId, sourceType = null, evaluatedUserId = null) => {
  let query = `
    SELECT a.*, u.username, u.email, q.text as question_text,
           eu.username as evaluated_username, eu.email as evaluated_email
    FROM answers a
    INNER JOIN users u ON a.user_id = u.id
    INNER JOIN questions q ON a.question_id = q.id
    LEFT JOIN users eu ON a.evaluated_user_id = eu.id
    WHERE a.team_id = ?
  `;
  
  const params = [teamId];
  
  if (sourceType !== null) {
    query += ` AND a.source_type = ?`;
    params.push(sourceType);
  }
  
  if (evaluatedUserId !== null) {
    query += ` AND a.evaluated_user_id = ?`;
    params.push(evaluatedUserId);
  }
  
  query += ` ORDER BY a.created_at`;
  
  return db.prepare(query).all(...params);
};

/**
 * Get all answers evaluating a specific user
 * @param {number} evaluatedUserId - The user being evaluated
 * @param {number|null} teamId - Optional: filter by team
 * @param {string|null} sourceType - Optional: filter by source type
 * @returns {Array} Array of answers
 */
export const getAnswersForUser = (evaluatedUserId, teamId = null, sourceType = null) => {
  let query = `
    SELECT a.*, u.username, u.email, q.text as question_text, q.month, q.year
    FROM answers a
    INNER JOIN users u ON a.user_id = u.id
    INNER JOIN questions q ON a.question_id = q.id
    WHERE a.evaluated_user_id = ?
  `;
  
  const params = [evaluatedUserId];
  
  if (teamId !== null) {
    query += ` AND a.team_id = ?`;
    params.push(teamId);
  }
  
  if (sourceType !== null) {
    query += ` AND a.source_type = ?`;
    params.push(sourceType);
  }
  
  query += ` ORDER BY a.created_at`;
  
  return db.prepare(query).all(...params);
};

export const getTeamScoreSummary = (teamId) => {
  // Get aggregated score data for a team
  const result = db.prepare(`
    SELECT 
      COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as answer_count,
      COALESCE(SUM(score), 0) as total_score,
      COUNT(*) as total_answers
    FROM answers
    WHERE team_id = ?
  `).get(teamId);
  
  return {
    totalScore: result.total_score || 0,
    answerCount: result.answer_count || 0,
    totalAnswers: result.total_answers || 0
  };
};

/**
 * Get a specific answer
 * @param {number} userId - The user who submitted the answer
 * @param {number} questionId - The question ID
 * @param {number} teamId - The team ID
 * @param {number|null} evaluatedUserId - Optional: filter by evaluated user
 * @param {string|null} sourceType - Optional: filter by source type
 * @returns {object|null} Answer record or null
 */
export const getAnswer = (userId, questionId, teamId, evaluatedUserId = null, sourceType = null) => {
  let query = `
    SELECT * FROM answers 
    WHERE user_id = ? AND question_id = ? AND team_id = ?
  `;
  
  const params = [userId, questionId, teamId];
  
  if (evaluatedUserId !== null) {
    query += ` AND evaluated_user_id = ?`;
    params.push(evaluatedUserId);
  } else {
    query += ` AND evaluated_user_id IS NULL`;
  }
  
  if (sourceType !== null) {
    query += ` AND source_type = ?`;
    params.push(sourceType);
  }
  
  return db.prepare(query).get(...params) || null;
};

/**
 * Delete an answer
 * @param {number} userId - The user who submitted the answer
 * @param {number} questionId - The question ID
 * @param {number} teamId - The team ID
 * @param {number|null} evaluatedUserId - Optional: filter by evaluated user
 * @param {string|null} sourceType - Optional: filter by source type
 */
export const deleteAnswer = (userId, questionId, teamId, evaluatedUserId = null, sourceType = null) => {
  let query = `
    DELETE FROM answers 
    WHERE user_id = ? AND question_id = ? AND team_id = ?
  `;
  
  const params = [userId, questionId, teamId];
  
  if (evaluatedUserId !== null) {
    query += ` AND evaluated_user_id = ?`;
    params.push(evaluatedUserId);
  } else {
    query += ` AND evaluated_user_id IS NULL`;
  }
  
  if (sourceType !== null) {
    query += ` AND source_type = ?`;
    params.push(sourceType);
  }
  
  return db.prepare(query).run(...params);
};

export const getEarliestSubmissionTime = (teamId) => {
  const result = db.prepare(`
    SELECT MIN(created_at) as earliest_submission
    FROM answers
    WHERE team_id = ? AND score IS NOT NULL
  `).get(teamId);
  return result?.earliest_submission || null;
};

