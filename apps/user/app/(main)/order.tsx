import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, StatusBar, TextInput, Platform, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CustomDateTimePicker from '@/components/ui/CustomDateTimePicker';
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
  MessageSquare,
  Ticket,
  Tag,
  X
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { SERVICES, Service } from '@/constants/Services';
import { useServices } from '@/hooks/useServices';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F5F5F7';
const BORDER = '#EFEFEF';

export default function OrderScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { serviceId, therapistId, voucherCode: initialVoucherCode, from } = useLocalSearchParams();
  const { data: servicesData } = useServices();
  const [therapist, setTherapist] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (from === 'services') {
          router.replace('/(main)/services');
          return true;
        } else {
          router.replace('/(main)/home');
          return true;
        }
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [from])
  );

  React.useEffect(() => {
    if (therapistId) {
      const fetchTherapist = async () => {
        const { data } = await supabase.from('therapists').select('*').eq('id', therapistId).single();
        if (data) setTherapist(data);
      };
      fetchTherapist();
    }
  }, [therapistId]);

  React.useEffect(() => {
    if (therapist && therapist.gender) {
      setTherapistGender(therapist.gender);
    }
  }, [therapist]);
  
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
  const totalPrice = selectedDuration?.price || initialService.price || 0;

  // Sync selectedDuration when service data loads
  React.useEffect(() => {
    if (durationOptions.length > 0) {
      setSelectedDuration(durationOptions[0]);
    }
  }, [durationOptions]);

  // Skill Validation for Favorite Therapist
  useFocusEffect(
    React.useCallback(() => {
      if (therapist && initialService) {
        const requiredSkill = initialService.category_slug || initialService.name;
        const therapistSkills: string[] = therapist.specializations || [];
        
        // Handle both string and array for requiredSkill
        const checkSkill = (skill: string) => 
          therapistSkills.some(ts => ts.toLowerCase() === skill.toLowerCase());

        const hasSkill = Array.isArray(requiredSkill)
          ? requiredSkill.some(s => checkSkill(s))
          : checkSkill(requiredSkill);
        
        if (!hasSkill) {
          Alert.alert(
            'Keahlian Tidak Cocok',
            `Maaf, ${therapist.full_name} tidak memiliki keahlian untuk layanan "${initialService.name}".\n\nSilakan pilih layanan lain yang dikuasai terapis ini.`,
            [{ text: 'Kembali Pilih Layanan', onPress: () => router.replace({ pathname: '/(main)/services', params: { therapistId } }) }]
          );
        }
      }
    }, [therapist, initialService, therapistId])
  );

  const [bookingType, setBookingType] = useState<'now' | 'schedule'>('now');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [therapistGender, setTherapistGender] = useState<'any' | 'male' | 'female'>('any');
  const [paymentMethod, setPaymentMethod] = useState<'saldo' | 'tunai' | 'transfer' | 'qris'>('tunai');
  const [loading, setLoading] = useState(false);

  // Voucher Logic
  const [voucherCode, setVoucherCode] = useState((initialVoucherCode as string) || '');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const finalPrice = Math.max(0, totalPrice - discountAmount);

  // Auto-select payment method based on balance
  React.useEffect(() => {
    if (profile) {
      const userBalance = profile.wallet_balance || 0;
      if (userBalance >= finalPrice) {
        setPaymentMethod('saldo');
      } else {
        setPaymentMethod('tunai');
      }
    }
  }, [profile?.wallet_balance, finalPrice]);

  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [locationNotes, setLocationNotes] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const lastCheckedCode = React.useRef<string | null>(null);




  const checkVoucher = async (codeOverride?: string, silent: boolean = false) => {
    const codeToUse = codeOverride || voucherCode;
    if (!codeToUse) return;
    
    // Prevent repeated alerts for the same code if it's already been checked
    if (silent && lastCheckedCode.current === codeToUse.toUpperCase()) return;
    lastCheckedCode.current = codeToUse.toUpperCase();
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', codeToUse.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        if (!silent) Alert.alert('Voucher Tidak Valid', 'Kode voucher tidak ditemukan atau sudah tidak aktif.');
        return;
      }

      // Validasi Masa Berlaku
      const now = new Date();
      if (new Date(data.valid_until) < now) {
        if (!silent) Alert.alert('Voucher Kedaluwarsa', 'Masa berlaku voucher ini telah berakhir.');
        return;
      }

      // Validasi Min Order
      if (totalPrice < data.min_order_amount) {
        if (!silent) Alert.alert('Minimal Order Belum Tercapai', `Voucher ini hanya berlaku untuk minimal pemesanan Rp ${data.min_order_amount.toLocaleString('id-ID')}`);
        return;
      }

      // Validasi Usage Limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        if (!silent) Alert.alert('Voucher Habis', 'Kuota penggunaan voucher ini telah habis.');
        return;
      }

      // Validasi Layanan Khusus
      if (data.category === 'service' && data.service_id && data.service_id !== serviceId) {
        if (!silent) Alert.alert('Layanan Tidak Sesuai', 'Voucher ini hanya berlaku untuk layanan tertentu.');
        return;
      }

      // Validasi Happy Hour
      if (data.category === 'happy_hour' && data.start_time && data.end_time) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startH, startM] = data.start_time.split(':').map(Number);
        const [endH, endM] = data.end_time.split(':').map(Number);
        
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        if (currentTime < startTime || currentTime > endTime) {
          if (!silent) Alert.alert('Belum Waktunya', `Voucher ini hanya berlaku pada jam ${data.start_time.substring(0, 5)} - ${data.end_time.substring(0, 5)}.`);
          return;
        }
      }

      // Validasi Lokasi (Berlaku untuk semua kategori jika ada data wilayah)
      if (data.area_names && Array.isArray(data.area_names) && data.area_names.length > 0 && address) {
        const addressLower = address.toLowerCase();
        const isCovered = data.area_names.some((areaName: string) => {
          // Mendukung format "Provinsi - Kota/Kabupaten" atau langsung nama wilayah
          const target = areaName.includes(' - ') ? areaName.split(' - ')[1] : areaName;
          const cleanTarget = target.toLowerCase()
            .replace(/kota\s+/g, '')
            .replace(/kabupaten\s+/g, '')
            .replace(/adm\.\s+/g, '')
            .replace(/jakarta\s+/g, 'jakarta ')
            .trim();
          
          return addressLower.includes(cleanTarget);
        });
        
        if (!isCovered) {
          if (!silent) Alert.alert('Area Tidak Sesuai', `Voucher ini hanya berlaku untuk wilayah: ${data.area_names.join(', ')}.`);
          return;
        }
      }

      // Validasi Pengguna Baru
      if (data.category === 'new_user') {
        const orderCount = profile?.total_orders || 0;
        if (orderCount > 0) {
          if (!silent) Alert.alert('Khusus Pengguna Baru', 'Voucher ini hanya berlaku untuk pesanan pertama Anda.');
          return;
        }
      }

      // Validasi Repeat Order
      if (data.category === 'repeat_order') {
        const orderCount = profile?.total_orders || 0;
        if (orderCount < (data.min_order_count || 0)) {
          if (!silent) Alert.alert('Syarat Tidak Terpenuhi', `Voucher ini hanya berlaku setelah Anda melakukan minimal ${data.min_order_count} pesanan.`);
          return;
        }
      }

      // Hitung Diskon
      let discount = 0;
      if (data.type === 'percentage') {
        discount = (totalPrice * data.value) / 100;
        if (data.max_discount && discount > data.max_discount) {
          discount = data.max_discount;
        }
      } else {
        discount = data.value;
      }

      setAppliedVoucher(data);
      setDiscountAmount(discount);
      if (!codeOverride) {
        Alert.alert('Berhasil', `Voucher "${data.code}" berhasil digunakan! Anda mendapatkan potongan Rp ${discount.toLocaleString('id-ID')}`);
      }
    } catch (error) {
      console.error('Check voucher error:', error);
      Alert.alert('Error', 'Gagal memproses voucher.');
    } finally {
      setLoading(false);
    }
  };

  const autoApplyBestVoucher = async () => {
    if (appliedVoucher) return; // Don't override if already applied from params
    
    try {
      const { data: vouchers, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .gte('valid_until', new Date().toISOString());

      if (error || !vouchers) return;

      let bestVoucher = null;
      let maxDiscount = 0;

      for (const v of vouchers) {
        // Basic Validations
        if (totalPrice < v.min_order_amount) continue;
        if (v.usage_limit && v.usage_count >= v.usage_limit) continue;
        if (v.category === 'service' && v.service_id && v.service_id !== serviceId) continue;
        
        // Validasi Happy Hour (Auto Apply)
        if (v.category === 'happy_hour' && v.start_time && v.end_time) {
          const now = new Date();
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const [startH, startM] = v.start_time.split(':').map(Number);
          const [endH, endM] = v.end_time.split(':').map(Number);
          const startTime = startH * 60 + startM;
          const endTime = endH * 60 + endM;
          if (currentTime < startTime || currentTime > endTime) continue;
        }
        
        // Validasi Lokasi (Auto Apply - Berlaku untuk semua kategori)
        if (v.area_names && Array.isArray(v.area_names) && v.area_names.length > 0 && address) {
          const addressLower = address.toLowerCase();
          const isCovered = v.area_names.some((areaName: string) => {
            const target = areaName.includes(' - ') ? areaName.split(' - ')[1] : areaName;
            const cleanTarget = target.toLowerCase()
              .replace('kota ', '')
              .replace('kabupaten ', '')
              .replace('adm. ', '')
              .trim();
            return addressLower.includes(cleanTarget);
          });
          if (!isCovered) continue;
        }
        
        // Validasi Pengguna Baru (Auto Apply)
        if (v.category === 'new_user') {
          const orderCount = profile?.total_orders || 0;
          if (orderCount > 0) continue;
        }

        // Validasi Repeat Order (Auto Apply)
        if (v.category === 'repeat_order') {
          const orderCount = profile?.total_orders || 0;
          if (orderCount < (v.min_order_count || 0)) continue;
        }

        // Calculate Discount
        let discount = 0;
        if (v.type === 'percentage') {
          discount = (totalPrice * v.value) / 100;
          if (v.max_discount && discount > v.max_discount) {
            discount = v.max_discount;
          }
        } else {
          discount = v.value;
        }

        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestVoucher = v;
        }
      }

      if (bestVoucher) {
        setAppliedVoucher(bestVoucher);
        setDiscountAmount(maxDiscount);
        setVoucherCode(bestVoucher.code);
      }
    } catch (err) {
      console.error('Auto-apply error:', err);
    }
  };

  // Auto-apply if code from params OR try to find best one
  React.useEffect(() => {
    if (initialVoucherCode && totalPrice > 0) {
      checkVoucher(initialVoucherCode as string, true);
    } else if (totalPrice > 0 && !appliedVoucher) {
      autoApplyBestVoucher();
    }
  }, [initialVoucherCode, totalPrice, profile]);

  // Recalculate discount if total price changes
  React.useEffect(() => {
    if (appliedVoucher) {
      // Re-validate min order first
      if (totalPrice < appliedVoucher.min_order_amount) {
        setAppliedVoucher(null);
        setDiscountAmount(0);
        setVoucherCode('');
        Alert.alert('Voucher Terlepas', 'Minimal order tidak tercapai untuk voucher ini.');
        return;
      }

      let discount = 0;
      if (appliedVoucher.type === 'percentage') {
        discount = (totalPrice * appliedVoucher.value) / 100;
        if (appliedVoucher.max_discount && discount > appliedVoucher.max_discount) {
          discount = appliedVoucher.max_discount;
        }
      } else {
        discount = appliedVoucher.value;
      }
      setDiscountAmount(discount);
    }
  }, [totalPrice]);

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


  const handleOrder = async () => {
    if (!address) {
      Alert.alert('Alamat Kosong', 'Silakan tentukan lokasi pengiriman terlebih dahulu.');
      return;
    }

    if (paymentMethod === 'saldo' && (profile?.wallet_balance || 0) < finalPrice) {
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
        total_price: finalPrice,
        discount_amount: discountAmount,
        voucher_id: appliedVoucher?.id || null,
        payment_method: paymentMethod,
        address: address,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        location_notes: locationNotes,
        service_notes: serviceNotes,
        scheduled_at: bookingType === 'schedule' ? selectedDate.toISOString() : null,
        therapist_id: therapistId || null,
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
          amount: -finalPrice,
          balance_before: profile?.wallet_balance || 0,
          balance_after: (profile?.wallet_balance || 0) - finalPrice,
          type: 'payment',
          description: `Pembayaran ${initialService.name}`,
        }]);

        router.push({ pathname: '/(main)/tracking', params: { id: order.id } });
      } else if (paymentMethod === 'tunai') {
        // Redirect ke halaman mencari terapis jika bukan dari favorit
        if (therapistId) {
          router.replace({ pathname: '/(main)/tracking', params: { id: order.id } });
        } else {
          router.replace({ pathname: '/(main)/searching-therapist', params: { id: order.id } });
        }
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
        <TouchableOpacity 
          onPress={() => {
            if (from === 'services') {
              router.push('/(main)/services');
            } else {
              router.push('/(main)/home');
            }
          }} 
          style={styles.backButton}
        >
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
              onPress={() => router.push({ 
                pathname: '/(main)/maps', 
                params: { serviceId: serviceId, from: 'order', sourceFrom: from as string } 
              })}
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
              style={[
                styles.genderBtn, 
                therapistGender === 'any' && styles.genderBtnActive,
                !!therapistId && therapistGender !== 'any' && { opacity: 0.3 }
              ]}
              onPress={() => setTherapistGender('any')}
              disabled={!!therapistId}
            >
              <Text style={[styles.genderBtnText, therapistGender === 'any' && styles.genderBtnTextActive]}>Mana Saja</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.genderBtn, 
                therapistGender === 'male' && styles.genderBtnActive,
                !!therapistId && therapistGender !== 'male' && { opacity: 0.3 }
              ]}
              onPress={() => setTherapistGender('male')}
              disabled={!!therapistId}
            >
              <User size={16} color={therapistGender === 'male' ? PURPLE : TEXT_MUTED} style={{ marginRight: 4 }} />
              <Text style={[styles.genderBtnText, therapistGender === 'male' && styles.genderBtnTextActive]}>Pria</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.genderBtn, 
                therapistGender === 'female' && styles.genderBtnActive,
                !!therapistId && therapistGender !== 'female' && { opacity: 0.3 }
              ]}
              onPress={() => setTherapistGender('female')}
              disabled={!!therapistId}
            >
              <User size={16} color={therapistGender === 'female' ? PURPLE : TEXT_MUTED} style={{ marginRight: 4 }} />
              <Text style={[styles.genderBtnText, therapistGender === 'female' && styles.genderBtnTextActive]}>Wanita</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. Voucher Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Voucher Promo</Text>
          <TouchableOpacity 
            style={[styles.voucherSelector, appliedVoucher && styles.voucherSelectorActive]}
            onPress={() => router.push({ 
              pathname: '/(main)/vouchers', 
              params: { 
                from: 'order', 
                sourceFrom: from as string, 
                serviceId: serviceId as string, 
                therapistId: therapistId as string,
                totalPrice: totalPrice.toString()
              } 
            })}
          >
            <View style={styles.voucherLeft}>
              <Tag size={20} color={appliedVoucher ? '#FFFFFF' : PURPLE} />
              <View style={styles.voucherInfo}>
                {appliedVoucher ? (
                  <>
                    <Text style={styles.voucherAppliedTitle}>{appliedVoucher.code}</Text>
                    <Text style={styles.voucherAppliedSub}>Berhasil digunakan (Hemat Rp {discountAmount.toLocaleString('id-ID')})</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.voucherPlaceholderTitle}>Pilih atau Masukkan Voucher</Text>
                    <Text style={styles.voucherPlaceholderSub}>Klik untuk melihat promo tersedia</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.voucherRight}>
              {appliedVoucher ? (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    setAppliedVoucher(null);
                    setDiscountAmount(0);
                    setVoucherCode('');
                  }}
                  style={styles.removeVoucherBtn}
                >
                  <X size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <ChevronRight size={20} color={TEXT_MUTED} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* 8. Metode Pembayaran Dropdown */}
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
          <Text style={styles.totalPrice}>Rp {finalPrice.toLocaleString('id-ID')}</Text>
          {discountAmount > 0 && (
            <Text style={styles.discountLabel}>Hemat Rp {discountAmount.toLocaleString('id-ID')}</Text>
          )}
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
  discountLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginTop: 2,
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
  // Voucher Styles
  voucherSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginTop: 8,
  },
  voucherSelectorActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voucherInfo: {
    marginLeft: 12,
    flex: 1,
  },
  voucherPlaceholderTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  voucherPlaceholderSub: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  voucherAppliedTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  voucherAppliedSub: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  voucherRight: {
    marginLeft: 12,
  },
  removeVoucherBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
