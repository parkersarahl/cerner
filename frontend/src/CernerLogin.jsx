import React, { useEffect } from 'react';

const CernerLogin = () => {
  useEffect(() => {
    const isLocalhost = window.location.hostname === 'localhost';

    const apiBaseUrl = isLocalhost
      ? 'http://localhost:8000'
      : process.env.REACT_APP_API_URL || 'https://cerner.onrender.com';
      
    console.log("Resolved apiBaseUrl =", apiBaseUrl);

    window.location.href = `${apiBaseUrl}/cerner/login`;
  }, []);

  return <p>Redirecting to Cerner for login...</p>;
};

export default CernerLogin;
