import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTherapistStore } from '@/store/therapistStore';
import { useThemeColors } from '@/store/themeStore';
import { TYPOGRAPHY, RADIUS, SHADOWS } from '@/constants/Theme';
import { WEB_API_URL } from '@/lib/config';

interface Equipment {
  id: string; name: string; description: string; price: number;
  discount_price?: number; image_url?: string; is_mandatory?: boolean;
}

type ScreenState = 'loading' | 'ready' | 'pending_payment' | 'success' | 'error';

export default function RegistrationPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useThemeColors();
  const { profile, fetchProfile } = useTherapistStore();
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [registrationFee, setRegistrationFee] = useState(0);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState('');
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setScreenState('loading');
      let therapistProfile = profile;
      if (!therapistProfile?.id) {
        await fetchProfile();
        therapistProfile = useTherapistStore.getState().profile;
      }
      const therapistId = therapistProfile?.id;
      if (!therapistId) { setScreenState('error'); setErrorMsg('Data terapis tidak ditemukan.'); return; }
      if (therapistProfile?.registration_fee_paid) { setScreenState('success'); return; }

      const { data: settings } = await supabase.from('app_settings')
        .select('therapist_registration_fee, registration_payment_required').limit(1).single();
      const { data: equip } = await supabase.from('registration_equipment')
        .select('*').eq('is_active', true).order('sort_order', { ascending: true });

      const fee = Number(settings?.therapist_registration_fee) || 0;
      const list = equip || [];
      setRegistrationFee(fee);
      setEquipment(list);
      setSelectedEquipment(new Set(list.filter(e => e.is_mandatory).map(e => e.id)));

      if (!settings?.registration_payment_required || (fee === 0 && list.length === 0)) {
        setScreenState('success');
        return;
      }
      setScreenState('ready');
    } catch {
      setScreenState('error'); setErrorMsg('Gagal memuat data pembayaran');
    }
  };

  const toggleEquipment = (id: string, isMandatory?: boolean) => {
    if (isMandatory) return;
    setSelectedEquipment(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const effectivePrice = (e: Equipment) => Number(e.discount_price) > 0 ? Number(e.discount_price) : Number(e.price);
  const equipmentTotal = equipment.filter(e => selectedEquipment.has(e.id)).reduce((sum, e) => sum + effectivePrice(e), 0);
  const totalAmount = registrationFee + equipmentTotal;

  const handlePay = async () => {
    if (!selectedMethod) { setErrorMsg('Silakan pilih metode pembayaran'); return; }
    try {
      setPaying(true); setErrorMsg('');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sesi habis');
      const res = await fetch(`${WEB_API_URL}/api/therapists/registration-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          payment_method: selectedMethod,
          equipment_items: Array.from(selectedEquipment).map(id => ({ id: id, quantity: 1 })),
        }),
      });
      let result: any;
      try { result = await res.json(); } catch { throw new Error(`Server error (${res.status}). Hubungi admin.`); }
      if (result.error) throw new Error(result.error);
      if (result.success) {
        setPaymentId(result.data.payment_id);
        setPaymentData(result.data);
        setScreenState('pending_payment');
        if (selectedMethod === 'gopay' && result.data.redirect_url) {
          try { await Linking.openURL(result.data.redirect_url); } catch {}
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Pembayaran gagal');
    } finally { setPaying(false); }
  };

  const handleCheckStatus = async () => {
    if (!paymentId) return;
    try {
      setChecking(true); setErrorMsg('');
      const res = await fetch(`${WEB_API_URL}/api/therapists/registration-payment/check-status?payment_id=${paymentId}`);
      let data: any;
      try { data = await res.json(); } catch { throw new Error(`Server error (${res.status}). Hubungi admin.`); }
      if (data.error) throw new Error(data.error);
      if (data.status === 'paid') {
        await fetchProfile();
        setScreenState('success');
      } else if (data.status === 'failed') {
        setErrorMsg('Pembayaran gagal. Silakan coba lagi.');
        setScreenState('ready');
      } else {
        setErrorMsg('Pembayaran masih diproses. Silakan cek kembali.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal cek status');
    } finally { setChecking(false); }
  };

  const handleContinue = () => router.replace('/(tabs)');
  const handleRetry = () => { setScreenState('ready'); setPaymentId(''); setPaymentData(null); setSelectedMethod(''); };

  // Loading screen
  if (screenState === 'loading') {
    return (
      <View style={[s.container, s.center, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={t.secondary} />
        <Text style={[s.loadingText, { color: t.textMuted }]}>Memuat data pembayaran...</Text>
      </View>
    );
  }

  // Success screen
  if (screenState === 'success') {
    return (
      <View style={[s.container, s.center, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <View style={{ alignItems: 'center', padding: 32 }}>
          <View style={{ marginBottom: 20 }}>
            <Ionicons name="checkmark-circle" size={64} color={t.success} />
          </View>
          <Text style={[s.successTitle, { color: t.text }]}>Pendaftaran Selesai!</Text>
          <Text style={[s.successSubtitle, { color: t.textMuted }]}>Pembayaran pendaftaran berhasil. Selamat bergabung!</Text>
          <TouchableOpacity
            style={[s.button, { backgroundColor: t.secondary, shadowColor: t.secondary }]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={s.buttonText}>Mulai</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Error screen
  if (screenState === 'error') {
    return (
      <View style={[s.container, s.center, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <View style={{ alignItems: 'center', padding: 32 }}>
          <Ionicons name="alert-circle" size={64} color={t.danger} />
          <Text style={[s.errorTitle, { color: t.text }]}>Gagal Memuat Data</Text>
          <Text style={[s.errorText, { color: t.textMuted }]}>{errorMsg}</Text>
          <TouchableOpacity
            style={[s.button, { backgroundColor: t.secondary }]}
            onPress={loadData}
            activeOpacity={0.8}
          >
            <Text style={s.buttonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pending payment screen
  if (screenState === 'pending_payment') {
    const isGopay = selectedMethod === 'gopay';
    return (
      <View style={[s.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <Text style={[s.headerTitle, { color: t.text }]}>Menunggu Pembayaran</Text>
            <Text style={[s.headerSubtitle, { color: t.textMuted }]}>
              {isGopay
                ? 'Selesaikan pembayaran melalui aplikasi GoPay'
                : 'Scan QRIS untuk menyelesaikan pembayaran'}
            </Text>
          </View>

          {isGopay ? (
            <View style={[s.pendingCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Image source={require('@/assets/Gopay.png')} style={{ width: 48, height: 48, marginBottom: 12 }} resizeMode="contain" />
              <Text style={[s.pendingTitle, { color: t.text }]}>GoPay</Text>
              <Text style={[s.pendingDesc, { color: t.textMuted }]}>
                Jika aplikasi GoPay tidak terbuka otomatis, tekan tombol di bawah.
              </Text>
              <TouchableOpacity
                style={[s.openBtn, { backgroundColor: t.secondary }]}
                onPress={() => { if (paymentData?.redirect_url) Linking.openURL(paymentData.redirect_url); }}
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={18} color="#FFF" />
                <Text style={s.openBtnText}>Buka GoPay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.pendingCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Ionicons name="qr-code-outline" size={48} color={t.secondary} style={{ marginBottom: 12 }} />
              <Text style={[s.pendingTitle, { color: t.text }]}>QRIS</Text>
              {paymentData?.qr_string ? (
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentData.qr_string)}` }}
                  style={{ width: 220, height: 220, borderRadius: 16, marginVertical: 16 }}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={[s.pendingDesc, { color: t.textMuted }]}>
                Scan QR code di atas menggunakan aplikasi Gojek, Shopee, atau e-wallet lain yang mendukung QRIS.
              </Text>
            </View>
          )}

          <View style={[s.summaryCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[s.summaryTitle, { color: t.text }]}>Ringkasan Pembayaran</Text>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: t.textMuted }]}>Biaya Pendaftaran</Text>
              <Text style={[s.summaryValue, { color: t.text }]}>Rp {registrationFee.toLocaleString('id-ID')}</Text>
            </View>
            {equipmentTotal > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: t.textMuted }]}>Perlengkapan</Text>
                <Text style={[s.summaryValue, { color: t.text }]}>Rp {equipmentTotal.toLocaleString('id-ID')}</Text>
              </View>
            )}
            <View style={[s.divider, { backgroundColor: t.border }]} />
            <View style={s.summaryRow}>
              <Text style={[s.summaryTotalLabel, { color: t.text }]}>Total</Text>
              <Text style={[s.summaryTotalValue, { color: t.secondary }]}>Rp {totalAmount.toLocaleString('id-ID')}</Text>
            </View>
          </View>

          {errorMsg ? (
            <View style={[s.errorBanner, { backgroundColor: t.danger + 15 }]}>
              <Ionicons name="alert-circle" size={16} color={t.danger} />
              <Text style={[s.errorBannerText, { color: t.danger }]}>{errorMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.checkBtn, { backgroundColor: t.secondary }, checking && { opacity: 0.6 }]}
            onPress={handleCheckStatus}
            disabled={checking}
            activeOpacity={0.8}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#FFF" />
                <Text style={s.checkBtnText}>Cek Status Pembayaran</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRetry} style={{ alignSelf: 'center', marginTop: 16 }} activeOpacity={0.7}>
            <Text style={[s.backLink, { color: t.textMuted }]}>Ganti metode pembayaran</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Ready screen — show payment form
  return (
    <View style={[s.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: t.text }]}>Pembayaran Pendaftaran</Text>
          <Text style={[s.headerSubtitle, { color: t.textMuted }]}>Lakukan pembayaran untuk menyelesaikan pendaftaran</Text>
        </View>

        {registrationFee > 0 && (
          <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={s.cardLeft}>
              <Ionicons name="receipt" size={22} color={t.secondary} />
              <Text style={[s.cardLabel, { color: t.text }]}>Biaya Pendaftaran</Text>
            </View>
            <Text style={[s.cardPrice, { color: t.secondary }]}>Rp {registrationFee.toLocaleString('id-ID')}</Text>
          </View>
        )}

        {equipment.length > 0 && (
          <View style={s.equipSection}>
            <Text style={[s.sectionTitle, { color: t.text }]}>
              {equipment.some(e => e.is_mandatory) ? 'Perlengkapan' : 'Perlengkapan Tambahan (Opsional)'}
            </Text>
            <Text style={[s.sectionSubtitle, { color: t.textMuted }]}>
              {equipment.some(e => e.is_mandatory) ? 'Perlengkapan wajib sudah dipilih' : 'Pilih perlengkapan'}
            </Text>
            {equipment.map((item) => {
              const isSelected = selectedEquipment.has(item.id);
              const isMand = item.is_mandatory === true;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.equipCard, { backgroundColor: t.surface, borderColor: isSelected ? t.secondary : t.border }, isSelected && { backgroundColor: t.secondary + 10 }, isMand && { borderColor: t.secondary }]}
                  onPress={() => toggleEquipment(item.id, isMand)}
                  activeOpacity={isMand ? 1 : 0.7}
                >
                  <View style={[s.checkboxRing, { borderColor: isMand ? t.secondary : (isSelected ? t.secondary : t.border) }, (isSelected || isMand) && { backgroundColor: isMand ? t.secondary + 90 : t.secondary }]}>
                    {(isSelected || isMand) && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <View style={s.equipInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.equipName, { color: t.text }]}>{item.name}</Text>
                      {isMand && <Text style={[s.wajibBadge, { backgroundColor: t.danger + 15, color: t.danger }]}>Wajib</Text>}
                    </View>
                    {item.description ? <Text style={[s.equipDesc, { color: t.textMuted }]} numberOfLines={2}>{item.description}</Text> : null}
                  </View>
                  <View style={s.equipPriceCol}>
                    {Number(item.discount_price) > 0 ? (
                      <>
                        <Text style={[s.equipPriceLine, { color: t.textMuted }]}>Rp {Number(item.price).toLocaleString('id-ID')}</Text>
                        <Text style={[s.equipPrice, { color: t.success }]}>Rp {Number(item.discount_price).toLocaleString('id-ID')}</Text>
                      </>
                    ) : (
                      <Text style={[s.equipPrice, { color: t.text }]}>Rp {Number(item.price).toLocaleString('id-ID')}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={[s.sectionBox, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[s.methodSectionTitle, { color: t.text }]}>Pilih Metode Bayar</Text>
          {[
            { id: 'gopay', name: 'GoPay', image: require('@/assets/Gopay.png') },
            { id: 'qris', name: 'QRIS', icon: 'qr-code-outline' as const },
          ].map(m => (
            <TouchableOpacity
              key={m.id}
              style={[s.methodItem, { borderColor: selectedMethod === m.id ? t.secondary : t.border }, selectedMethod === m.id && { backgroundColor: t.secondary + 10 }]}
              onPress={() => setSelectedMethod(m.id)}
              activeOpacity={0.7}
            >
              {'image' in m ? (
                <Image source={m.image} style={{ width: 22, height: 22 }} resizeMode="contain" />
              ) : (
                <Ionicons name={m.icon!} size={22} color={t.secondary} />
              )}
              <Text style={[s.methodName, { color: t.text }]}>{m.name}</Text>
              <View style={[s.radio, { borderColor: selectedMethod === m.id ? t.secondary : t.border }]}>
                {selectedMethod === m.id && <View style={[s.radioInner, { backgroundColor: t.secondary }]} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {errorMsg ? (
          <View style={[s.errorBanner, { backgroundColor: t.danger + 15 }]}>
            <Ionicons name="alert-circle" size={16} color={t.danger} />
            <Text style={[s.errorBannerText, { color: t.danger }]}>{errorMsg}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[s.bottomBar, { backgroundColor: t.surface, borderTopColor: t.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.totalRow}>
          <Text style={[s.totalLabel, { color: t.textMuted }]}>Total Pembayaran</Text>
          <Text style={[s.totalAmount, { color: t.text }]}>Rp {totalAmount.toLocaleString('id-ID')}</Text>
        </View>
        <TouchableOpacity
          style={[s.payBtn, { backgroundColor: t.secondary }, paying && { opacity: 0.6 }]}
          onPress={handlePay}
          disabled={paying}
          activeOpacity={0.8}
        >
          {paying ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#FFF" />
              <Text style={s.payBtnText}>{selectedMethod ? `Bayar dengan ${selectedMethod === 'gopay' ? 'GoPay' : 'QRIS'}` : 'Pilih Metode Bayar'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  scrollContent: { padding: 20, paddingBottom: 200 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  card: { borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  cardPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  equipSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 10 },
  equipCard: { borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  checkboxRing: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  equipInfo: { flex: 1, marginLeft: 10 },
  equipName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  equipDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  equipPrice: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  equipPriceLine: { fontSize: 10, fontFamily: 'Inter_400Regular', textDecorationLine: 'line-through' },
  equipPriceCol: { marginLeft: 6, alignItems: 'flex-end' },
  wajibBadge: { fontSize: 9, fontFamily: 'Inter_600SemiBold', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  sectionBox: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  methodSectionTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  methodItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  methodName: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  totalLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  totalAmount: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  payBtn: { borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...SHADOWS.md },
  payBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },

  // pending payment styles
  pendingCard: { borderRadius: 14, padding: 20, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  pendingTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 6 },
  pendingDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 16, marginBottom: 14 },
  openBtn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  openBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  summaryCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 16 },
  summaryTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  summaryTotalLabel: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  summaryTotalValue: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  divider: { height: 1, marginVertical: 6 },
  checkBtn: { borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...SHADOWS.md },
  checkBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  backLink: { fontSize: 12, fontFamily: 'Inter_400Regular', textDecorationLine: 'underline' },

  // misc
  loadingText: { marginTop: 14, fontSize: 12, fontFamily: 'Inter_400Regular' },
  successTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 6, textAlign: 'center' },
  successSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 17, marginBottom: 24, paddingHorizontal: 24 },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40, ...SHADOWS.md },
  buttonText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFFFFF' },
  errorTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 14, marginBottom: 6, textAlign: 'center' },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 17, marginBottom: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, marginTop: 6 },
  errorBannerText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
});
