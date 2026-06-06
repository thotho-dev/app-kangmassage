import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_message')
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({
        maintenance_mode: false,
        maintenance_message: 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
      }, { headers: noCacheHeaders });
    }

    return NextResponse.json({
      maintenance_mode: data.maintenance_mode ?? false,
      maintenance_message: data.maintenance_message ?? 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
    }, { headers: noCacheHeaders });
  } catch {
    return NextResponse.json({
      maintenance_mode: false,
      maintenance_message: 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
    }, { headers: noCacheHeaders });
  }
}