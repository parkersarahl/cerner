import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserRoles, hasRole } from './axiosConfig';

const EpicLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('checking'); // checking, redirecting, success, error or boohack
  const [message, setMessage] = useState('');
  
  const userRoles = getUserRoles();
  const isAdmin = hasRole('admin');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const epicToken = params.get('token');
    const state = params.get('state');

    if (epicToken) {
      // We got the Epic token back from the callback
      setStatus('success');
      setMessage('Successfully connected to Epic!');
      
      // Store Epic token in sessionStorage (separate from YOUR JWT token)
      sessionStorage.setItem('epicToken', epicToken);
      
      // Navigate to search page after a brief delay
      setTimeout(() => {
        const returnPath = state ? atob(state) : '/search/epic';
        navigate(`${returnPath}?token=${epicToken}`, { replace: true });
      }, 1500);
      
    } else {
      // Check if we already have an Epic token in sessionStorage
      const existingToken = sessionStorage.getItem('epicToken');
      
      if (existingToken) {
        // Already connected
        setStatus('success');
        setMessage('Already connected to Epic');
        setTimeout(() => {
          navigate(`/search/epic?token=${existingToken}`, { replace: true });
        }, 1000);
      } else {
        // Need to initiate Epic OAuth flow
        setStatus('redirecting');
        setMessage('Redirecting to Epic for authentication...');
        
        const isLocalhost = window.location.hostname === 'localhost';
        const apiBaseUrl = isLocalhost
          ? 'http://localhost:8000'
          : process.env.REACT_APP_API_URL || 'https://cerner.onrender.com';

        // Include current path as base64 in state param
        const currentPath = '/search/epic'; // Where to return after Epic login
        const encodedState = btoa(currentPath);

        // Redirect to backend Epic OAuth endpoint
        setTimeout(() => {
          window.location.href = `${apiBaseUrl}/epic/login?state=${encodedState}`;
        }, 1000);
      }
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        {/* Status Icon */}
        <div className="flex justify-center mb-6">
          {status === 'checking' && (
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
          {status === 'redirecting' && (
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            {status === 'checking' && 'Checking Epic Connection'}
            {status === 'redirecting' && 'Connecting to Epic'}
            {status === 'success' && 'Connected!'}
            {status === 'error' && 'Connection Failed'}
          </h2>
          <p className="text-gray-600 mb-6">{message}</p>

          {/* User Role Info */}
          {userRoles.length > 0 && (
            <div className="mb-6 flex justify-center items-center gap-2">
              <span className="text-sm text-gray-600">Your role:</span>
              {userRoles.map(role => (
                <span 
                  key={role}
                  className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {role}
                </span>
              ))}
            </div>
          )}

          {/* Admin Badge */}
          {isAdmin && (
            <div className="mb-6 inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium">
              🔑 Admin Access
            </div>
          )}

          {/* Additional Info */}
          {status === 'redirecting' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
              <p className="text-sm text-blue-800 font-semibold mb-2">What's happening:</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Redirecting to Epic's OAuth portal</li>
                <li>You'll log in with Epic credentials</li>
                <li>Epic will authorize access</li>
                <li>You'll return to search patients</li>
              </ol>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-4">
              <div className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
                Redirecting to patient search...
              </div>
            </div>
          )}

          {/* Manual Navigation */}
          {status === 'success' && (
            <button
              onClick={() => navigate('/search/epic')}
              className="mt-6 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go to Patient Search
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpicLogin;