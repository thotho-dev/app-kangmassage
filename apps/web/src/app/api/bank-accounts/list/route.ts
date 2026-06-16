import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({ error: 'User ID diperlukan' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('saved_bank_accounts')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('[BankAccount List] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
