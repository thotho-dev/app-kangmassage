'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShoppingBag,
  Tag,
  Ticket,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  Package,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const supabase = createClient();

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/dashboard/users', label: t('users'), icon: Users },
    { href: '/dashboard/therapists', label: t('therapists'), icon: UserCheck },
    { href: '/dashboard/orders', label: t('orders'), icon: ShoppingBag },
    { href: '/dashboard/services', label: t('services'), icon: Tag },
    { href: '/dashboard/vouchers', label: t('vouchers'), icon: Ticket },
    { href: '/dashboard/reports', label: t('reports'), icon: BarChart3 },
    { href: '/dashboard/settings', label: t('settings'), icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      // Fallback if supabase fails
      localStorage.clear();
      router.push('/login');
    }
  };

  const Sidebar = () => (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-ui-border">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/10 flex-shrink-0 overflow-hidden">
          <img src="/logo-kang-massage.png" alt="Logo" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-text-primary text-base leading-tight">{t('pijat_admin')}</h1>
          <p className="text-text-muted text-xs">{t('on_demand_platform')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={clsx('nav-item', isActive && 'nav-item-active')}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-ui-border">
        <button 
          onClick={() => setShowLogoutConfirm(true)} 
          className="nav-item w-full text-danger hover:bg-danger/5"
        >
          <LogOut className="w-5 h-5" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-card border-r border-ui-border flex-shrink-0 z-40">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-ui-border">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
            >
              <X className="w-6 h-6" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-ui-border px-6 py-4 flex items-center justify-between z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-text-muted hover:text-text-primary"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-opacity-80 transition-colors border border-ui-border"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-warning" />
              ) : (
                <Moon className="w-5 h-5 text-primary" />
              )}
            </button>

            <button className="relative w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-opacity-80 transition-colors border border-ui-border">
              <Bell className="w-5 h-5 text-text-muted" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full" />
            </button>

            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 border border-ui-border">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-white">A</span>
              </div>
              <span className="text-sm text-text-secondary font-medium hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <ConfirmModal 
        isOpen={showLogoutConfirm}
        title="Keluar Akun?"
        message="Apakah Anda yakin ingin keluar dari aplikasi admin? Sesi Anda akan diakhiri."
        confirmText="Ya, Keluar"
        cancelText="Batal"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        type="danger"
      />
    </div>
  );
}
