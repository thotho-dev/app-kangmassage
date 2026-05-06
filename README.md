# Pijat On-Demand Platform

A production-ready fullstack on-demand massage service platform.

## Architecture

- **Frontend (Web)**: Next.js 14 (App Router), TailwindCSS, Lucide Icons, Recharts.
- **Mobile (Apps)**: React Native Expo, NativeWind (Tailwind), Zustand, React Query.
- **Backend**: Next.js API Routes (Route Handlers).
- **Database & Auth**: Supabase (PostgreSQL).

## Project Structure

```
/
├── apps/
│   ├── web/                # Admin Dashboard & API Backend
│   ├── mobile/
│   │   ├── user/           # User Mobile App (Expo)
│   │   └── therapist/      # Therapist Mobile App (Expo)
├── supabase/
│   └── schema.sql          # Database Schema & Seed Data
├── package.json            # Monorepo Workspace Config
└── README.md
```

## Getting Started

### 1. Database Setup
- Create a new project on [Supabase](https://supabase.com).
- Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor.

### 2. Environment Variables
- Copy `apps/web/.env.local.example` to `apps/web/.env.local`.
- Fill in your Supabase credentials.

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Servers
- **Web Admin**: `npm run web` (starts on port 3000)
- **User App**: `npm run mobile:user`
- **Therapist App**: `npm run mobile:therapist`

## Design System
- **Primary Color**: Deep Purple (#6A0DAD)
- **Secondary Color**: Soft Gold (#FDB927)
- **Background**: Dark Mode Slate (#0F172A)
- **UI Style**: Glassmorphism, Premium Gradients, Rounded Corners (24px-40px).

## Features
- **Admin**: Analytics, User/Therapist management, Services CRUD, Vouchers, Real-time Order Monitoring.
- **User**: OTP Auth, Service Booking, Real-time Tracking, Wallet, Order History.
- **Therapist**: Online/Offline toggle, Real-time Order Requests, Active Job workflow, Earnings Dashboard.
