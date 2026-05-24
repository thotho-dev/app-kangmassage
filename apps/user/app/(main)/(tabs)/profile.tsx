import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, 
  StatusBar, Switch, Modal, TextInput, ActivityIndicator, Alert, Linking, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
  Edit2,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Lock,
  MessageSquare
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/context/AlertContext';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  // Modal visibility states
  const [personalModalVisible, setPersonalModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // Form states for Personal Data
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Notification toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [waEnabled, setWaEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);

  // Review states
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Security pass toggle
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshProfile();
    }, [])
  );

  const handleLogout = async () => {
    showAlert(
      'Keluar Akun',
      'Apakah Anda yakin ingin keluar dari aplikasi Kang Massage?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluar', style: 'destructive', onPress: async () => await signOut() }
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Loyalty tier logic has been removed to keep user profile layout simple and clean

  // Upload selected local image to Supabase Storage with fallback
  const uploadImage = async (uri: string): Promise<string> => {
    try {
      console.log('[DEBUG Upload] Menyiapkan unggah gambar ke Supabase Storage...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user?.id || Math.random()}-${Date.now()}.${fileExt}`;
      
      // Upload file
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true
        });

      if (error) {
        console.warn('[DEBUG Upload] Gagal upload ke bucket "avatars":', error.message);
        return uri; // Fallback ke URI lokal
      }

      // Dapatkan URL Publik
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('[DEBUG Upload] Sukses upload, URL Publik:', publicUrl);
      return publicUrl;
    } catch (err: any) {
      console.warn('[DEBUG Upload] Error di uploadImage:', err);
      return uri; // Fallback ke URI lokal
    }
  };

  // Function to pick image from Gallery
  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Izin Ditolak', 'Maaf, kami memerlukan izin galeri untuk memilih foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditAvatar(result.assets[0].uri);
    }
  };

  // Function to take photo with Camera
  const handleTakeWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Izin Ditolak', 'Maaf, kami memerlukan izin kamera untuk mengambil foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditAvatar(result.assets[0].uri);
    }
  };

  // Trigger avatar change menu
  const handleChangeAvatar = () => {
    showAlert(
      'Ganti Foto Profil',
      'Pilih metode untuk mengubah foto profil Anda:',
      [
        { text: '📸 Ambil Foto', onPress: handleTakeWithCamera },
        { text: '🖼️ Pilih dari Galeri', onPress: handlePickFromGallery },
        { text: 'Batal', style: 'cancel' }
      ]
    );
  };

  // Open Personal Data Modal and fill with current data
  const handleOpenPersonal = () => {
    setEditName(profile?.full_name || '');
    setEditPhone(profile?.phone || '');
    setEditAvatar(profile?.avatar_url || '');
    setPersonalModalVisible(true);
  };

  // Save Personal Data changes to Supabase
  const handleSavePersonal = async () => {
    if (!user || !profile) return;
    if (!editName.trim()) {
      showAlert('Eror', 'Nama lengkap tidak boleh kosong.');
      return;
    }

    setSavingPersonal(true);
    try {
      // 1. Upload local photo to Supabase storage if it was changed locally
      let finalAvatarUrl = editAvatar.trim();
      if (editAvatar && !editAvatar.startsWith('http')) {
        finalAvatarUrl = await uploadImage(editAvatar);
      }

      // 2. Update details in the database
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim(),
          avatar_url: finalAvatarUrl,
        })
        .eq('supabase_uid', user.id);

      if (error) throw error;

      await refreshProfile();
      setPersonalModalVisible(false);
      showAlert('Sukses', 'Data pribadi berhasil diperbarui.');
    } catch (err: any) {
      console.error('Error updating personal details:', err);
      showAlert('Gagal', err.message || 'Terjadi kesalahan saat memperbarui data.');
    } finally {
      setSavingPersonal(false);
    }
  };

  // Submit Ulasan Kami
  const handleSubmitReview = () => {
    setReviewSubmitting(true);
    setTimeout(() => {
      setReviewSubmitting(false);
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewSuccess(false);
        setReviewModalVisible(false);
        setReviewText('');
        setRatingStars(5);
      }, 1800);
    }, 1500);
  };

  const MENU_ITEMS = [
    { title: 'Data Pribadi', icon: User, color: COLORS.primary[400], onPress: handleOpenPersonal },
    { title: 'Metode Pembayaran', icon: CreditCard, color: COLORS.gold[500], onPress: () => setPaymentModalVisible(true) },
    { title: 'Riwayat Pesanan', icon: Smartphone, color: COLORS.primary[300], onPress: () => router.push('/(main)/history') },
    { title: 'Keamanan', icon: Shield, color: COLORS.success, onPress: () => setSecurityModalVisible(true) },
    { title: 'Notifikasi', icon: Bell, color: COLORS.gold[600], onPress: () => setNotificationModalVisible(true) },
    { title: 'Bantuan & Dukungan', icon: HelpCircle, color: COLORS.primary[300], onPress: () => setSupportModalVisible(true) },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            {/* Left: Avatar Container */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[COLORS.primary[500] || '#240080', COLORS.gold[500] || '#FDB927']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                {profile?.avatar_url ? (
                  <Image 
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: theme.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 26, fontWeight: 'bold', color: COLORS.primary[500] }}>
                      {getInitials(profile?.full_name || user?.email || 'User')}
                    </Text>
                  </View>
                )}
              </LinearGradient>
              <TouchableOpacity style={[styles.editButton, { borderColor: theme.background }]} onPress={handleOpenPersonal}>
                <Settings size={12} color="white" />
              </TouchableOpacity>
            </View>

            {/* Right: User Info Column */}
            <View style={styles.userInfo}>
              <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Selamat Datang,</Text>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {profile?.full_name || 'User'}
              </Text>
              <Text style={[styles.emailText, { color: theme.textSecondary }]} numberOfLines={1}>
                {user?.phone || ''}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statsContainer, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{profile?.total_orders || 0}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pesanan</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Star size={16} color={COLORS.gold[500]} fill={COLORS.gold[500]} />
                <Text style={[styles.statValue, { color: theme.text }]}>{profile?.points || 0}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Poin</Text>
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

        {/* Rate Us Section */}
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            activeOpacity={0.7}
            onPress={() => setReviewModalVisible(true)}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(253, 185, 39, 0.1)', borderColor: 'rgba(253, 185, 39, 0.2)' }]}>
              <Star size={20} color={COLORS.gold[500]} fill={COLORS.gold[500]} />
            </View>
            <Text style={[styles.menuTitle, { color: theme.text }]}>Ulas Aplikasi</Text>
            <ChevronRight size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <View style={[styles.logoutIconWrapper, { backgroundColor: isDark ? 'rgba(231, 76, 60, 0.1)' : 'rgba(231, 76, 60, 0.05)', borderColor: 'rgba(231, 76, 60, 0.2)' }]}>
            <LogOut size={20} color={COLORS.error} />
          </View>
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>Kang Massage v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: theme.textSecondary, opacity: 0.5 }]}>© 2026 Kang Massage</Text>
        </View>

      </ScrollView>

      {/* 1. Modal Data Pribadi */}
      <Modal visible={personalModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Data Pribadi</Text>
              <TouchableOpacity onPress={() => setPersonalModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              <View style={styles.avatarPreviewContainer}>
                <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} style={styles.avatarPickerWrapper}>
                  {editAvatar ? (
                    <Image source={{ uri: editAvatar }} style={styles.formAvatar} />
                  ) : (
                    <View style={[styles.formAvatar, { backgroundColor: theme.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}>
                      <User size={40} color={COLORS.primary[500]} />
                    </View>
                  )}
                  <View style={styles.cameraIconBadge}>
                    <Edit2 size={12} color="white" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChangeAvatar} style={styles.changePhotoBtn}>
                  <Text style={styles.changePhotoText}>Pilih dari Kamera / Galeri</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nama Lengkap</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nomor Telepon</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="Contoh: 08123456789"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>URL Foto Profil</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                value={editAvatar}
                onChangeText={setEditAvatar}
                placeholder="https://image-url-anda.com/foto.jpg"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: COLORS.primary[500] }]}
                onPress={handleSavePersonal}
                disabled={savingPersonal}
              >
                {savingPersonal ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Metode Pembayaran */}
      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdropButton} activeOpacity={1} onPress={() => setPaymentModalVisible(false)} />
          <View style={[styles.bottomSheetBox, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Metode Pembayaran Saya</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Wallet Cash Balance */}
            <LinearGradient
              colors={[COLORS.primary[500], COLORS.primary[700]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletCard}
            >
              <View>
                <Text style={styles.walletLabel}>Saldo Dompet Kang Massage</Text>
                <Text style={styles.walletValue}>Rp {(profile?.wallet_balance || 0).toLocaleString('id-ID')}</Text>
              </View>
              <TouchableOpacity style={styles.topupBtn} onPress={() => { setPaymentModalVisible(false); router.push('/(main)/wallet'); }}>
                <Text style={styles.topupText}>Top Up</Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Payment List */}
            <View style={styles.payList}>
              <View style={[styles.payItem, { borderBottomColor: theme.border }]}>
                <CreditCard size={20} color={COLORS.primary[500]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.payTitle, { color: theme.text }]}>Saldo Kang Massage</Text>
                  <Text style={[styles.paySub, { color: theme.textSecondary }]}>Default (Direkomendasikan)</Text>
                </View>
                <CheckCircle2 size={20} color={COLORS.success} />
              </View>
              <View style={[styles.payItem, { borderBottomColor: theme.border, opacity: 0.7 }]}>
                <Smartphone size={20} color="#10B981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.payTitle, { color: theme.text }]}>Tunai (Cash)</Text>
                  <Text style={[styles.paySub, { color: theme.textSecondary }]}>Bayar langsung di tempat</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Modal Keamanan */}
      <Modal visible={securityModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdropButton} activeOpacity={1} onPress={() => setSecurityModalVisible(false)} />
          <View style={[styles.bottomSheetBox, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Keamanan Akun</Text>
              <TouchableOpacity onPress={() => setSecurityModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.secDetails}>
              <View style={[styles.secRow, { borderBottomColor: theme.border }]}>
                <Mail size={18} color={theme.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.secLabel, { color: theme.textSecondary }]}>Email Terdaftar</Text>
                  <Text style={[styles.secValue, { color: theme.text }]}>{user?.email || '-'}</Text>
                </View>
              </View>

              <View style={[styles.secRow, { borderBottomColor: theme.border }]}>
                <Lock size={18} color={theme.textSecondary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.secLabel, { color: theme.textSecondary }]}>Keamanan Akses</Text>
                  <Text style={[styles.secValue, { color: theme.text }]}>Biometrik / PIN Sidik Jari</Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: theme.border, true: COLORS.primary[500] }}
                  thumbColor="#white"
                />
              </View>
              
              <Text style={[styles.secNotice, { color: theme.textSecondary }]}>
                Aplikasi Kang Massage dilindungi enkripsi end-to-end standar Supabase Auth yang terjamin aman untuk melindungi privasi transaksi Anda.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Modal Notifikasi */}
      <Modal visible={notificationModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdropButton} activeOpacity={1} onPress={() => setNotificationModalVisible(false)} />
          <View style={[styles.bottomSheetBox, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Pengaturan Notifikasi</Text>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.notifContainer}>
              <View style={[styles.notifRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifLabel, { color: theme.text }]}>Notifikasi Push (Aplikasi)</Text>
                  <Text style={[styles.notifSub, { color: theme.textSecondary }]}>Dapatkan info pesanan real-time di layar utama</Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: theme.border, true: COLORS.primary[500] }}
                />
              </View>

              <View style={[styles.notifRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifLabel, { color: theme.text }]}>Notifikasi WhatsApp</Text>
                  <Text style={[styles.notifSub, { color: theme.textSecondary }]}>Terima struk digital dan status kedatangan via WA</Text>
                </View>
                <Switch
                  value={waEnabled}
                  onValueChange={setWaEnabled}
                  trackColor={{ false: theme.border, true: COLORS.primary[500] }}
                />
              </View>

              <View style={[styles.notifRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifLabel, { color: theme.text }]}>Promo & Diskon Voucher</Text>
                  <Text style={[styles.notifSub, { color: theme.textSecondary }]}>Info voucher diskon pijat terbaru setiap minggunya</Text>
                </View>
                <Switch
                  value={promoEnabled}
                  onValueChange={setPromoEnabled}
                  trackColor={{ false: theme.border, true: COLORS.primary[500] }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Modal Bantuan & Dukungan */}
      <Modal visible={supportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Bantuan & Layanan FAQ</Text>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.faqContent}>
              
              <Text style={[styles.faqHeader, { color: theme.text }]}>Pertanyaan Sering Diajukan (FAQ)</Text>
              
              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Bagaimana cara memesan pijat?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Pilih layanan massage favorit di halaman beranda, tentukan gender terapis dan lokasi jemput Anda, lalu selesaikan pembayaran. Terapis terdekat akan segera meluncur ke lokasi Anda.
                </Text>
              </View>

              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Bagaimana membatalkan pesanan?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Anda dapat membatalkan pesanan saat terapis sedang dicari. Apabila terapis telah menerima dan dalam perjalanan, silakan hubungi admin untuk konfirmasi penyesuaian.
                </Text>
              </View>

              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Bagaimana bagi hasil/fee platform?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Sistem kami memotong platform fee 20% otomatis dari dompet terapis, menjamin transparansi 100% tanpa biaya tersembunyi untuk Anda.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: '#25D366', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 }]}
                onPress={() => Linking.openURL('https://wa.me/6281234567890')}
              >
                <Phone size={18} color="white" />
                <Text style={styles.saveBtnText}>Hubungi Customer Service WA</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. Modal Ulas Aplikasi */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewBox, { backgroundColor: theme.surface }]}>
            {reviewSuccess ? (
              <View style={styles.successReview}>
                <CheckCircle2 size={64} color={COLORS.success} />
                <Text style={[styles.successTitle, { color: theme.text }]}>Terima Kasih Banyak!</Text>
                <Text style={[styles.successSub, { color: theme.textSecondary }]}>Ulasan bintang {ratingStars} Anda sangat berharga bagi kami.</Text>
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Ulas Aplikasi Kang Massage</Text>
                  <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                    <X size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.reviewSubtitle, { color: theme.textSecondary }]}>
                  Berikan bintang kepuasan Anda untuk membantu kami menjadi lebih baik!
                </Text>

                {/* Rating Stars Selection */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRatingStars(star)}>
                      <Star 
                        size={40} 
                        color={star <= ratingStars ? COLORS.gold[500] : theme.border} 
                        fill={star <= ratingStars ? COLORS.gold[500] : 'transparent'} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Review Text */}
                <TextInput
                  style={[styles.reviewInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                  multiline
                  placeholder="Ceritakan pengalaman Anda menggunakan Kang Massage..."
                  placeholderTextColor={theme.textSecondary}
                  value={reviewText}
                  onChangeText={setReviewText}
                />

                <TouchableOpacity 
                  style={[styles.saveBtn, { backgroundColor: COLORS.primary[500], marginTop: 12 }]}
                  onPress={handleSubmitReview}
                  disabled={reviewSubmitting}
                >
                  {reviewSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveBtnText}>Kirim Ulasan</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
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
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary[600],
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: 18,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
    opacity: 0.6,
  },
  name: {
    ...TYPOGRAPHY.h2,
    fontSize: 22,
    marginTop: 2,
    marginBottom: 0,
  },
  emailText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '400',
    opacity: 0.5,
    marginTop: 2,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
  },
  membershipText: {
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
    marginBottom: 24,
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

  /* Modal Generic Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropButton: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBox: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
  },
  formContainer: {
    paddingBottom: 20,
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  formAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primary[500],
  },
  avatarPickerWrapper: {
    position: 'relative',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary[500],
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  changePhotoBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  changePhotoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: COLORS.primary[500],
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: 'white',
    fontFamily: 'Inter-Bold',
    fontSize: 15,
  },

  /* Bottom Sheet Modal Styles */
  bottomSheetBox: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    position: 'absolute',
    bottom: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },

  /* Wallet Card in Payment Sheet */
  walletCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  walletLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  walletValue: {
    color: 'white',
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  topupBtn: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  topupText: {
    color: COLORS.primary[600],
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  payList: {
    gap: 8,
  },
  payItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  payTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  paySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },

  /* Security Modal Custom Styles */
  secDetails: {
    gap: 16,
  },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  secLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  secValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    marginTop: 2,
  },
  secNotice: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.6,
    marginTop: 10,
  },

  /* Notifications Sheet Styles */
  notifContainer: {
    gap: 16,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  notifLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  notifSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
    maxWidth: '90%',
  },

  /* FAQ Support Custom Styles */
  faqContent: {
    paddingBottom: 20,
  },
  faqHeader: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 16,
  },
  faqCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginBottom: 6,
  },
  faqAnswer: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },

  /* Review Box Custom Styles */
  reviewBox: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  reviewSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    height: 100,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  successReview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  successTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginTop: 16,
  },
  successSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
