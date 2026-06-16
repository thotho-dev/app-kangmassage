import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  Animated, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { X, KeyRound, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const ERROR = '#E74C3C';

interface PinModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  onVerify: (pin: string) => void;
  onClose: () => void;
}

export default function PinModal({
  visible,
  title = 'Masukkan PIN Transaksi',
  subtitle = 'Masukkan PIN 6 digit Anda',
  loading = false,
  error,
  onVerify,
  onClose,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setPin('');
    }
  }, [error]);

  const handleSubmit = () => {
    if (pin.length >= 4 && !loading) {
      onVerify(pin);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.iconBox}>
            <KeyRound size={28} color={PURPLE} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  pin.length > i && styles.dotFilled,
                ]}
              />
            ))}
          </View>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={pin}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, 6);
              setPin(digits);
              if (digits.length === 6) {
                setTimeout(() => onVerify(digits), 200);
              }
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {error ? (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color={ERROR} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading && <ActivityIndicator color={PURPLE} style={{ marginTop: 16 }} size="small" />}

          <View style={styles.numpadContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((key, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.numpadKey,
                  key === '' && { opacity: 0, pointerEvents: 'none' as any },
                  key === 'DEL' && styles.numpadKeyDel,
                ]}
                onPress={() => {
                  if (key === 'DEL') {
                    setPin(prev => prev.slice(0, -1));
                  } else if (typeof key === 'number' && pin.length < 6) {
                    setPin(prev => prev + key);
                    if (pin.length === 5) {
                      setTimeout(() => onVerify(pin + key), 200);
                    }
                  }
                }}
                disabled={key === ''}
                activeOpacity={0.6}
              >
                <Text style={[
                  styles.numpadKeyText,
                  key === 'DEL' && styles.numpadKeyTextDel,
                ]}>
                  {key === 'DEL' ? '⌫' : key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#E5E7EB', position: 'absolute',
    top: 8,
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
  },
  dotsContainer: {
    flexDirection: 'row', gap: 12, marginBottom: 8,
  },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#F0F0F0',
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  dotFilled: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  hiddenInput: {
    position: 'absolute', width: 1, height: 1, opacity: 0,
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Medium',
    color: ERROR,
  },
  numpadContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12, marginTop: 20,
    maxWidth: width * 0.8,
  },
  numpadKey: {
    width: (width * 0.8 - 24) / 3,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadKeyDel: {
    backgroundColor: '#FFF0F0',
  },
  numpadKeyText: {
    fontSize: 22, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK,
  },
  numpadKeyTextDel: {
    color: ERROR, fontSize: 20,
  },
});
