import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/store/themeStore';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { useTherapistStore } from '@/store/therapistStore';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

interface ReviewItem {
  id: string;
  rating: number;
  review: string;
  completed_at: string;
  service: {
    name: string;
  } | null;
  user: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export default function ReviewsScreen() {
  const router = useRouter();
  const t = useThemeColors();
  const styles = getStyles(t);
  const { profile } = useTherapistStore();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [profile]);

  const fetchReviews = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          rating,
          review,
          completed_at,
          service:services(name),
          user:users(full_name, avatar_url)
        `)
        .eq('therapist_id', profile.id)
        .eq('status', 'completed')
        .not('rating', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setReviews((data as any) || []);
    } catch (e) {
      console.error('Error fetching reviews:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  // Mask name for privacy (Privacy Shield)
  const maskName = (name: string | undefined | null) => {
    if (!name) return 'Pelanggan Kang Massage';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].length > 2 ? parts[0].substring(0, 2) + '***' : parts[0] + '***';
    }
    const firstName = parts[0];
    const lastNameChar = parts[1].charAt(0);
    return `${firstName} ${lastNameChar}.`;
  };

  // Format date cleanly
  const formatReviewDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: localeID });
    } catch {
      return 'Baru-baru ini';
    }
  };

  // Calculate rating analytics
  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = totalReviews > 0 ? ratingSum / totalReviews : 5.0;

  const starCounts = [0, 0, 0, 0, 0]; // 1, 2, 3, 4, 5 stars
  reviews.forEach(r => {
    const rate = Math.round(r.rating);
    if (rate >= 1 && rate <= 5) {
      starCounts[rate - 1]++;
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ulasan Pelanggan</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Section */}
          <View style={[styles.summaryCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.summaryLeft}>
              <Text style={[styles.ratingNumber, { color: t.text }]}>
                {(profile?.rating || avgRating).toFixed(1)}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => {
                  const currentAvg = profile?.rating || avgRating;
                  const isFilled = star <= Math.round(currentAvg);
                  return (
                    <Ionicons
                      key={star}
                      name={isFilled ? "star" : "star-outline"}
                      size={18}
                      color={t.warning}
                    />
                  );
                })}
              </View>
              <Text style={[styles.totalReviewsText, { color: t.textSecondary }]}>
                {totalReviews} Ulasan
              </Text>
            </View>

            <View style={styles.dividerVertical} />

            {/* Star Bars */}
            <View style={styles.summaryRight}>
              {[5, 4, 3, 2, 1].map(stars => {
                const count = starCounts[stars - 1];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <View key={stars} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: t.textSecondary }]}>{stars}</Text>
                    <Ionicons name="star" size={10} color={t.warning} style={{ marginRight: 4 }} />
                    <View style={[styles.barBg, { backgroundColor: t.border }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: stars >= 4 ? t.success : (stars === 3 ? t.warning : t.danger)
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: t.textMuted }]}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Rating Bumper Explanation Card */}
          <View style={[styles.infoCard, { backgroundColor: t.info + '10', borderColor: t.info + '30' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs, gap: SPACING.xs }}>
              <Ionicons name="shield-checkmark" size={18} color={t.info} />
              <Text style={[styles.infoTitle, { color: t.info }]}>Sistem Perlindungan Rating</Text>
            </View>
            <Text style={[styles.infoBody, { color: t.text }]}>
              Rating profil Anda dihitung berdasarkan **Moving Average dari 50 pesanan terakhir**. Untuk melindungi mitra baru, sistem mengaktifkan 10 penyangga bintang 5 (Bayesian Anchor) sehingga ulasan pertama yang kurang memuaskan tidak langsung merusak reputasi profil Anda secara drastis.
            </Text>
          </View>

          {/* Individual Review List */}
          <View style={styles.listSection}>
            <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>Riwayat Ulasan</Text>

            {reviews.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbox-ellipses-outline" size={48} color={t.textMuted} />
                <Text style={[styles.emptyText, { color: t.textSecondary }]}>Belum ada ulasan dari pelanggan.</Text>
              </View>
            ) : (
              reviews.map((item, index) => (
                <View key={item.id || index} style={[styles.reviewCard, { backgroundColor: t.surface, borderColor: t.border }]}>
                  {/* Header review */}
                  <View style={styles.reviewHeader}>
                    <View style={styles.userPhotoWrap}>
                      {item.user?.avatar_url ? (
                        <Image source={{ uri: item.user.avatar_url }} style={styles.userAvatar} />
                      ) : (
                        <View style={[styles.userAvatar, { backgroundColor: t.secondary }]}>
                          <Text style={styles.avatarInitial}>
                            {(item.user?.full_name || 'P').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: t.text }]}>
                        {maskName(item.user?.full_name)}
                      </Text>
                      <Text style={[styles.reviewTime, { color: t.textMuted }]}>
                        {formatReviewDate(item.completed_at)}
                      </Text>
                    </View>

                    <View style={styles.cardStars}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Ionicons
                          key={star}
                          name={star <= item.rating ? "star" : "star-outline"}
                          size={12}
                          color={t.warning}
                        />
                      ))}
                    </View>
                  </View>

                  {/* Body review */}
                  <View style={styles.reviewBody}>
                    {item.service && (
                      <View style={[styles.serviceTag, { backgroundColor: t.primary + '15' }]}>
                        <Ionicons name="medical-outline" size={10} color={t.primary} />
                        <Text style={[styles.serviceText, { color: t.primary }]}>
                          {item.service.name}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.reviewComment, { color: t.text }]}>
                      {item.review ? `"${item.review}"` : 'Terapis ramah dan memberikan pelayanan terbaik.'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 60,
  },
  summaryCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryLeft: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ratingNumber: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    lineHeight: 52,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  totalReviewsText: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    height: '80%',
    backgroundColor: t.border,
    marginHorizontal: SPACING.md,
  },
  summaryRight: {
    flex: 2,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barLabel: {
    ...TYPOGRAPHY.caption,
    width: 10,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    marginRight: 2,
  },
  barBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barValue: {
    ...TYPOGRAPHY.caption,
    width: 24,
    textAlign: 'right',
    marginLeft: 6,
  },
  infoCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontFamily: 'Inter_700Bold',
  },
  infoBody: {
    ...TYPOGRAPHY.bodySmall,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  listSection: {
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.body,
    fontFamily: 'Inter_700Bold',
    marginLeft: 4,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  reviewCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  userPhotoWrap: {
    position: 'relative',
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  userName: {
    ...TYPOGRAPHY.bodySmall,
    fontFamily: 'Inter_700Bold',
  },
  reviewTime: {
    ...TYPOGRAPHY.caption,
  },
  cardStars: {
    flexDirection: 'row',
    gap: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  reviewBody: {
    gap: SPACING.xs,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  serviceText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  reviewComment: {
    ...TYPOGRAPHY.bodySmall,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
