import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // install via npm if needed
import appLogo from './graphics/ConnectEHR_logo.png';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/auth/login', {
        username: email,
        password,
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);

      // Decode token to extract role
      const decoded = jwtDecode(access_token);
      localStorage.setItem('roles', decoded.role || 'user'); // fallback role

      // Redirect to homepage or dashboard
      navigate('/frontpage');
    } catch (err) {
      console.error("Login error:", err);
      setError('Invalid email or password');
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
          />
          <input
            className="w-full mb-4 p-2 border rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
