import db from '../../config/database.js';

export const getCachedResults = (month, year) => {
  return db.prepare(`
    SELECT rc.*, t.name as team_name
    FROM results_cache rc
    INNER JOIN teams t ON rc.team_id = t.id
    WHERE rc.month = ? AND rc.year = ?
    ORDER BY rc.total_score DESC, t.name
  `).all(month, year);
};

export const cacheResults = (month, year, teamResults) => {
  // Use transaction to ensure all-or-nothing caching
  const transaction = db.transaction((results) => {
    // Delete existing cache for this month/year
    db.prepare('DELETE FROM results_cache WHERE month = ? AND year = ?')
      .run(month, year);
    
    // Insert new cached results
    const insertStmt = db.prepare(`
      INSERT INTO results_cache (month, year, team_id, total_score, answer_count, question_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const result of results) {
      insertStmt.run(
        month,
        year,
        result.teamId,
        result.totalScore,
        result.answerCount,
        result.questionCount
      );
    }
  });
  
  transaction(teamResults);
  
  return getCachedResults(month, year);
};

export const clearCache = (month, year) => {
  return db.prepare('DELETE FROM results_cache WHERE month = ? AND year = ?')
    .run(month, year);
};

export const getTeamScore = (teamId, month, year) => {
  return db.prepare(`
    SELECT * FROM results_cache 
    WHERE team_id = ? AND month = ? AND year = ?
  `).get(teamId, month, year) || null;
};

export const hasCachedResults = (month, year) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM results_cache WHERE month = ? AND year = ?')
    .get(month, year);
  return result.count > 0;
};

export const getCacheTimestamp = (month, year) => {
  const result = db.prepare(`
    SELECT MAX(calculated_at) as latest_calculated_at 
    FROM results_cache 
    WHERE month = ? AND year = ?
  `).get(month, year);
  return result?.latest_calculated_at || null;
};

