import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Bell, User, LogOut, CheckCircle, AlertTriangle, Menu, X, Shield, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin/dashboard';
    if (user.role === 'Cashier') return '/cashier/dashboard';
    return '/customer/dashboard';
  };

  return (
    <header className="site-header">
      <div className="header-container">
        {/* Logo & Brand */}
        <Link to="/" className="brand-logo" style={{ textDecoration: 'none' }}>
          <div className="logo-icon-wrap">
            <ShoppingCart size={22} className="logo-cart" />
          </div>
          <div className="brand-text">
            <span className="brand-title">FreshMart</span>
            <span className="brand-subtitle">Smart Supermarket Verification</span>
          </div>
        </Link>

        {/* Desktop Public Nav */}
        <nav className="desktop-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <a href="/#features" className="nav-link">Features</a>
          <a href="/#workflow" className="nav-link">How It Works</a>
          <a href="/#about" className="nav-link">About</a>
          <a href="/#contact" className="nav-link">Contact</a>
          {user && (
            <Link to={getDashboardLink()} className="nav-link nav-highlight">
              {user.role} Dashboard
            </Link>
          )}
        </nav>

        {/* Right Actions */}
        <div className="header-right">
          {user ? (
            <div className="user-nav-actions">
              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  className="icon-bell-btn"
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
                </button>

                {showNotifications && (
                  <div className="notifications-popover">
                    <div className="popover-header">
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Live Notifications</span>
                      {unreadCount > 0 && (
                        <button className="text-btn" onClick={markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="popover-list">
                      {notifications.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 6).map((n) => (
                          <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`}>
                            <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#1E293B' }}>
                              {n.title}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '4px' }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Pill */}
              <div className="user-profile-pill">
                <div className="user-avatar-small">
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-pill-info">
                  <span className="user-pill-name">{user.full_name?.split(' ')[0]}</span>
                  <span className={`role-badge role-${user.role.toLowerCase()}`}>
                    {user.role} {user.counter_no ? `(C${user.counter_no})` : ''}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button className="btn-logout" onClick={handleLogout} title="Logout">
                <LogOut size={16} />
                <span className="logout-text">Logout</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline-nav">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-primary-nav">
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <a href="/#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="/#workflow" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
          <a href="/#about" onClick={() => setMobileMenuOpen(false)}>About Us</a>
          <a href="/#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
          {user ? (
            <>
              <Link to={getDashboardLink()} onClick={() => setMobileMenuOpen(false)} style={{ color: '#2563EB', fontWeight: '700' }}>
                Go to {user.role} Dashboard
              </Link>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="mobile-logout-btn">
                Logout
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <Link to="/login" className="btn btn-outline-nav" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="btn btn-primary-nav" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
