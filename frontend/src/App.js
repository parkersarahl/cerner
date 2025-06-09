import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FrontPage from './FrontPage';
import PatientSearch from './PatientSearch';
import PatientDetails from './PatientDetails';
import './index.css'; // Ensure you have your styles imported

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FrontPage />} />
        <Route path="/search/:source" element={<PatientSearch />} />
        {/* <Route path="/epic" element={<PatientSearch source="epic" />} /> */}
        <Route path="/patients/:patientId" element={<PatientDetails />} />
      </Routes>
    </Router>
  );
}

export default App;

