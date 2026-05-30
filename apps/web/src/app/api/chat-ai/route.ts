import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface HistoryItem {
  role: 'user' | 'model';
  text: string;
}

const SYSTEM_PROMPT = `Kamu adalah asisten support untuk aplikasi Pijat On-Demand (Kang Massage).
Tugasmu membantu para terapis yang bertanya tentang platform ini.

Panduan menjawab:
- Jawab dengan bahasa Indonesia yang ramah dan santun
- sebut nama akun supaya terapis tau kalau ini dari admin resmi
- Berikan informasi yang akurat dan singkat
- Jika masalah memerlukan campur tangan admin (contoh: masalah pembayaran, sengketa pesanan, akun diblokir), katakan bahwa kamu akan menghubungkan dengan admin

FITUR APLIKASI YANG BISA DIGUNAKAN TERAPIS:
1. Online/Offline Toggle — kontrol ketersediaan untuk menerima order
2. Terima/Tolak Order — order masuk via broadcast, waktu respon 5 menit
3. Status Pesanan — geser: Diterima → Menuju Lokasi → Tiba → Proses → Selesai
4. Live GPS — lokasi real-time dengan rute ke pelanggan
5. Telepon & Chat Pelanggan — hubungi pelanggan saat pesanan aktif
6. Dashboard Penghasilan — lihat penghasilan, total pesanan, komisi
7. Top Up Saldo — via GoPay/QRIS, DANA, ShopeePay, VA, Alfamart/Indomaret
8. Withdraw ke Bank — min Rp 50.000, fee Rp 5.000, proses 1x24 jam
9. Sistem Tier — Bronze 27% → Silver 25% → Gold 23% → Platinum 21% → Diamond 20%
10. Manajemen Profil — edit nama, telepon, alamat, spesialisasi, rekening bank
11. Notifikasi Real-time — order baru, top up sukses, pesan support
12. Chat Admin — hubungi admin jika AI tidak bisa membantu
13. Privacy Shield — alamat pelanggan disembunyikan setelah selesai/dibatalkan

KETENTUAN PENTING:
- Minimal saldo untuk mendapat order: Rp 15.000
- Waktu respon order: 5 menit, jika lewat dibatalkan
- Withdraw: min Rp 50.000, proses 1x24 jam
- Top up: min Rp 10.000, max Rp 2.000.000

JANGAN pernah memberikan informasi palsu. Jika tidak tahu jawabannya, akui saja dan sarankan untuk menghubungi admin.`;

const PUTER_API = 'https://api.puter.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = body as { message: string; history?: HistoryItem[] };

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Ambil settings dari database untuk token + model dinamis
    const adminClient = createAdminClient();
    const { data: settings } = await adminClient
      .from('app_settings')
      .select('puter_auth_token, puter_model_name')
      .limit(1)
      .single();

    const token = settings?.puter_auth_token || process.env.PUTER_AUTH_TOKEN || '';
    if (!token) {
      return NextResponse.json({ error: 'PUTER_AUTH_TOKEN not configured' }, { status: 500 });
    }

    const model = settings?.puter_model_name || 'deepseek/deepseek-v4-flash';

    const mappedHistory = (history || []).map(h => ({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.text,
    }));

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...mappedHistory,
      { role: 'user', content: message },
    ];

    const puterRes = await fetch(`${PUTER_API}/drivers/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;actually=json' },
      body: JSON.stringify({
        interface: 'puter-chat-completion',
        driver: 'ai-chat',
        method: 'complete',
        args: {
          messages,
          model,
          temperature: 0.7,
          max_tokens: 2048,
        },
        auth_token: token,
      }),
    });

    if (!puterRes.ok) {
      const errText = await puterRes.text();
      console.error('Puter API error:', puterRes.status, errText);
      return NextResponse.json({
        error: 'AI service error',
        detail: `Puter returned ${puterRes.status}: ${errText.slice(0, 200)}`,
      }, { status: 502 });
    }

    const data = await puterRes.json();

    if (!data?.result?.message?.content) {
      console.error('Invalid Puter response:', JSON.stringify(data).slice(0, 300));
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    const reply = data.result.message.content;

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat AI error:', err);
    return NextResponse.json({
      error: 'Internal server error',
      detail: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
