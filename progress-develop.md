# Progress Development - App Kang Massage

## [2026-05-06] - Therapist Topup & Payment Integration

### 🚀 Fitur Baru (Mobile)
- **Integrasi Midtrans Core API**: Migrasi dari Snap ke Core API untuk pengalaman pembayaran yang seamless tanpa keluar dari aplikasi.
- **Halaman Instruksi Pembayaran (Custom UI)**: Layar penuh yang menampilkan Nomor VA, QRIS, dan Kode Pembayaran dengan tema Deep Blue yang konsisten.
- **Halaman Riwayat Top Up**: Fitur pelacakan transaksi dengan status Sukses, Pending, dan Gagal.
- **Fitur Batal Otomatis (Timer)**: Implementasi countdown 5 menit untuk transaksi pending. Transaksi otomatis gagal jika tidak dibayar tepat waktu.
- **Ringkasan Pembayaran**: Penambahan rincian biaya admin (Rp 2.500) dan total bayar sebelum checkout.
- **Pull-to-Refresh**: Sinkronisasi data real-time pada halaman Home, Profil, dan Riwayat.

### 🎨 UI/UX Enhancements
- **Sistem Accordion**: Pengelompokan metode pembayaran (E-Wallet, VA, Retail) agar tampilan lebih ringkas.
- **Logo Brand**: Penambahan logo resmi Bank dan E-Wallet untuk mempermudah identifikasi metode pembayaran.
- **Format Ribuan (Dots)**: Input saldo otomatis menggunakan pemisah titik (contoh: 50.000).
- **Reset Form Otomatis**: Form top-up akan selalu bersih saat halaman dibuka kembali.
- **Navigasi Cerdas**: Tombol kembali pada halaman Instruksi dan Riwayat diarahkan langsung ke Dashboard/Home.

### 🛡️ Keamanan & Validasi
- **Proteksi Transaksi Ganda**: Mencegah pembuatan transaksi baru jika masih ada transaksi berstatus "Pending".
- **Validasi Nominal Minimal**: Membatasi top-up minimal sebesar Rp 20.000.
- **RLS Supabase Policies**: Penerapan kebijakan keamanan (Select & Update) untuk memastikan terapis hanya bisa melihat dan mengelola data mereka sendiri.

### ⚙️ Backend & API (Vercel)
- **Webhook Midtrans**: Sinkronisasi otomatis saldo wallet terapis saat pembayaran berhasil (Settlement).
- **Core API Charge**: Endpoint khusus untuk menangani permintaan pembayaran langsung ke Midtrans.
- **Logging Transaksi**: Penyimpanan data respon Midtrans (VA/QRIS) ke database agar bisa diakses kembali melalui fitur "Lanjut Bayar".

---
## 📅 Future Roadmap
- [ ] **QRIS Payment Collection**: Fitur agar terapis bisa menerima pembayaran langsung dari pelanggan via QRIS yang terintegrasi ke saldo aplikasi.
- [ ] **Sistem Withdraw (Tarik Dana)**: Integrasi Midtrans Iris untuk memudahkan terapis mencairkan saldo ke rekening bank mereka secara instan.
- [ ] **Notifikasi Real-time**: Push notification saat ada pembayaran masuk atau status top-up berubah.

*Dokumen ini diperbarui secara berkala seiring berjalannya pengembangan.*
