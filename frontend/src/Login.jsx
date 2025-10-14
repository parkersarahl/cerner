import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import appLogo from './graphics/ConnectEHR_logo.png';

const isLocalhost = window.location.hostname === 'localhost';

const API_BASE_URL = isLocalhost
  ? 'http://localhost:8000'
  : process.env.REACT_APP_API_URL;

const Login = () => {
  const REACT_APP_API_URL = API_BASE_URL;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await axios.post(`${REACT_APP_API_URL}/auth/login`, {
        username: email.split('@')[0], // 'provider@provider.com' → 'provider'
        password,
      });

      const { access_token } = response.data;
      const decoded = jwtDecode(access_token);
      const roles = decoded.roles || [];
      
      console.log("Decoded JWT:", decoded);
      console.log("User roles:", roles);

      // Check authorization
      if (!roles.includes('provider') && !roles.includes('admin')) {
        setError('You are not authorized to view this data');
        setLoading(false);
        return;
      }

      // ✅ Store in localStorage
      localStorage.setItem('token', access_token);
      localStorage.setItem('roles', JSON.stringify(roles));
      localStorage.setItem('username', decoded.sub || email.split('@')[0]);

      // Redirect to frontpage
      navigate('/frontpage');
      
    } catch (err) {
      console.error("Login error:", err);
      
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.response?.status === 403) {
        setError('Account is not authorized');
      } else {
        setError('Login failed. Please try again.');
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-14">
      <img
        src={appLogo}
        alt="ConnectEHR Logo"
        className="w-100 h-60 object-contain mb-1 mx-auto"
      />
      <h1 className="text-xl font-semibold text-gray-700 mb-10 text-center border-b-2 border-gray-300 pb-2">
        Uniting Records. Empowering Care.
      </h1>

      <div className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Login</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            className="w-full mb-2 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="email"
            placeholder="Email (e.g. provider@provider.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <input
            className="w-full mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="submit"
            className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded flex items-center justify-center gap-3 transition-transform duration-150 hover:scale-[1.02] disabled:opacity-75 disabled:cursor-not-allowed shadow-md`}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="animate-pulse font-medium tracking-wide">Logging in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-semibold text-blue-800 mb-1">Test Accounts:</p>
          <p className="text-blue-700">Provider: provider@provider.com / provider</p>
          <p className="text-blue-700">Admin: admin@admin.com / admin</p>
        </div>
      </div>
    </div>
  );
};

export default Login;