import { supabase } from './supabase';

export interface PuterConfig {
  authToken: string;
  modelName: string;
}

let cached: PuterConfig | null = null;

export async function getPuterConfig(): Promise<PuterConfig> {
  if (cached) return cached;

  const { data, error } = await supabase
    .from('app_settings')
    .select('puter_auth_token, puter_model_name')
    .limit(1)
    .single();

  if (error || !data) {
    return { authToken: '', modelName: 'deepseek/deepseek-v4-flash' };
  }

  cached = {
    authToken: data.puter_auth_token || '',
    modelName: data.puter_model_name || 'deepseek/deepseek-v4-flash',
  };

  return cached;
}

export function clearPuterCache() {
  cached = null;
}
