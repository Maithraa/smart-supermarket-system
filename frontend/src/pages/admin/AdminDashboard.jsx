import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Store,
  FileText,
  Package,
  FolderGit2,
  BarChart3,
  Settings,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  Clock,
  QrCode,
  RotateCcw,
  Check,
  Send,
  UserPlus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import StatusBadge from '../../components/StatusBadge';
import AuditTimeline from '../../components/AuditTimeline';

const COLORS = ['#2563EB', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function AdminDashboard() {
  const { user, API_BASE } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total_customers: 0,
    total_cashiers: 0,
    total_bills: 0,
    total_complaints: 0,
    pending_complaints: 0,
    resolved_complaints: 0,
    categories: [],
    statuses: [],
    cashier_performance: [],
    recent_complaints: []
  });

  // Entities
  const [complaints, setComplaints] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [bills, setBills] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters & Search
  const [complaintSearch, setComplaintSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & Active Actions
  const [inspectComplaint, setInspectComplaint] = useState(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState('Product Replacement');
  const [resolutionDetails, setResolutionDetails] = useState('Approved after reviewing physical item discrepancy.');

  // Reassignment Modal
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedCashierId, setSelectedCashierId] = useState('');

  // Add Cashier Form Modal
  const [addCashierOpen, setAddCashierOpen] = useState(false);
  const [newCashier, setNewCashier] = useState({
    cashier_name: '',
    email: '',
    phone: '',
    counter_no: 3,
    shift: 'Morning',
    password: 'Cashier@123'
  });

  // Add Product Form Modal
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    category: 'Grocery & Staples',
    price: 50.00,
    stock_quantity: 100,
    description: '',
    barcode: ''
  });

  // Create Bill Modal (for testing)
  const [createBillOpen, setCreateBillOpen] = useState(false);
  const [newBill, setNewBill] = useState({
    bill_no: '',
    customer_name: 'Customer Walk-in',
    cashier_name: 'Priya',
    counter_no: 2,
    product_name: 'Dove Soap',
    quantity: 2,
    unit_price: 55.00,
    received_name: 'Lux Soap',
    received_quantity: 2
  });

  // Bill QR preview modal
  const [selectedBillForQR, setSelectedBillForQR] = useState(null);

  // Fetch all admin data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, complaintsRes, custRes, cashRes, billsRes, prodRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`).catch(() => ({ data: {} })),
        axios.get(`${API_BASE}/complaints`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/admin/customers`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/admin/cashiers`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/admin/bills`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/admin/products`).catch(() => ({ data: [] }))
      ]);

      setStats(statsRes.data || {});
      setComplaints(complaintsRes.data || []);
      setCustomers(custRes.data || []);
      setCashiers(cashRes.data || []);
      setBills(billsRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.warn('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Socket updates
  useEffect(() => {
    if (!socket) return;
    socket.on('new_complaint', fetchAllData);
    socket.on('complaint_updated', fetchAllData);
    return () => {
      socket.off('new_complaint');
      socket.off('complaint_updated');
    };
  }, [socket]);

  // Inspect Complaint Details
  const handleInspect = async (complaintNo) => {
    try {
      const res = await axios.get(`${API_BASE}/complaints/${complaintNo}`);
      setInspectComplaint(res.data);
      setResolutionType(res.data.recommended_resolution || 'Product Replacement');
      setResolutionDetails(`Approved ${res.data.recommended_resolution || 'Product Replacement'} as recommended by Cashier ${res.data.assigned_cashier_name || 'Staff'}.`);
    } catch (err) {
      alert('Failed to load complaint details.');
    }
  };

  // Resolution Approval Action
  const handleApproveResolution = async (action = 'approve') => {
    if (!inspectComplaint) return;
    try {
      await axios.post(`${API_BASE}/admin/complaints/${inspectComplaint.complaint_no}/resolve`, {
        action,
        resolution_type: resolutionType,
        details: resolutionDetails,
        admin_name: user?.full_name || 'Supermarket Admin'
      });
      alert(`Resolution '${resolutionType}' ${action === 'approve' ? 'APPROVED' : 'REJECTED'} successfully.`);
      setApprovalModalOpen(false);
      handleInspect(inspectComplaint.complaint_no);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process resolution approval.');
    }
  };

  // Reassign Complaint
  const handleReassignComplaint = async () => {
    if (!inspectComplaint || !selectedCashierId) return;
    try {
      await axios.post(`${API_BASE}/admin/complaints/${inspectComplaint.complaint_no}/reassign`, {
        cashier_id: parseInt(selectedCashierId),
        admin_name: user?.full_name || 'Admin'
      });
      alert(`Complaint ${inspectComplaint.complaint_no} successfully reassigned.`);
      setReassignModalOpen(false);
      handleInspect(inspectComplaint.complaint_no);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reassign cashier.');
    }
  };

  // Create Cashier
  const handleCreateCashier = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/admin/cashiers`, newCashier);
      alert(`Cashier '${newCashier.cashier_name}' created successfully.`);
      setAddCashierOpen(false);
      setNewCashier({ cashier_name: '', email: '', phone: '', counter_no: 3, shift: 'Morning', password: 'Cashier@123' });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create cashier.');
    }
  };

  // Toggle Cashier status
  const handleToggleCashierStatus = async (cashierId) => {
    try {
      await axios.patch(`${API_BASE}/admin/cashiers/${cashierId}/toggle-status`);
      fetchAllData();
    } catch (err) {
      alert('Failed to update cashier status.');
    }
  };

  // Toggle Customer status
  const handleToggleCustomerStatus = async (userId) => {
    try {
      await axios.patch(`${API_BASE}/admin/customers/${userId}/toggle-status`);
      fetchAllData();
    } catch (err) {
      alert('Failed to update customer status.');
    }
  };

  // Create Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/admin/products`, newProduct);
      alert(`Product '${newProduct.product_name}' added to inventory.`);
      setAddProductOpen(false);
      setNewProduct({ product_name: '', category: 'Grocery & Staples', price: 50.00, stock_quantity: 100, description: '', barcode: '' });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add product.');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (pid) => {
    if (!window.confirm('Are you sure you want to remove this product from inventory?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/products/${pid}`);
      fetchAllData();
    } catch (err) {
      alert('Failed to delete product.');
    }
  };

  // Create Bill
  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      const bNo = newBill.bill_no || `B${Math.floor(1000 + Math.random() * 9000)}`;
      await axios.post(`${API_BASE}/admin/bills`, {
        bill_no: bNo,
        customer_name: newBill.customer_name,
        cashier_name: newBill.cashier_name,
        counter_no: newBill.counter_no,
        items: [{ name: newBill.product_name, quantity: newBill.quantity, unit_price: newBill.unit_price }],
        received_items: [{ name: newBill.received_name, quantity: newBill.received_quantity }]
      });
      alert(`Bill ${bNo} created successfully! You can verify it now.`);
      setCreateBillOpen(false);
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create bill.');
    }
  };

  // Filtered complaints
  const filteredComplaints = complaints.filter(c => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesSearch =
      !complaintSearch ||
      c.complaint_no.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      c.bill_no.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      c.customer_name.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      (c.assigned_cashier_name && c.assigned_cashier_name.toLowerCase().includes(complaintSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-layout">
      <Navbar />

      <div className="dashboard-main-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role="Admin" />

        <main className="dashboard-content-area">
          {/* TAB 1: ADMIN DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Supermarket Central Administration</h1>
                  <p className="portal-subtitle">Real-time oversight of customer disputes, cashier performance, and billing reconciliations.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" onClick={fetchAllData}>
                    <RefreshCw size={15} /> Refresh Data
                  </button>
                  <button className="btn btn-primary" onClick={() => setCreateBillOpen(true)}>
                    <Plus size={16} /> Create Demo Bill
                  </button>
                </div>
              </div>

              {/* 6 ADMIN METRIC WIDGETS */}
              <div className="metric-cards-grid">
                <div className="metric-card bg-navy-accent">
                  <div className="metric-icon"><Users size={22} color="#2563EB" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Total Customers</span>
                    <strong className="metric-value">{stats.total_customers || customers.length}</strong>
                    <span className="metric-subtext">Registered shopper accounts</span>
                  </div>
                </div>

                <div className="metric-card bg-purple-accent">
                  <div className="metric-icon"><Store size={22} color="#7C3AED" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Total Cashiers</span>
                    <strong className="metric-value">{stats.total_cashiers || cashiers.length}</strong>
                    <span className="metric-subtext">Assigned to billing stations</span>
                  </div>
                </div>

                <div className="metric-card bg-sky-accent">
                  <div className="metric-icon"><FileText size={22} color="#0284C7" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Total Bills</span>
                    <strong className="metric-value">{stats.total_bills || bills.length}</strong>
                    <span className="metric-subtext">Official receipts generated</span>
                  </div>
                </div>

                <div className="metric-card bg-amber-accent">
                  <div className="metric-icon"><AlertTriangle size={22} color="#D97706" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Total Complaints</span>
                    <strong className="metric-value">{stats.total_complaints || complaints.length}</strong>
                    <span className="metric-subtext">Overall grievances filed</span>
                  </div>
                </div>

                <div className="metric-card bg-amber-accent" style={{ borderLeftColor: '#EF4444' }}>
                  <div className="metric-icon"><Clock size={22} color="#EF4444" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Pending Complaints</span>
                    <strong className="metric-value" style={{ color: '#DC2626' }}>{stats.pending_complaints || 0}</strong>
                    <span className="metric-subtext">Under investigation / review</span>
                  </div>
                </div>

                <div className="metric-card bg-emerald-accent">
                  <div className="metric-icon"><CheckCircle2 size={22} color="#059669" /></div>
                  <div className="metric-info">
                    <span className="metric-title">Resolved Complaints</span>
                    <strong className="metric-value" style={{ color: '#059669' }}>{stats.resolved_complaints || 0}</strong>
                    <span className="metric-subtext">Replacements & refunds settled</span>
                  </div>
                </div>
              </div>

              {/* CHARTS ROW */}
              <div className="dashboard-split-grid" style={{ marginTop: '1.5rem' }}>
                {/* Chart 1: Categories */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><BarChart3 size={18} color="#2563EB" /> Discrepancies by Category</h3>
                  </div>
                  <div style={{ height: '260px', padding: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.categories?.length > 0 ? stats.categories : [
                        { issue_type: 'Wrong Product', count: 4 },
                        { issue_type: 'Quantity Mismatch', count: 2 },
                        { issue_type: 'Missing Product', count: 1 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="issue_type" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Cashier Performance */}
                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><Store size={18} color="#7C3AED" /> Cashier Performance (Assigned vs Resolved)</h3>
                  </div>
                  <div style={{ height: '260px', padding: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.cashier_performance?.length > 0 ? stats.cashier_performance : [
                        { cashier_name: 'Priya', total_assigned: 3, resolved: 2 },
                        { cashier_name: 'Rahul', total_assigned: 2, resolved: 1 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="cashier_name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_assigned" name="Assigned" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Complaints Table */}
              <div className="panel-card" style={{ marginTop: '1.5rem' }}>
                <div className="panel-header">
                  <h3 className="panel-title"><AlertTriangle size={18} color="#2563EB" /> Recent Store Complaints</h3>
                  <button className="text-btn" onClick={() => setActiveTab('complaints')}>View All Complaints</button>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Issue Type</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.slice(0, 5).map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.complaint_no}</strong></td>
                          <td>{c.bill_no}</td>
                          <td>{c.customer_name}</td>
                          <td>{c.issue_type}</td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>
                            <button
                              className="btn-sm btn-primary"
                              onClick={() => {
                                handleInspect(c.complaint_no);
                                setActiveTab('complaints');
                              }}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL COMPLAINTS MANAGEMENT */}
          {activeTab === 'complaints' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Grievance & Resolution Management</h1>
                  <p className="portal-subtitle">Filter, inspect investigation notes, and authorize customer replacements or refunds.</p>
                </div>
                <button className="btn btn-outline" onClick={fetchAllData}>
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>

              {/* Filters Bar */}
              <div className="panel-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search by ticket ID, bill, customer, or cashier..."
                      value={complaintSearch}
                      onChange={(e) => setComplaintSearch(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.4rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} color="#64748B" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="form-select"
                      style={{ width: '220px' }}
                    >
                      <option value="All">All Statuses ({complaints.length})</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Assigned to Cashier">Assigned to Cashier</option>
                      <option value="Investigation in Progress">Investigation in Progress</option>
                      <option value="Awaiting Manager Approval">Awaiting Manager Approval</option>
                      <option value="Resolution Offered">Resolution Offered</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Complaints Table */}
              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Complaint ID</th>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Issue</th>
                        <th>Assigned Cashier</th>
                        <th>Status</th>
                        <th>Resolution</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.length === 0 ? (
                        <tr><td colSpan="8" className="table-empty">No complaints match your query.</td></tr>
                      ) : (
                        filteredComplaints.map(c => (
                          <tr key={c.id}>
                            <td><strong>{c.complaint_no}</strong></td>
                            <td>{c.bill_no}</td>
                            <td>{c.customer_name}</td>
                            <td>{c.issue_type}</td>
                            <td>
                              <span style={{ fontWeight: '600', color: '#1E3A8A' }}>
                                {c.assigned_cashier_name || 'Unassigned'}
                              </span>
                            </td>
                            <td><StatusBadge status={c.status} /></td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>
                                {c.approved_resolution || c.recommended_resolution || '—'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-sm btn-primary"
                                onClick={() => handleInspect(c.complaint_no)}
                              >
                                Review & Authorize
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* INSPECTION & AUTHORIZATION DRAWER/MODAL */}
              {inspectComplaint && (
                <div className="modal-overlay">
                  <div className="modal-box" style={{ maxWidth: '850px' }}>
                    <div className="modal-header">
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Manager Review Console</span>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0F172A' }}>
                          Ticket {inspectComplaint.complaint_no} · Bill #{inspectComplaint.bill_no}
                        </h3>
                      </div>
                      <button className="icon-btn" onClick={() => setInspectComplaint(null)}>✕</button>
                    </div>

                    <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                      <div className="meta-info-grid" style={{ marginBottom: '1.25rem' }}>
                        <div className="meta-cell">
                          <span className="meta-lbl">Customer Name</span>
                          <strong className="meta-val">{inspectComplaint.customer_name}</strong>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-lbl">Billing Counter</span>
                          <strong className="meta-val">Counter #{inspectComplaint.counter_no}</strong>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-lbl">Auto-Assigned Cashier</span>
                          <strong className="meta-val">{inspectComplaint.assigned_cashier_name || 'Unassigned'}</strong>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-lbl">Discrepancy Category</span>
                          <strong className="meta-val">{inspectComplaint.issue_type}</strong>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-lbl">Expected Item</span>
                          <strong className="meta-val">{inspectComplaint.expected_product || inspectComplaint.product_name} (x{inspectComplaint.expected_quantity})</strong>
                        </div>
                        <div className="meta-cell">
                          <span className="meta-lbl">Received Item</span>
                          <strong className="meta-val" style={{ color: '#DC2626' }}>{inspectComplaint.received_product || 'Substitute'} (x{inspectComplaint.received_quantity})</strong>
                        </div>
                      </div>

                      {/* Cashier Recommendation Banner */}
                      {inspectComplaint.recommended_resolution && (
                        <div className="action-highlight-banner" style={{ borderLeftColor: '#10B981', margin: '1rem 0' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#047857' }}>
                              CASHIER INVESTIGATION RECOMMENDATION:
                            </span>
                            <h4 style={{ margin: '2px 0 4px', color: '#065F46' }}>
                              {inspectComplaint.recommended_resolution}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857' }}>
                              Verified by Cashier {inspectComplaint.assigned_cashier_name} at Counter #{inspectComplaint.counter_no}.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Customer Reported Description */}
                      <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Customer Statement:</span>
                        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#1E293B' }}>{inspectComplaint.description}</p>
                      </div>

                      {/* Audit Trail & Notes */}
                      <div style={{ marginTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#0F172A' }}>Investigation Timeline & Notes</h4>
                        <AuditTimeline
                          history={inspectComplaint.history || []}
                          notes={inspectComplaint.notes || []}
                        />
                      </div>

                      {/* Approval Box */}
                      <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                        <h4 style={{ margin: '0 0 8px', color: '#1E3A8A' }}>Admin Authorization & Resolution Action</h4>
                        <div className="form-row-2col">
                          <div className="form-group">
                            <label>Authorize Resolution Type *</label>
                            <select
                              value={resolutionType}
                              onChange={(e) => setResolutionType(e.target.value)}
                              className="form-select"
                            >
                              <option value="Product Replacement">Product Replacement (Immediate Shelf Exchange)</option>
                              <option value="Refund">Full Refund (Credit back to Customer)</option>
                              <option value="Home Delivery">Home Delivery (Courier replacement item to customer)</option>
                              <option value="Store Pickup">Store Pickup (Hold at Customer Service desk)</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Manager Authorization Note</label>
                            <input
                              type="text"
                              value={resolutionDetails}
                              onChange={(e) => setResolutionDetails(e.target.value)}
                              className="form-input"
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                          <button
                            className="btn btn-emerald"
                            style={{ flex: 1 }}
                            onClick={() => handleApproveResolution('approve')}
                          >
                            <Check size={16} /> Authorize & Offer Resolution to Customer
                          </button>
                          <button
                            className="btn btn-outline"
                            onClick={() => setReassignModalOpen(true)}
                          >
                            <RotateCcw size={16} /> Reassign Cashier
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* REASSIGN CASHIER MODAL */}
              {reassignModalOpen && (
                <div className="modal-overlay">
                  <div className="modal-box" style={{ maxWidth: '440px' }}>
                    <div className="modal-header">
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Reassign Complaint to Cashier</h3>
                      <button className="icon-btn" onClick={() => setReassignModalOpen(false)}>✕</button>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 0 }}>
                        Select another billing counter cashier to take ownership of complaint <strong>{inspectComplaint?.complaint_no}</strong>:
                      </p>
                      <div className="form-group">
                        <label>Select Target Cashier</label>
                        <select
                          value={selectedCashierId}
                          onChange={(e) => setSelectedCashierId(e.target.value)}
                          className="form-select"
                        >
                          <option value="">-- Choose Cashier --</option>
                          {cashiers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.cashier_name} (Counter #{c.counter_no} · Shift: {c.shift})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
                        <button className="btn btn-outline" onClick={() => setReassignModalOpen(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleReassignComplaint}>Confirm Reassignment</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOMER MANAGEMENT */}
          {activeTab === 'customers' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Customer Account Administration</h1>
                  <p className="portal-subtitle">Registered shoppers, billing archives, and grievance histories.</p>
                </div>
                <button className="btn btn-outline" onClick={fetchAllData}>
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>

              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Customer Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Membership</th>
                        <th>Bills</th>
                        <th>Complaints</th>
                        <th>Account Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.customer_code}</strong></td>
                          <td>{c.full_name}</td>
                          <td>{c.email}</td>
                          <td>{c.phone}</td>
                          <td><span className="badge-pill badge-good">{c.membership_tier}</span></td>
                          <td>{c.total_bills}</td>
                          <td>{c.total_complaints}</td>
                          <td>
                            <span className={`badge-pill ${c.account_status === 'Active' ? 'badge-good' : 'badge-bad'}`}>
                              {c.account_status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-sm btn-outline"
                              onClick={() => handleToggleCustomerStatus(c.user_id)}
                            >
                              {c.account_status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CASHIER MANAGEMENT */}
          {activeTab === 'cashiers' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Cashier Staff & Counter Allocation</h1>
                  <p className="portal-subtitle">Configure billing stations, counter assignments, and staff shifts.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" onClick={fetchAllData}><RefreshCw size={15} /> Refresh</button>
                  <button className="btn btn-primary" onClick={() => setAddCashierOpen(true)}>
                    <UserPlus size={16} /> Add New Cashier
                  </button>
                </div>
              </div>

              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Staff Code</th>
                        <th>Cashier Name</th>
                        <th>Assigned Counter</th>
                        <th>Shift</th>
                        <th>Phone</th>
                        <th>Bills Processed</th>
                        <th>Complaints Handled</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashiers.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.cashier_code}</strong></td>
                          <td>{c.cashier_name}</td>
                          <td><span className="counter-badge">Counter #{c.counter_no}</span></td>
                          <td>{c.shift}</td>
                          <td>{c.phone || '—'}</td>
                          <td>{c.total_bills_processed}</td>
                          <td>{c.complaints_handled}</td>
                          <td>
                            <span className={`badge-pill ${c.account_status === 'Active' ? 'badge-good' : 'badge-bad'}`}>
                              {c.account_status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-sm btn-outline"
                              onClick={() => handleToggleCashierStatus(c.id)}
                            >
                              {c.account_status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ADD CASHIER MODAL */}
              {addCashierOpen && (
                <div className="modal-overlay">
                  <div className="modal-box" style={{ maxWidth: '480px' }}>
                    <div className="modal-header">
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Add New Cashier Account</h3>
                      <button className="icon-btn" onClick={() => setAddCashierOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleCreateCashier} style={{ padding: '1.5rem' }}>
                      <div className="form-group">
                        <label>Cashier Full Name *</label>
                        <input
                          type="text"
                          required
                          value={newCashier.cashier_name}
                          onChange={(e) => setNewCashier({ ...newCashier, cashier_name: e.target.value })}
                          className="form-input"
                          placeholder="e.g. Ramesh K"
                        />
                      </div>
                      <div className="form-group">
                        <label>Work Email Address *</label>
                        <input
                          type="email"
                          required
                          value={newCashier.email}
                          onChange={(e) => setNewCashier({ ...newCashier, email: e.target.value })}
                          className="form-input"
                          placeholder="ramesh@freshmart.com"
                        />
                      </div>
                      <div className="form-row-2col">
                        <div className="form-group">
                          <label>Counter Number</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={newCashier.counter_no}
                            onChange={(e) => setNewCashier({ ...newCashier, counter_no: parseInt(e.target.value) || 1 })}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Shift</label>
                          <select
                            value={newCashier.shift}
                            onChange={(e) => setNewCashier({ ...newCashier, shift: e.target.value })}
                            className="form-select"
                          >
                            <option value="Morning">Morning (8am - 4pm)</option>
                            <option value="Evening">Evening (4pm - 11pm)</option>
                            <option value="Night">Night (11pm - 7am)</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Initial Login Password</label>
                        <input
                          type="text"
                          value={newCashier.password}
                          onChange={(e) => setNewCashier({ ...newCashier, password: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setAddCashierOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Create Cashier Account</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BILL MANAGEMENT */}
          {activeTab === 'bills' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Official Billing & Invoicing Records</h1>
                  <p className="portal-subtitle">Search invoices, inspect scanned QR codes, and create test bills for simulation.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" onClick={fetchAllData}><RefreshCw size={15} /> Refresh</button>
                  <button className="btn btn-primary" onClick={() => setCreateBillOpen(true)}>
                    <Plus size={16} /> Create Demo Bill
                  </button>
                </div>
              </div>

              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Cashier</th>
                        <th>Counter</th>
                        <th>Total Amount</th>
                        <th>Verification Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map(b => (
                        <tr key={b.id}>
                          <td><strong>{b.bill_no}</strong></td>
                          <td>{b.customer_name}</td>
                          <td>{b.cashier_name}</td>
                          <td>Counter #{b.counter_no}</td>
                          <td>₹{parseFloat(b.total_amount).toFixed(2)}</td>
                          <td>
                            <span className={`badge-pill ${b.is_verified ? 'badge-good' : 'badge-warn'}`}>
                              {b.verification_status || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-sm btn-outline"
                              onClick={() => setSelectedBillForQR(b.bill_no)}
                            >
                              <QrCode size={14} /> View QR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* QR Modal */}
              {selectedBillForQR && (
                <div className="modal-overlay">
                  <div className="modal-box" style={{ maxWidth: '360px', textAlign: 'center' }}>
                    <div className="modal-header">
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Bill QR: {selectedBillForQR}</h3>
                      <button className="icon-btn" onClick={() => setSelectedBillForQR(null)}>✕</button>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <img
                        src={`${API_BASE}/bills/${selectedBillForQR}/qr`}
                        alt="QR Code"
                        style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block' }}
                      />
                      <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '1rem' }}>
                        Scan with Customer Verification camera to test automated mismatch detection.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CREATE DEMO BILL MODAL */}
              {createBillOpen && (
                <div className="modal-overlay">
                  <div className="modal-box" style={{ maxWidth: '580px' }}>
                    <div className="modal-header">
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Create Simulated Bill</h3>
                      <button className="icon-btn" onClick={() => setCreateBillOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleCreateBill} style={{ padding: '1.5rem' }}>
                      <div className="form-row-2col">
                        <div className="form-group">
                          <label>Bill Number</label>
                          <input
                            type="text"
                            placeholder="Leave blank for auto-generate"
                            value={newBill.bill_no}
                            onChange={(e) => setNewBill({ ...newBill, bill_no: e.target.value.toUpperCase() })}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Customer Name</label>
                          <input
                            type="text"
                            value={newBill.customer_name}
                            onChange={(e) => setNewBill({ ...newBill, customer_name: e.target.value })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="form-row-2col">
                        <div className="form-group">
                          <label>Cashier Name</label>
                          <input
                            type="text"
                            value={newBill.cashier_name}
                            onChange={(e) => setNewBill({ ...newBill, cashier_name: e.target.value })}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>Counter Number</label>
                          <input
                            type="number"
                            min="1"
                            value={newBill.counter_no}
                            onChange={(e) => setNewBill({ ...newBill, counter_no: parseInt(e.target.value) || 1 })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '6px', margin: '0.75rem 0', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E3A8A' }}>Billed Product:</span>
                        <div className="form-row-2col" style={{ marginTop: '6px' }}>
                          <input
                            type="text"
                            placeholder="Product Name"
                            value={newBill.product_name}
                            onChange={(e) => setNewBill({ ...newBill, product_name: e.target.value })}
                            className="form-input"
                          />
                          <input
                            type="number"
                            placeholder="Quantity"
                            value={newBill.quantity}
                            onChange={(e) => setNewBill({ ...newBill, quantity: parseInt(e.target.value) || 1 })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '6px', margin: '0.75rem 0', border: '1px solid #FECACA' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#991B1B' }}>Physical Received Product in Bag (For Mismatch Demo):</span>
                        <div className="form-row-2col" style={{ marginTop: '6px' }}>
                          <input
                            type="text"
                            placeholder="Received Product (e.g. Lux Soap)"
                            value={newBill.received_name}
                            onChange={(e) => setNewBill({ ...newBill, received_name: e.target.value })}
                            className="form-input"
                          />
                          <input
                            type="number"
                            placeholder="Received Quantity"
                            value={newBill.received_quantity}
                            onChange={(e) => setNewBill({ ...newBill, received_quantity: parseInt(e.target.value) || 1 })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setCreateBillOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save & Register Bill</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PRODUCT MANAGEMENT */}
          {activeTab === 'products' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Inventory & Product Catalog</h1>
                  <p className="portal-subtitle">Manage supermarket items, stock levels, barcodes, and retail pricing.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline" onClick={fetchAllData}><RefreshCw size={15} /> Refresh</button>
                  <button className="btn btn-primary" onClick={() => setAddProductOpen(true)}>
                    <Plus size={16} /> Add Product
                  </button>
                </div>
              </div>

              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Barcode</th>
                        <th>Price (₹)</th>
                        <th>Stock Available</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.product_code}</strong></td>
                          <td>{p.product_name}</td>
                          <td><span className="badge-pill badge-good">{p.category}</span></td>
                          <td><code>{p.barcode}</code></td>
                          <td>₹{parseFloat(p.price).toFixed(2)}</td>
                          <td>
                            <strong style={{ color: p.stock_quantity > 20 ? '#059669' : '#DC2626' }}>
                              {p.stock_quantity} units
                            </strong>
                          </td>
                          <td>
                            <button
                              className="btn-sm btn-outline-danger"
                              onClick={() => handleDeleteProduct(p.id)}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ADD PRODUCT MODAL */}
              {addProductOpen && (
                <div className="modal-overlay">
                  <div className="modal-box" style={{ maxWidth: '480px' }}>
                    <div className="modal-header">
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Add New Inventory Product</h3>
                      <button className="icon-btn" onClick={() => setAddProductOpen(false)}>✕</button>
                    </div>
                    <form onSubmit={handleCreateProduct} style={{ padding: '1.5rem' }}>
                      <div className="form-group">
                        <label>Product Name *</label>
                        <input
                          type="text"
                          required
                          value={newProduct.product_name}
                          onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                          className="form-input"
                          placeholder="e.g. Cadbury Dairy Milk Silk"
                        />
                      </div>
                      <div className="form-row-2col">
                        <div className="form-group">
                          <label>Category</label>
                          <select
                            value={newProduct.category}
                            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                            className="form-select"
                          >
                            <option value="Personal Care">Personal Care</option>
                            <option value="Grocery & Staples">Grocery & Staples</option>
                            <option value="Dairy">Dairy</option>
                            <option value="Breakfast">Breakfast</option>
                            <option value="Beverages">Beverages</option>
                            <option value="Snacks & Biscuits">Snacks & Biscuits</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Price (₹) *</label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                            className="form-input"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Stock Quantity</label>
                        <input
                          type="number"
                          value={newProduct.stock_quantity}
                          onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                          className="form-input"
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1.25rem' }}>
                        <button type="button" className="btn btn-outline" onClick={() => setAddProductOpen(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save Product</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: COMPLAINT ASSIGNMENT (AUTOMATIC MAPPING VIEWER) */}
          {activeTab === 'assignments' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Automated Cashier Assignment Engine</h1>
                  <p className="portal-subtitle">
                    Demonstration of the automated routing rule: When a bill mismatch is flagged, the bill POS record is queried in MySQL to map the cashier at the counter.
                  </p>
                </div>
              </div>

              <div className="panel-card" style={{ marginBottom: '1.5rem', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <ShieldCheck size={32} color="#0284C7" />
                  <div>
                    <h3 style={{ margin: '0 0 4px', color: '#0369A1' }}>System Routing Rule Active</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#0284C7' }}>
                      Bills processed by Priya (Counter 2) are automatically assigned to Priya. Bills processed by Rahul (Counter 1) are auto-assigned to Rahul. The Store Admin can manually reassign at any point.
                    </p>
                  </div>
                </div>
              </div>

              <div className="panel-card">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Complaint ID</th>
                        <th>Bill Reference</th>
                        <th>Billing Counter</th>
                        <th>Responsible Cashier</th>
                        <th>Assignment Engine</th>
                        <th>Status</th>
                        <th>Manual Override</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.complaint_no}</strong></td>
                          <td>{c.bill_no}</td>
                          <td>Counter #{c.counter_no || 2}</td>
                          <td><strong>{c.assigned_cashier_name || 'System Pending'}</strong></td>
                          <td><span className="badge-pill badge-good">System Auto-Assigned</span></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>
                            <button
                              className="btn-sm btn-outline"
                              onClick={() => {
                                handleInspect(c.complaint_no);
                                setReassignModalOpen(true);
                              }}
                            >
                              Reassign
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Grievance Reports & Trend Analytics</h1>
                  <p className="portal-subtitle">Statistical breakdowns of supermarket dispute metrics and resolution velocity.</p>
                </div>
                <button className="btn btn-outline" onClick={fetchAllData}><RefreshCw size={15} /> Refresh Data</button>
              </div>

              <div className="dashboard-split-grid">
                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><BarChart3 size={18} color="#2563EB" /> Resolved vs Pending Ratio</h3>
                  </div>
                  <div style={{ height: '280px', padding: '1rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Resolved / Closed', value: stats.resolved_complaints || 2 },
                            { name: 'Pending / Investigating', value: stats.pending_complaints || 1 }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#F59E0B" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-header">
                    <h3 className="panel-title"><Store size={18} color="#7C3AED" /> Cashier Efficiency Metric</h3>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {cashiers.map(c => (
                        <div key={c.id} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <strong>{c.cashier_name} (Counter #{c.counter_no})</strong>
                            <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: '700' }}>
                              Complaints Handled: {c.complaints_handled}
                            </span>
                          </div>
                          <div style={{ background: '#E2E8F0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, (c.complaints_handled / Math.max(1, complaints.length)) * 100)}%`,
                                height: '100%',
                                backgroundColor: '#2563EB'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              <div className="portal-header-bar">
                <div>
                  <h1 className="portal-title">Supermarket System Configuration</h1>
                  <p className="portal-subtitle">Platform settings, database connections, and session policies.</p>
                </div>
              </div>

              <div className="panel-card" style={{ maxWidth: '700px', margin: '0 auto' }}>
                <div className="panel-header">
                  <h3 className="panel-title"><Settings size={18} color="#2563EB" /> Environment Status</h3>
                  <span className="badge-pill badge-good">Production Ready</span>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div className="form-group">
                    <label>MySQL Relational Database</label>
                    <input type="text" disabled value="smart_supermarket (Port 3306 on localhost)" className="form-input disabled-input" />
                  </div>
                  <div className="form-group">
                    <label>Password Encryption Standard</label>
                    <input type="text" disabled value="Werkzeug Scrypt KDF Hashing" className="form-input disabled-input" />
                  </div>
                  <div className="form-group">
                    <label>Real-Time Messaging Engine</label>
                    <input type="text" disabled value="Flask-SocketIO WebSockets Active" className="form-input disabled-input" />
                  </div>
                  <div className="form-group">
                    <label>Auto-Assignment Algorithm</label>
                    <input type="text" disabled value="POS Bill Counter to Cashier ID Relational Mapping" className="form-input disabled-input" />
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
