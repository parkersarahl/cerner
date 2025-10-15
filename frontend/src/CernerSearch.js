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
    console.log('=== CERNER TOKEN CHECK ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    // Check for token in URL params (from OAuth callback)
    const urlToken = searchParams.get('token');
    console.log('Token in URL:', !!urlToken);
    
    if (urlToken) {
      console.log('✅ Token received from OAuth callback, storing...');
      setToken(urlToken);
      sessionStorage.setItem('cernerToken', urlToken);
      localStorage.setItem('ehrSource', 'cerner');
      console.log('Token stored in sessionStorage');
      console.log('EHR source set to: cerner');
      
      // Clean up URL but keep the token in state
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else {
      // Check for stored token
      const storedToken = sessionStorage.getItem('cernerToken');
      console.log('Token in sessionStorage:', !!storedToken);
      
      if (storedToken) {
        console.log('✅ Using stored token from sessionStorage');
        setToken(storedToken);
      } else {
        console.log('❌ No token found - user needs to log in');
      }
    }
  }, [searchParams]);

  const handleLogin = () => {
    console.log('Redirecting to Cerner login...');
    window.location.href = `${REACT_APP_API_URL}/cerner/login`;
  };

  const handleSearch = async () => {
    if (!token) {
      setError('Please log in with Cerner first');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const url = `${REACT_APP_API_URL}/cerner/patient?name=${encodeURIComponent(name)}`;
      const jwtToken = localStorage.getItem('token');
      
      console.log('=== SEARCH REQUEST ===');
      console.log('URL:', url);
      console.log('Cerner token present:', !!token);
      console.log('JWT token present:', !!jwtToken);
      
      const config = { 
        headers: { 
          'Authorization': `Bearer ${jwtToken}`,        // JWT for backend auth
          'Cerner-Authorization': `Bearer ${token}`     // Cerner token for FHIR API
        } 
      };

      const response = await axios.get(url, config);

      console.log('✅ Search successful');
      console.log('Response status:', response.status);

      const cernerPatients = response.data.entry || [];

      if (cernerPatients.length === 0) {
        setError('No patients found. Try searching for: SMARTS, Chalmers, Peters, or Williams');
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
      console.error('❌ Search failed:', err);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', err.response.data);
        
        if (err.response.status === 401) {
          setError('Authentication failed. Please log in with Cerner again.');
          setToken(null);
          sessionStorage.removeItem('cernerToken');
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
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Try searching for test patients: SMARTS, Chalmers, Peters, or Williams
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Patient name (e.g., SMARTS)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          disabled={loading || name.trim() === '' || !token}
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
              localStorage.setItem('ehrSource', 'cerner');
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