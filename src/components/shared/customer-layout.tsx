'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Search, ShoppingCart, Clock, User, Heart,
  MessageSquare, Settings, LogOut, ChevronDown, Sun, Moon, ArrowLeft, Globe, ArrowUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/i18n';
import NavigationLoader from './navigation-loader';
import { useNotifications } from '@/hooks/use-notifications';
import NotificationBell from '@/components/ui/notification-bell';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, getCartCount, theme, toggleTheme } = useAppStore();
  const { t, language, setLanguage } = useI18n();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const navItems = [
    { href: '/', icon: Home, label: t('nav.home') },
    { href: '/stores', icon: Search, label: t('nav.explore') },
    { href: '/orders', icon: Clock, label: t('nav.orders') },
    { href: '/chat', icon: MessageSquare, label: t('nav.messages') },
    { href: '/favorites', icon: Heart, label: t('nav.favorites') },
    { href: '/profile', icon: User, label: t('nav.profile') },
  ];

  const isHome = pathname === '/';
  const isSubPage =
    !isHome &&
    pathname !== '/stores' &&
    pathname !== '/cart' &&
    pathname !== '/orders' &&
    pathname !== '/favorites' &&
    pathname !== '/profile' &&
    pathname !== '/chat' &&
    pathname !== '/settings';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ar', label: 'العربية', flag: '🇹🇳' },
  ];

  const currentLang = languages.find(l => l.code === language);

  return (
    <>
      <NavigationLoader />
      <div className="min-h-screen bg-[var(--color-background)]" dir={language === 'ar' ? 'rtl' : 'ltr'}>

        {/* ========== DESKTOP HEADER (lg+) ========== */}
        <header className="hidden lg:flex sticky top-0 z-40 items-center gap-4 h-16 px-6 bg-[var(--color-background)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
          {/* Left – Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
              <img
                src="/logo-original.jpeg"
                alt="Wassel"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight text-[var(--color-text-primary)]">Wassel</span>
              <span className="text-[10px] font-medium text-[var(--color-text-secondary)] -mt-0.5">Deliver Everything</span>
            </div>
          </Link>

          {/* Center – Search bar */}
          <Link
            href="/stores"
            className="flex items-center gap-3 flex-1 max-w-md mx-auto px-4 py-2.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] transition-colors"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="text-sm">{t('nav.search')}</span>
          </Link>

          {/* Right – Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => { setLangMenuOpen(!langMenuOpen); setUserMenuOpen(false); }}
                className="p-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors flex items-center gap-1"
                title="Language"
              >
                <Globe className="w-5 h-5 text-[var(--color-text-primary)]" />
                <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase">{language}</span>
              </button>
              <AnimatePresence>
                {langMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-40 bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-50"
                    >
                      <div className="p-1.5">
                        {languages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setLanguage(lang.code as 'en' | 'fr' | 'ar');
                              setLangMenuOpen(false);
                            }}
                            className={cn(
                              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                              language === lang.code
                                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
                            )}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-[var(--color-text-primary)]" />
              ) : (
                <Moon className="w-5 h-5 text-[var(--color-text-primary)]" />
              )}
            </button>

            <Link href="/chat" className="p-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
              <MessageSquare className="w-5 h-5 text-[var(--color-text-primary)]" />
            </Link>

            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
            />

            <Link href="/cart" className="relative p-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
              <ShoppingCart className="w-5 h-5 text-[var(--color-text-primary)]" />
              {getCartCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {getCartCount()}
                </span>
              )}
            </Link>

            {/* User area */}
            {user ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[var(--color-surface)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-[var(--color-text-secondary)] transition-transform',
                      userMenuOpen && 'rotate-180'
                    )}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-[var(--color-border)]">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {user?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] capitalize">
                            {user?.role || 'customer'}
                          </p>
                        </div>
                        <div className="p-1.5">
                          <Link
                            href="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <User className="w-4 h-4" />
                            {t('nav.profile')}
                          </Link>
                          {user?.role && user.role !== 'customer' && (
                            <Link
                              href={`/${user.role}`}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                              {t('nav.dashboard')}
                            </Link>
                          )}
                          <Link
                            href="/orders"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                            {t('nav.myOrders')}
                          </Link>
                          <Link
                            href="/settings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            {t('nav.settings')}
                          </Link>
                          <hr className="border-[var(--color-border)] my-1" />
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            {t('nav.signOut')}
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium rounded-xl text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
                >
                  {t('nav.getStarted')}
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* ========== MOBILE HEADER ========== */}
        <header className="lg:hidden sticky top-0 z-40 bg-[var(--color-background)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2">
              {isSubPage ? (
                <button
                  onClick={handleBack}
                  className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
                </button>
              ) : (
                <Link href="/" className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm">
                    <img
                      src="/logo-original.jpeg"
                      alt="Wassel"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-base font-extrabold tracking-tight text-[var(--color-text-primary)]">Wassel</span>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Language Switcher Mobile */}
              <div className="relative">
                <button
                  onClick={() => { setLangMenuOpen(!langMenuOpen); }}
                  className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
                >
                  <Globe className="w-5 h-5 text-[var(--color-text-primary)]" />
                </button>
                <AnimatePresence>
                  {langMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-40 bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden z-50"
                      >
                        <div className="p-1.5">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setLanguage(lang.code as 'en' | 'fr' | 'ar');
                                setLangMenuOpen(false);
                              }}
                              className={cn(
                                'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                                language === lang.code
                                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]'
                              )}
                            >
                              <span className="text-lg">{lang.flag}</span>
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-[var(--color-text-primary)]" />
                ) : (
                  <Moon className="w-5 h-5 text-[var(--color-text-primary)]" />
                )}
              </button>
              <Link href="/chat" className="p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
                <MessageSquare className="w-5 h-5 text-[var(--color-text-primary)]" />
              </Link>
              <Link href="/cart" className="relative p-2 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
                <ShoppingCart className="w-5 h-5 text-[var(--color-text-primary)]" />
                {getCartCount() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {getCartCount()}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* ========== MAIN CONTENT (full-width, no sidebar) ========== */}
        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] pb-20 lg:pb-4">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>

        {/* ========== MOBILE BOTTOM NAV ========== */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-background)]/80 backdrop-blur-xl border-t border-[var(--color-border)] lg:hidden safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-1">
            {navItems.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[56px]',
                    isActive
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  )}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute -top-0.5 w-5 h-0.5 bg-[var(--color-primary)] rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Back to top */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-24 right-4 z-50 lg:bottom-6 lg:right-6 w-12 h-12 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-full shadow-lg hover:shadow-xl hover:border-[#FF6B00]/50 flex items-center justify-center transition-all duration-200 hover:-translate-y-1 cursor-pointer"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
