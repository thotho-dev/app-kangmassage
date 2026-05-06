Generate a lightweight fullstack on-demand massage service platform (similar to ride-hailing apps) optimized for low-resource development environments.

The system must use a simplified architecture:

- Frontend (mobile): React Native (Expo)
- Backend + Dashboard: Next.js (App Router with API routes)
- Database & Auth: Supabase
- No Redis, no background workers, no microservices (keep it simple)

The goal is to create a functional MVP that can run on a low-spec laptop and support early-stage usage.

---

## 🧠 CORE FEATURES

### User App (Mobile)
- WhatsApp OTP authentication (mock if needed)
- Home screen with services
- Create order (choose service & location)
- Order tracking (polling-based, supabase realtime)
- Payment flow (mock Midtrans integration)
- Wallet (basic)
- Order history
- Push notifications (mock or basic FCM)

---

### Therapist App (Mobile)
- Login
- Online / offline toggle
- Receive order requests
- Accept / reject order
- View active job
- Basic earnings page

---

### Admin Dashboard (Web - Next.js)
- Login (admin role)
- View users
- View therapists
- Monitor orders
- Basic analytics (total orders, revenue)
- CRUD services & vouchers

---

## ⚙️ BACKEND (NEXT.JS API ROUTES)

Implement all backend logic using Next.js route handlers:

Modules:
- auth (OTP-based login)
- users
- therapists
- orders
- payments (mock Midtrans)
- wallet
- vouchers
- notifications (basic)

---

## 🧠 MATCHING LOGIC (SIMPLIFIED)

- Fetch nearest therapists from database
- Sort by distance and rating
- Select top 3 therapists
- Send notification (mock)
- First therapist to accept gets assigned
- Update order status in database

No Redis, no queue system.

---

## 🗄️ DATABASE (SUPABASE)

Create schema with:

Tables:
- users
- therapists
- therapist_locations
- orders
- order_logs
- transactions
- vouchers

Include relationships and basic indexing.

---

## 🔐 AUTHENTICATION

- Use Supabase Auth (phone-based or mock OTP)
- JWT session handling

---

## 📱 MOBILE (EXPO)

Use:
- Expo (React Native)
- TypeScript
- Zustand (state)
- React Query (API calls)
- React Navigation
- Expo Vector Icons
- Expo BlurView
- Expo LinearGradient


---

## 🌐 WEB (NEXT.JS)

Use:
- Next.js App Router
- TypeScript
- TailwindCSS
- Server Actions (optional)
- API routes for backend

---

## 🔁 DATA FETCHING

- Use polling (every 3–5 seconds) for order status updates
- No WebSocket required use supabase realtime 

---

## 💳 PAYMENT

- Integrate Midtrans (mock implementation)
- Create payment endpoint
- Handle webhook (simulated)

---

## 🔔 NOTIFICATIONS

- Use Firebase Cloud Messaging (mock or basic setup)
- Trigger notification on:
  - new order
  - order accepted
  - order completed
  - order rejected
  - order cancelled
  - payment success
  - payment failed
  - payment cancelled

  

---

## 🎯 NON-FUNCTIONAL REQUIREMENTS

- Must run on low-spec laptop
- Minimal dependencies
- Clean and modular code structure
- Easy to upgrade later to Redis + VPS architecture
- Use environment variables properly

---

## 📁 PROJECT STRUCTURE

- apps/mobile/user (Expo app)
- apps/mobile/therapist (Expo app)
- apps/web/ (Next.js app with API + dashboard)
- supabase/schema.sql
- admin (Next.js app with API + dashboard)


---

## 🚀 OUTPUT

Generate:
- Full project structure
- Ready-to-run code
- Supabase schema SQL
- Example API endpoints
- Premium modern UI screens for mobile & dashboard 

Ensure everything is simple, clean, and optimized for development speed, not scalability.


## 📝 DESIGN SPECIFICATIONS (CRITICAL)

Mobile apps must use Tailwind / NativeWind with a premium, modern design (not basic React Native defaults).

### Mobile UI Guidelines (Expo)
Use this design style for all screens:
- Card-based layouts with subtle shadows
- Premium gradients and overlays
- Dark mode support (optional)
- Smooth animations (fade, slide)
- High-quality icons
- Clean typography
- Rounded corners (20px–30px)

### Colors
Use a premium palette:
- Primary: Navy Blue (#1E1B4B)
- Secondary: Orange (#F97316)
- Success: Emerald (#10B981)
- Warning: Amber (#F59E0B)
- Danger: Red (#EF4444)
- Info: Sky Blue (#06B6D4)
- Black: #0F172A
- Backgrounds: dark mode style (#0F172A or similar) or light mode style (#F9FAFB or similar) or white (#FFFFFF)
- Text: white (light mode) / #94A3B8 (dark mode) / light gray

### Screen Mockups
Generate these screens with premium design:

#### User App
1. Splash screen
2. Onboarding screens (3 screens)
3. Login / OTP screen
4. Home screen (list of services with images)
5. Order creation screen (choose location, service)
6. Order tracking (map placeholder, real-time status updates)
7. Payment screen (Midtrans mock)
8. Wallet screen
9. Order history list
10. Profile & settings
11. Forgot password screen
12. Change password screen
13. Change phone number screen

#### Therapist App
1. Splash screen
2. Onboarding screens (3 screens)
3. Login / OTP screen
4. Dashboard (online/offline toggle, current earnings)
4. New order notification screen
5. Active order screen
6. Earnings history
7. Profile & settings
8. Forgot password screen
9. Change password screen
10. Change phone number screen

#### Admin Dashboard
1. Login screen
2. Dashboard (overview, charts)
3. Users list screen
4. Therapists list screen
5. Orders monitor screen
6. Services management (CRUD)
7. Vouchers management
8. Settings screen
9. Reports screen
10. Add new service screen
11. Edit service screen
12. Delete service screen
13. Add new voucher screen
14. Edit voucher screen
15. Delete voucher screen


### Styling Library
Use NativeWind for all UI. Implement reusable components like:
- Custom button component
- Input field component
- Gradient card component
- Status badge component
- Premium navigation bar






