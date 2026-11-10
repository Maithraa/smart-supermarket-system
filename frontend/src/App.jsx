import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Toast from './components/Toast';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CashierDashboard from './pages/cashier/CashierDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'Cashier') return <Navigate to="/cashier/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toast />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Direct Tool Shortcuts */}
            <Route path="/verify" element={<Navigate to="/customer/dashboard?tab=verify" replace />} />
            <Route path="/track" element={<Navigate to="/customer/dashboard?tab=track" replace />} />

            {/* Role Protected Dashboards */}
            <Route
              path="/customer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['Customer', 'Admin']}>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cashier/dashboard"
              element={
                <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                  <CashierDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
