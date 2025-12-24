import '../src/config/env.js';
import * as teamRepository from '../src/database/repositories/team.repository.js';
import * as teamMemberRepository from '../src/database/repositories/teamMember.repository.js';
import * as questionRepository from '../src/database/repositories/question.repository.js';
import * as answerRepository from '../src/database/repositories/answer.repository.js';
import logger from '../src/utils/logger.js';

/**
 * Add mock scores to teams for testing
 * Creates answers with random scores (3-5) for each team member evaluating their teammates
 */
async function addMockScores() {
  try {
    console.log('\n🎯 Adding Mock Scores to Teams\n');
    console.log('='.repeat(60));

    // Get current date/time
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`\n📅 Adding scores for teams at ${currentHour}:00 on ${currentDay}/${currentMonth}/${currentYear}\n`);

    // Get all teams for current hour
    const teams = teamRepository.getTeamsByHour(currentHour, currentDay, currentMonth, currentYear);

    if (teams.length === 0) {
      console.log('⚠️  No teams found for this hour.');
      console.log('   Please create teams first using: npm run test:create-teams\n');
      process.exit(1);
    }

    // Get questions for current month/year
    const questions = questionRepository.getQuestionsByMonth(currentMonth, currentYear);

    if (questions.length === 0) {
      console.log('⚠️  No questions found for this month/year.');
      console.log('   Questions should be auto-seeded when server starts.\n');
      process.exit(1);
    }

    console.log(`Found ${teams.length} teams and ${questions.length} questions\n`);

    let totalAnswersCreated = 0;

    // For each team, add mock scores
    for (const team of teams) {
      const members = teamMemberRepository.getTeamMembers(team.id);
      
      if (members.length === 0) {
        console.log(`⚠️  Team ${team.name} has no members, skipping`);
        continue;
      }

      console.log(`\n📊 Adding scores for ${team.name} (${members.length} members):`);

      // Each member answers each question for their team
      for (const member of members) {
        for (const question of questions) {
          // Check if answer already exists
          const existingAnswer = answerRepository.getAnswer(member.id, question.id, team.id);
          
          if (existingAnswer) {
            // Skip if answer already exists
            continue;
          }

          // Generate random score between 3-5 (positive scores for testing)
          const score = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5

          try {
            answerRepository.createAnswer(member.id, question.id, team.id, score);
            totalAnswersCreated++;
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.error(`   Error creating answer for ${member.username}: ${error.message}`);
            }
          }
        }
      }

      // Show team summary
      const answers = answerRepository.getAnswersByTeam(team.id);
      const validAnswers = answers.filter(a => a.score !== null && a.score !== undefined);
      const totalScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      const avgScore = validAnswers.length > 0 ? (totalScore / validAnswers.length).toFixed(2) : 0;

      console.log(`   ✅ Created answers. Total score: ${totalScore}, Avg: ${avgScore}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n✅ Successfully added mock scores!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Teams processed: ${teams.length}`);
    console.log(`   - Total answers created: ${totalAnswersCreated}`);
    console.log(`   - Questions per team: ${questions.length}\n`);

    // Show team rankings
    console.log('🏆 Team Rankings:');
    const teamsWithScores = teams.map(team => {
      const answers = answerRepository.getAnswersByTeam(team.id);
      const validAnswers = answers.filter(a => a.score !== null && a.score !== undefined);
      const totalScore = validAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
      return {
        name: team.name,
        totalScore,
        answerCount: validAnswers.length
      };
    });

    teamsWithScores.sort((a, b) => b.totalScore - a.totalScore);
    teamsWithScores.forEach((team, index) => {
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      console.log(`   ${rank} ${team.name}: ${team.totalScore} points (${team.answerCount} answers)`);
    });
    console.log('');

    logger.info({
      event: 'mock.scores.added',
      teamCount: teams.length,
      answerCount: totalAnswersCreated,
      hour: currentHour,
      day: currentDay,
      month: currentMonth,
      year: currentYear
    }, 'Mock scores added successfully');

  } catch (error) {
    logger.error({
      event: 'mock.scores.failure',
      error: error.message,
      stack: error.stack
    }, 'Failed to add mock scores');
    console.error('\n❌ Error adding mock scores:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run script
addMockScores()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

