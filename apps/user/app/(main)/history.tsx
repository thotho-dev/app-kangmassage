import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Clock, 
  Star, 
  FileText,
  Heart,
  MessageSquare
} from 'lucide-react-native';
import { COLORS } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const PURPLE = '#240080';
const GOLD = '#FDB927';
const SUCCESS = '#00A896';
const ERROR = '#E74C3C';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F5F5F7';

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

const FAV_DATA = [
  {
    id: 'fav-1',
    name: 'Maya Putri',
    rating: 4.9,
    orders: 124,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
    specialty: 'Swedish & Deep Tissue'
  },
  {
    id: 'fav-2',
    name: 'Siti Aminah',
    rating: 4.8,
    orders: 89,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecee?w=400',
    specialty: 'Refleksi & Totok'
  }
];

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function HistoryScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'riwayat' | 'favorit'>('riwayat');
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchOrders();
    }
  }, [profile?.id]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services:service_id(name, image_url),
          therapists:therapist_id(full_name, avatar_url)
        `)
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      case 'pending': return 'Menunggu';
      case 'accepted': return 'Diterima';
      case 'on_way': return 'Di Jalan';
      case 'processing': return 'Diproses';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return SUCCESS;
      case 'cancelled': return ERROR;
      case 'pending': return GOLD;
      default: return PURPLE;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'riwayat' ? 'Riwayat Pesanan' : 'Terapis Favorit'}
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'riwayat' && styles.activeTab]}
          onPress={() => setActiveTab('riwayat')}
        >
          <Text style={[styles.tabText, activeTab === 'riwayat' && styles.activeTabText]}>Riwayat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorit' && styles.activeTab]}
          onPress={() => setActiveTab('favorit')}
        >
          <Text style={[styles.tabText, activeTab === 'favorit' && styles.activeTabText]}>Favorit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'riwayat' ? (
          orders.length > 0 ? (
            orders.map((item) => {
              const statusColor = getStatusColor(item.status);
              return (
                <TouchableOpacity key={item.id} activeOpacity={0.85} style={styles.card}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.orderIdRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={styles.orderId}>{item.order_number || item.id.substring(0, 8)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <Image 
                      source={{ uri: item.therapists?.avatar_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }} 
                      style={styles.therapistImage} 
                    />
                    <View style={styles.infoBox}>
                      <Text style={styles.therapistName}>{item.therapists?.full_name || 'Mencari Terapis...'}</Text>
                      <Text style={styles.serviceName}>{item.services?.name}</Text>
                      <View style={styles.metaRow}>
                        <Clock size={11} color={TEXT_MUTED} />
                        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.rightBox}>
                      <Text style={styles.priceText}>Rp {item.total_price?.toLocaleString('id-ID')}</Text>
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.footerBtn}>
                      <FileText size={14} color={GOLD} />
                      <Text style={styles.footerBtnText}>Detail</Text>
                    </TouchableOpacity>
                    <View style={styles.footerDivider} />
                    <TouchableOpacity style={styles.footerBtn} onPress={() => router.push({ pathname: '/(main)/chat', params: { orderId: item.id } })}>
                      <MessageSquare size={14} color={PURPLE} />
                      <Text style={styles.footerBtnText}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada riwayat pesanan</Text>
            </View>
          )
        ) : (
          FAV_DATA.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.85} style={styles.card}>
              <View style={styles.favRow}>
                <Image source={{ uri: item.image }} style={styles.favAvatar} />
                <View style={styles.favInfo}>
                  <Text style={styles.favName}>{item.name}</Text>
                  <Text style={styles.favSpecialty}>{item.specialty}</Text>
                  <View style={styles.favMeta}>
                    <View style={styles.favRatingRow}>
                      <Star size={11} color={GOLD} fill={GOLD} />
                      <Text style={styles.favRatingText}>{item.rating}</Text>
                    </View>
                    <Text style={styles.favOrdersText}>• {item.orders} Pesanan</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.bookBtn}>
                  <Text style={styles.bookBtnText}>Pesan</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: TEXT_MUTED,
  },
  activeTabText: {
    color: '#FFFFFF',
  },

  // Scroll
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  // Order Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  orderId: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  therapistImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  infoBox: {
    flex: 1,
    gap: 3,
  },
  therapistName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  serviceName: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  rightBox: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(253,185,39,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: GOLD,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  footerDivider: {
    width: 1,
    backgroundColor: BORDER,
  },
  footerBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: TEXT_MUTED,
  },

  // Favorit Card
  favRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  favAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  favInfo: {
    flex: 1,
    gap: 3,
  },
  favName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  favSpecialty: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  favMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  favRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  favRatingText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  favOrdersText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  bookBtn: {
    backgroundColor: '#EDE8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bookBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
});
