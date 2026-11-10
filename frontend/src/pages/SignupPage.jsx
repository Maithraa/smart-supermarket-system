import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, UserPlus, Lock, Mail, Phone, User, Check, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function SignupPage() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    agree_terms: false
  });

  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setErrorMsg('Please fill in all customer personal details.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (!formData.agree_terms) {
      setErrorMsg('You must agree to the supermarket service terms and conditions.');
      return;
    }

    const res = await signup(formData);
    if (res.success) {
      navigate('/customer/dashboard');
    } else {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="auth-page-root">
      <Navbar />

      <div className="auth-wrapper">
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <div className="auth-header">
            <div className="auth-icon-circle bg-emerald-subtle">
              <UserPlus size={24} color="#059669" />
            </div>
            <h2>Create Customer Account</h2>
            <p>Register to verify bills and track supermarket resolutions</p>
          </div>

          {errorMsg && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  placeholder="e.g. Maithraa S"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Mobile Number</label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm Password</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-row-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agree_terms"
                  checked={formData.agree_terms}
                  onChange={handleChange}
                />
                <span>
                  I agree to the <a href="#terms" onClick={(e) => e.preventDefault()} style={{ color: '#2563EB' }}>Terms of Service</a> & <a href="#privacy" onClick={(e) => e.preventDefault()} style={{ color: '#2563EB' }}>Privacy Policy</a>
                </span>
              </label>
            </div>

            <div className="security-notice-box">
              <ShieldCheck size={16} color="#059669" />
              <span>
                Public registration securely creates a <strong>Customer</strong> profile. Staff & Admin accounts are managed strictly by Store Management.
              </span>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Creating Account...' : 'Create Customer Account'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-footer-prompt">
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign In here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
