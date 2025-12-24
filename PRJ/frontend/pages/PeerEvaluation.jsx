import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { useError } from '../src/contexts/ErrorContext';
import api from '../src/api';
import ProtectedRoute from '../src/components/ProtectedRoute';

function PeerEvaluationForm() {
  const { user } = useAuth();
  const { showError } = useError();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId_teammateId: score }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchTeamAndQuestions();
    fetchAnswers();
  }, []);

  const fetchTeamAndQuestions = async () => {
    try {
      const [teamResponse, questionsResponse] = await Promise.all([
        api.get('/teams/my'),
        api.get('/questions')
      ]);

      if (teamResponse.status === 200) {
        setTeam(teamResponse.data.team);
      }

      if (questionsResponse.status === 200) {
        const questionsData = questionsResponse.data;
        setQuestions(questionsData);

        // Initialize answers object for all question-teammate combinations
        if (teamResponse.status === 200 && teamResponse.data.team) {
          const initialAnswers = {};
          const teammates = teamResponse.data.team.members.filter(m => m.id !== user.id);
          
          questionsData.forEach(q => {
            teammates.forEach(teammate => {
              const key = `${q.id}_${teammate.id}`;
              initialAnswers[key] = '';
            });
          });
          
          setAnswers(initialAnswers);
        }
      }

      setLoading(false);
    } catch (error) {
      showError('Failed to load team or questions. Please try again.', 'api');
      setError('Failed to load team or questions. Please try again.');
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const response = await api.get('/answers/my');
      const existingAnswers = response.data.answers || [];
      
      // Pre-fill peer evaluation answers
      const preFilledAnswers = {};
      existingAnswers.forEach(answer => {
        if (answer.source_type === 'peer' || (!answer.source_type && answer.evaluated_user_id && answer.evaluated_user_id !== user?.id)) {
          const key = `${answer.question_id}_${answer.evaluated_user_id}`;
          preFilledAnswers[key] = answer.score.toString();
        }
      });
      
      setAnswers(prev => ({
        ...prev,
        ...preFilledAnswers
      }));
    } catch (error) {
      // Don't show error, just continue without pre-filled answers
    }
  };

  const handleScoreChange = (questionId, teammateId, score) => {
    if (submitted) return;
    
    const key = `${questionId}_${teammateId}`;
    setAnswers(prev => ({
      ...prev,
      [key]: score
    }));
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
    setError('');
  };

  const getTeammates = () => {
    if (!team || !team.members) return [];
    return team.members.filter(m => m.id !== user.id);
  };

  const isFormValid = () => {
    if (!team || questions.length === 0) return false;
    const teammates = getTeammates();
    if (teammates.length === 0) return false;
    
    // Check all question-teammate combinations are answered
    return questions.every(q => 
      teammates.every(t => {
        const key = `${q.id}_${t.id}`;
        return answers[key] && answers[key] !== '';
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitted) {
      return;
    }
    
    setError('');
    setSuccess('');
    setSubmitting(true);
    setValidationErrors({});

    const teammates = getTeammates();
    if (teammates.length === 0) {
      setError('You have no teammates to evaluate.');
      setSubmitting(false);
      return;
    }

    // Validate all question-teammate combinations
    const unanswered = [];
    questions.forEach(q => {
      teammates.forEach(t => {
        const key = `${q.id}_${t.id}`;
        if (!answers[key] || answers[key] === '') {
          unanswered.push({ questionId: q.id, teammateId: t.id, teammateName: t.username });
          validationErrors[key] = 'This question must be answered';
        }
      });
    });

    if (unanswered.length > 0) {
      setValidationErrors(validationErrors);
      setError(`Please answer all ${unanswered.length} evaluation(s) before submitting.`);
      setSubmitting(false);
      return;
    }

    // Submit all peer evaluations
    try {
      const submitPromises = [];
      
      questions.forEach(question => {
        teammates.forEach(teammate => {
          const key = `${question.id}_${teammate.id}`;
          const score = parseInt(answers[key], 10);
          
          submitPromises.push(
            api.post('/answers/peer', {
              questionId: question.id,
              score: score,
              evaluatedUserId: teammate.id
            }).catch(error => {
              if (error.response?.status === 409) {
                return { success: true };
              }
              throw error;
            })
          );
        });
      });

      await Promise.all(submitPromises);
      setSuccess(`Peer evaluations submitted successfully for ${teammates.length} teammate(s)!`);
      setSubmitted(true);
      setSubmitting(false);
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
    } catch (error) {
      let errorMessage = 'Failed to submit peer evaluations. Please try again.';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 409) {
          errorMessage = data.error || 'Some evaluations have already been submitted. Please refresh the page.';
        } else if (status === 400) {
          errorMessage = data.error || 'Invalid data. Please check your answers and try again.';
        } else if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
          setTimeout(() => navigate('/login'), 2000);
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data.error || errorMessage;
        }
      }
      
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-12">
        <p className="text-gray-600">Loading questions...</p>
      </div>
    );
  }

  const teammates = getTeammates();

  if (!team || teammates.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">You are not assigned to a team or have no teammates to evaluate.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Peer Evaluation</h2>
          <p className="text-sm text-gray-600 mt-1">
            Evaluate your teammates' performance (Weight: 50%)
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-start gap-3">
          <span className="text-xl">✓</span>
          <div>
            <strong className="block">{success}</strong>
            <p className="text-sm mt-1">Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No questions available for evaluation at this time.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {teammates.map(teammate => (
            <div key={teammate.id} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">
                Evaluating: {teammate.username}
              </h3>
              
              <div className="space-y-4">
                {questions.map((question, qIndex) => {
                  const key = `${question.id}_${teammate.id}`;
                  const hasError = validationErrors[key];
                  const isAnswered = answers[key] && answers[key] !== '';
                  
                  return (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg border ${
                        hasError
                          ? 'border-red-500 bg-red-50'
                          : isAnswered && !submitted
                          ? 'border-green-500 bg-white'
                          : 'border-gray-200 bg-white'
                      } ${submitted ? 'opacity-80 bg-gray-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-base font-medium text-gray-800 flex-1">
                          Q{qIndex + 1}: {question.text}
                        </h4>
                        {isAnswered && !submitted && (
                          <span className="text-green-600 text-lg ml-3">✓</span>
                        )}
                      </div>
                      
                      {hasError && (
                        <div className="mb-2 p-2 bg-red-100 border border-red-200 text-red-700 rounded text-sm">
                          {validationErrors[key]}
                        </div>
                      )}
                      
                      <div className="flex gap-3 flex-wrap mt-3">
                        {[1, 2, 3, 4, 5].map(score => (
                          <label
                            key={score}
                            className={`flex flex-col items-center p-2 rounded-lg border min-w-[70px] transition-colors ${
                              submitted
                                ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                                : answers[key] == score
                                ? 'bg-blue-50 border-blue-500 cursor-pointer'
                                : 'bg-white border-gray-200 cursor-pointer hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}-teammate-${teammate.id}`}
                              value={score}
                              checked={answers[key] == score}
                              onChange={() => handleScoreChange(question.id, teammate.id, score)}
                              disabled={submitted}
                              className="mb-1 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="font-bold">{score}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex gap-3 justify-end items-center mt-8">
            {!submitted && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={submitting}
                className="px-5 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || submitted || !isFormValid()}
              className={`px-5 py-2 rounded-md text-white min-w-[150px] transition-colors ${
                submitted
                  ? 'bg-gray-600'
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitted 
                ? '✓ Submitted' 
                : submitting 
                  ? 'Submitting...' 
                  : !isFormValid()
                    ? 'Answer All Questions'
                    : `Submit Evaluations (${teammates.length} teammates)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function PeerEvaluation() {
  return (
    <ProtectedRoute>
      <PeerEvaluationForm />
    </ProtectedRoute>
  );
}
