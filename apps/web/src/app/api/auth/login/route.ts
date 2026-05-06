import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/auth/login - Admin login
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', data.user.id)
      .eq('role', 'admin')
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ data: { user, session: data.session } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
