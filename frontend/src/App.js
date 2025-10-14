import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoutes';

// Import your components
import Navbar from './components/Navbar';
import Login from './pages/Login';
import FrontPage from './pages/FrontPage';
import EpicLogin from './pages/EpicLogin';
import CernerLogin from './pages/CernerLogin';
import EpicSearch from './pages/EpicSearch';
import CernerSearch from './pages/CernerSearch';
import EpicDetails from './pages/EpicDetails';
import CernerDetails from './pages/CernerDetails';

// ==================== Protected Layout ====================
const ProtectedLayout = ({ children }) => (
  <>
    <Navbar />
    <div className="p-4">{children}</div>
  </>
);

// ==================== Main App ====================
function App() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes - Require Authentication */}
          <Route
            path="/frontpage"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <FrontPage />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Epic Routes - Require provider or admin role */}
          <Route
            path="/epic/login"
            element={
              <ProtectedRoute requiredRoles={['provider', 'admin']}>
                <ProtectedLayout>
                  <EpicLogin />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/search/epic"
            element={
              <ProtectedRoute requiredRoles={['provider', 'admin']}>
                <ProtectedLayout>
                  <EpicSearch />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/epic/patient/:patientId"
            element={
              <ProtectedRoute requiredRoles={['provider', 'admin']}>
                <ProtectedLayout>
                  <EpicDetails />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Cerner Routes - Require provider or admin role */}
          <Route
            path="/cerner/login"
            element={
              <ProtectedRoute requiredRoles={['provider', 'admin']}>
                <ProtectedLayout>
                  <CernerLogin />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/search/cerner"
            element={
              <ProtectedRoute requiredRoles={['provider', 'admin']}>
                <ProtectedLayout>
                  <CernerSearch />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/cerner/patient/:patientId"
            element={
              <ProtectedRoute requiredRoles={['provider', 'admin']}>
                <ProtectedLayout>
                  <CernerDetails />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;