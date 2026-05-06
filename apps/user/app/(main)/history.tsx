import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Star, 
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCcw
} from 'lucide-react-native';
import Card from '../../components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const HISTORY_DATA = [
  {
    id: 'ORD-9821',
    therapist: 'Maya Putri',
    service: 'Swedish Massage',
    date: 'Hari ini, 10:30',
    price: 'Rp 165.000',
    status: 'completed',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400'
  },
  {
    id: 'ORD-9715',
    therapist: 'Budi Santoso',
    service: 'Refleksi',
    date: '28 Apr, 14:00',
    price: 'Rp 120.000',
    status: 'completed',
    rating: 4,
    image: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400'
  },
  {
    id: 'ORD-9642',
    therapist: 'Siti Aminah',
    service: 'Deep Tissue',
    date: '25 Apr, 18:00',
    price: 'Rp 185.000',
    status: 'cancelled',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecee?w=400'
  }
];

export default function HistoryScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Riwayat Pesanan</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {HISTORY_DATA.map((item) => (
          <TouchableOpacity key={item.id} activeOpacity={0.9} style={styles.cardWrapper}>
            <Card style={[styles.orderCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.cardHeader, { backgroundColor: theme.surfaceVariant, borderBottomColor: theme.border }]}>
                <View style={styles.orderIdContainer}>
                  <View style={[
                    styles.statusIndicator,
                    item.status === 'completed' ? styles.indicatorCompleted : styles.indicatorCancelled
                  ]} />
                  <Text style={[styles.orderId, { color: theme.text }]}>{item.id}</Text>
                </View>
                <View style={[
                  styles.statusBadge, 
                  item.status === 'completed' ? styles.statusCompleted : styles.statusCancelled
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'completed' ? styles.statusTextCompleted : styles.statusTextCancelled
                  ]}>
                    {item.status === 'completed' ? 'SELESAI' : 'DIBATALKAN'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Image source={{ uri: item.image }} style={styles.therapistImage} />
                <View style={styles.infoContainer}>
                  <Text style={[styles.therapistName, { color: theme.text }]}>{item.therapist}</Text>
                  <Text style={[styles.serviceName, { color: theme.textSecondary }]}>{item.service}</Text>
                  <View style={styles.metaRow}>
                    <Clock size={12} color={theme.textSecondary} />
                    <Text style={[styles.dateText, { color: theme.textSecondary }]}>{item.date}</Text>
                  </View>
                </View>
                <View style={styles.rightContainer}>
                   <Text style={[styles.priceText, { color: theme.text }]}>{item.price}</Text>
                   {item.rating && (
                     <View style={styles.ratingContainer}>
                        <Star size={10} color={COLORS.gold[500]} fill={COLORS.gold[500]} />
                        <Text style={styles.ratingText}>{item.rating}.0</Text>
                     </View>
                   )}
                </View>
              </View>
              
              <View style={[styles.cardFooter, { borderTopColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
                 <TouchableOpacity style={styles.footerAction}>
                    <FileText size={14} color={COLORS.gold[500]} />
                    <Text style={[styles.footerActionText, { color: theme.textSecondary }]}>Struk</Text>
                 </TouchableOpacity>
                 <View style={[styles.footerDivider, { backgroundColor: theme.border }]} />
                 <TouchableOpacity style={styles.footerAction}>
                    <RefreshCcw size={14} color={COLORS.primary[400]} />
                    <Text style={[styles.footerActionText, { color: theme.textSecondary }]}>Pesan Lagi</Text>
                 </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  cardWrapper: {
    marginBottom: 20,
  },
  orderCard: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorCompleted: {
    backgroundColor: COLORS.success,
  },
  indicatorCancelled: {
    backgroundColor: COLORS.error,
  },
  orderId: {
    fontWeight: '800',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: 'rgba(0, 168, 150, 0.1)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  statusText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusTextCompleted: {
    color: COLORS.success,
  },
  statusTextCancelled: {
    color: COLORS.error,
  },
  cardBody: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  therapistImage: {
    width: 64,
    height: 64,
    borderRadius: 18,
  },
  infoContainer: {
    flex: 1,
  },
  therapistName: {
    fontWeight: '800',
    fontSize: 17,
    fontFamily: TYPOGRAPHY.h3.fontFamily,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
  },
  rightContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priceText: {
    fontWeight: '800',
    fontSize: 15,
    fontFamily: TYPOGRAPHY.h3.fontFamily,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253, 185, 39, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    color: COLORS.gold[500],
    fontSize: 10,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  footerAction: {
    flex: 1,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerActionText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
  },
  footerDivider: {
    width: 1,
  }
});
