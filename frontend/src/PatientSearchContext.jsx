import React, { createContext, useState, useContext } from 'react';

const PatientSearchContext = createContext();

export const PatientSearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);

  return (
    <PatientSearchContext.Provider value={{ searchTerm, setSearchTerm, results, setResults }}>
      {children}
    </PatientSearchContext.Provider>
  );
};

export const usePatientSearch = () => useContext(PatientSearchContext);
