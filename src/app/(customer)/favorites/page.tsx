'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Star, StoreIcon, MapPin, Clock, Trash2,
  ChevronRight, ChevronLeft, Package
} from 'lucide-react';
import { Button, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useToast } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { Store } from '@/types';

type FavoriteWithStore = {
  id: string;
  store_id: string;
  stores: Store;
};

export default function FavoritesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const user = useAppStore((s) => s.user);
  const [favorites, setFavorites] = useState<FavoriteWithStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchFavorites = async () => {
      const supabase = createClient();
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('id, store_id, stores(*)')
          .eq('user_id', user.id)
          .not('store_id', 'is', null);

        if (error) throw error;
        setFavorites((data || []) as unknown as FavoriteWithStore[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user, router, t]);

  const handleRemove = async (favoriteId: string, storeName: string) => {
    setRemovingId(favoriteId);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
      // Animate out
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      toast('success', `${storeName} ${t('favorites.removedFromFavorites')}`);
    } catch (err) {
      toast('error', t('favorites.failedToRemove'));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-12 rounded-2xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Heart className="w-8 h-8 text-[var(--color-error)]" />}
          title={t('common.somethingWentWrong')}
          description={error}
        />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-pink-400/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 -left-32 w-64 h-64 bg-gradient-to-tr from-rose-300/8 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto pt-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <EmptyState
              icon={
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Heart className="w-10 h-10 text-pink-400" />
                </motion.div>
              }
              title={t('favorites.noFavorites')}
              description={t('favorites.noFavoritesDesc')}
              action={
                <Link href="/stores">
                  <Button className="bg-gradient-to-r from-[#FF6B00] to-[#E55A00] shadow-lg shadow-orange-500/20">
                    {t('common.browseStores')} <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              }
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-gradient-to-br from-pink-400/8 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-64 h-64 bg-gradient-to-tr from-rose-300/6 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-gradient-to-t from-orange-200/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] flex items-center justify-center hover:bg-[var(--color-border)]/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-text-primary)]" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--color-text-primary)] tracking-tight">{t('favorites.title')}</h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{favorites.length} {t('favorites.savedStores')}</p>
          </div>
        </motion.div>

        {/* Favorites grid */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {favorites.map((fav, index) => (
              <motion.div
                key={fav.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.9 }}
                transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:border-pink-300/30 transition-all duration-300 group">
                  <Link href={`/store/${fav.store_id}`} className="flex items-center gap-4 p-4">
                    {/* Store image */}
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-xl bg-[var(--color-surface)] overflow-hidden">
                        {fav.stores.image_url ? (
                          <img
                            src={fav.stores.image_url}
                            alt={fav.stores.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <StoreIcon className="w-6 h-6 text-[var(--color-text-secondary)]" />
                          </div>
                        )}
                      </div>
                      {/* Heart badge */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.05, type: 'spring', stiffness: 300 }}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30"
                      >
                        <Heart className="w-3 h-3 text-white fill-white" />
                      </motion.div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[var(--color-text-primary)] text-sm truncate group-hover:text-pink-500 transition-colors">
                        {fav.stores.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded-md">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400">
                            {fav.stores.rating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {fav.stores.estimated_delivery_time} {t('common.min')}
                        </span>
                        <span className="text-[10px] font-bold text-[var(--color-primary)]">
                          {fav.stores.delivery_fee === 0 ? t('common.free') : formatPrice(fav.stores.delivery_fee)}
                        </span>
                      </div>
                      {fav.stores.description && (
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-1.5 line-clamp-1">
                          {fav.stores.description}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                  </Link>

                  {/* Remove button */}
                  <div className="px-4 pb-3">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleRemove(fav.id, fav.stores.name)}
                      disabled={removingId === fav.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/15 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {removingId === fav.id ? t('common.removing') : t('favorites.remove')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Browse more */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-6 text-center"
        >
          <Link href="/stores">
            <div className="bg-[var(--color-background)] rounded-2xl border-2 border-dashed border-[var(--color-border)]/50 p-6 hover:border-pink-300/50 hover:bg-pink-50/50 dark:hover:bg-pink-900/10 transition-all duration-300 cursor-pointer group">
              <Heart className="w-6 h-6 text-[var(--color-text-secondary)] group-hover:text-pink-500 mx-auto mb-2 transition-colors" />
              <p className="text-sm font-bold text-[var(--color-text-secondary)] group-hover:text-pink-500 transition-colors">
                {t('favorites.browseMore')}
              </p>
            </div>
          </Link>
        </motion.div>
      </div>

      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
