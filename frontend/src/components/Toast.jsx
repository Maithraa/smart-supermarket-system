import React from 'react';
import { useSocket } from '../context/SocketContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toast, clearToast } = useSocket();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={20} color="#10B981" />,
    error: <AlertCircle size={20} color="#EF4444" />,
    info: <Info size={20} color="#3B82F6" />
  };

  return (
    <div className="toast-notification-banner">
      <div className="toast-icon">
        {icons[toast.type] || icons.info}
      </div>
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={clearToast} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
