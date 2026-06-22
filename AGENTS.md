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
