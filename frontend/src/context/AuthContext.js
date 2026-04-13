import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authConfig, setAuthConfig] = useState(null);
  const [passwordRules, setPasswordRules] = useState(null);

  // Initialize auth from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check localStorage for saved token
        const savedToken = localStorage.getItem('auth_token');
        const stayConnected = localStorage.getItem('stay_connected') === 'true';

        if (savedToken && stayConnected) {
          // Verify token is still valid
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          setUser(response.data);
          setToken(savedToken);
        }

        // Fetch auth config
        const configResponse = await axios.get(`${API_URL}/auth/config`);
        setAuthConfig(configResponse.data);

        // Fetch password rules
        const rulesResponse = await axios.get(`${API_URL}/auth/password-rules`);
        setPasswordRules(rulesResponse.data);
      } catch (err) {
        // Silent fail, user just needs to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('stay_connected');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const signup = useCallback(
    async (email, password, stayConnected = false) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post(`${API_URL}/auth/signup`, {
          email,
          password,
          stay_connected: stayConnected,
        });

        const { access_token, user_id, team_member_id } = response.data;
        
        setUser({
          id: user_id,
          email,
          team_member_id,
          is_active: true,
        });
        setToken(access_token);

        // Save to localStorage
        localStorage.setItem('auth_token', access_token);
        if (stayConnected) {
          localStorage.setItem('stay_connected', 'true');
        }

        return response.data;
      } catch (err) {
        const errorMessage = err.response?.data?.detail || 'Signup failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const login = useCallback(
    async (email, password, stayConnected = false) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email,
          password,
          stay_connected: stayConnected,
        });

        const { access_token, user_id, team_member_id } = response.data;

        setUser({
          id: user_id,
          email,
          team_member_id,
          is_active: true,
        });
        setToken(access_token);

        // Save to localStorage
        localStorage.setItem('auth_token', access_token);
        if (stayConnected) {
          localStorage.setItem('stay_connected', 'true');
        } else {
          localStorage.removeItem('stay_connected');
        }

        return response.data;
      } catch (err) {
        const errorMessage = err.response?.data?.detail || 'Login failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('stay_connected');
      setLoading(false);
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getODCLoginUrl = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/ocdc/login-url`);
      return response.data.login_url;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to get OCDC login URL';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loginWithODC = useCallback(
    async (odcId, email) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post(`${API_URL}/auth/ocdc/token`, {
          ocdc_id: odcId,
          email,
        });

        const { access_token, user_id, team_member_id } = response.data;

        setUser({
          id: user_id,
          email,
          team_member_id,
          is_active: true,
        });
        setToken(access_token);

        // Save to localStorage
        localStorage.setItem('auth_token', access_token);
        localStorage.setItem('stay_connected', 'true'); // Always stay connected for OCDC

        return response.data;
      } catch (err) {
        const errorMessage = err.response?.data?.detail || 'OCDC login failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    loading,
    error,
    authConfig,
    passwordRules,
    isAuthenticated,
    signup,
    login,
    logout,
    getODCLoginUrl,
    loginWithODC,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
