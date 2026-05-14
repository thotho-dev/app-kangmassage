# Progress Development - App Kang Massage

## [2026-05-13] - Broadcast Matchmaking & Precision Tracking Refinement

### 🚀 Sistem Matchmaking "Rebutan" (Broadcast Mode)
- **Broadcast System Implementation**: 
    - Migrasi logika pencarian terapis dari sistem penunjukan tunggal ke **Sistem Broadcast (Rebutan)**. Pesanan kini muncul serentak di semua terapis yang memenuhi kriteria dalam radius 3km.
    - **Smart Filtering Logic**:
        - **Radius & Lokasi**: Hanya terapis dalam jangkauan 3km dari pelanggan yang menerima notifikasi.
        - **Saldo Minimal**: Filter saldo wallet minimal Rp 15.000 untuk memastikan terapis bisa membayar bagi hasil platform.
        - **Status Kesibukan (Busy Filter)**: Terapis yang sedang menjalankan pesanan (`accepted`, `on_site`, `in_progress`) tidak akan menerima notifikasi broadcast baru.
        - **Gender Matching**: Filter otomatis berdasarkan preferensi gender yang diminta pelanggan.
    - **Concurrency Control**: Implementasi *atomic update* di Supabase untuk memastikan pesanan hanya bisa diambil oleh satu terapis tercepat, mencegah terjadinya *double-booking*.

### 📱 Tracking & Map Precision
- **Route Snapping Fix**: Penambahan logika "Push Coordinate" pada ujung rute OSRM untuk memastikan garis hijau rute menyentuh tepat pada titik pin pelanggan, menghilangkan celah visual antara jalan raya dan lokasi tujuan.
- **Active GPS Synchronization**: Tombol **Refresh Map** kini memicu pembaruan lokasi GPS terapis secara aktif ke database `therapist_locations` dan sinkronisasi ulang data pesanan dari Supabase.

### 🎨 UI/UX Refinement (Chat & Details)
- **Full SafeArea Integration (Chat)**:
    - Implementasi `SafeAreaView` (Top & Bottom edges) pada halaman percakapan User dan Terapis.
    - Resolusi masalah header tertutup poni (*notch*) dan input chat yang tertutup bar navigasi bawah pada perangkat Android modern.
- **Keyboard Avoiding Optimization**: 
    - Perbaikan `KeyboardAvoidingView` dengan mode `height` di Android untuk memastikan kolom input naik mengikuti keyboard dengan presisi.
    - Penghapusan jarak kosong (*gap*) di bawah input saat keyboard aktif.
- **Enhanced Order Details**:
    - Penambahan field **Petunjuk Lokasi** (`location_notes`) dan **Catatan Layanan** (`service_notes`) pada halaman detail pesanan terapis.
    - Layout catatan layanan diletakkan tepat di bawah jenis layanan untuk alur informasi yang lebih logis bagi terapis.

### 🎨 Sistem UI & Custom Alerts
- **Premium Custom Alert System**:
    - Migrasi seluruh notifikasi pesan standar (`Alert.alert`) ke **Sistem Alert Kustom** yang lebih premium.
    - Desain alert modern dengan dukungan kategori (Success, Error, Warning, Info) dan animasi spring yang halus.
    - Implementasi `alertStore` (Zustand) untuk memicu alert secara global dari logika bisnis manapun tanpa ketergantungan pada komponen UI lokal.
    - **Backward Compatibility Hook**: Pembuatan hook `useAlert` untuk memastikan seluruh fitur lama otomatis menggunakan desain alert baru tanpa perlu perombakan kode besar-besaran.
    - Penambahan dialog konfirmasi pembatalan pesanan (Confirmation Modal) untuk mencegah aksi pembatalan yang tidak disengaja oleh terapis.

---

## [2026-05-12] - Map Hybrid Evolution & Real-time Tracking

### 📱 Evolusi Peta (Hybrid WebView)
- **WebView Map Integration (Leaflet)**: 
    - Migrasi dari `react-native-maps` ke **WebView Map** berbasis Leaflet. Solusi ini menjamin peta tampil 100% di **Expo Go** tanpa eror `RNMapsAirModule`.
    - **Custom Avatar Pins**: Marker peta kini menggunakan **foto profil asli** terapis dan pelanggan yang dibungkus dalam desain pin lokasi yang stylish.
    - **Real-time Route (Green Solid)**: Penambahan visualisasi rute jalan raya berwarna hijau solid yang menghubungkan kedua titik lokasi.
- **Dynamic Full View (90% Height)**:
    - Fitur untuk memperluas peta hingga **90% tinggi layar** dengan menyembunyikan komponen detail lainnya secara otomatis.
    - Tombol **Swipe Status** tetap dipertahankan di bagian bawah saat mode Full View untuk memudahkan perubahan status pesanan sambil navigasi.
    - Tombol kontrol (Expand/Close) yang responsif di pojok kanan atas peta.
- **Precision Tracking**:
    - Implementasi `Location.watchPositionAsync` untuk pelacakan posisi terapis secara live dan otomatis.
    - Kalkulasi jarak akurat berdasarkan rute jalan raya (driving distance) dari API OSRM yang diupdate secara real-time.
- **UI/UX Polishing**:
    - **Parallax Scroll Effect**: Peta kini memiliki efek paralaks saat discroll, memberikan kesan kedalaman (*depth*) yang premium.
    - **Refined Swipe Button**: Tombol swipe dibuat lebih presisi dengan **shadow khusus** hanya pada bagian bulatan (*thumb*) agar terlihat menonjol dan taktil.
    - **Optimal Button Placement**: Tombol Close pada mode Full View dipindahkan ke sebelah kanan sesuai standar kenyamanan pengguna.

### 🛠️ Troubleshooting & Configuration
- **Expo Go Compatibility**: Resolusi total masalah native module dengan pendekatan hybrid.
- **Clean Configuration**: Pembersihan plugin `react-native-maps` di `app.json` yang tidak diperlukan untuk lingkungan Expo Go.

---

## [2026-05-11] - Therapist Tracking Optimization & UI Enhancement

### 📱 Optimasi Tracking (Therapist App)
- **Map Stabilization & External Integration**:
    - Menghapus internal `MapView` (`react-native-maps`) untuk mencegah crash pada modul native di beberapa perangkat.
    - Implementasi tombol **"Buka di Aplikasi Maps"** yang menghubungkan terapis langsung ke Google Maps atau Apple Maps untuk navigasi yang lebih akurat.
- **Redesain Detail Pesanan (Single Column)**:
    - Re-layout informasi pesanan dari format grid 2-kolom menjadi **1-kolom vertikal** yang lebih bersih dan konsisten dengan desain alamat.
    - Penambahan informasi **Gender Pelanggan** (Laki-laki/Perempuan) untuk persiapan terapis sebelum layanan.
    - Penambahan **Waktu Pemesanan** (Tanggal & Jam) yang lebih detail.
    - Implementasi ikon premium (Sparkles, Clock, Calendar, Person) untuk setiap poin informasi.
    - **Stylized Note Box**: Kotak catatan pelanggan yang lebih menonjol dengan gaya tulisan miring (*italic*).
    - **Payment Summary Card**: Ringkasan pembayaran yang lebih jelas dengan label metode (E-Wallet/Tunai) dan total tagihan yang kontras.
- **SwipeButton Logic Fix**:
    - Perbaikan bug di mana tombol geser (*swipe button*) menjadi statis setelah penggunaan pertama.
    - Implementasi `key` prop dinamis untuk memastikan tombol otomatis reset (kembali ke posisi awal) di setiap perubahan status pesanan.

### 🛠️ UI/UX & Bug Fixes
- **Typography & Spacing**: Penyesuaian ukuran font, label (contoh: "Alamat Customer"), dan margin untuk meningkatkan legibilitas pada ringkasan pembayaran.
- **TypeScript Stability**: Perbaikan error `Property does not exist` setelah proses refactoring gaya (*styling*).

---

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
 
 ### 📱 Refinement Pembayaran & Tracking (User App)
 - **Midtrans Core API Integration**: 
     - Migrasi penuh dari WebView ke **In-App Payment Instructions**.
     - Tampilan dinamis untuk Virtual Account (BCA, Mandiri, Permata, dll) dan QRIS (Gopay) langsung di dalam aplikasi.
     - Perbaikan bug harga (NaN) dan penanganan data pembayaran yang lebih stabil.
 - **Searching Therapist State**: 
     - Implementasi halaman **"Mencari Terapis"** baru dengan animasi pulsing premium.
     - Sistem otomatis mengalihkan user ke Tracking begitu terapis ditemukan via Supabase Realtime.
     - Penambahan fitur "Batalkan Pesanan" saat proses pencarian.
 - **Real-time Tracking Evolution**: 
     - Timeline status kini tersinkronisasi dengan tabel **`order_logs`**, bukan sekadar status statis.
     - Penambahan **Timestamp (Waktu)** pada setiap perubahan status di timeline.
     - Indikator unit layanan dinamis: Menampilkan "1 Treatment" atau "X Menit" sesuai tipe layanan.
 - **Smart History Navigation**: 
     - Kartu riwayat kini cerdas: Klik kartu akan mengarahkan user ke halaman yang tepat (Instruksi Bayar / Cari Terapis / Tracking) berdasarkan kondisi terkini pesanan.
     - Implementasi **Pull-to-Refresh** di halaman Riwayat untuk update data manual.
 - **UI/UX Polishing**: 
     - Penambahan icon pada pilihan Waktu Booking, Jenis Kelamin, dan Preferensi Terapis.
     - Implementasi indikator loading (ActivityIndicator) pada proses pembuatan pesanan.
 
 ### 📱 Bug Fixes & Stabilization (Therapist App)
 - **Tracking Module Restoration**:
     - Perbaikan navigasi `app/orders/[id].tsx` yang sebelumnya mengalami "Unmatched Route".
     - Resolusi error `Invariant Violation` pada modul peta dengan menstandarisasi konfigurasi `react-native-maps`.
     - Pembersihan TypeScript errors dan warning tipe `any` pada logika tracking.
     - Perbaikan tampilan Logo dan aset gambar yang sebelumnya tidak muncul.
 
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
