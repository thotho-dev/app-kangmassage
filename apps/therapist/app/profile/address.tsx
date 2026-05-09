import { useState, useEffect } from 'react';
import { useThemeColors, useThemeStore } from '../../store/themeStore';
import { supabase } from '../../lib/supabase';
import { useTherapistStore } from '../../store/therapistStore';
import { useAlert } from '../../components/CustomAlert';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

interface RegionItem {
  id: string;
  name: string;
}

export default function AddressScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const styles = getStyles(t, isDarkMode);
  const router = useRouter();
  const { profile, updateProfile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();
  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!profile?.address);
  const [form, setForm] = useState({
    province: profile?.province || '',
    city: profile?.city || '',
    district: profile?.district || '',
    address: profile?.address || ''
  });

  // Dropdown States
  const [provinces, setProvinces] = useState<RegionItem[]>([]);
  const [cities, setCities] = useState<RegionItem[]>([]);
  const [districts, setDistricts] = useState<RegionItem[]>([]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'province' | 'city' | 'district' | null>(null);
  const [modalData, setModalData] = useState<RegionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const response = await fetch('https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json');
      const data = await response.json();
      setProvinces(data);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };

  const fetchCities = async (provinceId: string) => {
    try {
      const response = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provinceId}.json`);
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const fetchDistricts = async (cityId: string) => {
    try {
      const response = await fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${cityId}.json`);
      const data = await response.json();
      setDistricts(data);
    } catch (error) {
      console.error('Error fetching districts:', error);
    }
  };

  const openSelector = (type: 'province' | 'city' | 'district') => {
    if (type === 'city' && !form.province) {
      showAlert('warning', 'Pilih Provinsi', 'Harap pilih provinsi terlebih dahulu.');
      return;
    }
    if (type === 'district' && !form.city) {
      showAlert('warning', 'Pilih Kota', 'Harap pilih kota/kabupaten terlebih dahulu.');
      return;
    }

    setModalType(type);
    if (type === 'province') setModalData(provinces);
    else if (type === 'city') setModalData(cities);
    else if (type === 'district') setModalData(districts);
    
    setSearchQuery('');
    setModalVisible(true);
  };

  const handleSelect = (item: RegionItem) => {
    if (modalType === 'province') {
      setForm({ ...form, province: item.name, city: '', district: '' });
      fetchCities(item.id);
    } else if (modalType === 'city') {
      setForm({ ...form, city: item.name, district: '' });
      fetchDistricts(item.id);
    } else if (modalType === 'district') {
      setForm({ ...form, district: item.name });
    }
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (!form.province || !form.city || !form.district || !form.address) {
      showAlert('warning', 'Data Belum Lengkap', 'Harap lengkapi semua kolom alamat.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        province: form.province,
        city: form.city,
        district: form.district,
        address: form.address
      });
      showAlert('success', 'Berhasil', 'Alamat Anda telah diperbarui.');
      setIsEditing(false);
    } catch (error: any) {
      showAlert('error', 'Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = modalData.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: t.text }]}>Alamat Terdaftar</Text>
            <Text style={[styles.subtitle, { color: t.textSecondary }]}>Lokasi operasional atau tempat tinggal Anda</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!isEditing && profile?.address ? (
            /* Aesthetic Address Card */
            <View style={styles.addressCard}>
              <LinearGradient 
                colors={isDarkMode ? ['#1E293B', '#0F172A'] : [t.primaryDark, t.primary]} 
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="location" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitle}>ALAMAT UTAMA</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardAddress} numberOfLines={3}>{profile.address}</Text>
                  <View style={styles.locationBadges}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{profile.district}</Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{profile.city}</Text>
                    </View>
                  </View>
                  <Text style={styles.provinceText}>{profile.province}</Text>
                </View>
                
                <View style={styles.cardPattern} />
              </LinearGradient>

              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={18} color={t.text} />
                <Text style={styles.editBtnText}>Ubah Alamat Lengkap</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Form View */
            <View style={styles.formCard}>
              {/* Province Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Provinsi</Text>
                <TouchableOpacity style={styles.selector} onPress={() => openSelector('province')}>
                  <Ionicons name="map-outline" size={20} color={t.textMuted} />
                  <Text style={[styles.selectorText, !form.province && { color: t.textMuted }]}>
                    {form.province || 'Pilih Provinsi'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={t.textMuted} />
                </TouchableOpacity>
              </View>

              {/* City Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kota / Kabupaten</Text>
                <TouchableOpacity style={styles.selector} onPress={() => openSelector('city')}>
                  <Ionicons name="business-outline" size={20} color={t.textMuted} />
                  <Text style={[styles.selectorText, !form.city && { color: t.textMuted }]}>
                    {form.city || 'Pilih Kota / Kabupaten'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={t.textMuted} />
                </TouchableOpacity>
              </View>

              {/* District Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kecamatan</Text>
                <TouchableOpacity style={styles.selector} onPress={() => openSelector('district')}>
                  <Ionicons name="navigate-outline" size={20} color={t.textMuted} />
                  <Text style={[styles.selectorText, !form.district && { color: t.textMuted }]}>
                    {form.district || 'Pilih Kecamatan'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={t.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Full Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Alamat Lengkap (Jalan, No. Rumah, RT/RW)</Text>
                <View style={styles.textAreaContainer}>
                  <Ionicons name="location-outline" size={20} color={t.textMuted} style={{ marginTop: 2 }} />
                  <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={4}
                    placeholder="Contoh: Jl. Sudirman No. 123, Blok C, RT 01/02"
                    placeholderTextColor={t.textMuted}
                    value={form.address}
                    onChangeText={(text) => setForm({ ...form, address: text })}
                  />
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.saveBtn}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Simpan Alamat</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                
                {profile?.address && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancelBtnText}>Batalkan</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Modal Selector */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Pilih {modalType === 'province' ? 'Provinsi' : modalType === 'city' ? 'Kota' : 'Kecamatan'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={t.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={t.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari..."
                  placeholderTextColor={t.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.itemRow} onPress={() => handleSelect(item)}>
                    <Text style={styles.itemText}>{item.name}</Text>
                    {form[modalType!] === item.name && (
                      <Ionicons name="checkmark-circle" size={20} color={t.secondary} />
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any, isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.xl, gap: SPACING.sm },
  backBtn: { padding: 4, marginBottom: SPACING.xs },
  title: { ...TYPOGRAPHY.h2, color: '#FFFFFF' },
  subtitle: { ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.7)' },
  scroll: { padding: SPACING.lg },
  
  /* Aesthetic Address Card */
  addressCard: { marginBottom: SPACING.xl },
  cardGradient: { borderRadius: 24, padding: 24, minHeight: 160, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  cardBody: { gap: 10 },
  cardAddress: { ...TYPOGRAPHY.h4, color: '#FFFFFF', lineHeight: 24 },
  locationBadges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  badgeText: { fontSize: 11, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  provinceText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  cardPattern: { position: 'absolute', right: -20, bottom: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.md, paddingVertical: 14, borderRadius: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  editBtnText: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_700Bold' },

  /* Form Styles */
  formCard: { backgroundColor: t.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: t.border, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  inputGroup: { marginBottom: 18 },
  label: { ...TYPOGRAPHY.caption, color: t.textSecondary, marginBottom: 8, marginLeft: 4, fontFamily: 'Inter_600SemiBold' },
  selector: { 
    flexDirection: 'row', alignItems: 'center', gap: 12, 
    backgroundColor: isDarkMode ? t.background : '#F8FAFC', 
    borderWidth: 1.5, borderColor: t.border, borderRadius: 16, padding: 14 
  },
  selectorText: { ...TYPOGRAPHY.body, color: t.text, flex: 1 },
  textAreaContainer: { 
    flexDirection: 'row', gap: 12, backgroundColor: isDarkMode ? t.background : '#F8FAFC', 
    borderWidth: 1.5, borderColor: t.border, borderRadius: 16, padding: 14, minHeight: 120 
  },
  textArea: { ...TYPOGRAPHY.body, color: t.text, flex: 1, textAlignVertical: 'top', paddingTop: 0 },
  
  formActions: { marginTop: 10 },
  saveBtn: { paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center', elevation: 4, shadowColor: t.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBtnText: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { ...TYPOGRAPHY.bodySmall, color: t.textMuted, fontFamily: 'Inter_600SemiBold' },

  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: t.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, 
    height: '80%', padding: 24 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { ...TYPOGRAPHY.h3, color: t.text },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', gap: 10, 
    backgroundColor: t.background, borderRadius: 16, paddingHorizontal: 16, 
    paddingVertical: 12, marginBottom: 20, borderWidth: 1, borderColor: t.border 
  },
  searchInput: { ...TYPOGRAPHY.body, color: t.text, flex: 1 },
  itemRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.border 
  },
  itemText: { ...TYPOGRAPHY.body, color: t.text },
});
