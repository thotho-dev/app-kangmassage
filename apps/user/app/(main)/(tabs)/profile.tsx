import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  StatusBar, Switch, Modal, TextInput, ActivityIndicator, Alert, Linking, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { 
  User, 
  CreditCard, 
  Shield, 
  Bell, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Smartphone,
  Star,
  Edit2,
  X,
  CheckCircle2,
  Phone,
  Mail,
  Lock,
  MessageSquare,
  KeyRound,
  Building2,
  FileText,
  Camera,
  Image as ImageIcon,
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
  const insets = useSafeAreaInsets();

  // Modal visibility states
  const [personalModalVisible, setPersonalModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [syaratModalVisible, setSyaratModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Form states for Personal Data
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);


  // Support contact
  const [supportWA, setSupportWA] = useState('6281234567890');
  const [supportEmail, setSupportEmail] = useState('support@kangmassage.app');
  const [playstoreUrl, setPlaystoreUrl] = useState('https://play.google.com/store/apps/details?id=com.thotho.kangmassage.user');

  // Notification toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [notifPrefsLoaded, setNotifPrefsLoaded] = useState(false);

  // Security pass toggle
  const [biometricEnabled, setBiometricEnabled] = useState(false);



  useFocusEffect(
    React.useCallback(() => {
      refreshProfile();
      loadNotifPrefs();
      loadSupportContact();
    }, [])
  );

  const loadSupportContact = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('support_whatsapp, support_email, playstore_url')
        .limit(1)
        .single();
      if (data?.support_whatsapp) {
        setSupportWA(data.support_whatsapp);
      }
      if (data?.support_email) {
        setSupportEmail(data.support_email);
      }
      if (data?.playstore_url) {
        setPlaystoreUrl(data.playstore_url);
      }
    } catch {}
  };

  const loadNotifPrefs = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('user_notification_prefs')
        .select('push_enabled, promo_enabled')
        .eq('user_id', profile.id)
        .single();
      if (data) {
        setPushEnabled(data.push_enabled);
        setPromoEnabled(data.promo_enabled);
      }
      setNotifPrefsLoaded(true);
    } catch {}
  };

  const saveNotifPrefs = async (field: string, value: boolean) => {
    if (!profile?.id || !notifPrefsLoaded) return;
    try {
      await supabase.from('user_notification_prefs').upsert({
        user_id: profile.id,
        [field]: value,
      }, { onConflict: 'user_id' });
    } catch {}
  };

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
    setAvatarSheetVisible(true);
  };

  // Open Personal Data Modal and fill with current data
  const handleOpenPersonal = () => {
    setEditName(profile?.full_name || '');
    setEditPhone(profile?.phone || '');
    setEditGender(profile?.gender || '');
    setEditAvatar(profile?.avatar_url || '');
    setIsEditingPersonal(false);
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
          gender: editGender || null,
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
  const MENU_GROUPS = [
    {
      label: 'Akun Saya',
      items: [
        { title: 'Data Pribadi', icon: User, color: COLORS.primary[400], onPress: handleOpenPersonal },
        { title: 'PIN Transaksi', icon: KeyRound, color: COLORS.gold[600], onPress: () => router.push('/pin-setup') },
        { title: 'Rekening Tujuan', icon: Building2, color: COLORS.primary[400], onPress: () => router.push('/bank-accounts') },
      ],
    },
    {
      label: 'Pengaturan',
      items: [
        { title: 'Metode Pembayaran', icon: CreditCard, color: COLORS.gold[500], onPress: () => setPaymentModalVisible(true) },
        { title: 'Keamanan', icon: Shield, color: COLORS.success, onPress: () => setSecurityModalVisible(true) },
        { title: 'Notifikasi', icon: Bell, color: COLORS.gold[600], onPress: () => setNotificationModalVisible(true) },
      ],
    },
    {
      label: 'Informasi',
      items: [
        { title: 'Ulas Aplikasi', icon: Star, color: COLORS.gold[500], onPress: () => Linking.openURL(playstoreUrl) },
        { title: 'Bantuan & Dukungan', icon: HelpCircle, color: COLORS.primary[300], onPress: () => setSupportModalVisible(true) },
        { title: 'Syarat & Ketentuan', icon: FileText, color: COLORS.primary[400], onPress: () => setSyaratModalVisible(true) },
        { title: 'Kebijakan Privasi', icon: Shield, color: COLORS.primary[400], onPress: () => setPrivacyModalVisible(true) },
      ],
    },
    {
      items: [
        { title: 'Keluar', icon: LogOut, color: COLORS.error, onPress: () => handleLogout() },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}>
        
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
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.primary[500] }}>
                      {getInitials(profile?.full_name || user?.email || 'User')}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>

            {/* Right: User Info Column */}
            <View style={styles.userInfo}>
              <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Selamat Datang,</Text>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {profile?.full_name || 'User'}
              </Text>
              <Text style={[styles.emailText, { color: theme.textSecondary }]} numberOfLines={1}>
                {user?.email || user?.phone || ''}
              </Text>
            </View>
          </View>
        </View>

        {MENU_GROUPS.map((group, gi) => (
          <View key={gi} style={styles.menuContainer}>
            {group.label && gi > 0 ? <View style={[styles.sectionLine, { backgroundColor: theme.border }]} /> : null}
            {group.label ? <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{group.label}</Text> : null}
            {group.items.map((item, ii) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity 
                  key={ii} 
                  style={[styles.menuItem, { borderBottomColor: theme.border }]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }]}>
                    <Icon size={18} color={item.color} />
                  </View>
                  <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
                  <ChevronRight size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.textSecondary }]}>Kang Massage v{Constants.expoConfig?.version || '1.1.2'}</Text>
          <Text style={[styles.copyrightText, { color: theme.textSecondary, opacity: 0.5 }]}>© {new Date().getFullYear()} Kang Massage</Text>
        </View>

      </ScrollView>

      {/* 1. Modal Data Pribadi */}
      <Modal visible={personalModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Data Pribadi</Text>
              <TouchableOpacity onPress={() => setPersonalModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
              {!isEditingPersonal ? (
                <>

                  <View style={styles.readonlyRow}>
                    <Text style={[styles.readonlyLabel, { color: theme.textSecondary }]}>Nama Lengkap</Text>
                    <Text style={[styles.readonlyValue, { color: theme.text }]}>{profile?.full_name || '-'}</Text>
                  </View>

                  <View style={styles.readonlyRow}>
                    <Text style={[styles.readonlyLabel, { color: theme.textSecondary }]}>Nomor Telepon</Text>
                    <Text style={[styles.readonlyValue, { color: theme.text }]}>{profile?.phone || '-'}</Text>
                  </View>

                  <View style={styles.readonlyRow}>
                    <Text style={[styles.readonlyLabel, { color: theme.textSecondary }]}>Jenis Kelamin</Text>
                    <Text style={[styles.readonlyValue, { color: theme.text }]}>
                      {profile?.gender === 'L' ? 'Laki-laki' : profile?.gender === 'P' ? 'Perempuan' : '-'}
                    </Text>
                  </View>

                  <View style={styles.readonlyRow}>
                    <Text style={[styles.readonlyLabel, { color: theme.textSecondary }]}>Tanggal Terdaftar</Text>
                    <Text style={[styles.readonlyValue, { color: theme.text }]}>
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: COLORS.primary[500], marginTop: 24 }]}
                    onPress={() => {
                      setEditName(profile?.full_name || '');
                      setEditPhone(profile?.phone || '');
                      setEditGender(profile?.gender || '');
                      setEditAvatar(profile?.avatar_url || '');
                      setIsEditingPersonal(true);
                    }}
                  >
                    <Text style={styles.saveBtnText}>Edit</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.avatarPreviewContainer}>
                    <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} style={styles.avatarPickerWrapper}>
                      {editAvatar ? (
                        <Image source={{ uri: editAvatar }} style={styles.formAvatar} />
                      ) : (
                        <View style={[styles.formAvatar, { backgroundColor: theme.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}>
                          <User size={32} color={COLORS.primary[500]} />
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

                  <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 4 }]}>Jenis Kelamin</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    {['L', 'P'].map((val) => {
                      const label = val === 'L' ? 'Laki-laki' : 'Perempuan';
                      const selected = editGender === val;
                      return (
                        <TouchableOpacity
                          key={val}
                          onPress={() => setEditGender(val)}
                          style={[
                            {
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 10,
                              borderWidth: 1.5,
                              alignItems: 'center',
                              borderColor: selected ? COLORS.primary[500] : theme.border,
                              backgroundColor: selected ? COLORS.primary[500] + '15' : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: 'PlusJakartaSans-SemiBold',
                              fontSize: 13,
                              color: selected ? COLORS.primary[500] : theme.textSecondary,
                            }}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: theme.surfaceVariant, flex: 1 }]}
                      onPress={() => setIsEditingPersonal(false)}
                    >
                      <Text style={[styles.saveBtnText, { color: theme.text }]}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: COLORS.primary[500], flex: 1 }]}
                      onPress={handleSavePersonal}
                      disabled={savingPersonal}
                    >
                      {savingPersonal ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.saveBtnText}>Simpan</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Avatar Action Sheet */}
      <Modal visible={avatarSheetVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdropButton} activeOpacity={1} onPress={() => setAvatarSheetVisible(false)} />
          <View style={[styles.bottomSheetBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center', marginBottom: 20 }]}>Ganti Foto Profil</Text>

            <TouchableOpacity
              style={[styles.avatarOption, { borderColor: theme.border }]}
              onPress={() => { setAvatarSheetVisible(false); setTimeout(handleTakeWithCamera, 150); }}
              activeOpacity={0.7}
            >
              <View style={[styles.avatarOptionIcon, { backgroundColor: COLORS.primary[500] + '20' }]}>
                <Camera size={22} color={COLORS.primary[500]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.avatarOptionTitle, { color: theme.text }]}>Ambil Foto</Text>
                <Text style={[styles.avatarOptionDesc, { color: theme.textSecondary }]}>Gunakan kamera untuk mengambil foto</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avatarOption, { borderColor: theme.border }]}
              onPress={() => { setAvatarSheetVisible(false); setTimeout(handlePickFromGallery, 150); }}
              activeOpacity={0.7}
            >
              <View style={[styles.avatarOptionIcon, { backgroundColor: COLORS.success + '20' }]}>
                <ImageIcon size={22} color={COLORS.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.avatarOptionTitle, { color: theme.text }]}>Pilih dari Galeri</Text>
                <Text style={[styles.avatarOptionDesc, { color: theme.textSecondary }]}>Ambil foto dari galeri ponsel Anda</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.avatarCancelBtn, { borderColor: theme.border }]}
              onPress={() => setAvatarSheetVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.avatarCancelText, { color: theme.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Metode Pembayaran */}
      <Modal visible={paymentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdropButton} activeOpacity={1} onPress={() => setPaymentModalVisible(false)} />
          <View style={[styles.bottomSheetBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
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
              <TouchableOpacity style={styles.topupBtn} onPress={() => { setPaymentModalVisible(false); router.push('/wallet'); }}>
                <Text style={styles.topupText}>Top Up</Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* Payment List */}
            <View style={styles.payList}>
              <View style={[styles.payItem, { borderBottomColor: theme.border }]}>
                <View style={[styles.iconWrapper, { backgroundColor: '#EBF5FF', borderColor: '#DBEAFE' }]}>
                  <CreditCard size={18} color={COLORS.primary[500]} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.payTitle}>Kartu Kredit/Debit</Text>
                  <Text style={styles.paySub}>Visa, Mastercard, dll.</Text>
                </View>
              </View>
              <View style={[styles.payItem, { borderBottomColor: theme.border }]}>
                <View style={[styles.iconWrapper, { backgroundColor: '#F0FFF4', borderColor: '#E8F5E9' }]}>
                  <Smartphone size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.payTitle}>E-Wallet</Text>
                  <Text style={styles.paySub}>GoPay, OVO, DANA, dll.</Text>
                </View>
              </View>
              <View style={[styles.payItem, { borderBottomColor: theme.border }]}>
                <View style={[styles.iconWrapper, { backgroundColor: '#FFF7E6', borderColor: '#FFE0B2' }]}>
                  <CheckCircle2 size={18} color={COLORS.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.payTitle}>Saldo Kang Massage</Text>
                  <Text style={styles.paySub}>Default (Direkomendasikan)</Text>
                </View>
              </View>
              <View style={[styles.payItem, { borderBottomColor: theme.border, opacity: 0.7 }]}>
                <View style={[styles.iconWrapper, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                  <Smartphone size={16} color="#EF4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
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
          <View style={[styles.bottomSheetBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Keamanan Akun</Text>
              <TouchableOpacity onPress={() => setSecurityModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.secDetails}>
              <View style={[styles.secRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Mail size={16} color={theme.textSecondary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.secLabel}>Email</Text>
                  <Text style={styles.secValue}>{user?.email || '-'}</Text>
                </View>
              </View>
              <View style={[styles.secRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Lock size={16} color={theme.textSecondary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.secLabel}>Kata Sandi</Text>
                  <Text style={styles.secValue}>********</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.secRow, { borderBottomColor: theme.border }]} onPress={() => router.push('/change-password')}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <KeyRound size={16} color={theme.textSecondary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.secLabel, { color: theme.textSecondary }]}>Ganti Password</Text>
                  <Text style={[styles.secValue, { color: theme.text }]}>Ubah password akun Anda</Text>
                </View>
                <ChevronRight size={16} color={theme.textSecondary} />
              </TouchableOpacity>

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
          <View style={[styles.bottomSheetBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Pengaturan Notifikasi</Text>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              <View style={[styles.notifRow, { borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifLabel, { color: theme.text }]}>Notifikasi Push (Aplikasi)</Text>
                  <Text style={[styles.notifSub, { color: theme.textSecondary }]}>Dapatkan info pesanan real-time di layar utama</Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={(v) => { setPushEnabled(v); saveNotifPrefs('push_enabled', v); }}
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
                  onValueChange={(v) => { setPromoEnabled(v); saveNotifPrefs('promo_enabled', v); }}
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
          <View style={[styles.modalBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Bantuan & Layanan FAQ</Text>
              <TouchableOpacity onPress={() => setSupportModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.faqContent}>
              
              <Text style={[styles.faqHeader, { color: theme.text }]}>Informasi untuk Pelanggan</Text>
              
              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Bagaimana cara memesan layanan?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Pilih layanan di halaman beranda, atur lokasi penjemputan, pilih gender terapis, dan lakukan pembayaran. Sistem akan mencari terapis terdekat yang sesuai secara otomatis.
                </Text>
              </View>

              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Bagaimana kebijakan pembatalan?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Pembatalan dapat dilakukan sebelum terapis sampai di lokasi. Jika terapis sudah dalam perjalanan, akan dikenakan biaya pembatalan sebesar 50% dari total pesanan. Pembatalan setelah terapis tiba tidak dapat dilakukan.
                </Text>
              </View>

              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Bagaimana metode pembayarannya?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Kami menerima pembayaran melalui saldo Kang Massage, kartu kredit/debit, dan e-wallet (GoPay, OVO, DANA). Pembayaran tunai langsung ke terapis juga tersedia.
                </Text>
              </View>

              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Bagaimana data privasi saya dilindungi?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Data pribadi Anda dienkripsi dan dilindungi oleh sistem keamanan Supabase Auth. Alamat dan kontak Anda hanya dibagikan ke terapis saat pesanan aktif, dan otomatis disembunyikan setelah selesai.
                </Text>
              </View>

              <View style={[styles.faqCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>Berapa lama waktu pengiriman terapis?</Text>
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>
                  Terapis akan dikirimkan dalam waktu 15-30 menit setelah pesanan dikonfirmasi, tergantung jarak dan ketersediaan terapis di sekitar lokasi Anda.
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: COLORS.primary[500], flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 }]}
                onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
              >
                <Mail size={18} color="white" />
                <Text style={styles.saveBtnText}>Hubungi via Email</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. Modal Syarat & Ketentuan */}
      <Modal visible={syaratModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Syarat & Ketentuan</Text>
              <TouchableOpacity onPress={() => setSyaratModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.faqContent}>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 16, lineHeight: 22 }]}>
                Dengan menggunakan aplikasi Kang Massage, Anda menyetujui syarat dan ketentuan berikut:
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>1. Layanan</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Kang Massage menyediakan platform penghubung antara pengguna (customer) dengan penyedia jasa pijat dan terapi (terapis). Kami bukan penyedia jasa terapi medis. Seluruh layanan bersifat relaksasi dan kebugaran non-medis.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>2. Pendaftaran & Akun</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Anda wajib mendaftar dengan data yang benar dan akurat. Akun bersifat pribadi dan tidak dapat dialihkan. Anda bertanggung jawab penuh atas keamanan akun dan kata sandi.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>3. Pembayaran</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Pembayaran dilakukan melalui metode yang tersedia di aplikasi. Seluruh transaksi dicatat dan dapat diakses di riwayat pembayaran. Harga yang tertera sudah termasuk pajak yang berlaku.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>4. Pembatalan & Refund</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Pembatalan sebelum terapis berangkat: refund penuh (via saldo). Pembatalan saat terapis dalam perjalanan: refund 50%. Pembatalan setelah terapis tiba: tidak ada refund. Refund dikembalikan ke saldo dompet Kang Massage.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>5. Privasi & Data</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Data pribadi Anda dilindungi dan tidak akan dibagikan kepada pihak ketiga tanpa persetujuan. Alamat lokasi hanya dibagikan ke terapis saat pesanan aktif. Data lokasi tidak disimpan setelah pesanan selesai.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>6. Tanggung Jawab</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Kang Massage tidak bertanggung jawab atas cedera, kerusakan properti, atau kerugian yang timbul selama sesi terapi. Terapis adalah penyedia jasa independen, bukan karyawan Kang Massage.
              </Text>

              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 16, lineHeight: 22 }]}>
                Dengan melanjutkan penggunaan aplikasi, Anda dianggap telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan di atas. Kebijakan ini dapat diperbarui sewaktu-waktu dan akan diinformasikan melalui aplikasi.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 7. Modal Kebijakan Privasi */}
      <Modal visible={privacyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Kebijakan Privasi</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.faqContent}>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 16, lineHeight: 22 }]}>
                Kebijakan privasi ini menjelaskan bagaimana Kang Massage mengumpulkan, menggunakan, dan melindungi data pribadi Anda.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>1. Data yang Dikumpulkan</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Kami mengumpulkan data yang Anda berikan saat pendaftaran: nama, nomor telepon, alamat email, dan foto profil. Kami juga mengumpulkan data lokasi untuk memproses pesanan, data penggunaan aplikasi, dan informasi perangkat.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>2. Penggunaan Data</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Data Anda digunakan untuk: memproses dan mengantarkan pesanan, meningkatkan kualitas layanan, mengirim notifikasi terkait pesanan, dan keperluan keamanan akun. Data lokasi hanya digunakan saat Anda membuat pesanan.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>3. Pembagian Data</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Data Anda tidak dijual atau disewakan ke pihak ketiga. Alamat dan nomor telepon Anda hanya dibagikan ke terapis saat pesanan aktif. Kami dapat membagikan data jika diwajibkan oleh hukum.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>4. Keamanan Data</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Kami menerapkan langkah keamanan teknis dan organisasi untuk melindungi data Anda, termasuk enkripsi data, akses terbatas, dan audit keamanan berkala. Namun, tidak ada sistem yang 100% aman.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>5. Penyimpanan & Penghapusan Data</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Data Anda disimpan selama akun Anda aktif. Anda dapat meminta penghapusan data dengan menghubungi tim dukungan. Data pesanan akan tetap disimpan untuk keperluan pencatatan transaksi sesuai ketentuan hukum yang berlaku.
              </Text>

              <Text style={[styles.faqQuestion, { color: theme.text, marginBottom: 8 }]}>6. Hak Anda</Text>
              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 12, lineHeight: 22 }]}>
                Anda berhak mengakses, memperbarui, atau menghapus data pribadi Anda. Anda dapat menarik persetujuan pemrosesan data kapan saja. Hubungi kami di {supportEmail} untuk pertanyaan terkait data pribadi.
              </Text>

              <Text style={[styles.faqAnswer, { color: theme.textSecondary, marginBottom: 16, lineHeight: 22 }]}>
                Kebijakan privasi ini dapat diperbarui sewaktu-waktu. Perubahan akan diinformasikan melalui aplikasi atau email. Dengan terus menggunakan aplikasi setelah perubahan, Anda menyetujui kebijakan yang diperbarui.
              </Text>
            </ScrollView>
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
    paddingBottom: 20,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  readonlyRow: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
    paddingBottom: 12,
  },
  readonlyLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  readonlyValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  avatarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatarOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    marginBottom: 2,
  },
  avatarOptionDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
  },
  avatarCancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  avatarCancelText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary[600],
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
    opacity: 0.6,
  },
  name: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    marginTop: 1,
    marginBottom: 0,
  },
  emailText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '400',
    opacity: 0.5,
    marginTop: 1,
  },
  membershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  membershipText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionLine: {
    height: 1,
    marginBottom: 18,
    marginLeft: -20,
    marginRight: -20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  menuTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  versionText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
    marginBottom: 3,
  },
  copyrightText: {
    fontSize: 9,
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
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
  },
  formContainer: {
    paddingBottom: 16,
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  formAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  changePhotoBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  changePhotoText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: COLORS.primary[500],
  },
  inputLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
  },
  saveBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: 'white',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
  },

  /* Bottom Sheet Modal Styles */
  bottomSheetBox: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
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
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  walletLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  walletValue: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
  },
  topupBtn: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  topupText: {
    color: COLORS.primary[600],
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
  },
  payList: {
    gap: 6,
  },
  payItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  payTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
  },
  paySub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
  },

  /* Security Modal Custom Styles */
  secDetails: {
    gap: 12,
  },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  secLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
  },
  secValue: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    marginTop: 1,
  },
  secNotice: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.6,
    marginTop: 8,
  },

  /* Notifications Sheet Styles */

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  notifLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
  },
  notifSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    marginTop: 1,
    maxWidth: '90%',
  },

  /* FAQ Support Custom Styles */
  faqContent: {
    paddingBottom: 16,
  },
  faqHeader: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    marginBottom: 12,
  },
  faqCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  faqQuestion: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    marginBottom: 4,
  },
  faqAnswer: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    lineHeight: 16,
  },

  /* Review Box Custom Styles */
  reviewBox: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  reviewSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    height: 80,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  successReview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  successTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    marginTop: 12,
  },
  successSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
