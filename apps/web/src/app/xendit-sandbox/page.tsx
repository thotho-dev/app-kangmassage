'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function XenditSandboxContent() {
  const searchParams = useSearchParams();
  const topupId = searchParams.get('id');
  const rawAmount = searchParams.get('amount');
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState('QRIS');
  const [countdown, setCountdown] = useState(5);

  const displayAmount = rawAmount ? parseInt(rawAmount) : 0;

  const handlePayment = async () => {
    if (!topupId || !orderId) {
      setError('ID Transaksi tidak valid.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate Xendit Webhook locally
      const response = await fetch('/api/payments/xendit-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-callback-token': 'dummytoken' // Webhook verification bypass token
        },
        body: JSON.stringify({
          id: `xendit-inv-${topupId.slice(0, 8)}`,
          external_id: orderId,
          status: 'PAID',
          amount: displayAmount,
          paid_amount: displayAmount,
          payment_channel: selectedChannel,
          updated: new Date().toISOString()
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Gagal memproses simulasi pembayaran Xendit.');
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
    if (success && orderId) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            let deepLink = 'kangmassage://wallet';
            if (orderId.startsWith('TOPUP-')) {
              deepLink = 'kang-massage-therapist://profile/topup-history';
            } else if (orderId.startsWith('UTOPUP-')) {
              deepLink = 'kangmassage://wallet';
            } else {
              // Order payment or QRIS — redirect back to order detail in therapist app
              deepLink = `kang-massage-therapist://orders/${orderId}`;
            }
            window.location.href = deepLink;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [success, orderId]);

  const channels = ['QRIS', 'BCA_VA', 'MANDIRI_VA', 'BNI_VA', 'BRI_VA', 'DANA', 'SHOPEEPAY', 'ALFAMART', 'INDOMARET'];

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Top Banner Xendit */}
      <div style={styles.header}>
        <div style={styles.headerLogoContainer}>
          <span style={styles.xenditText}>xendit</span>
          <span style={styles.sandboxBadge}>INVOICE SANDBOX</span>
        </div>
      </div>

      <div style={styles.cardContainer}>
        {!success ? (
          /* Checkout Interface */
          <div style={styles.paymentCard}>
            <div style={styles.merchantSection}>
              <div style={styles.merchantLabel}>Merchant</div>
              <div style={styles.merchantName}>KangMassage On-Demand</div>
              <div style={styles.orderIdText}>Order ID: {orderId || 'TOPUP-xxxxxxxx'}</div>
            </div>

            <div style={styles.amountSection}>
              <div style={styles.amountLabel}>Total Tagihan</div>
              <div style={styles.amountValue}>Rp {displayAmount.toLocaleString('id-ID')}</div>
            </div>

            <div style={styles.inputCard}>
              <div style={styles.inputLabel}>Pilih Simulasi Metode Pembayaran</div>
              <div style={styles.gridContainer}>
                {channels.map((chan) => (
                  <button
                    key={chan}
                    onClick={() => setSelectedChannel(chan)}
                    style={{
                      ...styles.channelBtn,
                      backgroundColor: selectedChannel === chan ? '#5056C2' : '#F3F4F6',
                      color: selectedChannel === chan ? '#FFFFFF' : '#374151',
                      border: selectedChannel === chan ? '1.5px solid #5056C2' : '1.5px solid #D1D5DB',
                    }}
                  >
                    {chan.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div style={styles.sandboxInfoBox}>
                💡 <b>Mode Simulasi Xendit:</b> Tombol ini memicu route webhook lokal secara langsung untuk mengkreditkan saldo secara instan pada server lokal Anda.
              </div>
            </div>

            {error && <div style={styles.errorText}>{error}</div>}

            <button
              onClick={handlePayment}
              disabled={loading}
              style={{
                ...styles.payButton,
                backgroundColor: loading ? '#C7D2FE' : '#5056C2',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner}></div>
                  <span>Memproses Simulasi Xendit...</span>
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

            <h2 style={styles.successTitle}>Simulasi Sukses!</h2>
            <p style={styles.successSubtitle}>
              Saldo sebesar <b>Rp {displayAmount.toLocaleString('id-ID')}</b> telah didepositkan ke akun Anda menggunakan webhook Xendit Invoice.
            </p>

            <div style={styles.successDetailsBox}>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Merchant:</span>
                <span style={styles.detailVal}>KangMassage</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Metode:</span>
                <span style={styles.detailVal}>{selectedChannel.replace('_', ' ')}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailKey}>Invoice ID:</span>
                <span style={{ ...styles.detailVal, fontSize: '11px', fontFamily: 'monospace' }}>xendit-inv-{topupId?.slice(0, 8)}</span>
              </div>
            </div>

            <div style={styles.autoRedirectBox}>
              Mengalihkan kembali ke aplikasi dalam <b>{countdown}</b> detik...
            </div>

            <a 
              href={orderId?.startsWith('TOPUP-') ? "kang-massage-therapist://profile/topup-history" : orderId?.startsWith('UTOPUP-') ? "kangmassage://wallet" : `kang-massage-therapist://orders/${orderId}`} 
              style={styles.backToAppLink}
            >
              Kembali Ke Aplikasi Sekarang
            </a>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        Xendit Checkout Simulator &bull; Mode Uji Coba Pengembang
      </div>
    </div>
  );
}

export default function XenditSandboxPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h3>Memuat Xendit Sandbox Simulator...</h3>
      </div>
    }>
      <XenditSandboxContent />
    </Suspense>
  );
}

// Custom CSS styles modeling Xendit's sleek design
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FAF9FB',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    backgroundColor: '#1C2B59',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerLogoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  xenditText: {
    color: '#FFFFFF',
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  sandboxBadge: {
    fontSize: '10px',
    backgroundColor: '#FFBE00',
    color: '#1C2B59',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  cardContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '460px',
    padding: '32px',
    boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06), 0 2px 12px -2px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    border: '1px solid #E5E7EB',
  },
  successCard: {
    alignItems: 'center',
    textAlign: 'center',
  },
  merchantSection: {
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '16px',
  },
  merchantLabel: {
    color: '#9CA3AF',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  merchantName: {
    color: '#1F2937',
    fontSize: '20px',
    fontWeight: 700,
  },
  orderIdText: {
    color: '#6B7280',
    fontSize: '13px',
    marginTop: '4px',
  },
  amountSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #E5E7EB',
  },
  amountLabel: {
    color: '#4B5563',
    fontSize: '14px',
    fontWeight: 'medium',
  },
  amountValue: {
    color: '#111827',
    fontSize: '24px',
    fontWeight: 800,
  },
  inputCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputLabel: {
    color: '#374151',
    fontSize: '14px',
    fontWeight: 700,
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  channelBtn: {
    padding: '10px 4px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  },
  sandboxInfoBox: {
    backgroundColor: '#EEF2FF',
    borderLeft: '4px solid #4F46E5',
    color: '#3730A3',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '12px',
    lineHeight: '18px',
    marginTop: '8px',
  },
  errorText: {
    color: '#EF4444',
    fontSize: '13px',
    fontWeight: 'medium',
  },
  payButton: {
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    padding: '18px',
    fontSize: '16px',
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
    padding: '16px',
    borderRadius: '50%',
    width: 'fit-content',
    marginBottom: '8px',
  },
  successTitle: {
    color: '#065F46',
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
  },
  successSubtitle: {
    color: '#047857',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '6px 0 20px 0',
  },
  successDetailsBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: '12px',
    width: '100%',
    padding: '16px',
    border: '1px solid #D1FAE5',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
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
    fontSize: '12px',
    marginTop: '12px',
  },
  backToAppLink: {
    backgroundColor: '#5056C2',
    color: '#FFFFFF',
    textDecoration: 'none',
    fontWeight: 'bold',
    fontSize: '15px',
    padding: '14px 28px',
    borderRadius: '10px',
    width: '100%',
    boxShadow: '0 4px 6px -1px rgba(80, 86, 194, 0.2)',
    marginTop: '12px',
  },
  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: '12px',
    padding: '24px',
  },
};
