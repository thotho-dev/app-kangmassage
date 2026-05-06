import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// DELETE /api/users/[id] - Delete user (admin)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient();
    
    // 1. Get the supabase_uid first
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('supabase_uid')
      .eq('id', params.id)
      .single();

    if (fetchError || !user?.supabase_uid) {
      // If user not found in table, maybe it's already gone or was never linked
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', params.id);
      
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // 2. Delete from auth.users (Supabase Auth)
    // This will trigger ON DELETE CASCADE on users.supabase_uid
    const { error: authError } = await supabase.auth.admin.deleteUser(user.supabase_uid);
    
    if (authError) {
      console.error('Auth Delete Error:', authError);
      // Try deleting from table even if auth delete fails
      await supabase.from('users').delete().eq('id', params.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
