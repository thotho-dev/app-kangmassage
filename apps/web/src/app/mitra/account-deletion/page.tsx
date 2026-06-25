import type { Metadata } from 'next';
import { getAppSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Penghapusan Akun Mitra — Kang Massage',
  description: 'Panduan penghapusan akun mitra terapis Kang Massage',
};

export default async function AccountDeletionPage() {
  const settings = await getAppSettings();
  const { platform_name, support_email, support_whatsapp } = settings;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-2">Penghapusan Akun Mitra</h1>
        <p className="text-gray-400 text-sm mb-10">Terakhir diperbarui: 25 Juni 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Cara Meminta Penghapusan Akun</h2>
            <p className="mb-3">
              Untuk menghapus akun mitra {platform_name} Anda, ikuti langkah-langkah berikut:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>Hubungi tim dukungan kami</strong> melalui salah satu saluran di bawah (email atau WhatsApp).
              </li>
              <li>
                <strong>Sertakan informasi berikut:</strong>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Nama lengkap terdaftar</li>
                  <li>Nomor telepon yang terdaftar</li>
                  <li>Alasan penghapusan akun (opsional)</li>
                </ul>
              </li>
              <li>
                <strong>Verifikasi identitas:</strong> Tim dukungan akan memverifikasi identitas Anda melalui nomor telepon atau email yang terdaftar.
              </li>
              <li>
                <strong>Konfirmasi:</strong> Setelah verifikasi, tim kami akan memproses penghapusan akun dan memberi konfirmasi melalui email atau WhatsApp.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Data yang Akan Dihapus</h2>
            <p className="mb-3">Setelah akun Anda dihapus, data berikut akan dihapus secara permanen:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Data profil (nama, nomor telepon, email, foto profil)</li>
              <li>Dokumen verifikasi (foto KTP)</li>
              <li>Informasi rekening bank</li>
              <li>Riwayat lokasi dan pelacakan</li>
              <li>Riwayat pesanan yang sudah selesai</li>
              <li>Rating dan ulasan dari pelanggan</li>
              <li>Riwayat chat dengan pelanggan</li>
              <li>Token notifikasi perangkat</li>
              <li>Data sesi login dan preferensi aplikasi</li>
            </ul>
            <p className="mt-3 text-amber-400 text-sm">
              Penghapusan bersifat permanen dan tidak dapat dibatalkan. Saldo dompet yang tersisa harus ditarik terlebih dahulu sebelum penghapusan akun.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Data yang Disimpan (Retensi)</h2>
            <p className="mb-3">
              Berdasarkan ketentuan hukum yang berlaku di Indonesia, beberapa data WAJIB disimpan meskipun akun telah dihapus:
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 pr-4 text-white font-semibold">Jenis Data</th>
                  <th className="text-left py-2 text-white font-semibold">Periode Retensi</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">Catatan transaksi keuangan (pembayaran, komisi, penarikan saldo)</td>
                  <td className="py-2">5 tahun (wajib pajak)</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">Data pesanan untuk kepentingan hukum dan audit</td>
                  <td className="py-2">5 tahun</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-2 pr-4">Log aktivitas dan keamanan sistem</td>
                  <td className="py-2">90 hari</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Data yang dianonimkan (statistik internal, tidak dapat dikaitkan dengan individu)</td>
                  <td className="py-2">Selamanya (tanpa identitas pribadi)</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-gray-400 text-sm">
              Data yang disimpan tidak lagi mengandung informasi identitas pribadi yang aktif dan hanya digunakan untuk keperluan kepatuhan hukum dan audit internal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Waktu Pemrosesan</h2>
            <p>
              Permintaan penghapusan akun akan diproses dalam waktu maksimal <strong>7&times;24 jam</strong> setelah
              identitas Anda terverifikasi. Kami akan mengirimkan konfirmasi setelah proses penghapusan selesai.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Pembatalan Permintaan</h2>
            <p>
              Jika Anda berubah pikiran sebelum proses penghapusan selesai, Anda dapat menghubungi tim dukungan
              untuk membatalkan permintaan. Setelah akun dihapus, pemulihan tidak dapat dilakukan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Kontak Dukungan</h2>
            <p>
              Kirim permintaan penghapusan akun melalui saluran berikut:
              <br />
              Email: <a href={`mailto:${support_email}`} className="text-indigo-400 hover:underline">{support_email}</a>
              {support_whatsapp && (
                <>
                  <br />
                  WhatsApp:{' '}
                  <a
                    href={`https://wa.me/${support_whatsapp.replace(/[^0-9]/g, '')}`}
                    className="text-indigo-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
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
