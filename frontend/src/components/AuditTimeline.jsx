import React from 'react';
import { CheckCircle2, Clock, User, ShieldCheck } from 'lucide-react';

export default function AuditTimeline({ history = [], notes = [] }) {
  // Merge history and notes into unified timeline
  const events = [
    ...history.map(h => ({
      id: `hist-${h.id}`,
      title: h.status,
      description: h.note,
      author: h.updated_by || 'System',
      date: h.created_at,
      type: 'status'
    })),
    ...notes.map(n => ({
      id: `note-${n.id}`,
      title: `Investigation Note (${n.recommended_action || 'Review'})`,
      description: n.note,
      author: `${n.author_name} (${n.author_role})`,
      date: n.created_at,
      type: 'note'
    }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (events.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B' }}>
        No timeline activity recorded yet.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '1.5rem', marginTop: '1rem' }}>
      <div
        style={{
          position: 'absolute',
          left: '11px',
          top: '8px',
          bottom: '8px',
          width: '2px',
          backgroundColor: '#E2E8F0'
        }}
      />
      {events.map((ev, idx) => (
        <div key={ev.id} style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <div
            style={{
              position: 'absolute',
              left: '-1.5rem',
              top: '2px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: ev.type === 'note' ? '#FEF3C7' : '#EFF6FF',
              border: `2px solid ${ev.type === 'note' ? '#F59E0B' : '#2563EB'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: ev.type === 'note' ? '#B45309' : '#1D4ED8',
              fontSize: '12px'
            }}
          >
            {ev.type === 'note' ? <ShieldCheck size={13} /> : <CheckCircle2 size={13} />}
          </div>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0F172A' }}>
                {ev.title}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {ev.date ? new Date(ev.date).toLocaleString() : 'Just now'}
              </span>
            </div>
            {ev.description && (
              <p style={{ margin: '4px 0 6px', fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                {ev.description}
              </p>
            )}
            <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={12} /> Logged by: <strong style={{ color: '#334155' }}>{ev.author}</strong>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
