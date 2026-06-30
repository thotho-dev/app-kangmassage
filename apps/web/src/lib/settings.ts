import { createAdminClient } from './supabase/server';

export type AppSettings = {
  matching_radius_km: number;
  min_rating: number;
  min_wallet_balance: number;
  bronze_platform_cut: number;
  silver_platform_cut: number;
  gold_platform_cut: number;
  platinum_platform_cut: number;
  diamond_platform_cut: number;
  topup_admin_fee: number;
  topup_min_amount: number;
  topup_max_amount: number;
  withdraw_admin_fee: number;
  withdraw_min_amount: number;
  withdraw_max_amount: number;
  order_service_fee: number;
  order_admin_fee: number;
  platform_name: string;
  support_email: string;
  support_whatsapp: string;
  chat_link: string;
  logo_url: string | null;
  xendit_secret_key: string;
  xendit_webhook_verification_token: string;
  xendit_disbursement_secret_key: string;
  midtrans_server_key: string;
  midtrans_client_key: string;
  midtrans_is_production: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  withdrawal_otp_threshold: number;
  withdrawal_daily_limit: number;
  withdrawal_max_count_per_day: number;
  withdrawal_admin_approval: boolean;
  withdrawal_admin_approval_threshold: number;
  min_app_version: string;
  playstore_url: string;
  therapist_min_app_version: string;
  therapist_playstore_url: string;
  therapist_registration_fee: number;
  registration_payment_required: boolean;
  therapist_min_initial_topup: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  matching_radius_km: 3,
  min_rating: 4.5,
  min_wallet_balance: 15000,
  bronze_platform_cut: 27,
  silver_platform_cut: 25,
  gold_platform_cut: 23,
  platinum_platform_cut: 21,
  diamond_platform_cut: 20,
  topup_admin_fee: 2500,
  topup_min_amount: 10000,
  topup_max_amount: 2000000,
  withdraw_admin_fee: 5000,
  withdraw_min_amount: 50000,
  withdraw_max_amount: 5000000,
  order_service_fee: 2000,
  order_admin_fee: 0,
  platform_name: 'Kang Massage',
  support_email: 'support@kangmassage.app',
  support_whatsapp: '',
  chat_link: '',
  logo_url: null,
  xendit_secret_key: '',
  xendit_webhook_verification_token: '',
  xendit_disbursement_secret_key: '',
  midtrans_server_key: '',
  midtrans_client_key: '',
  midtrans_is_production: false,
  maintenance_mode: false,
  maintenance_message: 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
  withdrawal_otp_threshold: 500000,
  withdrawal_daily_limit: 3000000,
  withdrawal_max_count_per_day: 3,
  withdrawal_admin_approval: false,
  withdrawal_admin_approval_threshold: 0,
  min_app_version: '1.0.0',
  playstore_url: 'https://play.google.com/store/apps/details?id=com.kangmassage.customer',
  therapist_min_app_version: '1.0.0',
  therapist_playstore_url: 'https://play.google.com/store/apps/details?id=com.kangmassage.mitra',
  therapist_registration_fee: 0,
  registration_payment_required: false,
  therapist_min_initial_topup: 0,
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      return DEFAULT_SETTINGS;
    }

    return {
      matching_radius_km: Number(data.matching_radius_km) ?? DEFAULT_SETTINGS.matching_radius_km,
      min_rating: Number(data.min_rating) ?? DEFAULT_SETTINGS.min_rating,
      min_wallet_balance: Number(data.min_wallet_balance) ?? DEFAULT_SETTINGS.min_wallet_balance,
      bronze_platform_cut: Number(data.bronze_platform_cut) ?? DEFAULT_SETTINGS.bronze_platform_cut,
      silver_platform_cut: Number(data.silver_platform_cut) ?? DEFAULT_SETTINGS.silver_platform_cut,
      gold_platform_cut: Number(data.gold_platform_cut) ?? DEFAULT_SETTINGS.gold_platform_cut,
      platinum_platform_cut: Number(data.platinum_platform_cut) ?? DEFAULT_SETTINGS.platinum_platform_cut,
      diamond_platform_cut: Number(data.diamond_platform_cut) ?? DEFAULT_SETTINGS.diamond_platform_cut,
      topup_admin_fee: Number(data.topup_admin_fee) ?? DEFAULT_SETTINGS.topup_admin_fee,
      topup_min_amount: Number(data.topup_min_amount) ?? DEFAULT_SETTINGS.topup_min_amount,
      topup_max_amount: Number(data.topup_max_amount) ?? DEFAULT_SETTINGS.topup_max_amount,
      withdraw_admin_fee: Number(data.withdraw_admin_fee) ?? DEFAULT_SETTINGS.withdraw_admin_fee,
      withdraw_min_amount: Number(data.withdraw_min_amount) ?? DEFAULT_SETTINGS.withdraw_min_amount,
      withdraw_max_amount: Number(data.withdraw_max_amount) ?? DEFAULT_SETTINGS.withdraw_max_amount,
      order_service_fee: Number(data.order_service_fee) ?? DEFAULT_SETTINGS.order_service_fee,
      order_admin_fee: Number(data.order_admin_fee) ?? DEFAULT_SETTINGS.order_admin_fee,
      platform_name: data.platform_name ?? DEFAULT_SETTINGS.platform_name,
      support_email: data.support_email ?? DEFAULT_SETTINGS.support_email,
      support_whatsapp: data.support_whatsapp ?? DEFAULT_SETTINGS.support_whatsapp,
      chat_link: data.chat_link ?? DEFAULT_SETTINGS.chat_link,
      logo_url: data.logo_url ?? null,
      xendit_secret_key: data.xendit_secret_key ?? '',
      xendit_webhook_verification_token: data.xendit_webhook_verification_token ?? '',
      xendit_disbursement_secret_key: data.xendit_disbursement_secret_key ?? '',
      midtrans_server_key: data.midtrans_server_key ?? '',
      midtrans_client_key: data.midtrans_client_key ?? '',
      midtrans_is_production: data.midtrans_is_production ?? false,
      maintenance_mode: data.maintenance_mode ?? DEFAULT_SETTINGS.maintenance_mode,
      maintenance_message: data.maintenance_message ?? DEFAULT_SETTINGS.maintenance_message,
      withdrawal_otp_threshold: Number(data.withdrawal_otp_threshold) ?? DEFAULT_SETTINGS.withdrawal_otp_threshold,
      withdrawal_daily_limit: Number(data.withdrawal_daily_limit) ?? DEFAULT_SETTINGS.withdrawal_daily_limit,
      withdrawal_max_count_per_day: Number(data.withdrawal_max_count_per_day) ?? DEFAULT_SETTINGS.withdrawal_max_count_per_day,
      withdrawal_admin_approval: data.withdrawal_admin_approval ?? DEFAULT_SETTINGS.withdrawal_admin_approval,
      withdrawal_admin_approval_threshold: Number(data.withdrawal_admin_approval_threshold) ?? DEFAULT_SETTINGS.withdrawal_admin_approval_threshold,
      min_app_version: data.min_app_version ?? DEFAULT_SETTINGS.min_app_version,
      playstore_url: data.playstore_url ?? DEFAULT_SETTINGS.playstore_url,
      therapist_min_app_version: data.therapist_min_app_version ?? DEFAULT_SETTINGS.therapist_min_app_version,
      therapist_playstore_url: data.therapist_playstore_url ?? DEFAULT_SETTINGS.therapist_playstore_url,
      therapist_registration_fee: Number(data.therapist_registration_fee) ?? DEFAULT_SETTINGS.therapist_registration_fee,
      registration_payment_required: data.registration_payment_required ?? DEFAULT_SETTINGS.registration_payment_required,
      therapist_min_initial_topup: Number(data.therapist_min_initial_topup) ?? DEFAULT_SETTINGS.therapist_min_initial_topup,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
