import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, LayoutAnimation } from 'react-native';
import { useThemeColors } from '../../store/themeStore';
import { useTherapistStore } from '../../store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { WebView } from 'react-native-webview';
import { useAlert } from '../../components/CustomAlert';

const PRESETS = [50000, 100000, 200000, 500000, 1000000];

const PAYMENT_GROUPS = [
  {
    id: 'ewallet',
    title: 'E-Wallet & QRIS',
    icon: 'qr-code-outline',
    items: [
      { id: 'gopay', name: 'GoPay / QRIS', icon: 'qr-code-outline' },
      { id: 'shopeepay', name: 'ShopeePay', icon: 'wallet-outline' },
    ]
  },
  {
    id: 'va',
    title: 'Virtual Account (Transfer Bank)',
    icon: 'card-outline',
    items: [
      { id: 'bca_va', name: 'BCA Virtual Account', icon: 'business-outline' },
      { id: 'mandiri_va', name: 'Mandiri Virtual Account', icon: 'business-outline' },
      { id: 'bni_va', name: 'BNI Virtual Account', icon: 'business-outline' },
      { id: 'bri_va', name: 'BRI Virtual Account', icon: 'business-outline' },
    ]
  },
  {
    id: 'retail',
    title: 'Gerai Retail',
    icon: 'storefront-outline',
    items: [
      { id: 'alfamart', name: 'Alfamart', icon: 'storefront-outline' },
      { id: 'indomaret', name: 'Indomaret', icon: 'storefront-outline' },
    ]
  }
];

export default function TopupScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { profile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>('ewallet');
  const [loading, setLoading] = useState(false);
  
  const [showWebView, setShowWebView] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  const handleTopup = async () => {
    const numAmount = parseInt(amount);
    if (!amount || numAmount < 10000) {
      showAlert('warning', 'Nominal Tidak Valid', 'Minimal top up adalah Rp 10.000');
      return;
    }
    if (!selectedMethod) {
      showAlert('warning', 'Pilih Metode', 'Silakan pilih metode pembayaran terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://app-kangmassage-web.vercel.app/api/topup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapist_id: profile?.id,
          amount: numAmount,
          payment_method: selectedMethod,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      if (result.data?.redirect_url) {
        setPaymentUrl(result.data.redirect_url);
        setShowWebView(true);
      } else {
        throw new Error('Gagal mendapatkan link pembayaran');
      }
    } catch (error: any) {
      showAlert('error', 'Gagal', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const onWebViewStateChange = (navState: any) => {
    if (navState.url.includes('finish') || navState.url.includes('error') || navState.url.includes('callback')) {
      setShowWebView(false);
      showAlert(
        'success', 
        'Transaksi Selesai', 
        'Silakan cek saldo Anda secara berkala dalam beberapa menit.',
        [{ text: 'OK', onPress: () => {
          useTherapistStore.getState().fetchProfile();
          router.back();
        }}]
      );
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <View style={[styles.header, { backgroundColor: t.headerBg }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Top Up Saldo</Text>
          <TouchableOpacity onPress={() => router.push('/profile/topup-history')} style={styles.backBtn}>
            <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <View>
              <Text style={styles.infoLabel}>Saldo Saat Ini</Text>
              <Text style={styles.infoValue}>Rp {(profile?.wallet_balance || 0).toLocaleString('id-ID')}</Text>
            </View>
            <View style={[styles.walletIcon, { backgroundColor: t.secondary + '20' }]}>
              <Ionicons name="wallet-outline" size={24} color={t.secondary} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilih Nominal Top Up</Text>
            <View style={styles.inputCard}>
              <Text style={styles.currency}>Rp</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={t.textMuted}
                keyboardType="number-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={styles.presetGrid}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetBtn, amount === p.toString() && { borderColor: t.secondary, backgroundColor: t.secondary + '10' }]}
                  onPress={() => setAmount(p.toString())}
                >
                  <Text style={[styles.presetText, amount === p.toString() && { color: t.secondary }]}>
                    {p >= 1000000 ? `${p / 1000000} Juta` : `${p / 1000}rb`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
            {PAYMENT_GROUPS.map((group) => (
              <View key={group.id} style={styles.accordionContainer}>
                <TouchableOpacity 
                  style={[styles.groupHeader, expandedGroup === group.id && styles.groupHeaderActive]} 
                  onPress={() => toggleGroup(group.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.groupIcon, { backgroundColor: t.background }]}>
                    <Ionicons name={group.icon as any} size={20} color={t.textSecondary} />
                  </View>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Ionicons 
                    name={expandedGroup === group.id ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={t.textMuted} 
                  />
                </TouchableOpacity>

                {expandedGroup === group.id && (
                  <View style={styles.groupContent}>
                    {group.items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.methodItem, selectedMethod === item.id && { borderColor: t.secondary, backgroundColor: t.secondary + '05' }]}
                        onPress={() => setSelectedMethod(item.id)}
                      >
                        <View style={[styles.methodIcon, { backgroundColor: t.background }]}>
                          <Ionicons name={item.icon as any} size={18} color={t.primary} />
                        </View>
                        <Text style={styles.methodName}>{item.name}</Text>
                        <View style={[styles.radio, selectedMethod === item.id && { borderColor: t.secondary }]}>
                          {selectedMethod === item.id && <View style={[styles.radioInner, { backgroundColor: t.secondary }]} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={{ marginTop: SPACING.xl, paddingBottom: 60 }}>
            <TouchableOpacity
              onPress={handleTopup}
              disabled={loading || !amount || !selectedMethod}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading || !amount || !selectedMethod ? [t.border, t.border] : [t.secondary, '#EA580C']}
                style={styles.btn}
              >
                <Text style={styles.btnText}>{loading ? 'Memproses...' : 'Lanjutkan Pembayaran'}</Text>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.footerNote}>Keamanan transaksi dijamin oleh Midtrans</Text>
          </View>
        </ScrollView>

        <Modal visible={showWebView} animationType="slide">
          <View style={{ flex: 1 }}>
            <View style={styles.webViewHeader}>
              <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color={t.text} />
              </TouchableOpacity>
              <Text style={styles.webViewTitle}>Pembayaran Aman</Text>
              <View style={{ width: 40 }} />
            </View>
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={onWebViewStateChange}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webLoading}>
                  <ActivityIndicator size="large" color={t.primary} />
                </View>
              )}
            />
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.lg,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  scroll: { padding: SPACING.lg },
  infoCard: {
    backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: t.border, marginBottom: SPACING.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  infoLabel: { ...TYPOGRAPHY.caption, color: t.textSecondary, marginBottom: 4 },
  infoValue: { ...TYPOGRAPHY.h2, color: t.text, fontFamily: 'Inter_700Bold' },
  walletIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, marginBottom: SPACING.md, fontFamily: 'Inter_600SemiBold' },
  inputCard: {
    backgroundColor: t.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg,
    paddingVertical: 16, borderWidth: 1.5, borderColor: t.border,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  currency: { ...TYPOGRAPHY.h2, color: t.text, fontFamily: 'Inter_700Bold' },
  input: { ...TYPOGRAPHY.h2, color: t.text, flex: 1, fontFamily: 'Inter_700Bold', padding: 0 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  presetBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
  },
  presetText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, fontFamily: 'Inter_600SemiBold' },
  
  accordionContainer: { marginBottom: SPACING.sm, backgroundColor: t.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: t.border },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  groupHeaderActive: { borderBottomWidth: 1, borderBottomColor: t.border },
  groupIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { ...TYPOGRAPHY.body, color: t.text, flex: 1, fontFamily: 'Inter_600SemiBold' },
  groupContent: { padding: SPACING.sm, gap: SPACING.xs },
  
  methodItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: RADIUS.md, padding: SPACING.sm,
    borderWidth: 1, borderColor: 'transparent',
  },
  methodIcon: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  methodName: { ...TYPOGRAPHY.bodySmall, color: t.text, flex: 1, fontFamily: 'Inter_500Medium' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: RADIUS.full,
    shadowColor: t.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnText: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  footerNote: { ...TYPOGRAPHY.caption, color: t.textMuted, textAlign: 'center', marginTop: SPACING.md },
  
  webViewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: t.surface },
  webViewTitle: { ...TYPOGRAPHY.h4, color: t.text },
  closeBtn: { padding: 4 },
  webLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: t.background, alignItems: 'center', justifyContent: 'center' },
});
