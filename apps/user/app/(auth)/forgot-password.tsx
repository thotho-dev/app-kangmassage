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
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

import { supabase } from '../../lib/supabase';
import { Alert } from 'react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Silakan masukkan email Anda');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'kangmassage://reset-password',
      });
      if (error) throw error;
      setIsSent(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
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
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.05)' : 'rgba(253, 185, 39, 0.03)' }]} />

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
          {isSent ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconWrapper}>
                <LinearGradient
                  colors={[COLORS.gold[400], COLORS.gold[600]]}
                  style={styles.successGradient as any}
                >
                  <CheckCircle2 size={48} color="white" />
                </LinearGradient>
              </View>
              <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Email Terkirim!</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
                Instruksi pemulihan kata sandi telah dikirim ke {email}. Silakan periksa kotak masuk Anda.
              </Text>
              
              <Button
                title="Kembali ke Login"
                onPress={() => router.back()}
                style={styles.resetButton}
              />
            </View>
          ) : (
            <View>
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Lupa Kata Sandi?</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Jangan khawatir! Masukkan alamat email Anda dan kami akan mengirimkan instruksi untuk mengatur ulang kata sandi.
                </Text>
              </View>

              <View style={styles.form}>
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

                <Button
                  title="Kirim Instruksi"
                  onPress={handleReset}
                  loading={loading}
                  icon={<ArrowRight size={20} color="white" />}
                  style={styles.resetButton}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle2: {
    position: 'absolute',
    bottom: height * 0.1,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 32,
    marginBottom: 16,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 32,
  },
  resetButton: {
    height: 56,
    borderRadius: 16,
    elevation: 8,
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 35,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 15,
    shadowColor: COLORS.gold[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  successGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
