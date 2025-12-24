import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../src/contexts/AuthContext';
import { useError } from '../src/contexts/ErrorContext';
import api from '../src/api';
import ProtectedRoute from '../src/components/ProtectedRoute';

function SelfEvaluationForm() {
  const { user } = useAuth();
  const { showError } = useError();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchQuestions();
    fetchAnswers();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await api.get('/questions');
      const questionsData = response.data;
      setQuestions(questionsData);

      // Initialize answers object
      const initialAnswers = {};
      questionsData.forEach(q => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
      setLoading(false);
    } catch (error) {
      showError('Failed to load questions. Please try again.', 'api');
      setError('Failed to load questions. Please try again.');
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const response = await api.get('/answers/my');
      const existingAnswers = response.data.answers || [];
      
      // Pre-fill self-evaluation answers only
      const preFilledAnswers = {};
      existingAnswers.forEach(answer => {
        if (answer.source_type === 'self' || (!answer.source_type && answer.evaluated_user_id === user?.id)) {
          preFilledAnswers[answer.question_id] = answer.score.toString();
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

  const handleScoreChange = (questionId, score) => {
    if (submitted) return;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: score
    }));
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[questionId];
      return newErrors;
    });
    setError('');
  };

  const isFormValid = questions.length > 0 && questions.every(q => answers[q.id] && answers[q.id] !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitted) {
      return;
    }
    
    setError('');
    setSuccess('');
    setSubmitting(true);
    setValidationErrors({});

    // Validate all questions are answered
    const unansweredQuestions = questions.filter(q => !answers[q.id] || answers[q.id] === '');
    if (unansweredQuestions.length > 0) {
      const errors = {};
      unansweredQuestions.forEach(q => {
        errors[q.id] = 'This question must be answered';
      });
      setValidationErrors(errors);
      setError(`Please answer all ${unansweredQuestions.length} question(s) before submitting.`);
      setSubmitting(false);
      return;
    }

    // Submit all self-evaluations
    try {
      const submitPromises = questions.map(question => 
        api.post('/answers/self', {
          questionId: question.id,
          score: parseInt(answers[question.id], 10)
        }).catch(error => {
          if (error.response?.status === 409) {
            return { success: true };
          }
          throw error;
        })
      );

      await Promise.all(submitPromises);
      setSuccess('Self-evaluation submitted successfully!');
      setSubmitted(true);
      setSubmitting(false);
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
    } catch (error) {
      let errorMessage = 'Failed to submit self-evaluation. Please try again.';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 409) {
          errorMessage = data.error || 'Some answers have already been submitted. Please refresh the page.';
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Self-Evaluation</h2>
          <p className="text-sm text-gray-600 mt-1">
            Evaluate your own performance (Weight: 20%)
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((question, index) => {
            const hasError = validationErrors[question.id];
            const isAnswered = answers[question.id] && answers[question.id] !== '';
            
            return (
              <div
                key={question.id}
                className={`p-6 rounded-lg border ${
                  hasError
                    ? 'border-red-500 bg-red-50'
                    : isAnswered && !submitted
                    ? 'border-green-500 bg-white'
                    : 'border-gray-200 bg-white'
                } ${submitted ? 'opacity-80 bg-gray-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-800 flex-1">
                    Question {index + 1}: {question.text}
                  </h3>
                  {isAnswered && !submitted && (
                    <span className="text-green-600 text-xl ml-3">✓</span>
                  )}
                </div>
                
                {hasError && (
                  <div className="mb-3 p-2 bg-red-100 border border-red-200 text-red-700 rounded text-sm">
                    {validationErrors[question.id]}
                  </div>
                )}
                
                <p className="text-sm text-gray-600 mb-4">
                  Rate your own performance (1 = Poor, 5 = Excellent)
                </p>
                <div className="flex gap-4 flex-wrap">
                  {[1, 2, 3, 4, 5].map(score => (
                    <label
                      key={score}
                      className={`flex flex-col items-center p-3 rounded-lg border min-w-[80px] transition-colors ${
                        submitted
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                          : answers[question.id] == score
                          ? 'bg-blue-50 border-blue-500 cursor-pointer'
                          : 'bg-white border-gray-200 cursor-pointer hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={score}
                        checked={answers[question.id] == score}
                        onChange={() => handleScoreChange(question.id, score)}
                        disabled={submitted}
                        className="mb-2 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="font-bold text-lg">{score}</span>
                      <span className="text-xs text-gray-600">
                        {score === 1 ? 'Poor' : score === 5 ? 'Excellent' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

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
              disabled={submitting || submitted || !isFormValid}
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
                  : !isFormValid
                    ? 'Answer All Questions'
                    : 'Submit Self-Evaluation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SelfEvaluation() {
  return (
    <ProtectedRoute>
      <SelfEvaluationForm />
    </ProtectedRoute>
  );
}
