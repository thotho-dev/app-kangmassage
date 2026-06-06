import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const fmtDate = (d: string | undefined | null) => {
  if (!d) return '-';
  try { return format(new Date(d), 'dd MMM yyyy, HH:mm', { locale: localeId }); }
  catch { return '-'; }
};
import { useAlert } from '@/components/CustomAlert';

export default function WithdrawDetailScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('therapist_withdrawals').select('*').eq('id', id).single().then(({ data, error }) => {
      if (data) setItem(data);
      setLoading(false);
    });
  }, [id]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { color: '#10B981', bg: '#10B98115', label: 'Selesai', icon: 'checkmark-circle' as const };
      case 'pending': return { color: '#F59E0B', bg: '#F59E0B15', label: 'Diproses', icon: 'time' as const };
      case 'cancelled': return { color: t.textMuted, bg: t.border, label: 'Dibatalkan', icon: 'close-circle' as const };
      case 'failed': return { color: '#EF4444', bg: '#EF444415', label: 'Gagal', icon: 'close-circle' as const };
      default: return { color: t.textSecondary, bg: t.border, label: status, icon: 'ellipse' as const };
    }
  };

  const handleCancel = async () => {
    if (!item || item.status !== 'pending') return;

    showAlert('warning', 'Batalkan Penarikan?', 'Saldo akan dikembalikan ke dompet Anda.', [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Ya, Batalkan',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('therapist_withdrawals').update({ status: 'cancelled', payment_data: { reason: 'Cancelled by therapist' } }).eq('id', item.id);

            const currentBalance = Number(profile?.wallet_balance) || 0;
            const refundAmount = Number(item.amount) + Number(item.fee);
            await supabase.from('therapists').update({ wallet_balance: currentBalance + refundAmount }).eq('id', profile?.id);
            await supabase.from('transactions').insert({
              therapist_id: profile?.id, type: 'credit', amount: refundAmount,
              balance_before: currentBalance, balance_after: currentBalance + refundAmount,
              description: `Batal: Penarikan Saldo (${item.bank_name})`,
              metadata: { withdrawal_id: item.id, type: 'cancellation' }
            });

            useTherapistStore.getState().fetchProfile();
            showAlert('success', 'Berhasil', 'Penarikan telah dibatalkan dan saldo dikembalikan.');
            setItem((prev: any) => ({ ...prev, status: 'failed' }));
          } catch (e: any) {
            showAlert('error', 'Gagal', e.message || 'Terjadi kesalahan');
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: t.textMuted }}>Memuat...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={t.danger} />
        <Text style={[styles.label, { color: t.text, marginTop: 12 }]}>Transaksi tidak ditemukan</Text>
      </View>
    );
  }

  const status = getStatusStyle(item.status);

  return (
    <View style={styles.container}>
      {AlertComponent}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Detail Penarikan</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.summaryCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.summaryIcon, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={36} color={status.color} />
          </View>
          <Text style={[styles.summaryAmount, { color: t.text }]}>- Rp {item.amount.toLocaleString('id-ID')}</Text>
          <View style={[styles.summaryBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.summaryBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={[styles.summaryDate, { color: t.textMuted }]}>
            {fmtDate(item.created_at)}
          </Text>
        </View>

        <View style={[styles.detailCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Informasi Transaksi</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Jumlah</Text>
            <Text style={[styles.value, { color: t.text, fontFamily: 'Inter_700Bold' }]}>Rp {item.amount.toLocaleString('id-ID')}</Text>
          </View>
          {item.fee > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.label}>Biaya Admin</Text>
                <Text style={[styles.value, { color: t.danger }]}>- Rp {item.fee.toLocaleString('id-ID')}</Text>
              </View>
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Bank</Text>
            <Text style={[styles.value, { color: t.text }]}>{item.bank_name || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>No. Rekening</Text>
            <Text style={[styles.value, { color: t.text }]}>{item.account_number || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Atas Nama</Text>
            <Text style={[styles.value, { color: t.text }]}>{item.account_name || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Referensi</Text>
            <Text style={[styles.value, { color: t.text }]}>{item.external_id || '-'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Dibuat</Text>
            <Text style={[styles.value, { color: t.text }]}>
              {fmtDate(item.created_at)}
            </Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: t.danger }]} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={20} color={t.danger} />
            <Text style={[styles.cancelBtnText, { color: t.danger }]}>Batalkan Penarikan</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 30, paddingBottom: SPACING.lg, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  summaryCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, marginBottom: SPACING.lg },
  summaryIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  summaryAmount: { ...TYPOGRAPHY.h2, fontFamily: 'Inter_700Bold', marginBottom: SPACING.sm },
  summaryBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, marginBottom: SPACING.sm },
  summaryBadgeText: { ...TYPOGRAPHY.bodySmall, fontFamily: 'Inter_700Bold' },
  summaryDate: { ...TYPOGRAPHY.caption },
  detailCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, marginBottom: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold', marginBottom: SPACING.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  label: { ...TYPOGRAPHY.bodySmall, color: t.textMuted },
  value: { ...TYPOGRAPHY.bodySmall, fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1, backgroundColor: t.border, marginVertical: 6, opacity: 0.5 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: RADIUS.lg, borderWidth: 1.5, marginTop: SPACING.sm },
  cancelBtnText: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold' },
});
