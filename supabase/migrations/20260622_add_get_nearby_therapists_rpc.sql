-- RPC to get nearby online therapists within radius (km)
-- Uses SECURITY DEFINER to bypass RLS on therapists + therapist_locations
CREATE OR REPLACE FUNCTION get_nearby_therapists(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km DECIMAL DEFAULT 5
)
RETURNS TABLE(
  therapist_id UUID,
  full_name VARCHAR,
  avatar_url TEXT,
  rating DECIMAL,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  live_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.full_name,
    t.avatar_url,
    t.rating,
    tl.latitude,
    tl.longitude,
    ROUND(calculate_distance(p_lat, p_lng, tl.latitude, tl.longitude)::DECIMAL, 2),
    tl.live_address
  FROM therapists t
  INNER JOIN therapist_locations tl ON tl.therapist_id = t.id
  WHERE t.status = 'online'
    AND t.is_active = true
    AND t.is_verified = true
    AND calculate_distance(p_lat, p_lng, tl.latitude, tl.longitude) <= p_radius_km
  ORDER BY calculate_distance(p_lat, p_lng, tl.latitude, tl.longitude) ASC;
END;
$$;

-- Grant execute to anon + authenticated so user app can call it
GRANT EXECUTE ON FUNCTION get_nearby_therapists TO anon, authenticated;
