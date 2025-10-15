//axiosConfig.js
import axios from 'axios';

const isLocalhost = window.location.hostname === 'localhost';

const API_BASE_URL = isLocalhost
  ? 'http://localhost:8000'
  : process.env.REACT_APP_API_URL;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - automatically adds JWT token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      // Add YOUR JWT token for backend authentication
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401/403 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear localStorage and redirect
      console.log('Token expired, logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('roles');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Helper function to add Epic token to specific requests
 * Use this when making Epic FHIR API calls
 * 
 * @param {string} epicToken - The Epic OAuth token
 * @returns {object} Headers object with Epic-Authorization
 */
export const addEpicToken = (epicToken) => {
  return {
    headers: {
      'Epic-Authorization': `Bearer ${epicToken}`
    }
  };
};

/**
 * Get user roles from localStorage
 * @returns {string[]} Array of role strings
 */
export const getUserRoles = () => {
  try {
    const roles = localStorage.getItem('roles');
    return roles ? JSON.parse(roles) : [];
  } catch (error) {
    console.error('Error parsing roles from localStorage:', error);
    return [];
  }
};

/**
 * Check if user has a specific role
 * @param {string} role - Role to check for
 * @returns {boolean}
 */
export const hasRole = (role) => {
  const roles = getUserRoles();
  return roles.includes(role);
};

/**
 * Get Epic token from sessionStorage
 * @returns {string|null} Epic token or null
 */
export const getEpicToken = () => {
  return sessionStorage.getItem('epicToken');
};

/**
 * Store Epic token in sessionStorage
 * @param {string} token - Epic OAuth token
 */
export const setEpicToken = (token) => {
  sessionStorage.setItem('epicToken', token);
};

/**
 * Remove Epic token from sessionStorage
 */
export const clearEpicToken = () => {
  sessionStorage.removeItem('epicToken');
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Logout user - clear localStorage
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('roles');
  localStorage.removeItem('username');
  window.location.href = '/login';
};

export default apiClient;