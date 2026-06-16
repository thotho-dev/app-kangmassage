import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { user_id, bank_code, bank_name, account_number, account_name } = await req.json();

    if (!user_id || !bank_name || !account_number || !account_name) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('saved_bank_accounts')
      .insert([{
        user_id,
        bank_code,
        bank_name,
        account_number,
        account_name,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Gagal menyimpan rekening: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', data });
  } catch (error: any) {
    console.error('[BankAccount Create] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
