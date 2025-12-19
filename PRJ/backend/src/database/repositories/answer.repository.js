import db from '../../config/database.js';

export const createAnswer = (userId, questionId, teamId, score) => {
  // Validate score
  if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
    throw new Error('Score must be an integer between 1 and 5');
  }
  
  try {
    const result = db.prepare(`
      INSERT INTO answers (user_id, question_id, team_id, score)
      VALUES (?, ?, ?, ?)
    `).run(userId, questionId, teamId, score);
    
    return db.prepare('SELECT * FROM answers WHERE id = ?').get(result.lastInsertRowid);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Answer already exists for this user, question, and team combination');
    }
    throw error;
  }
};

export const hasAnsweredQuestion = (userId, questionId, month, year) => {
  // Check if user has answered this question for the question's month/year
  // by checking if there's an answer where the question matches the month/year
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM answers a
    INNER JOIN questions q ON a.question_id = q.id
    WHERE a.user_id = ? AND a.question_id = ? AND q.month = ? AND q.year = ?
  `).get(userId, questionId, month, year);
  
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

export const getAnswersByTeam = (teamId) => {
  return db.prepare(`
    SELECT a.*, u.username, u.email, q.text as question_text
    FROM answers a
    INNER JOIN users u ON a.user_id = u.id
    INNER JOIN questions q ON a.question_id = q.id
    WHERE a.team_id = ?
    ORDER BY a.created_at
  `).all(teamId);
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

export const getAnswer = (userId, questionId, teamId) => {
  return db.prepare(`
    SELECT * FROM answers 
    WHERE user_id = ? AND question_id = ? AND team_id = ?
  `).get(userId, questionId, teamId) || null;
};

export const deleteAnswer = (userId, questionId, teamId) => {
  return db.prepare(`
    DELETE FROM answers 
    WHERE user_id = ? AND question_id = ? AND team_id = ?
  `).run(userId, questionId, teamId);
};

export const getEarliestSubmissionTime = (teamId) => {
  const result = db.prepare(`
    SELECT MIN(created_at) as earliest_submission
    FROM answers
    WHERE team_id = ? AND score IS NOT NULL
  `).get(teamId);
  return result?.earliest_submission || null;
};

