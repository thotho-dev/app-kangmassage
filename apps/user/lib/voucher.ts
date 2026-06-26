export interface VoucherData {
  id: string;
  code: string;
  category: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount?: number | null;
  min_order_count?: number | null;
  usage_limit?: number | null;
  usage_count?: number;
  user_limit: number;
  start_time?: string | null;
  end_time?: string | null;
  area_names?: string[] | null;
  service_id?: string | null;
  valid_until: string;
  is_cashback?: boolean;
}

export interface VoucherContext {
  subtotal: number;
  paymentMethod: string;
  serviceId?: string;
  address?: string;
  totalOrders: number;
  deviceId?: string;
  currentTime?: Date;
  userUsageCount?: number;
  deviceUsageCount?: number;
}

export function calculateDiscount(
  type: 'percentage' | 'fixed',
  value: number,
  subtotal: number,
  maxDiscount?: number | null
): number {
  let discount = 0;
  if (type === 'percentage') {
    discount = (subtotal * value) / 100;
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    discount = value;
  }
  return discount;
}

export function checkHappyHour(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  currentTime?: Date
): boolean {
  if (!startTime || !endTime) return true;
  const now = currentTime || new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function checkAreaCoverage(
  areaNames: string[] | null | undefined,
  address: string | undefined
): boolean {
  if (!areaNames || !Array.isArray(areaNames) || areaNames.length === 0 || !address) return true;
  const addressLower = address.toLowerCase();
  return areaNames.some((areaName: string) => {
    const target = areaName.includes(' - ') ? areaName.split(' - ')[1] : areaName;
    const cleanTarget = target.toLowerCase()
      .replace(/kota\s+/g, '')
      .replace(/kabupaten\s+/g, '')
      .replace(/adm\.\s+/g, '')
      .replace(/jakarta\s+/g, 'jakarta ')
      .trim();
    return addressLower.includes(cleanTarget);
  });
}

export type VoucherError = {
  key: string;
  message: string;
} | null;

export function validateVoucher(
  voucher: VoucherData,
  context: VoucherContext
): VoucherError {
  const now = context.currentTime || new Date();

  if (new Date(voucher.valid_until) < now) {
    return { key: 'expired', message: 'Masa berlaku voucher ini telah berakhir.' };
  }

  if (context.subtotal < voucher.min_order_amount) {
    return {
      key: 'min_order',
      message: `Voucher ini hanya berlaku untuk minimal pemesanan Rp ${voucher.min_order_amount.toLocaleString('id-ID')}`
    };
  }

  if (voucher.usage_limit && (voucher.usage_count || 0) >= voucher.usage_limit) {
    return { key: 'usage_limit', message: 'Kuota penggunaan voucher ini telah habis.' };
  }

  const limitPerUser = Number(voucher.user_limit) || 1;
  if ((context.userUsageCount || 0) >= limitPerUser) {
    return {
      key: 'user_limit',
      message: `Voucher ini hanya dapat digunakan maksimal ${limitPerUser} kali per pengguna.`
    };
  }

  if (voucher.category === 'service' && voucher.service_id && voucher.service_id !== context.serviceId) {
    return { key: 'service', message: 'Voucher ini hanya berlaku untuk layanan tertentu.' };
  }

  if (voucher.category === 'happy_hour') {
    if (!checkHappyHour(voucher.start_time, voucher.end_time, context.currentTime)) {
      return {
        key: 'happy_hour',
        message: `Voucher ini hanya berlaku pada jam ${(voucher.start_time || '').substring(0, 5)} - ${(voucher.end_time || '').substring(0, 5)}.`
      };
    }
  }

  if (voucher.area_names && Array.isArray(voucher.area_names) && voucher.area_names.length > 0 && context.address) {
    if (!checkAreaCoverage(voucher.area_names, context.address)) {
      return {
        key: 'area',
        message: `Voucher ini hanya berlaku untuk wilayah: ${voucher.area_names.join(', ')}.`
      };
    }
  }

  if (voucher.category === 'new_user') {
    if (context.totalOrders > 0) {
      return { key: 'new_user', message: 'Voucher ini hanya berlaku untuk pesanan pertama Anda.' };
    }
    if (context.deviceId && (context.deviceUsageCount || 0) > 0) {
      return { key: 'new_user_device', message: 'Voucher ini sudah pernah digunakan di perangkat ini.' };
    }
  }

  if (voucher.category === 'repeat_order') {
    if (context.totalOrders < (voucher.min_order_count || 0)) {
      return {
        key: 'repeat_order',
        message: `Voucher ini hanya berlaku setelah Anda melakukan minimal ${voucher.min_order_count} pesanan.`
      };
    }
  }

  if (voucher.category === 'wallet_payment' && context.paymentMethod !== 'saldo') {
    return { key: 'wallet_payment', message: 'Voucher ini hanya berlaku jika Anda membayar menggunakan saldo dompet.' };
  }

  return null;
}

export function findBestVoucher(
  vouchers: VoucherData[],
  context: VoucherContext
): { voucher: VoucherData; discount: number } | null {
  let bestVoucher: VoucherData | null = null;
  let maxDiscount = 0;

  for (const v of vouchers) {
    const err = validateVoucher(v, context);
    if (err) continue;

    const discount = calculateDiscount(v.type, v.value, context.subtotal, v.max_discount);
    if (discount > maxDiscount) {
      maxDiscount = discount;
      bestVoucher = v;
    }
  }

  if (bestVoucher) {
    return { voucher: bestVoucher, discount: maxDiscount };
  }
  return null;
}

// ─── Pending Voucher (shared state between Vouchers and Order screens) ───
let _pendingVoucherCode: string | null = null;

export function setPendingVoucherCode(code: string | null) {
  _pendingVoucherCode = code;
}

export function pickPendingVoucherCode(): string | null {
  const code = _pendingVoucherCode;
  _pendingVoucherCode = null;
  return code;
}
