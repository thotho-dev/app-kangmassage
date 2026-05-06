import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// POST /api/auth/otp/send
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Mock OTP - In production, use Supabase phone OTP or WhatsApp API
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in DB temporarily (using a simple approach)
    // In production: use Supabase auth.signInWithOtp({ phone })
    const supabase = createAdminClient();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, full_name, phone')
      .eq('phone', phone)
      .single();

    // Mock: log OTP to console (replace with WhatsApp/SMS API)
    console.log(`[MOCK OTP] Phone: ${phone}, OTP: ${otp}`);

    return NextResponse.json({
      message: 'OTP sent successfully',
      // Return mock OTP for development
      ...(process.env.NODE_ENV === 'development' && { mock_otp: otp }),
      is_new_user: !existingUser,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
