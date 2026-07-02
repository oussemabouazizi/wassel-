'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Heart, Star, StoreIcon, MapPin, Clock, Trash2,
  ChevronRight
} from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
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
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      toast('success', `${storeName} ${t('favorites.removedFromFavorites')}`);
    } catch (err) {
      toast('error', t('favorites.failedToRemove'));
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-3">
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4"
      >
        <EmptyState
          icon={<Heart className="w-8 h-8 text-[var(--color-text-secondary)]" />}
          title={t('favorites.noFavorites')}
          description={t('favorites.noFavoritesDesc')}
          action={
            <Link href="/stores">
              <span className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold inline-block">
                {t('common.browseStores')}
              </span>
            </Link>
          }
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 max-w-2xl mx-auto"
    >
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{t('favorites.title')}</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">{favorites.length} {t('favorites.savedStores')}</p>

      <div className="space-y-3">
        {favorites.map((fav, index) => (
          <motion.div
            key={fav.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="flex items-center gap-4 p-3">
              <div className="w-16 h-16 rounded-xl bg-[var(--color-surface)] overflow-hidden shrink-0">
                {fav.stores.image_url ? (
                  <img src={fav.stores.image_url} alt={fav.stores.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <StoreIcon className="w-6 h-6 text-[var(--color-text-secondary)]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/store/${fav.store_id}`}>
                  <h3 className="font-semibold text-[var(--color-text-primary)] text-sm hover:text-[var(--color-primary)] transition-colors">
                    {fav.stores.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">
                      {fav.stores.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)]">•</span>
                  <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {fav.stores.estimated_delivery_time} {t('common.min')}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">•</span>
                  <span className="text-xs font-medium text-[var(--color-primary)]">
                    {fav.stores.delivery_fee === 0 ? t('common.free') : formatPrice(fav.stores.delivery_fee)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleRemove(fav.id, fav.stores.name)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors shrink-0"
                aria-label={`${t('favorites.removedFromFavorites')} ${fav.stores.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
