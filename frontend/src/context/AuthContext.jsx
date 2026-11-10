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
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email: cleanEmail, password }, { timeout: 3000 });
      const { token: jwtToken, user: userData, redirect } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('freshmart_token', jwtToken);
      localStorage.setItem('freshmart_user', JSON.stringify(userData));
      return { success: true, redirect, user: userData };
    } catch (err) {
      // If backend is unreachable (e.g. on GitHub Pages static deployment or offline), activate smart demo fallback
      if (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        let role = 'Customer';
        let redirect = '/customer/dashboard';
        let name = 'Customer 01';
        let counterNo = null;

        if (cleanEmail.includes('admin')) {
          role = 'Admin';
          name = 'System Administrator';
          redirect = '/admin/dashboard';
        } else if (cleanEmail.includes('priya')) {
          role = 'Cashier';
          name = 'Priya Sharma';
          counterNo = 2;
          redirect = '/cashier/dashboard';
        } else if (cleanEmail.includes('rahul')) {
          role = 'Cashier';
          name = 'Rahul Verma';
          counterNo = 1;
          redirect = '/cashier/dashboard';
        }

        const fallbackUser = {
          id: Date.now(),
          email: cleanEmail,
          full_name: name,
          role,
          phone: '+91 98765 00000',
          counter_no: counterNo,
          is_demo_fallback: true
        };
        const fallbackToken = 'demo_jwt_token_' + Date.now();

        setUser(fallbackUser);
        setToken(fallbackToken);
        localStorage.setItem('freshmart_token', fallbackToken);
        localStorage.setItem('freshmart_user', JSON.stringify(fallbackUser));
        return { success: true, redirect, user: fallbackUser };
      }

      const message = err.response?.data?.error || 'Login failed. Please check your credentials.';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (formData) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/signup`, formData, { timeout: 3000 });
      const { token: jwtToken, user: userData, redirect } = res.data;
      setUser(userData);
      setToken(jwtToken);
      localStorage.setItem('freshmart_token', jwtToken);
      localStorage.setItem('freshmart_user', JSON.stringify(userData));
      return { success: true, redirect, user: userData };
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        const fallbackUser = {
          id: Date.now(),
          email: formData.email,
          full_name: formData.full_name,
          role: 'Customer',
          phone: formData.phone,
          is_demo_fallback: true
        };
        setUser(fallbackUser);
        setToken('demo_token');
        localStorage.setItem('freshmart_token', 'demo_token');
        localStorage.setItem('freshmart_user', JSON.stringify(fallbackUser));
        return { success: true, redirect: '/customer/dashboard', user: fallbackUser };
      }
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
