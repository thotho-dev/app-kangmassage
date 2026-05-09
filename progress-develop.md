# Progress Development - App Kang Massage

## [2026-05-10] - Skill Centralization & Smart Service Logic
 
 ### 🚀 Fitur Baru (Dashboard - Web)
 - **Centralized Service Type Management**: 
     - Memindahkan pengelolaan "Skill" ke halaman Layanan dan merubahnya menjadi **"Kelola Tipe Service"**.
     - Penambahan fitur **CRUD (Create, Read, Update, Delete)** untuk Tipe Service secara mandiri.
 - **Standardized Pricing Models**: 
     - Implementasi kolom `price_type` (`duration` atau `treatment`) pada setiap Tipe Service.
     - Setiap layanan sekarang secara otomatis mengikuti format perhitungan harga berdasarkan tipe service yang dipilih.
 - **Automated Combo Service Logic**: 
     - Sistem secara cerdas mendeteksi layanan "Paket Combo" (campuran Durasi & Treatment).
     - Layanan campuran otomatis diposisikan sebagai berbasis **Durasi**, namun secara implisit menyertakan **1 Treatment**.
     - UI dinamis: Menghapus switcher manual "Format Perhitungan Harga" karena sudah diotomatisasi oleh sistem.
 - **Dynamic Service Cards**: 
     - Menampilkan **semua opsi durasi/paket** beserta harganya secara transparan di kartu layanan.
     - Label status (**AKTIF/NONAKTIF**) diperbarui dengan warna solid dan kontras tinggi untuk visibilitas maksimal.
     - Indikator khusus (ikon Refresh oranye) untuk layanan combo.
 
 ### 🛠️ Arsitektur & i18n
 - **Localization Integration (i18n)**: Seluruh label manajemen tipe service telah diintegrasikan ke `LanguageContext` (Bahasa Indonesia & Inggris).
 - **API Refinement**: Penambahan method `PATCH` dan dukungan `price_type` pada endpoint `/api/skills`.
 
 ---
 
 ## [2026-05-09] - Advanced Tracking & Order Flow Refinement

### 🚀 Fitur Baru (Mobile - Tracking)
- **Interactive Map Integration**: Mengganti placeholder dengan `react-native-maps` sungguhan.
    - Marker khusus untuk **Lokasi Pengguna** (Tujuan) dan **Lokasi Terapis** (Live).
    - Map locking: Interaksi peta dikunci (scroll/zoom disabled) untuk fokus pada pergerakan terapis.
- **Premium Bottom Sheet Gestures**:
    - Implementasi `PanResponder` untuk swipe down/up pada kartu status pesanan.
    - Animasi transisi halus: Header memudar (fade out) dan kartu info terapis bergeser ke atas saat peta dibuka penuh.
    - Fitur **Auto-Snap**: Kartu otomatis memantul (*spring*) ke posisi terdekat saat dilepas.
- **Detail Pesanan Terintegrasi**: Penambahan ringkasan layanan, durasi, dan metode pembayaran langsung di dalam halaman tracking (scrollable).

### 🎨 UI/UX Refinement
- **Text Area Input**: Mengubah "Catatan Layanan" dan "Catatan Lokasi" di halaman Order menjadi multiline text area untuk input yang lebih leluasa.
- **History Screen Rewrite**:
    - Standardisasi font ke keluarga **Inter** (Bold, SemiBold, Medium).
    - Penyelarasan header (tanpa tombol back karena merupakan tab utama).
    - Layout kartu riwayat yang lebih compact dan profesional.

## [2026-05-08] - UI Modernization & Smart Components

### 🛠️ Komponen Cerdas
- **Custom Date & Time Picker**:
    - Implementasi logika *disabled* untuk tanggal dan waktu yang sudah lewat.
    - Auto-snap ke waktu valid terdekat jika pengguna memilih waktu lampau.
    - Default waktu otomatis dibulatkan ke kelipatan 5 menit berikutnya.
- **Modern Wallet UI**:
    - Rebranding label: Pemasukan/Pengeluaran menjadi **Poin** dan **Cash Back**.
    - Penyelarasan header dan tipografi global agar konsisten dengan halaman lain.

---

## [2026-05-07] - Real Data, Chat System & Financial Automation

### 🚀 Fitur Baru (Mobile)
- **Data Real Integration**: Implementasi data dari Supabase untuk tab **Pesanan, Pendapatan, dan Chat** (menggantikan data mock).
- **Sistem Chat Real-time**: 
    - Implementasi tabel `conversations` dan `messages` di database.
    - Halaman **Detail Chat** dengan dukungan Supabase Realtime (pesan muncul instan).
    - Integrasi chat langsung dari tombol di halaman Detail Pesanan.
    - Indikator pesan belum dibaca (*unread count*) yang akurat.
- **Otomasi Keuangan (Bagi Hasil)**: 
    - Trigger database untuk pembagian bagi hasil otomatis (**80% Terapis, 20% Platform**) saat pesanan selesai.
    - Pencatatan saldo neto otomatis ke dompet terapis.
    - Log transaksi otomatis ke dalam riwayat pendapatan.
- **Sistem Withdraw (Iris)**: Integrasi Midtrans Iris untuk penarikan saldo instan ke rekening bank.

### 🎨 UI/UX Modernization (Light Mode)
- **Standardisasi Header Global**: Implementasi estetika "Light Mode" (header putih dengan garis pembatas bawah) di seluruh aplikasi.
- **Refinement Tombol Disabled**: Peningkatan kontras teks dan ikon pada tombol status *disabled* di Mode Terang.
- **Pull-to-Refresh**: Implementasi penyegaran data di tab Pesanan, Pendapatan, dan Chat.

### 🛡️ Keamanan & Database
- **Perbaikan Enum Status**: Penambahan status `arrived` (Tiba di Lokasi) pada database.
- **Perbaikan RLS Policies**: Penambahan aturan akses untuk tabel `order_logs`, `conversations`, dan `messages`.

---

## [2026-05-06] - Therapist Topup & Payment Integration

### 🚀 Fitur Baru (Mobile)
- **Integrasi Midtrans Core API**: Migrasi dari Snap ke Core API untuk pembayaran in-app.
- **Halaman Riwayat Top Up**: Fitur pelacakan transaksi dengan status Sukses, Pending, dan Gagal.
- **Fitur Batal Otomatis (Timer)**: Countdown 5 menit untuk transaksi pending.
- **Notifikasi Real-time**: Update saldo instan via Supabase Realtime.

---

## 📅 Roadmap Mendatang
- [ ] **QRIS Payment Collection**: Terapis dapat menerima pembayaran via QRIS secara langsung dari pelanggan.
- [ ] **Push Notifications (Chat)**: Notifikasi pesan baru saat aplikasi sedang ditutup/di background.
- [ ] **Foto Profile & Galeri**: Fitur unggah sertifikat atau portofolio terapis.
- [ ] **Ulasan & Rating**: Integrasi ulasan bintang dari pelanggan setelah sesi selesai.

*Dokumen ini diperbarui secara berkala seiring berjalannya pengembangan.*
