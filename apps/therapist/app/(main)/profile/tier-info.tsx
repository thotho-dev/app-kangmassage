import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/store/themeStore';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { useTherapistStore } from '@/store/therapistStore';
import { TIER_DATA } from '@/lib/tierLogic';
import { supabase } from '@/lib/supabase';
import { ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

export default function TierInfoScreen() {
  const router = useRouter();
  const t = useThemeColors();
  const styles = getStyles(t);
  const { profile } = useTherapistStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState({ unit: 0, amount: 0 });
  const [loading, setLoading] = useState(true);
  
  const currentTier = profile?.tier || 'Bronze';
  
  const getNextTierTarget = () => {
    const currentTierIndex = TIER_DATA.findIndex(t => t.tier.toLowerCase() === currentTier.toLowerCase());
    const activeTierData = TIER_DATA[currentTierIndex === -1 ? 0 : currentTierIndex];
    
    // Check if therapist has completed their current tier target in this month/period
    const hasCompletedCurrent = (
      (activeTierData.orderUnit === 0 || progress.unit >= activeTierData.orderUnit) &&
      progress.amount >= activeTierData.orderAmount
    );
    
    if (!hasCompletedCurrent) {
      // If they haven't met their current tier requirement for this period, they must complete it first
      return activeTierData;
    } else {
      // If they have satisfied it, progress tracks to the next level
      const nextIndex = currentTierIndex + 1;
      return TIER_DATA[nextIndex >= TIER_DATA.length ? TIER_DATA.length - 1 : nextIndex];
    }
  };
  
  const nextTier = getNextTierTarget();

  useEffect(() => {
    fetchProgress();
  }, [profile]);

  const fetchProgress = async () => {
    if (!profile) return;
    try {
      const now = new Date();
      const isDiamond = currentTier.toLowerCase() === 'diamond';
      let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      
      if (isDiamond) {
         const startMonth = now.getMonth() >= 6 ? 6 : 0; 
         startDate = new Date(now.getFullYear(), startMonth, 1);
      }

      const { data } = await supabase
        .from('orders')
        .select('total_price, service_price, service_fee')
        .eq('therapist_id', profile.id)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      if (data) {
        const amount = data.reduce((sum, o) => {
          const price = Number(o.service_price) || (Number(o.total_price) - (Number(o.service_fee) || 0));
          return sum + price;
        }, 0);
        setProgress({ unit: data.length, amount });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      case 'diamond': return '#b9f2ff';
      default: return t.primary;
    }
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informasi Tier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Current Tier Summary */}
        <View style={{ paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.md }}>
          <Text style={styles.sectionTitle}>Tier Anda Saat Ini:</Text>
          <View style={[styles.currentTierBadge, { backgroundColor: getTierColor(currentTier) + '15', borderColor: getTierColor(currentTier) }]}>
            <Ionicons name="star" size={20} color={getTierColor(currentTier)} />
            <Text style={[styles.currentTierText, { color: getTierColor(currentTier) }]}>{currentTier.toUpperCase()}</Text>
          </View>

          {/* Progress Tracker */}
          <View style={[styles.progressCard, { borderColor: t.border, backgroundColor: t.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, gap: SPACING.sm }}>
              <Ionicons name="trending-up" size={18} color={t.primary} />
              <Text style={{ ...TYPOGRAPHY.h4, color: t.text }}>Progress Pencapaian {nextTier.tier}</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={t.primary} />
            ) : (
              <View style={{ gap: SPACING.md }}>
                {/* Unit Progress */}
                <View>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Pesanan Selesai</Text>
                    <Text style={styles.progressValue}>
                      {progress.unit} <Text style={{ color: t.textSecondary, fontSize: 10 }}>/ {nextTier.orderUnit || 'Max'} Unit</Text>
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: t.border }]}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          backgroundColor: progress.unit >= (nextTier.orderUnit || 0) && nextTier.orderUnit > 0 ? t.success : t.primary,
                          width: `${nextTier.orderUnit ? Math.min((progress.unit / nextTier.orderUnit) * 100, 100) : 100}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>

                {/* Amount Progress */}
                <View>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Pendapatan</Text>
                    <Text style={styles.progressValue}>
                      {formatCurrency(progress.amount)} <Text style={{ color: t.textSecondary, fontSize: 10 }}>/ {formatCurrency(nextTier.orderAmount)}</Text>
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: t.border }]}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          backgroundColor: progress.amount >= nextTier.orderAmount ? t.success : t.secondary,
                          width: `${Math.min((progress.amount / nextTier.orderAmount) * 100, 100)}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Carousel / Slider */}
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={{ flexGrow: 0 }}
        >
          {TIER_DATA.map((item, index) => {
            const isCurrent = item.tier.toLowerCase() === currentTier.toLowerCase();
            const tierColor = getTierColor(item.tier);
            
            return (
              <View key={index} style={[styles.slide, { width }]}>
                <View style={[
                  styles.card, 
                  isCurrent && { borderColor: tierColor, borderWidth: 2 }
                ]}>
                  <View style={[styles.cardHeader, { backgroundColor: tierColor + '15' }]}>
                    <Ionicons name={isCurrent ? "star" : "star-outline"} size={32} color={tierColor} />
                    <Text style={[styles.tierName, { color: tierColor }]}>{item.tier}</Text>
                    {isCurrent && (
                      <View style={[styles.currentLabel, { backgroundColor: tierColor }]}>
                        <Text style={styles.currentLabelText}>Saat Ini</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.cardBody}>
                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Target Pesanan</Text>
                        <Text style={styles.statValue}>{item.orderUnit ? `${item.orderUnit} Unit` : 'Tanpa batas'}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Target Pendapatan</Text>
                        <Text style={[styles.statValue, { color: t.primary }]}>{formatCurrency(item.orderAmount)}</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Komisi Platform</Text>
                        <Text style={styles.statValue}>{item.komisi}%</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Reward Target</Text>
                        <Text style={[styles.statValue, { color: t.success }]}>{formatCurrency(item.reward)}</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.targetPeriodBox}>
                      <Ionicons name="calendar-outline" size={16} color={t.textSecondary} />
                      <Text style={styles.targetPeriodText}>Masa Evaluasi: {item.targetMonth}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {TIER_DATA.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                activeIndex === i && { backgroundColor: t.primary, width: 24 }
              ]} 
            />
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={t.info} />
          <Text style={styles.infoText}>
            Penuhi Target Pesanan dan Target Pendapatan pada masa evaluasi untuk mendapatkan Reward yang otomatis ditambahkan ke saldo Anda!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  backBtn: {
    padding: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: t.text,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    ...TYPOGRAPHY.body,
    color: t.textSecondary,
    marginBottom: SPACING.sm,
  },
  currentTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  currentTierText: {
    ...TYPOGRAPHY.h4,
    fontFamily: 'Inter_700Bold',
  },
  progressCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  progressLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: t.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  progressValue: {
    ...TYPOGRAPHY.bodySmall,
    color: t.text,
    fontFamily: 'Inter_700Bold',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  slide: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  card: {
    backgroundColor: t.surface,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
    position: 'relative',
  },
  tierName: {
    ...TYPOGRAPHY.h1,
    marginTop: SPACING.sm,
  },
  currentLabel: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  currentLabelText: {
    ...TYPOGRAPHY.caption,
    color: '#000',
    fontFamily: 'Inter_700Bold',
  },
  cardBody: {
    padding: SPACING.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: t.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    ...TYPOGRAPHY.h4,
    color: t.text,
  },
  divider: {
    height: 1,
    backgroundColor: t.border,
    marginVertical: SPACING.md,
  },
  targetPeriodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: t.surfaceLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
  },
  targetPeriodText: {
    ...TYPOGRAPHY.bodySmall,
    color: t.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.border,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: t.info + '15',
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: t.text,
    lineHeight: 20,
  }
});
