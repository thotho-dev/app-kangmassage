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
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/(main)/home');
    }, 1500);
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
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.05)' : 'rgba(253, 185, 39, 0.03)' }]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[COLORS.gold[400], COLORS.gold[600]]}
                style={styles.logoGradient as any}
              >
                <FontAwesome name="leaf" size={32} color={COLORS.primary[700]} />
              </LinearGradient>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Selamat Datang</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Masuk untuk melanjutkan perjalanan relaksasi Anda</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Alamat Email"
              placeholder="nama@contoh.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.input}
            />
            <Input
              label="Kata Sandi"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={styles.input}
            />

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Lupa Kata Sandi?</Text>
            </TouchableOpacity>

            <Button
              title="Masuk Sekarang"
              onPress={handleLogin}
              loading={loading}
              icon={<ArrowRight size={20} color="white" />}
              style={styles.loginButton}
            />

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>ATAU LANJUTKAN DENGAN</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <FontAwesome name="google" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <FontAwesome name="apple" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <FontAwesome name="facebook" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Belum punya akun? </Text>
            <TouchableOpacity>
              <Text style={styles.signUpText}>Daftar</Text>
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
  circle2: {
    position: 'absolute',
    bottom: height * 0.1,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 12,
    shadowColor: COLORS.gold[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 32,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: COLORS.gold[500],
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  loginButton: {
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
    gap: 20,
  },
  socialButton: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 48,
  },
  footerText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  signUpText: {
    color: COLORS.gold[500],
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: 'bold',
  },
});
