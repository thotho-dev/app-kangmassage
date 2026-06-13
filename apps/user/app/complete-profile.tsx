import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  StatusBar, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Phone as PhoneIcon, Edit2, Camera, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();
  const { user, refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      // Initialize with Google metadata if available
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      const avatarUrl = user.user_metadata?.avatar_url || '';
      setName(fullName);
      setAvatar(avatarUrl);
    }
  }, [user]);

  // Upload image to Supabase Storage
  const uploadImage = async (uri: string): Promise<string> => {
    try {
      console.log('[CompleteProfile] Preparing image upload to avatars bucket...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user?.id || Math.random()}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true
        });

      if (error) {
        console.warn('[CompleteProfile] Failed to upload to avatars bucket:', error.message);
        return uri; // Fallback to local URI
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.warn('[CompleteProfile] Error in uploadImage:', err);
      return uri; // Fallback to local URI
    }
  };

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
      setAvatar(result.assets[0].uri);
    }
  };

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
      setAvatar(result.assets[0].uri);
    }
  };

  const handleChangeAvatar = () => {
    showAlert(
      'Foto Profil',
      'Pilih metode untuk mengunggah foto profil Anda:',
      [
        { text: '📸 Ambil Foto', onPress: handleTakeWithCamera },
        { text: '🖼️ Pilih dari Galeri', onPress: handlePickFromGallery },
        { text: 'Batal', style: 'cancel' }
      ]
    );
  };

  const handleSave = async () => {
    if (!user) {
      showAlert('Error', 'Sesi login tidak ditemukan.');
      return;
    }
    if (!name.trim()) {
      showAlert('Error', 'Nama lengkap tidak boleh kosong.');
      return;
    }
    if (!phone.trim() || phone.length < 9) {
      showAlert('Error', 'Masukkan nomor telepon yang valid.');
      return;
    }
    if (!gender) {
      showAlert('Error', 'Silakan pilih jenis kelamin Anda.');
      return;
    }

    setLoading(true);
    try {
      let finalAvatarUrl = avatar.trim();
      if (avatar && !avatar.startsWith('http')) {
        finalAvatarUrl = await uploadImage(avatar);
      }

      // Format phone to standard +62 prefix
      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+62' + normalizedPhone.substring(1);
      } else if (normalizedPhone.startsWith('62')) {
        normalizedPhone = '+' + normalizedPhone;
      } else if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+62' + normalizedPhone;
      }

      // Check if user record already exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_uid', user.id)
        .maybeSingle();

      if (existingUser) {
        // Update profile
        const { error } = await supabase
          .from('users')
          .update({
            full_name: name.trim(),
            phone: normalizedPhone,
            avatar_url: finalAvatarUrl,
            gender: gender,
            role: 'user',
          })
          .eq('supabase_uid', user.id);

        if (error) throw error;
      } else {
        // Insert profile
        const { error } = await supabase
          .from('users')
          .insert({
            supabase_uid: user.id,
            full_name: name.trim(),
            phone: normalizedPhone,
            email: user.email,
            avatar_url: finalAvatarUrl,
            gender: gender,
            role: 'user',
            wallet_balance: 0.00,
            total_orders: 0
          });

        if (error) throw error;
      }

      await refreshProfile();
      showAlert('Sukses', 'Profil Anda berhasil dilengkapi!');
      router.replace('/home');
    } catch (err: any) {
      console.error('[CompleteProfile] Update error:', err);
      showAlert('Gagal Melengkapi Profil', err.message || 'Terjadi kesalahan database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? [COLORS.dark[900], COLORS.dark[950]] : [COLORS.white, COLORS.light[100]]}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(106, 13, 189, 0.15)' : 'rgba(106, 13, 189, 0.05)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Lengkapi Profil</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Silakan lengkapi data diri Anda untuk menikmati layanan Kang Massage
            </Text>
          </View>

          {/* Avatar Selector */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} style={styles.avatarWrapper}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}>
                  <Camera size={36} color={COLORS.primary[500]} />
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Edit2 size={12} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarLabel, { color: theme.textSecondary }]}>Foto Profil</Text>
          </View>

          <View style={styles.form}>
            {/* Full Name Input */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nama Lengkap</Text>
            <View style={[styles.inputFieldWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <User size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Masukkan nama lengkap Anda"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Phone Number Input */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nomor HP / WhatsApp</Text>
            <View style={[styles.inputFieldWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <PhoneIcon size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="8xxxxxxxxx"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* Gender Selection */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Jenis Kelamin</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                  gender === 'male' && { borderColor: COLORS.primary[500], backgroundColor: COLORS.primary[500] + '15' }
                ]}
                onPress={() => setGender('male')}
              >
                <Text style={[styles.genderText, { color: theme.text }, gender === 'male' && { color: COLORS.primary[500], fontFamily: 'PlusJakartaSans-Bold' }]}>
                  Laki-laki
                </Text>
                {gender === 'male' && <Check size={16} color={COLORS.primary[500]} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                  gender === 'female' && { borderColor: COLORS.primary[500], backgroundColor: COLORS.primary[500] + '15' }
                ]}
                onPress={() => setGender('female')}
              >
                <Text style={[styles.genderText, { color: theme.text }, gender === 'female' && { color: COLORS.primary[500], fontFamily: 'PlusJakartaSans-Bold' }]}>
                  Perempuan
                </Text>
                {gender === 'female' && <Check size={16} color={COLORS.primary[500]} />}
              </TouchableOpacity>
            </View>

            {/* Save Button */}
            <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.85} style={styles.saveBtnWrapper}>
              <LinearGradient
                colors={loading ? ['#E2E8F0', '#E2E8F0'] : [COLORS.primary[500], '#1E1B4B']}
                style={styles.saveBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan & Lanjutkan</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle1: {
    position: 'absolute', top: -height * 0.1, right: -width * 0.2,
    width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 40, paddingBottom: 40 },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { ...TYPOGRAPHY.h1, fontSize: 26, marginBottom: 8, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center', paddingHorizontal: 16, lineHeight: 22, fontSize: 13 },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary[500] },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.primary[500], width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF'
  },
  avatarLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', marginTop: 10 },
  form: {},
  inputLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 8 },
  inputFieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, marginBottom: 20
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-Medium' },
  genderContainer: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  genderButton: {
    flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16
  },
  genderText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium' },
  saveBtnWrapper: { marginTop: 8 },
  saveBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 28,
    elevation: 6, shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  saveBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
});
