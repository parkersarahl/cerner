// src/components/Navbar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectEHRLogo from './graphics/logo'; 

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear localStorage/sessionStorage/token/etc.
    localStorage.removeItem('token'); // or whatever you use
    sessionStorage.clear();

    // Redirect to login or home
    navigate('/FrontPage');
  };

  return (
    <header className="bg-gray-50 text-white flex justify-between items-center p-4 shadow-md">
      <ConnectEHRLogo />
      <button
        onClick={handleLogout}
        className="bg-connectBlue text-white px-4 py-2 rounded hover:bg-gray-100"
      >
        Logout
      </button>
    </header>
  );
};

export default Navbar;
