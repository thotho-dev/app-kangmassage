import React, { createContext, useContext, useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Pressable,
  Image,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { COLORS } from '../constants/Theme';

const { width } = Dimensions.get('window');

interface AlertButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
}

interface AlertContextType {
  showAlert: (title: string, message: string, buttons?: AlertButton[], icon?: boolean | 'horizontal') => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<AlertButton[]>([]);
  const [showIcon, setShowIcon] = useState(false);

  const [iconLayout, setIconLayout] = useState<'vertical' | 'horizontal'>('vertical');

  const showAlert = (
    alertTitle: string,
    alertMessage: string,
    alertButtons?: AlertButton[],
    icon?: boolean | 'horizontal'
  ) => {
    setTitle(alertTitle);
    setMessage(alertMessage);
    setButtons(alertButtons || [{ text: 'OK', style: 'default' }]);
    setShowIcon(!!icon);
    setIconLayout(icon === 'horizontal' ? 'horizontal' : 'vertical');
    setVisible(true);
  };

  const handleButtonPress = (btn: AlertButton) => {
    setVisible(false);
    if (btn.onPress) {
      setTimeout(() => btn.onPress?.(), 100);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}

      {/* Premium Custom Alert Modal */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => {
              if (buttons.length <= 1) {
                setVisible(false);
              }
            }} 
          />
          <View style={[styles.alertContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[
              styles.alertAccent, 
              { 
                backgroundColor: title.toLowerCase().includes('gagal') || title.toLowerCase().includes('error') || title.toLowerCase().includes('eror')
                  ? COLORS.error 
                  : title.toLowerCase().includes('berhasil') || title.toLowerCase().includes('terima') || title.toLowerCase().includes('sukses')
                    ? COLORS.success 
                    : COLORS.primary[500] 
              }
            ]} />
            
            {showIcon && iconLayout === 'horizontal' ? (
              <View style={styles.alertContentHorizontal}>
                <Image
                  source={require('../assets/logo-kang-massage.png')}
                  style={styles.alertIconHorizontal}
                />
                <View style={styles.alertTextWrap}>
                  <Text style={[styles.alertTitleHorizontal, { color: theme.text }]}>{title}</Text>
                  <Text style={[styles.alertMessageHorizontal, { color: theme.textSecondary }]}>{message}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.alertContent}>
                {showIcon && (
                  <Image
                    source={require('../assets/logo-kang-massage.png')}
                    style={styles.alertIcon}
                  />
                )}
                <Text style={[styles.alertTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>{message}</Text>
              </View>
            )}

            <View style={styles.alertButtonsRow}>
              {buttons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.alertBtn,
                      isDestructive ? styles.btnDestructive : isCancel ? [styles.btnCancel, { borderColor: theme.border }] : styles.btnPrimary,
                      buttons.length > 1 && { flex: 1 }
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text style={[
                      styles.alertBtnText,
                      isDestructive ? styles.txtDestructive : isCancel ? { color: theme.textSecondary } : styles.txtPrimary
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: width - 48,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  alertAccent: {
    height: 6,
    width: '120%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  alertIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  alertContentHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  alertIconHorizontal: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    flexShrink: 0,
  },
  alertTextWrap: {
    flex: 1,
  },
  alertContent: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertTitleHorizontal: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 4,
    textAlign: 'left',
  },
  alertMessage: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 20,
    textAlign: 'center',
  },
  alertMessageHorizontal: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 17,
    textAlign: 'left',
  },
  alertButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  alertBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#240080',
    paddingHorizontal: 28,
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
  },
  alertBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  txtPrimary: {
    color: '#FFFFFF',
  },
  txtDestructive: {
    color: '#FFFFFF',
  },
});
