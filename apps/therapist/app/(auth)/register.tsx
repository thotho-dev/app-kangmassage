import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image, Dimensions, Modal
} from 'react-native';
import { useThemeColors } from '@/store/themeStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';
import { WEB_API_URL } from '../../lib/config';
import { CustomAlertTrigger } from '@/store/alertStore';
import { getAppSettings } from '@/lib/appSettings';
import { useTherapistStore } from '@/store/therapistStore';

const API_BASE = WEB_API_URL;

const genderDisplay = (g: string) =>
  g === 'male' ? 'LAKI-LAKI' : g === 'female' ? 'PEREMPUAN' : '';

interface FormData {
  nik: string;
  full_name: string;
  address: string;
  rt_rw: string;
  kelurahan: string;
  district: string;
  city: string;
  province: string;
  gender: string;
  birth_place: string;
  birth_date: string;
  marital_status: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  experience_years: string;
  specializations: string[];
  bio: string;
  ktp_photo_url: string;
  selfie_photo_url: string;
  certificate_url: string;
}

export default function RegisterScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ continue?: string }>();
  const continueMode = searchParams.continue === '1';

  const STEPS_FULL = ['Data Akun', 'KTP', 'Keahlian', 'Sertifikat', 'Selfie', 'Review'];

  const [step, setStep] = useState(continueMode ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);
  const [showTnc, setShowTnc] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selfieMode, setSelfieMode] = useState(false);
  const [ktpMode, setKtpMode] = useState(false);
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<CameraView>(null);

const [form, setForm] = useState<FormData>({
  nik: '', full_name: '', address: '',
  rt_rw: '', kelurahan: '', district: '',
  city: '', province: '',
  gender: '', birth_place: '', birth_date: '', marital_status: '',
  email: '', phone: '', password: '', confirmPassword: '',
  experience_years: '0',
  specializations: [], bio: '',
  ktp_photo_url: '', selfie_photo_url: '', certificate_url: '',
});

  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const getDeviceId = async () => {
    try {
      if (Platform.OS === 'android') return Application.getAndroidId();
      if (Platform.OS === 'ios') return await Application.getIosIdForVendorAsync();
      return Device.osBuildId;
    } catch { return 'unknown_device'; }
  };

  const [permission, requestPermission] = useCameraPermissions();

  const [cameraReady, setCameraReady] = useState(false);
  const [platformName, setPlatformName] = useState('Pijat On-Demand');
  const [revisionNote, setRevisionNote] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  const REVISION_FIELD_MAP: Record<string, string[]> = {
    'KTP (NIK & Foto)': ['nik', 'full_name', 'ktp_photo_url', 'address', 'rt_rw', 'kelurahan', 'district', 'city', 'province'],
    'Data KTP': ['gender', 'birth_place', 'birth_date', 'marital_status'],
    'Foto Selfie': ['selfie_photo_url'],
    'Pengalaman': ['experience_years'],
    'Keahlian': ['specializations'],
    'Sertifikat': ['certificate_url'],
    'Alamat': ['address', 'rt_rw', 'kelurahan', 'district', 'city', 'province'],
    'Bio': ['bio'],
  };

  const needsRevision = (field: string): boolean => {
    if (!revisionNote) return false;
    const labels = revisionNote.match(/\[([^\]]+)\]/)?.[1]?.split(', ') || [];
    return labels.some(label => REVISION_FIELD_MAP[label]?.includes(field));
  };

  const RevisionBadge = () => (
    <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: t.danger, marginLeft: 8 }}>Perlu diubah</Text>
  );

  useEffect(() => {
    getAppSettings().then(s => setPlatformName(s.platform_name));
  }, []);

  useEffect(() => {
    supabase.from('skills').select('id, name').then(({ data }) => {
      if (data) setSkills(data);
    });
  }, []);

  useEffect(() => {
    if (!continueMode) return;
    // Always fetch fresh data from supabase — never trust store (can be stale from prev session)
    setRevisionNote('');
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setDataLoaded(true);
          return;
        }
        const { data } = await supabase.from('therapists').select('*').eq('supabase_uid', user.id).single();
        if (data) {
          populateFromProfile(data);
          if (data.revision_note) setRevisionNote(data.revision_note);
        }
      } catch (err) {
        console.error('Failed to load therapist data:', err);
      }
      setDataLoaded(true);
    })();
  }, [continueMode]);

  const populateFromProfile = (data: any) => {
    updateForm('full_name', data.full_name || '');
    updateForm('phone', data.phone || '');
    updateForm('email', data.email || '');
    const raw = (data.gender || '').toLowerCase();
    const normGender = raw.includes('laki') ? 'male' : raw.includes('perempuan') ? 'female' : data.gender || '';
    updateForm('gender', normGender);
    updateForm('birth_place', data.birth_place || '');
    updateForm('birth_date', data.birth_date || '');
    updateForm('marital_status', data.marital_status || '');
    updateForm('experience_years', String(data.experience_years || 0));
    updateForm('nik', data.nik || '');
    updateForm('address', data.address || '');
    updateForm('rt_rw', data.rt_rw || '');
    updateForm('kelurahan', data.kelurahan || '');
    updateForm('district', data.district || '');
    updateForm('city', data.city || '');
    updateForm('province', data.province || '');
    updateForm('bio', data.bio || '');
    updateForm('specializations', data.specializations || []);
    updateForm('ktp_photo_url', data.ktp_photo_url || '');
    updateForm('selfie_photo_url', data.selfie_photo_url || '');
    updateForm('certificate_url', data.certificate_url || '');
    if (data.revision_note) setRevisionNote(data.revision_note);
  };

  const resetForm = () => {
    setForm({
      nik: '', full_name: '', address: '',
      rt_rw: '', kelurahan: '', district: '',
      city: '', province: '',
      gender: '', birth_place: '', birth_date: '', marital_status: '',
      email: '', phone: '', password: '', confirmPassword: '',
      experience_years: '0',
      specializations: [], bio: '',
      ktp_photo_url: '', selfie_photo_url: '', certificate_url: '',
    });
    setStep(continueMode ? 1 : 0);
  };

  const updateForm = (key: keyof FormData, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleSkill = (skillName: string) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(skillName)
        ? prev.specializations.filter(s => s !== skillName)
        : [...prev.specializations, skillName]
    }));
  };

  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Minimal 8 karakter');
    if (!/[A-Z]/.test(pwd)) errors.push('Huruf besar');
    if (!/[0-9]/.test(pwd)) errors.push('Angka');
    setPasswordErrors(errors);
    updateForm('password', pwd);
  };

  // ─── Image Compression ───────────────────────────
  const compressImage = async (uri: string, maxSizeKB = 500): Promise<string> => {
    let quality = 0.8;
    let compressedUri = uri;
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await ImageManipulator.manipulateAsync(
        compressedUri,
        [{ resize: { width: 1200 } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      const info = await FileSystem.getInfoAsync(result.uri);
      if (info.exists && info.size && info.size / 1024 <= maxSizeKB) {
        return result.uri;
      }
      quality -= 0.1;
      compressedUri = result.uri;
    }
    return compressedUri;
  };

  // ─── KTP Camera ─────────────────────────────────
  const captureKtp = async () => {
    if (!cameraRef.current || !cameraReady) {
      CustomAlertTrigger.show({ type: 'warning', title: 'Kamera Belum Siap', message: 'Tunggu sebentar, kamera sedang menyiapkan diri.' });
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.7 });
      if (!photo?.uri) throw new Error('Gagal mengambil foto, coba lagi');

      const compressedUri = await compressImage(photo.uri);

      // Tutup kamera SEGERA — tampilkan preview lokal & mulai OCR
      setKtpMode(false);
      updateForm('ktp_photo_url', compressedUri);
      setOcrLoading(true);

      // Jalankan OCR
      const ocrFormData = new FormData();
      ocrFormData.append('file', {
        uri: compressedUri,
        type: 'image/jpeg',
        name: 'ktp.jpg',
      } as any);
      const ocrRes = await fetch(`${API_BASE}/api/ocr/ktp`, {
        method: 'POST', body: ocrFormData,
      });
      const ocrText = await ocrRes.text();
      const ocrData = JSON.parse(ocrText);
      if (ocrRes.ok && ocrData) {
        if (ocrData.nik) updateForm('nik', ocrData.nik);
        if (ocrData.full_name) updateForm('full_name', ocrData.full_name);
        if (ocrData.address) updateForm('address', ocrData.address);
        if (ocrData.rt_rw) updateForm('rt_rw', ocrData.rt_rw);
        if (ocrData.kelurahan) updateForm('kelurahan', ocrData.kelurahan);
        if (ocrData.district) updateForm('district', ocrData.district);
        if (ocrData.city) updateForm('city', ocrData.city);
        if (ocrData.province) updateForm('province', ocrData.province);
        if (ocrData.gender) updateForm('gender', ocrData.gender);
        if (ocrData.birth_place) updateForm('birth_place', ocrData.birth_place);
        if (ocrData.birth_date) updateForm('birth_date', ocrData.birth_date);
        if (ocrData.marital_status) updateForm('marital_status', ocrData.marital_status);
      } else {
        throw new Error(ocrData?.error || 'OCR gagal, coba ambil foto ulang');
      }
    } catch (err: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Gagal Proses KTP', message: err.message || 'Terjadi kesalahan saat memproses foto KTP. Coba ambil foto ulang.' });
    } finally {
      setOcrLoading(false);
    }
  };


  // ─── Selfie Camera ───────────────────────────────
  const captureSelfie = async () => {
    if (!cameraRef.current || !cameraReady) {
      CustomAlertTrigger.show({ type: 'warning', title: 'Kamera Belum Siap', message: 'Tunggu sebentar, kamera sedang menyiapkan diri.' });
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.8 });
      if (!photo?.uri) throw new Error('Gagal mengambil foto, coba lagi');

      // Balik foto secara horizontal agar hasil sama dengan preview (kamera depan)
      const flipped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const compressedUri = await compressImage(flipped.uri);

      // Tutup kamera SEGERA setelah foto diambil, tampilkan preview lokal
      setSelfieMode(false);
      updateForm('selfie_photo_url', compressedUri);
      setLoading(true);

      // Simulasi delay agar UX tidak terasa hampa (tanpa upload)
      await new Promise(r => setTimeout(r, 300));
    } catch (err: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Gagal Ambil Selfie', message: err.message || 'Terjadi kesalahan saat mengambil foto selfie. Silakan coba lagi.' });
    } finally {
      setLoading(false);
    }
  };


  // ─── Certificate Upload ──────────────────────────
  const pickCertificate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      updateForm('certificate_url', file.uri);
    } catch (err: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Gagal Pilih Sertifikat', message: err.message || 'Terjadi kesalahan saat memilih sertifikat. Coba lagi.' });
    }
  };

  // ─── Upload helper ─────────────────────────────
  const uploadFile = async (uri: string, bucket: string, name: string): Promise<string> => {
    if (uri.startsWith('http')) return uri; // Sudah terupload, skip
    const formData = new FormData();
    formData.append('file', { uri, type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg', name } as any);
    formData.append('bucket', bucket);
    const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`Upload ${bucket} gagal: ${text.slice(0, 100)}`); }
    if (!res.ok) throw new Error(data.error);
    return data.url;
  };

  // ─── Init Register (Data Diri step) ────────────
  const handleInitRegister = async () => {
    setLoading(true);
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${API_BASE}/api/auth/register/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          email: form.email || undefined,
          full_name: form.full_name || 'Terapis',
          gender: form.gender,
          password: form.password,
          device_id: deviceId,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      if (result.data?.session?.access_token) {
        await supabase.auth.setSession({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
        });
      }

      router.replace(`/(auth)/register-otp?phone=${encodeURIComponent(result.phone)}&continue=1`);
    } catch (err: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Gagal Simpan Data', message: err.message || 'Terjadi kesalahan. Periksa kembali data Anda.' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit (post-OTP, final step) ──────────────
  const handleSubmit = async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');

      const commonBody = {
        nik: form.nik || undefined,
        full_name: form.full_name || undefined,
        experience_years: parseInt(form.experience_years) || 0,
        address: form.address || undefined,
        rt_rw: form.rt_rw || undefined,
        kelurahan: form.kelurahan || undefined,
        district: form.district || undefined,
        city: form.city || undefined,
        province: form.province || undefined,
        gender: form.gender || undefined,
        birth_place: form.birth_place || undefined,
        birth_date: form.birth_date || undefined,
        marital_status: form.marital_status || undefined,
        specializations: form.specializations,
        bio: form.bio || undefined,
        revision_note: null,
      };

      // Step 1: Validasi dulu tanpa upload foto
      const validateRes = await fetch(`${API_BASE}/api/auth/register/therapist/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...commonBody, validate_only: true }),
      });
      const validateResult = await validateRes.json();
      if (!validateRes.ok) throw new Error(validateResult.error);

      // Step 2: Upload foto hanya jika validasi lolos
      const [ktpUrl, selfieUrl, certUrl] = await Promise.all([
        form.ktp_photo_url ? uploadFile(form.ktp_photo_url, 'ktp-photos', 'ktp.jpg') : Promise.resolve(undefined),
        form.selfie_photo_url ? uploadFile(form.selfie_photo_url, 'selfie-photos', 'selfie.jpg') : Promise.resolve(undefined),
        form.certificate_url ? uploadFile(form.certificate_url, 'certificates', 'certificate.pdf') : Promise.resolve(undefined),
      ]);

      // Step 3: Submit final dengan foto
      const submitRes = await fetch(`${API_BASE}/api/auth/register/therapist/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...commonBody, ktp_photo_url: ktpUrl, selfie_photo_url: selfieUrl, certificate_url: certUrl }),
      });
      const submitResult = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitResult.error);

      resetForm();
      router.replace('/(tabs)');
    } catch (err: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Pendaftaran Gagal', message: err.message || 'Terjadi kesalahan saat mendaftar. Periksa kembali data Anda.' });
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const canProceed = () => {
    const current = STEPS_FULL[step];
    switch (current) {
      case 'Data Akun': return !!form.phone && !!form.password && passwordErrors.length === 0 && form.password === form.confirmPassword;
      case 'KTP': return !!(form.ktp_photo_url && form.nik && form.full_name && form.address && form.rt_rw && form.kelurahan && form.district && form.city && form.province && form.gender && form.birth_place && form.birth_date && form.marital_status);
      case 'Keahlian': return form.specializations.length > 0;
      case 'Sertifikat': return true;
      case 'Selfie': return !!form.selfie_photo_url;
      case 'Review': return true;
      default: return false;
    }
  };

  // ─── Camera Overlay ─────────────────────────────
  const SCREEN_W = Dimensions.get('window').width;
  const SCREEN_H = Dimensions.get('window').height;

  if (ktpMode || selfieMode) {
    // ── SELFIE MODE: full screen + body silhouette ──
    if (selfieMode) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="front"
            onCameraReady={() => setCameraReady(true)}
          />

          {!cameraReady && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={{ color: '#FFF', marginTop: 12, fontSize: 14, fontFamily: 'Inter_500Medium' }}>Menyiapkan kamera...</Text>
            </View>
          )}

          {/* Orientation Indicator */}
          <View style={{ position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 }}>
            <Ionicons name="arrow-up-outline" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>Posisikan Tegak</Text>
          </View>

          {/* Dark overlay layer */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} pointerEvents="none" />

          {/* Body Silhouette Guide */}
          <View style={styles.silhouetteContainer} pointerEvents="none">
            {/* Kepala */}
            <View style={styles.silhouetteHead} />
            {/* Leher */}
            <View style={styles.silhouetteNeck} />
            {/* Tubuh atas (bahu + dada) */}
            <View style={styles.silhouetteBody}>
              {/* Bahu kiri melengkung */}
              <View style={styles.silhouetteShoulderLeft} />
              {/* Bahu kanan melengkung */}
              <View style={styles.silhouetteShoulderRight} />
            </View>
            {/* Teks panduan */}
            <Text style={styles.silhouetteHint}>Posisikan tubuh sesuai bingkai</Text>
            <Text style={[styles.silhouetteHint, { fontSize: 11, marginTop: 4, opacity: 0.7 }]}>Pose: tangan membentuk love ❤️</Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.selfieCloseBtn}
            onPress={() => setSelfieMode(false)}
          >
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>

          {/* Shutter button */}
          <View style={styles.cameraBottomBar}>
            <TouchableOpacity style={styles.captureBtn} onPress={captureSelfie}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── KTP MODE: 1:1 square ──
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        {/* 1:1 Square Camera Preview */}
        <View style={{ width: SCREEN_W, height: SCREEN_W, overflow: 'hidden', position: 'relative' }}>
          <CameraView
            ref={cameraRef}
            style={{ width: SCREEN_W, height: SCREEN_W }}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />

          {!cameraReady && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={{ color: '#FFF', marginTop: 12, fontSize: 14, fontFamily: 'Inter_500Medium' }}>Menyiapkan kamera...</Text>
            </View>
          )}

          {/* Orientation Indicator */}
          <View style={{ position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 }}>
            <Ionicons name="arrow-forward-outline" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>Posisikan Mendatar</Text>
          </View>

          {/* KTP guide frame */}
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]}>
            <View style={styles.ktpFrame}>
              <Ionicons name="scan-outline" size={32} color="rgba(255,255,255,0.3)" />
              <Text style={styles.selfieFrameHint}>Letakkan KTP di dalam bingkai</Text>
            </View>
          </View>
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 12, fontStyle: 'italic', fontFamily: 'Inter_400Regular' }}>
          Pastikan seluruh KTP terlihat jelas
        </Text>

        <View style={[styles.cameraBottomBar, { position: 'relative', bottom: 'auto', marginTop: 32 }]}>
          <TouchableOpacity style={styles.captureBtn} onPress={captureKtp}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cameraCloseBtn}
            onPress={() => setKtpMode(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Main Form ──────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.canGoBack() ? router.back() : router.replace('/login')}>
              <Ionicons name="arrow-back" size={24} color={t.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Daftar Terapis</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Revision Info Banner */}
          {!!revisionNote && (
            <View style={{ marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: t.danger + '20', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: t.danger + '40', padding: SPACING.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Ionicons name="alert-circle" size={18} color={t.danger} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: t.danger, marginBottom: 4 }}>Admin meminta revisi</Text>
                  {(revisionNote.match(/\[([^\]]+)\]/)?.[1]?.split(', ') || []).length > 0 ? (
                    <>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                        {(revisionNote.match(/\[([^\]]+)\]/)?.[1]?.split(', ') || []).map((field: string) => (
                          <View key={field} style={{ backgroundColor: t.danger + '30', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: t.danger }}>{field}</Text>
                          </View>
                        ))}
                      </View>
                      {revisionNote.match(/— (.+)/)?.[1] && (
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: t.textSecondary, lineHeight: 16 }}>
                          {revisionNote.match(/— (.+)/)?.[1]}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_400Regular', color: t.textSecondary }}>
                      Silakan lengkapi data yang diminta untuk melanjutkan.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Loading state untuk continue mode */}
          {continueMode && !dataLoaded ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <ActivityIndicator size="large" color={t.secondary} />
              <Text style={{ marginTop: 12, fontSize: 13, color: t.textSecondary, fontFamily: 'Inter_500Medium' }}>Memuat data...</Text>
            </View>
          ) : (
          <>
          {/* Steps Indicator */}
          <View style={styles.stepsRow}>
            {STEPS_FULL.map((s, i) => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, (continueMode && i === 0) || i <= step ? styles.stepActive : null]}>
                  <Text style={[styles.stepDotText, (continueMode && i === 0) || i <= step ? styles.stepDotTextActive : null]}>
                    {(continueMode && i === 0) || i < step
                      ? <Ionicons name="checkmark" size={14} color="#FFF" />
                      : i + 1}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, (continueMode && i === 0) || i <= step ? styles.stepLabelActive : null]}>{s}</Text>
              </View>
            ))}
          </View>

          {/* ─── KTP STEP ─────────────────────────── */}
          {STEPS_FULL[step] === 'KTP' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Foto KTP</Text>
              <Text style={styles.cardSubtitle}>Ambil foto KTP untuk verifikasi data otomatis</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.fieldLabel}>Foto KTP</Text>
                {needsRevision('ktp_photo_url') && <RevisionBadge />}
              </View>
              {form.ktp_photo_url ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: form.ktp_photo_url }} style={[styles.previewImage, { aspectRatio: 1.586 }]} />
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setKtpMode(true)}>
                    <Text style={styles.retakeText}>Ambil Ulang</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={async () => {
                    if (!permission?.granted) await requestPermission();
                    setKtpMode(true);
                  }}
                >
                  <Ionicons name="camera" size={40} color={t.primary} />
                  <Text style={styles.cameraBtnText}>Ambil Foto KTP</Text>
                </TouchableOpacity>
              )}

              {ocrLoading && (
                <View style={styles.ocrLoading}>
                  <ActivityIndicator size="small" color={t.primary} />
                  <Text style={styles.ocrLoadingText}>Memproses OCR...</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>NIK</Text>
                {needsRevision('nik') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Terisi otomatis."
                placeholderTextColor={t.textMuted}
                value={form.nik}
                editable={false}
              />

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Nama Lengkap</Text>
                {needsRevision('full_name') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder=""
                placeholderTextColor={t.textMuted}
                value={form.full_name}
                editable={false}
              />

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Tempat / Tanggal Lahir</Text>
                {needsRevision('birth_place') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Terisi otomatis."
                placeholderTextColor={t.textMuted}
                value={form.birth_place && form.birth_date ? `${form.birth_place}, ${form.birth_date}` : form.birth_place || form.birth_date || ''}
                editable={false}
              />

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>Jenis Kelamin</Text>
                    {needsRevision('gender') && <RevisionBadge />}
                  </View>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    placeholder="Terisi otomatis."
                    placeholderTextColor={t.textMuted}
                    value={genderDisplay(form.gender)}
                    editable={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>Status Perkawinan</Text>
                    {needsRevision('marital_status') && <RevisionBadge />}
                  </View>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    placeholder="Terisi otomatis."
                    placeholderTextColor={t.textMuted}
                    value={(form.marital_status || '').toUpperCase()}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Alamat (Jalan / Dusun)</Text>
                {needsRevision('address') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Terisi otomatis."
                placeholderTextColor={t.textMuted}
                value={form.address}
                editable={false}
              />

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>RT / RW</Text>
                    {needsRevision('rt_rw') && <RevisionBadge />}
                  </View>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    placeholder="Terisi otomatis."
                    placeholderTextColor={t.textMuted}
                    value={form.rt_rw}
                    editable={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.fieldLabel}>Kelurahan</Text>
                    {needsRevision('kelurahan') && <RevisionBadge />}
                  </View>
                  <TextInput
                    style={[styles.input, styles.inputDisabled]}
                    placeholder="Terisi otomatis."
                    placeholderTextColor={t.textMuted}
                    value={form.kelurahan}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Kecamatan</Text>
                {needsRevision('district') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Terisi otomatis."
                placeholderTextColor={t.textMuted}
                value={form.district}
                editable={false}
              />

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Kota / Kabupaten</Text>
                {needsRevision('city') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Terisi otomatis."
                placeholderTextColor={t.textMuted}
                value={form.city}
                editable={false}
              />

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Provinsi</Text>
                {needsRevision('province') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                placeholder="Terisi otomatis."
                placeholderTextColor={t.textMuted}
                value={form.province}
                editable={false}
              />
            </View>
          )}

          {/* ─── DATA AKUN STEP ─────────────────────── */}
          {STEPS_FULL[step] === 'Data Akun' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Data Akun</Text>

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="contoh@email.com"
                placeholderTextColor={t.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={v => updateForm('email', v)}
              />

              <Text style={styles.fieldLabel}>Nomor HP</Text>
              <TextInput
                style={styles.input}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor={t.textMuted}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={v => updateForm('phone', v)}
              />

              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min 8 karakter, huruf besar & angka"
                  placeholderTextColor={t.textMuted}
                  secureTextEntry={!showPassword}
                  value={form.password}
                  onChangeText={validatePassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={t.textMuted} />
                </TouchableOpacity>
              </View>
              {passwordErrors.length > 0 && (
                <View style={styles.passwordErrors}>
                  {passwordErrors.map(e => (
                    <Text key={e} style={styles.passwordErrorText}>• {e}</Text>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Konfirmasi Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Ulangi password"
                placeholderTextColor={t.textMuted}
                secureTextEntry={!showPassword}
                value={form.confirmPassword}
                onChangeText={v => updateForm('confirmPassword', v)}
              />
              {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                <Text style={styles.passwordErrorText}>Password tidak cocok</Text>
              )}
            </View>
          )}

          {/* ─── KEAHLIAN STEP ──────────────────────── */}
          {STEPS_FULL[step] === 'Keahlian' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>Keahlian / Skills</Text>
                {needsRevision('specializations') && <RevisionBadge />}
              </View>
              <Text style={styles.cardSubtitle}>Pilih layanan yang kamu kuasai</Text>
              <View style={styles.skillsGrid}>
                {skills.map(skill => (
                  <TouchableOpacity
                    key={skill.id}
                    style={[styles.skillChip, form.specializations.includes(skill.name) && styles.skillChipActive]}
                    onPress={() => toggleSkill(skill.name)}
                  >
                    <Text style={[styles.skillChipText, form.specializations.includes(skill.name) && styles.skillChipTextActive]}>
                      {skill.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg }}>
                <Text style={styles.fieldLabel}>Pengalaman Terapis (Tahun)</Text>
                {needsRevision('experience_years') && <RevisionBadge />}
              </View>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={t.textMuted}
                keyboardType="number-pad"
                value={form.experience_years}
                onChangeText={v => updateForm('experience_years', v)}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg }}>
                <Text style={styles.fieldLabel}>Biodata</Text>
                {needsRevision('bio') && <RevisionBadge />}
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ceritakan tentang dirimu..."
                placeholderTextColor={t.textMuted}
                value={form.bio}
                onChangeText={v => updateForm('bio', v)}
                multiline
              />
            </View>
          )}

          {/* ─── SERTIFIKAT STEP ────────────────────── */}
          {STEPS_FULL[step] === 'Sertifikat' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>Sertifikat Keahlian</Text>
                {needsRevision('certificate_url') && <RevisionBadge />}
              </View>
              <Text style={styles.cardSubtitle}>Opsional — upload sertifikat dalam format PDF</Text>

              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={pickCertificate}
                disabled={loading}
              >
                <Ionicons name="document-text" size={40} color={t.primary} />
                <Text style={styles.cameraBtnText}>
                  {form.certificate_url ? 'Ganti Sertifikat' : 'Upload Sertifikat (PDF)'}
                </Text>
              </TouchableOpacity>

              {form.certificate_url && (
                <View style={styles.fileInfo}>
                  <Ionicons name="checkmark-circle" size={20} color={t.success} />
                  <Text style={styles.fileInfoText}>Sertifikat terupload</Text>
                  <TouchableOpacity onPress={() => updateForm('certificate_url', '')}>
                    <Ionicons name="close-circle" size={20} color={t.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ─── SELFIE STEP ────────────────────────── */}
          {STEPS_FULL[step] === 'Selfie' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>Foto Selfie</Text>
                {needsRevision('selfie_photo_url') && <RevisionBadge />}
              </View>
              <Text style={styles.cardSubtitle}>Ambil foto selfie dengan pose tangan membentuk love</Text>

              {form.selfie_photo_url ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: form.selfie_photo_url }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setSelfieMode(true)}>
                    <Text style={styles.retakeText}>Ambil Ulang</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={async () => {
                    if (!permission?.granted) await requestPermission();
                    setSelfieMode(true);
                  }}
                >
                  <Ionicons name="camera" size={40} color={t.primary} />
                  <Text style={styles.cameraBtnText}>Ambil Foto Selfie</Text>
                  <Text style={styles.selfieHintText}>Pose: tangan membentuk love</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ─── REVIEW STEP ────────────────────────── */}
          {STEPS_FULL[step] === 'Review' && (
            <View style={{ gap: 12, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg }}>
              <Text style={styles.cardTitle}>Periksa Data Anda</Text>
              <Text style={[styles.cardSubtitle, { marginBottom: 4 }]}>
                Pastikan semua data sudah benar sebelum mendaftar.
              </Text>

              {/* Foto KTP & Selfie */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Foto</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <Text style={styles.reviewLabel}>KTP</Text>
                    {form.ktp_photo_url ? (
                      <Image source={{ uri: form.ktp_photo_url }} style={[styles.reviewPhoto, { aspectRatio: 1.586 }]} />
                    ) : (
                      <View style={[styles.reviewPhoto, { aspectRatio: 1.586, backgroundColor: t.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="image-outline" size={28} color={t.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <Text style={styles.reviewLabel}>Selfie</Text>
                    {form.selfie_photo_url ? (
                      <Image source={{ uri: form.selfie_photo_url }} style={styles.reviewPhoto} />
                    ) : (
                      <View style={[styles.reviewPhoto, { backgroundColor: t.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person-outline" size={28} color={t.textMuted} />
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Data Identitas */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Identitas</Text>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>NIK</Text><Text style={styles.reviewValue}>{form.nik || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Nama Lengkap</Text><Text style={styles.reviewValue}>{form.full_name || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Jenis Kelamin</Text><Text style={styles.reviewValue}>{genderDisplay(form.gender) || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Tgl Lahir</Text><Text style={styles.reviewValue}>{form.birth_place && form.birth_date ? `${form.birth_place}, ${form.birth_date}` : form.birth_place || form.birth_date || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Status</Text><Text style={styles.reviewValue}>{form.marital_status || '-'}</Text></View>
              </View>

              {/* Alamat */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Alamat</Text>
                {form.address ? <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Jalan/Dusun</Text><Text style={styles.reviewValue}>{form.address}</Text></View> : null}
                {form.rt_rw ? <View style={styles.reviewRow}><Text style={styles.reviewLabel}>RT/RW</Text><Text style={styles.reviewValue}>{form.rt_rw}</Text></View> : null}
                {form.kelurahan ? <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Kelurahan</Text><Text style={styles.reviewValue}>{form.kelurahan}</Text></View> : null}
                {form.district ? <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Kecamatan</Text><Text style={styles.reviewValue}>{form.district}</Text></View> : null}
                {form.city ? <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Kota/Kab.</Text><Text style={styles.reviewValue}>{form.city}</Text></View> : null}
                {form.province ? <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Provinsi</Text><Text style={styles.reviewValue}>{form.province}</Text></View> : null}
                {!form.address && !form.rt_rw && <Text style={styles.reviewEmpty}>Alamat tidak diisi</Text>}
              </View>

              {/* Kontak & Akun */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Kontak & Akun</Text>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Email</Text><Text style={styles.reviewValue}>{form.email || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>No. HP</Text><Text style={styles.reviewValue}>{form.phone || '-'}</Text></View>
                <View style={styles.reviewRow}><Text style={styles.reviewLabel}>Pengalaman</Text><Text style={styles.reviewValue}>{form.experience_years || '0'} tahun</Text></View>
              </View>

              {/* Keahlian */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Keahlian</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {skills.filter(s => form.specializations.includes(s.name)).map(s => (
                    <View key={s.id} style={styles.reviewChip}>
                      <Text style={styles.reviewChipText}>{s.name}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Sertifikat */}
              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Sertifikat</Text>
                <View style={styles.reviewRow}>
                  <Ionicons
                    name={form.certificate_url ? 'checkmark-circle' : 'remove-circle-outline'}
                    size={18}
                    color={form.certificate_url ? t.success : t.textMuted}
                  />
                  <Text style={[styles.reviewValue, { color: form.certificate_url ? t.success : t.textMuted }]}>
                    {form.certificate_url ? 'Sertifikat terupload' : 'Tidak upload sertifikat'}
                  </Text>
                </View>
              </View>

              {/* Bio */}
              {!!form.bio && (
                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Bio</Text>
                  <Text style={[styles.reviewValue, { lineHeight: 20 }]}>{form.bio}</Text>
                </View>
              )}

              {/* Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                <Ionicons name="information-circle-outline" size={16} color={t.textMuted} />
                <Text style={{ fontSize: 11, color: t.textMuted, flex: 1, lineHeight: 16 }}>
                  Tekan tombol kembali untuk mengedit data sebelum mendaftar.
                </Text>
              </View>
            </View>
          )}

          {/* ─── Navigation ──────────────────────────── */}
          <View style={styles.navRow}>
            {step < STEPS_FULL.length - 1 ? (
              <TouchableOpacity
                style={[styles.navBtn, !canProceed() && styles.navBtnDisabled]}
                onPress={async () => {
                  if (!canProceed()) return;
                  // Jika Data Akun step (step 0 dan bukan continueMode), call init API
                  if (!continueMode && step === 0) {
                    await handleInitRegister();
                    return;
                  }
                  setStep(step + 1);
                }}
                disabled={!canProceed()}
              >
                <LinearGradient
                  colors={canProceed() ? [t.secondary, '#EA580C'] : ['#E2E8F0', '#E2E8F0']}
                  style={styles.navBtnGrad}
                >
                  <Text style={[styles.navBtnText, { color: canProceed() ? '#FFF' : t.textMuted }]}>
                    {step === STEPS_FULL.length - 2 ? 'Lihat Review' : 'Lanjut'}
                  </Text>
                  <Ionicons name={step === STEPS_FULL.length - 2 ? 'eye-outline' : 'arrow-forward'} size={18} color={canProceed() ? '#FFF' : t.textMuted} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navBtn, (!canProceed() || loading) && styles.navBtnDisabled]}
                onPress={() => revisionNote ? handleSubmit() : setShowTnc(true)}
                disabled={!canProceed() || loading}
              >
                <LinearGradient
                  colors={canProceed() ? [t.primary, '#3730A3'] : ['#E2E8F0', '#E2E8F0']}
                  style={styles.navBtnGrad}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={canProceed() ? '#FFF' : t.textMuted} />
                      <Text style={[styles.navBtnText, { color: canProceed() ? '#FFF' : t.textMuted }]}>
                        {revisionNote ? 'Kirim Perubahan' : 'Daftar Sekarang'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ─── T&C Modal ───────────────────────────── */}
      <Modal visible={showTnc} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Syarat & Ketentuan</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                1. Kemitraan: Dengan mendaftar, Anda setuju untuk menjadi mitra terapis independen di platform {platformName}.{"\n\n"}
                2. Bagi Hasil: Komisi platform bersifat dinamis berdasarkan tier mitra — Bronze 27%, Silver 25%, Gold 23%, Platinum 21%, Diamond 20%. Semakin tinggi tier, semakin kecil potongan komisi. Reward pencapaian target tier akan otomatis ditambahkan ke saldo wallet.{"\n\n"}
                3. Standar Layanan: Anda wajib memberikan layanan terbaik sesuai SOP, menjaga etika, dan tidak melanggar norma kesusilaan. Pelanggaran berat atau rating di bawah standar dapat mengakibatkan penangguhan akun.{"\n\n"}
                4. Pembayaran: Pendapatan akan masuk ke dompet digital (wallet) di dalam aplikasi dan dapat ditarik ke rekening bank yang terdaftar.{"\n\n"}
                5. Privasi: Anda dilarang membagikan data pribadi pelanggan ke pihak ketiga.{"\n\n"}
                6. Larangan Tindakan Melanggar Hukum: Mitra terapis dilarang keras melakukan tindak pidana, kejahatan, penipuan, pengancaman, kekerasan fisik, pelecehan seksual, tindakan asusila, atau perbuatan melanggar hukum lainnya terhadap pelanggan. Pelanggaran akan mengakibatkan pemutusan kemitraan secara permanen, penghapusan akun, dan pelaporan kepada pihak berwajib.
              </Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowTnc(false)}>
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnAgree} onPress={() => {
                setShowTnc(false);
                handleSubmit();
              }}>
                <Text style={styles.modalBtnAgreeText}>Setuju & Lanjut</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  scroll: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: t.text },
  stepsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg,
  },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: t.border, alignItems: 'center', justifyContent: 'center',
  },
  stepActive: { backgroundColor: t.primary },
  stepDotText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: t.textMuted },
  stepDotTextActive: { color: '#FFF' },
  stepLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold', color: t.textMuted, textAlign: 'center' },
  stepLabelActive: { color: t.primary },
  card: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    backgroundColor: t.surface, borderRadius: RADIUS.xl,
    padding: SPACING.xl, borderWidth: 1, borderColor: t.border,
  },
  cardTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: t.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', color: t.textSecondary, marginBottom: SPACING.lg, lineHeight: 18 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: t.textSecondary, marginBottom: 6, marginTop: SPACING.md },
  input: {
    backgroundColor: t.background, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1.5, borderColor: t.border, color: t.text, fontSize: 14, fontFamily: 'Inter_400Regular'
  },
  inputDisabled: {
    backgroundColor: t.surface,
    color: t.textSecondary,
    borderColor: 'transparent',
    opacity: 0.8,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  cameraBtn: {
    borderWidth: 2, borderColor: t.border, borderStyle: 'dashed',
    borderRadius: RADIUS.xl, paddingVertical: 40, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  cameraBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: t.primary },
  previewContainer: { alignItems: 'center', gap: 12 },
  previewImage: { width: '100%', aspectRatio: 1, borderRadius: RADIUS.lg, resizeMode: 'cover' },
  retakeBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: t.primary + '15' },
  retakeText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: t.primary },
  ocrLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  ocrLoadingText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: t.textSecondary },
  divider: { height: 1, backgroundColor: t.border, marginVertical: SPACING.sm, opacity: 0.5 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passwordErrors: { marginTop: 6, gap: 2 },
  passwordErrorText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: t.danger },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: t.border, backgroundColor: t.background,
  },
  genderBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  genderText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: t.textSecondary },
  genderTextActive: { color: '#FFF' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: t.border, backgroundColor: t.background,
  },
  skillChipActive: { backgroundColor: t.primary, borderColor: t.primary },
  skillChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: t.textSecondary },
  skillChipTextActive: { color: '#FFF' },
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.md },
  fileInfoText: { fontSize: 13, color: t.success, fontFamily: 'Inter_600SemiBold', flex: 1 },
  selfieHintText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: t.textMuted, fontStyle: 'italic' },
  navRow: { paddingHorizontal: SPACING.lg, marginBottom: 40 },
  navBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  navBtnDisabled: { opacity: 0.5 },
  navBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  navBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  // Camera — KTP frame
  selfieFrameHint: { color: '#FFF', fontSize: 12, fontFamily: 'Inter_600SemiBold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  ktpFrame: {
    width: '100%', aspectRatio: 1.586, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
    maxWidth: 420,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cameraBottomBar: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30,
  },
  captureBtn: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 5, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFF' },
  cameraCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Selfie body silhouette
  selfieCloseBtn: {
    position: 'absolute', top: 52, left: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  silhouetteContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Kepala — oval
  silhouetteHead: {
    width: 120,
    height: 148,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 0,
  },
  // Leher
  silhouetteNeck: {
    width: 40,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    marginTop: -2,
  },
  // Tubuh atas — bahu & dada
  silhouetteBody: {
    width: 240,
    height: 130,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: -2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  silhouetteShoulderLeft: {
    position: 'absolute',
    left: -1,
    top: -10,
    width: 80,
    height: 60,
    borderBottomRightRadius: 50,
    borderRightWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  silhouetteShoulderRight: {
    position: 'absolute',
    right: -1,
    top: -10,
    width: 80,
    height: 60,
    borderBottomLeftRadius: 50,
    borderLeftWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  silhouetteHint: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 6,
    textAlign: 'center',
  },
  // Review step styles
  reviewSection: {
    backgroundColor: t.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: t.border,
    gap: 10,
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: t.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 2,
  },
  reviewLabel: {
    fontSize: 13,
    color: t.textMuted,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  reviewValue: {
    fontSize: 13,
    color: t.text,
    fontFamily: 'Inter_600SemiBold',
    flex: 2,
    textAlign: 'right',
  },
  reviewPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    resizeMode: 'cover',
  },
  reviewChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: t.primary + '15',
    borderWidth: 1,
    borderColor: t.primary + '30',
  },
  reviewChipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: t.primary,
  },
  reviewEmpty: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: t.textMuted,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: t.surface, borderRadius: RADIUS.xl,
    padding: SPACING.xl, width: '100%', maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: t.text, marginBottom: SPACING.md },
  modalScroll: { marginBottom: SPACING.lg },
  modalText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: t.textSecondary, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center'
  },
  modalBtnCancelText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: t.textMuted },
  modalBtnAgree: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.md,
    backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center'
  },
  modalBtnAgreeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
});
