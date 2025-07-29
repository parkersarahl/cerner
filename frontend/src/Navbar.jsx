import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConnectEHRLogo from './graphics/logo'; 

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Adjust regex to match your actual patient detail route
  const showBackButton = /^\/patients\/[^/]+$/.test(location.pathname);
  const source = localStorage.getItem('searchSource') || 'epic'; // fallback if missing

  const handleBackToSearch = () => {
  navigate(`/search/${source}`);
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <header className="bg-gray-50 text-white flex justify-between items-center p-4 shadow-md">
      <ConnectEHRLogo />

      <div className="flex gap-4 items-center">
        {showBackButton && (
          <button
            onClick={handleBackToSearch}
            className="bg-connectBlue text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ← Back to Search
          </button>
        )}
        <button
          onClick={handleLogout}
          className="bg-connectBlue text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;

