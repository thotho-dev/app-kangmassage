import {
  calculateDiscount,
  checkHappyHour,
  checkAreaCoverage,
  validateVoucher,
  findBestVoucher,
  VoucherData,
  VoucherContext,
} from '../voucher';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeVoucher(overrides: Partial<VoucherData> = {}): VoucherData {
  return {
    id: 'v-1',
    code: 'PROMO10',
    category: 'direct',
    type: 'percentage',
    value: 10,
    min_order_amount: 0,
    usage_limit: null,
    usage_count: 0,
    user_limit: 1,
    valid_until: '2099-12-31',
    ...overrides,
  };
}

function makeContext(overrides: Partial<VoucherContext> = {}): VoucherContext {
  return {
    subtotal: 100000,
    paymentMethod: 'tunai',
    totalOrders: 5,
    currentTime: new Date('2026-06-22T12:00:00'),
    userUsageCount: 0,
    ...overrides,
  };
}

// ─── calculateDiscount ───────────────────────────────────────────────────────
describe('calculateDiscount', () => {
  it('should calculate percentage discount', () => {
    expect(calculateDiscount('percentage', 10, 100000)).toBe(10000);
  });

  it('should cap percentage discount with maxDiscount', () => {
    expect(calculateDiscount('percentage', 50, 100000, 30000)).toBe(30000);
  });

  it('should not cap if discount is below maxDiscount', () => {
    expect(calculateDiscount('percentage', 10, 100000, 30000)).toBe(10000);
  });

  it('should return fixed value for fixed type', () => {
    expect(calculateDiscount('fixed', 15000, 100000)).toBe(15000);
  });

  it('should ignore maxDiscount for fixed type', () => {
    expect(calculateDiscount('fixed', 15000, 100000, 5000)).toBe(15000);
  });

  it('should return 0 for 0% discount', () => {
    expect(calculateDiscount('percentage', 0, 100000)).toBe(0);
  });

  it('should handle null maxDiscount', () => {
    expect(calculateDiscount('percentage', 10, 100000, null)).toBe(10000);
  });
});

// ─── checkHappyHour ──────────────────────────────────────────────────────────
describe('checkHappyHour', () => {
  it('should return true if current time is within window', () => {
    const current = new Date('2026-06-22T10:30:00');
    expect(checkHappyHour('09:00', '17:00', current)).toBe(true);
  });

  it('should return false if current time is before window', () => {
    const current = new Date('2026-06-22T08:00:00');
    expect(checkHappyHour('09:00', '17:00', current)).toBe(false);
  });

  it('should return false if current time is after window', () => {
    const current = new Date('2026-06-22T18:00:00');
    expect(checkHappyHour('09:00', '17:00', current)).toBe(false);
  });

  it('should return true if time is exactly at start', () => {
    const current = new Date('2026-06-22T09:00:00');
    expect(checkHappyHour('09:00', '17:00', current)).toBe(true);
  });

  it('should return true if time is exactly at end', () => {
    const current = new Date('2026-06-22T17:00:00');
    expect(checkHappyHour('09:00', '17:00', current)).toBe(true);
  });

  it('should return true if startTime/endTime are null', () => {
    expect(checkHappyHour(null, null)).toBe(true);
  });

  it('should return true if startTime/endTime are undefined', () => {
    expect(checkHappyHour(undefined, undefined)).toBe(true);
  });
});

// ─── checkAreaCoverage ───────────────────────────────────────────────────────
describe('checkAreaCoverage', () => {
  it('should return true if no area names', () => {
    expect(checkAreaCoverage(null, 'Jakarta Selatan')).toBe(true);
  });

  it('should return true if address matches area', () => {
    expect(checkAreaCoverage(['Jakarta Selatan'], 'Jl. Senopati, Jakarta Selatan')).toBe(true);
  });

  it('should return false if address does not match', () => {
    expect(checkAreaCoverage(['Jakarta Selatan'], 'Jl. Merdeka, Bandung')).toBe(false);
  });

  it('should match with "Provinsi - Kota" format', () => {
    expect(checkAreaCoverage(['DKI Jakarta - Jakarta Selatan'], 'Jl. Senopati, Jakarta Selatan')).toBe(true);
  });

  it('should strip "kota" prefix for matching', () => {
    expect(checkAreaCoverage(['Jawa Barat - Kota Bandung'], 'Jl. Merdeka, Bandung')).toBe(true);
  });

  it('should strip "kabupaten" prefix', () => {
    expect(checkAreaCoverage(['Jawa Barat - Kabupaten Bogor'], 'Jl. Raya, Bogor')).toBe(true);
  });

  it('should return true if address is undefined (skip validation)', () => {
    expect(checkAreaCoverage(['Jakarta'], undefined)).toBe(true);
  });
});

// ─── validateVoucher ─────────────────────────────────────────────────────────
describe('validateVoucher', () => {
  // ── Common validations ──

  it('should return null for a valid voucher', () => {
    const v = makeVoucher();
    const ctx = makeContext();
    expect(validateVoucher(v, ctx)).toBeNull();
  });

  it('should reject expired voucher', () => {
    const v = makeVoucher({ valid_until: '2020-01-01' });
    const ctx = makeContext();
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'expired',
      message: 'Masa berlaku voucher ini telah berakhir.',
    });
  });

  it('should reject if subtotal is below min_order_amount', () => {
    const v = makeVoucher({ min_order_amount: 200000 });
    const ctx = makeContext({ subtotal: 100000 });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'min_order',
      message: 'Voucher ini hanya berlaku untuk minimal pemesanan Rp 200.000',
    });
  });

  it('should reject if usage limit reached', () => {
    const v = makeVoucher({ usage_limit: 100, usage_count: 100 });
    const ctx = makeContext();
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'usage_limit',
      message: 'Kuota penggunaan voucher ini telah habis.',
    });
  });

  it('should reject if user usage limit reached', () => {
    const v = makeVoucher({ user_limit: 2 });
    const ctx = makeContext({ userUsageCount: 2 });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'user_limit',
      message: 'Voucher ini hanya dapat digunakan maksimal 2 kali per pengguna.',
    });
  });

  // ── service category ──

  it('should reject service voucher if service does not match', () => {
    const v = makeVoucher({ category: 'service', service_id: 'svc-a' });
    const ctx = makeContext({ serviceId: 'svc-b' });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'service',
      message: 'Voucher ini hanya berlaku untuk layanan tertentu.',
    });
  });

  it('should pass service voucher if service matches', () => {
    const v = makeVoucher({ category: 'service', service_id: 'svc-a' });
    const ctx = makeContext({ serviceId: 'svc-a' });
    expect(validateVoucher(v, ctx)).toBeNull();
  });

  // ── happy_hour category ──

  it('should reject happy_hour voucher outside window', () => {
    const v = makeVoucher({ category: 'happy_hour', start_time: '09:00', end_time: '17:00' });
    const ctx = makeContext({ currentTime: new Date('2026-06-22T20:00:00') });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'happy_hour',
      message: 'Voucher ini hanya berlaku pada jam 09:00 - 17:00.',
    });
  });

  it('should pass happy_hour voucher inside window', () => {
    const v = makeVoucher({ category: 'happy_hour', start_time: '09:00', end_time: '17:00' });
    const ctx = makeContext({ currentTime: new Date('2026-06-22T12:00:00') });
    expect(validateVoucher(v, ctx)).toBeNull();
  });

  // ── area validation ──

  it('should reject if address not in area', () => {
    const v = makeVoucher({ area_names: ['Jakarta Selatan'] });
    const ctx = makeContext({ address: 'Jl. Merdeka, Bandung' });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'area',
      message: 'Voucher ini hanya berlaku untuk wilayah: Jakarta Selatan.',
    });
  });

  it('should pass if address is in area', () => {
    const v = makeVoucher({ area_names: ['Jakarta Selatan'] });
    const ctx = makeContext({ address: 'Jl. Senopati, Jakarta Selatan' });
    expect(validateVoucher(v, ctx)).toBeNull();
  });

  // ── new_user category ──

  it('should reject new_user voucher if user has orders', () => {
    const v = makeVoucher({ category: 'new_user' });
    const ctx = makeContext({ totalOrders: 1 });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'new_user',
      message: 'Voucher ini hanya berlaku untuk pesanan pertama Anda.',
    });
  });

  it('should reject new_user voucher if device already used it', () => {
    const v = makeVoucher({ category: 'new_user' });
    const ctx = makeContext({ totalOrders: 0, deviceId: 'dev-1', deviceUsageCount: 1 });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'new_user_device',
      message: 'Voucher ini sudah pernah digunakan di perangkat ini.',
    });
  });

  it('should pass new_user voucher for new user on new device', () => {
    const v = makeVoucher({ category: 'new_user' });
    const ctx = makeContext({ totalOrders: 0, deviceId: 'dev-1', deviceUsageCount: 0 });
    expect(validateVoucher(v, ctx)).toBeNull();
  });

  // ── repeat_order category ──

  it('should reject repeat_order voucher if order count too low', () => {
    const v = makeVoucher({ category: 'repeat_order', min_order_count: 3 });
    const ctx = makeContext({ totalOrders: 1 });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'repeat_order',
      message: 'Voucher ini hanya berlaku setelah Anda melakukan minimal 3 pesanan.',
    });
  });

  it('should pass repeat_order voucher if count matches', () => {
    const v = makeVoucher({ category: 'repeat_order', min_order_count: 3 });
    const ctx = makeContext({ totalOrders: 5 });
    expect(validateVoucher(v, ctx)).toBeNull();
  });

  // ── wallet_payment category ──

  it('should reject wallet_payment voucher if payment is not saldo', () => {
    const v = makeVoucher({ category: 'wallet_payment' });
    const ctx = makeContext({ paymentMethod: 'tunai' });
    expect(validateVoucher(v, ctx)).toEqual({
      key: 'wallet_payment',
      message: 'Voucher ini hanya berlaku jika Anda membayar menggunakan saldo dompet.',
    });
  });

  it('should pass wallet_payment voucher if payment is saldo', () => {
    const v = makeVoucher({ category: 'wallet_payment' });
    const ctx = makeContext({ paymentMethod: 'saldo' });
    expect(validateVoucher(v, ctx)).toBeNull();
  });

  // ── edge cases ──

  it('should reject expired voucher even if category matches', () => {
    const v = makeVoucher({ category: 'wallet_payment', valid_until: '2020-01-01' });
    const ctx = makeContext({ paymentMethod: 'saldo' });
    expect(validateVoucher(v, ctx)?.key).toBe('expired');
  });

  it('should check min_order before category-specific checks', () => {
    const v = makeVoucher({ category: 'wallet_payment', min_order_amount: 500000 });
    const ctx = makeContext({ subtotal: 100000, paymentMethod: 'saldo' });
    expect(validateVoucher(v, ctx)?.key).toBe('min_order');
  });
});

// ─── findBestVoucher ─────────────────────────────────────────────────────────
describe('findBestVoucher', () => {
  it('should return the voucher with highest discount', () => {
    const vouchers: VoucherData[] = [
      makeVoucher({ id: 'v1', value: 10, code: 'P10' }),
      makeVoucher({ id: 'v2', value: 20, code: 'P20' }),
      makeVoucher({ id: 'v3', value: 5, code: 'P5' }),
    ];
    const ctx = makeContext();
    const result = findBestVoucher(vouchers, ctx);
    expect(result).not.toBeNull();
    expect(result!.voucher.id).toBe('v2');
    expect(result!.discount).toBe(20000);
  });

  it('should skip expired vouchers', () => {
    const vouchers: VoucherData[] = [
      makeVoucher({ id: 'v1', value: 50, code: 'BIG50', valid_until: '2020-01-01' }),
      makeVoucher({ id: 'v2', value: 10, code: 'SMALL10' }),
    ];
    const ctx = makeContext();
    const result = findBestVoucher(vouchers, ctx);
    expect(result!.voucher.id).toBe('v2');
  });

  it('should skip vouchers that fail category validation', () => {
    const vouchers: VoucherData[] = [
      makeVoucher({ id: 'v1', category: 'wallet_payment', value: 50, code: 'WALLET50' }),
      makeVoucher({ id: 'v2', category: 'direct', value: 10, code: 'DIRECT10' }),
    ];
    const ctx = makeContext({ paymentMethod: 'tunai' });
    const result = findBestVoucher(vouchers, ctx);
    // wallet_payment should be skipped since payment is not saldo
    expect(result!.voucher.id).toBe('v2');
    expect(result!.discount).toBe(10000);
  });

  it('should return null if all vouchers are invalid', () => {
    const vouchers: VoucherData[] = [
      makeVoucher({ id: 'v1', valid_until: '2020-01-01' }),
    ];
    const ctx = makeContext();
    expect(findBestVoucher(vouchers, ctx)).toBeNull();
  });

  it('should return null for empty array', () => {
    expect(findBestVoucher([], makeContext())).toBeNull();
  });

  it('should cap discount with maxDiscount during best selection', () => {
    const vouchers: VoucherData[] = [
      makeVoucher({ id: 'v1', value: 50, max_discount: 15000, code: 'CAPPED' }),
      makeVoucher({ id: 'v2', value: 10, code: 'UNCAP' }),
    ];
    const ctx = makeContext({ subtotal: 100000 });
    const result = findBestVoucher(vouchers, ctx);
    // v1: 50% of 100000 = 50000, capped at 15000
    // v2: 10% of 100000 = 10000
    // v1 wins with 15000
    expect(result!.voucher.id).toBe('v1');
    expect(result!.discount).toBe(15000);
  });

  it('should consider wallet_payment vouchers when payment is saldo', () => {
    const vouchers: VoucherData[] = [
      makeVoucher({ id: 'v1', category: 'wallet_payment', value: 30, code: 'WALLET30' }),
      makeVoucher({ id: 'v2', category: 'direct', value: 10, code: 'DIRECT10' }),
    ];
    const ctx = makeContext({ paymentMethod: 'saldo' });
    const result = findBestVoucher(vouchers, ctx);
    expect(result!.voucher.id).toBe('v1');
    expect(result!.discount).toBe(30000);
  });
});
