'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function DanaSandboxContent() {
  const searchParams = useSearchParams();
  const topupId = searchParams.get('id');
  const rawAmount = searchParams.get('amount');
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('0812-3456-7890');
  const [countdown, setCountdown] = useState(5);

  const displayAmount = rawAmount ? parseInt(rawAmount) : 0;

  const handlePayment = async () => {
    if (!topupId) {
      setError('ID Transaksi tidak valid.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/dana-direct-sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topup_id: topupId }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Gagal memproses pembayaran DANA.');
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Attempt to deep link back to the app
            window.location.href = 'kangmassage://wallet';
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [success]);

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* Top Banner DANA */}
      <div style={styles.header}>
        <div style={styles.headerLogoContainer}>
          <span style={styles.danaTextWhite}>DANA</span>
          <span style={styles.sandboxBadge}>SANDBOX</span>
        </div>
      </div>

      <div style={styles.cardContainer}>
        {!success ? (
          /* Checkout Interface */
          <div style={styles.paymentCard}>
            <div style={styles.merchantSection}>
              <div style={styles.merchantLabel}>Merchant Pembayaran</div>
              <div style={styles.merchantName}>KangMassage On-Demand</div>
              <div style={styles.orderIdText}>Order ID: {orderId || 'UTOPUP-xxxxxxxx'}</div>
            </div>

            <div style={styles.amountSection}>
              <div style={styles.amountLabel}>Total Bayar</div>
              <div style={styles.amountValue}>Rp {displayAmount.toLocaleString('id-ID')}</div>
            </div>

            <div style={styles.danaInputCard}>
              <div style={styles.inputLabel}>Nomor Handphone DANA</div>
              <div style={styles.phoneInputRow}>
                <span style={styles.phoneCountryCode}>+62</span>
                <input
                  type="text"
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div style={styles.sandboxInfoBox}>
                💡 <b>Mode Sandbox Direct API:</b> Anda tidak perlu memasukkan PIN asli. Cukup tekan tombol bayar untuk mensimulasikan persetujuan instan dari server DANA Direct.
              </div>
            </div>

            {error && <div style={styles.errorText}>{error}</div>}

            <button
              onClick={handlePayment}
              disabled={loading}
              style={{
                ...styles.payButton,
                backgroundColor: loading ? '#b3d7ff' : '#008CFF',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner}></div>
                  <span>Memproses Pembayaran DANA...</span>
                </div>
              ) : (
                'BAYAR SEKARANG'
              )}
            </button>
          </div>
        ) : (
          /* Payment Success Interface */
          <div style={{ ...styles.paymentCard, ...styles.successCard }}>
            <div style={styles.successIconWrapper}>
              <svg viewBox="0 0 24 24" width="70" height="70" fill="none">
                <circle cx="12" cy="12" r="11" fill="#10B981" />
                <path
                  d="M7 12l3.5 3.5 6.5-6.5"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 style={styles.successTitle}>Pembayaran Sukses!</h2>
            <p style={styles.successSubtitle}>
              Saldo sebesar <b>Rp {displayAmount.toLocaleString('id-ID')}</b> telah ditambahkan ke dompet KangMassage Anda via DANA Direct API Sandbox.
            </p>

            <div style={styles.successDetailsBox}>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Merchant:</span>
                <span style={styles.detailVal}>KangMassage</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Transaksi ID:</span>
                <span style={{ ...styles.detailVal, fontSize: '11px', fontFamily: 'monospace' }}>{topupId}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Status:</span>
                <span style={{ ...styles.detailVal, color: '#10B981', fontWeight: 'bold' }}>SETTLEMENT</span>
              </div>
            </div>

            <div style={styles.autoRedirectBox}>
              Mengalihkan kembali ke aplikasi dalam <b>{countdown}</b> detik...
            </div>

            <a href="kangmassage://wallet" style={styles.backToAppLink}>
              Kembali Ke Aplikasi Sekarang
            </a>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        DANA Simulator &bull; Keamanan Terlindungi
      </div>
    </div>
  );
}

export default function DanaSandboxPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h3>Memuat DANA Sandbox Simulator...</h3>
      </div>
    }>
      <DanaSandboxContent />
    </Suspense>
  );
}

// Sleek high-fidelity custom CSS styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#F3F4F6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    backgroundColor: '#008CFF',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  headerLogoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  danaTextWhite: {
    color: '#FFFFFF',
    fontSize: '24px',
    fontWeight: 900,
    letterSpacing: '1px',
    fontStyle: 'italic',
  },
  sandboxBadge: {
    fontSize: '10px',
    backgroundColor: '#FFBE00',
    color: '#1A1A2E',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  cardContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '440px',
    padding: '28px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  successCard: {
    alignItems: 'center',
    textAlign: 'center',
  },
  merchantSection: {
    borderBottom: '1px dashed #E5E7EB',
    paddingBottom: '16px',
  },
  merchantLabel: {
    color: '#9CA3AF',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  merchantName: {
    color: '#1F2937',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  orderIdText: {
    color: '#6B7280',
    fontSize: '12px',
    marginTop: '2px',
  },
  amountSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: '16px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    color: '#4B5563',
    fontSize: '14px',
    fontWeight: 'medium',
  },
  amountValue: {
    color: '#111827',
    fontSize: '22px',
    fontWeight: 800,
  },
  danaInputCard: {
    border: '1.5px solid #E5E7EB',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputLabel: {
    color: '#374151',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  phoneInputRow: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: '10px',
    padding: '10px 14px',
    border: '1px solid #D1D5DB',
  },
  phoneCountryCode: {
    color: '#4B5563',
    fontSize: '14px',
    fontWeight: 'bold',
    marginRight: '8px',
  },
  phoneInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#111827',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  sandboxInfoBox: {
    backgroundColor: '#EBF8FF',
    borderLeft: '4px solid #3182CE',
    color: '#2B6CB0',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '11px',
    lineHeight: '16px',
    marginTop: '6px',
  },
  errorText: {
    color: '#EF4444',
    fontSize: '12px',
    fontWeight: 'medium',
  },
  payButton: {
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '16px',
    padding: '16px',
    fontSize: '15px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    transition: 'all 0.2s',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid #FFFFFF',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  successIconWrapper: {
    backgroundColor: '#ECFDF5',
    padding: '12px',
    borderRadius: '50%',
    width: 'fit-content',
    marginBottom: '8px',
  },
  successTitle: {
    color: '#065F46',
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0,
  },
  successSubtitle: {
    color: '#047857',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '4px 0 16px 0',
  },
  successDetailsBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: '16px',
    width: '100%',
    padding: '14px',
    border: '1px solid #D1FAE5',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  detailKey: {
    color: '#065F46',
  },
  detailVal: {
    color: '#047857',
    fontWeight: 'bold',
  },
  autoRedirectBox: {
    color: '#6B7280',
    fontSize: '11px',
    marginTop: '10px',
  },
  backToAppLink: {
    backgroundColor: '#008CFF',
    color: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '14px',
    padding: '14px 28px',
    borderRadius: '12px',
    width: '100%',
    boxShadow: '0 4px 6px -1px rgba(59,130,246,0.2)',
  },
  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: '11px',
    padding: '20px',
  },
};
