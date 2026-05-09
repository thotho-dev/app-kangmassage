import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { useRouter } from 'expo-router';

const MOCK_NOTIFS = [
  { id: '1', title: 'Pesanan Selesai', message: 'Anda telah menyelesaikan pesanan Siti Rahayu. Saldo Rp 120.000 telah ditambahkan.', time: '2 jam lalu', icon: 'checkmark-circle', color: '#10B981' },
  { id: '2', title: 'Promo Spesial', message: 'Dapatkan komisi tambahan 5% untuk setiap pesanan di hari Minggu!', time: '5 jam lalu', icon: 'gift', color: '#F97316' },
  { id: '3', title: 'Keamanan Akun', message: 'Password Anda berhasil diubah.', time: 'Kemarin', icon: 'shield-checkmark', color: '#06B6D4' },
];

export default function NotificationsScreen() {
  const t = useThemeColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Notifikasi</Text>
        <TouchableOpacity onPress={() => router.push('/notifications/settings')} style={styles.settingsBtn}>
           <Ionicons name="settings-outline" size={22} color={t.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_NOTIFS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={[styles.title, { color: t.text }]}>{item.title}</Text>
                <Text style={[styles.time, { color: t.textMuted }]}>{item.time}</Text>
              </View>
              <Text style={[styles.message, { color: t.textSecondary }]}>{item.message}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  settingsBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h3, fontFamily: 'Inter_700Bold' },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold' },
  time: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  message: { ...TYPOGRAPHY.bodySmall, lineHeight: 18 },
});
