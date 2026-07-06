'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useSpring, useInView } from 'framer-motion';
import { Search, Star, StoreIcon, MapPin, Clock, ChevronRight, ChevronDown, X, SlidersHorizontal, Package, TrendingUp, Check } from 'lucide-react';
import { Input, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { Store, Category } from '@/types';

type StoreWithCategory = Store & { categories: Category };

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  return { ref, isInView };
}

function StoreCard({ store, index, getCatName, t }: { store: StoreWithCategory; index: number; getCatName: (n: string) => string; t: (key: string) => string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(0, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    mouseX.set((x - centerX) / centerX);
    mouseY.set((y - centerY) / centerY);
    rotateX.set((y - centerY) / centerY * -6);
    rotateY.set((x - centerX) / centerX * 6);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group perspective-[800px]"
    >
      <Link href={`/store/${store.id}`}>
        <div className="relative rounded-2xl overflow-hidden border border-[var(--color-border)]/50 bg-[var(--color-background)] transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(255,107,0,0.2)] hover:border-[#FF6B00]/30 hover:-translate-y-1">
          {/* Image */}
          <div className="relative h-44 bg-[var(--color-surface)] overflow-hidden">
            {store.image_url && !store.image_url.includes('placeholder') ? (
              <img
                src={store.image_url}
                alt={store.name}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-background)]">
                <StoreIcon className="w-14 h-14 text-[var(--color-text-secondary)]/30" />
              </div>
            )}

            {/* Hover overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Popular badge */}
            {store.total_orders > 100 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.06 }}
                className="absolute top-3 left-3"
              >
                <Badge variant="primary" className="shadow-lg shadow-orange-500/30 backdrop-blur-sm">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {t('stores.popular')}
                </Badge>
              </motion.div>
            )}

            {/* Rating */}
            <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg border border-white/20 dark:border-white/10 transition-transform duration-300 group-hover:scale-105">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                {store.rating.toFixed(1)}
              </span>
            </div>

            {/* Delivery fee pill - bottom of image */}
            <div className="absolute bottom-3 left-3 bg-[#FF6B00] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-orange-500/30 transition-all duration-300 group-hover:bg-[#E55A00] group-hover:scale-105">
              {store.delivery_fee === 0 ? (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {t('common.free')} delivery
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {formatPrice(store.delivery_fee)}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[#FF6B00] transition-colors duration-300 truncate text-[15px]">
                  {store.name}
                </h3>
                {store.categories && (
                  <p className="text-xs text-[#FF6B00]/80 font-medium mt-0.5">
                    {getCatName(store.categories.name)}
                  </p>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center shrink-0 ml-2 transition-all duration-300 group-hover:bg-[#FF6B00] group-hover:rotate-0 rotate-0">
                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] transition-all duration-300 group-hover:text-white group-hover:translate-x-0.5" />
              </div>
            </div>

            {store.description && (
              <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3 leading-relaxed">
                {store.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]/50">
              <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                <MapPin className="w-3.5 h-3.5 text-[#FF6B00]/60" />
                <span className="truncate max-w-[100px]">{store.address ? store.address.split(',')[0] : t('stores.nearby')}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[var(--color-text-secondary)]/30" />
              <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                <Clock className="w-3.5 h-3.5 text-[#FF6B00]/60" />
                <span>{store.estimated_delivery_time} min</span>
              </div>
              {store.total_orders > 0 && (
                <>
                  <div className="w-1 h-1 rounded-full bg-[var(--color-text-secondary)]/30" />
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {store.total_orders} orders
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function StoresPage() {
  const { t, language } = useI18n();
  const [stores, setStores] = useState<StoreWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const { ref: gridRef, isInView: gridInView } = useScrollReveal();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      try {
        const [storesRes, catsRes] = await Promise.all([
          supabase
            .from('stores')
            .select('*')
            .eq('status', 'approved')
            .eq('is_open', true)
            .order('total_orders', { ascending: false }),
          supabase
            .from('categories')
            .select('*')
            .order('sort_order'),
        ]);

        if (storesRes.error) throw storesRes.error;
        if (catsRes.error) throw catsRes.error;

        const storesData = storesRes.data || [];
        const catsData = catsRes.data || [];

        if (storesData.length > 0) {
          const storeIds = storesData.map((s: any) => s.id);
          const { data: orderCounts } = await supabase
            .from('orders')
            .select('store_id')
            .in('store_id', storeIds);

          if (orderCounts) {
            const counts: Record<string, number> = {};
            orderCounts.forEach((o: any) => {
              counts[o.store_id] = (counts[o.store_id] || 0) + 1;
            });
            storesData.forEach((s: any) => {
              s.total_orders = counts[s.id] || 0;
            });
          }
        }

        const catMap = new Map(catsData.map((c: any) => [c.id, c]));
        storesData.forEach((s: any) => {
          s.categories = catMap.get(s.category_id) || null;
        });

        setStores(storesData as any);
        setCategories(catsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stores');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categoryNameMap: Record<string, { en: string; fr: string; ar: string }> = {
    'Food': { en: 'Food', fr: 'Nourriture', ar: 'طعام' },
    'Groceries': { en: 'Groceries', fr: 'Épicerie', ar: 'بقالة' },
    'Pharmacy': { en: 'Pharmacy', fr: 'Pharmacie', ar: 'صيدلية' },
    'Flowers': { en: 'Flowers', fr: 'Fleurs', ar: 'زهور' },
    'Pets': { en: 'Pets', fr: 'Animaux', ar: 'حيوانات أليفة' },
    'Electronics': { en: 'Electronics', fr: 'Électronique', ar: 'إلكترونيات' },
    'Fashion': { en: 'Fashion', fr: 'Mode', ar: 'أزياء' },
    'Sports': { en: 'Sports', fr: 'Sport', ar: 'رياضة' },
    'Baby': { en: 'Baby', fr: 'Bébé', ar: 'أطفال' },
    'Stationery': { en: 'Stationery', fr: 'Papeterie', ar: 'مستلزمات مكتبية' },
    'Pizza': { en: 'Food', fr: 'Nourriture', ar: 'طعام' },
    'Burgers': { en: 'Food', fr: 'Nourriture', ar: 'طعام' },
    'Sushi': { en: 'Food', fr: 'Nourriture', ar: 'طعام' },
    'Desserts': { en: 'Food', fr: 'Nourriture', ar: 'طعام' },
  };

  const mainCategories = ['Food', 'Groceries', 'Pharmacy', 'Electronics', 'Fashion', 'Flowers', 'Pets', 'Sports', 'Baby', 'Stationery'];

  const getMainCategory = (catName: string) => {
    return categoryNameMap[catName]?.en || catName;
  };

  const getCatName = (name: string) => {
    const translated = categoryNameMap[name];
    if (!translated) return name;
    return language === 'ar' ? translated.ar : language === 'fr' ? translated.fr : translated.en;
  };

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch = store.name.toLowerCase().includes(search.toLowerCase()) ||
        store.description.toLowerCase().includes(search.toLowerCase());
      let matchesCategory = activeCategory === 'all';
      if (!matchesCategory && store.categories) {
        const main = getMainCategory(store.categories.name);
        matchesCategory = main === activeCategory;
      }
      return matchesSearch && matchesCategory;
    });
  }, [stores, search, activeCategory, categories]);

  const tabs = useMemo(() => {
    const visible = mainCategories.filter((name) => {
      return categories.some((c) => getMainCategory(c.name) === name);
    });
    const groupedCounts: Record<string, number> = {};
    stores.forEach((s) => {
      if (s.categories) {
        const main = getMainCategory(s.categories.name);
        groupedCounts[main] = (groupedCounts[main] || 0) + 1;
      }
    });
    return [
      { id: 'all', label: t('stores.all'), count: stores.length },
      ...visible.map((name) => ({
        id: name,
        label: getCatName(name),
        count: groupedCounts[name] || 0,
      })),
    ];
  }, [categories, stores, language, t]);

  const activeCategoryLabel = tabs.find((tab) => tab.id === activeCategory)?.label;

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl"
        >
          <div className="rounded-2xl overflow-hidden border border-[var(--color-border)]/50 bg-[var(--color-background)]">
            <Skeleton className="w-full h-44 rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-3 pt-3 border-t border-[var(--color-border)]/30">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer-sweep_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/5" />
        </motion.div>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <EmptyState
          icon={<StoreIcon className="w-8 h-8 text-[var(--color-error)]" />}
          title={t('common.somethingWentWrong')}
          description={error}
          action={
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#E55A00] transition-colors shadow-lg shadow-orange-500/25"
            >
              {t('stores.tryAgain')}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative p-4 sm:p-6 max-w-6xl mx-auto min-h-screen"
    >
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-[#FF6B00]/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-tr from-amber-400/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-t from-[#FF6B00]/5 to-transparent rounded-full blur-3xl" />
      </div>

      {/* HEADER — staggered entrance */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 text-[11px] font-bold text-[#FF6B00] uppercase tracking-[0.25em] mb-2"
        >
          <TrendingUp className="w-4 h-4" />
          <span>{t('stores.subtitle')}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight leading-tight"
        >
          {t('stores.title')}
        </motion.h1>

        {!loading && (
          <motion.p
            key={filteredStores.length}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="text-sm text-[var(--color-text-secondary)] mt-2"
          >
            {(() => {
              const n = filteredStores.length;
              const countLabel =
                language === 'ar' ? `${n} متجر` :
                language === 'fr' ? `${n} boutique${n === 1 ? '' : 's'}` :
                `${n} store${n === 1 ? '' : 's'}`;
              return (
                <>
                  {countLabel}
                  {activeCategory !== 'all' && activeCategoryLabel ? (
                    <span className="text-[#FF6B00] font-medium"> · {activeCategoryLabel}</span>
                  ) : null}
                  {search ? (
                    <span className="text-[#FF6B00] font-medium"> &ldquo;{search}&rdquo;</span>
                  ) : null}
                </>
              );
            })()}
          </motion.p>
        )}
      </div>

      {/* SEARCH — arrives after header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18 }}
        className="mb-6"
      >
        <div className="relative rounded-2xl transition-all duration-300 focus-within:shadow-[0_0_0_4px_rgba(255,107,0,0.12)] focus-within:border-[#FF6B00]/30">
          <Input
            ref={searchInputRef}
            placeholder={t('home.searchPlaceholder')}
            icon={<Search className="w-5 h-5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--color-surface)] hover:bg-[#FF6B00]/10 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* FILTER — dropdown panel */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mb-8"
          ref={filterRef}
        >
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-background)] hover:border-[#FF6B00]/40 transition-all duration-200 group"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#FF6B00]" />
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {activeCategory === 'all' ? t('stores.all') : activeCategoryLabel}
              </span>
              {activeCategory !== 'all' && (
                <span className="text-xs font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full">
                  {tabs.find((tab) => tab.id === activeCategory)?.count || 0}
                </span>
              )}
              <ChevronDown className={cn('w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200', filterOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full left-0 mt-2 w-full sm:w-80 rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-background)] shadow-2xl shadow-black/10 z-30 overflow-hidden"
                >
                  <div className="p-3 border-b border-[var(--color-border)]/40">
                    <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider px-1">
                      {t('stores.subtitle') || 'Categories'}
                    </p>
                  </div>
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {tabs.map((tab) => {
                      const isActive = activeCategory === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setActiveCategory(tab.id); setFilterOpen(false); }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                            isActive
                              ? 'bg-[#FF6B00]/10 text-[#FF6B00]'
                              : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            isActive ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-[var(--color-border)]'
                          )}>
                            {isActive && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="flex-1 text-left">{tab.label}</span>
                          <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            isActive ? 'bg-[#FF6B00]/15 text-[#FF6B00]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                          )}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* GRID */}
      <div ref={gridRef}>
        {loading ? (
          renderSkeletons()
        ) : filteredStores.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="py-20"
          >
            <EmptyState
              icon={<StoreIcon className="w-10 h-10 text-[var(--color-text-secondary)]/40" />}
              title={t('stores.noStoresFound')}
              description={search ? t('stores.noStoresSearch') : t('stores.noStoresCategory')}
              action={
                search ? (
                  <button
                    onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                    className="px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#E55A00] transition-colors shadow-lg shadow-orange-500/25"
                  >
                    {t('stores.clearSearch')}
                  </button>
                ) : undefined
              }
            />
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredStores.map((store, index) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  index={index}
                  getCatName={getCatName}
                  t={t}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
