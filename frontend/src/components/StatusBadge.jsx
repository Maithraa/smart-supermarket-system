import React from 'react';

const STATUS_CONFIG = {
  'Submitted': { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: '1. Submitted' },
  'Under Review': { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', label: '2. Under Review' },
  'Assigned to Cashier': { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF', label: '3. Assigned to Cashier' },
  'Investigation in Progress': { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', label: '4. Investigating' },
  'Awaiting Manager Approval': { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA', label: '5. Awaiting Approval' },
  'Resolution Offered': { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC', label: '6. Resolution Offered' },
  'Resolved': { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', label: '7. Resolved' },
  'Closed': { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', label: '8. Closed' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#E5E7EB',
    label: status || 'Unknown'
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: '0.78rem',
        fontWeight: '600',
        borderRadius: '9999px',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.text,
          marginRight: '6px'
        }}
      />
      {config.label}
    </span>
  );
}
