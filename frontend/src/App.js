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
          <Route path="/epic/search" element={<EpicSearch /> } />
          <Route path="/cerner/search" element={<CernerSearch /> } />
          <Route path="/epic/patient/:patientId" element={<EpicDetails /> } />
          <Route path="/cerner/patient/:patientId" element={<CernerDetails /> } />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
