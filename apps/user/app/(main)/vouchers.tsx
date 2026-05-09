import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Ticket, Info } from 'lucide-react-native';

const PURPLE = '#240080';
const BG = '#F5F5F7';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';

const VOUCHERS = [
  {
    id: '1',
    title: 'Diskon Pengguna Baru',
    discount: '50%',
    expiry: 'Berlaku s/d 30 Mei 2026',
    code: 'BARU50',
  },
  {
    id: '2',
    title: 'Hemat Akhir Pekan',
    discount: 'Rp 20.000',
    expiry: 'Berlaku s/d 15 Mei 2026',
    code: 'WEEKENDHEBAT',
  },
  {
    id: '3',
    title: 'Gratis Biaya Layanan',
    discount: 'FREE',
    expiry: 'Berlaku s/d 20 Mei 2026',
    code: 'BEBASBIAYA',
  },
];

export default function VouchersScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voucher Saya</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {VOUCHERS.map((item) => (
          <View key={item.id} style={styles.voucherCard}>
            <View style={styles.voucherLeft}>
              <View style={styles.iconCircle}>
                <Ticket size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </View>
            
            <View style={styles.voucherRight}>
              <View style={styles.mainInfo}>
                <Text style={styles.voucherTitle}>{item.title}</Text>
                <Text style={styles.voucherDiscount}>{item.discount}</Text>
              </View>
              
              <View style={styles.footerInfo}>
                <Text style={styles.voucherExpiry}>{item.expiry}</Text>
                <TouchableOpacity style={styles.useButton}>
                  <Text style={styles.useButtonText}>Gunakan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ticket Cutouts */}
            <View style={styles.cutoutTop} />
            <View style={styles.cutoutBottom} />
            <View style={styles.divider} />
          </View>
        ))}

        <View style={styles.infoBox}>
          <Info size={16} color={TEXT_MUTED} />
          <Text style={styles.infoText}>Voucher dapat digunakan saat proses pemesanan layanan.</Text>
        </View>
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
  voucherCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    height: 110,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  voucherLeft: {
    width: '25%',
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherRight: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  mainInfo: {
    marginBottom: 4,
  },
  voucherTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  voucherDiscount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voucherExpiry: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  useButton: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  useButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  cutoutTop: {
    position: 'absolute',
    top: -10,
    left: '25%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BG,
    marginLeft: -10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cutoutBottom: {
    position: 'absolute',
    bottom: -10,
    left: '25%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BG,
    marginLeft: -10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  divider: {
    position: 'absolute',
    left: '25%',
    top: 10,
    bottom: 10,
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
    flex: 1,
  },
});
