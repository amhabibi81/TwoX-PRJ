import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { useError } from '../src/contexts/ErrorContext';
import { adminApi } from '../src/api';
import ProtectedRoute from '../src/components/ProtectedRoute';

function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const { showError } = useError();
  const navigate = useNavigate();
  
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    // Set default to current month/year
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchDashboardData();
    }
  }, [selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await adminApi.getDashboard(selectedMonth, selectedYear);
      setMetrics(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        setError('You do not have permission to access the admin dashboard.');
        showError('Admin access required', 'api');
      } else {
        const errorMessage = error.response?.data?.error || 'Failed to load dashboard data';
        setError(errorMessage);
        showError(errorMessage, 'api');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleMonthYearChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const getChangeIndicator = (change) => {
    if (change > 0) return { symbol: '↑', color: 'text-green-600', bg: 'bg-green-50' };
    if (change < 0) return { symbol: '↓', color: 'text-red-600', bg: 'bg-red-50' };
    return { symbol: '→', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error && error.includes('permission')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-4">
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            User Dashboard
          </button>
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

      {/* Month/Year Selector */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <select
            value={selectedMonth || ''}
            onChange={(e) => handleMonthYearChange(parseInt(e.target.value), selectedYear)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          
          <label className="text-sm font-medium text-gray-700 ml-4">Year:</label>
          <select
            value={selectedYear || ''}
            onChange={(e) => handleMonthYearChange(selectedMonth, parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={fetchDashboardData}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && !error.includes('permission') && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {metrics && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.overview?.totalUsers || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.overview?.totalTeams || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.overview?.totalQuestions || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Participation Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.overview?.overallParticipationRate?.toFixed(1) || 0}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.overview?.overallAverageScore?.toFixed(2) || 0}
              </p>
            </div>
          </div>

          {/* Month Comparison */}
          {metrics.monthComparison && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Month-over-Month Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Current: {metrics.monthComparison.current.month}/{metrics.monthComparison.current.year}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>Users: {metrics.monthComparison.current.totalUsers}</div>
                    <div>Teams: {metrics.monthComparison.current.totalTeams}</div>
                    <div>Answers: {metrics.monthComparison.current.totalAnswers}</div>
                    <div>Participation: {metrics.monthComparison.current.avgParticipationRate.toFixed(1)}%</div>
                    <div>Avg Score: {metrics.monthComparison.current.avgScore.toFixed(2)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">
                    Previous: {metrics.monthComparison.previous.month}/{metrics.monthComparison.previous.year}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>Users: {metrics.monthComparison.previous.totalUsers}</div>
                    <div>Teams: {metrics.monthComparison.previous.totalTeams}</div>
                    <div>Answers: {metrics.monthComparison.previous.totalAnswers}</div>
                    <div>Participation: {metrics.monthComparison.previous.avgParticipationRate.toFixed(1)}%</div>
                    <div>Avg Score: {metrics.monthComparison.previous.avgScore.toFixed(2)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Changes</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  {Object.entries(metrics.monthComparison.changes).map(([key, change]) => {
                    const indicator = getChangeIndicator(change.percentage);
                    return (
                      <div key={key} className={`p-2 rounded ${indicator.bg}`}>
                        <div className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div className={`${indicator.color} font-bold`}>
                          {indicator.symbol} {change.percentage > 0 ? '+' : ''}{change.percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Team Participation Rates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Team Participation Rates</h3>
            {metrics.participationRates && metrics.participationRates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.participationRates.map((team) => (
                      <tr key={team.teamId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.teamName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{team.memberCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{team.submittedAnswers}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{team.expectedAnswers}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`font-semibold ${
                            team.participationRate >= 80 ? 'text-green-600' :
                            team.participationRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {team.participationRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No teams found for this month.</p>
            )}
          </div>

          {/* Team Average Scores */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Team Average Scores</h3>
            {metrics.teamAverages && metrics.teamAverages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Answers</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.teamAverages.map((team) => (
                      <tr key={team.teamId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.teamName}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{team.averageScore.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{team.totalAnswers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No team scores available for this month.</p>
            )}
          </div>

          {/* Top and Bottom Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Top 3 Performers</h3>
              {metrics.performers?.top && metrics.performers.top.length > 0 ? (
                <div className="space-y-3">
                  {metrics.performers.top.map((user, index) => (
                    <div key={user.userId} className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {user.username}
                          </p>
                          <p className="text-xs text-gray-600">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-700">{user.averageScore.toFixed(2)}</p>
                          <p className="text-xs text-gray-600">{user.totalAnswers} answers</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No top performers found (minimum 3 answers required).</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Bottom 3 Performers</h3>
              {metrics.performers?.bottom && metrics.performers.bottom.length > 0 ? (
                <div className="space-y-3">
                  {metrics.performers.bottom.map((user, index) => (
                    <div key={user.userId} className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {index === 0 ? '🔻' : index === 1 ? '🔻' : '🔻'} {user.username}
                          </p>
                          <p className="text-xs text-gray-600">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-700">{user.averageScore.toFixed(2)}</p>
                          <p className="text-xs text-gray-600">{user.totalAnswers} answers</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No bottom performers found (minimum 3 answers required).</p>
              )}
            </div>
          </div>

          {/* User Average Scores */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">User Average Scores</h3>
            {metrics.userAverages && metrics.userAverages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Answers</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.userAverages.map((user) => (
                      <tr key={user.userId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{user.averageScore.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.totalAnswers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No user scores available for this month.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
