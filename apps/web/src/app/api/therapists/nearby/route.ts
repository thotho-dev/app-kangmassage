import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// GET /api/therapists/nearby - Find nearest therapists for order matching
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10'); // km

    // Get online therapists with locations
    const { data: therapists, error } = await supabase
      .from('therapists')
      .select('*, therapist_locations!inner(*)')
      .eq('status', 'online')
      .eq('is_active', true)
      .eq('is_verified', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate distances using Haversine formula
    const withDistances = therapists
      .map((t) => {
        const loc = t.therapist_locations[0];
        if (!loc) return null;

        const dlat = toRad(loc.latitude - lat);
        const dlon = toRad(loc.longitude - lng);
        const a =
          Math.sin(dlat / 2) * Math.sin(dlat / 2) +
          Math.cos(toRad(lat)) * Math.cos(toRad(loc.latitude)) *
          Math.sin(dlon / 2) * Math.sin(dlon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = 6371 * c; // Earth radius in km

        return { ...t, distance, location: loc };
      })
      .filter((t) => t !== null && t.distance <= radius)
      .sort((a, b) => {
        // Sort by: distance first, then rating
        const distDiff = a!.distance - b!.distance;
        if (Math.abs(distDiff) < 1) return b!.rating - a!.rating;
        return distDiff;
      })
      .slice(0, 3); // Top 3

    return NextResponse.json({ data: withDistances });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function toRad(deg: number) {
  return deg * (Math.PI / 180);
}
