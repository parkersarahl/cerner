import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FrontPage from './FrontPage';
import CernerSearch from './CernerSearch';
import EpicSearch from './EpicSearch';
import CernerDetails from './CernerDetails';
import EpicLogin from './EpicLogin';
import EpicDetails from './EpicDetails';
import CernerLogin from './CernerLogin';
import Login from './Login';
import Navbar from './Navbar';
import './index.css';
import ProtectedRoute from './ProtectedRoutes';

const ProtectedLayout = ({ children }) => (
  <>
    <Navbar />
    <div className="p-4">{children}</div>
  </>
);

function App() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login/>} />
          <Route path="/login" element={<Login />} />
                  {/* Protected Routes */}
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
          <Route
            path="/epic/login"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <EpicLogin />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cerner/login"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <CernerLogin />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search/epic"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <EpicSearch />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search/cerner"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <CernerSearch />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/epic/patient/:patientId"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <EpicDetails />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cerner/patient/:patientId"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <CernerDetails />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
