import { View, Text, TouchableOpacity, Modal, Linking } from 'react-native';

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
          paddingTop: 24,
          width: '100%',
          maxWidth: 340,
          alignItems: 'center',
        }}>
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
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#F3E8FF',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 28 }}>📲</Text>
          </View>
          <Text style={{
            fontSize: 20,
            fontFamily: 'PlusJakartaSans-Bold',
            color: '#1A1A2E',
            marginBottom: 8,
          }}>
            Pembaruan Tersedia
          </Text>
          <Text style={{
            fontSize: 14,
            fontFamily: 'PlusJakartaSans-Regular',
            color: '#6B7280',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 20,
          }}>
            Versi baru Kang Massage sudah tersedia. Update sekarang untuk pengalaman terbaik.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#240080',
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
              fontFamily: 'PlusJakartaSans-Bold',
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
