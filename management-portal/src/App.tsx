import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';  // ← Add this import
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { Dashboard } from './pages/dashboard.tsx';  // ← Fix: Capital D
import { Tasks } from './pages/Tasks';
import { Team } from './pages/Team';
import { Meetings } from './pages/Meetings';
import { Settings } from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>  {/* ← Add this wrapper */}
        <BrowserRouter>
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'member']}>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'member']}>
                  <Layout>
                    <Tasks />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <Layout>
                    <Team />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'member']}>
                  <Layout>
                    <Meetings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'member']}>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>  {/* ← Close the wrapper */}
    </AuthProvider>
  );
}

export default App;
