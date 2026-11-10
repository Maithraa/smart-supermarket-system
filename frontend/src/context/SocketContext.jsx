import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, API_BASE } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  const fetchNotifications = async () => {
    try {
      const roleParam = user?.role || 'All';
      const res = await axios.get(`${API_BASE}/notifications?role=${roleParam}`);
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      // silently handle
    }
  };

  useEffect(() => {
    const s = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    setSocket(s);

    s.on('connect', () => {
      // connected to socket
    });

    s.on('new_complaint', (data) => {
      setToast({
        id: Date.now(),
        type: 'info',
        title: 'New Complaint Submitted',
        message: `Complaint ${data.complaint_no} created for Bill ${data.bill_no} (Assigned to ${data.assigned_cashier || 'Cashier'}).`
      });
      fetchNotifications();
    });

    s.on('complaint_updated', (data) => {
      setToast({
        id: Date.now(),
        type: 'success',
        title: 'Complaint Update',
        message: `Complaint ${data.complaint_no} status changed to ${data.status}.`
      });
      fetchNotifications();
    });

    fetchNotifications();

    return () => {
      s.disconnect();
    };
  }, [user]);

  const markAllRead = async () => {
    try {
      await axios.post(`${API_BASE}/notifications/mark-all-read`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      // silent
    }
  };

  const clearToast = () => setToast(null);

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, markAllRead, toast, clearToast, refreshNotifications: fetchNotifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
