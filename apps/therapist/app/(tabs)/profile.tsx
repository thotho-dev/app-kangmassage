import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore, useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { useAlert } from '@/components/CustomAlert';
import { Platform } from 'react-native';

const MENU_ITEMS = [
  { group: 'Akun', items: [
    { icon: 'lock-closed-outline', label: 'Ubah Kata Sandi', route: '/profile/change-password', color: 'info' },
    { icon: 'phone-portrait-outline', label: 'Ubah Nomor Telepon', route: '/profile/change-phone', color: 'secondary' },
    { icon: 'location-outline', label: 'Kelola Alamat', route: '/profile/address', color: 'success' },
    { icon: 'card-outline', label: 'Metode Pembayaran', route: '/profile/payment', color: 'warning' },
  ]},
  { group: 'Dukungan', items: [
    { icon: 'help-circle-outline', label: 'Bantuan', route: '/support/help', color: 'info' },
    { icon: 'chatbubbles-outline', label: 'FAQ', route: '/support/faq', color: 'secondary' },
    { icon: 'shield-outline', label: 'Kebijakan Privasi', route: '/support/privacy', color: 'success' },
    { icon: 'document-text-outline', label: 'Syarat & Ketentuan', route: '/support/terms', color: 'warning' },
    { icon: 'information-circle-outline', label: 'Tentang Aplikasi', route: '/support/about', color: 'textMuted' },
  ]},
];

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, isOnline, loading, toggleOnline, fetchProfile } = useTherapistStore();
  const [isToggling, setIsToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const t = useThemeColors();
  const styles = getStyles(t);
  const { AlertComponent, showAlert } = useAlert();

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );



  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const confirmLogout = () => {
    showAlert(
      'warning',
      'Keluar dari Akun?',
      'Anda akan keluar dari aplikasi. Status online Anda akan dinonaktifkan secara otomatis.',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Keluar', style: 'destructive', onPress: handleLogout },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleToggle = async () => {
    if (!profile || isToggling) return;
    setIsToggling(true);
    try {
      await toggleOnline();
    } catch (error) {
      console.error('Status Toggle Error:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const stats = [
    { label: 'Total Pesanan', value: profile?.total_orders || '0', icon: 'bag-outline' },
    { label: 'Rating', value: (profile?.rating || 5.0).toFixed(1), icon: 'star-outline' },
    { label: 'Level', value: profile?.tier || 'Bronze', icon: 'ribbon-outline' },
  ];

  if (loading && !profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={t.secondary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {AlertComponent}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={t.secondary}
            colors={[t.secondary]}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: t.headerBg, paddingBottom: SPACING.xl, borderBottomWidth: 1, borderBottomColor: t.border }]}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: t.secondary }]}>
                  <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>{profile?.full_name?.charAt(0) || '?'}</Text>
                </View>
              )}
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.name, { color: t.text }]}>{profile?.full_name || 'Mitra Terapis'}</Text>
                <Text style={[styles.phone, { color: t.textSecondary }]}>{profile?.phone || '-'}</Text>
                <View style={styles.tierBadge}>
                  <Ionicons name="star" size={12} color={t.warning} />
                  <Text style={styles.tierText}>{profile?.tier?.toUpperCase() || 'BRONZE'} MEMBER</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.editBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)', borderColor: t.border }]} 
                onPress={() => router.push('/profile/detail')}
              >
                <Ionicons name="create-outline" size={20} color={t.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : t.surfaceLight, borderColor: t.border, borderWidth: 1 }]}>
            {stats.map(s => (
              <View key={s.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: t.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: t.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Status Toggle */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: isOnline ? t.success + '25' : t.textMuted + '25' }]}>
                <Ionicons name={isOnline ? "flash" : "flash-outline"} size={18} color={isOnline ? t.success : t.textSecondary} />
              </View>
              <Text style={styles.menuLabel}>{isOnline ? 'Ready (Online)' : 'Istirahat (Offline)'}</Text>
              
              {isToggling ? (
                <ActivityIndicator size="small" color={t.success} />
              ) : (
                <TouchableOpacity 
                  onPress={handleToggle}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.toggleTrack, 
                    { backgroundColor: isOnline ? t.success : (isDarkMode ? t.surfaceLight : t.border) }
                  ]}>
                    <View style={[
                      styles.toggleThumb, 
                      isOnline ? { right: 2 } : { left: 2 }
                    ]} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>


        {/* Menu Groups */}
        {MENU_ITEMS.map(group => (
          <View key={group.group} style={styles.section}>
            <Text style={styles.groupLabel}>{group.group}</Text>
            <View style={styles.menuCard}>
              {group.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, i < group.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: (t as any)[item.color] + '30' }]}>
                    <Ionicons name={item.icon as any} size={18} color={(t as any)[item.color]} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={t.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={[styles.section, { paddingBottom: 100 }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
            <Ionicons name="log-out-outline" size={20} color={t.danger} />
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { 
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.xl, gap: SPACING.lg,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...TYPOGRAPHY.h1, color: '#FFFFFF', fontSize: 24 },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: t.success, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.background },
  name: { ...TYPOGRAPHY.h3, color: t.text },
  phone: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.warning + '20', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  tierText: { ...TYPOGRAPHY.caption, color: t.warning, fontFamily: 'Inter_700Bold' },
  editBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  
  statsRow: { flexDirection: 'row', backgroundColor: t.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...TYPOGRAPHY.h4, color: t.text },
  statLabel: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  
  
  groupLabel: { ...TYPOGRAPHY.label, color: t.textMuted, marginBottom: SPACING.sm, marginLeft: 4 },
  menuCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: t.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { ...TYPOGRAPHY.body, color: t.text, flex: 1 },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: t.danger + '40', backgroundColor: t.danger + '10' },
  logoutText: { ...TYPOGRAPHY.body, color: t.danger, fontFamily: 'Inter_600SemiBold' },

  // Status Card Styles
  statusCard: { 
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, 
    padding: SPACING.lg, borderRadius: RADIUS.xl, marginBottom: SPACING.sm,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4
  },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold' },
  statusSub: { ...TYPOGRAPHY.caption },
  toggleTrack: { 
    width: 44, height: 24, borderRadius: 12, 
    position: 'relative', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'
  },
  toggleThumb: { 
    width: 18, height: 18, borderRadius: 9, 
    backgroundColor: '#FFFFFF', position: 'absolute',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2
  },
});
