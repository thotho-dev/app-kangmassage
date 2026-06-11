import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Image, Modal, Dimensions, ScrollView, Animated } from 'react-native';
import { useThemeColors } from '@/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTherapistStore } from '@/store/therapistStore';
import { useChatStore, ChatSession } from '@/store/chatStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppSettings, DEFAULT_SETTINGS } from '@/lib/appSettings';
import type { AppSettings } from '@/lib/appSettings';
import { PUTER_API_URL } from '@/lib/config';
import { getPuterConfig } from '@/lib/puter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;

interface TherapistInfo {
  full_name?: string;
  phone?: string;
  email?: string;
  tier?: string;
  wallet_balance?: number;
  specializations?: string[];
  total_orders?: number;
  rating?: number;
  status?: string;
  address?: string;
  bio?: string;
  commission_percentage?: number;
  total_earnings?: number;
  bank_account_number?: string;
  bank_name?: string;
  total_balance?: number;
  tier_upgrade_progress?: number;
}

const buildSystemPrompt = (therapist?: TherapistInfo, settings?: AppSettings) => {
  const s = settings || DEFAULT_SETTINGS;

  const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  const detailLines = therapist ? [
    `  - Nama: ${therapist.full_name || '(belum diatur)'}`,
    `  - Telepon: ${therapist.phone || '(belum diatur)'}`,
    `  - Email: ${therapist.email || '(belum diatur)'}`,
    `  - Tier: ${therapist.tier || 'Bronze'}`,
    `  - Saldo: ${rupiah(therapist.wallet_balance || 0)}`,
    `  - Total Pesanan: ${therapist.total_orders || 0}`,
    `  - Rating: ${(therapist.rating || 5.0).toFixed(1)}`,
    `  - Status: ${(therapist.status ? 'Online' : 'Offline')}`,
    `  - Alamat: ${therapist.address || '(belum diatur)'}`,
    `  - Bio: ${therapist.bio || '(belum diatur)'}`,
    `  - Komisi: ${therapist.commission_percentage || '(belum diatur)'}`,
    `  - Total Penghasilan: ${therapist.total_earnings || '(belum diatur)'}`,
    `  - Rekening Bank: ${therapist.bank_account_number || '(belum diatur)'}`,
    `  - Nama Bank: ${therapist.bank_name || '(belum diatur)'}`,
    `  - Total Saldo: ${therapist.total_balance || '(belum diatur)'}`,
    `  - Tier Upgrade Progress: ${therapist.tier_upgrade_progress || '(belum diatur)'}`,
    `  - Keahlian: ${(therapist.specializations && therapist.specializations.length > 0) ? therapist.specializations.join(', ') : '(belum diatur)'}`,
  ] : [];

  return `Kamu adalah asisten support untuk aplikasi Pijat On-Demand (${s.platform_name}).
Tugasmu membantu para terapis yang bertanya tentang platform ini.

Panduan menjawab:
- Jawab dengan bahasa Indonesia yang ramah dan santun
- Berikan informasi yang akurat dan singkat
- Gunakan data akun terapis di bawah ini untuk memberikan jawaban yang personal
- Jika masalah memerlukan campur tangan admin (contoh: masalah pembayaran, sengketa pesanan, akun diblokir), arahkan untuk menghubungi admin melalui WhatsApp ${s.support_whatsapp ? `(${s.support_whatsapp}) ` : ''}atau email ${s.support_email}

DATA AKUN TERAPIS:
${detailLines.length > 0 ? detailLines.join('\n') : '  - (tidak tersedia)'}

FITUR APLIKASI YANG BISA DIGUNAKAN TERAPIS:
1. **Online/Offline Toggle** — kontrol ketersediaan untuk menerima order dari dashboard
2. **Terima/Tolak Order** — order masuk via broadcast, terapis pertama yang terima menang (waktu respon 5 menit)
3. **Status Pesanan** — geser untuk maju: Diterima → Menuju Lokasi → Tiba → Proses → Selesai
4. **Live GPS** — lokasi real-time terlihat oleh pelanggan; peta dengan rute ke pelanggan
5. **Telepon & Chat Pelanggan** — hubungi pelanggan saat pesanan aktif
6. **Dashboard Penghasilan** — lihat penghasilan hari/minggu/bulan, total pesanan, komisi
7. **Top Up Saldo** — isi saldo via QRIS, DANA, OVO, ShopeePay, LinkAja, Virtual Account (BCA/Mandiri/BNI/BRI/Permata/BSI/CIMB), Alfamart/Indomaret (min ${rupiah(s.topup_min_amount)}, max ${rupiah(s.topup_max_amount)}, admin fee ${rupiah(s.topup_admin_fee)})
8. **Withdraw ke Bank** — tarik penghasilan min ${rupiah(s.withdraw_min_amount)} (fee ${rupiah(s.withdraw_admin_fee)}), proses 1x24 jam
9. **Sistem Tier** — Bronze ${s.bronze_platform_cut}% → Silver ${s.silver_platform_cut}% → Gold ${s.gold_platform_cut}% → Platinum ${s.platinum_platform_cut}% → Diamond ${s.diamond_platform_cut}% (komisi makin kecil)
10. **Riwayat Transaksi** — lihat pemasukan, penarikan, dan top up
11. **Ulasan Pelanggan** — lihat rating dan review dari pelanggan
12. **Manajemen Profil** — edit nama, telepon, password, alamat, spesialisasi, bio, rekening bank
13. **Notifikasi** — notifikasi real-time untuk order baru, top up sukses, pesan support
14. **Privacy Shield** — alamat pelanggan disembunyikan setelah pesanan selesai/dibatalkan
15. **Lokasi & Alamat** — atur alamat dengan pemilih provinsi/kota/kecamatan
16. **Tier Upgrade Progress** — lihat progres peningkatan tier kamu
17. **Tier Upgrade Required** — lihat berapa pesanan lagi untuk mencapai tier berikutnya
18. **sistem matching** - radius ${s.matching_radius_km}km, jenis kelamin, rating diatas ${s.min_rating} star, saldo minimal ${rupiah(s.min_wallet_balance)}, akun terverifikasi, kemampuan sesuai layanan, online, tidak sedang dalam pesanan
19. **Aturan order masuk** — saat ada pesanan baru, sistem broadcast ke semua terapis eligible yang online. Terapis pertama yang accept via tombol "Terima" menang (atomic update). Terapis yang kalah dapat notifikasi "Pesanan sudah diambil terapis lain". Waktu respon 40 detik, jika lewat order dibatalkan otomatis. Order dari pelanggan favorite/targeted tetap masuk meski rating terapis di bawah minimum
19. **pembayaran** — metode pembayaran pelanggan: Tunai (langsung ke terapis), QRIS (scan dinamis), Virtual Account (BCA/Mandiri/BNI/BRI/Permata/BSI/CIMB), E-Wallet (DANA/OVO/ShopeePay/LinkAja), Saldo dompet
20. **pemesanan** — 30 menit, 1 jam, 1.5 jam, 2 jam
21. **QRIS Mitra** — terapis bisa terima pembayaran QRIS dari pelanggan di halaman detail pesanan (tombol "Tampilkan QRIS Pembayaran") saat status Sedang Berlangsung. QRIS dibuat dinamis dengan nominal sesuai total tagihan. Setelah pelanggan bayar via scan QR, saldo otomatis masuk ke dompet terapis saat pesanan diselesaikan
22. **Pembayaran Tunai vs Non-Tunai** — jika pelanggan bayar tunai, komisi aplikasi dipotong dari dompet terapis. Jika pelanggan bayar non-tunai (QRIS/saldo/VA/e-wallet), pendapatan layanan dikreditkan ke dompet terapis lalu komisi dipotong. Hasil akhir: terapis dapat servicePrice dikurangi komisi dan admin fee
23. **Order Favorite** — pelanggan bisa menandai terapis sebagai favorite. Jika pelanggan favorite memesan, terapis tetap mendapat notifikasi order meskipun rating sedang di bawah minimum. Order dari pelanggan favorite tidak difilter oleh rating
24. **Voucher Pelanggan** — pelanggan bisa menggunakan voucher diskon atau cashback saat checkout. Jika ada diskon, selisih harga layanan dikompensasi ke dompet terapis saat pesanan selesai. Jika voucher cashback, pelanggan dapat cashback dan tidak mempengaruhi pendapatan terapis
25. **Notifikasi Order & Pengaturan Perangkat** — notifikasi pesanan baru otomatis tampil saat aplikasi di background. Wajib aktifkan izin: POST_NOTIFICATIONS (Android 13+), USE_FULL_SCREEN_INTENT (tampilan penuh di layar kunci), REQUEST_IGNORE_BATTERY_OPTIMIZATIONS (agar tidak diblokir). Untuk HP Xiaomi/HyperOS/Realme/Oppo/Vivo, tambahan: Auto-start aktifkan, Optimasi Baterai → Tidak Dioptimasi, dan izin Pop-up

KETENTUAN PENTING:
- Minimal saldo untuk mendapat order: ${rupiah(s.min_wallet_balance)}
- Waktu respon order: 40 detik, jika lewat order dibatalkan
- Withdraw: min ${rupiah(s.withdraw_min_amount)}, diproses 1x24 jam ke rekening
- Top up: min ${rupiah(s.topup_min_amount)}, max ${rupiah(s.topup_max_amount)}
- Komisi tergantung tier (lihat di atas)
- Order yang dibatalkan oleh sistem tidak mengurangi rating
- jika bertanya yang ke dua kali dan seterusnya tidak perlu menyapa lagi dan langsung jawab pertanyaan dari terapis
- Jika terapis bertanya cara menaikkan tier, arahkan untuk melihat informasi lengkap di halaman Info Tier pada aplikasi (buka menu Profil -> klik badge tier atau kunjungi halaman tier-info)

PANDUAN NOTIFIKASI ORDER (jika terapis bertanya kenapa notifikasi tidak muncul atau popup tidak tampil):
- Pastikan izin POST_NOTIFICATIONS sudah diaktifkan (Muncul otomatis saat pertama buka app, atau atur manual: Settings → Apps → Kang Massage Mitra → Notifications → On)
- Untuk popup notifikasi di layar kunci (full screen), pastikan izin "Tampilan Penuh" / "Full Screen Intent" sudah diaktifkan: Settings → Apps → Kang Massage Mitra → Notifications → Advanced → Full-screen notifications → Allow
- Agar notifikasi tidak terblokir saat HP tidur, nonaktifkan optimasi baterai: Settings → Apps → Kang Massage Mitra → Battery → "No restrictions" atau "Tidak Dioptimasi"
- Untuk HP Xiaomi/Redmi/HyperOS: Settings → Apps → Manage Apps → Kang Massage Mitra → Auto-start → ON. Juga Settings → Notification & Control Center → Notification Shade → Manage notifications → Kang Massage Mitra → Allow full-screen intent
- Jika popup order hanya muncul sekali lalu tidak muncul lagi meski ada di tray: cek kembali izin USE_FULL_SCREEN_INTENT di Settings (seringkali dicabut otomatis oleh sistem Android setelah beberapa kali)
- Pastikan aplikasi tidak dalam mode "Sleep" atau "Deep Clear" di pengaturan baterai HP. Tambahkan ke "Protected Apps" jika ada opsi tersebut

JANGAN pernah memberikan informasi palsu. Jika tidak tahu jawabannya, akui saja dan sarankan untuk menghubungi admin melalui WhatsApp ${s.support_whatsapp ? `(${s.support_whatsapp}) ` : ''}atau email ${s.support_email}.`;
};

interface Message {
  id: string;
  sender_type: 'therapist' | 'ai';
  message: string;
  created_at?: string;
}

export default function SupportChatScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const therapist = useTherapistStore(s => s.profile);
  const flatListRef = useRef<FlatList>(null);
  const sidebarAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  const sessions = useChatStore(s => s.sessions);
  const activeSessionId = useChatStore(s => s.activeSessionId);
  const sidebarVisible = useChatStore(s => s.sidebarVisible);
  const loaded = useChatStore(s => s.loaded);
  const createSession = useChatStore(s => s.createSession);
  const addMessage = useChatStore(s => s.addMessage);
  const setMessages = useChatStore(s => s.setMessages);
  const setActiveSession = useChatStore(s => s.setActiveSession);
  const setSidebarVisible = useChatStore(s => s.setSidebarVisible);
  const deleteSession = useChatStore(s => s.deleteSession);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const [modalVisible, setModalVisible] = useState(false);
  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // ─── Load dynamic settings ───────────────────────────────
  useEffect(() => {
    getAppSettings().then(setSettings);
  }, []);

  // ─── Sidebar animation ─────────────────────────────
  useEffect(() => {
    if (sidebarVisible) {
      setModalVisible(true);
      sidebarAnim.setValue(SIDEBAR_WIDTH);
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setModalVisible(false));
    }
  }, [sidebarVisible]);

  // ─── Create new session on mount ─────────────────────────
  const sessionCreated = useRef(false);
  useEffect(() => {
    if (!loaded || sessionCreated.current) return;
    sessionCreated.current = true;
    // Hapus session kosong dari kunjungan sebelumnya
    sessions.filter(s => s.messages.length <= 1).forEach(s => deleteSession(s.id));
    const sessionId = createSession();
    addMessage(sessionId, {
      id: 'ai-welcome',
      sender_type: 'ai',
      message: 'Halo! Ada yang bisa saya bantu?\n\nTanyakan seputar:\n• Withdraw & Top Up saldo\n• Komisi & Tier\n• Status pesanan\n• Notifikasi order tidak muncul\n• Cara menggunakan aplikasi',
    });
  }, [loaded]);

  const sendToAi = async (text: string) => {
    if (!activeSessionId) return;
    setInput('');
    setSending(true);
    const userMsg: Message = { id: `user-${Date.now()}`, sender_type: 'therapist', message: text };
    addMessage(activeSessionId, userMsg);

    try {
      const history = messages
        .filter(m => m.sender_type === 'therapist' || m.sender_type === 'ai')
        .map(m => ({ role: m.sender_type === 'therapist' ? 'user' as const : 'model' as const, text: m.message }));

      const filteredHistory = history.length > 1 ? history.slice(1) : [];

      const [puterConfig, puterMessages] = await Promise.all([
        getPuterConfig(),
        Promise.resolve([
          { role: 'system', content: buildSystemPrompt(therapist ?? undefined, settings) },
          ...filteredHistory.map((h: any) => ({
            role: h.role === 'model' ? 'assistant' : h.role,
            content: h.text,
          })),
          { role: 'user', content: text },
        ]),
      ]);

      const res = await fetch(`${PUTER_API_URL}/drivers/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;actually=json' },
        body: JSON.stringify({
          interface: 'puter-chat-completion',
          driver: 'ai-chat',
          method: 'complete',
          args: {
            messages: puterMessages,
            model: puterConfig.modelName,
            temperature: 0.7,
            max_tokens: 2048,
          },
          auth_token: puterConfig.authToken,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      const reply = data?.result?.message?.content || 'Maaf, saya tidak bisa merespon saat ini.';
      const aiMsg: Message = { id: `ai-${Date.now()}`, sender_type: 'ai', message: reply };
      addMessage(activeSessionId, aiMsg);
    } catch (e: any) {
      const errMsg: Message = { id: `ai-err-${Date.now()}`, sender_type: 'ai', message: `Maaf, saya mengalami kendala teknis. ${e?.message || ''}` };
      addMessage(activeSessionId, errMsg);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !activeSessionId) return;
    sendToAi(input.trim());
  };

  const isSessionEmpty = (session: typeof activeSession) =>
    session && session.messages.length <= 1;

  const handleNewChat = () => {
    if (activeSession && isSessionEmpty(activeSession)) {
      deleteSession(activeSession.id);
    }
    const sessionId = createSession();
    addMessage(sessionId, {
      id: 'ai-welcome',
      sender_type: 'ai',
      message: 'Halo! Ada yang bisa saya bantu?\n\nTanyakan seputar:\n• Withdraw & Top Up saldo\n• Komisi & Tier\n• Status pesanan\n• Notifikasi order tidak muncul\n• Cara menggunakan aplikasi',
    });
    setSidebarVisible(false);
  };

  const handleSelectSession = (session: ChatSession) => {
    setActiveSession(session.id);
    setSidebarVisible(false);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
  };

  // Auto scroll
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });
    return () => showSub.remove();
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]}>Tanya Tentang Kami</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>AI Assistant</Text>
        </View>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.historyBtn}>
          <Ionicons name="time-outline" size={24} color={t.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          if (item.sender_type === 'ai') {
            return (
              <View style={styles.msgRow}>
                <View style={[styles.botAvatar, { backgroundColor: t.primary + '20' }]}>
                  <Ionicons name="sparkles" size={16} color={t.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={[styles.botBubble, { backgroundColor: t.surface, borderColor: t.border }]}>
                    <Text style={[styles.msgText, { color: t.text }]}>{item.message}</Text>
                  </View>
                </View>
              </View>
            );
          }
          const isMe = item.sender_type === 'therapist';
          return (
            <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
              <View style={[
                styles.msgBubble,
                isMe
                  ? { backgroundColor: t.primary, borderBottomRightRadius: 4 }
                  : { backgroundColor: t.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.border }
              ]}>
                <Text style={[styles.msgText, { color: isMe ? '#fff' : t.text }]}>{item.message}</Text>
                {item.created_at && (
                  <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.6)' : t.textMuted }]}>
                    {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              {isMe && (
                therapist?.avatar_url ? (
                  <Image source={{ uri: therapist.avatar_url }} style={styles.therapistAvatar} />
                ) : (
                  <View style={[styles.therapistAvatar, styles.therapistAvatarFallback]}>
                    <Ionicons name="person" size={18} color={t.primary} />
                  </View>
                )
              )}
            </View>
          );
        }}
      />

      {/* Typing indicator */}
      {sending && (
        <View style={[styles.msgRow, { paddingHorizontal: 16, paddingBottom: 4 }]}>
          <View style={[styles.botAvatar, { backgroundColor: t.primary + '20' }]}>
            <Ionicons name="sparkles" size={16} color={t.primary} />
          </View>
          <View style={[styles.botBubble, { backgroundColor: t.surface, borderColor: t.border, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <View style={[styles.typingDot, { backgroundColor: t.textMuted }]} />
              <View style={[styles.typingDot, { backgroundColor: t.textMuted, opacity: 0.6 }]} />
              <View style={[styles.typingDot, { backgroundColor: t.textMuted, opacity: 0.3 }]} />
            </View>
          </View>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { borderTopColor: t.border, backgroundColor: t.background, paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={[styles.input, { backgroundColor: t.surface, color: t.text, borderColor: t.border }]}
          placeholder="Tanya apa saja..."
          placeholderTextColor={t.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: t.primary, opacity: !input.trim() || sending ? 0.5 : 1 }]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Sidebar Riwayat ─────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setSidebarVisible(false)}
      >
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setSidebarVisible(false)}
          />
          <Animated.View
            style={[
              styles.sidebar,
              { paddingTop: insets.top, transform: [{ translateX: sidebarAnim }] },
            ]}
          >
            <View style={[styles.sidebarHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.sidebarTitle, { color: t.text }]}>Riwayat Chat</Text>
              <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                <Ionicons name="close" size={24} color={t.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.newChatBtn, { backgroundColor: t.primary }]}
              onPress={handleNewChat}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.newChatBtnText}>Chat Baru</Text>
            </TouchableOpacity>

            {(() => {
              const nonEmptySessions = sessions.filter(s => s.messages.length > 1);
              return nonEmptySessions.length === 0 ? (
              <View style={styles.sidebarEmpty}>
                <Ionicons name="chatbubbles-outline" size={40} color={t.textMuted} />
                <Text style={[styles.sidebarEmptyText, { color: t.textMuted }]}>Belum ada riwayat chat</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {sessions.filter(s => s.messages.length > 1).map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.sidebarItem,
                      { borderBottomColor: t.border },
                      session.id === activeSessionId && { backgroundColor: t.primary + '15' },
                    ]}
                    onPress={() => handleSelectSession(session)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sidebarItemTitle, { color: t.text }]} numberOfLines={1}>
                        {session.messages.length > 1
                          ? session.messages[session.messages.length - 1].message
                          : 'Percakapan baru'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={[styles.sidebarItemTime, { color: t.textMuted }]}>
                          {new Date(session.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        <Text style={[styles.sidebarItemTime, { color: t.textMuted }]}>
                          {new Date(session.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteSession(session.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={t.danger} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )})()}
          </Animated.View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  historyBtn: { marginLeft: 12, padding: 4 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, marginTop: 1 },
  msgRow: { marginBottom: 12, flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  botAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2 },
  therapistAvatar: { width: 32, height: 32, borderRadius: 16, marginLeft: 8, marginTop: 2 },
  therapistAvatarFallback: { backgroundColor: '#1E3A8A20', alignItems: 'center', justifyContent: 'center' },
  botBubble: { borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },
  // Sidebar
  sidebarOverlay: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: t.background,
    borderLeftWidth: 1,
    borderLeftColor: t.border,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sidebarTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newChatBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sidebarEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sidebarEmptyText: { fontSize: 14 },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  sidebarItemTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sidebarItemTime: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  sidebarItemSub: { fontSize: 12, lineHeight: 16, marginTop: 2 },
});
