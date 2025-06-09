import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FrontPage from './FrontPage';
import PatientSearch from './PatientSearch';
import PatientDetails from './PatientDetails';
import './index.css'; // Ensure you have your styles imported

function App() {
  return (
   <div className="min-h-screen bg-gray-100 text-gray-900 p-4">
    <Router>
      <Routes>
        <Route path="/" element={<FrontPage />} />
        <Route path="/search/:source" element={<PatientSearch />} />
        {/* <Route path="/epic" element={<PatientSearch source="epic" />} /> */}
        <Route path="/patients/:patientId" element={<PatientDetails />} />
      </Routes>
    </Router>
    </div>
  );

  
}

export default App;

