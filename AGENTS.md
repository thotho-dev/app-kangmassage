# AGENTS.md — Pijat On-Demand

## Monorepo structure

npm workspaces monorepo under `apps/`. No `packages/*` used yet.

```
apps/web/           Next.js 14 App Router — admin dashboard + API backend
apps/user/          Expo 54 (expo-router) — user mobile app
apps/therapist/     Expo 54 (expo-router) — therapist mobile app
supabase/schema.sql Full DB schema, RLS, triggers, seed data
```

## Commands

| Task | Command |
|---|---|
| Web admin (port 3000) | `npm run web` |
| User app | `npm run mobile:user` |
| Therapist app | `npm run mobile:therapist` |
| Lint (web only) | `cd apps/web && npm run lint` |

| Test (user app) | `cd apps/user && npm test` |
| Test watch (user app) | `cd apps/user && npm run test:watch` |

No typecheck or formatter scripts configured. No pre-commit hooks.

## Key architecture

- **Web**: Next.js App Router with Route Handlers (`src/app/api/`), Supabase SSR auth via middleware (`src/middleware.ts`), dark-mode-first CSS variables + TailwindCSS.
- **Supabase clients**: Web uses `@supabase/ssr` (browser + server + admin clients in `src/lib/supabase/`). Mobile apps use `@supabase/supabase-js` directly with **hardcoded** URL/anon key in `lib/supabase.ts`.
- **Mobile**: Expo Router file-based routing. Zustand for state, React Query for API calls. Inter font loaded via `@expo-google-fonts/inter`.
- **Therapist app uses**: `GestureHandlerRootView` wrapper, Notifee for push notifications, custom alert system via Zustand store.
- **Realtime**: Supabase Realtime (not WebSocket). Order status polling every 3–5 seconds as fallback.
- **Payments**: Mock Midtrans Core API (not Snap). In-app payment instructions (no WebView).
- **Matching**: Broadcast system — all eligible therapists notified (radius 3km, gender match, rating >= 4.5, wallet >= 15k). First to accept via atomic Supabase update wins. No Redis, no queue.
- **i18n**: `LanguageContext` in web app, partial BI/EN support.
- **Tier system**: Therapist auto-promotion on order completion based on monthly order count + revenue. Commission rate varies by tier.
- **Privacy Shield**: Customer address auto-hidden after order completion/cancellation. Customer name masked in reviews.

## Database

All schema + RLS + triggers + seed data in `supabase/schema.sql`. Run in Supabase SQL Editor to bootstrap.

Key tables: `users`, `therapists`, `therapist_locations`, `services`, `orders`, `order_logs`, `transactions`, `vouchers`, `voucher_usages`, `notifications`, `user_topups`, `user_withdrawals`, `conversations`, `messages`.

Enums: `user_role`, `order_status` (pending → accepted → on_the_way → in_progress → completed / cancelled / rejected), `payment_status`, `therapist_status`, `voucher_type`, `voucher_category`.

## Setup

1. Create Supabase project, run `supabase/schema.sql`
2. Copy `apps/web/.env.local.example` → `apps/web/.env.local`, fill Supabase + Midtrans + JWT + Gemini values
3. `npm install`
4. `npm run web` (port 3000)

Mobile apps use hardcoded Supabase creds — no env setup needed.

### Puter AI

Support chat uses Puter.js (500+ models, gratis via user-pays model) — **client-side** langsung dari therapist app.
`apps/therapist/app/(main)/support/chat.tsx` panggil Puter API langsung via fetch.
Set `PUTER_AUTH_TOKEN` di `apps/therapist/lib/config.ts`.
Dapatkan token dengan membuat app di https://puter.com.
Default model: `qwen/qwen3.6-plus-preview:free` (gratis tanpa batas via Puter). Bisa diganti ke model lain di chat.tsx.

Server-side fallback via `apps/web/src/app/api/chat-ai/route.ts` (untuk admin dashboard).

### Chat System (Customer ↔ Therapist)

Sent messages via `POST /api/chat/send` (Next.js API, not direct Supabase insert). Endpoint handles:
- Insert message into `messages`
- Atomic unread count increment via `increment_conversation_unread()` RPC (prevents race condition)
- Expo push notification + in-app notification to recipient

**Photo upload**: Uses `expo-image-picker` → Supabase Storage bucket `chat-images` (auto-created by `/api/upload`). Falls back to sending URI as text if Storage fails.

**Realtime**: `messages` and `conversations` tables added to `supabase_realtime` publication. Channel names use `chat:{conversationId}`.

**Notification types**: `chat_message` type with `{ conversation_id, message_id }` data. Tapping navigates to `/chats/{conversation_id}`.

**Setup**: Create `chat-images` bucket in Supabase Dashboard → Storage if auto-creation doesn't work.

## Design system

- **Palette**: Primary navy (#1E1B4B), secondary orange (#F97316), emerald success, amber warning, red danger, sky blue info.
- **Web CSS**: CSS variables (`--background`, `--card`, `--primary`, etc.) with `.light` override class. `tailwind.config.js` maps these vars to Tailwind theme tokens (`bg-card`, `text-text-primary`). Utility classes: `.glass-card`, `.btn-primary`, `.input-field`, `.badge-*`.
- **Mobile**: NativeWind, custom alert system, premium gradients, card-based layout with rounded corners (20–30px).

## Known quirks

- Therapist app has multiple fix scripts (`fix.js` through `fix4.js`, `fix_gradients.js`, etc.) in its root — cleanup candidates.
- Scratch files in root `scratch/`, `apps/web/scratch/` — ephemeral development scripts.
- `progress-develop.md` is the dev log — readable for context on recent changes.

---

## Session 2 (Notifee crash fix — order notification system overhaul)

### Problems found
1. **CRASH on login/online**: `foregroundServiceTypes: ['dataSync']` (notifee.ts) mismatched Notifee AAR's manifest (`android:foregroundServiceType="shortService"`). Android 14+ kills process on mismatch.
2. **Notifee AAR not found by Gradle**: Build failed — `app.notifee:core:+` couldn't resolve because Notifee module's local Maven repo path wasn't picked up during autolinking (monorepo path issue).
3. **Broadcast orders silently dropped**: Location check (`if (status !== 'granted') return;`) blocked all broadcast orders when GPS/permission unavailable.
4. **No guards on FG service**: `startOrderForegroundService` / `stopOrderForegroundService` could be called multiple times during hot reload or rapid online/offline toggle.
5. **No dedup on order notifications**: Repeated order events could trigger multiple notification displays.
6. **Cold start race**: No delay on subscription start; UI could be unresponsive while subscription setup runs.
7. **AppState handler unthrottled**: Every foreground transition triggered immediate `checkPendingOrders`.
8. **Popup modal tidak muncul di background**: `fullScreenAction` hanya dipasang jika `USE_FULL_SCREEN_INTENT` permission sudah granted (conditional check). Di Android 13+ permission ini tidak bisa diminta via dialog — harus manual di Settings.
9. **Notifikasi tray punya tombol Terima/Tolak**: User ingin tray cuma info, popup via modal fullscreen (seperti Gojek/Grab).

### Fixes applied
| File | Fix |
|---|---|
| `lib/notifee.ts:325` | **REMOVED** `foregroundServiceTypes` permanently — AAR manifest declares `shortService`, not `dataSync`. Config plugin CANNOT modify AAR-internal manifest. |
| `lib/notifee.ts:294-295` | Added `_fgStarting`/`_fgActive` guards to prevent duplicate FG start/stop |
| `lib/notifee.ts:12,359-364` | Added `recentOrderIds` dedup Set (60s TTL) — skip duplicate order notifications |
| `lib/notifee.ts:15-26` | Extracted `cancelOrderNotifications()` to shared helper (was inline in IncomingOrderModal) |
| `lib/notifee.ts:414` | `fullScreenAction` **selalu dipasang** (dulu conditional check `USE_FULL_SCREEN_INTENT`) — notifikasi selalu trigger full-screen popup |
| `lib/notifee.ts:427-436` | **REMOVED** `actions` (Tombol Terima/Tolak) dari notifikasi tray — tray cuma info, aksi via modal |
| `hooks/useOrderListener.ts:143-162` | Location check **non-blocking** — jika GPS gagal/permission denied, order tetap lanjut dengan warning |
| `hooks/useOrderListener.ts:48` | Added 500ms startup delay for subscription setup |
| `hooks/useOrderListener.ts:99` | `Promise.allSettled` for parallel active orders + skills check |
| `hooks/useOrderListener.ts:18` | `cleanupRef` for proper subscription teardown |
| `index.js:16-24` | Background handler skip 'default' tap — tap notif buka app (cold start handle), tanpa proses action |
| `index.js:37-43` | `_fgRegistered` guard prevents duplicate `registerForegroundService` handlers |
| `app/(tabs)/_layout.tsx:255-264` | AppState handler debounced (800ms) |
| `app/(tabs)/_layout.tsx:45-86` | `checkPendingOrders` skip-duplicate logic — don't query if incoming order already exists |
| `app/(tabs)/_layout.tsx:217-234` | Foreground handler skip 'default' tap — tap notif buka app, tanpa proses action |
| `app.json` | compileSdkVersion 34→35, targetSdkVersion 35; registered `withNotifeeMavenRepo` plugin |
| `plugins/withNotifeeMavenRepo.js` | **NEW** Config plugin — adds Notifee local Maven repo to `android/build.gradle` automatically, fixes Gradle AAR resolution in monorepo |

### Notifee AAR manifest (found in AAR, not source)
```
node_modules/@notifee/react-native/android/libs/.../core/.../*.aar
  → AndroidManifest.xml:
    <service android:name="app.notifee.core.ForegroundService"
             android:foregroundServiceType="shortService" />
```
- **`shortService`** = Android 14+ type with ~3-minute timeout
- No `<service android:foregroundServiceType="dataSync">` — hence `dataSync` in notification caused crash
- Config plugin approach **cannot** modify AAR-internal manifest

### Flow after fixes
1. Order masuk → Realtime subscription atau push notification trigger
2. `setIncomingOrder(orderData)` dipanggil → modal siap tampil
3. `displayOrderNotification` menampilkan notifikasi tray (info saja, tanpa tombol) dengan `fullScreenAction`
4. Jika HP terkunci → `fullScreenAction` trigger activity sebagai full-screen overlay (seperti Gojek/Grab)
5. Modal muncul dengan Tombol Terima/Tolak di dalam app
6. Jika popup terlewat → tap notifikasi tray → buka app → modal muncul

### Remaining issues
- **3-minute FG service timeout**: Notifee AAR declares `shortService` (max ~3 min on Android 14+). Config plugin can't modify AAR-internal manifest. Need custom native module or alternative approach for indefinite background running.
- **Redmi Note 13 install failure**: "Aplikasi tidak terinstal" — suspected MIUI Security / Play Protect / APK corruption. Not code-related.
- **ANR on physical Xiaomi**: Could not reproduce on emulator. May be FG service timeout → disconnection → reconnection storm.

---

## Session 3 (Order page redesign — Midtrans integration prep, Lottie via WebView)

### Problem
1. Payment method accordion outdated — many inactive gateways shown.
2. No additional services accordion with dynamic pricing.
3. Cancel flow didn't work after therapist accepted.
4. Refund flow missing for cancelled orders.
5. `lottie-react-native` fails Kotlin compile with Kotlin 2.1.20.

### Changes made

| File | Change |
|---|---|
| `app/(main)/order.tsx` | New `PAYMENT_GROUPS` — only **Tunai** & **Saldo** active. DANA/ShopeePay disabled with comingSoon badge. Additional services accordion with preview above header. Addon price calc with Hermes hoisting fix. |
| `app/(main)/searching-therapist.tsx` | Cancel uses `.in('status', ['pending', 'accepted'])`. Animated API search icon (pulse, rotate, ring ripple, sparkles). No native modules. |
| `app/(main)/tracking.tsx` | Cancel creates refund transaction + calls `/api/refund/create` for gateway. Realtime `cancelled` → redirect to `/searching-therapist`. ETA section replaced with full-width Lottie via `LottieWebView`. |
| `app/(main)/payment-details.tsx` | Reverted `awaiting_payment` check to `status !== 'pending'`. |
| `components/LottieWebView.tsx` | **NEW** — Renders Lottie JSON via `react-native-webview` + `bodymovin` CDN. Respects original aspect ratio (not stretch). Zero native modules. |
| `assets/lottie/anim-*.json` | 5 Lottie JSON extracted from DOTLottie: search, navigate, arrive, cycle, progress. |
| `apps/web/src/app/api/payments/create/route.ts` | Added `gopay`, `shopeepay`, `qris` support. |
| `apps/web/src/app/api/refund/create/route.ts` | **NEW** — Midtrans cancel/void + wallet balance credit + refund transaction record. |
| `supabase/schema.sql` | `awaiting_payment` kept in enum for future Midtrans re-enable. |

### Key decisions
- Refund goes to wallet balance (saldo), not original payment source.
- Cancel uses `.in('status', ['pending', 'accepted'])` for both pre/post-therapist scenarios.
- Therapist-cancelled → redirect to `searching-therapist` (not home).
- Lottie via WebView + CDN because `lottie-react-native` fails on Kotlin 2.1.20.
- `LottieWebView` calculates display size from JSON's original `w`/`h` aspect ratio — no distortion.

### Next steps
- Re-activate Midtrans by adding payment methods back to `PAYMENT_GROUPS` and uncommenting `awaiting_payment` logic.
- Verify cancel flow for all payment methods (tunai, saldo, future gateway).
- Swap any Lottie file in `STATUS_LOTTIE` map without rebuilding.

### Known issues
- `lottie-react-native@7.2.1` / `7.3.8` both fail Kotlin compile with Kotlin 2.1.20. Use `LottieWebView` component instead.
- `awaiting_payment` requires `ALTER TYPE order_status ADD VALUE 'awaiting_payment'` in Supabase SQL Editor when re-enabling.

---

## Previous session (ANDROID_HOME fix — Android SDK CLI tools installed)

### Problem
`ANDROID_HOME`指向 `C:\Users\DIGITAL MARKETING\AppData\Local\Android\Sdk` yang tidak ada. Hanya `platform-tools` di `C:\Android\platform-tools`. Akibatnya Expo tidak bisa resolve SDK path dan selalu fallback ke Expo Go.

### Fix applied
1. **Download & install Android cmdline-tools** from Google to `C:\Android\cmdline-tools\latest\`
2. **Accept SDK licenses** (6/7 accepted)
3. **Install SDK packages**: `platforms;android-34` + `build-tools;34.0.0`
4. **Set environment variable permanen**:
   - `ANDROID_HOME` = `C:\Android`
   - PATH ditambahkan `C:\Android\platform-tools` dan `C:\Android\cmdline-tools\latest\bin`

### SDK structure
```
C:\Android\
├── build-tools\34.0.0\
├── cmdline-tools\latest\bin\sdkmanager.bat
├── licenses\
├── platform-tools\adb.exe
└── platforms\android-34\
```

### Test plan for next session
1. **Restart terminal** (biar env var `ANDROID_HOME` kebaca)
2. Open PowerShell baru:
   ```powershell
   cd apps\therapist
   adb reverse tcp:8081 tcp:8081
   npx expo start
   ```
3. Press `a` — should connect via ADB without SDK path error
4. If dev build not installed: `npx expo run:android` (first build ~10-15 min)
5. Test: bikin order dari admin → cek tray notif → tekan **Terima** / **Tolak**
6. Verify: order status berubah di DB, notif follow-up muncul

---

## Session 4 (Withdrawal security system — PIN transaksi, validasi rekening, admin approval)

### Problems addressed
1. Form withdrawal tidak validasi field kosong — user bisa submit dengan field kosong
2. Tidak ada validasi nomor rekening — user bisa input sembarang nomor
3. Disbursement gagal di tengah jalan karena saldo Xendit habis — user tetap terpotong
4. Status transaksi tidak berubah ke 'completed' setelah Xendit sukses
5. Cancel withdrawal rawan race condition — bisa double refund
6. Wallet activity tidak mencerminkan status real dari table withdrawals
7. Topup card di wallet tidak bisa diklik (keyword mismatch spasi)
8. Transaksi pembayaran via saldo tidak muncul di wallet activity

### Changes made

| File | Change |
|---|---|
| `apps/user/app/(main)/withdraw.tsx` | Client-side validation di `handlePinVerified` — tampilkan field kosong. Hint button disabled jika field kosong. Review section menampilkan data withdrawal. |
| `apps/user/app/(main)/withdraw-history.tsx` | Cancel via RPC `cancel_withdrawal` (atomic, SELECT FOR UPDATE). Batas waktu cancel 30 menit. No PIN required. |
| `apps/user/app/(main)/bank-accounts.tsx` | Validasi rekening via Xendit `/bank_account_data_requests` saat tambah rekening baru. DANA skip Xendit (format HP 10-13 digit). Error message translate. |
| `apps/user/components/PinModal.tsx` | Bottom padding pakai `useSafeAreaInsets()` — tidak kepotong navigation bar. |
| `apps/user/app/(main)/wallet.tsx` | `getTxInfo` ikon/status/badge real dari `user_withdrawals`. Navigasi click → history page. Payment type handler (CreditCard icon). Fix keyword 'top up' (with space). |
| `apps/user/app/(main)/topup.tsx` | Fix realtime channel — cek `supabase.getChannels()` sebelum subscribe. |
| `apps/web/src/app/api/withdraw/user-create/route.ts` | Fix: status diubah ke 'completed' setelah Xendit sukses. Validasi rekening via Xendit sebelum disbursement. Cek saldo Xendit (`GET /balance`). Skip DANA validation. |
| `apps/web/src/app/api/withdraw/user-confirm/route.ts` | Fix: status diubah ke 'completed'. Validasi rekening + cek saldo Xendit sebelum disbursement. |
| `apps/web/src/app/api/withdraw/admin/route.ts` | Cek saldo Xendit sebelum approve withdrawal. |
| `apps/web/src/app/api/bank-accounts/validate/route.ts` | **NEW** — Validasi rekening via Xendit `/bank_account_data_requests`. Error message map Indonesia. Skip validation untuk DANA. |
| `apps/web/src/app/api/xendit/balance/route.ts` | **NEW** — Ambil saldo Xendit real-time dari `/balance`. |
| `apps/web/src/app/api/refund/create/route.ts` | Refund credit ke wallet balance + insert transaction record. |
| `supabase/migrations/20260616_add_withdrawal_security.sql` | Migration: kolom `withdrawal_pin_hash`, `bank_accounts`, `daily_withdrawal_count`, dll. |
| `supabase/migrations/20260617_add_cancel_withdrawal_rpc.sql` | **NEW** — RPC `cancel_withdrawal`: SELECT FOR UPDATE, cek status pending, refund + kurangi hold_balance, insert transaksi credit. |
| `apps/web/src/lib/settings.ts` | Tambah field `withdrawal_admin_approval_threshold`. |
| `apps/web/src/app/api/settings/route.ts` | Field baru di GET/PUT settings. |
| `apps/web/src/app/dashboard/settings/page.tsx` | UI tab Withdrawal Security: OTP Threshold, Daily Limit, Max Count/Day, Admin Approval Threshold. |
| `apps/web/src/app/dashboard/page.tsx` | Card "Saldo Xendit" with real-time balance (cache 60s). |

### Key decisions
- Cancel withdrawal via RPC atomic (Supabase function) — bukan API endpoint — biar bisa langsung jalan tanpa deploy backend.
- Xendit validation di **dua tempat**: saat tambah rekening + saat disbursement — cegah nomor asal-asalan.
- DANA tidak bisa divalidasi via Xendit `/bank_account_data_requests` — skip, cek format HP 10-13 digit.
- Saldo Xendit dicek **sebelum** disbursement — kalau kurang, reject sebelum kurangi saldo user.
- Jika withdraw gagal (Xendit error / saldo kurang) — balance di-revert, status = failed, NO transaction record.
- Transaksi pesanan via saldo masuk ke `transactions` dengan `type: 'payment'` — muncul di wallet activity.

### Xendit error messages (translated to Indonesian)
| EN (Xendit) | ID (app) |
|---|---|
| `ACCOUNT_NOT_FOUND` | Nomor rekening tidak ditemukan di bank |
| `AMOUNT_EXCEEDS_BALANCE` | Saldo sistem tidak mencukupi, hubungi admin |
| `DUPLICATE_REFERENCE` | Transksi ini sudah diproses sebelumnya |
| `INVALID_DESTINATION_AMOUNT` | Jumlah penarikan tidak valid |
| `BANK_ACCOUNT_BLOCKED` | Rekening tujuan diblokir |
| `ACCOUNT_LIMIT_EXCEEDED` | Limit rekening tujuan tercapai |
| (generic) | Penarikan gagal, coba lagi atau hubungi admin |

### Migration files
- `supabase/migrations/20260616_add_withdrawal_security.sql` — Sudah dijalankan
- `supabase/migrations/20260617_add_cancel_withdrawal_rpc.sql` — **Belum dijalankan** (perlu run di Supabase SQL Editor)

### Next steps
- Deploy backend `apps/web` ke production agar endpoint baru berfungsi
- Jalankan migration `20260617_add_cancel_withdrawal_rpc.sql` di Supabase SQL Editor
- Test end-to-end: setup PIN → tambah rekening (validasi Xendit) → withdraw → sukses/gagal
- Admin isi saldo Xendit jika menipis (pantau dari dashboard)

---

## Session 5 (Unit test setup for apps/user — UI refinements)

### Problems addressed
1. No testing infrastructure in the project — zero test files, no jest config, no test scripts.
2. Auth layout didn't have slide transition animation.
3. Font sizes on login/register pages too large (title 28px, inputs 14-18px, etc.).
4. Login error messages from server (Supabase English) not translated to Indonesian.
5. Monorepo React version conflict (root hoisted `react@19.1.0` vs `react-test-renderer`).

### Changes made
| File | Change |
|---|---|
| `apps/user/app/(auth)/_layout.tsx` | Added `animation: 'slide_from_right'` to Stack screenOptions. |
| `apps/user/app/(auth)/login.tsx` | Font sizes reduced: title 28→22, subtitle 14→12, input 14→13, button 14→13, google 15→13. Logo/padding/header margin reduced. |
| `apps/user/app/(auth)/login.tsx` | Added Indonesian error message map — Supabase `Invalid login credentials` → `'Nomor atau kata sandi salah'`, dll. |
| `apps/user/app/(auth)/register.tsx` | Font sizes reduced: title 26→22, subtitle 14→12, field label 14→12, input 14→13, button 14→13, phone input 18→15. Input height 56→48, gender 15→13, OTP box 44x56→40x48 (fontSize 22→18). |
| `apps/user/jest.config.js` | **NEW** — Jest config with `jest-expo` preset, `transformIgnorePatterns` for RN/Expo modules, `moduleNameMapper` for `@/` alias. |
| `apps/user/lib/__tests__/utils.test.ts` | **NEW** — Example unit test for `titleCase` function (8 tests). |
| `apps/user/package.json` | Added `test` and `test:watch` scripts. Added deps: `jest@29.7.0`, `jest-expo@56.0.5`, `@types/jest`, `react-test-renderer`. |

### Key decisions
- Use `jest@29.7.0` (not v30) to avoid `clearMocksOnScope` bug in `jest-runtime` v30.
- Use `jest-expo` preset for Expo compatibility.
- Component testing with `react-test-renderer` requires native module mocking — skipped for now. Pure function tests work out of the box.
- Error message translation done client-side in UI, not on the server.

### Next steps
- Add component tests using `@testing-library/react-native` with proper native module mocking.
- Setup test for `apps/therapist` app.
- Add CI test runner configuration.

### Relevant files
- `apps/user/jest.config.js` — test configuration
- `apps/user/lib/__tests__/utils.test.ts` — example test
- `apps/user/app/(auth)/_layout.tsx` — slide animation
- `apps/user/app/(auth)/login.tsx` — font sizes, error translation
- `apps/user/app/(auth)/register.tsx` — font sizes

---

## Session 6 (Profile redesign — UI refinements — v1.1.2 release)

### Problems addressed
1. Data Pribadi modal always editable — no way to just view info without accidentally editing.
2. Avatar change popup used `showAlert` with emoji buttons — layout berantakan.
3. No gender or registration date shown on profile.
4. Email info missing from profile header.
5. Stats card (Pesanan + Poin) felt cluttered.
6. Logout was a standalone styled button, inconsistent with other menu items.
7. Update modal had no close button (force update couldn't be dismissed).
8. Rekomendasi & Banyak Dipesan used blue theme instead of navy brand color.
9. App version was hardcoded inconsistently (1.1.1 in some places, 1.1.2 in others).
10. EAS submit failed: Service Account key "Invalid JWT Signature."

### Changes made
| File | Change |
|---|---|
| `apps/user/app/(main)/(tabs)/profile.tsx` | Data Pribadi modal redesigned: read-only view (name, phone, **gender**, **registration date**) + Edit button toggles to editable form with **gender picker**. Avatar bottom sheet with Camera/Gallery icons + descriptions. Gear icon removed from avatar. Stats card (Pesanan/Poin) removed. Logout moved to menu item (group without label). Email added under name (fallback to phone). |
| `apps/user/context/AuthContext.tsx` | Added `created_at?: string` to `Profile` interface. |
| `apps/user/components/UpdateModal.tsx` | Added close button (✕) + `onClose` prop. |
| `apps/user/app/_layout.tsx` | Pass `onClose` to VersionCheck's UpdateModal. |
| `apps/user/app/(main)/(tabs)/home.tsx` | Replaced `#3B82F6` (blue) with `#240080` (navy) in Rekomendasi & Banyak Dipesan sections: section icon boxes, badges, card borders, shadows, buttons, accent bar, price colors. |
| `apps/user/app/(auth)/login.tsx` | Version footer changed from hardcoded `v1.1.1` to dynamic `Constants.expoConfig?.version` with fallback `1.1.2`. |
| `apps/user/android/app/build.gradle` | Fixed `versionName` from `1.1.1` → `1.1.2`. |
| `apps/user/app.json` | Version `1.1.2` (already correct). |

### Key decisions
- Avatar action sheet uses bottom sheet modal with proper icons, not `showAlert` hack.
- Menu groups without `label` don't render the section label or section line (clean spacing).
- Gender stored as `L` / `P` in DB, displayed as Laki-laki / Perempuan in UI.
- Logout confirmation still uses `showAlert` (custom AlertContext modal) with cancel + destructive buttons.
- `created_at` added to `Profile` type since `select(*)` already fetches it from `users` table.
- Navy (`#240080`) used as primary accent color instead of blue (`#3B82F6`) across home cards.

### Build info
- **EAS Build production** (v1.1.2, versionCode 4): success — `578dd83a-865e-478b-8b5f-4fa5b334179f`
- **EAS Submit**: failed with `Invalid JWT Signature` — Service Account key expired. Regenerate di Google Cloud Console + upload via `eas credentials --platform android`.

### Next steps
- Regenerate Google Service Account key → run `eas credentials --platform android` → retry `eas submit`.
- Register release SHA-1 from Play Console in Google Cloud OAuth client for production Google Sign-In.
- Set `min_app_version` after first production release published.
- Update `supabase/migrations/20260620_add_app_update_config.sql` and `20260621_change_order_prefix_to_kmsg.sql` in Supabase SQL Editor.

### Relevant files
- `apps/user/components/UpdateModal.tsx` — close button for force-update popup
- `apps/user/components/UpdateModal.tsx` — bottom sheet action modal for avatar source
- `apps/user/context/AuthContext.tsx` — Profile type with created_at
- `apps/user/android/app/build.gradle` — versionName 1.1.2
- `apps/user/app.json` — version 1.1.2

---

## Session 6b (Wallet voucher, unit tests, privacy modal, Unsplash removal, layout screens)

### Problems addressed
1. Wallet payment (saldo) tidak punya voucher category khusus — voucher umum tidak bisa dibedakan.
2. Voucher logic tercampur di komponen — tidak bisa di-unit-test.
3. Profile tidak ada menu Kebijakan Privasi.
4. Chat UI header font terlalu besar.
5. Beberapa screen tidak terdaftar di Stack.Screen — navigasi error.
6. WhatsApp support button tidak ada di profile.
7. Gambar Unsplash masih dipakai sebagai fallback — tidak konsisten.
8. Mock data (HISTORY_DATA, FAV_DATA, SERVICES) masih ada — dead code.
9. `order.tsx` TS error — `expo-application` API berubah.

### Changes made
| File | Change |
|---|---|
| `supabase/schema.sql` | Added `wallet_payment` to `voucher_category` enum. |
| `supabase/migrations/20260622_add_wallet_payment_voucher_category.sql` | **NEW** — Migration for enum value. |
| `apps/web/src/app/dashboard/vouchers/page.tsx` | Updated with `wallet_payment` category option. |
| `apps/web/src/types/index.ts` | VoucherCategory type updated. |
| `apps/user/app/(main)/order.tsx` | Voucher `wallet_payment` hanya aktif jika `paymentMethod === 'saldo'`. `useEffect` reaktif switching payment method. Fixed `expo-application` import. |
| `apps/user/lib/voucher.ts` | **NEW** — Pure functions: `calculateDiscount`, `checkHappyHour`, `checkAreaCoverage`, `validateVoucher`, `findBestVoucher`. |
| `apps/user/lib/__tests__/voucher.test.ts` | **NEW** — 48 unit tests. |
| `apps/user/app.json` | Version 1.1.2→1.1.3. |
| `apps/user/android/app/build.gradle` | versionCode 4→5. |
| `apps/user/app/(main)/(tabs)/profile.tsx` | Added `Kebijakan Privasi` menu item + modal with 6 sections. Added WhatsApp support button using `supportWA` from DB. |
| `apps/user/app/(main)/(tabs)/chat.tsx` | Header title font 26→20, emptyTitle 18→16, emptySubtitle 14→12. |
| `apps/user/app/(auth)/_layout.tsx` | Added `register` screen declaration. |
| `apps/user/app/(main)/_layout.tsx` | Added `bank-accounts`, `pin-setup`, `topup-history`, `withdraw-history`. |
| `apps/user/app/_layout.tsx` | Added `callback`, `chats/[id]` screens. |
| `apps/user/app/(main)/services.tsx` | Removed Unsplash fallback (`|| undefined`). No longer imports SERVICES constant (only type). |
| `apps/user/app/(main)/tracking.tsx` | Removed Unsplash fallback. |
| `apps/user/app/(main)/voucher-detail/[id].tsx` | Removed Unsplash fallback. Added `wallet_payment` requirement row. |
| `apps/user/app/(main)/vouchers.tsx` | Voucher list filter by device usage. |
| `apps/user/app/(main)/(tabs)/home.tsx` | Removed Unsplash fallback, removed HOME_SERVICES image fields. |
| `apps/user/app/(main)/(tabs)/history.tsx` | Removed Unsplash fallback. Deleted `HISTORY_DATA` and `FAV_DATA` mock arrays. |
| `apps/user/constants/Services.ts` | Only `Service` type remains — SERVICES data constant no longer imported. |

### Key decisions
- `validateVoucher(voucher, context)` pure function pattern for testability.
- `servicesData ?? []` instead of `servicesData || SERVICES` to remove hardcoded fallback.
- Voucher device tracking via `expo-application` (getAndroidId / getIosIdForVendorAsync).

### Next steps
- Run migration files in Supabase SQL Editor.
- Build/install app via EAS build.

---

## Session 7 (UI refinement — fallback images, font sizes, tracking card group, splash fix)

### Problems addressed
1. Halaman services/history/chat/dll tidak punya gambar fallback — setelah hapus Unsplash, gambar jadi blank.
2. Font size di history, voucher-detail, services, vouchers, chat terlalu besar.
3. Halaman tracking tidak menampilkan jam order (created_at).
4. Status card dan detail card terpisah — tidak dalam satu container putih.
5. Maps Leaflet di tracking pakai unsplash fallback — tidak konsisten dengan logo KM.
6. Gesture sheet masih bisa di-drag saat map sudah di-sembunyikan (arrived/in_progress/completed/cancelled).
7. Status Pesanan section kosong saat status pending.
8. Splash screen putih — window background default Android putih, hideAsync dipanggil sebelum fonts loaded.
9. Input tips font too large.
10. Syntax error saat hapus loading View.

### Changes made
| File | Change |
|---|---|
| `apps/user/app/(main)/services.tsx` | Card image fallback pakai `require('@/assets/icon-km.png')`. Font header 18→16, introTitle 18→16, cardName 14→13, cardPrice 13→12. |
| `apps/user/app/(main)/voucher-detail/[id].tsx` | Fallback voucher image pakai `require('@/assets/icon-km.png')`. Header 18→16, value 26→22, code 16→14, sectionTitle/desc/reqValue 14→13, button 14→13. |
| `apps/user/app/(main)/vouchers.tsx` | Font header 18→16, discount 15→14, empty 18→16, loading 14→13. |
| `apps/user/app/(main)/(tabs)/history.tsx` | Font header 18→15, tab 13→12, orderId 13→12, name 15→13, service 13→12, price 14→12, dll. Fallback pakai `require()`. |
| `apps/user/app/(main)/(tabs)/chat.tsx` | Font header 20→17, name 15→13, lastMessage 13→12, emptyTitle 16→14. Fallback pakai `require()`. |
| `apps/user/app/(main)/(tabs)/home.tsx` | Service image fallback pakai `require('@/assets/icon-km.png')`. |
| `apps/user/app/(main)/tracking.tsx` | Avatar fallback pakai `require('@/assets/icon-km.png')`, Leaflet fallback via `fallbackAvatarUri` (Image.resolveAssetSource). Added Jam Order row in detail card. Grouped status + detail cards into `combinedCardBg` (white container). StepsCard & detailCard dibuat transparent. Disable PanResponder saat map hidden via `mapHiddenRef`. Added `pending` step to STATUS_STEPS. Font tips label 14→12, tips input/currency 16→14. |
| `apps/user/constants/Services.ts` | Hanya export type Service — SERVICES data constant tidak di-import siapapun. |
| `apps/user/app/_layout.tsx` | `SplashScreen.hideAsync()` hanya dipanggil setelah fonts loaded (`[loaded, error]` deps). Loading View diganti `return null` (native splash tetap visible selama font loading). |
| `apps/user/android/.../styles.xml` | Added `android:windowBackground` → `@color/splashscreen_background` (`#0F172A`) ke AppTheme. |

### Key decisions
- Fallback logo KM untuk Image source via `require()`, untuk Leaflet HTML via `Image.resolveAssetSource().uri`.
- Container putih (`combinedCardBg`) membungkus status + detail — stepsCard & detailCard dibuat tanpa bg/border.
- PanResponder dicek via `mapHiddenRef` yang di-sync via `useEffect` — bukan re-create PanResponder tiap render.
- `pending` ditambahkan ke STATUS_STEPS index 0 agar status section tidak kosong saat pending.
- Splash screen: hideAsync ditunda sampai fonts benar-benar loaded + windowBackground native di-set ke navy.
- EAS production build submitted: build ID `18ffc114-3fcc-44f1-a587-6b11f04e7677`

### Next steps
- Monitor EAS build status.
- Cek hasil build + install APK.
- Verify splash screen tidak putih lagi di build production.

---

## Session 8 (Voucher saldo + cancel cleanup — voucher refund, double refund guard, navigation)

### Problems addressed
1. Wallet payment voucher (`wallet_payment`) tetap tampil walau metode bayar bukan `saldo`.
2. Voucher selection flow manual (tap card → "Pakai" button) tidak ada — tiap card punya tombol "Pakai" sendiri.
3. Routing dari Vouchers ke Order numpuk — `router.replace` ke Order baru atau `router.back()` dengan pending state.
4. Voucher-detail "Gunakan Voucher" push Order baru → nambah stacking.
5. Voucher tidak dikembalikan setelah order dibatalkan — `voucher_usages` tidak dihapus, `usage_count` tidak dikurangi.
6. Saldo refund dobel — refund klien (client-side untuk saldo) + refund API (`/api/refund/create` atau `PATCH`) bisa overlap, saldo jadi bertambah 2×.
7. Contoh: saldo 300rb, order 100rb, dibatalkan → saldo jadi 400rb (300 + 100 refund, tanpa deduksi).
8. Navigation back dari Order ke Services pakai `router.replace` vs `router.back` — duplicate services screen.

### Changes made
| File | Change |
|---|---|
| `apps/user/app/(main)/vouchers.tsx` | Select-flow: tap card → selectedVoucher (border navy + badge "Dipilih"), sticky bottom "Pakai Voucher" button, tombol "Detail" (text) navigasi ke detail tanpa select. `wallet_payment` hanya valid jika `paymentMethod === 'saldo'`. Pre-select applied voucher dari `appliedVoucherCode` param. HandlePakai: `router.replace({ pathname: '/order', params: { voucherCode, serviceId, therapistId, from, paymentMethod } })` — full params, tanpa pending state module variable. Aksen orange → navy (`#240080`). |
| `apps/user/app/(main)/order.tsx` | `paymentMethod` baca dari `useLocalSearchParams` untuk state awal. `useFocusEffect` + `useEffect (:535)` consume pending voucher via `pickPendingVoucherCode()` — guard `totalPrice > 0` biar tidak hilang. Auto-apply guard (`initialVoucherCode`). Pass `appliedVoucherCode` ke vouchers params. Hardware back & UI back: `router.back()` (pernah dicoba `router.replace('/services')`, di-revert). |
| `apps/user/lib/voucher.ts` | `_pendingVoucherCode` + `setPendingVoucherCode()` + `pickPendingVoucherCode()` (module-level, persist antar mount tanpa re-render) — **diubah di Session 9** jadi tanpa pending state, full params langsung via `router.replace`. |
| `apps/user/app/(main)/voucher-detail/[id].tsx` | "Gunakan Voucher" `router.push` → `router.replace` (Detail diganti Order, bukan nambah stack). Aksen navy. |
| `apps/user/app/(main)/tracking.tsx` | Cancel: panggil RPC `refund_order_saldo` (SELECT FOR UPDATE — atomic, cegah race condition double refund). Voucher cleanup by RPC. |
| `apps/user/app/(main)/searching-therapist.tsx` | Cancel: panggil RPC `refund_order_saldo` (sama seperti tracking). |
| `apps/web/src/app/api/refund/create/route.ts` | Filter payment_method — hanya proses refund untuk gateway (`gopay`/qris/dll), **bukan saldo**. Voucher cleanup + double-refund guard. |
| `apps/web/src/app/api/orders/[id]/route.ts` | Voucher cleanup + double-refund guard. `type: 'credit'` → `type: 'refund'` di transaksi refund. |
| `supabase/migrations/20260627_add_refund_order_rpc.sql` | **NEW** — RPC `refund_order_saldo`: SELECT FOR UPDATE lock user+order, refund wallet, cleanup voucher, guard double refund. Atomic. |

### Key decisions
- Voucher pending state via module variable (`_pendingVoucherCode`) — **diganti di Session 9** dengan `router.replace` full params.
- `router.back()` untuk "Pakai Voucher" + `router.back()` untuk hardware back → **diganti di Session 9** dengan `router.replace` full params.
- Voucher-detail "Gunakan Voucher" pakai `router.replace` → Detail diganti Order, tidak nambah stacking.
- Voucher cleanup dilakukan di **semua** jalur cancel (mobile client + web API) — tidak ada single point of truth.
- Double-refund diatasi pakai **RPC `refund_order_saldo`** dengan `SELECT FOR UPDATE` — lock row user+order secara atomic, bukan query JS biasa yang rawan race condition.
- `refund/create/route.ts` sekarang tolak order dengan `payment_method === 'saldo'` (refund saldo handle client-side via RPC).

### Next steps
- Test end-to-end: buat order dengan voucher saldo → cancel → cek voucher bisa dipakai lagi.
- Test saldo refund: saldo 300rb, order 100rb via saldo, cancel → saldo harus kembali 300rb (bukan 400rb).
- Test stacking: Order → Vouchers → back → Order (1 screen), Order → Vouchers → Detail → Gunakan → Order (2 Order max).

## Session 9 (Voucher routing fix — router.replace, therapist cancel refund via Realtime)

### Problems addressed
1. Session 8's `router.back()` + pending state (`setPendingVoucherCode`) approach rawan hilang — pending state di module variable bisa ter-reset saat order screen mount ulang, voucher jadi tidak terapply.
2. RPC `refund_order_saldo` tanpa `SECURITY DEFINER` — mobile client tidak punya permisson DELETE voucher_usages / UPDATE vouchers / INSERT transactions, RPC gagal silent.
3. Therapist reject order (targeted → status 'cancelled') tidak trigger refund — Realtime handler hanya redirect/stop timer, user harus cancel manual.
4. Therapist cancel setelah accept (kembalikan ke antrian → status 'pending') — tidak refund karena order masih pending, tapi tracking screen jadi error (therapist null). Tidak ada notifikasi refresh ke user.

### Changes made
| File | Change |
|---|---|
| `apps/user/app/(main)/vouchers.tsx` | `handlePakai` diubah dari `router.back()` + `setPendingVoucherCode()` → `router.replace({ pathname: '/order', params: { voucherCode, serviceId, therapistId, from, paymentMethod } })` dengan full params. Reliable — tidak bergantung pada module variable yang bisa hilang. |
| `apps/user/app/(main)/order.tsx` | Hapus `useFocusEffect` + `pickPendingVoucherCode()`. Voucher dibaca langsung dari `useLocalSearchParams().voucherCode`. Back buttons tetap `router.back()`. |
| `apps/user/lib/voucher.ts` | Hapus `_pendingVoucherCode`, `setPendingVoucherCode()`, `pickPendingVoucherCode()` — tidak dipakai lagi. |
| `apps/user/app/(main)/tracking.tsx` | Realtime handler: saat status berubah **pending → cancelled** (therapist reject), panggil `supabase.rpc('refund_order_saldo')` untuk proses refund + voucher cleanup. Saat **accepted → cancelled** (therapist cancel after accept), panggil RPC **sebelum** redirect ke searching-therapist. |
| `apps/user/app/(main)/searching-therapist.tsx` | Realtime handler: saat status berubah **pending → cancelled** (therapist reject), panggil `supabase.rpc('refund_order_saldo')` dulu sebelum `setIsTimeout(true)`. |
| `apps/web/src/app/api/refund/create/route.ts` | Fix guard: `payment_method !== 'saldo'` → `!gatewayMethods.includes(order.payment_method)`. Sebelumnya `!==` membuat semua payment_method kecuali 'saldo' ketolak karena negasi ganda. |
| `supabase/migrations/20260627_add_refund_order_rpc.sql` | Ditambahkan `SECURITY DEFINER` — RPC sekarang bypass RLS, punya permission untuk DELETE voucher_usages, UPDATE vouchers, INSERT transactions. |

### Key decisions
- **`router.replace` dengan full params** lebih reliable daripada `router.back()` + pending state — pending state module variable bisa hilang saat order screen mount ulang. Semua params dikirim via URL, di-extract di order via `useLocalSearchParams()`.
- Therapist reject refund via Realtime: Refund diproses **client-side** via RPC call dalam Realtime handler. Tidak perlu perubahan di therapist app atau web API.
- RPC `refund_order_saldo` wajib `SECURITY DEFINER` — mobile client via `supabase.rpc()` hanya punya `authenticated` role dengan RLS terbatas. Tanpa SECURITY DEFINER, RPC gagal pada operasi INSERT transactions / DELETE voucher_usages / UPDATE vouchers walau SELECT FOR UPDATE berhasil.
- Voucher cleanup pada therapist cancel (kembalikan ke antrian) tidak diperlukan — order masih 'pending', voucher usage tetap valid. Jika tidak ada therapist yang pick up, user bisa cancel sendiri (refund + voucher cleanup berjalan normal).

### Remaining issues
- Realtime event bisa terlewat saat app di background. `fetchOrder()` hanya dipanggil di mount + Realtime — tidak ada polling periodik. Perlu `useFocusEffect` untuk re-fetch setiap kali screen fokus sebagai fallback.
- Therapist cancel flow langsung dari therapist app tidak ada notifikasi/trigger ke user app untuk refresh — user harus sudah di tracking/screen searching-therapist agar Realtime bekerja.

---

## Session 10 (Transaction history page — expandable cards — UI refinements)

### Problems addressed
1. Wallet "Lihat Semua" navigasi ke `/history` (tab) — tidak ada halaman khusus untuk riwayat transaksi.
2. Tidak ada filter tanggal dan pencarian di riwayat transaksi.
3. Card transaksi tidak bisa di-expand untuk lihat detail (ID, tipe, metode, dll).
4. Gambar layanan di services terlalu besar (120×120).
5. Tidak ada informasi perlengkapan therapist di halaman layanan.
6. Pin map masih pakai logo Kang Massage — tidak konsisten.
7. Tidak ada loading skeleton untuk card transaksi.

### Changes made
| File | Change |
|---|---|
| `apps/user/app/(main)/transaction-history.tsx` | **NEW** — Halaman khusus riwayat transaksi: search bar, filter chips (Semua/Hari Ini/Minggu Ini/Bulan Ini), date picker single date, semua transaksi (tanpa limit), expandable card detail. |
| `apps/user/app/(main)/wallet.tsx` | Hapus tombol History di header bar. "Lihat Semua" → `/transaction-history`. Card transaksi jadi expandable (ID, Tipe, Metode, Waktu, Status, Keterangan). Loading skeleton 3 card. Import `Skeleton`, `ChevronDown`. |
| `apps/user/app/(main)/_layout.tsx` | Register `transaction-history` screen. |
| `apps/user/app/(main)/services.tsx` | Image card 120×120 → 90×90. Tambah section "Perlengkapan yang Dibawa Terapis" (1 card white, horizontal scroll: Minyak, Handuk, Matras, Peralatan Lengkap). |
| `apps/user/app/(main)/maps.tsx` | Hapus logo KM dari center pin. Ganti SVG pin dengan bentuk MapPin murni (teardrop navy + circle putih). Hapus `pinUri` state, `Asset` import, `useEffect` load image. |

### Key decisions
- **Expandable card detail**: `expandedId` state, toggle on tap, detail panel muncul di bawah card dengan border separator.
- **Filter chips + date picker**: `activeFilter` state (all/today/week/month/custom) instead of inferring from dates — prevent double selection bug.
- **Single date picker**: Not date range — "Pilih tanggal" chip triggers one DateTimePicker, `activeFilter='custom'`.
- **Equipment section**: 1 white card wrapper with title inside + horizontal ScrollView of icon+label items, consistent with card design system.
- **Map pin**: SVG inline di LEAFLET_HTML, no base64 image conversion needed — simpler and faster.
- **TxSkeleton**: Pattern: Skeleton width/height mimic real card elements (icon 42×42, title 60%, date 40%, amount 80px).

### Relevant files
- `apps/user/app/(main)/transaction-history.tsx` — full transaction history page
- `apps/user/app/(main)/wallet.tsx` — expandable cards + skeleton
- `apps/user/app/(main)/services.tsx` — equipment slider
- `apps/user/app/(main)/maps.tsx` — SVG pin only

---

## Session 11 (Registration payment — GoPay/QRIS via Midtrans, admin CRUD perlengkapan)

### Goal
Ubah metode pembayaran pendaftaran mitra dari saldo wallet menjadi GoPay / QRIS seperti halaman topup.

### Problems addressed
1. Biaya pendaftaran & perlengkapan hanya bisa dibayar via saldo wallet — harus gopay/qris.
2. Admin tidak punya halaman untuk CRUD perlengkapan registrasi.
3. Belum ada endpoint untuk cek status pembayaran Midtrans di flow registrasi.
4. Halaman pembayaran font terlalu besar, safearea tidak konsisten.

### Changes made
| File | Change |
|---|---|
| `supabase/migrations/20260629_add_registration_payment.sql` | **NEW** — Tabel `registration_equipment`, `therapist_registration_payments`, kolom di `therapists` & `app_settings`, trigger `enforce_therapist_verified_for_online`, RLS, realtime. |
| `supabase/migrations/20260629_add_discount_price.sql` | **NEW** — Tambah kolom `discount_price` ke `registration_equipment`. |
| `supabase/migrations/20260629_add_is_mandatory.sql` | **NEW** — Tambah kolom `is_mandatory boolean default false`. |
| `supabase/migrations/20260629_add_registration_payment_external_id.sql` | **NEW** — Tambah kolom `external_id` untuk tracking Midtrans. |
| `apps/web/src/types/index.ts` | Interface `RegistrationEquipment` (termasuk `discount_price`, `is_mandatory`) & `TherapistRegistrationPayment`. Field `registration_fee_paid` dll di `Therapist`. |
| `apps/web/src/lib/settings.ts` & `api/settings/route.ts` | Field `therapist_registration_fee` & `registration_payment_required`. |
| `apps/web/src/app/dashboard/settings/page.tsx` | Tab "Pendaftaran Mitra": toggle wajib bayar + input nominal. |
| `apps/web/src/app/dashboard/registration-equipment/page.tsx` | **NEW** — CRUD perlengkapan: form + list + upload gambar, toggle aktif/nonaktif, toggle mandatory (pill button), badge "Wajib". |
| `apps/web/src/app/api/registration-equipment/route.ts` + `[id]/route.ts` | **NEW** — CRUD API perlengkapan dengan `is_mandatory`. |
| `apps/web/src/app/api/therapists/registration-payment/route.ts` | POST **diubah** dari wallet ke Midtrans gopay/qris. GET tetap untuk status overview. |
| `apps/web/src/app/api/therapists/registration-payment/check-status/route.ts` | **NEW** — Cek status Midtrans transaction + mark paid jika settlement/capture. |
| `apps/therapist/app/(main)/registration-payment.tsx` | **REWRITE** — 4 state screen (loading/ready/pending_payment/success/error). GoPay icon pakai `require('@/assets/Gopay.png')`. Font diperkecil, safearea konsisten. |

### Key decisions
- Pembayaran via Midtrans Core API (langsung charge, bukan Snap) mengikuti pola topup yang sudah ada.
- Payment verification via polling: therapist tap "Cek Status Pembayaran" → backend call Midtrans status API → mark paid jika settlement.
- `is_mandatory` dibuat kolom terpisah (not in original CREATE TABLE) — migration sendiri.
- GoPay image icon pakai file assets `Gopay.png`, bukan Ionicons logo-bitcoin.

### Migrations to run (Supabase SQL Editor)
1. `20260629_add_registration_payment.sql`
2. `20260629_add_discount_price.sql`
3. `20260629_add_is_mandatory.sql`
4. `20260629_add_registration_payment_external_id.sql`

### Next steps
- Deploy `apps/web` ke production agar endpoint baru aktif.
- Test end-to-end: admin set fee & equipment → therapist login → pilih perlengkapan → bayar gopay/qris → cek status → sukses.
- Pastikan Storage bucket `registration-equipment` dibuat di Supabase Dashboard untuk upload gambar.

---

## Session 12 (Therapist withdrawal daily limit, min initial topup, registration info modal)

### Problems addressed
1. Therapist withdrawal tidak punya batas harian — berbeda dengan user yang sudah punya daily limit (Rp 3jt / 3× per hari).
2. Therapist baru bisa online dengan saldo Rp 0 — tidak ada minimal topup awal untuk akun baru.
3. Halaman daftar terapis tidak menampilkan informasi biaya pendaftaran dan minimal topup — user baru bingung harus menyiapkan apa.
4. Banner "Selesaikan Pembayaran" di profil therapist lebarnya tidak konsisten dengan card di bawahnya (double indentation dari marginHorizontal + parent padding).

### Changes made
| File | Change |
|---|---|
| `supabase/migrations/20260630_add_min_initial_topup_setting.sql` | **NEW** — Tambah kolom `therapist_min_initial_topup` di `app_settings` (default 0). Update trigger `enforce_therapist_verified_for_online` — cek total completed topups subquery, force offline jika < minimal. |
| `apps/web/src/app/api/withdraw/create/route.ts` | Added daily limit check (nominal + count) untuk therapist — menggunakan `withdrawal_daily_limit` & `withdrawal_max_count_per_day` dari `app_settings`. Query `therapist_withdrawals` hari ini status pending/completed. |
| `apps/web/src/app/api/settings/route.ts` | Field `therapist_min_initial_topup` di GET/PUT response + allowedFields. |
| `apps/web/src/lib/settings.ts` | Tipe `AppSettings` + default `therapist_min_initial_topup: 0` + mapping di `getAppSettings()`. |
| `apps/web/src/app/dashboard/settings/page.tsx` | Tab Withdrawal: label & deskripsi diperjelas "(Berlaku untuk User & Mitra)". Tab Pendaftaran Mitra: section "Topup Awal Mitra Baru" — input `therapist_min_initial_topup`. |
| `apps/therapist/store/therapistStore.ts` | `toggleOnline()` — fetch `therapist_min_initial_topup` dari `app_settings`, query sum completed `therapist_topups`, throw error jika belum terpenuhi. |
| `apps/therapist/app/(tabs)/profile.tsx` | `handleToggle` — catch error dari `toggleOnline()` dan tampilkan `showAlert`. Hapus `marginHorizontal: SPACING.lg` dari `verificationBanner` style agar lebar konsisten dengan card di bawahnya. |
| `apps/therapist/lib/appSettings.ts` | Tipe `AppSettings` + default + mapping untuk `therapist_min_initial_topup`. |
| `apps/therapist/app/(auth)/register.tsx` | **NEW** — Info modal saat masuk halaman daftar. Menampilkan daftar dokumen yang perlu disiapkan (data diri, KTP, keahlian, sertifikat, selfie), biaya pendaftaran (card, jika > 0), minimal topup awal (card, jika > 0). Data dari `getAppSettings()`. Tombol "Lanjutkan". Tidak muncul di continueMode. |

### Key decisions
- Daily limit therapist menggunakan setting yang sama dengan user (`withdrawal_daily_limit`, `withdrawal_max_count_per_day`) — admin atur di tab Withdrawal Settings.
- Minimal topup awal di-enforce di 2 tempat: **DB trigger** (`enforce_therapist_verified_for_online`) dan **client-side** (`therapistStore.toggleOnline`) — defense in depth.
- Info modal di register hanya muncul saat pertama kali masuk (bukan continue mode), agar user yang lanjut OTP tidak terganggu.
- Nominal biaya pendaftaran & minimal topup di modal bersifat dinamis dari `app_settings` — tidak hardcoded.

### Migrations to run (Supabase SQL Editor)
1. `20260630_add_min_initial_topup_setting.sql`

### Next steps
- Jalankan migration `20260630_add_min_initial_topup_setting.sql` di Supabase SQL Editor.
- Test daily limit therapist: buat 3x withdrawal dalam sehari → ke-4 harus ditolak.
- Test min initial topup: set Rp 50rb di admin → buat akun baru → coba online tanpa topup → harus ditolak.
- Test info modal di register: buka halaman daftar → modal muncul → "Lanjutkan" → form.
