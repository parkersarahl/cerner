import React, { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const EpicLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { source } = useParams(); // "epic" or "cerner"

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    const state = params.get('state'); // optional: return path from backend

    if (urlToken) {
      // store token
      localStorage.setItem('token', urlToken);

      // navigate to original page if state exists, else default
      const returnPath = state ? atob(state) : `/search/epic`;
      navigate(returnPath, { replace: true });
    } else {
      // first time -> kick off login
      const isLocalhost = window.location.hostname === 'localhost';
      const apiBaseUrl = isLocalhost
        ? 'http://localhost:8000'
        : process.env.REACT_APP_API_URL || 'https://cerner.onrender.com';

      // include current path as base64 in state param
      const currentPath = window.location.pathname + window.location.search;
      const encodedState = btoa(currentPath);

      window.location.href = `${apiBaseUrl}/epic/login?state=${encodedState}`;
    }
  }, [location, navigate, source]);

  return <p>Redirecting to Epic for login...</p>;
};

export default EpicLogin;