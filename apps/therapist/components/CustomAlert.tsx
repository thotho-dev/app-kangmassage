import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAlertStore } from '../store/alertStore';
import { useThemeColors } from '../store/themeStore';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants/Theme';

export default function CustomAlert() {
  const { visible, options, hideAlert } = useAlertStore();
  const t = useThemeColors();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !options) return null;

  const { title, message, type = 'info', buttons } = options;

  const getIcon = () => {
    switch (type) {
      case 'success': return { name: 'checkmark-circle', color: '#10B981' };
      case 'error': return { name: 'alert-circle', color: '#EF4444' };
      case 'warning': return { name: 'warning', color: '#F59E0B' };
      default: return { name: 'information-circle', color: '#3B82F6' };
    }
  };

  const icon = getIcon();

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.modal,
          {
            backgroundColor: t.surface,
            opacity: fadeAnim,
            transform: [{
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1]
              })
            }]
          }
        ]}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
              <Ionicons name={icon.name as any} size={40} color={icon.color} />
            </View>
            
            <Text style={[styles.title, { color: t.text }]}>{title}</Text>
            <Text style={[styles.message, { color: t.textSecondary }]}>{message}</Text>

            <View style={styles.buttonContainer}>
              {buttons && buttons.length > 0 ? (
                buttons.map((btn, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      index > 0 && styles.buttonMargin,
                      btn.style === 'cancel' 
                        ? { backgroundColor: t.border } 
                        : btn.style === 'destructive' 
                          ? { backgroundColor: '#EF4444' }
                          : { backgroundColor: t.primary }
                    ]}
                    onPress={() => {
                      hideAlert();
                      if (btn.onPress) btn.onPress();
                    }}
                  >
                    <Text style={[
                      styles.buttonText,
                      btn.style === 'cancel' ? { color: t.text } : { color: '#FFFFFF' }
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: t.primary, width: '100%' }]}
                  onPress={hideAlert}
                >
                  <Text style={styles.buttonText}>OKE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export const useAlert = () => {
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, buttons?: any) => {
    useAlertStore.getState().showAlert({ type, title, message, buttons });
  };
  return { showAlert, AlertComponent: null };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...TYPOGRAPHY.h3,
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 18,
  },
  message: {
    ...TYPOGRAPHY.bodySmall,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 8,
  },
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonMargin: {
    // marginTop: 8,
  },
  buttonText: {
    ...TYPOGRAPHY.bodySmall,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
});
