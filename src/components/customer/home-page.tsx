'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import { Search, ArrowRight, Star, MapPin, Clock, Truck, Shield, Zap, Sparkles, ChevronRight, ChevronDown, Quote, Menu, X, Smartphone, Award, TrendingUp, Users, Package, LogOut, Sun, Moon, ShoppingCart, User, LayoutDashboard, Settings, Globe, Utensils, ShoppingBag, Pill, Flower2, PawPrint, Laptop, Shirt, Dumbbell, Baby, PenTool, Store } from 'lucide-react';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store';
import { useI18n } from '@/i18n';

function useCountUp(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || end <= 0) return;
    let startTime: number;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return { count, ref };
}

const lucideIconMap: Record<string, React.ComponentType<any>> = {
  utensils: Utensils,
  'shopping-cart': ShoppingBag,
  shopping: ShoppingBag,
  pill: Pill,
  'flower-2': Flower2,
  flower: Flower2,
  'paw-print': PawPrint,
  paw: PawPrint,
  laptop: Laptop,
  shirt: Shirt,
  dumbbell: Dumbbell,
  baby: Baby,
  'pen-tool': PenTool,
  store: Store,
};

function FadeUp({ children, delay = 0, className = '', y = 30 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

const processSteps = [
  { icon: '📍', titleKey: 'home.processStep1Title', descKey: 'home.processStep1Desc' },
  { icon: '🛍️', titleKey: 'home.processStep2Title', descKey: 'home.processStep2Desc' },
  { icon: '🚀', titleKey: 'home.processStep3Title', descKey: 'home.processStep3Desc' },
];

  interface DbCategory { id: string; name: string; name_ar: string; name_fr: string; icon: string; image_url: string; }
interface DbStore { id: string; name: string; rating: number; total_orders: number; image_url: string; cover_url: string; }
interface DbReview { id: string; rating: number; comment: string; created_at: string; profiles: { full_name: string } | null; }

export default function HomePage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const getCartCount = useAppStore((s) => s.getCartCount);
  const { t, language, setLanguage } = useI18n();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);

  const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
  const [dbStores, setDbStores] = useState<DbStore[]>([]);
  const [dbReviews, setDbReviews] = useState<DbReview[]>([]);
  const [dbStats, setDbStats] = useState({ stores: 0, users: 0, orders: 0, rating: 0 });

  useEffect(() => {
    const supabase = createClient();
    const loadData = async () => {
      const [catRes, storeRes, reviewRes, statsRes] = await Promise.all([
        supabase.from('categories').select('id, name, name_ar, name_fr, icon, image_url').order('sort_order').limit(10),
        supabase.from('stores').select('id, name, rating, total_orders, image_url, cover_url').eq('status', 'approved').order('total_orders', { ascending: false }).limit(6),
        supabase.from('reviews').select('id, rating, comment, created_at, user_id').order('created_at', { ascending: false }).limit(50),
        fetch('/api/stats').then(r => r.json()).catch(() => ({ users: 0, stores: 0, orders: 0, rating: 0 })),
      ]);
      if (catRes.data) setDbCategories(catRes.data);
      if (storeRes.data) setDbStores(storeRes.data);
      if (reviewRes.data) {
        const reviews = reviewRes.data as any[];
        const userIds = [...new Set(reviews.map((r: any) => r.user_id).filter(Boolean))];
        const { data: profiles } = userIds.length > 0
          ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
          : { data: [] };
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const merged = reviews.map((r: any) => ({
          ...r,
          profiles: profileMap.get(r.user_id) || { full_name: 'User' },
        }));
        setDbReviews(merged as unknown as DbReview[]);
      }
      setDbStats({
        stores: statsRes.stores || 0,
        users: statsRes.users || 0,
        orders: statsRes.orders || 0,
        rating: statsRes.rating || 0,
      });
    };
    loadData();
  }, []);

  const categoryNameMap: Record<string, { en: string; fr: string; ar: string }> = {
    'Food': { en: 'Food', fr: 'Nourriture', ar: 'طعام' },
    'Groceries': { en: 'Groceries', fr: 'Épicerie', ar: 'بقالة' },
    'Pharmacy': { en: 'Pharmacy', fr: 'Pharmacie', ar: 'صيدلية' },
    'Flowers': { en: 'Flowers', fr: 'Fleurs', ar: 'زهور' },
    'Pets': { en: 'Pets', fr: 'Animaux', ar: 'حيوانات أليفة' },
    'Electronics': { en: 'Electronics', fr: 'Électronique', ar: 'إلكترونيات' },
    'Fashion': { en: 'Fashion', fr: 'Mode', ar: 'أزياء' },
    'Sports': { en: 'Sports', fr: 'Sports', ar: 'رياضة' },
    'Pizza': { en: 'Pizza', fr: 'Pizza', ar: 'بيتزا' },
    'Burgers': { en: 'Burgers', fr: 'Burgers', ar: 'برغر' },
    'Sushi': { en: 'Sushi', fr: 'Sushi', ar: 'سوشي' },
    'Desserts': { en: 'Desserts', fr: 'Desserts', ar: 'حلويات' },
    'Baby': { en: 'Baby', fr: 'Bébé', ar: 'طفل' },
    'Stationery': { en: 'Stationery', fr: 'Papeterie', ar: 'مستلزمات مكتبية' },
  };

  const categories = dbCategories.length > 0 ? dbCategories.map(c => {
    const translated = categoryNameMap[c.name];
    const displayName = translated
      ? (language === 'ar' ? (c.name_ar || translated.ar) : language === 'fr' ? (c.name_fr || translated.fr) : c.name)
      : (language === 'ar' ? (c.name_ar || c.name) : language === 'fr' ? (c.name_fr || c.name) : c.name);
    return {
      name: displayName, iconName: c.icon || '', bg: '#FFF0E6',
      image_url: c.image_url,
    };
  }) : [
    { name: 'Food', iconName: 'utensils', bg: '#FFF0E6' },
    { name: 'Groceries', iconName: 'shopping-cart', bg: '#E8F5E9' },
    { name: 'Pharmacy', iconName: 'pill', bg: '#E3F2FD' },
    { name: 'Flowers', iconName: 'flower-2', bg: '#FCE4EC' },
    { name: 'Pets', iconName: 'paw-print', bg: '#FFF3E0' },
    { name: 'Electronics', iconName: 'laptop', bg: '#EDE7F6' },
    { name: 'Fashion', iconName: 'shirt', bg: '#E0F7FA' },
    { name: 'Sports', iconName: 'dumbbell', bg: '#E0F2F1' },
  ];

  const featuredStores = dbStores.length > 0 ? dbStores.map((s, i) => ({
    id: s.id, name: s.name, rating: s.rating || 0, time: '25-35', orders: `${s.total_orders || 0}`,
    gradient: ['from-red-500 via-red-600 to-red-700', 'from-orange-500 via-orange-600 to-yellow-600', 'from-green-500 via-green-600 to-teal-600', 'from-blue-500 via-blue-600 to-indigo-600', 'from-red-400 via-orange-500 to-amber-600', 'from-red-600 via-red-700 to-red-800'][i % 6],
    badge: i === 0 ? 'TOP' : i === 1 ? 'POPULAR' : '',
    color: '#FF6B00',
    image_url: s.image_url || s.cover_url,
  })) : [
    { id: '', name: "Tunis Kitchen", rating: 0, time: '25-35', orders: '0', gradient: 'from-red-500 via-red-600 to-red-700', badge: 'TOP', color: '#EF4444', image_url: '' },
    { id: '', name: 'TechStore Tunisia', rating: 0, time: '30-40', orders: '0', gradient: 'from-orange-500 via-orange-600 to-yellow-600', badge: 'POPULAR', color: '#F97316', image_url: '' },
  ];

  const testimonials = dbReviews.length > 0 ? dbReviews.map(r => ({
    text: r.comment || t('home.defaultReview'),
    name: r.profiles?.full_name || 'User',
    role: t('home.verifiedBuyer'),
    rating: r.rating,
    color: ['#FF6B00', '#22C55E', '#6366F1', '#F59E0B', '#EC4899', '#14B8A6'][Math.floor(Math.random() * 6)],
  })) : [];

  const statsData = [
    { value: dbStats.stores, display: `${dbStats.stores}+`, label: t('home.categories'), icon: Store, isRating: false },
    { value: dbStats.users, display: `${dbStats.users}`, label: t('home.statsUsersLabel'), icon: Users, isRating: false },
    { value: dbStats.orders, display: `${dbStats.orders}`, label: t('common.orders'), icon: TrendingUp, isRating: false },
    { value: dbStats.rating, display: dbStats.rating > 0 ? dbStats.rating.toFixed(1) : '—', label: t('home.reviews'), icon: Star, isRating: true },
  ];

  const whyUs = [
    { icon: Truck, titleKey: 'home.whyUs1Title', descKey: 'home.whyUs1Desc', color: '#FF6B00', statsKey: 'home.whyUs1Stats' },
    { icon: Shield, titleKey: 'home.whyUs2Title', descKey: 'home.whyUs2Desc', color: '#22C55E', statsKey: 'home.whyUs2Stats' },
    { icon: Zap, titleKey: 'home.whyUs3Title', descKey: 'home.whyUs3Desc', color: '#6366F1', statsKey: 'home.whyUs3Stats' },
    { icon: Star, titleKey: 'home.whyUs4Title', descKey: 'home.whyUs4Desc', color: '#F59E0B', statsKey: 'home.whyUs4Stats' },
  ];

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* SMOOTH SCROLL CONTAINER */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-background)] via-orange-50/30 to-[var(--color-background)] dark:from-[var(--color-background)] dark:via-orange-50/5 dark:to-[var(--color-background)]" />
      </div>

      <div className="relative z-10">
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-black/5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-background) 80%, transparent)', backdropFilter: 'blur(24px) saturate(1.4)' }}>
          <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 group-hover:scale-105 transition-all duration-300">
                <span className="text-white font-bold text-base leading-none">W</span>
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Wassel</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/stores" className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('nav.explore')}
              </Link>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all hover:bg-black/5 cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>
                {t('home.howItWorks')}
              </button>
              <Link href="/business" className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-secondary)' }}>
                {t('home.forBusiness')}
              </Link>
            </nav>

            {/* Desktop right actions */}
            <div className="hidden md:flex items-center gap-1.5">
              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => { setLangMenuOpen(!langMenuOpen); setUserMenuOpen(false); }}
                  className="p-2.5 rounded-xl transition-colors hover:bg-black/5 flex items-center gap-1"
                >
                  <Globe className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{language.toUpperCase()}</span>
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
                        className="absolute right-0 top-full mt-2 w-40 rounded-2xl border border-black/5 shadow-2xl shadow-black/10 overflow-hidden z-50"
                        style={{ backgroundColor: 'var(--color-background)' }}
                      >
                        <div className="p-1.5">
                          {[
                            { code: 'en', label: 'English', flag: '🇬🇧' },
                            { code: 'fr', label: 'Français', flag: '🇫🇷' },
                            { code: 'ar', label: 'العربية', flag: '🇹🇳' },
                          ].map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => { setLanguage(lang.code as 'en' | 'fr' | 'ar'); setLangMenuOpen(false); }}
                              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                language === lang.code
                                  ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                                  : 'hover:bg-black/5'
                              }`}
                              style={language !== lang.code ? { color: 'var(--color-text-secondary)' } : {}}
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
                className="p-2.5 rounded-xl transition-colors hover:bg-black/5"
                title={theme === 'dark' ? t('home.lightMode') : t('home.darkMode')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                  <Moon className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
                )}
              </button>

              {user ? (
                <>
                  {/* Cart */}
                  <Link href="/cart" className="relative p-2.5 rounded-xl transition-colors hover:bg-black/5">
                    <ShoppingCart className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
                    {getCartCount() > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-[#FF6B00] rounded-full shadow-md shadow-orange-500/30">
                        {getCartCount()}
                      </span>
                    )}
                  </Link>

                  {/* User dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full transition-colors hover:bg-black/5 cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-orange-500/20">
                        {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>

                    <AnimatePresence>
                      {userMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-black/5 shadow-2xl shadow-black/10 overflow-hidden z-50"
                            style={{ backgroundColor: 'var(--color-background)' }}
                          >
                            <div className="px-4 py-3 border-b border-black/5">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{user.full_name || 'User'}</p>
                              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</p>
                            </div>
                            <div className="p-1.5">
                              <Link
                                href="/profile"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-black/5"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                <User className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                                {t('nav.profile')}
                              </Link>
                              <Link
                                href="/orders"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-black/5"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                <Clock className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                                {t('nav.myOrders')}
                              </Link>
                              {user.role !== 'customer' && (
                                <Link
                                  href={`/${user.role}`}
                                  onClick={() => setUserMenuOpen(false)}
                                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-black/5"
                                  style={{ color: 'var(--color-text-primary)' }}
                                >
                                  <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                                  {t('nav.dashboard')}
                                </Link>
                              )}
                              <Link
                                href="/settings"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-black/5"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                <Settings className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                                {t('nav.settings')}
                              </Link>
                            </div>
                            <div className="p-1.5 border-t border-black/5">
                              <button
                                onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-colors hover:bg-red-50 text-red-600 cursor-pointer"
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
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-2.5 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('nav.login')}
                  </Link>
                  <Link href="/register" className="ml-1">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button size="sm" className="rounded-xl shadow-lg shadow-orange-500/25 gap-1.5">
                        {t('nav.getStarted')}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile right actions */}
            <div className="flex md:hidden items-center gap-1">
              {/* Language Switcher Mobile */}
              <div className="relative">
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="p-2 rounded-xl transition-colors hover:bg-black/5"
                >
                  <Globe className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
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
                        className="absolute right-0 top-full mt-2 w-40 rounded-2xl border border-black/5 shadow-2xl shadow-black/10 overflow-hidden z-50"
                        style={{ backgroundColor: 'var(--color-background)' }}
                      >
                        <div className="p-1.5">
                          {[
                            { code: 'en', label: 'English', flag: '🇬🇧' },
                            { code: 'fr', label: 'Français', flag: '🇫🇷' },
                            { code: 'ar', label: 'العربية', flag: '🇹🇳' },
                          ].map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => { setLanguage(lang.code as 'en' | 'fr' | 'ar'); setLangMenuOpen(false); }}
                              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                language === lang.code
                                  ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                                  : 'hover:bg-black/5'
                              }`}
                              style={language !== lang.code ? { color: 'var(--color-text-secondary)' } : {}}
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
                className="p-2 rounded-xl transition-colors hover:bg-black/5"
                title={theme === 'dark' ? t('home.lightMode') : t('home.darkMode')}
              >
                {theme === 'dark' ? (
                  <Sun className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                  <Moon className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
                )}
              </button>

              <Link href="/cart" className="relative p-2 rounded-xl transition-colors hover:bg-black/5">
                <ShoppingCart className="w-[18px] h-[18px]" style={{ color: 'var(--color-text-secondary)' }} />
                {getCartCount() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-[#FF6B00] rounded-full shadow-md shadow-orange-500/30">
                    {getCartCount()}
                  </span>
                )}
              </Link>

              {user && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-orange-500/20">
                  {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-black/5 transition-colors relative z-50">
                {menuOpen ? <X className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} /> : <Menu className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="md:hidden border-t overflow-hidden"
                style={{ borderColor: 'rgba(0,0,0,0.05)', backgroundColor: 'color-mix(in srgb, var(--color-background) 95%, transparent)' }}
              >
                <div className="px-5 py-4 space-y-1">
                  <Link href="/stores" onClick={() => setMenuOpen(false)} className="block py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-primary)' }}>
                    {t('nav.explore')}
                  </Link>
                  <button onClick={() => { setMenuOpen(false); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }} className="block w-full text-left py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5 cursor-pointer" style={{ color: 'var(--color-text-primary)' }}>
                    {t('home.howItWorks')}
                  </button>
                  <Link href="/business" onClick={() => setMenuOpen(false)} className="block py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-primary)' }}>
                    {t('home.forBusiness')}
                  </Link>

                  {user ? (
                    <>
                      <div className="pt-2 pb-1 px-4">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{user.full_name || 'User'}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-primary)' }}>
                        <User className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        {t('nav.profile')}
                      </Link>
                      <Link href="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-primary)' }}>
                        <Clock className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        {t('nav.myOrders')}
                      </Link>
                      {user.role !== 'customer' && (
                        <Link href={`/${user.role}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-primary)' }}>
                          <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                          {t('nav.dashboard')}
                        </Link>
                      )}
                      <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-primary)' }}>
                        <Settings className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                        {t('nav.settings')}
                      </Link>
                      <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="flex items-center gap-3 w-full py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-red-50 text-red-600 cursor-pointer">
                        <LogOut className="w-4 h-4" />
                        {t('nav.signOut')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMenuOpen(false)} className="block py-3 px-4 text-sm font-medium rounded-xl transition-all hover:bg-black/5" style={{ color: 'var(--color-text-primary)' }}>
                        {t('nav.login')}
                      </Link>
                      <div className="pt-3">
                        <Link href="/register" onClick={() => setMenuOpen(false)}>
                          <Button fullWidth size="sm" className="rounded-xl">{t('nav.getStarted')}</Button>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* HERO */}
        <section ref={heroRef} className="relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#FF6B00]/20 to-[#FF8C33]/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-300/20 to-orange-400/10 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_2s]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-orange-200/10 via-amber-100/10 to-yellow-200/10 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          </div>

          <div className="relative">
            {/* Top badge */}
            <div className="pt-20 sm:pt-24 text-center">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6B00]/10 to-[#FF8C33]/10 border border-[#FF6B00]/15 px-5 py-1.5 rounded-full text-sm font-semibold text-[#FF6B00] shadow-sm">
                <Sparkles className="w-4 h-4" />
                {t('home.heroBadge')}
              </motion.div>
            </div>

            <motion.div style={{ scale: heroScale, opacity: heroOpacity }} className="max-w-7xl mx-auto px-5 py-12 sm:py-16 lg:py-20">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                {/* Left */}
                <div>
                  <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-4xl sm:text-5xl lg:text-[4rem] font-extrabold text-[var(--color-text-primary)] leading-[1.05] tracking-tight">
                    {t('home.heroTitle1')}<br />
                    <span className="bg-gradient-to-r from-[#FF6B00] via-[#FF8C33] to-[#FFA726] bg-clip-text text-transparent">{t('home.heroTitle2')}</span>
                  </motion.h1>

                  <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="text-lg text-[var(--color-text-secondary)] mt-4 mb-8 max-w-md leading-relaxed">
                    {t('home.heroSubtitle')}
                  </motion.p>

                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
                    <div className="flex items-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl px-5 py-1.5 shadow-xl shadow-gray-200/60 max-w-lg focus-within:border-[#FF6B00] focus-within:shadow-[#FF6B00]/10 transition-all duration-300">
                      <MapPin className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
                      <input type="text" placeholder={t('home.searchPlaceholder')} className="w-full px-3 py-3.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] bg-transparent focus:outline-none" />
                      <Link href="/stores">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button className="rounded-xl shrink-0 gap-1.5 shadow-lg shadow-orange-500/20">
                            <Search className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('home.findStores')}</span>
                          </Button>
                        </motion.div>
                      </Link>
                    </div>
                  </motion.div>

                  {/* Trust badges */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }} className="flex items-center gap-6 mt-8 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {['👤', '👤', '👤', '👤', '👤'].map((a, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-surface)] to-gray-200 border-2 border-[var(--color-background)] flex items-center justify-center text-xs shadow-sm">{a}</div>
                        ))}
                      </div>
                      <div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />))}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5"><span className="font-semibold text-[var(--color-text-primary)]">{dbStats.users}+</span> {t('home.statsUsersLabel')}</p>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-[var(--color-border)]" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center"><Truck className="w-4 h-4 text-green-500" /></div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)]">{t('home.avgDeliveryTime')}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{t('home.deliveryTime')}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Right - Store showcase */}
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.4 }} className="hidden lg:block">
                  <div className="grid grid-cols-2 gap-4">
                    {featuredStores.slice(0, 4).map((store, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.08 }}>
                        <Link href={store.id ? `/stores/${store.id}` : '/stores'} className="group block">
                          <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-2xl hover:-translate-y-1 hover:border-[var(--color-border)] transition-all duration-300">
                            <div className={`h-24 bg-gradient-to-br ${store.gradient} relative flex items-center justify-center overflow-hidden`}>
                              {store.image_url ? (
                                <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-5xl font-black text-white/10 select-none">{store.name[0]}</span>
                              )}
                              {store.badge && (
                                <div className="absolute top-2.5 right-2.5 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-0.5">
                                  <span className="text-[9px] font-bold text-white tracking-wider">{store.badge}</span>
                                </div>
                              )}
                            </div>
                            <div className="p-3.5">
                              <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[#FF6B00] transition-colors text-sm">{store.name}</h3>
                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--color-text-secondary)]">
                                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{store.rating}</span>
                                <span className="w-0.5 h-0.5 rounded-full bg-[var(--color-text-secondary)]/50" />
                                <span>{store.time} min</span>
                                <span className="w-0.5 h-0.5 rounded-full bg-[var(--color-text-secondary)]/50" />
                                <span>{store.orders}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Stats bar integrated into hero */}
            <div className="max-w-5xl mx-auto px-5 pb-16 sm:pb-20">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gray-900 rounded-2xl p-6 sm:p-8 grid grid-cols-4 gap-4 shadow-2xl shadow-gray-900/20">
                {statsData.map((s, i) => {
                  const Icon = s.icon;
                  const { count, ref } = useCountUp(s.isRating ? Math.round(s.value * 10) : s.value);
                  return (
                    <div key={i} ref={ref} className="text-center">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Icon className="w-5 h-5 text-white/70" />
                      </div>
                      <p className="text-xl sm:text-2xl font-extrabold text-white">
                        {s.isRating ? (s.value > 0 ? `${(count / 10).toFixed(1)}` : '—') : count}
                        {!s.isRating && s.value > 0 ? '+' : ''}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto px-5">
            <FadeUp>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-[0.2em]">{t('home.categories')}</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5">{t('home.title')}</h2>
                </div>
                <Link href="/stores" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-[#FF6B00] hover:gap-2 transition-all">
                  {t('home.browseAll')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeUp>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
              {categories.map((cat, i) => {
                const IconComp = lucideIconMap[cat.iconName] || Package;
                return (
                  <FadeUp key={cat.name} delay={i * 0.03}>
                    <Link href={`/stores?category=${cat.name.toLowerCase()}`} className="group block">
                      <div className="rounded-2xl p-4 sm:p-5 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl" style={{ backgroundColor: cat.bg }}>
                        <div className="flex items-center justify-center mb-2 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                          <IconComp className="w-8 h-8 sm:w-10 sm:h-10 text-gray-700" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-700 leading-tight block">{cat.name}</span>
                      </div>
                    </Link>
                  </FadeUp>
                );
              })}
            </div>

            <div className="sm:hidden mt-5 text-center">
              <Link href="/stores" className="text-[#FF6B00] text-sm font-semibold inline-flex items-center gap-1">{t('home.browseAllCategories')} <ChevronRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-16 sm:py-20 bg-[var(--color-surface)]/60">
          <div className="max-w-6xl mx-auto px-5">
            <FadeUp>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-[0.2em]">{t('home.simpleProcess')}</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5">{t('home.threeSteps')}</h2>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 max-w-md mx-auto">{t('home.orderingEasy')}</p>
              </div>
            </FadeUp>

            <div className="grid sm:grid-cols-3 gap-8 sm:gap-12 relative">
              <div className="hidden sm:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[#FF6B00]/10 via-[#FF6B00]/40 to-[#FF6B00]/10" />
              {processSteps.map((s, i) => (
                <FadeUp key={i} delay={i * 0.12}>
                  <div className="text-center relative">
                    <div className="w-20 h-20 bg-[var(--color-background)] rounded-3xl shadow-lg border border-[var(--color-border)] flex items-center justify-center mx-auto mb-5 relative z-10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <span className="text-3xl">{s.icon}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 bg-[var(--color-background)] text-[#FF6B00] text-[10px] font-bold px-3 py-1.5 rounded-full border border-[var(--color-border)] mb-3 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                      {t('home.stepLabel', { number: `0${i + 1}` })}
                    </div>
                    <h3 className="font-bold text-[var(--color-text-primary)] mb-1.5">{t(s.titleKey)}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] max-w-[220px] mx-auto leading-relaxed">{t(s.descKey)}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED STORES */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-5">
            <FadeUp>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-[0.2em]">{t('home.featured')}</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5">{t('home.topStoresNearYou')}</h2>
                </div>
                <Link href="/stores" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-[#FF6B00] hover:gap-2 transition-all">
                  {t('common.viewAll')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeUp>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {featuredStores.map((store, i) => (
                <FadeUp key={i} delay={i * 0.06}>
                  <Link href={store.id ? `/stores/${store.id}` : '/stores'} className="group block">
                    <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                      <div className={`h-28 sm:h-32 bg-gradient-to-br ${store.gradient} relative flex items-center justify-center overflow-hidden`}>
                        {store.image_url ? (
                          <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-6xl font-black text-white/10 select-none">{store.name[0]}</span>
                        )}
                        {store.badge && (
                          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1">
                            <span className="text-[10px] font-bold text-white tracking-wider">{store.badge}</span>
                          </div>
                        )}
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/20 backdrop-blur-sm rounded-lg px-2.5 py-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-white text-xs font-bold">{store.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[#FF6B00] transition-colors">{store.name}</h3>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)]">{store.orders}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm text-[var(--color-text-secondary)]">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{store.time} min</span>
                          <span className="w-1 h-1 rounded-full bg-[var(--color-text-secondary)]/50" />
                          <span>{t('store.freeDelivery')}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </FadeUp>
              ))}
            </div>

            <div className="sm:hidden mt-5 text-center">
              <Link href="/stores" className="text-[#FF6B00] text-sm font-semibold inline-flex items-center gap-1">{t('home.viewAllStores')} <ChevronRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </section>

        {/* WHY US */}
        <section className="py-16 sm:py-20 bg-[var(--color-surface)]/60">
          <div className="max-w-7xl mx-auto px-5">
            <FadeUp>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-[0.2em]">{t('home.whyWassel')}</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5">{t('home.builtDifferent')}</h2>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2 max-w-md mx-auto">{t('home.weFocusOn')}</p>
              </div>
            </FadeUp>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {whyUs.map((f, i) => {
                const Icon = f.icon;
                return (
                  <FadeUp key={i} delay={i * 0.08}>
                    <div className="bg-[var(--color-background)] rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: f.color + '12', color: f.color }}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-[var(--color-text-primary)] mb-1.5">{t(f.titleKey)}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">{t(f.descKey)}</p>
                      <div className="text-xs font-semibold" style={{ color: f.color }}>{t(f.statsKey)}</div>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-5">
            <FadeUp>
              <div className="text-center mb-12">
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-[0.2em]">{t('home.reviews')}</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5">{t('home.whatUsersSay')}</h2>
                <p className="text-[var(--color-text-secondary)] text-sm mt-2">{t('home.realReviews')}</p>
              </div>
            </FadeUp>

            {testimonials.length === 0 ? (
              <FadeUp>
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-50" />
                  <p className="text-[var(--color-text-secondary)]">{t('home.noReviews')}</p>
                </div>
              </FadeUp>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {testimonials.map((t, i) => (
                  <FadeUp key={i} delay={i * 0.05}>
                    <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col">
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: t.rating }).map((_, j) => (
                          <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        ))}
                        {Array.from({ length: 5 - t.rating }).map((_, j) => (
                          <Star key={`empty-${j}`} className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                        ))}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--color-border)]/50">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: t.color }}>{t.name[0]}</div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  </FadeUp>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto px-5">
            <FadeUp>
              <div className="relative bg-gradient-to-br from-[#FF6B00] via-[#FF7A1A] to-[#FF9044] rounded-3xl overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full" />
                  <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full" />
                  <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white/5 rounded-full" />
                </div>

                <div className="relative p-8 sm:p-14 sm:py-16 text-center">
                  <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
                    {t('home.readyToOrder')}
                  </motion.h2>
                  <motion.p initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
                    {t('home.ctaSubtitle')}
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/register">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button size="lg" className="bg-white text-[#FF6B00] hover:bg-gray-100 rounded-xl font-bold shadow-xl gap-2 px-8 w-full sm:w-auto">
                          {t('home.getStartedFree')}
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    </Link>
                    <Link href="/stores">
                      <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-xl px-8 w-full sm:w-auto">
                        {t('common.browseStores')}
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* JOIN US */}
        <section className="pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto px-5">
            <FadeUp>
              <div className="text-center mb-10">
                <span className="text-xs font-bold text-[#FF6B00] uppercase tracking-[0.2em]">{t('home.community')}</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-primary)] mt-1.5">{t('home.growTogether')}</h2>
              </div>
            </FadeUp>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                { emoji: '🛵', titleKey: 'home.becomeRider', descKey: 'home.becomeRiderDesc', bg: 'from-orange-50 to-amber-50', iconBg: 'bg-[#FF6B00]' },
                { emoji: '🏪', titleKey: 'home.partnerWithUs', descKey: 'home.partnerDesc', bg: 'from-green-50 to-emerald-50', iconBg: 'bg-green-500' },
                { emoji: '💼', titleKey: 'home.joinOurTeam', descKey: 'home.joinTeamDesc', bg: 'from-blue-50 to-indigo-50', iconBg: 'bg-blue-500' },
              ].map((item, i) => (
                <FadeUp key={i} delay={i * 0.08}>
                  <div className={`bg-gradient-to-br ${item.bg} rounded-2xl p-6 sm:p-8 text-center border border-[var(--color-border)]/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                    <div className={`w-14 h-14 ${item.iconBg} bg-opacity-10 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-3xl`}>{item.emoji}</div>
                    <h3 className="font-bold text-[var(--color-text-primary)] mb-2">{t(item.titleKey)}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-5 leading-relaxed max-w-[260px] mx-auto">{t(item.descKey)}</p>
                    <Link href="/register" className="text-[#FF6B00] text-sm font-semibold inline-flex items-center gap-1.5 hover:gap-2.5 transition-all group">
                      {t('home.learnMore')}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-white rounded-t-3xl">
          <div className="max-w-7xl mx-auto px-5 py-12 sm:py-16">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
              <div className="lg:col-span-2">
                <Link href="/" className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] rounded-xl flex items-center justify-center shadow-lg">
                    <span className="font-bold text-sm text-white">W</span>
                  </div>
                  <span className="text-xl font-bold">Wassel</span>
                </Link>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                  {t('home.footerTagline')}
                </p>
              </div>
              {[
                { titleKey: 'home.footerCompany', linkKeys: ['home.footerAbout', 'home.footerCareers', 'home.footerBlog', 'home.footerPressKit'] },
                { titleKey: 'home.footerSupport', linkKeys: ['home.footerHelpCenter', 'home.footerContactUs', 'home.footerFAQ', 'home.footerSafety'] },
                { titleKey: 'home.footerLegal', linkKeys: ['home.footerTerms', 'home.footerPrivacy', 'home.footerCookie', 'home.footerGDPR'] },
              ].map((col) => (
                <div key={col.titleKey}>
                  <h4 className="font-semibold text-white mb-4 text-sm">{t(col.titleKey)}</h4>
                  <ul className="space-y-2.5 text-gray-400 text-sm">
                    {col.linkKeys.map((linkKey) => (
                      <li key={linkKey}><Link href="#" className="hover:text-white transition-colors duration-200">{t(linkKey)}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-gray-500 text-sm">&copy; 2026 Wassel. {t('home.allRightsReserved')}</p>
              <div className="flex items-center gap-3">
                {['𝕏', 'IG', 'FB', 'LI'].map((s, i) => (
                  <Link key={i} href="#" className="w-9 h-9 bg-gray-800 hover:bg-[#FF6B00] rounded-xl flex items-center justify-center text-gray-400 hover:text-white text-xs font-bold transition-all duration-200">
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {user && (
        <Link
          href="/cart"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#FF6B00] text-white rounded-full shadow-lg hover:shadow-xl hover:bg-[#E55F00] flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          <ShoppingCart className="w-6 h-6" />
          {getCartCount() > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
              {getCartCount()}
            </span>
          )}
        </Link>
      )}

      {/* Global keyframe animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -20px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.95); }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
