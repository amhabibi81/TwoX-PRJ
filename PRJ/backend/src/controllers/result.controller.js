import * as resultRepository from '../database/repositories/result.repository.js';
import * as teamRepository from '../database/repositories/team.repository.js';
import * as questionRepository from '../database/repositories/question.repository.js';
import * as answerRepository from '../database/repositories/answer.repository.js';
import * as teamMemberRepository from '../database/repositories/teamMember.repository.js';
import * as evaluationScoringService from '../services/evaluationScoring.service.js';
import db from '../config/database.js';
import { SOURCE_TYPES } from '../config/evaluation.config.js';
import logger from '../utils/logger.js';

// Winner selection with tie-breaking logic
function selectWinner(teamResults) {
  if (teamResults.length === 0) {
    return null;
  }

  // Sort with tie-breaking: totalScore -> averageScore -> earliestSubmissionTime
  teamResults.sort((a, b) => {
    // Primary: total score (descending)
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    
    // Tie-breaker 1: average score (descending)
    const avgA = a.averageScore ? parseFloat(a.averageScore) : 0;
    const avgB = b.averageScore ? parseFloat(b.averageScore) : 0;
    if (avgB !== avgA) {
      return avgB - avgA;
    }
    
    // Tie-breaker 2: earliest submission time (ascending - earlier is better)
    const timeA = a.earliestSubmissionTime ? new Date(a.earliestSubmissionTime).getTime() : Infinity;
    const timeB = b.earliestSubmissionTime ? new Date(b.earliestSubmissionTime).getTime() : Infinity;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    
    // Final tie-breaker: team ID (deterministic)
    return a.teamId - b.teamId;
  });

  return teamResults[0];
}

export const getResults = async (req, res) => {
  try {
    // Validation is handled by middleware, values are already validated
    let { month, year } = req.query;
    
    if (!month || !year) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Recursively call with current month/year
      req.query.month = currentMonth;
      req.query.year = currentYear;
      return getResults(req, res);
    }

    // Values are already validated and sanitized by middleware
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    // Check if results are cached
    const hasCache = resultRepository.hasCachedResults(monthNum, yearNum);
    let cachedResults = null;
    let calculatedAt = null;

    if (hasCache) {
      cachedResults = resultRepository.getCachedResults(monthNum, yearNum);
      calculatedAt = resultRepository.getCacheTimestamp(monthNum, yearNum);
    }

    // If cached, return cached results with tie-breaking applied
    if (hasCache && cachedResults.length > 0) {
      // Build team scores with earliest submission times
      const teamScores = cachedResults.map(rc => {
        const earliestSubmissionTime = answerRepository.getEarliestSubmissionTime(rc.team_id);
        const avgScore = rc.answer_count > 0 ? (rc.total_score / rc.answer_count) : 0;
        
        return {
          teamId: rc.team_id,
          teamName: rc.team_name,
          totalScore: rc.total_score,
          answerCount: rc.answer_count,
          questionCount: rc.question_count,
          completionPercentage: rc.question_count > 0 
            ? ((rc.answer_count / rc.question_count) * 100).toFixed(1)
            : '0.0',
          averageScore: avgScore.toFixed(2),
          earliestSubmissionTime: earliestSubmissionTime
        };
      });

      // Apply tie-breaking sort and select winner
      const sortedTeamScores = [...teamScores];
      const winner = selectWinner(sortedTeamScores);

      return res.json({
        month: monthNum,
        year: yearNum,
        cached: true,
        calculatedAt: calculatedAt,
        winner: winner && winner.totalScore > 0 ? {
          teamId: winner.teamId,
          teamName: winner.teamName,
          totalScore: winner.totalScore,
          averageScore: winner.averageScore,
          earliestSubmissionTime: winner.earliestSubmissionTime
        } : null,
        teamScores: sortedTeamScores
      });
    }

    // Calculate results if not cached
    const teams = teamRepository.getTeamsByMonth(monthNum, yearNum);
    
    if (teams.length === 0) {
      return res.json({ 
        month: monthNum,
        year: yearNum,
        cached: false,
        winner: null,
        message: 'No teams found for the specified month and year',
        teamScores: []
      });
    }

    // Get questions for this month/year
    const questions = questionRepository.getQuestionsByMonth(monthNum, yearNum);
    const questionCount = questions.length;

    // Check if 360-degree evaluations are enabled (check if any answer has source_type)
    const sampleAnswer = db.prepare('SELECT source_type FROM answers LIMIT 1').get();
    const has360Evaluations = sampleAnswer && sampleAnswer.source_type !== null;

    // Calculate scores for each team
    const teamResults = teams.map(team => {
      let totalScore = 0;
      let answerCount = 0;
      let weightedScore = 0;
      let usesWeightedScoring = false;

      if (has360Evaluations && questionCount > 0) {
        // Use weighted scoring for 360-degree evaluations
        try {
          const questionIds = questions.map(q => q.id);
          let teamWeightedTotal = 0;
          let questionsWithScores = 0;

          // Calculate weighted score for each team member across all questions
          const teamMembers = teamMemberRepository.getTeamMembers(team.id);
          
          for (const member of teamMembers) {
            const userScore = evaluationScoringService.calculateTotalWeightedScoreForUser(
              member.id,
              team.id,
              questionIds
            );
            
            if (userScore.totalWeightedScore > 0) {
              teamWeightedTotal += userScore.totalWeightedScore;
              questionsWithScores += userScore.questionScores.filter(q => q.weightedScore > 0).length;
            }
          }

          weightedScore = teamWeightedTotal;
          totalScore = weightedScore; // Use weighted score as total
          answerCount = questionsWithScores;
          usesWeightedScoring = true;
        } catch (error) {
          logger.warn({
            event: 'weighted.scoring.fallback',
            teamId: team.id,
            error: error.message
          }, 'Falling back to unweighted scoring for team');
          // Fall through to unweighted calculation
        }
      }

      // Fallback to unweighted calculation if weighted scoring failed or not enabled
      if (!usesWeightedScoring) {
        const answers = answerRepository.getAnswersByTeam(team.id);
        const validAnswers = answers.filter(a => a.score !== null && a.score !== undefined);
        totalScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
        answerCount = validAnswers.length;
      }

      // Get earliest submission time for tie-breaking
      const earliestSubmissionTime = answerRepository.getEarliestSubmissionTime(team.id);
      
      // Calculate average score
      const avgScore = answerCount > 0 ? (totalScore / answerCount) : 0;
      
      return {
        teamId: team.id,
        teamName: team.name,
        totalScore: parseFloat(totalScore.toFixed(2)),
        weightedScore: usesWeightedScoring ? parseFloat(weightedScore.toFixed(2)) : null,
        answerCount,
        questionCount,
        completionPercentage: questionCount > 0 
          ? parseFloat(((answerCount / questionCount) * 100).toFixed(1))
          : 0.0,
        averageScore: parseFloat(avgScore.toFixed(2)),
        earliestSubmissionTime: earliestSubmissionTime,
        usesWeightedScoring
      };
    });

    // Apply tie-breaking sort
    const sortedTeamResults = [...teamResults];
    const winner = selectWinner(sortedTeamResults);

    // Cache the results (idempotent - same input produces same cache)
    const cacheData = sortedTeamResults.map(tr => ({
      teamId: tr.teamId,
      totalScore: tr.totalScore,
      answerCount: tr.answerCount,
      questionCount: tr.questionCount
    }));
    
    resultRepository.cacheResults(monthNum, yearNum, cacheData);
    calculatedAt = resultRepository.getCacheTimestamp(monthNum, yearNum);

    res.json({
      month: monthNum,
      year: yearNum,
      cached: false,
      calculatedAt: calculatedAt,
      winner: winner && winner.totalScore > 0 ? {
        teamId: winner.teamId,
        teamName: winner.teamName,
        totalScore: winner.totalScore,
        averageScore: winner.averageScore,
        earliestSubmissionTime: winner.earliestSubmissionTime
      } : null,
      teamScores: sortedTeamResults
    });
  } catch (error) {
    logger.error({
      event: 'result.retrieval.failure',
      month: req.query.month,
      year: req.query.year,
      error: error.message,
      stack: error.stack
    }, 'Get results error');
    res.status(500).json({ error: 'Internal server error' });
  }
};

