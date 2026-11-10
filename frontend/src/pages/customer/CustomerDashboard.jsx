import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  QrCode,
  Upload,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  User,
  Phone,
  Mail,
  Lock,
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle,
  Camera
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import StatusBadge from '../../components/StatusBadge';
import AuditTimeline from '../../components/AuditTimeline';
import QRScannerModal from '../../components/QRScannerModal';

const STEPS = [
  'Submitted',
  'Under Review',
  'Assigned to Cashier',
  'Investigation in Progress',
  'Awaiting Manager Approval',
  'Resolution Offered',
  'Resolved',
  'Closed'
];

export default function CustomerDashboard() {
  const { user, updateProfile, API_BASE } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();

  // Active Tab: 'dashboard' | 'verify' | 'raise' | 'track' | 'profile'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');

  // Stats
  const [stats, setStats] = useState({
    totalBills: 0,
    verifiedBills: 0,
    complaintsRaised: 0,
    resolvedComplaints: 0,
    pendingComplaints: 0
  });

  // Verification state
  const [verifyBillNo, setVerifyBillNo] = useState(searchParams.get('bill') || 'B1025');
  const [billData, setBillData] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Raise Complaint state
  const [complaintForm, setComplaintForm] = useState({
    bill_no: searchParams.get('bill') || 'B1025',
    customer_name: user?.full_name || 'Customer 01',
    customer_email: user?.email || 'customer01@gmail.com',
    customer_phone: user?.phone || '+91 98765 11111',
    issue_type: 'Wrong Product Received',
    product_name: 'Dove Soap',
    expected_product: 'Dove Soap',
    received_product: 'Lux Soap',
    expected_quantity: 2,
    received_quantity: 2,
    description: 'Purchased 2 packs of Dove Soap, but found 2 packs of Lux Soap inside the shopping bag.',
    image_url: ''
  });
  const [uploadedImagePreview, setUploadedImagePreview] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [submittedComplaintResult, setSubmittedComplaintResult] = useState(null);

  // Track Complaint state
  const [trackId, setTrackId] = useState(searchParams.get('track') || 'CMP-B1025-01');
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [customerFeedback, setCustomerFeedback] = useState('Satisfied with product replacement. Everything is in order.');
  const [closingComplaint, setClosingComplaint] = useState(false);

  // Lists
  const [myBills, setMyBills] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);

  // Profile forms
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Load customer bills & complaints
  const loadCustomerData = async () => {
    try {
      const cName = user?.full_name || 'Customer 01';
      const cEmail = user?.email || 'customer01@gmail.com';

      const [billsRes, complaintsRes] = await Promise.all([
        axios.get(`${API_BASE}/bills/customer/${encodeURIComponent(cName)}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/complaints?customer=${encodeURIComponent(cName)}`).catch(() => ({ data: [] }))
      ]);

      const bills = billsRes.data || [];
      const complaints = complaintsRes.data || [];

      setMyBills(bills);
      setMyComplaints(complaints);

      const verified = bills.filter(b => b.is_verified).length;
      const resolved = complaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;
      const pending = complaints.length - resolved;

      setStats({
        totalBills: bills.length,
        verifiedBills: verified,
        complaintsRaised: complaints.length,
        resolvedComplaints: resolved,
        pendingComplaints: pending
      });
    } catch (err) {
      console.warn('Error fetching customer data:', err);
    }
  };

  useEffect(() => {
    loadCustomerData();
    if (searchParams.get('bill')) {
      handleLoadAndVerify(searchParams.get('bill'));
    }
    if (searchParams.get('track')) {
      fetchTrackComplaint(searchParams.get('track'));
    }
  }, [user]);

  // Live socket updates
  useEffect(() => {
    if (!socket) return;
    socket.on('new_complaint', loadCustomerData);
    socket.on('complaint_updated', (data) => {
      loadCustomerData();
      if (trackedComplaint && trackedComplaint.complaint_no === data.complaint_no) {
        fetchTrackComplaint(data.complaint_no);
      }
    });
    return () => {
      socket.off('new_complaint');
      socket.off('complaint_updated');
    };
  }, [socket, trackedComplaint]);

  // BILL VERIFICATION LOGIC
  const handleLoadAndVerify = async (bNo) => {
    const billToFetch = bNo || verifyBillNo;
    if (!billToFetch) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const [billRes, verifyRes] = await Promise.all([
        axios.get(`${API_BASE}/bills/${billToFetch}`, { timeout: 3000 }),
        axios.post(`${API_BASE}/bills/${billToFetch}/verify`, {}, { timeout: 3000 })
      ]);
      setBillData(billRes.data);
      setVerifyResult(verifyRes.data);
      loadCustomerData();
    } catch (err) {
      // Demo fallback when running on static hosts like GitHub Pages
      if (billToFetch.toUpperCase() === 'B1025') {
        const demoB1025 = {
          bill_no: 'B1025',
          customer_name: 'Customer 01',
          cashier: 'Priya',
          counter: 2,
          total_amount: 295.00,
          matched: false,
          mismatches: [
            { product: 'Dove Soap', expected: 2, received: 0, discrepancy_type: "Wrong Product: Expected 'Dove Soap', got 'Lux Soap'" },
            { product: 'Lux Soap', expected: 0, received: 2, discrepancy_type: "Wrong Product: Expected 'Dove Soap', got 'Lux Soap'" }
          ],
          bill_items: [
            { product_name: 'Dove Soap', quantity: 2, unit_price: 55.00, total_price: 110.00 },
            { product_name: "Kellogg's Corn Flakes", quantity: 1, unit_price: 185.00, total_price: 185.00 }
          ],
          received_items: [
            { product_name: 'Lux Soap', quantity: 2 },
            { product_name: "Kellogg's Corn Flakes", quantity: 1 }
          ]
        };
        setBillData(demoB1025);
        setVerifyResult(demoB1025);
      } else if (billToFetch.toUpperCase() === 'B1026') {
        const demoB1026 = {
          bill_no: 'B1026',
          customer_name: 'Arun Kumar',
          cashier: 'Rahul',
          counter: 1,
          total_amount: 578.00,
          matched: false,
          mismatches: [
            { product: 'Amul Butter 500g', expected: 2, received: 1, discrepancy_type: 'Quantity Mismatch (Shortage of 1 unit)' }
          ],
          bill_items: [
            { product_name: 'Amul Butter 500g', quantity: 2, unit_price: 275.00, total_price: 550.00 },
            { product_name: 'Tata Salt 1kg', quantity: 1, unit_price: 28.00, total_price: 28.00 }
          ],
          received_items: [
            { product_name: 'Amul Butter 500g', quantity: 1 },
            { product_name: 'Tata Salt 1kg', quantity: 1 }
          ]
        };
        setBillData(demoB1026);
        setVerifyResult(demoB1026);
      } else if (billToFetch.toUpperCase() === 'B1027') {
        const demoB1027 = {
          bill_no: 'B1027',
          customer_name: 'Customer 01',
          cashier: 'Priya',
          counter: 2,
          total_amount: 345.00,
          matched: true,
          mismatches: [],
          bill_items: [
            { product_name: 'Tropicana Orange Juice 1L', quantity: 2, unit_price: 120.00, total_price: 240.00 },
            { product_name: 'Britannia Good Day Cookies', quantity: 3, unit_price: 35.00, total_price: 105.00 }
          ],
          received_items: [
            { product_name: 'Tropicana Orange Juice 1L', quantity: 2 },
            { product_name: 'Britannia Good Day Cookies', quantity: 3 }
          ]
        };
        setBillData(demoB1027);
        setVerifyResult(demoB1027);
      } else {
        setVerifyResult({
          error: `Bill '${billToFetch}' not found in supermarket database.`
        });
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const handlePreFillComplaint = () => {
    if (!billData) return;
    let prod = 'Dove Soap';
    let expProd = 'Dove Soap';
    let recProd = 'Lux Soap';
    let expQty = 2;
    let recQty = 2;

    if (verifyResult?.mismatches?.length > 0) {
      const m = verifyResult.mismatches[0];
      prod = m.product;
      expProd = m.product;
      recProd = m.discrepancy_type.includes('Wrong Product') ? 'Received Substitute' : m.product;
      expQty = m.expected;
      recQty = m.received;
    }

    setComplaintForm(prev => ({
      ...prev,
      bill_no: billData.bill_no,
      customer_name: user?.full_name || billData.customer_name,
      product_name: prod,
      expected_product: expProd,
      received_product: recProd,
      expected_quantity: expQty,
      received_quantity: recQty,
      description: `Discrepancy detected during verification of bill ${billData.bill_no}: expected ${expProd} (qty ${expQty}), received ${recProd} (qty ${recQty}).`
    }));
    setActiveTab('raise');
  };

  // IMAGE UPLOAD
  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedImagePreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`${API_BASE}/upload`, fd);
      setComplaintForm(prev => ({ ...prev, image_url: res.data.url }));
    } catch (err) {
      alert('Photo upload failed. You can still submit the complaint text.');
    }
  };

  // SUBMIT COMPLAINT
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setSubmittingComplaint(true);
    setSubmittedComplaintResult(null);

    try {
      const res = await axios.post(`${API_BASE}/complaints`, complaintForm);
      setSubmittedComplaintResult(res.data);
      loadCustomerData();
      setTrackId(res.data.complaint_no);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit complaint.');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // TRACK COMPLAINT
  const fetchTrackComplaint = async (cNo) => {
    const targetNo = cNo || trackId;
    if (!targetNo) return;
    setTrackLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/complaints/${encodeURIComponent(targetNo.trim())}`);
      setTrackedComplaint(res.data);
    } catch (err) {
      setTrackedComplaint({ notFound: true, query: targetNo });
    } finally {
      setTrackLoading(false);
    }
  };

  // CONFIRM RESOLUTION & CLOSE
  const handleConfirmResolution = async () => {
    if (!trackedComplaint) return;
    setClosingComplaint(true);
    try {
      await axios.post(`${API_BASE}/complaints/${trackedComplaint.complaint_no}/confirm`, {
        feedback: customerFeedback,
        customer_name: user?.full_name || 'Customer'
      });
      fetchTrackComplaint(trackedComplaint.complaint_no);
      loadCustomerData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to confirm resolution.');
    } finally {
      setClosingComplaint(false);
    }
  };

  // PROFILE UPDATES
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await axios.put(`${API_BASE}/auth/profile`, {
        full_name: profileName,
        phone: profilePhone
      });
      updateProfile({ full_name: profileName, phone: profilePhone });
      setProfileMsg('Profile updated successfully!');
    } catch (err) {
      setProfileMsg('Failed to update profile.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    try {
      await axios.put(`${API_BASE}/auth/change-password`, {
        current_password: currPassword,
        new_password: newPassword
      });
      setPasswordMsg('Password changed successfully!');
      setCurrPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg(err.response?.data?.error || 'Password update failed.');
    }
  };

  return (
    <div className="dashboard-layout">
      <Navbar />

      <div className="dashboard-main-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role="Customer" />

        <main className="dashboard-content-area">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Customer Grievance & Verification Portal</h1>
                  <p className="portal-subtitle">Welcome back, {user?.full_name || 'Customer'}. Verify your grocery purchases and track dispute resolutions in real time.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" onClick={loadCustomerData}>
                    <RefreshCw size={15} /> Refresh
                  </button>
                  <button className="btn btn-primary" onClick={() => setActiveTab('verify')}>
                    <QrCode size={16} /> Verify New Bill
                  </button>
                </div>
              </div>

              {/* 5 WIDGETS */}
              <div className="metric-cards-grid">
                <div className="metric-card bg-navy-accent">
                  <div className="metric-icon"><FileText size={22} color="#2563EB" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Total Bills</span>
                    <strong className="metric-value">{stats.totalBills}</strong>
                    <span className="metric-subtext">Shopping receipts on file</span>
                  </div>
                </div>

                <div className="metric-card bg-emerald-accent">
                  <div className="metric-icon"><CheckCircle size={22} color="#059669" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Verified Bills</span>
                    <strong className="metric-value">{stats.verifiedBills}</strong>
                    <span className="metric-subtext">Scanned & matched</span>
                  </div>
                </div>

                <div className="metric-card bg-purple-accent">
                  <div className="metric-icon"><AlertTriangle size={22} color="#7C3AED" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Complaints Raised</span>
                    <strong className="metric-value">{stats.complaintsRaised}</strong>
                    <span className="metric-subtext">Total tickets filed</span>
                  </div>
                </div>

                <div className="metric-card bg-sky-accent">
                  <div className="metric-icon"><ShieldCheck size={22} color="#0284C7" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Resolved Complaints</span>
                    <strong className="metric-value">{stats.resolvedComplaints}</strong>
                    <span className="metric-subtext">Replacements/refunds completed</span>
                  </div>
                </div>

                <div className="metric-card bg-amber-accent">
                  <div className="metric-icon"><Clock size={22} color="#D97706" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Pending Complaints</span>
                    <strong className="metric-value">{stats.pendingComplaints}</strong>
                    <span className="metric-subtext">In review or investigation</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Demo Banner */}
              <div className="action-highlight-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="highlight-icon-box">
                    <QrCode size={28} color="#2563EB" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', color: '#0F172A' }}>
                      Try Demo Bill B1025 (Dove Soap vs Lux Soap Detection)
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                      Bill B1025 illustrates an automatic wrong-product discrepancy: 2 Dove Soaps billed, but 2 Lux Soaps received in bag.
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setVerifyBillNo('B1025');
                    setActiveTab('verify');
                    handleLoadAndVerify('B1025');
                  }}
                >
                  Launch Demo Verification
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Recent Bills & Complaints Grid */}
              <div className="dashboard-split-grid">
                {/* Left: My Bills */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><ShoppingBag size={18} color="#2563EB" /> My Recent Bills</h3>
                    <button className="text-btn" onClick={() => setActiveTab('verify')}>Verify Bill</button>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Bill No</th>
                          <th>Counter & Cashier</th>
                          <th>Total (₹)</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myBills.length === 0 ? (
                          <tr><td colSpan="5" className="table-empty">No bills recorded for this account.</td></tr>
                        ) : (
                          myBills.map(b => (
                            <tr key={b.id}>
                              <td><strong>{b.bill_no}</strong></td>
                              <td>Counter {b.counter_no} ({b.cashier_name})</td>
                              <td>₹{parseFloat(b.total_amount).toFixed(2)}</td>
                              <td>
                                <span className={`badge-pill ${b.is_verified ? 'badge-good' : 'badge-warn'}`}>
                                  {b.verification_status || (b.is_verified ? 'Verified' : 'Pending')}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn-sm btn-outline"
                                  onClick={() => {
                                    setVerifyBillNo(b.bill_no);
                                    setActiveTab('verify');
                                    handleLoadAndVerify(b.bill_no);
                                  }}
                                >
                                  Verify
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: My Complaints */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><AlertTriangle size={18} color="#D97706" /> My Filed Complaints</h3>
                    <button className="text-btn" onClick={() => setActiveTab('raise')}>Raise New</button>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Complaint ID</th>
                          <th>Issue Type</th>
                          <th>Assigned Cashier</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myComplaints.length === 0 ? (
                          <tr><td colSpan="5" className="table-empty">No complaints filed yet.</td></tr>
                        ) : (
                          myComplaints.map(c => (
                            <tr key={c.id}>
                              <td><strong>{c.complaint_no}</strong></td>
                              <td>{c.issue_type}</td>
                              <td>{c.assigned_cashier_name || 'Pending'}</td>
                              <td><StatusBadge status={c.status} /></td>
                              <td>
                                <button
                                  className="btn-sm btn-primary"
                                  onClick={() => {
                                    setTrackId(c.complaint_no);
                                    setActiveTab('track');
                                    fetchTrackComplaint(c.complaint_no);
                                  }}
                                >
                                  Track
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VERIFY BILL */}
          {activeTab === 'verify' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Supermarket Bill & Cart Verification</h1>
                  <p className="portal-subtitle">Cross-reference billed products with physical items packed in your shopping bag.</p>
                </div>
                <button className="btn btn-outline" onClick={() => setScannerOpen(true)}>
                  <Camera size={16} /> Scan Bill QR Code
                </button>
              </div>

              {/* Bill Input Form */}
              <div className="verification-search-box">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLoadAndVerify();
                  }}
                  className="verify-form"
                >
                  <div className="form-group-inline">
                    <label>Enter Bill Number:</label>
                    <input
                      type="text"
                      value={verifyBillNo}
                      onChange={(e) => setVerifyBillNo(e.target.value.toUpperCase())}
                      placeholder="e.g. B1025"
                      className="form-input"
                      style={{ maxWidth: '280px' }}
                    />
                  </div>
                  <button type="submit" disabled={verifyLoading} className="btn btn-primary">
                    {verifyLoading ? 'Verifying...' : 'Retrieve & Verify Bill'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setScannerOpen(true)}
                  >
                    <QrCode size={16} /> Scan QR
                  </button>
                </form>

                {/* Demo Quick Buttons */}
                <div className="demo-shortcuts">
                  <span className="demo-shortcuts-label">Try Demo Bills:</span>
                  <button
                    className="demo-shortcut-btn"
                    onClick={() => {
                      setVerifyBillNo('B1025');
                      handleLoadAndVerify('B1025');
                    }}
                  >
                    B1025 (Wrong Product Demo)
                  </button>
                  <button
                    className="demo-shortcut-btn"
                    onClick={() => {
                      setVerifyBillNo('B1026');
                      handleLoadAndVerify('B1026');
                    }}
                  >
                    B1026 (Quantity Mismatch Demo)
                  </button>
                  <button
                    className="demo-shortcut-btn"
                    onClick={() => {
                      setVerifyBillNo('B1027');
                      handleLoadAndVerify('B1027');
                    }}
                  >
                    B1027 (Verified Bill Demo)
                  </button>
                </div>
              </div>

              {/* Verification Results View */}
              {verifyResult && (
                <div style={{ marginTop: '1.5rem' }}>
                  {verifyResult.error ? (
                    <div className="alert-box alert-error">
                      <AlertTriangle size={20} />
                      <div>
                        <strong>Verification Error:</strong> {verifyResult.error}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Status Banner */}
                      <div className={`verification-banner ${verifyResult.matched ? 'banner-matched' : 'banner-mismatched'}`}>
                        <div className="banner-icon">
                          {verifyResult.matched ? (
                            <CheckCircle2 size={36} color="#059669" />
                          ) : (
                            <XCircle size={36} color="#DC2626" />
                          )}
                        </div>
                        <div className="banner-content">
                          <h2 className="banner-title">
                            {verifyResult.matched
                              ? 'Bill Verification Successful: 100% Match'
                              : 'Discrepancy Detected Between Bill and Physical Items!'}
                          </h2>
                          <p className="banner-desc">
                            {verifyResult.matched
                              ? 'All physical items in the shopping bag correspond perfectly with the scanned invoice.'
                              : `System detected ${verifyResult.mismatches.length} item variance(s). Responsible Cashier: ${verifyResult.cashier} (Counter #${verifyResult.counter}).`}
                          </p>

                          {!verifyResult.matched && (
                            <div style={{ marginTop: '1rem' }}>
                              <button
                                className="btn btn-danger-action"
                                onClick={handlePreFillComplaint}
                              >
                                <AlertTriangle size={16} />
                                Raise Automated Complaint For This Bill
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Discrepancies Table (if any) */}
                      {!verifyResult.matched && verifyResult.mismatches.length > 0 && (
                        <div className="panel-card" style={{ marginTop: '1.5rem', border: '1px solid #FECACA' }}>
                          <div className="panel-header" style={{ backgroundColor: '#FEF2F2' }}>
                            <h3 className="panel-title" style={{ color: '#991B1B' }}>
                              <AlertTriangle size={18} color="#DC2626" />
                              Detected Item Discrepancies
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#B91C1C', fontWeight: '600' }}>
                              Action: Auto-routes to Cashier {verifyResult.cashier}
                            </span>
                          </div>
                          <div className="table-responsive">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Item Name</th>
                                  <th>Expected (Billed)</th>
                                  <th>Received (Physical Bag)</th>
                                  <th>Discrepancy Category</th>
                                  <th>Resolution Option</th>
                                </tr>
                              </thead>
                              <tbody>
                                {verifyResult.mismatches.map((m, idx) => (
                                  <tr key={idx} style={{ backgroundColor: '#FFF5F5' }}>
                                    <td><strong>{m.product}</strong></td>
                                    <td><span className="qty-tag expected-qty">{m.expected} units</span></td>
                                    <td><span className="qty-tag received-qty">{m.received} units</span></td>
                                    <td>
                                      <span className="discrepancy-pill">
                                        {m.discrepancy_type}
                                      </span>
                                    </td>
                                    <td>
                                      <span style={{ fontSize: '0.8rem', color: '#2563EB', fontWeight: '600' }}>
                                        Product Replacement / Refund
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Side by side comparison: Billed vs Received */}
                      <div className="dashboard-split-grid" style={{ marginTop: '1.5rem' }}>
                        {/* Billed Items */}
                        <div className="panel-card">
                          <div className="panel-header">
                            <h3 className="panel-title">
                              <FileText size={18} color="#2563EB" />
                              Official Invoice Items (Bill #{verifyResult.bill_no})
                            </h3>
                            <span className="bill-total-tag">
                              Total: ₹{parseFloat(verifyResult.total_amount).toFixed(2)}
                            </span>
                          </div>
                          <div className="table-responsive">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th>Qty</th>
                                  <th>Unit Price</th>
                                  <th>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {verifyResult.bill_items?.map((it, idx) => (
                                  <tr key={idx}>
                                    <td><strong>{it.product_name}</strong></td>
                                    <td>{it.quantity}</td>
                                    <td>₹{parseFloat(it.unit_price).toFixed(2)}</td>
                                    <td>₹{parseFloat(it.total_price).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Received Items */}
                        <div className="panel-card">
                          <div className="panel-header">
                            <h3 className="panel-title">
                              <ShoppingBag size={18} color="#059669" />
                              Physical Items Inside Bag
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                              Scanned at Checkout
                            </span>
                          </div>
                          <div className="table-responsive">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th>Physical Qty</th>
                                  <th>Match Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {verifyResult.received_items?.map((it, idx) => {
                                  const matchingBillItem = verifyResult.bill_items?.find(
                                    b => b.product_name.toLowerCase() === it.product_name.toLowerCase()
                                  );
                                  const isMatched = matchingBillItem && matchingBillItem.quantity === it.quantity;
                                  return (
                                    <tr key={idx}>
                                      <td><strong>{it.product_name}</strong></td>
                                      <td>{it.quantity} units</td>
                                      <td>
                                        <span className={`badge-pill ${isMatched ? 'badge-good' : 'badge-bad'}`}>
                                          {isMatched ? 'Matched' : 'Discrepant'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Official QR Code Box */}
                      <div className="panel-card" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <div className="panel-header" style={{ justifyContent: 'center' }}>
                          <h3 className="panel-title">Official Supermarket Invoice QR Code</h3>
                        </div>
                        <div style={{ padding: '1rem' }}>
                          <img
                            src={`${API_BASE}/bills/${verifyResult.bill_no}/qr`}
                            alt="Bill QR"
                            style={{ width: '150px', height: '150px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px' }}
                          />
                          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '8px' }}>
                            Scan this QR code with any mobile device to pull up verification details.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAISE COMPLAINT */}
          {activeTab === 'raise' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Raise Supermarket Grievance</h1>
                  <p className="portal-subtitle">
                    System will automatically identify the responsible cashier and initiate replacement or refund investigation.
                  </p>
                </div>
              </div>

              {submittedComplaintResult ? (
                <div className="panel-card" style={{ maxWidth: '650px', margin: '2rem auto', textAlign: 'center', padding: '2.5rem' }}>
                  <div className="success-icon-circle">
                    <CheckCircle2 size={46} color="#059669" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', color: '#0F172A', margin: '1rem 0 0.5rem' }}>
                    Complaint Successfully Registered!
                  </h2>
                  <div className="complaint-id-box">
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Assigned Ticket ID:</span>
                    <strong style={{ fontSize: '1.4rem', color: '#1E3A8A', display: 'block', letterSpacing: '1px' }}>
                      {submittedComplaintResult.complaint_no}
                    </strong>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.95rem', margin: '1rem 0 1.5rem', lineHeight: '1.5' }}>
                    {submittedComplaintResult.message}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setTrackId(submittedComplaintResult.complaint_no);
                        setActiveTab('track');
                        fetchTrackComplaint(submittedComplaintResult.complaint_no);
                      }}
                    >
                      Track This Complaint Live
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setSubmittedComplaintResult(null);
                        setComplaintForm(prev => ({ ...prev, description: '' }));
                      }}
                    >
                      File Another Complaint
                    </button>
                  </div>
                </div>
              ) : (
                <div className="panel-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                  <div className="panel-header">
                    <h3 className="panel-title"><AlertTriangle size={18} color="#2563EB" /> Grievance Submission Form</h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Fields marked with * are required</span>
                  </div>

                  <form onSubmit={handleSubmitComplaint} style={{ padding: '1.5rem' }}>
                    <div className="form-row-2col">
                      <div className="form-group">
                        <label>Bill Number *</label>
                        <input
                          type="text"
                          required
                          value={complaintForm.bill_no}
                          onChange={(e) => setComplaintForm({ ...complaintForm, bill_no: e.target.value.toUpperCase() })}
                          className="form-input"
                          placeholder="e.g. B1025"
                        />
                      </div>
                      <div className="form-group">
                        <label>Customer Name *</label>
                        <input
                          type="text"
                          required
                          value={complaintForm.customer_name}
                          onChange={(e) => setComplaintForm({ ...complaintForm, customer_name: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-row-2col">
                      <div className="form-group">
                        <label>Complaint Type *</label>
                        <select
                          value={complaintForm.issue_type}
                          onChange={(e) => setComplaintForm({ ...complaintForm, issue_type: e.target.value })}
                          className="form-select"
                        >
                          <option value="Wrong Product Received">Wrong Product Received (Substitute placed in bag)</option>
                          <option value="Quantity Mismatch">Quantity Mismatch (Less items than billed)</option>
                          <option value="Missing Product">Missing Product (Billed but not in bag)</option>
                          <option value="Extra Product">Extra Product (Received unbilled goods)</option>
                          <option value="Billing Amount Error">Billing Amount / Price Discrepancy</option>
                          <option value="Damaged / Expired Product">Damaged or Expired Item</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Product Name *</label>
                        <input
                          type="text"
                          required
                          value={complaintForm.product_name}
                          onChange={(e) => setComplaintForm({ ...complaintForm, product_name: e.target.value })}
                          className="form-input"
                          placeholder="e.g. Dove Soap"
                        />
                      </div>
                    </div>

                    <div className="form-row-2col">
                      <div className="form-group">
                        <label>Expected Product (on Bill)</label>
                        <input
                          type="text"
                          value={complaintForm.expected_product}
                          onChange={(e) => setComplaintForm({ ...complaintForm, expected_product: e.target.value })}
                          className="form-input"
                          placeholder="e.g. Dove Soap"
                        />
                      </div>
                      <div className="form-group">
                        <label>Received Product (in Bag)</label>
                        <input
                          type="text"
                          value={complaintForm.received_product}
                          onChange={(e) => setComplaintForm({ ...complaintForm, received_product: e.target.value })}
                          className="form-input"
                          placeholder="e.g. Lux Soap"
                        />
                      </div>
                    </div>

                    <div className="form-row-2col">
                      <div className="form-group">
                        <label>Expected Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={complaintForm.expected_quantity}
                          onChange={(e) => setComplaintForm({ ...complaintForm, expected_quantity: parseInt(e.target.value) || 1 })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Received Quantity</label>
                        <input
                          type="number"
                          min="0"
                          value={complaintForm.received_quantity}
                          onChange={(e) => setComplaintForm({ ...complaintForm, received_quantity: parseInt(e.target.value) || 0 })}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Detailed Description *</label>
                      <textarea
                        required
                        rows="3"
                        value={complaintForm.description}
                        onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                        className="form-textarea"
                        placeholder="Explain the discrepancy observed upon checking your receipt and shopping bag..."
                      />
                    </div>

                    {/* Image Upload */}
                    <div className="form-group">
                      <label>Optional Product Photo / Evidence Upload</label>
                      <div className="image-upload-dropzone">
                        <Upload size={22} color="#64748B" />
                        <span style={{ fontSize: '0.85rem', color: '#475569', margin: '4px 0' }}>
                          Upload photo of receipt or wrong item
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          style={{ fontSize: '0.8rem' }}
                        />
                      </div>
                      {uploadedImagePreview && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Preview:</span>
                          <img
                            src={uploadedImagePreview}
                            alt="Preview"
                            style={{ display: 'block', maxHeight: '100px', borderRadius: '6px', marginTop: '4px' }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="security-notice-box" style={{ margin: '1.25rem 0' }}>
                      <ShieldCheck size={16} color="#059669" />
                      <span>
                        Automatic Cashier Assignment: Our system will look up the bill in MySQL and route this grievance directly to the assigned cashier.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingComplaint}
                      className="btn btn-primary btn-block"
                      style={{ padding: '0.85rem' }}
                    >
                      {submittingComplaint ? 'Submitting & Routing to Cashier...' : 'Submit Grievance & Generate Ticket'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRACK COMPLAINT */}
          {activeTab === 'track' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Live Grievance Tracking</h1>
                  <p className="portal-subtitle">Follow your complaint progress across the 8-stage resolution lifecycle.</p>
                </div>
              </div>

              {/* Search Box */}
              <div className="verification-search-box">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchTrackComplaint();
                  }}
                  className="verify-form"
                >
                  <div className="form-group-inline">
                    <label>Enter Complaint ID:</label>
                    <input
                      type="text"
                      value={trackId}
                      onChange={(e) => setTrackId(e.target.value.toUpperCase())}
                      placeholder="e.g. CMP-B1025-01"
                      className="form-input"
                      style={{ maxWidth: '300px' }}
                    />
                  </div>
                  <button type="submit" disabled={trackLoading} className="btn btn-primary">
                    <Search size={16} />
                    {trackLoading ? 'Tracking...' : 'Track Ticket'}
                  </button>
                </form>

                {/* Quick My Complaints Chips */}
                {myComplaints.length > 0 && (
                  <div className="demo-shortcuts">
                    <span className="demo-shortcuts-label">Your Complaints:</span>
                    {myComplaints.slice(0, 4).map(c => (
                      <button
                        key={c.id}
                        className="demo-shortcut-btn"
                        onClick={() => {
                          setTrackId(c.complaint_no);
                          fetchTrackComplaint(c.complaint_no);
                        }}
                      >
                        {c.complaint_no} ({c.status})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tracked View */}
              {trackedComplaint && (
                <div style={{ marginTop: '1.5rem' }}>
                  {trackedComplaint.notFound ? (
                    <div className="alert-box alert-error">
                      <AlertTriangle size={20} />
                      <div>
                        Complaint ID <strong>'{trackedComplaint.query}'</strong> was not found in our database.
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Complaint Header Card */}
                      <div className="panel-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="panel-header">
                          <div>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Complaint Tracking Details</span>
                            <h2 style={{ margin: '2px 0 0', fontSize: '1.3rem', color: '#0F172A' }}>
                              {trackedComplaint.complaint_no}
                            </h2>
                          </div>
                          <StatusBadge status={trackedComplaint.status} />
                        </div>

                        <div className="meta-info-grid">
                          <div className="meta-cell">
                            <span className="meta-lbl">Bill Reference</span>
                            <strong className="meta-val">{trackedComplaint.bill_no}</strong>
                          </div>
                          <div className="meta-cell">
                            <span className="meta-lbl">Customer</span>
                            <strong className="meta-val">{trackedComplaint.customer_name}</strong>
                          </div>
                          <div className="meta-cell">
                            <span className="meta-lbl">Assigned Cashier</span>
                            <strong className="meta-val">{trackedComplaint.assigned_cashier_name || 'Pending Assignment'}</strong>
                          </div>
                          <div className="meta-cell">
                            <span className="meta-lbl">Counter Number</span>
                            <strong className="meta-val">Counter #{trackedComplaint.counter_no || '2'}</strong>
                          </div>
                          <div className="meta-cell">
                            <span className="meta-lbl">Issue Type</span>
                            <strong className="meta-val">{trackedComplaint.issue_type}</strong>
                          </div>
                          <div className="meta-cell">
                            <span className="meta-lbl">Approved Resolution</span>
                            <strong className="meta-val" style={{ color: '#059669' }}>
                              {trackedComplaint.approved_resolution || trackedComplaint.recommended_resolution || 'Under Investigation'}
                            </strong>
                          </div>
                        </div>

                        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Customer Reported Description:</span>
                          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#1E293B' }}>
                            {trackedComplaint.description}
                          </p>
                        </div>
                      </div>

                      {/* 8-STEP PROGRESS STEPPER */}
                      <div className="panel-card" style={{ marginBottom: '1.5rem' }}>
                        <div className="panel-header">
                          <h3 className="panel-title">Lifecycle Resolution Progress (8 Steps)</h3>
                        </div>
                        <div className="stepper-container">
                          {STEPS.map((step, idx) => {
                            const currentIdx = STEPS.indexOf(trackedComplaint.status);
                            const isCompleted = idx < currentIdx;
                            const isCurrent = idx === currentIdx;

                            return (
                              <div
                                key={step}
                                className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                              >
                                <div className="step-node">
                                  {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                                </div>
                                <span className="step-name">{step}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Customer Resolution Confirmation Box */}
                      {['Resolution Offered', 'Resolved'].includes(trackedComplaint.status) && (
                        <div className="resolution-confirmation-card">
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <ShieldCheck size={32} color="#059669" />
                            <div>
                              <h3 style={{ margin: '0 0 4px', color: '#065F46' }}>
                                Resolution Approved: {trackedComplaint.approved_resolution || 'Product Replacement'}
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857' }}>
                                Supermarket management has authorized this resolution. Please confirm acceptance to conclude and close this ticket.
                              </p>
                            </div>
                          </div>
                          <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#065F46', marginBottom: '4px' }}>
                              Customer Feedback / Remarks:
                            </label>
                            <input
                              type="text"
                              value={customerFeedback}
                              onChange={(e) => setCustomerFeedback(e.target.value)}
                              className="form-input"
                              style={{ borderColor: '#A7F3D0', backgroundColor: '#FFFFFF' }}
                            />
                            <button
                              className="btn btn-emerald"
                              style={{ marginTop: '10px' }}
                              onClick={handleConfirmResolution}
                              disabled={closingComplaint}
                            >
                              {closingComplaint ? 'Closing Ticket...' : 'Confirm Resolution & Close Complaint'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Audit Trail & Investigation Notes */}
                      <div className="panel-card">
                        <div className="panel-header">
                          <h3 className="panel-title">Complaint Audit Trail & Timeline</h3>
                          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Real-time database timestamps</span>
                        </div>
                        <div style={{ padding: '1rem 1.5rem' }}>
                          <AuditTimeline
                            history={trackedComplaint.history || []}
                            notes={trackedComplaint.notes || []}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MY PROFILE */}
          {activeTab === 'profile' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Customer Profile & Account Details</h1>
                  <p className="portal-subtitle">Manage your personal credentials, contact numbers, and view complete billing archives.</p>
                </div>
              </div>

              <div className="dashboard-split-grid">
                {/* Personal Information */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><User size={18} color="#2563EB" /> Customer Details</h3>
                    <span className="badge-pill badge-good">{user?.membership_tier || 'Gold'} Member</span>
                  </div>

                  {profileMsg && (
                    <div className="alert-box alert-success" style={{ margin: '1rem' }}>
                      <CheckCircle2 size={16} /> <span>{profileMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} style={{ padding: '1.5rem' }}>
                    <div className="form-group">
                      <label>Customer Account Code</label>
                      <input
                        type="text"
                        disabled
                        value={user?.customer_code || 'CUST-001'}
                        className="form-input disabled-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address (Primary)</label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="form-input disabled-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Mobile Number</label>
                      <input
                        type="tel"
                        required
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <button type="submit" className="btn btn-primary">
                      Save Profile Changes
                    </button>
                  </form>
                </div>

                {/* Password Change */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><Lock size={18} color="#2563EB" /> Security & Password</h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Werkzeug Scrypt Hash</span>
                  </div>

                  {passwordMsg && (
                    <div className={`alert-box ${passwordMsg.includes('success') ? 'alert-success' : 'alert-error'}`} style={{ margin: '1rem' }}>
                      <span>{passwordMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} style={{ padding: '1.5rem' }}>
                    <div className="form-group">
                      <label>Current Password</label>
                      <input
                        type="password"
                        required
                        value={currPassword}
                        onChange={(e) => setCurrPassword(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>New Password (Min 6 characters)</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <button type="submit" className="btn btn-outline">
                      Update Secure Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(code) => {
          setVerifyBillNo(code);
          setActiveTab('verify');
          handleLoadAndVerify(code);
        }}
      />
    </div>
  );
}
