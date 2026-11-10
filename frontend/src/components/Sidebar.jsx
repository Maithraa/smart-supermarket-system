import React from 'react';
import {
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  Search,
  User,
  Users,
  Store,
  BarChart3,
  Package,
  FileText,
  Settings,
  LogOut,
  FolderGit2,
  FileCheck2,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({ activeTab, setActiveTab, role = 'Customer' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const customerItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verify', label: 'Verify Bill', icon: CheckCircle },
    { id: 'raise', label: 'Raise Complaint', icon: AlertTriangle },
    { id: 'track', label: 'Track Complaint', icon: Search },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const cashierItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assigned', label: 'Assigned Complaints', icon: ClipboardList },
    { id: 'investigation', label: 'Investigation', icon: ShieldCheck },
    { id: 'resolution', label: 'Resolution', icon: FileCheck2 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const adminItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'complaints', label: 'All Complaints', icon: AlertTriangle },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'cashiers', label: 'Cashiers', icon: Store },
    { id: 'bills', label: 'Bill Management', icon: FileText },
    { id: 'products', label: 'Product Management', icon: Package },
    { id: 'assignments', label: 'Complaint Assignment', icon: FolderGit2 },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  let items = customerItems;
  if (role === 'Cashier') items = cashierItems;
  if (role === 'Admin') items = adminItems;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-role-indicator">
          <div className="role-dot" />
          <span className="role-text">{role} Portal</span>
        </div>
        <div className="sidebar-user-name">
          {user?.full_name || 'Staff User'}
        </div>
        {role === 'Cashier' && user?.counter_no && (
          <div className="sidebar-counter-tag">
            Billing Counter #{user.counter_no}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="sidebar-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
