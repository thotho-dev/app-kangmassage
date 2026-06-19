import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Lock, Shield, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!currentPassword.trim()) {
      showAlert('Eror', 'Masukkan password saat ini.');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      showAlert('Eror', 'Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Eror', 'Konfirmasi password tidak sesuai.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      showAlert('Gagal', err.message || 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ganti Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {success ? (
            <View style={styles.successBox}>
              <CheckCircle2 size={56} color="#00A896" />
              <Text style={styles.successTitle}>Password Berhasil Diubah</Text>
              <Text style={styles.successDesc}>Kembali ke profil...</Text>
            </View>
          ) : (
            <>
              <View style={styles.infoBox}>
                <Shield size={18} color="#240080" />
                <Text style={styles.infoText}>
                  Password digunakan untuk masuk ke akun Kang Massage Anda. Gunakan kombinasi huruf dan angka yang kuat.
                </Text>
              </View>

              <Text style={styles.label}>Password Saat Ini</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Masukkan password saat ini"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Password Baru</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Konfirmasi Password Baru</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Ulangi password baru"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={[styles.saveBtn, (!currentPassword || !newPassword || !confirmPassword || saving) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!currentPassword || !newPassword || !confirmPassword || saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Password</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F8F8FB';
const BORDER = '#F0F0F0';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  scrollContent: { padding: 20 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F0EBFF', borderRadius: 12,
    padding: 14, marginBottom: 20,
  },
  infoText: {
    flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, lineHeight: 18,
  },

  label: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED, marginBottom: 8, marginTop: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F5F5F7', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK, borderWidth: 1, borderColor: BORDER,
  },

  saveBtn: {
    backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 28, alignItems: 'center', marginTop: 28,
  },
  saveBtnDisabled: { backgroundColor: '#E2E8F0' },
  saveBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },

  successBox: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 16,
  },
  successTitle: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  successDesc: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED,
  },
});
