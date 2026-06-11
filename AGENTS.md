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

No typecheck, test, or formatter scripts configured. No pre-commit hooks.

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
1. **CRASH on login**: `foregroundServiceTypes: ['dataSync']` in notifee.ts mismatched Notifee AAR's manifest (`android:foregroundServiceType="shortService"`). Android 14+ kills the process → app closes immediately after login.
2. **Broadcast orders silently dropped**: Location check (`if (status !== 'granted') return;`) was blocking all broadcast orders when GPS/permission unavailable.
3. **No guards on FG service**: `startOrderForegroundService` / `stopOrderForegroundService` could be called multiple times during hot reload or rapid online/offline toggle, causing race conditions.
4. **No dedup on order notifications**: Repeated order events could trigger multiple notification displays.
5. **Cold start race**: No delay on subscription start; UI could be unresponsive while subscription setup runs.
6. **AppState handler unthrottled**: Every foreground transition triggered immediate checkPendingOrders, potentially overloading Supabase.

### Fixes applied
| File | Fix |
|---|---|
| `lib/notifee.ts:325` | **REMOVED** `foregroundServiceTypes` — manifest declares `shortService`, code was sending `dataSync`, causing crash on Android 14+ |
| `lib/notifee.ts:294-295` | Added `_fgStarting`/`_fgActive` guards to prevent duplicate FG start/stop |
| `lib/notifee.ts:12,359-364` | Added `recentOrderIds` dedup Set (60s TTL) — skip duplicate order notifications |
| `lib/notifee.ts:15-26` | Extracted `cancelOrderNotifications()` to shared helper (was inline in IncomingOrderModal) |
| `hooks/useOrderListener.ts:143-162` | Made location check **non-blocking** — if GPS fails or permission denied, order proceeds with warning instead of being dropped |
| `hooks/useOrderListener.ts:48` | Added 500ms startup delay for subscription setup |
| `hooks/useOrderListener.ts:99` | `Promise.allSettled` for parallel active orders + skills check |
| `hooks/useOrderListener.ts:18` | `cleanupRef` for proper subscription teardown |
| `index.js:37-43` | `_fgRegistered` guard prevents duplicate `registerForegroundService` handlers |
| `app/(tabs)/_layout.tsx:255-264` | AppState handler debounced (800ms) |
| `app/(tabs)/_layout.tsx:45-86` | `checkPendingOrders` skip-duplicate logic — don't query if incoming order already exists |
| `app.json` | compileSdkVersion 34→35, targetSdkVersion 35, added `FOREGROUND_SERVICE_DATA_SYNC` permission |

### Notifee AAR manifest (found in AAR, not source)
```
node_modules/@notifee/react-native/android/libs/.../core/.../*.aar
  → AndroidManifest.xml:
    <service android:name="app.notifee.core.ForegroundService"
             android:foregroundServiceType="shortService" />
```
- **`shortService`** = Android 14+ type with ~3-minute timeout
- No `<service android:foregroundServiceType="dataSync">` — hence `dataSync` in notification caused crash
- This also means FG service auto-stops after ~3 min on Android 14+ (separate issue)

### Fixes applied (cont.)
| File | Fix |
|---|---|
| `plugins/withNotifeeExtendedFgType.js` | **NEW** Expo config plugin — adds `dataSync` to Notifee's `ForegroundService` manifest declaration (changes `shortService` to `dataSync,shortService`), so FG service runs indefinitely on Android 14+ |
| `app.json` | Registered `withNotifeeExtendedFgType` plugin |
| `lib/notifee.ts:325` | Restored `foregroundServiceTypes: ['dataSync']` after manifest fix |

### Remaining issues
- ~~**3-minute FG service timeout**~~ ✅ FIXED via `withNotifeeExtendedFgType` plugin
- **Redmi Note 13 install failure**: "Aplikasi tidak terinstal" — suspected MIUI Security / Play Protect / APK corruption. Not code-related.
- **ANR on physical Xiaomi**: Could not reproduce on emulator. May be related to FG service timeout → disconnection → reconnection storm.

### Next test plan
1. `npx expo run:android` (dev build) — verify no crash on login
2. Test Terima/Tolak from notification tray (background + killed)
3. Test broadcast orders with GPS off
4. Test online/offline toggle rapid switching
5. EAS build (`eas build --platform android --profile preview`) for standalone test

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
