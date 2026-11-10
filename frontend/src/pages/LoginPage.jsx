import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    const res = await login(email.trim(), password);
    if (res.success) {
      navigate(res.redirect || '/customer/dashboard');
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  return (
    <div className="auth-page-root">
      <Navbar />

      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon-circle">
              <Lock size={24} color="#2563EB" />
            </div>
            <h2>Welcome Back</h2>
            <p>Sign in to access your supermarket portal</p>
          </div>

          {errorMsg && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-link-btn"
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-row-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me on this browser</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="demo-credentials-box">
            <div className="demo-box-title">
              <KeyRound size={14} /> Quick Demo Logins (Click to autofill):
            </div>
            <div className="demo-pills-row">
              <button
                type="button"
                className="demo-pill customer"
                onClick={() => handleQuickFill('customer01@gmail.com', 'Customer@123')}
              >
                🛒 Customer 01
              </button>
              <button
                type="button"
                className="demo-pill cashier"
                onClick={() => handleQuickFill('priya@freshmart.com', 'Cashier@123')}
              >
                👩‍💼 Cashier Priya
              </button>
              <button
                type="button"
                className="demo-pill admin"
                onClick={() => handleQuickFill('admin@freshmart.com', 'Admin@123')}
              >
                👨‍💼 Store Admin
              </button>
            </div>
          </div>

          <div className="auth-footer-prompt">
            Don't have a customer account yet?{' '}
            <Link to="/signup" className="auth-link">Create Account</Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Password Reset Assistance</h3>
              <button className="icon-btn" onClick={() => { setForgotModalOpen(false); setForgotSuccess(false); }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {forgotSuccess ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <ShieldCheck size={42} color="#10B981" style={{ margin: '0 auto 0.75rem' }} />
                  <h4 style={{ margin: '0 0 0.5rem', color: '#0F172A' }}>Reset Instructions Sent</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                    If <strong>{forgotEmail}</strong> matches an active account, password reset guidance has been dispatched.
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '1rem' }}>
                    For demo accounts, default passwords are: <code>Customer@123</code>, <code>Cashier@123</code>, <code>Admin@123</code>.
                  </p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '1.25rem' }}
                    onClick={() => { setForgotModalOpen(false); setForgotSuccess(false); }}
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (forgotEmail) setForgotSuccess(true);
                  }}
                >
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 0 }}>
                    Enter your registered email address to receive password recovery assistance:
                  </p>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setForgotModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Send Reset Instructions
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
