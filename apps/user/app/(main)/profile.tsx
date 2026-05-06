import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  Settings, 
  CreditCard, 
  Shield, 
  Bell, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Smartphone,
  Star,
  Award,
  Moon,
  Sun
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    router.replace('/(auth)/login');
  };

  const MENU_ITEMS = [
    { title: 'Data Pribadi', icon: User, color: COLORS.primary[400] },
    { title: 'Metode Pembayaran', icon: CreditCard, color: COLORS.gold[500] },
    { title: 'Riwayat Pesanan', icon: Smartphone, color: COLORS.primary[300], onPress: () => router.push('/(main)/history') },
    { title: 'Keamanan', icon: Shield, color: COLORS.success },
    { title: 'Notifikasi', icon: Bell, color: COLORS.gold[600] },
    { title: 'Bantuan & Dukungan', icon: HelpCircle, color: COLORS.primary[300] },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[COLORS.primary[500], COLORS.gold[500]]}
              style={styles.avatarGradient as any}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400' }}
                style={styles.avatar}
              />
            </LinearGradient>
            <TouchableOpacity style={[styles.editButton, { borderColor: theme.background }]}>
              <Settings size={16} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.name, { color: theme.text }]}>Alex Johnson</Text>
          <View style={styles.membershipBadge}>
            <Award size={12} color={COLORS.gold[500]} />
            <Text style={styles.membershipText}>Anggota Gold</Text>
          </View>
          
          <View style={[styles.statsContainer, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>12</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pesanan</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Star size={14} color={COLORS.gold[500]} fill={COLORS.gold[500]} />
                <Text style={[styles.statValue, { color: theme.text }]}>4.9</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {MENU_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.menuItem, { borderBottomColor: theme.border }]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }]}>
                  <Icon size={20} color={item.color} />
                </View>
                <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
                <ChevronRight size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Theme Toggle Section */}
        <View style={styles.menuContainer}>
          <View style={[styles.menuItem, { borderBottomColor: theme.border, justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.1)' : 'rgba(106, 13, 213, 0.1)', borderColor: isDark ? 'rgba(253, 185, 39, 0.2)' : 'rgba(106, 13, 213, 0.2)' }]}>
                {isDark ? <Moon size={20} color={COLORS.gold[500]} /> : <Sun size={20} color={COLORS.primary[500]} />}
              </View>
              <Text style={[styles.menuTitle, { color: theme.text }]}>
                {isDark ? 'Mode Gelap' : 'Mode Terang'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: COLORS.light[300], true: COLORS.primary[300] }}
              thumbColor={isDark ? COLORS.gold[500] : COLORS.white}
              ios_backgroundColor={COLORS.light[300]}
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <View style={[styles.logoutIconWrapper, { backgroundColor: isDark ? 'rgba(231, 76, 60, 0.1)' : 'rgba(231, 76, 60, 0.05)', borderColor: 'rgba(231, 76, 60, 0.2)' }]}>
            <LogOut size={20} color={COLORS.error} />
          </View>
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>Pijat On-Demand v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: theme.textSecondary, opacity: 0.5 }]}>© 2024 Premium Wellness Inc.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  editButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.primary[600],
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  name: {
    ...TYPOGRAPHY.h2,
    fontSize: 26,
    marginBottom: 8,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(253, 185, 39, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(253, 185, 39, 0.2)',
  },
  membershipText: {
    color: COLORS.gold[500],
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontWeight: '900',
    fontSize: 20,
    fontFamily: TYPOGRAPHY.h1.fontFamily,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  statDivider: {
    width: 1.5,
    height: 30,
    marginHorizontal: 40,
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    borderWidth: 1,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 40,
    marginTop: 10,
  },
  logoutIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    borderWidth: 1,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
  },
});
