import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoutes';

// Import your components
import Navbar from './Navbar';
import Login from './Login';
import FrontPage from './FrontPage';
import EpicLogin from './EpicLogin';
import CernerLogin from './CernerLogin';
import EpicSearch from './EpicSearch';
import CernerSearch from '.CernerSearch';
import EpicDetails from './EpicDetails';
import CernerDetails from './CernerDetails';

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