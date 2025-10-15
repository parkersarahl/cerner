import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, getUserRoles, hasRole } from './axiosConfig';

const Navbar = () => {
  const navigate = useNavigate();
  
  // Get user info from localStorage
  const username = localStorage.getItem('username') || 'User';
  const roles = getUserRoles();
  const isAdmin = hasRole('admin');
  const isProvider = hasRole('provider');

  const handleLogout = () => {
    logout(); // This clears localStorage and redirects
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/frontpage" className="text-xl font-bold text-gray-800">
              ConnectEHR
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/frontpage"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Home
            </Link>
            
            {/* Only show Epic/Cerner links if user is provider or admin */}
            {(isProvider || isAdmin) && (
              <>
                <Link
                  to="/search/epic"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Epic Search
                </Link>
                <Link
                  to="/search/cerner"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Cerner Search
                </Link>
              </>
            )}
            
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-700">
                Welcome, <span className="font-semibold">{username}</span>
              </span>
              <div className="text-xs text-gray-500">
                {roles.map(role => (
                  <span 
                    key={role}
                    className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-1 mt-1"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;