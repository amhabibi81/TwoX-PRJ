import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useError } from '../src/contexts/ErrorContext';
import api from '../src/api';
import ProtectedRoute from '../src/components/ProtectedRoute';

function ResultsPage() {
  const { showError } = useError();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [userTeamId, setUserTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResultsData();
  }, []);

  const fetchResultsData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch results and user team in parallel
      const [resultsResponse, teamResponse] = await Promise.allSettled([
        api.get('/results'),
        api.get('/teams/my')
      ]);

      // Handle results data
      if (resultsResponse.status === 'fulfilled') {
        setResults(resultsResponse.value.data);
      } else {
        const errorStatus = resultsResponse.reason?.response?.status;
        if (errorStatus === 404) {
          setError('No results available for this month.');
        } else {
          setError('Failed to load results. Please try again.');
        }
        showError('Failed to fetch results', 'api');
      }

      // Handle user team data (optional - user might not have a team)
      if (teamResponse.status === 'fulfilled') {
        const teamData = teamResponse.value.data.team;
        if (teamData) {
          setUserTeamId(teamData.id);
        }
      } else if (teamResponse.reason?.response?.status !== 404) {
        showError('Failed to fetch user team', 'api');
      }

      setLoading(false);
    } catch (error) {
      showError('An unexpected error occurred while loading results', 'api');
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const formatMonthYear = (month, year) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getRankBadge = (index) => {
    if (index === 0) return { text: '1st', color: '#FFD700', bgColor: '#FFF9E6', className: 'bg-yellow-50 border-yellow-400 text-yellow-700' }; // Gold
    if (index === 1) return { text: '2nd', color: '#C0C0C0', bgColor: '#F5F5F5', className: 'bg-gray-100 border-gray-400 text-gray-700' }; // Silver
    if (index === 2) return { text: '3rd', color: '#CD7F32', bgColor: '#F5E6D3', className: 'bg-orange-50 border-orange-400 text-orange-700' }; // Bronze
    return { text: `${index + 1}th`, color: '#666', bgColor: '#f8f9fa', className: 'bg-gray-50 border-gray-300 text-gray-600' };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <div className="text-lg text-gray-600">Loading results...</div>
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-5 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-5 text-center">
          <h3 className="text-xl font-semibold mb-2">Error</h3>
          <p>{error}</p>
          <button
            onClick={fetchResultsData}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const hasTeams = results?.teamScores && results.teamScores.length > 0;
  const hasWinner = results?.winner && results.winner.totalScore > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Team Results</h2>
          {results && (
            <p className="text-sm text-gray-600 mt-1">
              Results for {formatMonthYear(results.month, results.year)}
              {results.cached && (
                <span className="ml-2 text-xs text-gray-500">
                  (Cached)
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Empty State: No Teams */}
        {!hasTeams && (
          <div className="text-center py-16 px-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-5xl mb-5">📊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Teams Generated</h3>
            <p className="text-gray-600 mb-6">
              Teams have not been generated for this month yet.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Winner Section */}
        {hasTeams && hasWinner && (
          <div className="mb-10 p-8 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-center shadow-lg">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Winner</h2>
            <div className="text-3xl font-bold text-yellow-600 mb-6">
              {results.winner.teamName}
            </div>
            <div className="flex justify-center gap-8 flex-wrap">
              <div>
                <div className="text-sm text-gray-600">Total Score</div>
                <div className="text-2xl font-bold text-gray-900">
                  {results.winner.totalScore}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Average Score</div>
                <div className="text-2xl font-bold text-gray-900">
                  {results.winner.averageScore}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Winner State */}
        {hasTeams && !hasWinner && (
          <div className="mb-10 p-5 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Winner Determined</h3>
            <p className="text-gray-600">
              All teams have a score of 0. Complete evaluations to determine a winner.
            </p>
          </div>
        )}

        {/* Team Scores List */}
        {hasTeams && (
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-5">Team Rankings</h3>
            <div className="space-y-4">
              {results.teamScores.map((team, index) => {
                const isUserTeam = userTeamId === team.teamId;
                const rankBadge = getRankBadge(index);
                
                return (
                  <div
                    key={team.teamId}
                    className={`p-5 rounded-lg border flex items-center gap-5 ${
                      isUserTeam
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`min-w-[60px] h-[60px] rounded-full flex items-center justify-center font-bold text-lg border-2 ${rankBadge.className}`}>
                      {rankBadge.text}
                    </div>

                    {/* Team Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-800">
                          {team.teamName}
                        </h4>
                        {isUserTeam && (
                          <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                            Your Team
                          </span>
                        )}
                      </div>
                      <div className="flex gap-5 flex-wrap text-sm text-gray-600">
                        <span>
                          <strong>Total Score:</strong> {team.totalScore}
                        </span>
                        <span>
                          <strong>Average:</strong> {team.averageScore}
                        </span>
                        <span>
                          <strong>Completion:</strong> {team.completionPercentage}%
                        </span>
                        <span>
                          <strong>Answers:</strong> {team.answerCount} / {team.questionCount}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Results() {
  return (
    <ProtectedRoute>
      <ResultsPage />
    </ProtectedRoute>
  );
}
