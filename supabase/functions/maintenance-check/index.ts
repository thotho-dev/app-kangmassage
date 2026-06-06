import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_message')
      .limit(1)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({
          maintenance_mode: false,
          maintenance_message: 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        maintenance_mode: data.maintenance_mode ?? false,
        maintenance_message: data.maintenance_message ?? 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        maintenance_mode: false,
        maintenance_message: 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});