import { View, Text, TouchableOpacity, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  storeUrl: string;
  onClose?: () => void;
}

export default function UpdateModal({ visible, storeUrl, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 28,
          width: '100%',
          maxWidth: 340,
          alignItems: 'center',
        }}>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16, color: '#6B7280', lineHeight: 18 }}>✕</Text>
            </TouchableOpacity>
          )}
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#1E3A8A15',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Ionicons name="cloud-download-outline" size={32} color="#1E3A8A" />
          </View>
          <Text style={{
            fontSize: 20,
            fontFamily: 'Inter_700Bold',
            color: '#1A1A2E',
            marginBottom: 8,
          }}>
            Pembaruan Tersedia
          </Text>
          <Text style={{
            fontSize: 14,
            fontFamily: 'Inter_400Regular',
            color: '#6B7280',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 20,
          }}>
            Versi baru Kang Massage Mitra sudah tersedia. Update sekarang untuk pengalaman terbaik.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#1E3A8A',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 32,
              width: '100%',
              alignItems: 'center',
            }}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(storeUrl)}
          >
            <Text style={{
              color: '#FFFFFF',
              fontFamily: 'Inter_700Bold',
              fontSize: 15,
            }}>
              Update Sekarang
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
