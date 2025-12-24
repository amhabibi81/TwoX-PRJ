import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { LoadingProvider } from './contexts/LoadingContext';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import Evaluation from '../pages/Evaluation';
import SelfEvaluation from '../pages/SelfEvaluation';
import PeerEvaluation from '../pages/PeerEvaluation';
import ManagerEvaluation from '../pages/ManagerEvaluation';
import Results from '../pages/Results';
import AdminDashboard from '../pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import ErrorToast from './components/ErrorToast';
import LoadingOverlay from './components/LoadingOverlay';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluation"
        element={
          <ProtectedRoute>
            <Evaluation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluation/self"
        element={
          <ProtectedRoute>
            <SelfEvaluation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluation/peer"
        element={
          <ProtectedRoute>
            <PeerEvaluation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluation/manager"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={['admin', 'manager']}>
              <ManagerEvaluation />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <Results />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          <AuthProvider>
            <ErrorToast />
            <LoadingOverlay />
            <AppRoutes />
          </AuthProvider>
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );
}
