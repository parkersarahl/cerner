import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FrontPage from './FrontPage';
import PatientSearch from './PatientSearch';
import EpicSearch from './EpicSearch';
import PatientDetails from './PatientDetails';
import EpicLogin from './EpicLogin';
import CernerLogin from './CernerLogin';
import Login from './Login';
import ProtectedRoute from './ProtectedRoutes';
import Navbar from './Navbar';
import './index.css';

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
          <Route path="/frontpage" element={<FrontPage />} />
          <Route path="/epic/login" element={<EpicLogin />} />
          <Route path="/cerner/login" element={<CernerLogin />} />
          <Route path="/search/epic" element={<EpicSearch /> } />
          <Route path="/search/cerner" element={<PatientSearch /> } />

          {/* Protected Routes */}
          
          <Route
            path="/patients/:patientId"
            element={
              <ProtectedRoute>
                <ProtectedLayout>
                  <PatientDetails />
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
