import React from 'react';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import PatientSearch from './PatientSearch';
import PatientDetails from './PatientDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PatientSearch />} />
        <Route path="/patients/:patientId" element={<PatientDetails />} />
      </Routes>
  </Router>
  );
}

export default App;
