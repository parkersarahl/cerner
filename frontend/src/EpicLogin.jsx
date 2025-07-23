import React, { useEffect } from 'react';

const EpicLogin = () => {
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost';

    const apiBaseUrl = isLocalhost
      ? 'http://localhost:8000'
      : process.env.REACT_APP_API_URL || 'https://fhir-u5oe.onrender.com';

    window.location.href = `${apiBaseUrl}/api/epic/login`;
  }, []);

  return <p>Redirecting to Epic for login...</p>;
};

export default EpicLogin;
