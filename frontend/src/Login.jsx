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
  const REACT_APP_API_URL = API_BASE_URL
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
        username: email.split('@')[0], // so 'provider@provider.com' → 'provider'
        password,
      });

      const { access_token } = response.data;
      const decoded = jwtDecode(access_token);
      const roles = decoded.roles || []; // Fallback to empty array if no roles present
      
      //----Debugging Logs----//
      //console.log("Decoded JWT:", decoded);
      //console.log(roles);

      
      if (!roles.includes('provider') && !roles.includes('admin')) {
        setError('You are not authorized to view this data');
        setLoading(false);
        return;
    }

      localStorage.setItem('token', access_token);
      localStorage.setItem('roles', JSON.stringify(roles)); // Store roles in localStorage

      // Redirect to homepage or dashboard
      navigate('/frontpage');
    } catch (err) {
      console.error("Login error:", err);
      setError('Invalid email or password');
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
        {error && <p className="text-red-600">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            className="w-full mb-2 p-2 border rounded"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            className="w-full mb-4 p-2 border rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
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
      </div>
    </div>
  );
};

export default Login;
