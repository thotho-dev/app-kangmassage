import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  Animated, Platform, ActivityIndicator
} from 'react-native';
import { X, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react-native';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const ERROR = '#E74C3C';
const SUCCESS = '#00A896';

interface OtpModalProps {
  visible: boolean;
  phone?: string;
  loading?: boolean;
  error?: string;
  onVerify: (otp: string) => void;
  onResend?: () => void;
  onClose: () => void;
}

export default function OtpModal({
  visible,
  phone = 'WhatsApp Anda',
  loading = false,
  error,
  onVerify,
  onResend,
  onClose,
}: OtpModalProps) {
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setOtp('');
      setCountdown(60);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [visible, countdown]);

  const handleSubmit = () => {
    if (otp.length === 6 && !loading) {
      onVerify(otp);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.iconBox}>
            <MessageCircle size={28} color={PURPLE} />
          </View>
          <Text style={styles.title}>Verifikasi OTP</Text>
          <Text style={styles.subtitle}>
            Kode verifikasi telah dikirim ke {phone}
          </Text>

          <View style={styles.inputRow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.otpBox, otp.length > i && styles.otpBoxFilled]}>
                <Text style={[styles.otpText, otp.length > i && styles.otpTextFilled]}>
                  {otp[i] || ''}
                </Text>
              </View>
            ))}
          </View>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, 6);
              setOtp(digits);
              if (digits.length === 6) {
                setTimeout(() => onVerify(digits), 200);
              }
            }}
            keyboardType="number-pad"
            maxLength={6}
          />

          {error ? (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color={ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading && <ActivityIndicator color={PURPLE} style={{ marginTop: 16 }} size="small" />}

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={onResend}
            disabled={countdown > 0}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.resendText,
              countdown > 0 && styles.resendTextDisabled
            ]}>
              {countdown > 0
                ? `Kirim ulang dalam ${countdown}s`
                : 'Kirim ulang OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  header: {
    width: '100%', flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center',
    paddingTop: 12, marginBottom: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', position: 'absolute', top: 8,
  },
  closeBtn: {
    position: 'absolute', right: 0, top: 4,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBox: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: `${PURPLE}12`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK, marginBottom: 4,
  },
  subtitle: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, marginBottom: 24,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row', gap: 8, marginBottom: 8,
  },
  otpBox: {
    width: 48, height: 56, borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  otpBoxFilled: {
    borderColor: PURPLE,
    backgroundColor: `${PURPLE}08`,
  },
  otpText: {
    fontSize: 22, fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_MUTED,
  },
  otpTextFilled: { color: PURPLE },
  hiddenInput: {
    position: 'absolute', width: 1, height: 1, opacity: 0,
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: ERROR,
  },
  resendBtn: { marginTop: 20 },
  resendText: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: PURPLE,
  },
  resendTextDisabled: { color: TEXT_MUTED },
});
