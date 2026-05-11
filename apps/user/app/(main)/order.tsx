import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, StatusBar, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import CustomDateTimePicker from '../../components/ui/CustomDateTimePicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ChevronLeft, 
  MapPin, 
  Map, 
  Clock, 
  Calendar, 
  User, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Wallet,
  Banknote,
  CreditCard,
  QrCode,
  MessageSquare
} from 'lucide-react-native';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { COLORS, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { SERVICES, Service } from '../../constants/Services';
import { useServices } from '../../hooks/useServices';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F5F5F7';
const BORDER = '#EFEFEF';

export default function OrderScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { serviceId } = useLocalSearchParams();
  const { data: servicesData } = useServices();
  
  const allServices = servicesData || SERVICES;
  const initialService = allServices.find(s => s.id === serviceId) || allServices[0];
  const { address, setAddress, coords } = useLocation();

  // Booking State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Dynamic Duration Options from DB
  const durationOptions = React.useMemo(() => {
    if (initialService.duration_options && initialService.duration_options.length > 0) {
      return initialService.duration_options.map((opt: any) => ({
        label: initialService.price_type === 'treatment' ? `${opt.duration} Treatment` : `${opt.duration} Menit`,
        value: opt.duration,
        price: opt.price
      }));
    }
    // Fallback if no options in DB
    return [
      { label: initialService.duration, value: 0, price: initialService.price }
    ];
  }, [initialService]);

  const { user, profile } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState(durationOptions[0]);

  // Sync selectedDuration when service data loads
  React.useEffect(() => {
    if (durationOptions.length > 0) {
      setSelectedDuration(durationOptions[0]);
    }
  }, [durationOptions]);

  const [bookingType, setBookingType] = useState<'now' | 'schedule'>('now');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [therapistGender, setTherapistGender] = useState<'any' | 'male' | 'female'>('any');
  const [paymentMethod, setPaymentMethod] = useState<'saldo' | 'tunai' | 'transfer' | 'qris'>('tunai');
  const [loading, setLoading] = useState(false);

  // Auto-select payment method based on balance
  React.useEffect(() => {
    if (profile && selectedDuration) {
      const userBalance = profile.wallet_balance || 0;
      if (userBalance >= selectedDuration.price) {
        setPaymentMethod('saldo');
      } else {
        setPaymentMethod('tunai');
      }
    }
  }, [profile?.wallet_balance, selectedDuration?.price]);

  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [locationNotes, setLocationNotes] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  const showDatePickerModal = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date: Date) => {
    setSelectedDate(date);
    hideDatePicker();
  };

  const PAYMENT_GROUPS = [
    {
      id: 'internal',
      title: 'Metode Langsung',
      items: [
        { id: 'tunai', label: 'Tunai', icon: Banknote },
        { id: 'saldo', label: 'Saldo Dompet', icon: Wallet },
      ]
    },
    {
      id: 'va',
      title: 'Transfer Bank (Virtual Account)',
      items: [
        { id: 'bca_va', label: 'BCA Virtual Account', icon: CreditCard },
        { id: 'mandiri_va', label: 'Mandiri Virtual Account', icon: CreditCard },
        { id: 'bri_va', label: 'BRI Virtual Account', icon: CreditCard },
        { id: 'bni_va', label: 'BNI Virtual Account', icon: CreditCard },
      ]
    },
    {
      id: 'ewallet',
      title: 'E-Wallet & QRIS',
      items: [
        { id: 'gopay', label: 'GoPay', icon: QrCode },
        { id: 'qris', label: 'QRIS Terapis', icon: QrCode },
      ]
    }
  ];

  const allMethods = PAYMENT_GROUPS.flatMap(g => g.items);
  const currentMethod = allMethods.find(m => m.id === paymentMethod) || allMethods[0];

  const totalPrice = selectedDuration?.price || initialService.price || 0;

  const handleOrder = async () => {
    if (!address) {
      Alert.alert('Alamat Kosong', 'Silakan tentukan lokasi pengiriman terlebih dahulu.');
      return;
    }

    if (paymentMethod === 'saldo' && (profile?.wallet_balance || 0) < totalPrice) {
      Alert.alert('Saldo Kurang', 'Saldo Anda tidak mencukupi untuk melakukan pemesanan ini.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Order
      const orderData = {
        user_id: profile?.id,
        service_id: initialService.id,
        status: 'pending',
        service_price: selectedDuration.price,
        total_price: totalPrice,
        payment_method: paymentMethod,
        address: address,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        location_notes: locationNotes,
        service_notes: serviceNotes,
        scheduled_at: bookingType === 'schedule' ? selectedDate.toISOString() : null,
        user_gender: userGender,
        therapist_preference: therapistGender,
        order_number: `ORD-${Math.floor(100000 + Math.random() * 900000)}`
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Handle Payment Based on Method
      if (paymentMethod === 'saldo') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ wallet_balance: (profile?.wallet_balance || 0) - totalPrice })
          .eq('id', profile?.id);

        if (updateError) throw updateError;

        await supabase.from('transactions').insert([{
          user_id: profile?.id,
          order_id: order.id,
          amount: -totalPrice,
          balance_before: profile?.wallet_balance || 0,
          balance_after: (profile?.wallet_balance || 0) - totalPrice,
          type: 'payment',
          description: `Pembayaran ${initialService.name}`,
        }]);

        router.push({ pathname: '/(main)/tracking', params: { id: order.id } });
      } else if (paymentMethod === 'tunai') {
        // Redirect ke halaman mencari terapis
        router.replace({ pathname: '/(main)/searching-therapist', params: { id: order.id } });
      } else {
        // MIDTRANS CORE API CALL
        const response = await fetch('https://app-kangmassage-web.vercel.app/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            payment_method: paymentMethod,
          }),
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        // Redirect to payment details
        // Gunakan timeout kecil untuk memastikan state update selesai & router siap
        setTimeout(() => {
          router.push({ 
            pathname: '/(main)/payment-details', 
            params: { data: JSON.stringify(result.data), order_id: order.id } 
          });
        }, 100);
      }

    } catch (error: any) {
      console.error('Order error:', error);
      Alert.alert('Gagal Memesan', error.message || 'Terjadi kesalahan saat memproses pesanan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Pesanan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. Selected Service Card */}
        <View style={styles.section}>
          <Card style={styles.serviceCard}>
            <Image 
              source={{ uri: initialService.image }}
              style={styles.serviceImage}
            />
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{initialService.name}</Text>
              <Text style={styles.servicePrice}>Rp {initialService.price.toLocaleString('id-ID')} / {initialService.price_type === 'treatment' ? 'Sesi' : 'Jam'}</Text>
              <Text style={[styles.serviceDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                {initialService.description}
              </Text>
            </View>
          </Card>

          {/* Catatan Layanan */}
          <View style={{ marginTop: 12 }}>
            <View style={styles.noteInputBox}>
              <MessageSquare size={18} color={TEXT_MUTED} style={{ marginTop: 15 }} />
              <TextInput 
                style={[styles.noteInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                value={serviceNotes}
                onChangeText={setServiceNotes}
                placeholder="Catatan (Bawa perlengkapan, dll)"
                multiline={true}
              />
            </View>
          </View>
        </View>

        {/* 2. Atur Lokasi */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Lokasi Layanan</Text>
          <View style={styles.locationContainer}>
            <View style={styles.locationInputBox}>
              <MapPin size={18} color={PURPLE} style={{ marginTop: 20 }} />
              <TextInput 
                style={[styles.locationInput, { height: 80, textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Masukkan alamat lengkap..."
                multiline={true}
              />
            </View>
            <TouchableOpacity 
              style={styles.fullMapsButton} 
              onPress={() => router.push({ pathname: '/(main)/maps', params: { serviceId: serviceId } })}
            >
              <Map size={18} color="#FFFFFF" />
              <Text style={styles.fullMapsButtonText}>Cari di Maps</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <Text style={styles.inputLabel}>Catatan Lokasi (Patokan/Blok/Gang)</Text>
            <View style={styles.noteInputBox}>
              <Info size={18} color={TEXT_MUTED} style={{ marginTop: 15 }} />
              <TextInput 
                style={[styles.noteInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                value={locationNotes}
                onChangeText={setLocationNotes}
                placeholder="Contoh: Rumah pagar hitam samping mushola"
                multiline={true}
              />
            </View>
          </View>
        </View>

        {/* 3. Durasi Layanan */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {initialService.price_type === 'treatment' ? 'Pilih Paket Treatment' : 'Durasi Layanan'}
          </Text>
          <View style={styles.durationOptionsContainer}>
            {durationOptions.map((option, index) => (
              <TouchableOpacity 
                key={`${option.value}-${index}`}
                style={[
                  styles.durationOptionCard,
                  selectedDuration?.label === option.label && styles.durationOptionActive
                ]}
                onPress={() => setSelectedDuration(option)}
              >
                <View style={styles.durationOptionInfo}>
                  <Clock size={16} color={selectedDuration?.label === option.label ? PURPLE : TEXT_MUTED} />
                  <Text style={[
                    styles.durationOptionLabel,
                    selectedDuration?.label === option.label && styles.durationOptionLabelActive
                  ]}>{option.label}</Text>
                </View>
                <Text style={[
                  styles.durationOptionPrice,
                  selectedDuration?.label === option.label && styles.durationOptionPriceActive
                ]}>Rp {option.price.toLocaleString('id-ID')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Waktu Booking */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Waktu Booking</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, bookingType === 'now' && styles.activeTab]}
              onPress={() => setBookingType('now')}
            >
              <Clock size={16} color={bookingType === 'now' ? PURPLE : TEXT_MUTED} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, bookingType === 'now' && styles.activeTabText]}>Sekarang</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, bookingType === 'schedule' && styles.activeTab]}
              onPress={() => setBookingType('schedule')}
            >
              <Calendar size={16} color={bookingType === 'schedule' ? PURPLE : TEXT_MUTED} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, bookingType === 'schedule' && styles.activeTabText]}>Terjadwal</Text>
            </TouchableOpacity>
          </View>

          {bookingType === 'schedule' && (
            <View style={styles.scheduleOptions}>
              <TouchableOpacity style={styles.scheduleBtn} onPress={() => showDatePickerModal('date')}>
                <Calendar size={18} color={PURPLE} />
                <Text style={styles.scheduleBtnText}>
                  {selectedDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.scheduleBtn} onPress={() => showDatePickerModal('time')}>
                <Clock size={18} color={PURPLE} />
                <Text style={styles.scheduleBtnText}>
                  Pukul {selectedDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <CustomDateTimePicker
            isVisible={isDatePickerVisible}
            mode={pickerMode}
            value={selectedDate}
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
            minimumDate={new Date()}
          />
        </View>

        {/* 5. Jenis Kelamin User */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Jenis Kelamin Anda</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity 
              style={[styles.genderBtn, userGender === 'male' && styles.genderBtnActive]}
              onPress={() => setUserGender('male')}
            >
              <User size={16} color={userGender === 'male' ? PURPLE : TEXT_MUTED} style={{ marginRight: 6 }} />
              <Text style={[styles.genderBtnText, userGender === 'male' && styles.genderBtnTextActive]}>Laki-laki</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.genderBtn, userGender === 'female' && styles.genderBtnActive]}
              onPress={() => setUserGender('female')}
            >
              <User size={16} color={userGender === 'female' ? PURPLE : TEXT_MUTED} style={{ marginRight: 6 }} />
              <Text style={[styles.genderBtnText, userGender === 'female' && styles.genderBtnTextActive]}>Perempuan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. Preferensi Terapis */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>Preferensi Terapis</Text>
            <TouchableOpacity><Info size={16} color={TEXT_MUTED} /></TouchableOpacity>
          </View>
          <View style={styles.genderContainer}>
            <TouchableOpacity 
              style={[styles.genderBtn, therapistGender === 'any' && styles.genderBtnActive]}
              onPress={() => setTherapistGender('any')}
            >
              <Text style={[styles.genderBtnText, therapistGender === 'any' && styles.genderBtnTextActive]}>Mana Saja</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.genderBtn, therapistGender === 'male' && styles.genderBtnActive]}
              onPress={() => setTherapistGender('male')}
            >
              <User size={16} color={therapistGender === 'male' ? PURPLE : TEXT_MUTED} style={{ marginRight: 4 }} />
              <Text style={[styles.genderBtnText, therapistGender === 'male' && styles.genderBtnTextActive]}>Pria</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.genderBtn, therapistGender === 'female' && styles.genderBtnActive]}
              onPress={() => setTherapistGender('female')}
            >
              <User size={16} color={therapistGender === 'female' ? PURPLE : TEXT_MUTED} style={{ marginRight: 4 }} />
              <Text style={[styles.genderBtnText, therapistGender === 'female' && styles.genderBtnTextActive]}>Wanita</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Metode Pembayaran Dropdown */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Metode Pembayaran</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={[styles.paymentSelector, { borderColor: BORDER }]} 
              onPress={() => setShowPaymentDropdown(!showPaymentDropdown)}
            >
              <View style={styles.paymentIcon}>
                <currentMethod.icon size={20} color={PURPLE} />
              </View>
              <Text style={[styles.paymentLabel, { color: TEXT_DARK }]}>
                {currentMethod.label}
              </Text>
              <ChevronDown size={20} color={TEXT_MUTED} />
            </TouchableOpacity>

            {showPaymentDropdown && (
              <View style={[styles.paymentDropdown, { borderColor: BORDER }]}>
                {PAYMENT_GROUPS.map((group) => (
                  <View key={group.id} style={styles.paymentGroup}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    {group.items.map((method) => (
                      <TouchableOpacity 
                        key={method.id} 
                        style={styles.paymentItem} 
                        onPress={() => {
                          setPaymentMethod(method.id as any);
                          setShowPaymentDropdown(false);
                        }}
                      >
                        <method.icon size={20} color={paymentMethod === method.id ? PURPLE : TEXT_MUTED} />
                        <Text style={[
                          styles.paymentItemLabel, 
                          { color: paymentMethod === method.id ? PURPLE : TEXT_DARK }
                        ]}>
                          {method.label}
                        </Text>
                        {paymentMethod === method.id && <View style={styles.selectedDot} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer / Summary */}
      <View style={styles.footer}>
        <View style={styles.priceSummary}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalPrice}>Rp {totalPrice.toLocaleString('id-ID')}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.orderButton, loading && { opacity: 0.8 }]} 
          onPress={handleOrder}
          disabled={loading}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="white" />
              <Text style={styles.orderButtonText}>Memproses...</Text>
            </View>
          ) : (
            <Text style={styles.orderButtonText}>Pesan Sekarang</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F8F9FE',
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  paymentDropdown: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  paymentGroup: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  paymentItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 12,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#240080',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    marginBottom: 12,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  serviceImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: BG,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 15,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: PURPLE,
  },
  serviceDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
    lineHeight: 16,
  },
  locationContainer: {
    gap: 12,
  },
  locationInputBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  locationInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: TEXT_DARK,
    paddingVertical: 17,
  },
  inputGroup: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: TEXT_MUTED,
    marginBottom: 8,
    marginLeft: 4,
  },
  noteInputBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    minHeight: 120,
  },
  noteInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: TEXT_DARK,
  },
  fullMapsButton: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    elevation: 3,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fullMapsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  durationOptionsContainer: {
    gap: 10,
  },
  durationOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  durationOptionActive: {
    borderColor: PURPLE,
    backgroundColor: '#F3E8FF',
  },
  durationOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationOptionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: TEXT_MUTED,
  },
  durationOptionLabelActive: {
    color: PURPLE,
    fontFamily: 'Inter-Bold',
  },
  durationOptionPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  durationOptionPriceActive: {
    color: PURPLE,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFEFEF',
    padding: 4,
    borderRadius: 15,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: TEXT_MUTED,
  },
  activeTabText: {
    color: PURPLE,
  },
  scheduleOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  scheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  scheduleBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    borderColor: PURPLE,
    backgroundColor: '#F3E8FF',
  },
  genderBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  genderBtnTextActive: {
    color: PURPLE,
    fontFamily: 'Inter-Bold',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    height: 60,
  },
  dropdownHeaderActive: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#F3E8FF',
  },
  dropdownHeaderText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  dropdownList: {
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: '#F9F5FF',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: TEXT_DARK,
  },
  paymentTextActive: {
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 35,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceSummary: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  totalPrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  orderButton: {
    backgroundColor: PURPLE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 15,
    elevation: 3,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
});
