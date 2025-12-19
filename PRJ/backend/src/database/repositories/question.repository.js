import db from '../../config/database.js';

export const createQuestion = (text, month, year) => {
  if (!month || !year) {
    throw new Error('Month and year are required to create a question');
  }
  
  const result = db.prepare(`
    INSERT INTO questions (text, month, year)
    VALUES (?, ?, ?)
  `).run(text, month, year);
  
  return getQuestionById(result.lastInsertRowid);
};

export const getAllQuestions = () => {
  return db.prepare('SELECT * FROM questions ORDER BY year DESC, month DESC, created_at').all();
};

export const getQuestionById = (id) => {
  return db.prepare('SELECT * FROM questions WHERE id = ?').get(id) || null;
};

export const getQuestionsByMonth = (month, year) => {
  return db.prepare(`
    SELECT * FROM questions 
    WHERE month = ? AND year = ? 
    ORDER BY created_at
  `).all(month, year);
};

export const getActiveQuestions = () => {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const year = currentDate.getFullYear();
  
  return getQuestionsByMonth(month, year);
};

export const questionsExistForMonth = (month, year) => {
  const result = db.prepare('SELECT COUNT(*) as count FROM questions WHERE month = ? AND year = ?')
    .get(month, year);
  return result.count > 0;
};

export const seedDefaultQuestions = (month, year) => {
  const defaultQuestions = [
    'How well did your team collaborate this month?',
    'What was the most valuable contribution you made to your team?',
    'What challenges did your team face and how did you overcome them?',
    'How would you rate the overall team performance this month?',
    'What would you like to improve in next month\'s collaboration?'
  ];

  // Check if questions already exist for this month
  if (questionsExistForMonth(month, year)) {
    return false; // Questions already seeded
  }

  // Create all default questions
  const createdQuestions = [];
  for (const text of defaultQuestions) {
    const question = createQuestion(text, month, year);
    createdQuestions.push(question);
  }

  return createdQuestions;
};

// Questions are immutable per month - restrict updates and deletes
export const updateQuestion = (id, text) => {
  // Check if question has answers - if so, don't allow update
  const answerCount = db.prepare('SELECT COUNT(*) as count FROM answers WHERE question_id = ?')
    .get(id);
  
  if (answerCount.count > 0) {
    throw new Error('Cannot update question that has answers. Questions are immutable per month.');
  }
  
  db.prepare(`
    UPDATE questions 
    SET text = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(text, id);
  
  return getQuestionById(id);
};

export const deleteQuestion = (id) => {
  // Check if question has answers - if so, don't allow delete
  const answerCount = db.prepare('SELECT COUNT(*) as count FROM answers WHERE question_id = ?')
    .get(id);
  
  if (answerCount.count > 0) {
    throw new Error('Cannot delete question that has answers. Questions are immutable per month.');
  }
  
  return db.prepare('DELETE FROM questions WHERE id = ?').run(id);
};

