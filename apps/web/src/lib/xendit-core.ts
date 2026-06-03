type PaymentMethod =
  | 'dana' | 'ovo' | 'shopeepay' | 'linkaja'
  | 'bca_va' | 'mandiri_va' | 'bni_va' | 'bri_va' | 'permata_va' | 'bsi_va' | 'cimb_va'
  | 'alfamart' | 'indomaret'
  | 'qris';

interface CreatePaymentParams {
  external_id: string;
  amount: number;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  secret_key: string;
  callback_url?: string;
}

export interface CoreApiResult {
  payment_method: PaymentMethod;
  type: 'ewallet' | 'va' | 'retail' | 'qris';
  amount: number;
  external_id: string;
  actions?: { deeplink_checkout_url?: string; mobile_web_checkout_url?: string; desktop_web_checkout_url?: string };
  bank_code?: string;
  va_number?: string;
  retail_outlet_name?: string;
  payment_code?: string;
  qr_string?: string;
  status: string;
}

const EWALLET_CHANNEL: Record<string, string> = {
  dana: 'DANA', ovo: 'OVO', shopeepay: 'SHOPEEPAY', linkaja: 'LINKAJA',
};

const VA_BANK: Record<string, string> = {
  bca_va: 'BCA', mandiri_va: 'MANDIRI', bni_va: 'BNI', bri_va: 'BRI',
  permata_va: 'PERMATA', bsi_va: 'BSI', cimb_va: 'CIMB',
};

const RETAIL_NAME: Record<string, string> = {
  alfamart: 'ALFAMART', indomaret: 'INDOMARET',
};

export async function createXenditPayment(
  method: PaymentMethod,
  params: CreatePaymentParams,
): Promise<CoreApiResult> {
  const authHeader = `Basic ${Buffer.from(`${params.secret_key}:`).toString('base64')}`;
  const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  if (EWALLET_CHANNEL[method]) {
    const res = await fetch('https://api.xendit.co/ewallets/charges', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reference_id: params.external_id,
        currency: 'IDR',
        amount: params.amount,
        checkout_method: 'ONE_TIME_PAYMENT',
        channel_code: EWALLET_CHANNEL[method],
        redirect_url: params.callback_url || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xendit e-wallet error');
    return {
      payment_method: method, type: 'ewallet', amount: params.amount, external_id: params.external_id,
      actions: data.actions, status: data.status,
    };
  }

  if (VA_BANK[method]) {
    const res = await fetch('https://api.xendit.co/callback_virtual_accounts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        external_id: params.external_id,
        bank_code: VA_BANK[method],
        name: params.customer_name,
        expected_amount: params.amount,
        is_closed: true,
        is_single_use: true,
        expiration_date: expiry,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xendit VA error');
    return {
      payment_method: method, type: 'va', amount: params.amount, external_id: params.external_id,
      bank_code: data.bank_code, va_number: data.account_number, status: data.status,
    };
  }

  if (RETAIL_NAME[method]) {
    const res = await fetch('https://api.xendit.co/retail_outlets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        external_id: params.external_id,
        retail_outlet_name: RETAIL_NAME[method],
        name: params.customer_name,
        expected_amount: params.amount,
        expiration_date: expiry,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xendit retail error');
    return {
      payment_method: method, type: 'retail', amount: params.amount, external_id: params.external_id,
      retail_outlet_name: data.retail_outlet_name, payment_code: data.payment_code, status: data.status,
    };
  }

  if (method === 'qris') {
    const res = await fetch('https://api.xendit.co/qr_codes', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        external_id: params.external_id,
        type: 'DYNAMIC',
        amount: params.amount,
        callback_url: params.callback_url || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Xendit QRIS error');
    return {
      payment_method: method, type: 'qris', amount: params.amount, external_id: params.external_id,
      qr_string: data.qr_string, status: data.status,
    };
  }

  throw new Error(`Unsupported payment method: ${method}`);
}
