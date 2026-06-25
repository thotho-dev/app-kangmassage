import type { Metadata } from 'next';
import { getAppSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi Mitra — Kang Massage',
  description: 'Kebijakan privasi untuk mitra terapis Kang Massage',
};

export default async function MitraPrivacyPage() {
  const settings = await getAppSettings();
  const { platform_name, support_email, support_whatsapp } = settings;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Kebijakan Privasi Mitra</h1>
        <p className="text-gray-400 text-sm mb-10">Terakhir diperbarui: 25 Juni 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Pendahuluan</h2>
            <p>
              {platform_name} (&quot;Kami&quot;, &quot;Platform&quot;) berkomitmen untuk melindungi privasi mitra terapis
              (&quot;Anda&quot;). Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
              menyimpan, dan melindungi data pribadi Anda saat menggunakan aplikasi {platform_name} Mitra.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Data yang Dikumpulkan</h2>
            <p className="mb-3">Kami mengumpulkan data berikut untuk keperluan layanan mitra terapis:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Data Akun:</strong> Nama lengkap, nomor telepon, alamat email, foto profil</li>
              <li><strong>Data Verifikasi:</strong> Foto KTP, informasi rekening bank, nomor rekening untuk pencairan saldo</li>
              <li><strong>Data Lokasi:</strong> Lokasi real-time (latar depan dan latar belakang) untuk menerima dan melacak pesanan terdekat</li>
              <li><strong>Data Kamera:</strong> Akses kamera untuk mengunggah foto profil, foto tempat kerja, atau dokumentasi pesanan</li>
              <li><strong>Data Audio:</strong> Akses mikrofon untuk fitur chat dukungan dan perekaman pesan suara</li>
              <li><strong>Data Perangkat:</strong> Model perangkat, sistem operasi, versi aplikasi, pengenal perangkat unik</li>
              <li><strong>Data Pesanan:</strong> Riwayat pesanan, rating, ulasan, data pembayaran dan penarikan saldo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Penggunaan Data</h2>
            <p className="mb-3">Data Anda digunakan untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Memproses pendaftaran dan verifikasi mitra terapis</li>
              <li>Mencocokkan Anda dengan pesanan pelanggan terdekat</li>
              <li>Melacak lokasi Anda secara real-time saat menuju dan memberikan layanan</li>
              <li>Memproses pembayaran, komisi, dan penarikan saldo (withdrawal)</li>
              <li>Mengirim notifikasi pesanan masuk, chat, dan pembaruan sistem</li>
              <li>Meningkatkan kualitas layanan dan pengalaman mitra</li>
              <li>Memenuhi kewajiban hukum dan regulasi yang berlaku</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Izin Aplikasi (Permissions)</h2>
            <p className="mb-3">Aplikasi {platform_name} Mitra memerlukan izin berikut. Data yang dikumpulkan melalui izin ini hanya digunakan untuk tujuan yang disebutkan:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Lokasi (Latarbelakang):</strong> Digunakan untuk mendeteksi pesanan di sekitar Anda dan melacak perjalanan ke lokasi pelanggan. Lokasi Anda akan terlihat oleh pelanggan saat Anda dalam perjalanan menuju lokasi pesanan.</li>
              <li><strong>Kamera:</strong> Digunakan untuk mengambil foto profil, mengunggah dokumentasi, dan fitur verifikasi identitas.</li>
              <li><strong>Mikrofon:</strong> Digunakan untuk fitur chat dan dukungan pelanggan yang memerlukan perekaman suara.</li>
              <li><strong>Notifikasi:</strong> Digunakan untuk menampilkan pesanan masuk dan pembaruan status secara real-time, termasuk notifikasi layar penuh saat aplikasi sedang tidak aktif.</li>
              <li><strong>Layanan Latar Depan (Foreground Service):</strong> Digunakan untuk menjaga koneksi real-time agar Anda tetap menerima notifikasi pesanan meskipun aplikasi sedang diminimalkan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Pembagian Data</h2>
            <p className="mb-3">Kami dapat membagikan data Anda kepada:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Pelanggan:</strong> Nama, foto profil, rating, dan lokasi real-time Anda dibagikan ke pelanggan yang memesan layanan Anda saat pesanan sedang berlangsung</li>
              <li><strong>Penyedia Pembayaran:</strong> Midtrans dan Xendit untuk pemrosesan pembayaran dan pencairan dana</li>
              <li><strong>Penyedia Layanan:</strong> Puter AI untuk fitur chat dukungan berbasis AI</li>
              <li><strong>Pemerintah:</strong> Jika diwajibkan oleh hukum atau peraturan yang berlaku</li>
            </ul>
            <p className="mt-3">Kami tidak menjual data pribadi Anda kepada pihak ketiga mana pun.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Penyimpanan & Keamanan</h2>
            <p>
              Data Anda disimpan di server yang aman dengan enkripsi SSL/TLS. Kami menerapkan langkah-langkah
              keamanan teknis dan organisasi yang wajar untuk melindungi data Anda dari akses tidak sah,
              perubahan, pengungkapan, atau perusakan. Akses ke data Anda dibatasi hanya untuk personel
              yang memerlukannya untuk menjalankan layanan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Retensi Data</h2>
            <p>
              Kami menyimpan data Anda selama akun mitra Anda aktif. Jika akun Anda dinonaktifkan atau
              dihapus, data pribadi Anda akan dihapus dalam waktu 30 hari, kecuali data yang wajib
              disimpan berdasarkan ketentuan hukum yang berlaku (seperti catatan transaksi keuangan
              yang wajib disimpan selama 5 tahun).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Hak Anda</h2>
            <p className="mb-3">Sebagai mitra terapis, Anda berhak untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Mengakses data pribadi yang kami simpan tentang Anda</li>
              <li>Memperbaiki data yang tidak akurat (nama, foto, informasi rekening)</li>
              <li>Menghapus akun mitra dan data pribadi Anda</li>
              <li>Menolak atau membatasi pengumpulan data lokasi (dapat memengaruhi kemampuan menerima pesanan)</li>
              <li>Menarik persetujuan pemrosesan data kapan saja</li>
              <li>Mengunduh data pribadi Anda dalam format yang dapat dibaca</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Perubahan Kebijakan</h2>
            <p>
              Kebijakan privasi ini dapat diperbarui sewaktu-waktu. Perubahan akan diumumkan melalui
              aplikasi {platform_name} Mitra dan berlaku segera setelah dipublikasikan. Dengan terus
              menggunakan aplikasi setelah perubahan, Anda menyetujui kebijakan yang diperbarui.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Kontak</h2>
            <p>
              Jika Anda memiliki pertanyaan atau kekhawatiran tentang kebijakan privasi ini atau
              cara kami menangani data Anda, hubungi kami:
              <br />
              Email: <a href={`mailto:${support_email}`} className="text-indigo-400 hover:underline">{support_email}</a>
              {support_whatsapp && (
                <>
                  <br />
                  WhatsApp:{' '}
                  <a
                    href={`https://wa.me/${support_whatsapp.replace(/[^0-9]/g, '')}`}
                    className="text-indigo-400 hover:underline"
                  >
                    {support_whatsapp}
                  </a>
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
