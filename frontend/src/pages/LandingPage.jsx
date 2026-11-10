import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Truck,
  RotateCcw,
  Store,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  Users
} from 'lucide-react';
import Navbar from '../components/Navbar';
import QRScannerModal from '../components/QRScannerModal';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [quickBillInput, setQuickBillInput] = useState('');

  const handleScanSuccess = (code) => {
    navigate(`/customer/dashboard?tab=verify&bill=${encodeURIComponent(code)}`);
  };

  const handleQuickVerify = (e) => {
    e.preventDefault();
    if (quickBillInput.trim()) {
      navigate(`/customer/dashboard?tab=verify&bill=${encodeURIComponent(quickBillInput.trim().toUpperCase())}`);
    }
  };

  return (
    <div className="landing-page-root">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-pattern-overlay" />
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} className="badge-sparkle" />
              <span>Next-Gen Supermarket Intelligence & Grievance Redressal</span>
            </div>
            <h1 className="hero-title">
              Smart Supermarket <br />
              <span className="hero-title-gradient">Billing Verification</span> & Automated Resolution
            </h1>
            <p className="hero-subtitle">
              Verify your physical shopping bag items against scanned bills in seconds. Automatically detect wrong products, quantity discrepancies, and auto-route grievances directly to responsible cashiers for instant manager-approved replacements or refunds.
            </p>

            {/* Quick Bill Action Box */}
            <div className="hero-action-box">
              <form onSubmit={handleQuickVerify} className="hero-input-form">
                <input
                  type="text"
                  placeholder="Enter Bill Number (e.g. B1025)..."
                  value={quickBillInput}
                  onChange={(e) => setQuickBillInput(e.target.value)}
                  className="hero-bill-input"
                />
                <button type="submit" className="btn btn-hero-primary">
                  <CheckCircle2 size={18} />
                  Verify Bill
                </button>
              </form>
              <div className="hero-or-divider">OR</div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="btn btn-hero-qr"
              >
                <QrCode size={18} />
                Scan QR Code
              </button>
            </div>

            {/* Micro Highlights */}
            <div className="hero-micro-tags">
              <div className="micro-tag"><CheckCircle2 size={15} color="#10B981" /> Wrong Product AI Detection</div>
              <div className="micro-tag"><CheckCircle2 size={15} color="#10B981" /> Auto Cashier Routing</div>
              <div className="micro-tag"><CheckCircle2 size={15} color="#10B981" /> 100% MySQL Data Persistence</div>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="hero-visual">
            <div className="live-demo-card">
              <div className="demo-card-header">
                <div className="demo-header-pill">
                  <span className="live-indicator-dot" /> LIVE VERIFICATION DEMO
                </div>
                <span className="demo-bill-tag">Bill: B1025</span>
              </div>

              <div className="demo-card-body">
                <div className="demo-meta-grid">
                  <div>
                    <span className="meta-label">Customer</span>
                    <strong className="meta-val">Customer 01</strong>
                  </div>
                  <div>
                    <span className="meta-label">Counter & Cashier</span>
                    <strong className="meta-val">Counter #2 (Priya)</strong>
                  </div>
                </div>

                <div className="demo-discrepancy-box">
                  <div className="discrepancy-title">
                    <AlertTriangle size={16} color="#DC2626" />
                    <span>Discrepancy Detected by System</span>
                  </div>
                  <div className="discrepancy-details">
                    <div className="discrepancy-item">
                      <span className="item-label">Billed Product:</span>
                      <span className="item-val expected">Dove Soap x 2 (Rs 110.00)</span>
                    </div>
                    <div className="discrepancy-item">
                      <span className="item-label">Received in Bag:</span>
                      <span className="item-val received">Lux Soap x 2 (Wrong Item!)</span>
                    </div>
                  </div>
                  <div className="discrepancy-badge">
                    Automatic Action: Assigned to Cashier Priya for Replacement Approval
                  </div>
                </div>

                <div className="demo-action-btn-wrap">
                  <button
                    onClick={() => navigate('/customer/dashboard?tab=verify&bill=B1025')}
                    className="btn btn-demo-test"
                  >
                    <span>Test This Scenario Live</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Counter Strip */}
      <section className="stats-strip">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">99.8%</div>
            <div className="stat-label">Mismatch Detection Accuracy</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">&lt; 3 mins</div>
            <div className="stat-label">Average Resolution Approval</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">Auto</div>
            <div className="stat-label">Cashier & Counter Mapping</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-number">100%</div>
            <div className="stat-label">Transparent Audit Trail</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-pretitle">CORE CAPABILITIES</span>
          <h2 className="section-title">Built for Modern Supermarket Excellence</h2>
          <p className="section-desc">
            Eliminate checkout disputes, eliminate long customer service queues, and empower staff with automated resolution tools.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon bg-blue-subtle">
              <QrCode size={26} color="#2563EB" />
            </div>
            <h3>QR & Barcode Bill Verification</h3>
            <p>
              Instantly scan any checkout receipt with smartphone camera. Cross-references database items with physical barcodes to verify purchases.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-amber-subtle">
              <AlertTriangle size={26} color="#D97706" />
            </div>
            <h3>Intelligent Mismatch Detection</h3>
            <p>
              Pinpoints exact discrepancies: Wrong products, missing goods, extra items, or quantity mismatches (e.g. Dove Soap vs Lux Soap).
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-purple-subtle">
              <Users size={26} color="#7C3AED" />
            </div>
            <h3>Automatic Cashier Assignment</h3>
            <p>
              Identifies the exact counter and cashier who processed the bill and routes complaints automatically to that cashier’s queue.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-emerald-subtle">
              <RotateCcw size={26} color="#059669" />
            </div>
            <h3>Flexible Resolution Approvals</h3>
            <p>
              Cashiers investigate and recommend actions; Admins authorize Product Replacement, Instant Refund, Home Delivery, or Store Pickup.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-sky-subtle">
              <Search size={26} color="#0284C7" />
            </div>
            <h3>Real-Time 8-Stage Tracking</h3>
            <p>
              Full customer transparency with live Socket.IO alerts through every stage from 'Submitted' to 'Closed' with full timestamped audit logs.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon bg-slate-subtle">
              <ShieldCheck size={26} color="#0F172A" />
            </div>
            <h3>Role-Based Security</h3>
            <p>
              Three isolated portals for Customer, Cashier, and Admin with Werkzeug password hashing and JWT authentication.
            </p>
          </div>
        </div>
      </section>

      {/* 4-Step Workflow Section */}
      <section id="workflow" className="workflow-section">
        <div className="section-header">
          <span className="section-pretitle">SEAMLESS REDRESSAL</span>
          <h2 className="section-title">How the Automated Resolution System Works</h2>
          <p className="section-desc">A frictionless 4-step path from bill scan to verified resolution</p>
        </div>

        <div className="workflow-steps-container">
          <div className="workflow-step">
            <div className="step-circle">1</div>
            <h4>Scan & Verify Bill</h4>
            <p>Customer scans receipt QR code; system fetches itemized database records and highlights any discrepancy.</p>
          </div>
          <div className="workflow-connector" />
          <div className="workflow-step">
            <div className="step-circle">2</div>
            <h4>Raise Complaint</h4>
            <p>One-click complaint filing with pre-populated details, mismatch category, description, and optional photo upload.</p>
          </div>
          <div className="workflow-connector" />
          <div className="workflow-step">
            <div className="step-circle">3</div>
            <h4>Cashier Investigates</h4>
            <p>Auto-routed to the specific cashier who processed the bill. Cashier reviews counter log and recommends remedy.</p>
          </div>
          <div className="workflow-connector" />
          <div className="workflow-step">
            <div className="step-circle">4</div>
            <h4>Admin Approval & Close</h4>
            <p>Store Admin approves Replacement or Refund; customer receives live notification and confirms resolution.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-text">
            <span className="section-pretitle">ABOUT FRESHMART SMART SUPERMARKET</span>
            <h2>Zero Disputes. Total Transparency. Happy Shoppers.</h2>
            <p>
              FreshMart is pioneering the modern retail standard with automated billing verification. We believe supermarket shoppers should never experience checkout anxiety, billing inaccuracies, or delayed complaint handoffs.
            </p>
            <div className="about-checklist">
              <div className="check-item">
                <CheckCircle2 size={18} color="#10B981" />
                <span>Real-time reconciliation of physical cart versus POS scanner record</span>
              </div>
              <div className="check-item">
                <CheckCircle2 size={18} color="#10B981" />
                <span>Empowered cashier accountability without lengthy paperwork</span>
              </div>
              <div className="check-item">
                <CheckCircle2 size={18} color="#10B981" />
                <span>Managerial oversight with complete reporting and performance metrics</span>
              </div>
            </div>
            <div style={{ marginTop: '1.75rem' }}>
              <Link to="/signup" className="btn btn-primary" style={{ padding: '0.8rem 1.75rem', fontSize: '1rem' }}>
                Join FreshMart Customer Portal
              </Link>
            </div>
          </div>

          <div className="about-stats-card">
            <div className="about-stat-row">
              <div className="about-icon"><Store size={28} color="#2563EB" /></div>
              <div>
                <strong style={{ fontSize: '1.25rem', color: '#0F172A', display: 'block' }}>FreshMart Flagship Store</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Counter 1 & 2 fully equipped with Automated Grievance AI</span>
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '1rem 0' }} />
            <div className="about-stat-row">
              <div className="about-icon"><ShieldCheck size={28} color="#10B981" /></div>
              <div>
                <strong style={{ fontSize: '1.25rem', color: '#0F172A', display: 'block' }}>100% Quality Assurance</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Guaranteed resolution for any discrepancy within 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="section-header">
          <span className="section-pretitle">CUSTOMER SUPPORT & HELPDESK</span>
          <h2 className="section-title">We Are Here to Assist You 24/7</h2>
          <p className="section-desc">Reach out to our customer happiness and supervisory team anytime.</p>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <Phone size={24} color="#2563EB" />
            <h4>Customer Helpline</h4>
            <p>+91 98765 00000</p>
            <span className="contact-note">Toll-free 8:00 AM - 10:00 PM</span>
          </div>

          <div className="contact-card">
            <Mail size={24} color="#2563EB" />
            <h4>Grievance Email</h4>
            <p>support@freshmart.com</p>
            <span className="contact-note">Complaints auto-logged instantly</span>
          </div>

          <div className="contact-card">
            <MapPin size={24} color="#2563EB" />
            <h4>Supermarket Location</h4>
            <p>42 FreshMart Boulevard, Central Plaza</p>
            <span className="contact-note">Customer Help Desk at Counter #2</span>
          </div>

          <div className="contact-card">
            <Clock size={24} color="#2563EB" />
            <h4>Store Hours</h4>
            <p>Mon - Sun: 7:00 AM - 11:00 PM</p>
            <span className="contact-note">Online Verification 24/7 Active</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
              <ShoppingCart size={22} color="#38BDF8" />
              <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#FFFFFF' }}>FreshMart</span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: '1.6' }}>
              Smart Supermarket Billing Verification and Automated Complaint Resolution System.
              Powered by ReactJS, Python Flask, and MySQL.
            </p>
          </div>

          <div className="footer-col">
            <h5>Quick Portals</h5>
            <ul>
              <li><Link to="/login">Customer Login</Link></li>
              <li><Link to="/login">Cashier Portal</Link></li>
              <li><Link to="/login">Store Administrator</Link></li>
              <li><Link to="/signup">Register Account</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Demo Scenarios</h5>
            <ul>
              <li><a href="#demo" onClick={() => navigate('/customer/dashboard?tab=verify&bill=B1025')}>Bill B1025 (Wrong Product)</a></li>
              <li><a href="#demo" onClick={() => navigate('/customer/dashboard?tab=verify&bill=B1026')}>Bill B1026 (Quantity Mismatch)</a></li>
              <li><a href="#demo" onClick={() => navigate('/customer/dashboard?tab=verify&bill=B1027')}>Bill B1027 (Verified Bill)</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Security & Architecture</h5>
            <p style={{ color: '#94A3B8', fontSize: '0.8rem', lineHeight: '1.5' }}>
              Werkzeug Scrypt Password Encryption · JWT Session Security · Socket.IO Real-time Pipeline · Relational MySQL InnoDB.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} FreshMart Supermarket Systems. All rights reserved.</p>
        </div>
      </footer>

      {/* QR Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
