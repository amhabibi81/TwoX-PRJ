import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { useError } from '../src/contexts/ErrorContext';
import api from '../src/api';

export default function Dashboard() {
  const { user, logout, isAdmin, isManager } = useAuth();
  const { showError } = useError();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [winner, setWinner] = useState(null);
  const [userTeamId, setUserTeamId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch team, all teams with scores, questions, and answers in parallel
      const [teamResponse, teamsWithScoresResponse, questionsResponse, answersResponse] = await Promise.allSettled([
        api.get('/teams/my'),
        api.get('/teams/all-with-scores'),
        api.get('/questions'),
        api.get('/answers/my')
      ]);

      // Handle team data
      if (teamResponse.status === 'fulfilled') {
        setTeam(teamResponse.value.data.team);
      } else if (teamResponse.reason?.response?.status !== 404) {
        showError('Failed to fetch team information', 'api');
      }

      // Handle all teams with scores data
      if (teamsWithScoresResponse.status === 'fulfilled') {
        const data = teamsWithScoresResponse.value.data;
        setAllTeams(data.teams || []);
        setWinner(data.winner || null);
        setUserTeamId(data.userTeamId || null);
      } else if (teamsWithScoresResponse.reason?.response?.status !== 404) {
        showError('Failed to fetch teams with scores', 'api');
      }

      // Handle questions data
      if (questionsResponse.status === 'fulfilled') {
        setQuestions(questionsResponse.value.data);
      } else {
        showError('Failed to load questions', 'api');
        setError('Failed to load questions');
      }

      // Handle answers data
      if (answersResponse.status === 'fulfilled') {
        setAnswers(answersResponse.value.data.answers || []);
      } else {
        showError('Failed to fetch answers', 'api');
      }

      setLoading(false);
    } catch (error) {
      showError('Failed to load dashboard data', 'api');
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Calculate evaluation status for each type (360-degree)
  const totalQuestions = questions.length;
  
  // Separate answers by source type
  const selfAnswers = answers.filter(a => a.source_type === 'self' || (!a.source_type && a.evaluated_user_id === user?.id));
  const peerAnswers = answers.filter(a => a.source_type === 'peer' || (!a.source_type && a.evaluated_user_id && a.evaluated_user_id !== user?.id));
  const managerAnswers = answers.filter(a => a.source_type === 'manager');
  
  // Calculate status for each type
  const selfStatus = {
    answered: selfAnswers.length,
    total: totalQuestions,
    complete: totalQuestions > 0 && selfAnswers.length === totalQuestions,
    percentage: totalQuestions > 0 ? Math.round((selfAnswers.length / totalQuestions) * 100) : 0
  };
  
  // For peer, count unique question-teammate combinations
  const peerQuestionTeammatePairs = new Set();
  peerAnswers.forEach(a => {
    if (a.evaluated_user_id) {
      peerQuestionTeammatePairs.add(`${a.question_id}_${a.evaluated_user_id}`);
    }
  });
  const userTeam = allTeams.find(t => t.teamId === userTeamId);
  const teammateCount = userTeam ? (userTeam.members?.filter(m => m.id !== user?.id).length || 0) : 0;
  const expectedPeerAnswers = totalQuestions * teammateCount;
  const peerStatus = {
    answered: peerQuestionTeammatePairs.size,
    total: expectedPeerAnswers,
    complete: expectedPeerAnswers > 0 && peerQuestionTeammatePairs.size === expectedPeerAnswers,
    percentage: expectedPeerAnswers > 0 ? Math.round((peerQuestionTeammatePairs.size / expectedPeerAnswers) * 100) : 0
  };
  
  // Manager evaluation status (simplified - would need managed users count from API)
  const managerStatus = {
    answered: managerAnswers.length,
    total: totalQuestions, // Simplified - would need managed users count
    complete: false, // Would need to check against managed users
    percentage: 0
  };
  
  // Overall status (backward compatible)
  const answeredQuestions = answers.length;
  const evaluationStatus = totalQuestions > 0 
    ? `${answeredQuestions} / ${totalQuestions} questions answered`
    : 'No questions available';
  const isComplete = totalQuestions > 0 && answeredQuestions === totalQuestions;
  const completionPercentage = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex gap-3">
          {isAdmin() && (
            <Link
              to="/admin/dashboard"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Admin Dashboard
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {user && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Welcome, {user.username}!</h3>
          <p className="text-sm text-gray-600 mt-1">Email: {user.email}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Team Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Team</h3>
          {team ? (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-bold text-blue-600">{team.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Month: {team.month}/{team.year}
                </p>
              </div>
              
              <div>
                <h4 className="text-base font-medium text-gray-700 mb-3">
                  Team Members ({team.members.length})
                </h4>
                <div className="grid gap-3">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className={`p-3 rounded-md border ${
                        member.id === user.id
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <p className={`text-sm ${member.id === user.id ? 'font-semibold' : 'font-normal'} text-gray-800`}>
                        {member.username} {member.id === user.id && '(You)'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {member.email}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-600">
              <p>You are not assigned to a team for this month.</p>
              <p className="text-sm mt-2">
                Teams may not have been generated yet, or you haven't been assigned.
              </p>
            </div>
          )}
        </div>

        {/* 360-Degree Evaluation Status */}
        {totalQuestions > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">360-Degree Evaluation Status</h3>
            <div className={`grid gap-4 ${isManager() ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              {/* Self Evaluation Card */}
              <div className={`p-4 rounded-lg border-2 ${
                selfStatus.complete 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">Self-Evaluation</h4>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">20%</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {selfStatus.answered} / {selfStatus.total} questions
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full ${
                      selfStatus.complete ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${selfStatus.percentage}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => navigate('/evaluation/self')}
                  className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selfStatus.complete
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {selfStatus.complete ? '✓ Completed' : 'Start Self-Evaluation'}
                </button>
              </div>

              {/* Peer Evaluation Card */}
              <div className={`p-4 rounded-lg border-2 ${
                peerStatus.complete 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">Peer Evaluation</h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">50%</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {peerStatus.answered} / {peerStatus.total} evaluations
                  {teammateCount > 0 && (
                    <span className="block text-xs text-gray-500 mt-1">
                      ({teammateCount} teammate{teammateCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full ${
                      peerStatus.complete ? 'bg-green-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${peerStatus.percentage}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => navigate('/evaluation/peer')}
                  className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    peerStatus.complete
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {peerStatus.complete ? '✓ Completed' : 'Start Peer Evaluation'}
                </button>
              </div>

              {/* Manager Evaluation Card - Only show for managers/admins */}
              {isManager() && (
                <div className={`p-4 rounded-lg border-2 ${
                  managerStatus.complete 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-purple-50 border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">Manager Evaluation</h4>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">30%</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {managerStatus.answered} / {managerStatus.total} evaluations
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className={`h-2 rounded-full ${
                        managerStatus.complete ? 'bg-green-600' : 'bg-purple-600'
                      }`}
                      style={{ width: `${managerStatus.percentage}%` }}
                    ></div>
                  </div>
                  <button
                    onClick={() => navigate('/evaluation/manager')}
                    className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      managerStatus.complete
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {managerStatus.complete ? '✓ Completed' : 'Start Manager Evaluation'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Teams with Scores */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">All Teams & Scores</h3>
            {allTeams.length > 0 && (
              <Link
                to="/results"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Full Results →
              </Link>
            )}
          </div>

          {allTeams.length === 0 ? (
            <div className="py-8 text-center text-gray-600">
              <p>No teams have been created for this hour yet.</p>
              <p className="text-sm mt-2">
                Teams will appear here once they are generated.
              </p>
            </div>
          ) : (
            <>

            {/* Winner Badge */}
            {winner && (
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg text-center">
                <div className="text-3xl mb-2">🏆</div>
                <p className="text-sm text-gray-600 mb-1">Winner</p>
                <p className="text-xl font-bold text-yellow-700">{winner.teamName}</p>
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <span className="text-gray-600">Total: <strong className="text-gray-900">{winner.totalScore}</strong></span>
                  <span className="text-gray-600">Avg: <strong className="text-gray-900">{winner.averageScore}</strong></span>
                </div>
              </div>
            )}

            {/* Teams List */}
            <div className="space-y-3">
              {allTeams.map((teamData, index) => {
                const isUserTeam = userTeamId === teamData.teamId;
                const rankBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
                
                return (
                  <div
                    key={teamData.teamId}
                    className={`p-4 rounded-lg border ${
                      isUserTeam
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-700 min-w-[30px]">{rankBadge}</span>
                        <div>
                          <h4 className="text-base font-semibold text-gray-800">
                            {teamData.teamName}
                            {isUserTeam && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-bold">
                                Your Team
                              </span>
                            )}
                          </h4>
                          <div className="flex gap-4 mt-1 text-xs text-gray-600">
                            <span><strong>Score:</strong> {teamData.totalScore}</span>
                            <span><strong>Avg:</strong> {teamData.averageScore}</span>
                            <span><strong>Complete:</strong> {teamData.completionPercentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Team Members */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Members:</p>
                      <div className="flex flex-wrap gap-2">
                        {teamData.members.map((member) => (
                          <span
                            key={member.id}
                            className={`text-xs px-2 py-1 rounded ${
                              member.id === user.id
                                ? 'bg-blue-200 text-blue-800 font-semibold'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {member.username}
                            {member.id === user.id && ' (You)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>

        {/* Evaluation Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Evaluation Status</h3>
          <div className="space-y-4">
            <p className="text-base text-gray-700">{evaluationStatus}</p>
            {totalQuestions > 0 && (
              <div>
                <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isComplete ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {completionPercentage}% Complete
                </p>
              </div>
            )}
            
            {totalQuestions > 0 && !isComplete && (
              <Link
                to="/evaluation"
                className="inline-block px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
              >
                {answeredQuestions === 0 ? 'Start Evaluation' : 'Continue Evaluation'}
              </Link>
            )}
            
            {isComplete && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
                ✓ Evaluation completed! Thank you for your feedback.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
