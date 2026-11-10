import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, FileText, CheckCircle2 } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [activeTab, setActiveTab] = useState('camera');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          { fps: 10, qrbox: { width: 220, height: 220 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            onScanSuccess(decodedText);
            scanner.clear().catch(() => {});
            onClose();
          },
          (error) => {
            // scan failure callback (ignores non-QR frames)
          }
        );
        scannerRef.current = scanner;
      } catch (e) {
        console.warn('QR scanner init:', e);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const demoBills = [
    { bill_no: 'B1025', desc: 'Demo: Wrong Product (Dove vs Lux Soap)' },
    { bill_no: 'B1026', desc: 'Demo: Quantity Mismatch (Amul Butter)' },
    { bill_no: 'B1027', desc: 'Demo: Perfect Match (Tropicana & Cookies)' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera className="text-primary" size={22} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Scan Bill QR Code</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 1.5rem' }}>
          <button
            onClick={() => setActiveTab('camera')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
              color: activeTab === 'camera' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'camera' ? '2px solid #2563EB' : 'none',
              cursor: 'pointer'
            }}
          >
            Live Camera Scanner
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
              color: activeTab === 'demo' ? '#2563EB' : '#64748B',
              borderBottom: activeTab === 'demo' ? '2px solid #2563EB' : 'none',
              cursor: 'pointer'
            }}
          >
            Quick Demo Bills
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'camera' ? (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1rem' }}>
                Hold your printed receipt or phone screen QR code in front of the camera:
              </p>
              <div id="qr-reader-container" style={{ width: '100%', minHeight: '260px' }} />
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Camera access requires device permission. If offline, use Quick Demo tab above.
                </span>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1rem' }}>
                Select a simulated bill QR code from supermarket database:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {demoBills.map(b => (
                  <button
                    key={b.bill_no}
                    onClick={() => {
                      onScanSuccess(b.bill_no);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#1E3A8A' }}>Bill: {b.bill_no}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{b.desc}</div>
                    </div>
                    <CheckCircle2 size={18} color="#2563EB" />
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px' }}>
                  Or enter Bill Number manually:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. B1025"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: '0.6rem 0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (manualCode) {
                        onScanSuccess(manualCode);
                        onClose();
                      }
                    }}
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
