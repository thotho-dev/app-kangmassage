import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useThemeColors } from '@/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTherapistStore } from '@/store/therapistStore';
import { useAlert } from '@/components/CustomAlert';
import { SPACING, TYPOGRAPHY } from '@/constants/Theme';
import { useState, useRef } from 'react';

export default function WebviewPaymentScreen() {
  const t = useThemeColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertComponent } = useAlert();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const invoiceUrl = params.url as string;
  const topupId = params.topup_id as string;

  if (!invoiceUrl) {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <View style={styles.center}>
          <Text style={{ color: t.textMuted }}>URL pembayaran tidak ditemukan.</Text>
        </View>
      </View>
    );
  }

  const handleClose = () => {
    useTherapistStore.getState().fetchProfile();
    router.replace('/profile/topup-history');
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {AlertComponent}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Pembayaran</Text>
        <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
          <Text style={{ color: t.secondary, fontWeight: 'bold', fontSize: 13 }}>Selesai</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.secondary} />
          <Text style={{ color: t.textMuted, marginTop: 12 }}>Memuat halaman pembayaran...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: invoiceUrl }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: 30, paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  webview: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
});
