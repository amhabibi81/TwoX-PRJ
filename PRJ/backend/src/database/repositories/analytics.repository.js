import db from '../../config/database.js';

/**
 * Get team participation rate data for a given month/year
 * Returns teams with their participation rates (submitted answers / expected answers)
 */
export const getTeamParticipationRate = (month, year) => {
  return db.prepare(`
    SELECT 
      t.id as team_id,
      t.name as team_name,
      COUNT(DISTINCT tm.user_id) as member_count,
      COUNT(DISTINCT CASE WHEN q.month = ? AND q.year = ? THEN a.id END) as submitted_answers,
      (SELECT COUNT(*) FROM questions WHERE month = ? AND year = ?) as question_count,
      (COUNT(DISTINCT tm.user_id) * (SELECT COUNT(*) FROM questions WHERE month = ? AND year = ?)) as expected_answers
    FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN answers a ON t.id = a.team_id
    LEFT JOIN questions q ON a.question_id = q.id
    WHERE t.month = ? AND t.year = ?
    GROUP BY t.id, t.name
    ORDER BY t.name
  `).all(month, year, month, year, month, year, month, year);
};

/**
 * Get average score per team for a given month/year
 * Only counts answers with valid scores (1-5)
 */
export const getAverageScorePerTeam = (month, year) => {
  return db.prepare(`
    SELECT 
      t.id as team_id,
      t.name as team_name,
      COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) as total_answers,
      COALESCE(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END), 0) as total_score,
      CASE 
        WHEN COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) > 0 
        THEN CAST(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END) AS REAL) / COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END)
        ELSE 0
      END as average_score
    FROM teams t
    LEFT JOIN answers a ON t.id = a.team_id
    LEFT JOIN questions q ON a.question_id = q.id
    WHERE t.month = ? AND t.year = ?
    GROUP BY t.id, t.name
    ORDER BY average_score DESC, t.name
  `).all(month, year, month, year, month, year, month, year, month, year, month, year);
};

/**
 * Get average score per user for a given month/year
 * Aggregates across all teams the user belongs to in the month
 */
export const getAverageScorePerUser = (month, year) => {
  return db.prepare(`
    SELECT 
      u.id as user_id,
      u.username,
      u.email,
      COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) as total_answers,
      COALESCE(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END), 0) as total_score,
      CASE 
        WHEN COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) > 0 
        THEN CAST(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END) AS REAL) / COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END)
        ELSE 0
      END as average_score
    FROM users u
    INNER JOIN team_members tm ON u.id = tm.user_id
    INNER JOIN teams t ON tm.team_id = t.id
    LEFT JOIN answers a ON u.id = a.user_id AND t.id = a.team_id
    LEFT JOIN questions q ON a.question_id = q.id
    WHERE t.month = ? AND t.year = ?
    GROUP BY u.id, u.username, u.email
    HAVING COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) > 0
    ORDER BY average_score DESC, u.username
  `).all(month, year, month, year, month, year, month, year, month, year, month, year, month, year);
};

/**
 * Get top performers (users with highest average scores)
 * @param {number} month
 * @param {number} year
 * @param {number} limit - Number of top performers to return
 */
export const getTopPerformers = (month, year, limit = 3) => {
  return db.prepare(`
    SELECT 
      u.id as user_id,
      u.username,
      u.email,
      COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) as total_answers,
      COALESCE(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END), 0) as total_score,
      CASE 
        WHEN COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) > 0 
        THEN CAST(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END) AS REAL) / COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END)
        ELSE 0
      END as average_score
    FROM users u
    INNER JOIN team_members tm ON u.id = tm.user_id
    INNER JOIN teams t ON tm.team_id = t.id
    LEFT JOIN answers a ON u.id = a.user_id AND t.id = a.team_id
    LEFT JOIN questions q ON a.question_id = q.id
    WHERE t.month = ? AND t.year = ?
    GROUP BY u.id, u.username, u.email
    HAVING COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) >= 3
    ORDER BY average_score DESC, u.username
    LIMIT ?
  `).all(month, year, month, year, month, year, month, year, month, year, month, year, month, year, limit);
};

/**
 * Get bottom performers (users with lowest average scores)
 * @param {number} month
 * @param {number} year
 * @param {number} limit - Number of bottom performers to return
 */
export const getBottomPerformers = (month, year, limit = 3) => {
  return db.prepare(`
    SELECT 
      u.id as user_id,
      u.username,
      u.email,
      COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) as total_answers,
      COALESCE(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END), 0) as total_score,
      CASE 
        WHEN COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) > 0 
        THEN CAST(SUM(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.score ELSE 0 END) AS REAL) / COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END)
        ELSE 0
      END as average_score
    FROM users u
    INNER JOIN team_members tm ON u.id = tm.user_id
    INNER JOIN teams t ON tm.team_id = t.id
    LEFT JOIN answers a ON u.id = a.user_id AND t.id = a.team_id
    LEFT JOIN questions q ON a.question_id = q.id
    WHERE t.month = ? AND t.year = ?
    GROUP BY u.id, u.username, u.email
    HAVING COUNT(CASE WHEN q.month = ? AND q.year = ? AND a.score >= 1 AND a.score <= 5 THEN a.id END) >= 3
    ORDER BY average_score ASC, u.username
    LIMIT ?
  `).all(month, year, month, year, month, year, month, year, month, year, month, year, month, year, limit);
};

/**
 * Get month comparison data (current vs previous month)
 * Returns aggregated metrics for both months
 */
export const getMonthComparison = (currentMonth, currentYear) => {
  // Calculate previous month/year
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = currentYear - 1;
  }

  const current = db.prepare(`
    SELECT 
      COUNT(DISTINCT u.id) as total_users,
      COUNT(DISTINCT t.id) as total_teams,
      COUNT(DISTINCT CASE WHEN q.month = ? AND q.year = ? THEN a.id END) as total_answers,
      COUNT(DISTINCT tm.user_id) as total_team_members,
      (SELECT COUNT(*) FROM questions WHERE month = ? AND year = ?) as question_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON tm.user_id = u.id
    LEFT JOIN answers a ON t.id = a.team_id
    LEFT JOIN questions q ON a.question_id = q.id
    WHERE t.month = ? AND t.year = ?
  `).get(currentMonth, currentYear, currentMonth, currentYear, currentMonth, currentYear);

  const previous = db.prepare(`
    SELECT 
      COUNT(DISTINCT u.id) as total_users,
      COUNT(DISTINCT t.id) as total_teams,
      COUNT(DISTINCT CASE WHEN q.month = ? AND q.year = ? THEN a.id END) as total_answers,
      COUNT(DISTINCT tm.user_id) as total_team_members,
      (SELECT COUNT(*) FROM questions WHERE month = ? AND year = ?) as question_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON tm.user_id = u.id
    LEFT JOIN answers a ON t.id = a.team_id
    LEFT JOIN questions q ON a.question_id = q.id
    WHERE t.month = ? AND t.year = ?
  `).get(prevMonth, prevYear, prevMonth, prevYear, prevMonth, prevYear);

  // Calculate average participation rate for current month
  const currentParticipation = db.prepare(`
    SELECT 
      CASE 
        WHEN SUM(expected_answers) > 0 
        THEN CAST(SUM(submitted_answers) AS REAL) / SUM(expected_answers) * 100
        ELSE 0
      END as avg_participation_rate
    FROM (
      SELECT 
        COUNT(DISTINCT tm.user_id) * (SELECT COUNT(*) FROM questions WHERE month = ? AND year = ?) as expected_answers,
        COUNT(DISTINCT CASE WHEN q.month = ? AND q.year = ? THEN a.id END) as submitted_answers
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN answers a ON t.id = a.team_id
      LEFT JOIN questions q ON a.question_id = q.id
      WHERE t.month = ? AND t.year = ?
      GROUP BY t.id
    )
  `).get(currentMonth, currentYear, currentMonth, currentYear, currentMonth, currentYear);

  // Calculate average participation rate for previous month
  const previousParticipation = db.prepare(`
    SELECT 
      CASE 
        WHEN SUM(expected_answers) > 0 
        THEN CAST(SUM(submitted_answers) AS REAL) / SUM(expected_answers) * 100
        ELSE 0
      END as avg_participation_rate
    FROM (
      SELECT 
        COUNT(DISTINCT tm.user_id) * (SELECT COUNT(*) FROM questions WHERE month = ? AND year = ?) as expected_answers,
        COUNT(DISTINCT CASE WHEN q.month = ? AND q.year = ? THEN a.id END) as submitted_answers
      FROM teams t
      INNER JOIN team_members tm ON t.id = tm.team_id
      LEFT JOIN answers a ON t.id = a.team_id
      LEFT JOIN questions q ON a.question_id = q.id
      WHERE t.month = ? AND t.year = ?
      GROUP BY t.id
    )
  `).get(prevMonth, prevYear, prevMonth, prevYear, prevMonth, prevYear);

  // Calculate average score for current month
  const currentAvgScore = db.prepare(`
    SELECT 
      CASE 
        WHEN COUNT(a.id) > 0 
        THEN CAST(SUM(a.score) AS REAL) / COUNT(a.id)
        ELSE 0
      END as avg_score
    FROM answers a
    INNER JOIN questions q ON a.question_id = q.id
    WHERE q.month = ? AND q.year = ?
      AND a.score >= 1 AND a.score <= 5
  `).get(currentMonth, currentYear);

  // Calculate average score for previous month
  const previousAvgScore = db.prepare(`
    SELECT 
      CASE 
        WHEN COUNT(a.id) > 0 
        THEN CAST(SUM(a.score) AS REAL) / COUNT(a.id)
        ELSE 0
      END as avg_score
    FROM answers a
    INNER JOIN questions q ON a.question_id = q.id
    WHERE q.month = ? AND q.year = ?
      AND a.score >= 1 AND a.score <= 5
  `).get(prevMonth, prevYear);

  return {
    current: {
      ...current,
      avgParticipationRate: currentParticipation?.avg_participation_rate || 0,
      avgScore: currentAvgScore?.avg_score || 0
    },
    previous: {
      ...previous,
      avgParticipationRate: previousParticipation?.avg_participation_rate || 0,
      avgScore: previousAvgScore?.avg_score || 0
    },
    prevMonth,
    prevYear
  };
};

/**
 * Get cached analytics data by cache key
 */
export const getCachedAnalytics = (cacheKey) => {
  const result = db.prepare(`
    SELECT * FROM analytics_cache 
    WHERE cache_key = ?
  `).get(cacheKey);
  
  if (!result) {
    return null;
  }
  
  // Check if cache is still valid (1 hour TTL)
  const calculatedAt = new Date(result.calculated_at);
  const now = new Date();
  const ageInSeconds = (now - calculatedAt) / 1000;
  
  if (ageInSeconds > 3600) {
    // Cache expired, delete it
    db.prepare('DELETE FROM analytics_cache WHERE cache_key = ?').run(cacheKey);
    return null;
  }
  
  return {
    ...result,
    data: JSON.parse(result.data)
  };
};

/**
 * Set cached analytics data
 */
export const setCachedAnalytics = (cacheKey, cacheType, month, year, data) => {
  const dataJson = JSON.stringify(data);
  
  db.prepare(`
    INSERT OR REPLACE INTO analytics_cache (cache_key, cache_type, month, year, data, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(cacheKey, cacheType, month, year, dataJson);
  
  return getCachedAnalytics(cacheKey);
};
