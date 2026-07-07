'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, ShoppingBag, Store, BarChart3, Star,
  LogOut, Menu, X, ChevronLeft, Bell, Search, Sun, Moon, User, Settings, Home, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import Avatar from '@/components/ui/avatar';
import NavigationLoader from './navigation-loader';
import { useNotifications } from '@/hooks/use-notifications';
import NotificationBell from '@/components/ui/notification-bell';

interface DashboardLayoutProps {
  children: ReactNode;
  role: 'vendor' | 'delivery' | 'admin';
  navItems: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }[];
}

export default function DashboardLayout({ children, role, navItems }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, sidebarOpen, setSidebarOpen, theme, toggleTheme } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const handleLogout = async () => {
    const supabase = createClient();
    if (role === 'delivery' && user) {
      await supabase.from('delivery_persons')
        .update({ online_status: 'offline', latitude: 0, longitude: 0 })
        .eq('user_id', user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  const roleColors = {
    vendor: 'bg-blue-500',
    delivery: 'bg-green-500',
    admin: 'bg-[var(--color-primary)]',
  };

  return (
    <>
      <NavigationLoader />
      <div className="min-h-screen bg-[var(--color-surface)]">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-[var(--color-background)] border-r border-[var(--color-border)] transition-all duration-300 flex flex-col',
          collapsed ? 'w-20' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-border)]">
          <Link href={`/${role}`} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm">
              <img src="/logo-original.jpeg" alt="Wassel" className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <span className="text-lg font-extrabold tracking-tight text-[var(--color-text-primary)]">Wassel</span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
          >
            <ChevronLeft className={cn('w-4 h-4 text-[var(--color-text-secondary)] transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-orange-500/25'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]',
                  collapsed && 'justify-center px-3'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={cn('transition-all duration-300', collapsed ? 'lg:ml-20' : 'lg:ml-64')}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[var(--color-background)] border-b border-[var(--color-border)] h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
            >
              <Menu className="w-5 h-5 text-[var(--color-text-primary)]" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[var(--color-text-primary)]" /> : <Moon className="w-5 h-5 text-[var(--color-text-primary)]" />}
            </button>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
            />
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-3 border-l border-[var(--color-border)] hover:opacity-80 transition-opacity"
              >
                <Avatar name={user?.full_name || 'User'} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] capitalize">{role}</p>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-[var(--color-text-secondary)] hidden sm:block transition-transform', userMenuOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="p-1 space-y-0.5">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <Home className="w-4 h-4" />
                        Home
                      </Link>
                      <Link
                        href={`/${role}/settings`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <hr className="border-[var(--color-border)] my-1" />
                      <button
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
    </>
  );
}
