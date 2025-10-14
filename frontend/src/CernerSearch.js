import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';

const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PatientSearch = () => {
  const [name, setName] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for token in URL params (from OAuth callback)
    const urlToken = searchParams.get('token');
    if (urlToken) {
      console.log('Token received from OAuth callback');
      setToken(urlToken);
      localStorage.setItem('cernerToken', urlToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check for stored token
      const storedToken = localStorage.getItem('cernerToken');
      if (storedToken) {
        console.log('Using stored token');
        setToken(storedToken);
      }
    }
  }, [searchParams]);

  const handleLogin = () => {
    window.location.href = `${REACT_APP_API_URL}/cerner/login`;
  };

  const handleSearch = async () => {
    setError('');
    setLoading(true);

    try {
      const url = `${REACT_APP_API_URL}/cerner/patient?name=${encodeURIComponent(name)}`;
      const config = token 
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      console.log('Making request to:', url);
      if (token) console.log('With token authentication');

      const response = await axios.get(url, config);

      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      const cernerPatients = response.data.entry || [];

      if (cernerPatients.length === 0) {
        setError('No patients found. Try searching for: Smart, Chalmers, Peters, or Williams');
        setResults([]);
        setLoading(false);
        return;
      }

      const patients = cernerPatients.map((e) => {
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
      console.error('Error during patient search:', err);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
        
        if (err.response.status === 401) {
          setError('Authentication required. Please log in with Cerner.');
          setToken(null);
          localStorage.removeItem('cernerToken');
        } else {
          setError(`Failed to search: ${err.response.data.detail || err.message}`);
        }
      } else {
        setError('Failed to search for patients. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (name.trim() !== '') handleSearch();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Search Patients (Cerner)</h2>
      
      {!token && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>Note:</strong> You need to log in with Cerner to search for patients.
          </p>
          <button
            onClick={handleLogin}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Log in with Cerner
          </button>
        </div>
      )}
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Try searching for test patients: Smart, Chalmers, Peters, or Williams
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Patient name (e.g., Smart)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading || name.trim() === ''}
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
        {results.map((patient) => (
          <li
            key={patient.id}
            className="border p-2 rounded shadow hover:bg-gray-100 cursor-pointer"
            onClick={() => {
              localStorage.setItem('searchSource', 'cerner');
              navigate(`/cerner/patient/${patient.id}`);
            }}
          >
            <span className="text-blue-600 hover:underline">
              {patient.name}
            </span>
            <div className="text-sm text-gray-700">
              ID: {patient.id} | Gender: {patient.gender} | DOB: {patient.birthDate}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PatientSearch;