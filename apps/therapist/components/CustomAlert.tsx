import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../store/themeStore';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants/Theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
}

const TYPE_CONFIG: Record<AlertType, { icon: string; color: string }> = {
  success: { icon: 'checkmark-circle', color: '#10B981' },
  error:   { icon: 'close-circle',     color: '#EF4444' },
  warning: { icon: 'warning',          color: '#F59E0B' },
  info:    { icon: 'information-circle', color: '#3B82F6' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomAlert({
  visible, type = 'info', title, message, buttons, onDismiss,
}: CustomAlertProps) {
  const t = useThemeColors();
  const styles = getStyles(t);
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.85);
      opacity.setValue(0);
    }
  }, [visible]);

  const cfg = TYPE_CONFIG[type];
  const resolvedButtons: AlertButton[] = buttons || [{ text: 'OK', onPress: onDismiss }];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>

          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
            <Ionicons name={cfg.icon as any} size={40} color={cfg.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {/* Buttons */}
          <View style={[styles.btnRow, resolvedButtons.length === 1 && { justifyContent: 'center' }]}>
            {resolvedButtons.map((btn, i) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const bgColor = isCancel ? t.surface : isDestructive ? '#EF4444' : cfg.color;
              const textColor = isCancel ? t.textSecondary : '#FFFFFF';

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.btn,
                    { backgroundColor: bgColor },
                    isCancel && { borderWidth: 1.5, borderColor: t.border },
                    resolvedButtons.length === 1 && { minWidth: 140 },
                  ]}
                  onPress={() => btn.onPress?.()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.btnText, { color: textColor }]}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

export function useAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false, type: 'info', title: '',
  });

  const showAlert = useCallback((
    type: AlertType,
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    setAlertState({ visible: true, type, title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = (
    <CustomAlert
      visible={alertState.visible}
      type={alertState.type}
      title={alertState.title}
      message={alertState.message}
      buttons={alertState.buttons?.map(b => ({
        ...b,
        onPress: () => { b.onPress?.(); hideAlert(); },
      })) || [{ text: 'OK', onPress: hideAlert }]}
      onDismiss={hideAlert}
    />
  );

  return { showAlert, hideAlert, AlertComponent };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getStyles = (t: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    backgroundColor: t.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: t.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: t.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginTop: SPACING.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  btnText: {
    ...TYPOGRAPHY.body,
    fontFamily: 'Inter_700Bold',
  },
});
