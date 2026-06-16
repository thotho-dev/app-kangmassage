import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, Modal, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, Building2, Trash2, AlertCircle, CheckCircle2, Shield, Info } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';
import PinModal from '@/components/PinModal';

const PURPLE = '#240080';
const PURPLE_DARK = '#12004D';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const ERROR = '#E74C3C';
const SUCCESS = '#00A896';
const BG = '#F8F8FB';
const BORDER = '#F0F0F0';

interface BankAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
  is_active: boolean;
}

const BANK_LIST = [
  { id: 'dana', name: 'DANA Wallet', code: 'DANA' },
  { id: 'bca', name: 'BCA', code: '014' },
  { id: 'bni', name: 'BNI', code: '009' },
  { id: 'bri', name: 'BRI', code: '002' },
  { id: 'mandiri', name: 'Mandiri', code: '008' },
  { id: 'cimb', name: 'CIMB Niaga', code: '022' },
  { id: 'permata', name: 'Permata', code: '013' },
  { id: 'bsi', name: 'BSI', code: '451' },
  { id: 'danamon', name: 'Danamon', code: '011' },
];

const MAX_ACCOUNTS = 3;

export default function BankAccountsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { showAlert } = useAlert();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [selectedBank, setSelectedBank] = useState('bca');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  // PIN Modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_bank_accounts')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) fetchAccounts();
  }, [profile?.id]);

  const openAddModal = () => {
    if (accounts.length >= MAX_ACCOUNTS) {
      showAlert('Batas Maksimal', `Anda hanya dapat mendaftarkan maksimal ${MAX_ACCOUNTS} rekening. Hapus salah satu untuk menambah rekening baru.`);
      return;
    }
    setAccountNumber('');
    setSelectedBank('bca');
    setAddModalVisible(true);
  };

  const handleSaveWithPin = () => {
    if (!selectedBank || !accountNumber || !profile?.full_name) return;
    setPinError('');
    setPinModalVisible(true);
  };

  const handlePinVerified = async (pin: string) => {
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch(`${API_URL}/api/pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile?.id, pin }),
      });
      const data = await res.json();
      if (data.error) {
        setPinError(data.error);
        setPinLoading(false);
        return;
      }
      setPinModalVisible(false);
      setPinLoading(false);

      // PIN valid — validate with Xendit
      const bank = BANK_LIST.find(b => b.id === selectedBank);
      setValidating(true);
      let isVerified = false;
      try {
        const valRes = await fetch(`${API_URL}/api/bank-accounts/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bank_code: bank?.code || selectedBank, account_number: accountNumber }),
        });
        const valData = await valRes.json();
        if (valRes.ok && valData.success) {
          isVerified = true;
        }
      } catch {
        // Validation API not available — save without verification
      }
      setValidating(false);

      setSaving(true);
      const { error } = await supabase
        .from('saved_bank_accounts')
        .insert([{
          user_id: profile?.id,
          bank_code: bank?.code || '',
          bank_name: bank?.name || selectedBank,
          account_number: accountNumber,
          account_name: profile?.full_name,
          is_verified: isVerified,
        }]);
      if (error) throw error;
      setAddModalVisible(false);
      setAccountNumber('');
      showAlert('Berhasil', isVerified ? 'Rekening berhasil ditambahkan dan terverifikasi' : 'Rekening berhasil ditambahkan');
      fetchAccounts();
    } catch (err: any) {
      showAlert('Gagal', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('saved_bank_accounts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', profile?.id);
      if (error) throw error;
      showAlert('Berhasil', 'Rekening berhasil dihapus');
      fetchAccounts();
    } catch (err: any) {
      showAlert('Gagal', err.message);
    } finally {
      setDeleting(null);
    }
  };

  const maskAccount = (num: string) => {
    if (num.length <= 4) return num;
    return '••••' + num.slice(-4);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rekening Tujuan</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Plus size={24} color={PURPLE} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.infoText}>
          Penarikan saldo hanya dapat dilakukan ke rekening yang sudah terdaftar di bawah ini.
        </Text>

        {loading ? (
          <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} size="large" />
        ) : accounts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Building2 size={48} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Belum Ada Rekening</Text>
            <Text style={styles.emptyDesc}>
              Tambahkan rekening bank atau dompet digital tujuan penarikan saldo Anda.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={openAddModal}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddText}>Tambah Rekening</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.accountList}>
            {accounts.map(acc => (
              <View key={acc.id} style={styles.accountCard}>
                <View style={styles.accountHeader}>
                  <View style={styles.bankIconBox}>
                    <Building2 size={20} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.bankName}>{acc.bank_name}</Text>
                    <Text style={styles.accountNumber}>{maskAccount(acc.account_number)}</Text>
                    <Text style={styles.accountName}>{acc.account_name}</Text>
                  </View>
                  <View style={styles.accountActions}>
                    {acc.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle2 size={12} color={SUCCESS} />
                        <Text style={styles.verifiedText}>Terverifikasi</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(acc.id)}
                      disabled={deleting === acc.id}
                    >
                      {deleting === acc.id ? (
                        <ActivityIndicator size="small" color={ERROR} />
                      ) : (
                        <Trash2 size={18} color={ERROR} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Bank Account Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAddModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Rekening</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalClose}>Batal</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Pilih Bank</Text>
            <View style={styles.bankGrid}>
              {BANK_LIST.map(bank => (
                <TouchableOpacity
                  key={bank.id}
                  style={[styles.bankChip, selectedBank === bank.id && styles.bankChipActive]}
                  onPress={() => setSelectedBank(bank.id)}
                >
                  <Text style={[styles.bankChipText, selectedBank === bank.id && styles.bankChipTextActive]}>
                    {bank.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>
              {selectedBank === 'dana' ? 'Nomor HP DANA' : 'Nomor Rekening'}
            </Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={selectedBank === 'dana' ? '08xxxxxxxxxx' : 'Masukkan nomor rekening'}
              placeholderTextColor={TEXT_MUTED}
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={setAccountNumber}
            />

            <Text style={styles.sectionLabel}>
              {selectedBank === 'dana' ? 'Nama Akun DANA' : 'Nama Pemilik Rekening'}
            </Text>
            <View style={[styles.fieldInput, styles.fieldReadOnly]}>
              <Text style={styles.fieldReadOnlyText}>{profile?.full_name || '-'}</Text>
            </View>
            <Text style={styles.fieldNote}>
              Nama rekening akan menggunakan nama akun Anda. Hubungi admin jika perlu perubahan.
            </Text>

            <View style={styles.pinInfoBox}>
              <Shield size={16} color={PURPLE} />
              <Text style={styles.pinInfoText}>
                Konfirmasi PIN transaksi diperlukan untuk menambahkan rekening baru.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (!accountNumber || saving || validating) && styles.saveBtnDisabled]}
              onPress={handleSaveWithPin}
              disabled={!accountNumber || saving || validating}
              activeOpacity={0.85}
            >
              {validating ? (
                <Text style={styles.saveBtnText}>Memvalidasi...</Text>
              ) : saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Rekening</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PIN Modal */}
      <PinModal
        visible={pinModalVisible}
        loading={pinLoading}
        error={pinError}
        title="Konfirmasi PIN"
        subtitle="Masukkan PIN transaksi untuk menambahkan rekening baru"
        onVerify={handlePinVerified}
        onClose={() => {
          setPinModalVisible(false);
          setPinError('');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  infoText: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, marginTop: 16, marginBottom: 16,
    lineHeight: 18,
  },

  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: {
    fontSize: 16, fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK, marginTop: 16, marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, textAlign: 'center', lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PURPLE, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 28,
  },
  emptyAddText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },

  accountList: { gap: 12 },
  accountCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  accountHeader: { flexDirection: 'row', alignItems: 'center' },
  bankIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: `${PURPLE}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  bankName: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  accountNumber: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, marginTop: 2,
  },
  accountName: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK, marginTop: 1,
  },
  accountActions: { alignItems: 'flex-end', gap: 8 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${SUCCESS}15`,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  verifiedText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold', color: SUCCESS },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { flex: 1 },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  modalClose: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: PURPLE },

  sectionLabel: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED, marginBottom: 8, marginTop: 16,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bankChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, backgroundColor: '#F5F5F7',
    borderWidth: 1, borderColor: BORDER,
  },
  bankChipActive: { borderColor: PURPLE, backgroundColor: `${PURPLE}10` },
  bankChipText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_MUTED },
  bankChipTextActive: { color: PURPLE },

  fieldInput: {
    backgroundColor: '#F5F5F7', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK, borderWidth: 1, borderColor: BORDER,
  },
  fieldReadOnly: {
    backgroundColor: `${PURPLE}06`,
    borderColor: `${PURPLE}20`,
    borderStyle: 'dashed',
  },
  fieldReadOnlyText: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK,
  },
  fieldNote: {
    fontSize: 11, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, marginTop: 6, lineHeight: 16,
  },
  pinInfoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: `${PURPLE}08`, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 20,
    borderWidth: 1, borderColor: `${PURPLE}15`,
  },
  pinInfoText: {
    flex: 1, fontSize: 12, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 28, alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { backgroundColor: '#E2E8F0' },
  saveBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
});
