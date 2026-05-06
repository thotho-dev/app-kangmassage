import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, MessageCircle, MapPin, Clock, ShieldCheck, Navigation } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function TrackingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1569336415962-a4bd9f6dfc0f?w=1200' }}
          style={styles.map}
        />
        <LinearGradient
          colors={isDark ? ['rgba(2, 6, 23, 0.9)', 'transparent', 'transparent', 'rgba(2, 6, 23, 0.9)'] : ['rgba(255, 255, 255, 0.7)', 'transparent', 'transparent', 'rgba(255, 255, 255, 0.7)']}
          style={StyleSheet.absoluteFill as any}
        />
        
        {/* Header Overlay */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={[styles.orderBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.orderBadgeText, { color: theme.text }]}>{id || 'ORD-9821'}</Text>
          </View>
        </View>

        {/* Floating Therapist Info */}
        <View style={styles.floatingInfo}>
           <LinearGradient
             colors={isDark ? ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.05)'] : ['rgba(15, 23, 42, 0.08)', 'rgba(15, 23, 42, 0.03)']}
             style={styles.infoCard as any}
           >
              <View style={styles.therapistInfo}>
                 <View style={styles.avatarWrapper}>
                    <Image 
                      source={{ uri: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }}
                      style={styles.avatar}
                    />
                    <View style={styles.onlineDot} />
                 </View>
                 <View style={styles.textInfo}>
                    <Text style={[styles.name, { color: theme.text }]}>Maya Putri</Text>
                    <View style={styles.statusRow}>
                       <Navigation size={10} color={COLORS.gold[500]} />
                       <Text style={[styles.status, { color: theme.textSecondary }]}>Menuju ke lokasi Anda</Text>
                    </View>
                 </View>
              </View>
              <View style={styles.actionButtons}>
                 <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                    <Phone size={18} color={theme.text} />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.actionBtn, styles.msgBtn]}>
                    <MessageCircle size={18} color="white" />
                 </TouchableOpacity>
              </View>
           </LinearGradient>
        </View>
      </View>

      {/* Bottom Status Card */}
      <View style={[styles.statusCard, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
         <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
         
         <View style={styles.etaContainer}>
            <View>
               <Text style={[styles.etaLabel, { color: theme.textSecondary }]}>Perkiraan Tiba</Text>
               <Text style={[styles.etaTime, { color: theme.text }]}>12 <Text style={styles.etaUnit}>menit</Text></Text>
            </View>
            <View style={styles.etaIconWrapper}>
               <LinearGradient
                 colors={[COLORS.primary[500], COLORS.primary[700]]}
                 style={styles.etaIcon as any}
               >
                  <Clock size={28} color="white" />
               </LinearGradient>
            </View>
         </View>

         <View style={styles.timeline}>
            <View style={styles.timelineItem}>
               <View style={styles.timelineDotActive} />
               <View style={styles.timelineLine} />
               <Text style={[styles.timelineTextActive, { color: theme.text }]}>Pesanan Dikonfirmasi</Text>
            </View>
            <View style={styles.timelineItem}>
               <View style={styles.timelineDotActive} />
               <View style={styles.timelineLine} />
               <Text style={[styles.timelineTextActive, { color: theme.text }]}>Terapis Ditugaskan</Text>
            </View>
            <View style={styles.timelineItem}>
               <View style={styles.timelineDotPulse} />
               <View style={styles.timelineLineInactive} />
               <Text style={[styles.timelineTextActive, { color: COLORS.gold[500], fontWeight: '800' }]}>Dalam Perjalanan</Text>
            </View>
            <View style={styles.timelineItem}>
               <View style={[styles.timelineDotInactive, { backgroundColor: theme.border }]} />
               <Text style={[styles.timelineTextInactive, { color: theme.textSecondary }]}>Tiba & Mulai Sesi</Text>
            </View>
         </View>

         <View style={[styles.addressCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <View style={styles.addressIconWrapper}>
               <MapPin size={20} color={COLORS.gold[500]} />
            </View>
            <View style={styles.addressInfo}>
               <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>Tujuan</Text>
               <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>Grand Indonesia, East Mall, Fl 5</Text>
            </View>
         </View>

         <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDark ? 'rgba(231, 76, 60, 0.05)' : 'rgba(231, 76, 60, 0.03)', borderColor: 'rgba(231, 76, 60, 0.1)' }]} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Batalkan Pesanan</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  orderBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  orderBadgeText: {
    fontWeight: '900',
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    letterSpacing: 1,
  },
  floatingInfo: {
    position: 'absolute',
    top: 140,
    left: 24,
    right: 24,
    zIndex: 10,
  },
  infoCard: {
    borderRadius: 28,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  therapistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textInfo: {
    justifyContent: 'center',
  },
  name: {
    fontWeight: '800',
    fontSize: 17,
    fontFamily: TYPOGRAPHY.h3.fontFamily,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  msgBtn: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[500],
  },
  statusCard: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1.5,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 28,
  },
  etaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  etaLabel: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  etaTime: {
    fontSize: 32,
    fontFamily: TYPOGRAPHY.h1.fontFamily,
    fontWeight: '900',
  },
  etaUnit: {
    fontSize: 16,
    color: COLORS.gold[500],
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '800',
  },
  etaIconWrapper: {
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  etaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    marginBottom: 36,
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 18,
  },
  timelineDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary[500],
    zIndex: 1,
  },
  timelineDotPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.gold[500],
    zIndex: 1,
    borderWidth: 3,
    borderColor: 'rgba(253, 185, 39, 0.3)',
  },
  timelineDotInactive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 22,
    width: 1.5,
    height: 34,
    backgroundColor: COLORS.primary[500],
  },
  timelineLineInactive: {
    position: 'absolute',
    left: 5.5,
    top: 22,
    width: 1.5,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  timelineTextActive: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
  },
  timelineTextInactive: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
  },
  addressCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
    borderWidth: 1.5,
  },
  addressIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(253, 185, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
  },
  cancelText: {
    color: COLORS.error,
    fontWeight: '800',
    fontSize: 15,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    letterSpacing: 0.5,
  },
});
