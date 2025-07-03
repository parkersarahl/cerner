import { useEffect } from 'react';

const EpicLogin = () => {
  useEffect(() => {
    const epicAuthUrl = `https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize` +
    `?response_type=code` +
    `&client_id=7bb596ed-493f-4437-b469-3161f21f54dd` +
    `&redirect_uri=${encodeURIComponent('http://localhost:8000/api/epic/callback')}` +
    `&scope=${encodeURIComponent('launch openid fhirUser patient/*.read')}` +
    `&state=xyz123`;

    window.location.href = epicAuthUrl;
  }, []);

  return <p>Redirecting to Epic for login...</p>;
};

export default EpicLogin;
