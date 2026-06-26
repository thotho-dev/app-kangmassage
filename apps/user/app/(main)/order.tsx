import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, StatusBar, TextInput, Platform, Alert, ActivityIndicator, BackHandler, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAndroidId, getIosIdForVendorAsync } from 'expo-application';
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
  Plus,
  Info,
  Wallet,
  Banknote,
  MessageSquare,
  Ticket,
  Tag,
  X,
  Check
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import type { Service } from '@/constants/Services';
import { useServices } from '@/hooks/useServices';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { getAppSettings } from '@/lib/appSettings';
import { API_URL } from '@/lib/config';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F5F5F7';
const BORDER = '#EFEFEF';

export default function OrderScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { serviceId, therapistId, voucherCode: initialVoucherCode, from, paymentMethod: paymentMethodParam } = useLocalSearchParams();
  const { data: servicesData } = useServices();
  const [therapist, setTherapist] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        router.back();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [])
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

  const allServices = servicesData ?? [];
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
      {
        label: initialService.price_type === 'treatment' ? '1 Treatment' : `${initialService.duration_min || parseInt(initialService.duration) || 0} Menit`,
        value: initialService.duration_min || parseInt(initialService.duration) || 0,
        price: initialService.base_price || initialService.price || 0
      }
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
          showAlert(
            'Keahlian Tidak Cocok',
            `Maaf, ${therapist.full_name} tidak memiliki keahlian untuk layanan "${initialService.name}".\n\nSilakan pilih layanan lain yang dikuasai terapis ini.`,
            [{ text: 'Kembali Pilih Layanan', onPress: () => router.replace({ pathname: '/services', params: { therapistId } }) }]
          );
        }
      }
    }, [therapist, initialService, therapistId])
  );

  const [bookingType, setBookingType] = useState<'now' | 'schedule'>('now');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [therapistGender, setTherapistGender] = useState<'any' | 'male' | 'female'>('any');
  const [paymentMethod, setPaymentMethod] = useState<'saldo' | 'tunai' | 'transfer' | 'qris'>((paymentMethodParam as 'saldo' | 'tunai' | 'transfer' | 'qris') || 'tunai');
  const [loading, setLoading] = useState(false);

  // Voucher Logic
  const [voucherCode, setVoucherCode] = useState((initialVoucherCode as string) || '');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [useCashback, setUseCashback] = useState(false);
  const [serviceFee, setServiceFee] = useState(2000);

  // Layanan Tambahan — state hooks HARUS sebelum subtotal (Hermes hoist)
  const [showAdditional, setShowAdditional] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [additionalServices, setAdditionalServices] = useState<any[]>([]);

  useEffect(() => {
    getAppSettings().then(s => setServiceFee(s.order_service_fee));
  }, []);

  // Must be declared before subtotal
  const addonTotal = additionalServices
    .filter(a => selectedAddons.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isCashback = appliedVoucher?.is_cashback === true;
  
  // Perhitungan Cashback 70%
  const userCashbackBalance = profile?.cashback_balance || 0;
  const maxCashbackCanUse = Math.floor(userCashbackBalance * 0.7);
  
  const subtotal = (totalPrice || 0) + (addonTotal || 0);
  let finalPrice = (isCashback ? subtotal : Math.max(0, subtotal - (discountAmount || 0))) + (serviceFee || 0);
  
  // Potong Cashback jika diaktifkan (Hanya untuk pembayaran Saldo)
  const cashbackToDeduct = (useCashback && paymentMethod === 'saldo') ? Math.min(finalPrice, maxCashbackCanUse) : 0;
  finalPrice = finalPrice - cashbackToDeduct;

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
  const [deviceId, setDeviceId] = useState<string>('');
  const [locationNotes, setLocationNotes] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const lastCheckedCode = React.useRef<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const id = Platform.OS === 'android'
          ? await getAndroidId()
          : await getIosIdForVendorAsync();
        if (id) setDeviceId(id);
      } catch {}
    })();
  }, []);

  React.useEffect(() => {
    const fetchAddons = async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name, base_price, description, image_url, category_slug, duration_min, price_type')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('sort_order', { ascending: true });

      if (data) {
        const currentCats: string[] = initialService.category_slug || [];
        const filtered = data.filter((s: any) =>
          s.id !== serviceId &&
          Array.isArray(s.category_slug) &&
          s.category_slug.length === 1 &&
          !(Array.isArray(currentCats) && currentCats.length > 0 && currentCats.includes(s.category_slug[0]))
        );
        setAdditionalServices(filtered.map((s: any) => ({
          id: s.id,
          name: s.name,
          price: Number(s.base_price) || 0,
          desc: s.description || '',
          image: s.image_url,
          duration: s.duration_min,
          price_type: s.price_type
        })));
      }
    };
    fetchAddons();
  }, [serviceId]);




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
        if (!silent) showAlert('Voucher Tidak Valid', 'Kode voucher tidak ditemukan atau sudah tidak aktif.');
        return;
      }

      // Validasi Masa Berlaku
      const now = new Date();
      if (new Date(data.valid_until) < now) {
        if (!silent) showAlert('Voucher Kedaluwarsa', 'Masa berlaku voucher ini telah berakhir.');
        return;
      }

      // Validasi Min Order
      if ((totalPrice + addonTotal) < data.min_order_amount) {
        if (!silent) showAlert('Minimal Order Belum Tercapai', `Voucher ini hanya berlaku untuk minimal pemesanan Rp ${data.min_order_amount.toLocaleString('id-ID')}`);
        return;
      }

      // Validasi Usage Limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        if (!silent) showAlert('Voucher Habis', 'Kuota penggunaan voucher ini telah habis.');
        return;
      }

      // Validasi Usage Limit Per User
      const limitPerUser = Number(data.user_limit) || 1;
      
      const { data: usageData, error: usageError } = await supabase
        .from('voucher_usages')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('voucher_id', data.id);

      const userUsageCount = usageData?.length || 0;

      if (userUsageCount >= limitPerUser) {
        if (!silent) showAlert('Batas Penggunaan', `Voucher ini hanya dapat digunakan maksimal ${limitPerUser} kali per pengguna.`);
        return;
      }

      // Validasi Layanan Khusus
      if (data.category === 'service' && data.service_id && data.service_id !== serviceId) {
        if (!silent) showAlert('Layanan Tidak Sesuai', 'Voucher ini hanya berlaku untuk layanan tertentu.');
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
          if (!silent) showAlert('Belum Waktunya', `Voucher ini hanya berlaku pada jam ${data.start_time.substring(0, 5)} - ${data.end_time.substring(0, 5)}.`);
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
          if (!silent) showAlert('Area Tidak Sesuai', `Voucher ini hanya berlaku untuk wilayah: ${data.area_names.join(', ')}.`);
          return;
        }
      }

      // Validasi Pengguna Baru
      if (data.category === 'new_user') {
        const orderCount = profile?.total_orders || 0;
        if (orderCount > 0) {
          if (!silent) showAlert('Khusus Pengguna Baru', 'Voucher ini hanya berlaku untuk pesanan pertama Anda.');
          return;
        }
        if (deviceId) {
          const { data: deviceUsage } = await supabase
            .from('voucher_usages')
            .select('id')
            .eq('voucher_id', data.id)
            .eq('device_id', deviceId);
          if (deviceUsage && deviceUsage.length > 0) {
            if (!silent) showAlert('Khusus Pengguna Baru', 'Voucher ini sudah pernah digunakan di perangkat ini.');
            return;
          }
        }
      }

      // Validasi Repeat Order
      if (data.category === 'repeat_order') {
        const orderCount = profile?.total_orders || 0;
        if (orderCount < (data.min_order_count || 0)) {
          if (!silent) showAlert('Syarat Tidak Terpenuhi', `Voucher ini hanya berlaku setelah Anda melakukan minimal ${data.min_order_count} pesanan.`);
          return;
        }
      }

      // Validasi Pembayaran via Saldo (Wallet Payment)
      if (data.category === 'wallet_payment' && paymentMethod !== 'saldo') {
        if (!silent) showAlert('Bayar Pakai Saldo', 'Voucher ini hanya berlaku jika Anda membayar menggunakan saldo dompet.');
        return;
      }

      // Hitung Diskon
      let discount = 0;
      if (data.type === 'percentage') {
        discount = ((totalPrice + addonTotal) * data.value) / 100;
        if (data.max_discount && discount > data.max_discount) {
          discount = data.max_discount;
        }
      } else {
        discount = data.value;
      }

      setAppliedVoucher(data);
      setDiscountAmount(discount);
      if (!codeOverride) {
        showAlert('Berhasil', `Voucher "${data.code}" berhasil digunakan! Anda mendapatkan potongan Rp ${discount.toLocaleString('id-ID')}`);
      }
    } catch (error) {
      console.error('Check voucher error:', error);
      showAlert('Error', 'Gagal memproses voucher.');
    } finally {
      setLoading(false);
    }
  };

  const autoApplyBestVoucher = async () => {
    if (appliedVoucher) return;
    if (initialVoucherCode) return; // User explicitly chose a voucher, don't override

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
        if ((totalPrice + addonTotal) < v.min_order_amount) continue;
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
          if (deviceId) {
            const { data: deviceUsage } = await supabase
              .from('voucher_usages')
              .select('id')
              .eq('voucher_id', v.id)
              .eq('device_id', deviceId);
            if (deviceUsage && deviceUsage.length > 0) continue;
          }
        }

        // Validasi Repeat Order (Auto Apply)
        if (v.category === 'repeat_order') {
          const orderCount = profile?.total_orders || 0;
          if (orderCount < (v.min_order_count || 0)) continue;
        }

        // Validasi Pembayaran via Saldo (Auto Apply)
        if (v.category === 'wallet_payment' && paymentMethod !== 'saldo') continue;

        // Calculate Discount
        let discount = 0;
        if (v.type === 'percentage') {
          discount = ((totalPrice + addonTotal) * v.value) / 100;
          if (v.max_discount && discount > v.max_discount) {
            discount = v.max_discount;
          }
        } else {
          discount = v.value;
        }

        // Check User Usage Limit for Auto-Apply
        const { data: usageData, error: usageError } = await supabase
          .from('voucher_usages')
          .select('id')
          .eq('voucher_id', v.id)
          .eq('user_id', profile?.id);

        const userUsageCount = usageData?.length || 0;
        const limitPerUser = Number(v.user_limit) || 1;

        if (userUsageCount >= limitPerUser) {
          continue;
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
    } else if (totalPrice > 0 && !appliedVoucher && !initialVoucherCode) {
      autoApplyBestVoucher();
    }
  }, [initialVoucherCode, totalPrice, profile]);

  // Recalculate discount if total price changes
  React.useEffect(() => {
    if (appliedVoucher) {
      // Re-validate min order first
      if ((totalPrice + addonTotal) < appliedVoucher.min_order_amount) {
        setAppliedVoucher(null);
        setDiscountAmount(0);
        setVoucherCode('');
        showAlert('Voucher Terlepas', 'Minimal order tidak tercapai untuk voucher ini.');
        return;
      }

      let discount = 0;
      if (appliedVoucher.type === 'percentage') {
        discount = ((totalPrice + addonTotal) * appliedVoucher.value) / 100;
        if (appliedVoucher.max_discount && discount > appliedVoucher.max_discount) {
          discount = appliedVoucher.max_discount;
        }
      } else {
        discount = appliedVoucher.value;
      }
      setDiscountAmount(discount);
    }
  }, [totalPrice, addonTotal]);

  // Re-evaluate wallet_payment voucher when payment method changes
  React.useEffect(() => {
    if (totalPrice <= 0) return;
    if (appliedVoucher?.category === 'wallet_payment' && paymentMethod !== 'saldo') {
      setAppliedVoucher(null);
      setDiscountAmount(0);
      setVoucherCode('');
      showAlert('Voucher Terlepas', 'Voucher wallet payment hanya berlaku saat bayar pakai saldo.');
    } else if (paymentMethod === 'saldo' && !appliedVoucher && !initialVoucherCode) {
      autoApplyBestVoucher();
    }
  }, [paymentMethod]);

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

  type PaymentItem = {
    id: string; label: string; icon: any;
    image?: any; disabled?: boolean; comingSoon?: string;
  };

  const PAYMENT_GROUPS: { id: string; title: string; items: PaymentItem[] }[] = [
    {
      id: 'internal',
      title: 'Metode Pembayaran',
      items: [
        { id: 'tunai', label: 'Tunai', icon: Banknote },
        { id: 'saldo', label: 'Saldo Dompet', icon: Wallet },
      ]
    },
  ];

  const allMethods = PAYMENT_GROUPS.flatMap(g => g.items);
  const currentMethod = allMethods.find(m => m.id === paymentMethod) || allMethods[0];


  const handleOrder = async () => {
    if (!address) {
      showAlert('Alamat Kosong', 'Silakan tentukan lokasi pengiriman terlebih dahulu.');
      return;
    }

    if (bookingType === 'schedule') {
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 menit ke depan
      
      if (selectedDate < now) {
        showAlert(
          'Waktu Tidak Valid',
          'Waktu reservasi terjadwal tidak boleh di masa lalu. Silakan pilih waktu yang akan datang.'
        );
        return;
      }
      
      if (selectedDate < minBookingTime) {
        showAlert(
          'Waktu Terlalu Dekat',
          'Untuk pesanan terjadwal, waktu reservasi minimal harus 30 menit dari sekarang agar terapis memiliki waktu persiapan dan perjalanan.'
        );
        return;
      }
    }

    if (paymentMethod === 'saldo' && (profile?.wallet_balance || 0) < finalPrice) {
      showAlert('Saldo Kurang', 'Saldo Anda tidak mencukupi untuk melakukan pemesanan ini.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Order
      const earnedCashback = isCashback ? discountAmount : 0;
      const usedCashback = (paymentMethod === 'saldo' && useCashback) ? (cashbackToDeduct || 0) : 0;

      const orderData = {
        user_id: profile?.id,
        service_id: initialService.id,
        duration: selectedDuration.value,
        status: 'pending',
        service_price: selectedDuration.price,
        service_fee: serviceFee,
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
        order_number: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        used_cashback: usedCashback,
        earned_cashback: earnedCashback,
        additional_services: additionalServices.filter(a => selectedAddons.includes(a.id))
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // 1.5. Record Voucher Usage
      if (appliedVoucher && profile?.id) {
        console.log('[DEBUG Voucher] Recording usage for:', appliedVoucher.code, 'User:', profile.id);
        const { error: vUseErr } = await supabase.from('voucher_usages').insert({
          user_id: profile.id,
          voucher_id: appliedVoucher.id,
          order_id: order.id,
          device_id: deviceId || null
        });

        if (vUseErr) {
          console.error('[DEBUG Voucher] CRITICAL: Failed to record usage in voucher_usages:', vUseErr.message, vUseErr.details);
        }

        const { error: vUpdateErr } = await supabase
          .from('vouchers')
          .update({ usage_count: (Number(appliedVoucher.usage_count) || 0) + 1 })
          .eq('id', appliedVoucher.id);

        if (vUpdateErr) {
          console.error('[DEBUG Voucher] Failed to increment usage_count in vouchers:', vUpdateErr.message);
        }
      }

      // 2. Handle Balance & Cashback Credit
      
      if (paymentMethod === 'saldo') {
        const newWalletBalance = (profile?.wallet_balance || 0) - finalPrice;
        const newCashbackBalance = (profile?.cashback_balance || 0) - usedCashback + earnedCashback;

        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            wallet_balance: newWalletBalance,
            cashback_balance: newCashbackBalance
          })
          .eq('id', profile?.id);

        if (updateError) throw updateError;
      } else if (earnedCashback > 0) {
        // Jika bukan saldo tapi dapat cashback voucher
        await supabase
          .from('users')
          .update({ 
            cashback_balance: (profile?.cashback_balance || 0) + earnedCashback 
          })
          .eq('id', profile?.id);
      }

      // 3. Handle Navigation Based on Method & Therapist Selection
      if (paymentMethod === 'saldo') {
        const newWalletBalance = (profile?.wallet_balance || 0) - finalPrice;

        await supabase.from('transactions').insert([{
          user_id: profile?.id,
          order_id: order.id,
          amount: -finalPrice,
          balance_before: profile?.wallet_balance || 0,
          balance_after: newWalletBalance,
          type: 'payment',
          description: `Pembayaran ${initialService.name}`,
        }]);

        // Jika pemesanan terjadwal, langsung ke detail/tracking. Jika instan, cek terapis favorit.
        if (bookingType === 'schedule') {
          router.replace({ pathname: '/tracking', params: { id: order.id } });
        } else if (therapistId) {
          router.replace({ pathname: '/tracking', params: { id: order.id } });
        } else {
          router.replace({ pathname: '/searching-therapist', params: { id: order.id } });
        }
      } else if (paymentMethod === 'tunai') {
        // Jika pemesanan terjadwal, langsung ke detail/tracking. Jika instan, cek terapis favorit.
        if (bookingType === 'schedule') {
          router.replace({ pathname: '/tracking', params: { id: order.id } });
        } else if (therapistId) {
          router.replace({ pathname: '/tracking', params: { id: order.id } });
        } else {
          router.replace({ pathname: '/searching-therapist', params: { id: order.id } });
        }
      } else {
        // XENDIT INVOICE API CALL
        const response = await fetch(`${API_URL}/api/payments/create`, {
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
            pathname: '/payment-details',
            params: { data: JSON.stringify(result.data), order_id: order.id }
          });
        }, 100);
      }

    } catch (error: any) {
      console.error('Order error:', error);
      showAlert('Gagal Memesan', error.message || 'Terjadi kesalahan saat memproses pesanan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Pesanan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 1. Layanan + Catatan + Layanan Tambahan */}
        <View style={styles.section}>
          <View style={styles.combinedCard}>
            <View style={styles.combinedRow}>
              <Image source={{ uri: initialService.image }} style={styles.serviceImage} />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{initialService.name}</Text>
                <Text style={styles.servicePrice}>Rp {initialService.price.toLocaleString('id-ID')} / {initialService.price_type === 'treatment' ? 'Sesi' : 'Jam'}</Text>
                <Text style={[styles.serviceDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                  {initialService.description}
                </Text>
              </View>
            </View>

            {/* Accordion Layanan Tambahan */}
            <View style={styles.combinedDivider} />

            {/* Selected Addons Preview */}
            {selectedAddons.length > 0 && (
              <View style={{ paddingTop: 12, paddingHorizontal: 16, gap: 10, marginBottom: 13 }}>
                {additionalServices.filter(a => selectedAddons.includes(a.id)).map((addon, idx) => (
                  <View key={addon.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: `${PURPLE}10`, alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={16} color={PURPLE} strokeWidth={3} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{addon.name}</Text>
                      </View>
                      <Text style={styles.servicePrice}>+Rp {addon.price.toLocaleString('id-ID')}</Text>
                    </View>
                    {idx < selectedAddons.length - 1 && <View style={{ height: 1, backgroundColor: BORDER, marginTop: 10 }} />}
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setShowAdditional(!showAdditional)}
              activeOpacity={0.7}
            >
              <View style={styles.accordionHeaderLeft}>
                <Plus size={16} color={PURPLE} />
                <Text style={styles.accordionTitle}>Layanan Tambahan</Text>
                {selectedAddons.length > 0 && (
                  <View style={styles.addonBadge}>
                    <Text style={styles.addonBadgeText}>{selectedAddons.length}</Text>
                  </View>
                )}
              </View>
              {showAdditional ? (
                <ChevronUp size={18} color={TEXT_MUTED} />
              ) : (
                <ChevronDown size={18} color={TEXT_MUTED} />
              )}
            </TouchableOpacity>
            {showAdditional && (
              <View style={styles.accordionBody}>
                {additionalServices.length === 0 ? (
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, textAlign: 'center', paddingVertical: 8 }}>
                    Tidak ada layanan tambahan tersedia
                  </Text>
                ) : (
                  additionalServices.map((addon) => {
                    const isSelected = selectedAddons.includes(addon.id);
                    return (
                      <TouchableOpacity
                        key={addon.id}
                        style={[styles.addonItem, isSelected && styles.addonItemActive]}
                        onPress={() => toggleAddon(addon.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.addonCheckbox, isSelected && styles.addonCheckboxActive]}>
                          {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                        </View>
                        <View style={styles.addonInfo}>
                          <Text style={styles.addonName}>{addon.name}</Text>
                          <Text style={[styles.addonDesc, { color: PURPLE, fontSize: 10, fontFamily: 'PlusJakartaSans-Bold' }]}>
                            {addon.price_type === 'treatment' ? '1 Treatment' : `${addon.duration} Menit`}
                          </Text>
                          <Text style={styles.addonDesc} numberOfLines={1}>{addon.desc}</Text>
                        </View>
                        <Text style={[styles.addonPrice, isSelected && { color: PURPLE }]}>
                          +Rp {addon.price.toLocaleString('id-ID')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* Catatan Layanan */}
            <View style={styles.combinedDivider} />
            <View style={styles.combinedNoteRow}>
              <MessageSquare size={16} color={TEXT_MUTED} />
              <TextInput
                style={styles.combinedNoteInput}
                value={serviceNotes}
                onChangeText={setServiceNotes}
                placeholder="Catatan layanan (Bawa perlengkapan, dll)"
                multiline={true}
              />
            </View>
          </View>
        </View>

        {/* 2. Lokasi + Catatan Lokasi */}
        <View style={styles.section}>
          <View style={styles.combinedCard}>
            <View style={styles.combinedLabelRow}>
              <Text style={styles.sectionLabel}>Lokasi Layanan</Text>
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: '/maps',
                  params: { serviceId: serviceId, from: 'order', sourceFrom: from as string }
                })}
                style={styles.mapsLinkBtn}
              >
                <Map size={14} color="#FFFFFF" />
                <Text style={styles.mapsLinkText}>Maps</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.combinedNoteRow}>
              <MapPin size={16} color={PURPLE} />
              <TextInput
                style={styles.combinedNoteInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Masukkan alamat lengkap..."
                multiline={true}
              />
            </View>
            <View style={styles.combinedDivider} />
            <View style={styles.combinedLabelRow}>
              <Text style={styles.inputLabel}>Catatan Lokasi</Text>
            </View>
            <View style={styles.combinedNoteRow}>
              <Info size={16} color={TEXT_MUTED} />
              <TextInput
                style={styles.combinedNoteInput}
                value={locationNotes}
                onChangeText={setLocationNotes}
                placeholder="Patokan/Blok/Gang (Contoh: Rumah pagar hitam)"
                multiline={true}
              />
            </View>
          </View>
        </View>

        {/* 3. Durasi + Waktu Booking */}
        <View style={styles.section}>
          <View style={styles.combinedCard}>
            <Text style={styles.sectionLabel}>
              {initialService.price_type === 'treatment' ? 'Paket Treatment' : 'Durasi Layanan'}
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
            <View style={styles.combinedDivider} />
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
        </View>

        {/* 4. Jenis Kelamin + Preferensi Terapis */}
        <View style={styles.section}>
          <View style={styles.combinedCard}>
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
            <View style={styles.combinedDivider} />
            <View style={styles.combinedLabelRow}>
              <Text style={styles.sectionLabel}>Preferensi Terapis</Text>
              <TouchableOpacity><Info size={16} color={TEXT_MUTED} /></TouchableOpacity>
            </View>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderBtn, therapistGender === 'any' && styles.genderBtnActive, !!therapistId && therapistGender !== 'any' && { opacity: 0.3 }]}
                onPress={() => setTherapistGender('any')}
                disabled={!!therapistId}
              >
                <Text style={[styles.genderBtnText, therapistGender === 'any' && styles.genderBtnTextActive]}>Mana Saja</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, therapistGender === 'male' && styles.genderBtnActive, !!therapistId && therapistGender !== 'male' && { opacity: 0.3 }]}
                onPress={() => setTherapistGender('male')}
                disabled={!!therapistId}
              >
                <User size={16} color={therapistGender === 'male' ? PURPLE : TEXT_MUTED} style={{ marginRight: 4 }} />
                <Text style={[styles.genderBtnText, therapistGender === 'male' && styles.genderBtnTextActive]}>Pria</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, therapistGender === 'female' && styles.genderBtnActive, !!therapistId && therapistGender !== 'female' && { opacity: 0.3 }]}
                onPress={() => setTherapistGender('female')}
                disabled={!!therapistId}
              >
                <User size={16} color={therapistGender === 'female' ? PURPLE : TEXT_MUTED} style={{ marginRight: 4 }} />
                <Text style={[styles.genderBtnText, therapistGender === 'female' && styles.genderBtnTextActive]}>Wanita</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 5. Voucher + Metode Pembayaran */}
        <View style={styles.section}>
          <View style={styles.combinedCard}>
            <Text style={styles.sectionLabel}>Voucher Promo</Text>
            <TouchableOpacity
              style={[styles.voucherSelector, appliedVoucher && styles.voucherSelectorActive]}
              onPress={() => router.push({
                pathname: '/vouchers',
                params: {
                  from: 'order',
                  sourceFrom: from as string,
                  serviceId: serviceId as string,
                  therapistId: therapistId as string,
                  totalPrice: totalPrice.toString(),
                  paymentMethod: paymentMethod,
                  appliedVoucherCode: appliedVoucher?.code || ''
                }
              })}
            >
              <View style={styles.voucherLeft}>
                <Tag size={20} color={appliedVoucher ? '#FFFFFF' : PURPLE} />
                <View style={styles.voucherInfo}>
                  {appliedVoucher ? (
                    <>
                      <Text style={styles.voucherAppliedTitle}>{appliedVoucher.code}</Text>
                      <Text style={styles.voucherAppliedSub}>
                        Berhasil digunakan ({isCashback ? 'Cashback' : 'Potongan'} Rp {discountAmount.toLocaleString('id-ID')})
                      </Text>
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
            <View style={styles.combinedDivider} />
            <Text style={styles.sectionLabel}>Metode Pembayaran</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownHeader, showPaymentDropdown && styles.dropdownHeaderActive]}
                onPress={() => setShowPaymentDropdown(!showPaymentDropdown)}
                activeOpacity={0.7}
              >
                <View style={styles.paymentInfo}>
                  <View style={[styles.paymentIcon, showPaymentDropdown && { backgroundColor: '#EADEFF' }]}>
                    {currentMethod.image ? (
                      <Image source={currentMethod.image} style={[styles.paymentLogo, { width: 24, height: 24 }]} />
                    ) : (
                      currentMethod.icon && <currentMethod.icon size={20} color={showPaymentDropdown ? PURPLE : TEXT_MUTED} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.dropdownHeaderText}>{currentMethod.label}</Text>
                    {currentMethod.id === 'saldo' && (
                      <Text style={[styles.balanceSub, { fontSize: 10, marginTop: 1 }]}>
                        Saldo: Rp {(profile?.wallet_balance || 0).toLocaleString('id-ID')}
                      </Text>
                    )}
                  </View>
                </View>
                <ChevronDown size={18} color={TEXT_MUTED} />
              </TouchableOpacity>

              {showPaymentDropdown && (
                <View style={styles.dropdownList}>
                  {PAYMENT_GROUPS.map((group) => (
                    <View key={group.id}>
                      {group.items.map((method) => {
                        const isSaldo = method.id === 'saldo';
                        const isInsufficient = isSaldo && (profile?.wallet_balance || 0) < finalPrice;
                        const isSelected = paymentMethod === method.id;

                        return (
                          <TouchableOpacity
                            key={method.id}
                            style={[styles.dropdownItem, isSelected && !method.disabled && styles.dropdownItemActive, method.disabled && { opacity: 0.5 }]}
                            onPress={() => {
                              if (method.disabled) {
                                showAlert('Belum Tersedia', method.comingSoon || 'Metode pembayaran ini belum tersedia.');
                                return;
                              }
                              if (isInsufficient) {
                                showAlert('Saldo Kurang', 'Saldo Anda tidak mencukupi. Silakan top up atau pilih metode lain.');
                                return;
                              }
                              setPaymentMethod(method.id as any);
                              setShowPaymentDropdown(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.paymentInfo}>
                              <View style={[styles.paymentIcon, isSelected && !method.disabled && { backgroundColor: '#EADEFF' }]}>
                                {method.image ? (
                                  <Image source={method.image} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
                                ) : (
                                  method.icon && <method.icon size={18} color={isSelected ? PURPLE : TEXT_MUTED} />
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={[styles.paymentText, isSelected && !method.disabled && styles.paymentTextActive]}>
                                    {method.label}
                                  </Text>
                                  <View style={{ flex: 1 }} />
                                  {method.comingSoon && (
                                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                      <Text style={{ fontSize: 9, color: '#D97706', fontWeight: '500' }}>{method.comingSoon}</Text>
                                    </View>
                                  )}
                                </View>
                                {isSaldo && (
                                  <Text style={[styles.balanceSub, { fontSize: 10, color: isInsufficient ? '#EF4444' : '#10B981' }]}>
                                    Saldo: Rp {(profile?.wallet_balance || 0).toLocaleString('id-ID')}
                                    {isInsufficient && ' (Kurang)'}
                                  </Text>
                                )}
                              </View>
                            </View>
                            {isSelected && !method.disabled && <View style={styles.selectedDot} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}

                  {/* Cashback Option inside Saldo */}
                  {paymentMethod === 'saldo' && userCashbackBalance > 0 && (
                    <View style={[styles.dropdownItem, useCashback && styles.dropdownItemActive, { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4 }]}>
                      <View style={styles.paymentInfo}>
                        <Ionicons name="gift-outline" size={18} color={useCashback ? PURPLE : TEXT_MUTED} />
                        <View>
                          <Text style={[styles.paymentText, useCashback && styles.paymentTextActive]}>Gunakan Cashback</Text>
                          <Text style={[styles.balanceSub, { fontSize: 10 }]}>
                            Rp {userCashbackBalance.toLocaleString('id-ID')} tersedia (max Rp {maxCashbackCanUse.toLocaleString('id-ID')})
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={useCashback}
                        onValueChange={setUseCashback}
                        trackColor={{ false: '#CBD5E1', true: '#C084FC' }}
                        thumbColor={useCashback ? PURPLE : '#F4F4F5'}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                    </View>
                  )}
                  {useCashback && (
                    <View style={[styles.dropdownItem, { backgroundColor: '#F0FDF4', paddingVertical: 8 }]}>
                      <Text style={{ fontSize: 11, color: '#16A34A', fontFamily: 'PlusJakartaSans-Bold' }}>
                        Hemat Rp {cashbackToDeduct.toLocaleString('id-ID')} dari Cashback
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 6. Rincian Harga */}
        <View style={styles.section}>
          <View style={styles.combinedCard}>
            <Text style={styles.sectionLabel}>Rincian Harga</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Harga Layanan</Text>
              <Text style={styles.breakdownValue}>Rp {totalPrice.toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Biaya Layanan</Text>
              <Text style={styles.breakdownValue}>Rp {serviceFee.toLocaleString('id-ID')}</Text>
            </View>

            {addonTotal > 0 && additionalServices.filter(a => selectedAddons.includes(a.id)).map((addon) => (
              <View key={addon.id} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>+ {addon.name}</Text>
                <Text style={styles.breakdownValue}>Rp {addon.price.toLocaleString('id-ID')}</Text>
              </View>
            ))}

            {discountAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: '#10B981' }]}>{isCashback ? 'Potensi Cashback' : 'Diskon Voucher'}</Text>
                <Text style={[styles.breakdownValue, { color: '#10B981' }]}>-Rp {discountAmount.toLocaleString('id-ID')}</Text>
              </View>
            )}

            {cashbackToDeduct > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: PURPLE }]}>Potongan Cashback (70%)</Text>
                <Text style={[styles.breakdownValue, { color: PURPLE }]}>-Rp {cashbackToDeduct.toLocaleString('id-ID')}</Text>
              </View>
            )}

            <View style={[styles.divider, { marginVertical: 10, backgroundColor: '#F1F5F9' }]} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Pembayaran</Text>
              <View style={{ alignItems: 'flex-end' }}>
                {(discountAmount > 0 && !isCashback) || cashbackToDeduct > 0 ? (
                  <View>
                    <Text style={[styles.totalPrice, { color: '#94A3B8', textDecorationLine: 'line-through', fontSize: 12 }]}>
                      Rp {(subtotal + (serviceFee || 0)).toLocaleString('id-ID')}
                    </Text>
                    <Text style={[styles.totalPrice, { fontSize: 14 }]}>Rp {finalPrice.toLocaleString('id-ID')}</Text>
                  </View>
                ) : (
                  <Text style={[styles.totalPrice, { fontSize: 14 }]}>Rp {finalPrice.toLocaleString('id-ID')}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Footer / Summary */}
      <View style={styles.footer}>
        <View style={styles.priceSummary}>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total Pembayaran</Text>
              <Text style={styles.totalPrice}>Rp {finalPrice.toLocaleString('id-ID')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.orderButton, loading && { opacity: 0.8 }]}
              onPress={handleOrder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.orderButtonText}>Pesan Sekarang</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
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
    paddingTop: 10,
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
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
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
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
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    marginLeft: 12,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#240080',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  combinedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  combinedDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
  combinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  combinedNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  combinedNoteInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK,
    minHeight: 36,
  },
  combinedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mapsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PURPLE,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  mapsLinkText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: PURPLE,
  },
  addonBadge: {
    backgroundColor: PURPLE,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  accordionBody: {
    marginTop: 10,
    gap: 8,
  },
  addonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  addonItemActive: {
    backgroundColor: '#F3E8FF',
    borderColor: PURPLE,
  },
  addonCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonCheckboxActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK,
  },
  addonDesc: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  addonPrice: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_MUTED,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
    marginBottom: 10,
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
    marginBottom: 3,
  },
  servicePrice: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: PURPLE,
  },
  serviceDescription: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 3,
    lineHeight: 15,
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK,
    paddingVertical: 17,
  },
  inputGroup: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_MUTED,
    marginBottom: 6,
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED,
  },
  durationOptionLabelActive: {
    color: PURPLE,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  durationOptionPrice: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
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
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
  },
  genderBtnTextActive: {
    color: PURPLE,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK,
  },
  paymentTextActive: {
    fontFamily: 'PlusJakartaSans-Bold',
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
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  priceSummary: {
    width: '100%',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  breakdownValue: {
    fontSize: 12,
    color: TEXT_DARK,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
  },
  totalPrice: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: PURPLE,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  cashbackCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  cashbackCardActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  cashbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashbackTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  cashbackSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  appliedBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  appliedBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  discountLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#10B981',
    marginTop: 2,
  },
  orderButton: {
    backgroundColor: PURPLE,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 15,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  voucherPlaceholderSub: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  voucherAppliedTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  voucherAppliedSub: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
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
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentLogo: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  paymentItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8F9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceSub: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
});
