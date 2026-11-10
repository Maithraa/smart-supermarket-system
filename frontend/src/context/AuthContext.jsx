import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_BASE = 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('freshmart_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('freshmart_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const { token: jwtToken, user: userData, redirect } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('freshmart_token', jwtToken);
      localStorage.setItem('freshmart_user', JSON.stringify(userData));
      return { success: true, redirect, user: userData };
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (formData) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, formData);
      const { token: jwtToken, user: userData, redirect } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('freshmart_token', jwtToken);
      localStorage.setItem('freshmart_user', JSON.stringify(userData));
      return { success: true, redirect, user: userData };
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('freshmart_token');
    localStorage.removeItem('freshmart_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = (updatedData) => {
    const updated = { ...user, ...updatedData };
    setUser(updated);
    localStorage.setItem('freshmart_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateProfile, API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
