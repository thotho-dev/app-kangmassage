import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — Kang Massage',
  description: 'Kebijakan privasi untuk aplikasi Kang Massage',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Kebijakan Privasi</h1>
        <p className="text-gray-400 text-sm mb-10">Terakhir diperbarui: 20 Juni 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Pendahuluan</h2>
            <p>
              Kang Massage (&quot;Kami&quot;, &quot;Platform&quot;) berkomitmen untuk melindungi privasi pengguna
              (&quot;Anda&quot;). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
              menyimpan, dan melindungi data pribadi Anda saat menggunakan aplikasi Kang Massage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Data yang Dikumpulkan</h2>
            <p className="mb-3">Kami dapat mengumpulkan data berikut:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Data Akun:</strong> Nama lengkap, nomor telepon, email, alamat, foto profil</li>
              <li><strong>Data Lokasi:</strong> Lokasi real-time untuk mencari terapis terdekat</li>
              <li><strong>Data Pesanan:</strong> Riwayat pemesanan layanan, metode pembayaran, ulasan</li>
              <li><strong>Data Perangkat:</strong> Model perangkat, sistem operasi, versi aplikasi</li>
              <li><strong>Data Identitas:</strong> Foto KTP (khusus pengguna terapis untuk verifikasi)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Penggunaan Data</h2>
            <p className="mb-3">Data Anda digunakan untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Memproses dan mengelola pemesanan layanan pijat</li>
              <li>Mencocokkan Anda dengan terapis terdekat</li>
              <li>Memproses pembayaran dan penarikan saldo</li>
              <li>Mengirim notifikasi terkait pesanan dan chat</li>
              <li>Meningkatkan kualitas layanan dan pengalaman pengguna</li>
              <li>Memenuhi kewajiban hukum dan regulasi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Pembagian Data</h2>
            <p className="mb-3">Kami dapat membagikan data Anda kepada:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Terapis:</strong> Nama, alamat, dan nomor telepon Anda diberikan ke terapis yang menerima pesanan Anda</li>
              <li><strong>Pihak Ketiga:</strong> Penyedia pembayaran (Midtrans/Xendit) untuk pemrosesan transaksi</li>
              <li><strong>Pemerintah:</strong> Jika diwajibkan oleh hukum atau peraturan yang berlaku</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Penyimpanan & Keamanan</h2>
            <p>
              Data Anda disimpan di server yang aman dengan enkripsi SSL/TLS. Kami menerapkan langkah-langkah
              keamanan teknis dan organisasi yang wajar untuk melindungi data Anda dari akses tidak sah,
              perubahan, pengungkapan, atau perusakan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Retensi Data</h2>
            <p>
              Kami menyimpan data Anda selama akun Anda aktif. Jika Anda menghapus akun, data pribadi Anda
              akan dihapus dalam waktu 30 hari, kecuali data yang wajib disimpan berdasarkan ketentuan hukum
              yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Hak Anda</h2>
            <p className="mb-3">Anda berhak untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Mengakses data pribadi yang kami simpan</li>
              <li>Memperbaiki data yang tidak akurat</li>
              <li>Menghapus akun dan data pribadi Anda</li>
              <li>Menolak pengumpulan data tertentu (misalnya lokasi)</li>
              <li>Menarik persetujuan pemrosesan data kapan saja</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Perubahan Kebijakan</h2>
            <p>
              Kebijakan privasi ini dapat diperbarui sewaktu-waktu. Perubahan akan diumumkan melalui
              aplikasi dan berlaku segera setelah dipublikasikan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Kontak</h2>
            <p>
              Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, hubungi kami di:
              <br />
              Email: <a href="mailto:admin@kangmassage.com" className="text-indigo-400 hover:underline">admin@kangmassage.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
