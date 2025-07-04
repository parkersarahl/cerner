import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const PatientSearch = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // On mount, check if token exists in query params (Epic OAuth)
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      localStorage.setItem('epic_token', urlToken);
    } else {
      const stored = localStorage.getItem('epic_token');
      if (stored) setToken(stored);
    }
  }, [searchParams]);

  const handleSearch = async () => {
    setError('');
    setLoading(true);

    if (token) {
      // Use Epic sandbox FHIR API directly
      try {
        // Example: search patients by name in Epic sandbox FHIR
        const epicResponse = await axios.get(
          `/api/epic/patient?name=${encodeURIComponent(name)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const entries = epicResponse.data.entry || [];
        const patients = entries.map((e) => {
          const resource = e.resource;
          return {
            id: resource.id,
            name:
              resource.name?.[0]?.text ||
              `${resource.name?.[0]?.given?.join(' ') || ''} ${resource.name?.[0]?.family || ''}`.trim() ||
              'Unnamed',
            birthDate: resource.birthDate || 'N/A',
            gender: resource.gender || 'Unknown',
          };
        });
        setResults(patients);
      } catch (err) {
        setError('Failed to fetch from Epic sandbox. Make sure token is valid.');
        console.error(err);
      }
    } else {
      // Use your backend patient search
      try {
        const response = await axios.get(`/api/patients?name=${encodeURIComponent(name)}`);
        setResults(response.data.patients || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || 'Search failed');
      }
    }

    setLoading(false);
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
          disabled={loading || name.trim() === ''}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      <ul className="mt-6 space-y-2">
        {results.map((patient) => (
          <li
            key={patient.id}
            className="border p-2 rounded shadow hover:bg-gray-100 cursor-pointer"
          >
            <a href={`/patients/${patient.id}`} className="text-blue-600 hover:underline">
              {patient.name} (DOB: {patient.birthDate})
            </a>
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
