import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { bank_code, account_number } = await req.json();
    if (!bank_code || !account_number) {
      return NextResponse.json({ error: 'Bank code dan nomor rekening diperlukan' }, { status: 400 });
    }

    const settings = await getAppSettings();
    const secretKey = settings.xendit_disbursement_secret_key || settings.xendit_secret_key || process.env.XENDIT_DISBURSEMENT_SECRET_KEY || process.env.XENDIT_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Konfigurasi pembayaran belum lengkap' }, { status: 500 });
    }

    const bankMapping: Record<string, string> = {
      'dana': 'DANA',
      'bca': 'BCA', '014': 'BCA',
      'bni': 'BNI', '009': 'BNI',
      'bri': 'BRI', '002': 'BRI',
      'mandiri': 'MANDIRI', '008': 'MANDIRI',
      'cimb': 'CIMB', '022': 'CIMB',
      'permata': 'PERMATA', '013': 'PERMATA',
      'bsi': 'BSI', '451': 'BSI',
      'danamon': 'DANAMON', '011': 'DANAMON',
    };
    const mappedCode = bankMapping[bank_code.toLowerCase()] || bank_code.toUpperCase();

    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const response = await fetch('https://api.xendit.co/bank_account_data_requests', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        bank_code: mappedCode,
        account_number,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const xenditMsg = data.message || data.error || '';
      const msgMap: Record<string, string> = {
        'is not a valid bank account': 'Nomor rekening tidak valid',
        'account number': 'Nomor rekening tidak valid',
        'is not supported': 'Bank belum didukung',
        'bank code': 'Kode bank tidak dikenal',
        'resource was not found': 'Konfigurasi pembayaran belum lengkap, hubungi admin',
        'not found': 'Konfigurasi pembayaran belum lengkap, hubungi admin',
        'internal error': 'Terjadi kesalahan sistem, coba lagi nanti',
      };
      let message = 'Nomor rekening tidak valid';
      for (const [key, val] of Object.entries(msgMap)) {
        if (xenditMsg.toLowerCase().includes(key)) { message = val; break; }
      }
      return NextResponse.json({ error: message, xendit: data }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      bank_code: data.bank_code,
      bank_name: data.bank_name,
      account_number: data.account_number,
      account_name: data.account_holder_name,
    });
  } catch (error: any) {
    console.error('[Bank Validate] Error:', error.message);
    return NextResponse.json({ error: 'Gagal memvalidasi rekening' }, { status: 500 });
  }
}
