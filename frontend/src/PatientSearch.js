import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PatientSearch = () => {
  const { source } = useParams(); // source will be "epic" or "cerner"
  const [name, setName] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const handleSearch = async () => {
    setError('');
    setLoading(true);
    try {
      let url;
      if (source === 'epic') {
        url = `${REACT_APP_API_URL}/api/epic/patient?name=${encodeURIComponent(name)}`;
      } else if (source === 'cerner') {
        url = `${REACT_APP_API_URL}/api/cerner/patient?name=${encodeURIComponent(name)}`;
      } else {
        throw new Error('Unsupported EHR source');
      } 

      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : undefined;

      const response = await axios.get(url, { headers });

      let patients = [];

      if (source === 'epic') {
        const entries = response.data.entry || [];
        patients = entries.map((e) => {
          const resource = e.resource || {};
          const nameField = resource.name?.[0];
          const fullName =
            nameField?.text ||
            `${(nameField?.given || []).join(' ')} ${nameField?.family || ''}`.trim();
          return {
            id: resource.id,
            name: fullName || 'Unnamed',
            birthDate: resource.birthDate || 'N/A',
            gender: resource.gender || 'Unknown',
          };
        });
      } else if (source === 'cerner') {
        patients = response.data.patients || [];
      }
      setResults(patients);
    } catch (err) {
      console.error(err);
      setError('Failed to search for patients');
    } finally {
      setLoading(false);
    }
  };

  // handle form submission (for Enter key)
  const onSubmit = (e) => {
    e.preventDefault();   // prevent page refresh
    if (name.trim() !== '') {
      handleSearch();
    }
  };

  return (
    <>
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Search Patients</h2>
        <form onSubmit={onSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 w-full"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={loading || name.trim() === ''}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <p className="text-red-600 mt-4">{error}</p>}

        <ul className="mt-6 space-y-2">
          {results.map((patient) => (
            <li
              key={patient.id}
              className="border p-2 rounded shadow hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                localStorage.setItem('searchSource', source); // 🔹 Save the source
                navigate(`/patients/${patient.id}`); // 🔹 Go to detail page
            }}
            >
               <span className="text-blue-600 hover:underline">
                {patient.name} (DOB: {patient.birthDate})
              </span>
              <div className="text-sm text-gray-700">
                ID: {patient.id} | Gender: {patient.gender} | DOB: {patient.birthDate}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default PatientSearch;
