# App Pijat On-Demand - Project Instructions

This document provides foundational mandates, architectural guidance, and development workflows for the App Pijat On-Demand project.

## 🏗 Project Overview
A lightweight, fullstack on-demand massage service platform optimized for low-resource development environments.

### Tech Stack
- **Monorepo Structure:** Managed via npm workspaces.
  - `apps/user`: React Native (Expo) app for customers.
  - `apps/therapist`: React Native (Expo) app for therapists.
  - `apps/web`: Next.js 14 (App Router) for Admin Dashboard and API Backend.
- **Database & Auth:** Supabase (PostgreSQL).
- **Styling:** TailwindCSS (Web) and NativeWind (Mobile).
- **State Management:** Zustand and React Query.
- **Maps:** `react-native-maps`.

## 🎨 Design System & UI/UX
Strict adherence to the "Premium Modern" aesthetic is mandatory.

### Visual Style
- **Aesthetics:** Glassmorphism, premium gradients, subtle shadows, and smooth animations.
- **Borders:** Rounded corners (20px–40px) for cards and buttons.
- **Colors:**
  - **Primary:** Deep Purple (#6A0DAD) or Navy Blue (#1E1B4B)
  - **Secondary:** Soft Gold (#FDB927) or Orange (#F97316)
  - **Backgrounds:** Slate (#0F172A) for Dark Mode, White (#FFFFFF) for Light Mode.
  - **Feedback:** Emerald (#10B981) for success, Amber (#F59E0B) for warning, Red (#EF4444) for danger.

### Component Guidelines
- Use reusable components (Custom Button, Input Field, Gradient Card).
- Ensure consistent spacing and typography across all platforms.
- Prioritize high-quality icons (Lucide/Expo Vector Icons).

## 🛠 Development Workflow
- **Simplicity over Scalability:** Avoid complex microservices or heavy background workers. Use Next.js API routes and Supabase Realtime/Polling.
- **Surgical Updates:** When modifying code, maintain the existing architectural patterns and naming conventions.
- **Verification:** Always validate changes across the relevant platforms (User, Therapist, or Web).

## 📂 Key File Locations
- **Database Schema:** `supabase/schema.sql` and `supabase/migrations/`.
- **Shared Config:** Root `package.json` and `tsconfig.json`.
- **User App Logic:** `apps/user/app/`, `apps/user/components/`, `apps/user/lib/`.
- **Therapist App Logic:** `apps/therapist/app/`, `apps/therapist/components/`, `apps/therapist/lib/`.
- **Admin/Web Logic:** `apps/web/src/app/`, `apps/web/src/components/`.

## 🔐 Security & Secrets
- Never commit `.env` files or hardcode API keys.
- Use `lib/config.ts` or similar patterns to manage environment-specific variables.
- Always use Supabase RLS (Row Level Security) when interacting with the database from the client.

## 📝 Documentation
- Maintain `progress-develop.md` for tracking feature implementation.
- Update `GEMINI.md` as architectural decisions or team-wide conventions evolve.
