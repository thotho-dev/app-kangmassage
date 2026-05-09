import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/skills - List all persistent skills
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty array (fallback)
      console.error('Error fetching skills:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/skills - Create a new skill
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { name, price_type = 'duration' } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Skill name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({ 
        name, 
        price_type 
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/skills - Update an existing skill
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { id, name, price_type } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Skill ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('skills')
      .update({ name, price_type })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/skills - Remove a skill
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Skill name is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('name', name);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
