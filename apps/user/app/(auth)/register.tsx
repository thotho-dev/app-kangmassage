import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Dimensions,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Phone, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !fullName || !phone) {
      Alert.alert('Error', 'Semua kolom wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });

      if (error) throw error;

      // Create user record if session is available (auto-login)
      if (data.session && data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            { 
              supabase_uid: data.user.id, 
              full_name: fullName, 
              phone: phone,
              email: email,
              wallet_balance: 0,
              points: 0,
              cashback: 0,
              role: 'user',
              is_active: true
            }
          ]);
        
        if (profileError) {
          console.error('Error creating user record:', profileError);
        }
        
        router.replace('/(main)/home');
      } else {
        Alert.alert('Sukses', 'Silakan periksa email Anda untuk konfirmasi pendaftaran.');
        router.back();
      }
    } catch (error: any) {
      Alert.alert('Pendaftaran Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? [COLORS.dark[900], COLORS.dark[950]] : [COLORS.white, COLORS.light[100]]}
        style={StyleSheet.absoluteFill as any}
      />
      
      {/* Decorative Gradients */}
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(106, 13, 189, 0.15)' : 'rgba(106, 13, 189, 0.05)' }]} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.topNav}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
          >
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Buat Akun</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Mulai pengalaman relaksasi terbaik bersama Kang Massage</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nama Lengkap"
              placeholder="e.g. John Doe"
              value={fullName}
              onChangeText={setFullName}
              icon={<User size={20} color={theme.textSecondary} />}
              containerStyle={styles.input}
            />
            
            <Input
              label="Nomor Telepon"
              placeholder="0812..."
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              icon={<Phone size={20} color={theme.textSecondary} />}
              containerStyle={styles.input}
            />

            <Input
              label="Alamat Email"
              placeholder="nama@contoh.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail size={20} color={theme.textSecondary} />}
              containerStyle={styles.input}
            />

            <Input
              label="Kata Sandi"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon={<Lock size={20} color={theme.textSecondary} />}
              containerStyle={styles.input}
            />

            <View style={styles.termsContainer}>
              <Text style={[styles.termsText, { color: theme.textSecondary }]}>
                Dengan mendaftar, Anda menyetujui <Text style={styles.linkText}>Syarat & Ketentuan</Text> kami.
              </Text>
            </View>

            <Button
              title="Daftar Sekarang"
              onPress={handleRegister}
              loading={loading}
              icon={<ArrowRight size={20} color="white" />}
              style={styles.registerButton}
            />

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>ATAU</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity style={[styles.googleButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <View style={styles.googleContent}>
                  <FontAwesome name="google" size={24} color="#DB4437" />
                  <Text style={[styles.googleText, { color: theme.text }]}>Daftar dengan Google</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLinkText}>Masuk</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle1: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
  },
  topNav: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    zIndex: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 32,
    marginBottom: 12,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    paddingRight: 40,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  termsContainer: {
    marginBottom: 32,
    paddingRight: 20,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  linkText: {
    color: COLORS.gold[500],
    fontWeight: 'bold',
  },
  registerButton: {
    marginBottom: 40,
    height: 56,
    borderRadius: 16,
    elevation: 8,
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: 'bold',
    marginHorizontal: 16,
    letterSpacing: 1,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  googleButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  loginLinkText: {
    color: COLORS.gold[500],
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: 'bold',
  },
});
