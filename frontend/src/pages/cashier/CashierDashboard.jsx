import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ClipboardList,
  ShieldCheck,
  FileCheck2,
  User,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  ArrowRight,
  Store,
  Tag,
  Lock,
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import StatusBadge from '../../components/StatusBadge';
import AuditTimeline from '../../components/AuditTimeline';

export default function CashierDashboard() {
  const { user, API_BASE } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);

  // Investigation Modal / Panel
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [investigationNote, setInvestigationNote] = useState('');
  const [recommendedResolution, setRecommendedResolution] = useState('Product Replacement');
  const [submittingInvestigation, setSubmittingInvestigation] = useState(false);

  const cashierName = user?.cashier_name || user?.full_name?.split(' ')[0] || 'Priya';
  const counterNo = user?.counter_no || 2;

  const loadCashierComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/complaints?cashier=${encodeURIComponent(cashierName)}`);
      setComplaints(res.data);
    } catch (err) {
      console.warn('Failed to load cashier complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashierComplaints();
  }, [user]);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    socket.on('new_complaint', loadCashierComplaints);
    socket.on('complaint_updated', loadCashierComplaints);
    return () => {
      socket.off('new_complaint');
      socket.off('complaint_updated');
    };
  }, [socket]);

  // Open investigation
  const handleOpenInvestigation = async (complaintNo) => {
    try {
      const res = await axios.get(`${API_BASE}/complaints/${complaintNo}`);
      setSelectedComplaint(res.data);
      setInvestigationNote(
        `Verified physical scan at Counter #${counterNo}. Customer was billed for ${res.data.expected_product || res.data.product_name}, but ${res.data.received_product || 'alternative item'} was packed into the delivery bag. Recommend immediate replacement.`
      );
      setRecommendedResolution(res.data.recommended_resolution || 'Product Replacement');
      setActiveTab('investigation');
    } catch (err) {
      alert('Failed to load complaint details.');
    }
  };

  // Submit Investigation & Recommend Resolution
  const handleSubmitInvestigation = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setSubmittingInvestigation(true);
    try {
      await axios.post(`${API_BASE}/cashier/investigate/${selectedComplaint.complaint_no}`, {
        note: investigationNote,
        recommended_resolution: recommendedResolution,
        cashier_name: cashierName
      });
      alert(`Investigation submitted for ${selectedComplaint.complaint_no}. Sent to Store Manager for Approval.`);
      setSelectedComplaint(null);
      loadCashierComplaints();
      setActiveTab('assigned');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit investigation note.');
    } finally {
      setSubmittingInvestigation(false);
    }
  };

  // Stats calculation
  const totalAssigned = complaints.length;
  const inInvestigation = complaints.filter(c => ['Assigned to Cashier', 'Investigation in Progress'].includes(c.status)).length;
  const awaitingApproval = complaints.filter(c => c.status === 'Awaiting Manager Approval').length;
  const resolved = complaints.filter(c => ['Resolution Offered', 'Resolved', 'Closed'].includes(c.status)).length;

  return (
    <div className="dashboard-layout">
      <Navbar />

      <div className="dashboard-main-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role="Cashier" />

        <main className="dashboard-content-area">
          {/* TAB 1: CASHIER DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Cashier Grievance & Investigation Desk</h1>
                  <p className="portal-subtitle">
                    Signed in as <strong>{cashierName}</strong> · Assigned to <strong>Counter #{counterNo}</strong> (Billing Station).
                  </p>
                </div>
                <button className="btn btn-outline" onClick={loadCashierComplaints}>
                  <RefreshCw size={15} /> Refresh Queue
                </button>
              </div>

              {/* 4 STAT WIDGETS */}
              <div className="metric-cards-grid">
                <div className="metric-card bg-navy-accent">
                  <div className="metric-icon"><ClipboardList size={22} color="#2563EB" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Assigned to Me</span>
                    <strong className="metric-value">{totalAssigned}</strong>
                    <span className="metric-subtext">Total complaints routed</span>
                  </div>
                </div>

                <div className="metric-card bg-amber-accent">
                  <div className="metric-icon"><Clock size={22} color="#D97706" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Pending Investigation</span>
                    <strong className="metric-value">{inInvestigation}</strong>
                    <span className="metric-subtext">Requires POS scan check</span>
                  </div>
                </div>

                <div className="metric-card bg-purple-accent">
                  <div className="metric-icon"><ShieldCheck size={22} color="#7C3AED" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Awaiting Approval</span>
                    <strong className="metric-value">{awaitingApproval}</strong>
                    <span className="metric-subtext">With Store Manager</span>
                  </div>
                </div>

                <div className="metric-card bg-emerald-accent">
                  <div className="metric-icon"><CheckCircle2 size={22} color="#059669" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Resolved by Me</span>
                    <strong className="metric-value">{resolved}</strong>
                    <span className="metric-subtext">Successfully settled</span>
                  </div>
                </div>
              </div>

              {/* Quick Prompt Banner */}
              {inInvestigation > 0 && (
                <div className="action-highlight-banner" style={{ borderLeftColor: '#F59E0B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="highlight-icon-box" style={{ backgroundColor: '#FEF3C7' }}>
                      <AlertTriangle size={28} color="#D97706" />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0F172A' }}>
                        You have {inInvestigation} complaint(s) awaiting your physical verification!
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                        Check POS billing logs at Counter #{counterNo} and submit your recommendation for manager authorization.
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setActiveTab('assigned')}>
                    Open Queue
                  </button>
                </div>
              )}

              {/* Recent Assigned Complaints Table */}
              <div className="panel-card" style={{ marginTop: '1.5rem' }}>
                <div className="panel-header">
                  <h3 className="panel-title"><ClipboardList size={18} color="#2563EB" /> Recent Complaints Assigned to Counter #{counterNo}</h3>
                  <button className="text-btn" onClick={() => setActiveTab('assigned')}>View All</button>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Mismatch Details</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.length === 0 ? (
                        <tr><td colSpan="6" className="table-empty">No active complaints assigned to your counter.</td></tr>
                      ) : (
                        complaints.slice(0, 5).map(c => (
                          <tr key={c.id}>
                            <td><strong>{c.complaint_no}</strong></td>
                            <td>{c.bill_no}</td>
                            <td>{c.customer_name}</td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: '600' }}>
                                {c.issue_type}
                              </span>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                Exp: {c.expected_product || c.product_name} | Rec: {c.received_product || 'Wrong item'}
                              </div>
                            </td>
                            <td><StatusBadge status={c.status} /></td>
                            <td>
                              <button
                                className="btn-sm btn-primary"
                                onClick={() => handleOpenInvestigation(c.complaint_no)}
                              >
                                Investigate
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
          )}

          {/* TAB 2: ASSIGNED COMPLAINTS */}
          {activeTab === 'assigned' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Complaints Assigned to {cashierName}</h1>
                  <p className="portal-subtitle">Review grievances automatically routed to Counter #{counterNo} by the bill verification system.</p>
                </div>
                <button className="btn btn-outline" onClick={loadCashierComplaints}>
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>

              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Complaint ID</th>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Expected Product</th>
                        <th>Received Product</th>
                        <th>Status</th>
                        <th>Recommendation</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.length === 0 ? (
                        <tr><td colSpan="8" className="table-empty">No complaints found.</td></tr>
                      ) : (
                        complaints.map(c => (
                          <tr key={c.id}>
                            <td><strong>{c.complaint_no}</strong></td>
                            <td>{c.bill_no}</td>
                            <td>{c.customer_name}</td>
                            <td><span className="qty-tag expected-qty">{c.expected_product || c.product_name} (x{c.expected_quantity})</span></td>
                            <td><span className="qty-tag received-qty">{c.received_product || 'Substitute'} (x{c.received_quantity})</span></td>
                            <td><StatusBadge status={c.status} /></td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>
                                {c.recommended_resolution || 'Pending Investigation'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-sm btn-primary"
                                onClick={() => handleOpenInvestigation(c.complaint_no)}
                              >
                                Investigate
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
          )}

          {/* TAB 3: INVESTIGATION WORKBENCH */}
          {activeTab === 'investigation' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Cashier Investigation Workbench</h1>
                  <p className="portal-subtitle">
                    Examine barcode discrepancies, add counter findings, and recommend replacement or refund to store manager.
                  </p>
                </div>
              </div>

              {selectedComplaint ? (
                <div className="dashboard-split-grid">
                  {/* Left: Investigation Form */}
                  <div className="panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">
                        <ShieldCheck size={18} color="#2563EB" />
                        Investigation for {selectedComplaint.complaint_no}
                      </h3>
                      <StatusBadge status={selectedComplaint.status} />
                    </div>

                    <form onSubmit={handleSubmitInvestigation} style={{ padding: '1.5rem' }}>
                      <div className="form-group">
                        <label>Customer Statement</label>
                        <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '6px', fontSize: '0.85rem', color: '#334155', border: '1px solid #E2E8F0' }}>
                          "{selectedComplaint.description}"
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Investigation Findings & POS Notes *</label>
                        <textarea
                          required
                          rows="4"
                          value={investigationNote}
                          onChange={(e) => setInvestigationNote(e.target.value)}
                          className="form-textarea"
                          placeholder="Provide details: verified item barcode at counter 2, cashier placed wrong item in bagging area, etc."
                        />
                      </div>

                      <div className="form-group">
                        <label>Cashier Recommended Resolution *</label>
                        <select
                          value={recommendedResolution}
                          onChange={(e) => setRecommendedResolution(e.target.value)}
                          className="form-select"
                        >
                          <option value="Product Replacement">Product Replacement (Immediate exchange at counter)</option>
                          <option value="Refund">Full Refund (Return payment to customer)</option>
                          <option value="Home Delivery">Home Delivery (Dispatch correct goods to customer address)</option>
                          <option value="Store Pickup">Store Pickup (Hold item at customer service desk)</option>
                        </select>
                      </div>

                      <div className="security-notice-box" style={{ margin: '1.25rem 0' }}>
                        <Clock size={16} color="#D97706" />
                        <span>
                          Submitting this note will transition status to <strong>Awaiting Manager Approval</strong> and notify the Store Administrator.
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="submit"
                          disabled={submittingInvestigation}
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                        >
                          <Send size={16} />
                          {submittingInvestigation ? 'Submitting...' : 'Send Recommendation to Manager'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setSelectedComplaint(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right: Bill & Discrepancy Evidence */}
                  <div className="panel-card">
                    <div className="panel-header">
                      <h3 className="panel-title">
                        <FileText size={18} color="#059669" />
                        Bill #{selectedComplaint.bill_no} Comparison
                      </h3>
                      <span className="bill-total-tag">Counter #{selectedComplaint.counter_no}</span>
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                      <div className="meta-info-grid" style={{ marginBottom: '1.25rem' }}>
                        <div className="meta-cell">
                          <span className="meta-lbl">Customer</span>
                          <strong className="meta-val">{selectedComplaint.customer_name}</strong>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-lbl">Discrepancy</span>
                          <strong className="meta-val">{selectedComplaint.issue_type}</strong>
                        </div>
                      </div>

                      <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                        <div style={{ backgroundColor: '#F1F5F9', padding: '8px 12px', fontWeight: '700', fontSize: '0.8rem', color: '#475569' }}>
                          Official Bill Items
                        </div>
                        {selectedComplaint.bill_items?.map((it, idx) => (
                          <div key={idx} style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', fontSize: '0.85rem' }}>
                            <span><strong>{it.product_name}</strong> × {it.quantity}</span>
                            <span>₹{parseFloat(it.total_price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ border: '1px solid #FDE68A', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: '#FEF3C7', padding: '8px 12px', fontWeight: '700', fontSize: '0.8rem', color: '#92400E' }}>
                          Physical Bag Received Items
                        </div>
                        {selectedComplaint.received_items?.map((it, idx) => (
                          <div key={idx} style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #FDE68A', fontSize: '0.85rem', backgroundColor: '#FFFDF5' }}>
                            <span style={{ color: '#B45309', fontWeight: '600' }}>{it.product_name} × {it.quantity}</span>
                            <span style={{ fontSize: '0.75rem', color: '#D97706' }}>Packed in bag</span>
                          </div>
                        ))}
                      </div>

                      {/* Complaint Timeline */}
                      <div style={{ marginTop: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#0F172A' }}>Prior Timeline Entries</h4>
                        <AuditTimeline
                          history={selectedComplaint.history || []}
                          notes={selectedComplaint.notes || []}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="panel-card" style={{ padding: '3rem', textAlign: 'center' }}>
                  <ShieldCheck size={48} color="#94A3B8" style={{ margin: '0 auto 1rem' }} />
                  <h3 style={{ margin: '0 0 6px', color: '#0F172A' }}>No Complaint Selected for Investigation</h3>
                  <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                    Select an assigned grievance from your queue to begin investigation and recommend a resolution.
                  </p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('assigned')}>
                    Go to Assigned Complaints
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RESOLUTIONS */}
          {activeTab === 'resolution' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Handled Complaints & Resolution Archive</h1>
                  <p className="portal-subtitle">View complaints where your resolution recommendation has been authorized by management.</p>
                </div>
              </div>

              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Complaint ID</th>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Cashier Recommendation</th>
                        <th>Admin Approved Resolution</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.filter(c => ['Resolution Offered', 'Resolved', 'Closed'].includes(c.status)).length === 0 ? (
                        <tr><td colSpan="6" className="table-empty">No approved resolutions recorded yet.</td></tr>
                      ) : (
                        complaints
                          .filter(c => ['Resolution Offered', 'Resolved', 'Closed'].includes(c.status))
                          .map(c => (
                            <tr key={c.id}>
                              <td><strong>{c.complaint_no}</strong></td>
                              <td>{c.bill_no}</td>
                              <td>{c.customer_name}</td>
                              <td>{c.recommended_resolution || 'Replacement'}</td>
                              <td>
                                <strong style={{ color: '#059669' }}>
                                  {c.approved_resolution || c.recommended_resolution}
                                </strong>
                              </td>
                              <td><StatusBadge status={c.status} /></td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROFILE */}
          {activeTab === 'profile' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Cashier Staff Profile</h1>
                  <p className="portal-subtitle">Terminal & counter credentials for Cashier {cashierName}.</p>
                </div>
              </div>

              <div className="panel-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div className="panel-header">
                  <h3 className="panel-title"><User size={18} color="#2563EB" /> Station Details</h3>
                  <span className="badge-pill badge-good">Active Cashier</span>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div className="form-group">
                    <label>Staff Name</label>
                    <input type="text" disabled value={cashierName} className="form-input disabled-input" />
                  </div>
                  <div className="form-group">
                    <label>Cashier Staff Code</label>
                    <input type="text" disabled value={user?.cashier_code || 'CSH-101'} className="form-input disabled-input" />
                  </div>
                  <div className="form-group">
                    <label>Assigned Counter</label>
                    <input type="text" disabled value={`Billing Counter #${counterNo}`} className="form-input disabled-input" />
                  </div>
                  <div className="form-group">
                    <label>Shift Schedule</label>
                    <input type="text" disabled value={user?.shift || 'Morning (8:00 AM - 4:00 PM)'} className="form-input disabled-input" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
