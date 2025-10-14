import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const EpicSearch = () => {
  const [patientId, setPatientId] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem('epic_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem('epic_token');
      if (storedToken) setToken(storedToken);
    }
  }, [searchParams]);

  const handleLogin = () => {
    window.location.href = `${REACT_APP_API_URL}/epic/login`;
  };

  const handleSearch = async () => {
    if (!token) {
      setError('You must log in to search Epic patients.');
      return;
    }

    if (!patientId.trim()) {
      setError('Please enter a patient ID.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const url = `${REACT_APP_API_URL}/epic/patient`;
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { patient_id: patientId.trim() }, // only search by ID
      };

      const response = await axios.get(url, config);

      // Print full FHIR bundle as JSON for debugging
      console.log('FHIR Bundle:', JSON.stringify(response.data, null, 2));

      const epicPatients = response.data.entry || [];

      if (epicPatients.length === 0) {
        setError('No patients found with that ID.');
        setResults([]);
        return;
      }

      const patients = epicPatients.map((e) => {
        const resource = e.resource;
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

      setResults(patients);
    } catch (err) {
      console.error('Error during Epic patient search:', err);
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in with Epic.');
        setToken(null);
        localStorage.removeItem('epic_token');
      } else {
        setError(`Search failed: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Search Epic Patients by ID</h2>

      {!token && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Note:</strong> You need to log in with Epic to search for patients.
          </p>
          <button
            onClick={handleLogin}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Log in with Epic
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-2 mb-4">
        <input
          type="text"
          placeholder="Patient ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading || patientId.trim() === ''}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {results.map((patient, index) => (
          <li
            key={patient.id || index}
            className="border p-2 rounded shadow hover:bg-gray-100 cursor-pointer"
            onClick={() => {
              localStorage.setItem('searchSource', 'epic');
              navigate(`/epic/patient/${patient.id}`);
            }}
          >
            <span className="text-blue-600 hover:underline">{patient.name}</span>
            <div className="text-sm text-gray-700">
              ID: {patient.id} | Gender: {patient.gender} | DOB: {patient.birthDate}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EpicSearch;
