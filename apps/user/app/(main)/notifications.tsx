import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, BellOff } from 'lucide-react-native';

const PURPLE = '#240080';
const BG = '#F5F5F7';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Pesanan Selesai',
    message: 'Sesi pijat Anda telah selesai. Jangan lupa berikan rating untuk terapis!',
    time: '2 jam yang lalu',
    isRead: false,
  },
  {
    id: '2',
    title: 'Promo Spesial Akhir Pekan',
    message: 'Dapatkan diskon 20% untuk layanan Full Body Massage hari ini.',
    time: '5 jam yang lalu',
    isRead: true,
  },
  {
    id: '3',
    title: 'Sistem Update',
    message: 'Kami telah memperbarui aplikasi untuk pengalaman yang lebih lancar.',
    time: 'Kemarin',
    isRead: true,
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {NOTIFICATIONS.length > 0 ? (
          NOTIFICATIONS.map((item) => (
            <View key={item.id} style={[styles.card, !item.isRead && styles.unreadCard]}>
              <View style={styles.iconBox}>
                <Bell size={20} color={PURPLE} />
              </View>
              <View style={styles.content}>
                <View style={styles.row}>
                  <Text style={styles.title}>{item.title}</Text>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <BellOff size={64} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Belum Ada Notifikasi</Text>
            <Text style={styles.emptySubtitle}>Pemberitahuan terbaru akan muncul di sini.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  unreadCard: {
    backgroundColor: '#F9F7FF',
    borderColor: '#E6DEFF',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  message: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 8,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
    marginTop: 8,
    textAlign: 'center',
  },
});
