import React, { useEffect } from 'react';

const EpicLogin = () => {
  useEffect(() => {
    // Call your backend login endpoint which redirects to Epic
    window.location.href = "http://localhost:8000/api/epic/login";
  }, []);

  return <p>Redirecting to Epic for login...</p>;
};

export default EpicLogin;

