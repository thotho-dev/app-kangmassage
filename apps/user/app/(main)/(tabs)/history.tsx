import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { 
  Clock, 
  Star, 
  FileText,
  Heart,
  MessageSquare,
  Search,
  ChevronLeft
} from 'lucide-react-native';
import { COLORS } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';

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

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function HistoryScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'riwayat' | 'favorit'>('riwayat');
  const [orders, setOrders] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchOrders(), fetchFavorites()]).then(() => setRefreshing(false));
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        refreshProfile();
        fetchOrders();
        fetchFavorites();
      }
    }, [profile?.id])
  );

  const fetchFavorites = async () => {
    if (!profile?.id) return;
    try {
      const { data: favData, error: favError } = await supabase
        .from('user_favorites')
        .select('therapist_id, id')
        .eq('user_id', profile.id);

      if (favError) throw favError;

      if (favData && favData.length > 0) {
        const therapistIds = favData.map(f => f.therapist_id);
        const { data: therapistsData, error: tError } = await supabase
          .from('therapists')
          .select('*')
          .in('id', therapistIds);

        if (tError) throw tError;

        // Combine favorites with therapist details
        const combined = favData.map(f => ({
          ...f,
          therapists: therapistsData.find(t => t.id === f.therapist_id)
        }));
        setFavorites(combined);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

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

  const handleOrderPress = (item: any) => {
    // 1. Jika Pesanan Masih Aktif (Bukan Selesai/Batal)
    if (item.status !== 'completed' && item.status !== 'cancelled') {
      if (item.status === 'pending') {
        if (item.payment_status === 'paid' || item.payment_method === 'tunai') {
          // Sudah bayar/tunai tapi belum dapat terapis
          router.push({ pathname: '/(main)/searching-therapist', params: { id: item.id } });
        } else if (item.payment_data) {
          // Belum bayar (VA/QRIS), arahkan ke instruksi pembayaran
          router.push({ 
            pathname: '/(main)/payment-details', 
            params: { data: JSON.stringify(item.payment_data), order_id: item.id } 
          });
        }
      } else {
        // Status lainnya (accepted, on_the_way, arrived, working) -> Tracking
        router.push({ pathname: '/(main)/tracking', params: { id: item.id } });
      }
    }
  };

  const handleCariLagi = async (orderId: string, status: string) => {
    try {
      if (status === 'cancelled') {
        // Reset status orderan ke pending dan hapus therapist agar bisa di-match ulang
        const { error } = await supabase
          .from('orders')
          .update({ status: 'pending', therapist_id: null })
          .eq('id', orderId);
          
        if (error) {
          Alert.alert('Gagal', 'Tidak dapat melakukan pencarian ulang.');
          return;
        }
      }
      // Arahkan ke halaman pencarian untuk matching ulang
      router.push({ pathname: '/(main)/searching-therapist', params: { id: orderId } });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Terjadi kesalahan sistem.');
    }
  };

  const handleChatPress = async (therapistId: string) => {
    if (!therapistId || !profile?.id) {
      Alert.alert('Informasi', 'Terapis belum ditugaskan untuk pesanan ini.');
      return;
    }
    
    try {
      // Cari apakah sudah ada percakapan antara user dan terapis ini
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', profile.id)
        .eq('therapist_id', therapistId)
        .maybeSingle();

      if (existing) {
        router.push(`/chats/${existing.id}`);
      } else {
        // Buat baru jika belum ada
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            user_id: profile.id,
            therapist_id: therapistId,
            last_message: 'Halo, saya ingin bertanya tentang pesanan saya.'
          })
          .select()
          .single();
          
        if (error) throw error;
        if (newConv) router.push(`/chats/${newConv.id}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal membuka percakapan.');
    }
  };

  const handleFavoritePress = async (therapistId: string) => {
    if (!therapistId || !profile?.id) return;
    
    try {
      const isFav = favorites.some(f => f.therapist_id === therapistId);
      
      if (isFav) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('therapist_id', therapistId);
        
        if (error) throw error;
        Alert.alert('Sukses', 'Dihapus dari favorit');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: profile.id, therapist_id: therapistId });
        
        if (error) throw error;
        Alert.alert('Sukses', 'Berhasil ditambahkan ke favorit!');
      }
      fetchFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Gagal memperbarui favorit');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'riwayat' ? 'Riwayat Pesanan' : 'Terapis Favorit'}
        </Text>
        <View style={{ width: 40 }} />
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

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} />
        }
      >
        {activeTab === 'riwayat' ? (
          orders.length > 0 ? (
            orders.map((item) => {
              const statusColor = getStatusColor(item.status);
              return (
                <TouchableOpacity 
                  key={item.id} 
                  activeOpacity={0.85} 
                  style={styles.card}
                  onPress={() => handleOrderPress(item)}
                >
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
                    <TouchableOpacity 
                      style={styles.footerBtn} 
                      onPress={() => router.push({ pathname: '/(main)/tracking', params: { id: item.id } })}
                    >
                      <FileText size={14} color={GOLD} />
                      <Text style={styles.footerBtnText}>Detail</Text>
                    </TouchableOpacity>
                    <View style={styles.footerDivider} />
                    {item.status === 'cancelled' || item.status === 'pending' ? (
                      <TouchableOpacity style={styles.footerBtn} onPress={() => handleCariLagi(item.id, item.status)}>
                        <Search size={14} color={PURPLE} />
                        <Text style={styles.footerBtnText}>Cari Lagi</Text>
                      </TouchableOpacity>
                    ) : item.status === 'completed' ? (
                      <TouchableOpacity style={styles.footerBtn} onPress={() => handleFavoritePress(item.therapist_id)}>
                        <Heart size={14} color="#EF4444" />
                        <Text style={styles.footerBtnText}>Favorit</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.footerBtn} onPress={() => handleChatPress(item.therapist_id)}>
                        <MessageSquare size={14} color={PURPLE} />
                        <Text style={styles.footerBtnText}>Chat</Text>
                      </TouchableOpacity>
                    )}
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
          favorites.length > 0 ? (
            favorites.map((fav) => {
              const item = fav.therapists;
              if (!item) return null;
              return (
                <View key={fav.id} style={styles.favCard}>
                  <View style={styles.favCardTop}>
                    <View style={styles.favHeaderLeft}>
                      <View style={styles.favAvatarWrapper}>
                        <Image source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }} style={styles.favAvatar} />
                        <View style={styles.favStatusDot} />
                      </View>
                      <View style={styles.favMainInfo}>
                        <Text style={styles.favNameText}>{item.full_name}</Text>
                        <Text style={styles.favSpecialtyText} numberOfLines={1}>
                          {Array.isArray(item.specializations) ? item.specializations.join(', ') : 'Terapis Profesional'}
                        </Text>
                        <View style={styles.favMeta}>
                          <View style={styles.favRatingBadge}>
                            <Star size={10} color={GOLD} fill={GOLD} />
                            <Text style={styles.favRatingValue}>{item.rating || '4.8'}</Text>
                          </View>
                          <Text style={styles.favOrdersCount}>• 100+ Pesanan</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.favHeartBtn} 
                      onPress={() => handleFavoritePress(item.id)}
                    >
                      <Heart size={20} color="#EF4444" fill="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.favDivider} />
                  
                  <View style={styles.favCardBottom}>
                    <TouchableOpacity 
                      style={styles.favChatBtn}
                      onPress={() => handleChatPress(item.id)}
                    >
                      <MessageSquare size={16} color={PURPLE} />
                      <Text style={styles.favChatBtnText}>Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.favBookBtn}
                      onPress={() => router.push({ pathname: '/(main)/services', params: { therapistId: item.id } })}
                    >
                      <Text style={styles.favBookBtnText}>Pesan Sekarang</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada terapis favorit</Text>
            </View>
          )
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
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
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

  // New Favorit Card Styles
  favCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  favCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  favHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 14,
  },
  favAvatarWrapper: {
    position: 'relative',
  },
  favAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  favStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: SUCCESS,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  favMainInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  favNameText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  favSpecialtyText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  favMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  favRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253, 185, 39, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  favRatingValue: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: GOLD,
  },
  favOrdersCount: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  favHeartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },
  favCardBottom: {
    flexDirection: 'row',
    gap: 12,
  },
  favChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PURPLE + '20',
  },
  favChatBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  favBookBtn: {
    flex: 2,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  favBookBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
