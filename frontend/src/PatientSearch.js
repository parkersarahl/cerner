import React, { useState } from 'react';
import axios from 'axios';

const PatientSearch = () => {
  const [name, setName] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    try {
      setError('');
      const response = await axios.get(`/api/patients?name=${encodeURIComponent(name)}`);
      setResults(response.data.patients || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Search failed');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Search Patients</h2>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      <ul className="mt-6 space-y-2">
        {results.map((patient) => (
          <li key={patient.id} className="border p-2 rounded shadow hover:bg-gray-100 cursor-pointer">
            <a href={`/patients/${patient.id}`} className="text-blue-600 hover:underline">
             {patient.name} (DOB: {patient.birthDate})
            </a>
            <div className="text-sm text-gray-700">
              ID: {patient.id} | Gender: {patient.gender || 'Unknown'} | DOB: {patient.birthDate || 'N/A'}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PatientSearch;
