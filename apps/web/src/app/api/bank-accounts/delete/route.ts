import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { id, user_id } = await req.json();

    if (!id || !user_id) {
      return NextResponse.json({ error: 'ID rekening dan User ID diperlukan' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('saved_bank_accounts')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      return NextResponse.json({ error: 'Gagal menghapus rekening: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', message: 'Rekening berhasil dihapus' });
  } catch (error: any) {
    console.error('[BankAccount Delete] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
