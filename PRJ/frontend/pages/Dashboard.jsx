import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { useError } from '../src/contexts/ErrorContext';
import api from '../src/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { showError } = useError();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
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

      // Fetch team, questions, and answers in parallel
      const [teamResponse, questionsResponse, answersResponse] = await Promise.allSettled([
        api.get('/teams/my'),
        api.get('/questions'),
        api.get('/answers/my')
      ]);

      // Handle team data
      if (teamResponse.status === 'fulfilled') {
        setTeam(teamResponse.value.data.team);
      } else if (teamResponse.reason?.response?.status !== 404) {
        showError('Failed to fetch team information', 'api');
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

  // Calculate evaluation status
  const totalQuestions = questions.length;
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
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
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
